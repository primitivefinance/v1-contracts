pragma solidity ^0.6.2;

/**
 * @title Primitive's ERC-20 Option
 * @author Primitive
 */

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./PrimeInterface.sol";
import "./controller/Instruments.sol";

contract PrimeOption is ERC20, ReentrancyGuard {
    using SafeMath for uint256;

    event Deposit(address indexed user, uint256 qUnderlying, uint256 qStrike);

    uint256 public _parentToken;
    address public _instrumentController;

    Instruments.PrimeOption public option;

    IPrimeRedeem public _rPulp;

    uint256 public marketId;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _marketId,
        address tokenU,
        address tokenS,
        uint256 ratio,
        uint256 expiry
    ) 
        public
        ERC20(name, symbol)
    {
        marketId = _marketId;
        _instrumentController = msg.sender;
        option = Instruments.PrimeOption(
            tokenU,
            tokenS,
            ratio,
            expiry
        );
    }

    receive() external payable {}

    function setRPulp(address rPulp) public returns (bool) {
        require(msg.sender == _instrumentController, 'ERR_NOT_OWNER'); // OWNER IS OPTIONS.sol
        _rPulp = IPrimeRedeem(rPulp);
        return true;
    }


    /**
     * @dev deposits underlying assets to mint prime eth call or put options
     * @notice deposits qUnderlying assets and receives qUnderlying asset amount of oPULP and rPULP tokens
     * @return bool if the transaction succeeds
     */
    function deposit(uint256 amount) public payable nonReentrant returns (bool) {
        return _deposit(amount, msg.sender, msg.sender);
    }

    /**
     * @dev internal function to handle deposits based on Call/Put type of option
     * @param amount quantity of underlying assets to deposit
     * @param oPulpReceiver address who receives prime oPulp option tokens
     * @param rPulpReceiver address who receives redeeem rPulp tokens, the writer of the option
     */
    function _deposit(
        uint256 amount,
        address oPulpReceiver,
        address rPulpReceiver
    ) internal returns (bool) {
        if(isEthCallOption()) {
            require(msg.value > 0 && msg.value == amount, "ERR_ZERO");
            (bool mintSuccess) = mintPrimeOptions(
                amount,
                option.ratio,
                oPulpReceiver,
                rPulpReceiver
            );
            require(mintSuccess, "ERR_MINT_OPTIONS");
            return mintSuccess;
        } else {
            IERC20 underlying = IERC20(option.tokenU);
            verifyBalance(underlying.balanceOf(rPulpReceiver), amount, "ERR_BAL_UNDERLYING");
            (bool mintSuccess) = mintPrimeOptions(
                amount,
                option.ratio,
                oPulpReceiver,
                rPulpReceiver
            );
            bool transferSuccess = underlying.transferFrom(rPulpReceiver, address(this), amount);
            require(mintSuccess && transferSuccess, "ERR_MINT_OPTIONS");
            return (mintSuccess && transferSuccess);
        }
    }

    /**
     * @dev mints oPulp + rPulp
     */
    function mintPrimeOptions(
        uint256 qoPulp,
        uint256 ratio,
        address oPulpReceiver,
        address rPulpReceiver
    ) internal returns (bool) {
        uint256 qrPulp = qoPulp.mul(1 ether).div(ratio);

        _rPulp.mint(
            rPulpReceiver,
            qrPulp
        );
        
        _mint(oPulpReceiver, qoPulp);
        emit Deposit(msg.sender, qoPulp, qrPulp);
        return (true);
    }

    /**
     * @dev swaps strike assets to underlying assets and burns prime options
     * @notice burns oPULP, transfers strike asset to contract, sends underlying asset to user
     */
    function swap(uint256 qUnderlying) public nonReentrant returns (bool) {
        return _swap(qUnderlying);
    }

    /**
     * @dev internal function to swap underlying assets for strike assets depending on option type call/put
     */
    function _swap(uint256 qUnderlying) internal returns (bool) {
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_OPULP");
        uint256 qStrike = qUnderlying.mul(option.ratio).div(1 ether);
        if(isEthPutOption()) {
            verifyBalance(msg.value, qStrike, "ERR_BAL_UNDERLYING");
            _burn(msg.sender, qUnderlying);
            IERC20 _underlying = IERC20(option.tokenU);
            return _underlying.transferFrom(address(this), msg.sender, qStrike);
        } else {
            IERC20 _strike = IERC20(option.tokenS);
            verifyBalance(_strike.balanceOf(msg.sender), qStrike, "ERR_BAL_STRIKE");
            _burn(msg.sender, qUnderlying);
            _strike.transferFrom(msg.sender, address(this), qStrike);
            return sendEther(msg.sender, qUnderlying);
        } 
    }

    /**
     * @dev withdraws exercised strike assets by burning rPulp
     * @notice burns rPULP to withdraw strike assets that are from exercised options
     * @param amount quantity of strike assets to withdraw 
     * @return bool if transfer of strike assets succeeds
     */
    function withdraw(uint256 amount) public nonReentrant returns (bool) {
        return _withdraw(amount, msg.sender);
    }

    /**
     * @dev internal function to withdraw strike assets for different option types by burning c/p Pulp tokens
     * @param amount quantity of strike assets to withdraw
     * @param receiver address to burn rPulp from and send strike assets to
     * @return bool if transfer of strike assets succeeds
     */
    function _withdraw(uint256 amount, address payable receiver) internal returns (bool) {
        uint256 rPulpBalance = _rPulp.balanceOf(receiver);
        uint256 rPulpToBurn = amount;
        if(isEthPutOption()) {

            verifyBalance(rPulpBalance, rPulpToBurn, "ERR_BAL_RPULP");
            verifyBalance(address(this).balance, amount, "ERR_BAL_STRIKE");
    
            _rPulp.burn(receiver, rPulpToBurn);
            return sendEther(receiver, amount);
        } else {

            IERC20 _strike = IERC20(option.tokenS);
            verifyBalance(rPulpBalance, rPulpToBurn, "ERR_BAL_RPULP");
            verifyBalance(_strike.balanceOf(address(this)), amount, "ERR_BAL_STRIKE");

            _rPulp.burn(receiver, rPulpToBurn);
            return _strike.transfer(receiver, amount);
        } 
    }

    /**
     * @dev burn prime options to withdraw original underlying asset deposits
     * @notice burns oPULP and rPULP to receive initial deposit amount (underlying asset)
     * @return bool if the transaction succeeds
     */
    function close(uint256 qUnderlying) public returns(bool) {

        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        uint256 qStrike = qUnderlying.mul(option.ratio).div(1 ether);

        verifyBalance(rPulpBalance, qStrike, "ERR_BAL_RPULP");
        verifyBalance(balanceOf(msg.sender), qUnderlying, "ERR_BAL_OPULP");

        _rPulp.burn(msg.sender, qStrike);        
        _burn(msg.sender, qUnderlying);
        if(isEthCallOption()) {
            return sendEther(msg.sender, qUnderlying);
        } else {
            IERC20 _underlying = IERC20(option.tokenU);
            return _underlying.transfer(msg.sender, qUnderlying);
        }
    }

    /**
     @dev function to send ether with the most security
     */
    function sendEther(address payable user, uint256 amount) internal returns (bool) {
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }

    function isEthCallOption() public view returns (bool) {
        return (option.tokenU == address(this));
    }

    function isEthPutOption() public view returns (bool) {
        return (option.tokenS == address(this));
    }

    function verifyBalance(
        uint256 balance,
        uint256 minBalance,
        string memory errorCode
    ) internal pure returns (bool) {
        if(minBalance == 0) {
            require(balance > minBalance, errorCode);
            return balance > minBalance;
        } else {
            require(balance >= minBalance, errorCode);
            return balance >= minBalance;
        }
    }

    function getStrike() public view returns (address) {
        return option.tokenS;
    }

    function getUnderlying() public view returns (address) {
        return option.tokenU;
    }

    function getRatio() public view returns (uint256) {
        return option.ratio;
    }

}