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
    PrimeOption public _prime20;

    constructor(
        address primeAddress
    ) public {
        _prime = IPrime(primeAddress);
    }

    /**
     * @dev sets the redeem Pulp type for the option, Call Pulp or Put Pulp (cPulp or pPulp)
     */
    function setRPulp(address pulp) public onlyOwner {
        _prime20.setRPulp(pulp);
    }

    function setPool(address ePulp) public onlyOwner {
        _prime20.setPool(ePulp);
    }

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
        ERC20 aToken,
        uint256 tExpiry,
        bool isCall,
        string memory name
    ) 
        public
        payable
        onlyOwner
        returns (address)
    {
        _nonce = _nonce.add(1);
        uint256 tokenId;

        _prime20 = new PrimeOption(
            name,
            address(_prime)
        );

        // if its a call the underlying q will be 1 and the address will be the erc-20 oPulp
        // else its a put, the underlying q+a is the strike q+a and 
        // the strike q is 1 ether and strike address is erc-20 oPulp
        // e.g. 1 ETH / 150 DAI Call vs. 150 DAI / 1 ETH Put
        if(isCall) {
            require(msg.value >= qEth, 'ERR_BAL_ETH');
            tokenId = _prime.createPrime
                .value(qEth)(
                qEth,
                address(_prime20),
                qToken,
                address(aToken),
                tExpiry,
                address(this)
            );
        } else {
            aToken.transferFrom(msg.sender, address(this), qToken);
            aToken.approve(address(_prime), qToken);
            tokenId = _prime.createPrime(
                qToken,
                address(aToken),
                qEth,
                address(_prime20),
                tExpiry,
                address(this)
            );
        }
        
        _prime20.setParentToken(tokenId);
        _primeMarkets[_nonce] = address(_prime20);
        return address(_prime20);
    }
}

