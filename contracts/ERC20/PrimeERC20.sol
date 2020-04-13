pragma solidity ^0.6.2;

/**
 * @title Primitive's ERC-20 Option
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '../Instruments.sol';
import './InterfaceERC20.sol';

contract PrimeERC20 is ERC20Detailed, ERC20 {
    using SafeMath for uint256;

    uint256 public _parentToken;
    address public _instrumentController;
    IPrime public _prime;
    
    ERC20 public _underlying;
    ERC20 public _strike;
    IRPulp public _rPulp;
    IEPulp public _ePulp;

    uint256 public _strikePrice;

    constructor (
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
        _underlying = ERC20(aUnderlying);
        _strike = ERC20(aStrike);
        _strikePrice = qStrike;
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
     * @dev deposits underlying assets to mint prime options
     * @notice deposits msg.value and receives msg.value amount of oPULP and rPULP tokens
     * @return bool if the transaction succeeds
     */
    function deposit() public payable returns (bool) {
        require(msg.value > 0, "ERR_ZERO_VALUE");

        _rPulp.mint(
            msg.sender,
            msg.value
                .mul(_strikePrice)
                .div(1 ether)
        );
        
        _mint(msg.sender, msg.value);
        return true;
    }

    /**
     * @dev deposits underlying assets to mint prime options which are sold to exchange pool
     * @notice mint msg.value amt of oPULP + rPULP. 
     * oPULP is sold to exchange pool for ether which is sent to user.
     * @return amount of ether premium received for selling oPULP
     */
    function depositAndSell() public payable returns (uint) {
        require(msg.value > 0, "ERR_ZERO_VALUE");
        _rPulp.mint(
            msg.sender,
            msg.value
                .mul(_strikePrice)
                .div(1 ether)
        );
        
        _mint(
            address(this), 
            msg.value
        );

        uint256 minPrice = _ePulp.getInputPrice(
            msg.value,
            _ePulp.tokenReserves(),
            address(_ePulp).balance
        );
        
        return _ePulp.swapTokensToEth(msg.value, minPrice, msg.sender);
    }

    /**
     * @dev swaps strike assets to underlying assets and burns prime options
     * @notice burns oPULP, transfers strike asset to contract, sends underlying asset to user
     */
    function swap(uint256 qUnderlying) public returns(bool) {
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_OPULP");
        uint256 qStrike = qUnderlying.mul(_strikePrice).div(1 ether);
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
        uint256 qStrike = qUnderlying.mul(_strikePrice).div(1 ether);
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
        uint256 qStrike = qUnderlying.mul(_strikePrice).div(1 ether);

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
}