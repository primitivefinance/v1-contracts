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

abstract contract IRPulp {
    function mint(address user, uint256 amount) public payable virtual returns (bool);
    function burn(address user, uint256 amount) public payable virtual returns (bool);
    function balanceOf(address user) public view virtual returns (uint);
}

abstract contract IEPool {
    function addLiquidity(
        uint256 minQLiquidity,
        uint256 maxQTokens
    ) public payable virtual returns(uint256);
    function removeLiquidity(
        uint256 qLiquidity,
        uint256 minQEth,
        uint256 minQTokens
    ) public virtual returns (uint256, uint256);
    function swapTokensToEth(
        uint256 qTokens,
        uint256 minQEth,
        address payable receiver
    ) public virtual returns (uint);
    function swapEthToTokens(
        uint256 qTokens
    ) public payable virtual returns (uint256);
    function getInputPrice(
        uint256 qInput,
        uint256 rInput,
        uint256 rOutput
    ) public view virtual returns (uint256);
    function getOutputPrice(
        uint256 qOutput,
        uint256 rInput,
        uint256 rOutput
    ) public view virtual returns (uint256);
    function tokenReserves() public view virtual returns (uint256);

}

contract PrimeERC20 is ERC20Detailed("Prime Option Token", "Prime", 18), ERC20 {
    using SafeMath for uint256;

    uint256 public _parentToken;
    address public _primeAddress;
    IPrime public _prime;
    Instruments.Primes public _properties;
    address public _controller;

    ERC20 public _underlying;
    ERC20 public _strike;
    IRPulp public _rPulp;
    IEPool public _ePool;
    address public _ePoolAddress;
    address public _strikeAddress;

    uint256 public _ratio;
    uint256 public _test;
    uint256 public _test2;

    constructor (address prime) public {
        _primeAddress = prime;
        _prime = IPrime(prime);
        _controller = msg.sender;
    }

    receive() external payable {}

    function setParentToken(uint256 tokenId) public returns(uint256) {
        /* require(msg.sender == _controller, "ERR_NOT_OWNER"); */
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
        _strikeAddress = aStrike;
        _ratio = qStrike;
        return tokenId;
    }

    function setPulp(address rPulp) public returns(bool) {
        /* require(msg.sender == _controller, 'ERR_NOT_OWNER'); */ // OWNER IS OPTIONS.sol
        _rPulp = IRPulp(rPulp);
        return true;
    }

    function setPool(address ePool) public returns(bool) {
        /* require(msg.sender == _controller, 'ERR_NOT_OWNER'); */ // OWNER IS OPTIONS.sol
        _ePool = IEPool(ePool);
        _ePoolAddress = ePool;
        _approve(address(this), ePool, 1000000 ether);
        return true;
    }

    /**
     * @dev deposits underlying assets to mint prime options
     */
    function deposit() public payable returns (bool) {
        require(msg.value > 0, "ERR_ZERO_VALUE");
        // SWITCH TO RPULP
        /* _liabilities[msg.sender] = _liabilities[msg.sender].add(msg.value);
        _liability = _liability.add(msg.value); */

        // mint rPulp equal to strike amount proportional to deposit
        _rPulp.mint(
            msg.sender,
            msg.value
                .mul(_ratio)
                .div(1 ether)
        );
        
        _mint(msg.sender, msg.value);
        return true;
    }

    /**
     * @dev deposits underlying assets to mint prime options which are sold to exchange pool
     */
    function depositAndSell() public payable returns (uint) {
        require(msg.value > 0, "ERR_ZERO_VALUE");
        _rPulp.mint(
            msg.sender,
            msg.value
                .mul(_ratio)
                .div(1 ether)
        );
        
        _mint(
            address(this), 
            msg.value
        );

        uint256 minPrice = _ePool.getInputPrice(
            msg.value,
            _ePool.tokenReserves(),
            address(_ePoolAddress).balance
        );
        
        return _ePool.swapTokensToEth(msg.value, minPrice, msg.sender);
    }

    /**
     * @dev swaps strike assets to underlying assets and burns prime options
     */
    function swap(uint256 qUnderlying) public returns(bool) {
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_P");
        uint256 qStrike = qUnderlying.mul(_ratio).div(1 ether);
        require(_strike.balanceOf(msg.sender) >= qStrike, "ERR_BAL_S");

        /* _asset = _asset.add(qStrike); */

        _burn(msg.sender, qUnderlying);
        _strike.transferFrom(msg.sender, address(this), qStrike);
        return sendEther(msg.sender, qUnderlying);
    }

    /**
     * @dev withdraws exercised strike assets
     */
    function withdraw(uint256 qUnderlying) public returns(uint) {
        // SWAP TO RPULP
        /* uint256 uL = _liabilities[msg.sender];
        require(uL >= qUnderlying, "ERR_BAL_L");

        uint256 sW = qUnderlying.mul(_asset).div(_liability);
        _liabilities[msg.sender] = uL.sub(qUnderlying);
        _liability = _liability.sub(qUnderlying); */

        // gets deposit certificate of underlying
        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        uint256 qStrike = qUnderlying.mul(_ratio).div(1 ether);
        // gets strike proportional to underlying and checks if enough is in contract
        require(rPulpBalance >= qStrike, 'ERR_BAL_PULP');
        require(_strike.balanceOf(address(this)) >= qStrike, "ERR_BAL_S");

        // burns deposit certificate
        _rPulp.burn(msg.sender, qStrike);

        /* _asset = _asset.sub(sW); */
        
        _strike.transfer(msg.sender, qStrike);
        return qStrike;
    }

    /**
     * @dev burn prime options to withdraw original underlying asset deposits
     */
    function close(uint256 qUnderlying) public returns(bool) {
        // SWAP TO PULP
        /* uint256 uL = _liabilities[msg.sender];
        require(uL >= qUnderlying, "ERR_BAL_L");
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_P");

        _liabilities[msg.sender] = uL.sub(qUnderlying);
        _liability = _liability.sub(qUnderlying); */

        // gets deposit certificate of underlying
        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        uint256 qStrike = qUnderlying.mul(_ratio).div(1 ether);
        // gets strike proportional to underlying and checks if enough is in contract
        require(rPulpBalance >= qStrike, 'ERR_BAL_PULP');

        // require prime options
        require(balanceOf(msg.sender) >= qUnderlying, "ERR_BAL_P");

        _rPulp.burn(msg.sender, qStrike);        
        _burn(msg.sender, qUnderlying);
        return sendEther(msg.sender, qUnderlying);
    }

    /**
     @dev function to send ether with the most security
     */
    function sendEther(address payable user, uint256 amount) internal returns (bool) {
        _test = amount;
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }

    function append(string memory a, string memory b, string memory c, string memory d, string memory e) internal pure returns (string memory) {
        return string(abi.encodePacked(a, b, c, d, e));
    }

}