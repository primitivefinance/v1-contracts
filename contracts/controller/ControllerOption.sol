pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Creator Contract
 * @author Primitive
 */

import '../PrimeOption.sol';
import { IControllerMarket } from './ControllerInterface.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721Holder.sol';

contract ControllerOption is Ownable, ERC721Holder {
    using SafeMath for uint256;

    /* mapping(uint256 => address) public _primeMarkets; */
    uint256 public _nonce;
    IPrime public _prime;
    IControllerMarket public market;

    constructor(
        address controller,
        address primeAddress
    ) public {
        transferOwnership(controller);
        _prime = IPrime(primeAddress);
        market = IControllerMarket(controller);
    }

    function addOption(
        uint256 qUnderlying,
        IERC20 aUnderlying,
        uint256 qStrike,
        IERC20 aStrike,
        uint256 tExpiry,
        string memory name,
        bool isEthCallOption,
        bool isTokenOption
    ) 
        public 
        payable 
        onlyOwner 
        returns (address payable)
    {
        PrimeOption primeOption = deployPrimeOption(name);
        uint256 tokenId;
        address redeem;

        // if its a call the underlying q will be 1 and the address will be the erc-20 oPulp
        // else its a put, the underlying q+a is the strike q+a and 
        // the strike q is 1 ether and strike address is erc-20 oPulp
        // e.g. 1 ETH / 150 DAI Call vs. 150 DAI / 1 ETH Put
        if(isEthCallOption) {
            tokenId = _prime.createPrime(
                qUnderlying,
                address(primeOption),
                qStrike,
                address(aStrike),
                tExpiry,
                address(this)
            );
        } else if(isTokenOption) {
            tokenId = _prime.createPrime(
                qUnderlying,
                address(aUnderlying),
                qStrike,
                address(aStrike),
                tExpiry,
                address(this)
            );
        } else {
            tokenId = _prime.createPrime(
                qStrike,
                address(aStrike),
                qUnderlying,
                address(primeOption),
                tExpiry,
                address(this)
            );
        }   
    
        primeOption.setParentToken(tokenId);
        return address(primeOption);
    }

    function deployPrimeOption(string memory name) internal returns (PrimeOption) {
        _nonce = _nonce.add(1);
        PrimeOption primeOption = new PrimeOption(
            name,
            address(_prime)
        );
        /* _primeMarkets[_nonce] = address(primeOption); */
        return primeOption;
    }

    function setExchange(address exchange, address payable primeOption) public onlyOwner returns (bool) {
        PrimeOption option = PrimeOption(primeOption);
        return option.setPool(exchange);
    }

    function setRedeem(address redeem, address payable primeOption) public onlyOwner returns (bool) {
        PrimeOption option = PrimeOption(primeOption);
        return option.setRPulp(redeem);
    }
}

