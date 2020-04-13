pragma solidity ^0.6.5;

/**
 * @title Primitive's ERC-20 Option
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '../Instruments.sol';
import './InterfaceERC20.sol';

contract PrimeERC20 is ERC20Detailed, ERC20, ReentrancyGuard {
    using SafeMath for uint256;

    event Deposit(address indexed user, uint256 qUnderlying, uint256 qStrike);

    bool public _isEthCallOption;

    uint256 public _parentToken;
    address public _instrumentController;
    IPrime public _prime;
    
    ERC20 public _underlying;
    ERC20 public _strike;
    IRPulp public _rPulp;
    IEPulp public _ePulp;

    uint256 public _strikePrice;
    uint256 public _underlyingPrice;

    constructor (
        string memory name,
        bool isCall,
        address prime
    ) 
        public
        ERC20Detailed(name, "oPULP", 18)
    {
        _prime = IPrime(prime);
        _instrumentController = msg.sender;
        _isEthCallOption = isCall;
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
        _underlying = ERC20(aUnderlying);
        _strike = ERC20(aStrike);
        _strikePrice = qStrike;
        _underlyingPrice = qUnderlying;
        require((aUnderlying == address(this)) && _isEthCallOption, "ERR_OPTION_TYPE");
        return tokenId;
    }

    function setRPulp(address rPulp) public returns(bool) {
        require(msg.sender == _instrumentController, 'ERR_NOT_OWNER'); // OWNER IS OPTIONS.sol
        _rPulp = IRPulp(rPulp);
        return true;
    }

    function setPool(address ePool) public returns(bool) {
        require(msg.sender == _instrumentController, 'ERR_NOT_OWNER'); // OWNER IS OPTIONS.sol
        _ePulp = IEPulp(ePool);
        _approve(address(this), ePool, 1000000 ether);
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
            (uint256 qoPulp, uint256 qrPulp, bool mintSuccess) = mintPrimeOptions(
                amount,
                _strikePrice,
                _underlyingPrice,
                oPulpReceiver,
                rPulpReceiver
            );
            require(mintSuccess, "ERR_MINT_OPTIONS");
            return mintSuccess;
        } else {
            require(_underlying.balanceOf(rPulpReceiver) >= amount, "ERR_BAL_UNDERLYING");
            require(!isEthCallOption(), "ERR_OPTION_TYPE");
            (uint256 qoPulp, uint256 qrPulp, bool mintSuccess) = mintPrimeOptions(
                amount,
                _underlyingPrice,
                _strikePrice,
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
    ) internal returns (uint256, uint256, bool) {
        uint256 qrPulp = qoPulp.mul(numerator).div(denominator);

        _rPulp.mint(
            rPulpReceiver,
            qrPulp
        );
        
        _mint(oPulpReceiver, qoPulp);
        emit Deposit(msg.sender, qoPulp, qrPulp);
        return (qoPulp, qrPulp, true);
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

        uint256 minPrice = minEthPrice(msg.value);
        require(minPrice >= askPrice, "ERR_ASK_PRICE");
        
        return _ePulp.swapTokensToEth(msg.value, minPrice, msg.sender);
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
        
        uint256 minPrice = minEthPrice(msg.value);
        require(minPrice > 0, "ERR_ASK_PRICE");
        
        return _ePulp.swapTokensToEth(msg.value, minPrice, msg.sender);
    }

    /**
     * @dev swaps strike assets to underlying assets and burns prime options
     * @notice burns oPULP, transfers strike asset to contract, sends underlying asset to user
     */
    function swap(uint256 qUnderlying) public returns(bool) {
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_OPULP");
        uint256 qStrike = qUnderlying.mul(_strikePrice).div(_underlyingPrice);
        require(_strike.balanceOf(msg.sender) >= qStrike, "ERR_BAL_STRIKE");

        _burn(msg.sender, qUnderlying);
        _strike.transferFrom(msg.sender, address(this), qStrike);
        return sendEther(msg.sender, qUnderlying);
    }

    /**
     * @dev withdraws exercised strike assets
     * @notice burns rPULP to withdraw strike assets that are from exercised options
     * @return amount of strike assets received
     */
    function withdraw(uint256 qUnderlying) public returns(uint) {
        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        uint256 qStrike = qUnderlying.mul(_strikePrice).div(_underlyingPrice);
        require(rPulpBalance >= qStrike, "ERR_BAL_RPULP");
        require(_strike.balanceOf(address(this)) >= qStrike, "ERR_BAL_STRIKE");

        _rPulp.burn(msg.sender, qStrike);
        
        _strike.transfer(msg.sender, qStrike);
        return qStrike;
    }

    /**
     * @dev burn prime options to withdraw original underlying asset deposits
     * @notice burns oPULP and rPULP to receive initial deposit amount (underlying asset)
     * @return bool if the transaction succeeds
     */
    function close(uint256 qUnderlying) public returns(bool) {

        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        uint256 qStrike = qUnderlying.mul(_strikePrice).div(_underlyingPrice);

        require(rPulpBalance >= qStrike, "ERR_BAL_RPULP");
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_OPULP");

        _rPulp.burn(msg.sender, qStrike);        
        _burn(msg.sender, qUnderlying);
        return sendEther(msg.sender, qUnderlying);
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
        return (address(_underlying) == address(this));
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
}