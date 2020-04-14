pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Creator Contract
 * @author Primitive
 */

import '../PrimeOption.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/token/ERC721/ERC721Holder.sol';

contract ControllerOption is Ownable, ERC721Holder {
    using SafeMath for uint256;

    mapping(uint256 => address) public _primeMarkets;
    uint256 public _nonce;
    IPrime public _prime;

    constructor(
        address controller,
        address primeAddress
    ) public {
        transferOwnership(controller);
        _prime = IPrime(primeAddress);
    }

    /**
     * @dev sets the redeem Pulp type for the option, Call Pulp or Put Pulp (cPulp or pPulp)
     */
    /* function setRPulp(address pulp) public onlyOwner {
        _prime20.setRPulp(pulp);
    }

    function setPool(address ePulp) public onlyOwner {
        _prime20.setPool(ePulp);
    } */

    /**
     * @dev Creates a New Eth Option Market including oPulp, cPulp or pPulp, ePulp
     * @param qEth quantity of ether as underlying or strike asset
     * @param qToken quantity of ERC-20 token as underlying or strike asset
     * @param aToken ERC-20 contract of the token
     * @param tExpiry expiration date of the option
     * @param isCall bool to clarify if the option is a call or a put
     * @param name Full option name in the format Underlying Asset + Expiry + Strike Price + Strike Asset
     * @return _nonce the nonce of the market
     */
    function addEthOption(
        uint256 qEth,
        uint256 qToken,
        IERC20 aToken,
        uint256 tExpiry,
        bool isCall,
        string memory name
    ) 
        public
        payable
        onlyOwner
        returns (address)
    {
        PrimeOption primeOption = deployPrimeOption(name);
        uint256 tokenId;

        // if its a call the underlying q will be 1 and the address will be the erc-20 oPulp
        // else its a put, the underlying q+a is the strike q+a and 
        // the strike q is 1 ether and strike address is erc-20 oPulp
        // e.g. 1 ETH / 150 DAI Call vs. 150 DAI / 1 ETH Put
        if(isCall) {
            tokenId = _prime.createPrime(
                qEth,
                address(primeOption),
                qToken,
                address(aToken),
                tExpiry,
                address(this)
            );
        } else {
            tokenId = _prime.createPrime(
                qToken,
                address(aToken),
                qEth,
                address(primeOption),
                tExpiry,
                address(this)
            );
        }
        
        primeOption.setParentToken(tokenId);
        return address(primeOption);
    }

    /**
     * @dev Creates a New Eth Option Market including oPulp, cPulp or pPulp, ePulp
     * @param name Full option name in the format Underlying Asset + Expiry + Strike Price + Strike Asset
     * @return _nonce the nonce of the market
     */
    function addTokenOption(
        uint256 qUnderlying,
        IERC20 aUnderlying,
        uint256 qStrike,
        IERC20 aStrike,
        uint256 tExpiry,
        string memory name
    ) 
        public
        onlyOwner
        returns (address)
    {
        PrimeOption primeOption = deployPrimeOption(name);

        uint256 tokenId = _prime.createPrime(
            qUnderlying,
            address(aUnderlying),
            qStrike,
            address(aStrike),
            tExpiry,
            address(this)
        );
        
        primeOption.setParentToken(tokenId);
        return address(primeOption);
    }

    function deployPrimeOption(string memory name) internal returns (PrimeOption) {
        _nonce = _nonce.add(1);
        PrimeOption primeOption = new PrimeOption(
            name,
            address(_prime)
        );
        _primeMarkets[_nonce] = address(primeOption);
        return primeOption;
    }
}

