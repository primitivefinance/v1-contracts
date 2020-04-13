pragma solidity ^0.6.0;

/**
 * @title Primitive's Market Creator Contract
 * @author Primitive
 */

import './ERC20/PrimeERC20.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721Holder.sol';

contract Options is Ownable, ERC721Holder {
    using SafeMath for uint256;

    mapping(uint256 => address) public _primeMarkets;
    uint256 public _nonce;
    IPrime public _prime;
    PrimeERC20 public _prime20;

    constructor(
        address primeAddress
    ) public {
        _prime = IPrime(primeAddress);
    }

    function setRPulp(address rPulp) public onlyOwner {
        _prime20.setRPulp(rPulp);
    }

    function setPool(address ePulp) public onlyOwner {
        _prime20.setPool(ePulp);
    }

    function addEthOption(
        uint256 qStrike,
        ERC20 aStrike,
        uint256 tExpiry,
        bool isCall,
        string memory name
    ) 
        public
        payable
        onlyOwner
        returns (uint256)
    {
        _nonce = _nonce.add(1);
        uint256 tokenId;

        _prime20 = new PrimeERC20(
            name,
            address(_prime)
        );

        // if its a call the underlying q will be 1 and the address will be the erc-20 oPulp
        // else its a put, the underlying q+a is the strike q+a and 
        // the strike q is 1 ether and strike address is erc-20 oPulp
        // e.g. 1 ETH / 150 DAI Call vs. 150 DAI / 1 ETH Put
        if(isCall) {
            require(msg.value >= 1 ether, 'ERR_BAL_ETH');
            tokenId = _prime.createPrime
                .value(1 ether)(
                1 ether,
                address(_prime20),
                qStrike,
                address(aStrike),
                tExpiry,
                address(this)
            );
        } else {
            aStrike.transferFrom(msg.sender, address(this), qStrike);
            aStrike.approve(address(_prime), qStrike);
            tokenId = _prime.createPrime(
                qStrike,
                address(aStrike),
                1 ether,
                address(_prime20),
                tExpiry,
                address(this)
            );
        }
        
        _prime20.setParentToken(tokenId);
        _primeMarkets[_nonce] = address(_prime20);
        return _nonce;
    }
}

