pragma solidity ^0.6.2;

/**
 * @title   DFCP's Exchange Contract
 * @notice  A Decentralized Exchange to manage the buying and selling
            of Prime Option tokens.
 * @author  Decentralized Financial Crafting Protocol
 */


import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";



abstract contract IPrime {
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual;
    function createPrime(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) external virtual returns (bool);
    function exercise(uint256 _tokenId) external virtual returns (bool);
    function close(uint256 _collateralId, uint256 _burnId) external virtual returns (bool);
    function withdraw(uint256 _amount, address _asset) public virtual returns (bool);
}



contract Exchange is ERC721Holder, ReentrancyGuard {
    using SafeMath for uint256;

    address private _primeAddress;

    event SellOrder(address _seller, uint256 _askPrice, uint256 _tokenId, bool _filled);
    event BuyOrder(address _buyer, uint256 _bidPrice, uint256 _tokenId, bool _filled);
    event FillOrder(address _seller, address _buyer, uint256 _filledPrice, uint256 _tokenId);
    event CloseOrder(address _user, uint256 _tokenId, bool _buyOrder);

    struct SellOrders {
        address payable seller;
        uint256 askPrice;
        uint256 tokenId;
    }

    struct BuyOrders {
        address payable buyer;
        uint256 bidPrice;
        uint256 tokenId;
    }

    /* Maps tokenIds to sell orders */
    mapping(uint256 => SellOrders) public _sellOrders;

    /* Maps tokenIds to buy orders */
    mapping(uint256 => BuyOrders) public _buyOrders;


    constructor(address primeAddress) public {
        _primeAddress = primeAddress;
        _buyOrders[0] = BuyOrders(
            address(0),
            0,
            0
        );
        _sellOrders[0] = SellOrders(
            address(0),
            0,
            0
        );
    }

    function getPrimeAddress() public view returns (address) {
        return _primeAddress;
    }

    function sellOrder(
        uint256 _tokenId, 
        uint256 _askPrice
    ) 
        external
        nonReentrant
        returns (bool) 
    {
        bool filled = false;
        bool buyOrder = false;

        /* CHECKS */
        require(_tokenId > 0, 'Token ID must exist');
        require(_askPrice > 0, 'Ask Price cannot be 0');

        /* EFFECTS */
        BuyOrders memory _buy = _buyOrders[_tokenId];
        if(_buy.bidPrice >= _askPrice && _askPrice > 0) {
            filled = true;
        } else {
            _sellOrders[_tokenId] = SellOrders(
                msg.sender,
                _askPrice,
                _tokenId
            );

        }   
        
        /* INTERACTIONS */
        IPrime _prime = IPrime(_primeAddress);
        
        if(filled) {
            fillOrder(buyOrder, _tokenId, _buy.bidPrice, _askPrice, _buy.buyer, msg.sender);
        } else {
            _prime.safeTransferFrom(msg.sender, address(this), _tokenId);
        }
        
        emit SellOrder(msg.sender, _askPrice, _tokenId, filled);
        return true;
    }

    function buyOrder(
        uint256 _tokenId, 
        uint256 _bidPrice
    ) 
        external 
        payable
        nonReentrant
        returns (bool) 
    {
        bool filled = false;
        bool buyOrder = true;

        /* CHECKS */
        require(_tokenId > 0, 'Token ID must exist');
        require(_bidPrice > 0, 'Ask Price cannot be 0');
        require(msg.value == _bidPrice, 'Value should = bidPrice');

        /* EFFECTS */
        SellOrders memory _sell = _sellOrders[_tokenId];
        if(_bidPrice >= _sell.askPrice && _sell.askPrice > 0) {
            filled = true;
        } else {
            _buyOrders[_tokenId] = BuyOrders(
                msg.sender,
                _bidPrice,
                _tokenId
            );
        }

        /* INTERACTIONS */
        IPrime _prime = IPrime(_primeAddress);

        emit BuyOrder(msg.sender, _bidPrice, _tokenId, filled);

        if(filled) {
            fillOrder(buyOrder, _tokenId, _bidPrice, _sell.askPrice, msg.sender, _sell.seller);
        }

        return true;
    }

    function fillOrder(
        bool _buyOrder,
        uint256 _tokenId, 
        uint256 _bidPrice, 
        uint256 _askPrice, 
        address payable _buyer, 
        address payable _seller
    ) internal {
        
        /* CHECKS */
        require(_bidPrice >= _askPrice, 'Bid price must be >= ask price');

        IPrime _prime = IPrime(_primeAddress);

        /* EFFECTS */
        if(_buyOrder) {
            closeSellOrder(_tokenId);
        } else {
            closeBuyOrder(_tokenId);
        }


        uint256 _remainder = _bidPrice.sub(_askPrice);

        require(_remainder >= 0, 'Remained cannot be 0');

        /* INTERACTIONS */

        /* 
         * IF ITS BUY ORDER - PRIME IS OWNED BY EXCHANGE
         * IF ITS SELL ORDER - PRIME IS OWNED BY SELLER
         * IF ITS A SELL ORDER WITH A MATCHED BUY ORDER
         * TRANSFER OF PRIME IS DIRECTLY P2P
         */
        if(_buyOrder) {
            _prime.safeTransferFrom(address(this), _buyer, _tokenId);
        } else {
            _prime.safeTransferFrom(_seller, _buyer, _tokenId);
        }
        
        _seller.send(_askPrice);

        if(_remainder > 0) {
            _buyer.send(_remainder);
        }

        emit FillOrder(_seller, _buyer, _askPrice, _tokenId);
    }

    function closeBuyOrder(uint256 _tokenId) internal {
        /* CLEARS BUY ORDER */
        _buyOrders[_tokenId] = _buyOrders[0];
    }

    function closeSellOrder(uint256 _tokenId) internal {
        /* CLEARS SELL ORDER */
        _sellOrders[_tokenId] = _sellOrders[0];
    }

    function closeOrder(uint256 _tokenId) external {
        require(_tokenId > 0, 'Token must exist to close it');

        bool buyOrder = false;
        BuyOrders memory _buys = _buyOrders[_tokenId];
        
        /* IF THE BID PRICE > 0 ITS A BUY ORDER, ELSE ITS A SELL ORDER */
        if(_buys.bidPrice > 0) {
            require(msg.sender == _buys.buyer, 'can only close if you are buyer');

            buyOrder = true;

            closeBuyOrder(_tokenId);
        } else {
            SellOrders memory _sells = _sellOrders[_tokenId];
            require(msg.sender == _sells.seller, 'can only close if you are seller');

            closeSellOrder(_tokenId);
        }

        emit CloseOrder(msg.sender, _tokenId, buyOrder);
    }

    function getBuyOrder(uint256 _tokenId) 
        public 
        view 
        returns(
            address payable buyer,
            uint256 bidPrice,
            uint256 tokenId
        )
    {
        BuyOrders memory _buys = _buyOrders[_tokenId];
        return (
            _buys.buyer,
            _buys.bidPrice,
            _buys.tokenId
        );
    }

    function getSellOrder(uint256 _tokenId) 
        public 
        view 
        returns(
            address payable seller,
            uint256 askPrice,
            uint256 tokenId
        )
    {
        SellOrders memory _sells = _sellOrders[_tokenId];
        return (
            _sells.seller,
            _sells.askPrice,
            _sells.tokenId
        );
    }

}