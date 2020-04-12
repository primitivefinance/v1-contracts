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

    event AddOptionChain(
        bytes4 series, 
        uint256 tExpiry, 
        uint256 increment, 
        address aUnderlying, 
        address aStrike,
        uint256 baseRatio
    );

     /* 
        THE CORE CHAIN STRUCT
        SERIES IS A HASH OF THE COLLATERAL/STRIKE/EXPIRATON
        COLLATERAL AND STRIKE ARE THE ADDRESSES OF THE TOKENS
        BASE RATIO IS THE CURRENT RATE BETWEEN ASSETS AT CREATION
     */
    struct OptionsChain {
        bytes4 series;
        uint256 tExpiry;
        uint256 increment;
        address aUnderlying;
        address aStrike;
        uint256 baseRatio;
        
    }

    uint256 public nonce;
    mapping(uint256 => OptionsChain) public _optionChains;
    mapping(uint256 => address) public _primeMarkets;
    uint256 public _nonce;
    address public _exchangeAddress;
    address public _primeAddress;
    IPrime public _prime;

    constructor(
        address exchangeAddress,
        uint256 tExpiry,
        uint256 increment,
        address aUnderlying,
        address aStrike,
        uint256 baseRatio
    ) public {
        _exchangeAddress = exchangeAddress;
        addOptionChain(tExpiry, increment, aUnderlying, aStrike, baseRatio);
    }

    function setPrimeAddress(address prime) public onlyOwner returns (bool) {
        _primeAddress = prime;
        _prime = IPrime(prime);
        return true;
    }

    function addEthOption(
        uint256 qStrike,
        ERC20 aStrike,
        uint256 tExpiry,
        bool isCall
    ) 
        public
        payable
        onlyOwner
        returns (uint256)
    {
        _nonce = _nonce.add(1);
        uint256 tokenId;

        PrimeERC20 prime20 = new PrimeERC20(
            _primeAddress
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
                address(prime20),
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
                address(prime20),
                tExpiry,
                address(this)
            );
        }
        
        prime20.setParentToken(tokenId);
        _primeMarkets[_nonce] = address(prime20);
        return _nonce;
    }


    function addOptionChain(
        uint256 tExpiry, 
        uint256 increment, 
        address aUnderlying, 
        address aStrike,
        uint256 baseRatio
    ) 
        public
        onlyOwner
        returns (bool) 
    {

        bytes4 series = bytes4(
            keccak256(abi.encodePacked(aUnderlying))) 
            ^ bytes4(keccak256(abi.encodePacked(aStrike))) 
            ^ bytes4(keccak256(abi.encodePacked(tExpiry))
        );

        nonce = nonce.add(1);
        _optionChains[nonce] = OptionsChain(
            series,
            tExpiry, 
            increment, 
            aUnderlying, 
            aStrike,
            baseRatio
        );

        emit AddOptionChain(series, tExpiry, increment, aUnderlying, aStrike, baseRatio);
        return true;
    }

    function getOptionChain(uint256 _id) public view returns(
        bytes4 series,
        uint256 tExpiry,
        uint256 increment,
        address aUnderlying,
        address aStrike,
        uint256 baseRatio
        
    ) 
    {
        OptionsChain memory optionChainObject = _optionChains[_id];
        return (
            optionChainObject.series,
            optionChainObject.tExpiry,
            optionChainObject.increment,
            optionChainObject.aUnderlying,
            optionChainObject.aStrike,
            optionChainObject.baseRatio
        );
    }
}

