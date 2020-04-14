pragma solidity ^0.6.2;

/**
 * @title Primitive's ERC-20 Option
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import './InterfaceERC20.sol';
import '../Instruments.sol';

contract PrimeERC20 is ERC20Detailed, ERC20, ReentrancyGuard {
    using SafeMath for uint256;

    event Deposit(address indexed user, uint256 qUnderlying, uint256 qStrike);

    uint256 public _parentToken;
    address public _instrumentController;

    Instruments.PrimeOption public option;

    IPrime public _prime;
    IRPulp public _rPulp;
    IEPulp public _ePulp;

    constructor(
        string memory name,
        address prime
    ) 
        public
        ERC20Detailed(name, "oPULP", 18)
    {
        _prime = IPrime(prime);
        _instrumentController = msg.sender;
    }

    receive() external payable {}

    function setParentToken(uint256 tokenId) public returns(uint256) {
        require(msg.sender == _instrumentController, "ERR_NOT_OWNER"); // OWNER IS OPTIONS.sol
        _parentToken = tokenId;
        (
            address writer,
            uint256 qUnderlying,
            address aUnderlying,
            uint256 qStrike,
            address aStrike,
            uint256 tExpiry,
            address receiver,
            bytes4 series,
            bytes4 symbol
        ) = _prime.getPrime(tokenId);
        option = Instruments.PrimeOption(
            qUnderlying,
            aUnderlying,
            qStrike,
            aStrike,
            tExpiry
        );
        return tokenId;
    }

    function setRPulp(address rPulp) public returns (bool) {
        require(msg.sender == _instrumentController, 'ERR_NOT_OWNER'); // OWNER IS OPTIONS.sol
        _rPulp = IRPulp(rPulp);
        return true;
    }

    function setPool(address ePool) public returns (bool) {
        require(msg.sender == _instrumentController, 'ERR_NOT_OWNER'); // OWNER IS OPTIONS.sol
        _ePulp = IEPulp(ePool);
        _approve(address(this), ePool, 2**255-1 ether);
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
                option.qStrike,
                option.qUnderlying,
                oPulpReceiver,
                rPulpReceiver
            );
            require(mintSuccess, "ERR_MINT_OPTIONS");
            return mintSuccess;
        } else {
            IERC20 _underlying = IERC20(option.aUnderlying);
            verifyBalance(_underlying.balanceOf(rPulpReceiver), amount, "ERR_BAL_UNDERLYING");
            (bool mintSuccess) = mintPrimeOptions(
                amount,
                option.qUnderlying,
                option.qStrike,
                oPulpReceiver,
                rPulpReceiver
            );
            bool transferSuccess = _underlying.transferFrom(rPulpReceiver, address(this), amount);
            require(mintSuccess && transferSuccess, "ERR_MINT_OPTIONS");
            return (mintSuccess && transferSuccess);
        }
    }

    /**
     * @dev mints oPulp + rPulp
     */
    function mintPrimeOptions(
        uint256 qoPulp,
        uint256 numerator,
        uint256 denominator,
        address oPulpReceiver,
        address rPulpReceiver
    ) internal returns (bool) {
        uint256 qrPulp = qoPulp.mul(numerator).div(denominator);

        _rPulp.mint(
            rPulpReceiver,
            qrPulp
        );
        
        _mint(oPulpReceiver, qoPulp);
        emit Deposit(msg.sender, qoPulp, qrPulp);
        return (true);
    }

    /**
     * @dev deposits underlying assets to mint prime options which are sold to exchange pool for a min price
     * @notice mint msg.value amt of oPULP + rPULP. 
     * oPULP is sold to exchange pool for ether which is sent to user.
     * @param amount deposits qUnderlying assets and receives qUnderlying asset amount of oPULP and rPULP tokens
     * @param askPrice minimum amount of ether to receive for selling prime oPulp options
     * @return amount of ether premium received for selling oPULP
     */
    function depositAndLimitSell(uint256 amount, uint256 askPrice) public payable nonReentrant returns (uint) {
        (bool depositSuccess) = _deposit(amount, address(this), msg.sender);
        require(depositSuccess, "ERR_DEPOSIT");

        uint256 minPrice = minEthPrice(amount);
        verifyBalance(minPrice, askPrice, "ERR_ASK_PRICE");
        
        return _ePulp.swapTokensToEth(amount, minPrice, msg.sender);
    }

    /**
     * @dev deposits underlying assets to mint prime options which are sold to exchange pool at the market price
     * @notice mint msg.value amt of oPULP + rPULP. 
     * oPULP is sold to exchange pool for ether which is sent to user.
     * @param amount deposits qUnderlying assets and receives qUnderlying asset amount of oPULP and rPULP tokens
     * @return amount of ether premium received for selling oPULP
     */
    function depositAndMarketSell(uint256 amount) public payable nonReentrant returns (uint) {
        (bool depositSuccess) = _deposit(amount, address(this), msg.sender);
        require(depositSuccess, "ERR_DEPOSIT");
        
        uint256 minPrice = minEthPrice(amount);
        verifyBalance(minPrice, 0, "ERR_ASK_PRICE");
        
        return _ePulp.swapTokensToEth(amount, minPrice, msg.sender);
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
        uint256 qStrike = qUnderlying.mul(option.qStrike).div(option.qUnderlying);
        if(isEthPutOption()) {
            verifyBalance(msg.value, qStrike, "ERR_BAL_UNDERLYING");
            _burn(msg.sender, qUnderlying);
            IERC20 _underlying = IERC20(option.aUnderlying);
            return _underlying.transferFrom(address(this), msg.sender, qStrike);
        } else {
            IERC20 _strike = IERC20(option.aStrike);
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
            if(_rPulp.isCallPulp()) {
                rPulpToBurn = amount.mul(option.qUnderlying).div(1 ether);
            }

            verifyBalance(rPulpBalance, rPulpToBurn, "ERR_BAL_RPULP");
            verifyBalance(address(this).balance, amount, "ERR_BAL_STRIKE");
    
            _rPulp.burn(receiver, rPulpToBurn);
            return sendEther(receiver, amount);
        } else {
            if(!_rPulp.isCallPulp()) {
                rPulpToBurn = amount.mul(1 ether).div(option.qStrike);
            }

            IERC20 _strike = IERC20(option.aStrike);
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
        uint256 qStrike = qUnderlying.mul(option.qStrike).div(option.qUnderlying);

        verifyBalance(rPulpBalance, qStrike, "ERR_BAL_RPULP");
        verifyBalance(balanceOf(msg.sender), qUnderlying, "ERR_BAL_OPULP");

        _rPulp.burn(msg.sender, qStrike);        
        _burn(msg.sender, qUnderlying);
        if(isEthCallOption()) {
            return sendEther(msg.sender, qUnderlying);
        } else {
            IERC20 _underlying = IERC20(option.aUnderlying);
            return _underlying.transferFrom(address(this), msg.sender, qUnderlying);
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
        return (option.aUnderlying == address(this));
    }

    function isEthPutOption() public view returns (bool) {
        return (option.aStrike == address(this));
    }

    /**
     * @dev returns the min ether returned after selling tokens in Exchange Pool
     */
    function minEthPrice(uint256 amount) public view returns (uint256) {
        return _ePulp.getInputPrice(
                    amount,
                    _ePulp.tokenReserves(),
                    _ePulp.etherReserves()
                );
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
}