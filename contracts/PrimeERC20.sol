pragma solidity ^0.6.2;

/**
 * @title Primitive's ERC-20 Option
 * @author Primitive
 */

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './Instruments.sol';

abstract contract IPrime {
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual;
    function createPrime(
        uint256 qUnderlying,
        address aUnderlying,
        uint256 qStrike,
        address aStrike,
        uint256 tExpiry,
        address receiver
    ) external virtual returns (uint256 tokenId);
    function exercise(uint256 tokenId) external payable virtual returns (bool);
    function close(uint256 tokenToClose, uint256 tokenToBurn) external virtual returns (bool);
    function withdraw(uint256 amount, address asset) public virtual returns (bool);
    function getPrime(uint256 tokenId) external view virtual returns(
            address writer,
            uint256 qUnderlying,
            address aUnderlying,
            uint256 qStrike,
            address aStrike,
            uint256 tExpiry,
            address receiver,
            bytes4 series,
            bytes4 symbol
        );
    function getSeries(uint256 tokenId) external view virtual returns (bytes4 series);
    function isTokenExpired(uint256 tokenId) public view virtual returns (bool);
}

abstract contract IRPulp {
    function mint(address user, uint256 amount) public payable virtual returns (bool);
    function burn(address user, uint256 amount) public payable virtual returns (bool);
    function balanceOf(address user) public view virtual returns (uint);
}

contract PrimeERC20 is ERC20Detailed("Prime Option Token", "Prime", 18), ERC20 {
    using SafeMath for uint256;

    uint256 public _parentToken;
    address public _primeAddress;
    IPrime public _prime;
    Instruments.Primes public _properties;
    address public _controller;
    mapping(address => uint256) public _liabilities;
    uint256 public _liability;
    uint256 public _asset;
    ERC20 public _underlying;
    ERC20 public _strike;
    IRPulp public _rPulp;
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
        require(msg.sender == _controller, "ERR_OWNER");
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
        _ratio = qStrike;
        return tokenId;
    }

    function setPulp(address rPulp) public returns(bool) {
        require(msg.sender == _controller, 'ERR_NOT_OWNER');
        _rPulp = IRPulp(rPulp);
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
     * @dev swaps strike assets to underlying assets and burns prime options
     */
    function swap(uint256 amount) public returns(bool) {
        require(balanceOf(msg.sender) >= amount, "ERR_BAL_P");
        uint256 qStrike = amount.mul(_ratio).div(10**18);
        require(_strike.balanceOf(msg.sender) >= qStrike, "ERR_BAL_S");

        /* _asset = _asset.add(qStrike); */

        _burn(msg.sender, amount);
        _strike.transferFrom(msg.sender, address(this), qStrike);
        return sendEther(msg.sender, amount);
    }

    /**
     * @dev withdraws exercised strike assets
     */
    function withdraw(uint256 amount) public returns(bool) {
        // SWAP TO RPULP
        /* uint256 uL = _liabilities[msg.sender];
        require(uL >= amount, "ERR_BAL_L");

        uint256 sW = amount.mul(_asset).div(_liability);
        _liabilities[msg.sender] = uL.sub(amount);
        _liability = _liability.sub(amount); */

        // gets deposit certificate of underlying
        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        uint256 qStrike = amount.mul(_ratio).div(1 ether);
        // gets strike proportional to underlying and checks if enough is in contract
        require(rPulpBalance >= qStrike, 'ERR_BAL_PULP');
        require(_strike.balanceOf(address(this)) >= qStrike, "ERR_BAL_S");

        // burns deposit certificate
        _rPulp.burn(msg.sender, qStrike);

        /* _asset = _asset.sub(sW); */
        
        _strike.transfer(msg.sender, qStrike);
        return true;
    }

    /**
     * @dev burn prime options to withdraw original underlying asset deposits
     */
    function close(uint256 amount) public returns(bool) {
        // SWAP TO PULP
        /* uint256 uL = _liabilities[msg.sender];
        require(uL >= amount, "ERR_BAL_L");
        require(balanceOf(msg.sender) >= amount, "ERR_BAL_P");

        _liabilities[msg.sender] = uL.sub(amount);
        _liability = _liability.sub(amount); */

        // require pulp
        uint256 rPulpBalance = _rPulp.balanceOf(msg.sender);
        require(rPulpBalance >= amount, 'ERR_BAL_PULP');
        // require prime options
        require(balanceOf(msg.sender) >= amount, "ERR_BAL_P");

        _rPulp.burn(msg.sender, amount);        
        _burn(msg.sender, amount);
        return sendEther(msg.sender, amount);
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