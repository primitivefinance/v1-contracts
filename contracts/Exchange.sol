pragma solidity ^0.6.2;

/**
 * @title   Primitive's Exchange Contract
 * @notice  A Decentralized Exchange to manage the buying and selling
            of Prime Option tokens.
 * @author  Primitive
*/

/*
 * @dev Provides information about the current execution context, including the
 * sender of the transaction and its data. While these are generally available
 * via msg.sender and msg.data, they should not be accessed in such a direct
 * manner, since when dealing with GSN meta-transactions the account sending and
 * paying for execution may not be the actual sender (as far as an application
 * is concerned).
 *
 * This contract is only required for intermediate, library-like contracts.
 */
contract Context {
    // Empty internal constructor, to prevent people from mistakenly deploying
    // an instance of this contract, which should be used via inheritance.
    constructor () internal { }

    function _msgSender() internal view virtual returns (address payable) {
        return msg.sender;
    }

    function _msgData() internal view virtual returns (bytes memory) {
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
        return msg.data;
    }
}

/**
 * @dev Contract module which provides a basic access control mechanism, where
 * there is an account (an owner) that can be granted exclusive access to
 * specific functions.
 *
 * By default, the owner account will be the one that deploys the contract. This
 * can later be changed with {transferOwnership}.
 *
 * This module is used through inheritance. It will make available the modifier
 * `onlyOwner`, which can be applied to your functions to restrict their use to
 * the owner.
 */
contract Ownable is Context {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    /**
     * @dev Initializes the contract setting the deployer as the initial owner.
     */
    constructor () internal {
        address msgSender = _msgSender();
        _owner = msgSender;
        emit OwnershipTransferred(address(0), msgSender);
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        require(_owner == _msgSender(), "Ownable: caller is not the owner");
        _;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will leave the contract without an owner,
     * thereby removing any functionality that is only available to the owner.
     */
    function renounceOwnership() public virtual onlyOwner {
        emit OwnershipTransferred(_owner, address(0));
        _owner = address(0);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Can only be called by the current owner.
     */
    function transferOwnership(address newOwner) public virtual onlyOwner {
        _transferOwnership(newOwner);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function _transferOwnership(address newOwner) internal virtual {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/**
 * @dev Wrappers over Solidity's arithmetic operations with added overflow
 * checks.
 *
 * Arithmetic operations in Solidity wrap on overflow. This can easily result
 * in bugs, because programmers usually assume that an overflow raises an
 * error, which is the standard behavior in high level programming languages.
 * `SafeMath` restores this intuition by reverting the transaction when an
 * operation overflows.
 *
 * Using this library instead of the unchecked operations eliminates an entire
 * class of bugs, so it's recommended to use it always.
 */
library SafeMath {
    /**
     * @dev Returns the addition of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `+` operator.
     *
     * Requirements:
     * - Addition cannot overflow.
     */
    function add(uint256 a, uint256 b) internal pure returns (uint256) {
        uint256 c = a + b;
        require(c >= a, "SafeMath: addition overflow");

        return c;
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b) internal pure returns (uint256) {
        return sub(a, b, "SafeMath: subtraction overflow");
    }

    /**
     * @dev Returns the subtraction of two unsigned integers, reverting with custom message on
     * overflow (when the result is negative).
     *
     * Counterpart to Solidity's `-` operator.
     *
     * Requirements:
     * - Subtraction cannot overflow.
     */
    function sub(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b <= a, errorMessage);
        uint256 c = a - b;

        return c;
    }

    /**
     * @dev Returns the multiplication of two unsigned integers, reverting on
     * overflow.
     *
     * Counterpart to Solidity's `*` operator.
     *
     * Requirements:
     * - Multiplication cannot overflow.
     */
    function mul(uint256 a, uint256 b) internal pure returns (uint256) {
        // Gas optimization: this is cheaper than requiring 'a' not being zero, but the
        // benefit is lost if 'b' is also tested.
        // See: https://github.com/OpenZeppelin/openzeppelin-contracts/pull/522
        if (a == 0) {
            return 0;
        }

        uint256 c = a * b;
        require(c / a == b, "SafeMath: multiplication overflow");

        return c;
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b) internal pure returns (uint256) {
        return div(a, b, "SafeMath: division by zero");
    }

    /**
     * @dev Returns the integer division of two unsigned integers. Reverts with custom message on
     * division by zero. The result is rounded towards zero.
     *
     * Counterpart to Solidity's `/` operator. Note: this function uses a
     * `revert` opcode (which leaves remaining gas untouched) while Solidity
     * uses an invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function div(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        // Solidity only automatically asserts when dividing by 0
        require(b > 0, errorMessage);
        uint256 c = a / b;
        // assert(a == b * c + a % b); // There is no case in which this doesn't hold

        return c;
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b) internal pure returns (uint256) {
        return mod(a, b, "SafeMath: modulo by zero");
    }

    /**
     * @dev Returns the remainder of dividing two unsigned integers. (unsigned integer modulo),
     * Reverts with custom message when dividing by zero.
     *
     * Counterpart to Solidity's `%` operator. This function uses a `revert`
     * opcode (which leaves remaining gas untouched) while Solidity uses an
     * invalid opcode to revert (consuming all remaining gas).
     *
     * Requirements:
     * - The divisor cannot be zero.
     */
    function mod(uint256 a, uint256 b, string memory errorMessage) internal pure returns (uint256) {
        require(b != 0, errorMessage);
        return a % b;
    }
}

/**
 * @title ERC721 token receiver interface
 * @dev Interface for any contract that wants to support safeTransfers
 * from ERC721 asset contracts.
 */
abstract contract IERC721Receiver {
    /**
     * @notice Handle the receipt of an NFT
     * @dev The ERC721 smart contract calls this function on the recipient
     * after a {IERC721-safeTransferFrom}. This function MUST return the function selector,
     * otherwise the caller will revert the transaction. The selector to be
     * returned can be obtained as `this.onERC721Received.selector`. This
     * function MAY throw to revert and reject the transfer.
     * Note: the ERC721 contract address is always the message sender.
     * @param operator The address which called `safeTransferFrom` function
     * @param from The address which previously owned the token
     * @param tokenId The NFT identifier which is being transferred
     * @param data Additional data with no specified format
     * @return bytes4 `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
     */
    function onERC721Received(address operator, address from, uint256 tokenId, bytes memory data)
    public virtual returns (bytes4);
}

contract ERC721Holder is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes memory) public virtual override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}

/**
 * @dev Contract module that helps prevent reentrant calls to a function.
 *
 * Inheriting from `ReentrancyGuard` will make the {nonReentrant} modifier
 * available, which can be applied to functions to make sure there are no nested
 * (reentrant) calls to them.
 *
 * Note that because there is a single `nonReentrant` guard, functions marked as
 * `nonReentrant` may not call one another. This can be worked around by making
 * those functions `private`, and then adding `external` `nonReentrant` entry
 * points to them.
 *
 * TIP: If you would like to learn more about reentrancy and alternative ways
 * to protect against it, check out our blog post
 * https://blog.openzeppelin.com/reentrancy-after-istanbul/[Reentrancy After Istanbul].
 */
contract ReentrancyGuard {
    bool private _notEntered;

    constructor () internal {
        // Storing an initial non-zero value makes deployment a bit more
        // expensive, but in exchange the refund on every call to nonReentrant
        // will be lower in amount. Since refunds are capped to a percetange of
        // the total transaction's gas, it is best to keep them low in cases
        // like this one, to increase the likelihood of the full refund coming
        // into effect.
        _notEntered = true;
    }

    /**
     * @dev Prevents a contract from calling itself, directly or indirectly.
     * Calling a `nonReentrant` function from another `nonReentrant`
     * function is not supported. It is possible to prevent this from happening
     * by making the `nonReentrant` function external, and make it call a
     * `private` function that does the actual work.
     */
    modifier nonReentrant() {
        // On the first call to nonReentrant, _notEntered will be true
        require(_notEntered, "ReentrancyGuard: reentrant call");

        // Any calls to nonReentrant after this point will fail
        _notEntered = false;

        _;

        // By storing the original value once again, a refund is triggered (see
        // https://eips.ethereum.org/EIPS/eip-2200)
        _notEntered = true;
    }
}

/**
 * @dev Contract module which allows children to implement an emergency stop
 * mechanism that can be triggered by an authorized account.
 *
 * This module is used through inheritance. It will make available the
 * modifiers `whenNotPaused` and `whenPaused`, which can be applied to
 * the functions of your contract. Note that they will not be pausable by
 * simply including this module, only once the modifiers are put in place.
 */
contract Pausable is Context {
    /**
     * @dev Emitted when the pause is triggered by a pauser (`account`).
     */
    event Paused(address account);

    /**
     * @dev Emitted when the pause is lifted by a pauser (`account`).
     */
    event Unpaused(address account);

    bool private _paused;

    /**
     * @dev Initializes the contract in unpaused state. Assigns the Pauser role
     * to the deployer.
     */
    constructor () internal {
        _paused = false;
    }

    /**
     * @dev Returns true if the contract is paused, and false otherwise.
     */
    function paused() public view returns (bool) {
        return _paused;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is not paused.
     */
    modifier whenNotPaused() {
        require(!_paused, "Pausable: paused");
        _;
    }

    /**
     * @dev Modifier to make a function callable only when the contract is paused.
     */
    modifier whenPaused() {
        require(_paused, "Pausable: not paused");
        _;
    }

    /**
     * @dev Called by a pauser to pause, triggers stopped state.
     */
    function _pause() internal virtual whenNotPaused {
        _paused = true;
        emit Paused(_msgSender());
    }

    /**
     * @dev Called by a pauser to unpause, returns to normal state.
     */
    function _unpause() internal virtual whenPaused {
        _paused = false;
        emit Unpaused(_msgSender());
    }
}

import './Instruments.sol';

abstract contract IPool {
    function withdrawExercisedEth(address payable _receiver, uint256 amount) external virtual returns (bool);
    function clearLiability(uint256 liability, address strike, uint256 short) external virtual returns (bool);
    function exercise(uint256 qUnderlying, uint256 qStrike, address aStrike) external payable virtual returns (bool);
    function mintPrimeFromPool(
        uint256 qUnderlying,
        uint256 qStrike,
        address aStrike,
        uint256 tExpiry,
        address primeReceiver
    ) external payable virtual returns (bool);
    function getAvailableAssets() public virtual returns (uint256);
}

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
    function isTokenExpired(uint256 tokenId) public view virtual returns(bool);
}

contract Exchange is ERC721Holder, ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;

    address private _primeAddress;
    address public _poolAddress;
    IPool public _pool;
    IPrime public _prime;

    uint256 public _feePool;
    uint256 constant _feeDenomination = 333; /* 0.30% = 0.003 = 1 / 333 */
    uint256 constant _poolPremiumDenomination = 5; /* 20% = 0.2 = 1 / 5 - FIX */
    
    event SellOrder(address indexed seller, uint256 askPrice, uint256 indexed tokenId, bool filled);
    event BuyOrder(address indexed buyer, uint256 bidPrice, uint256 indexed tokenId, bool filled);
    event BuyOrderUnfilled(address indexed buyer, uint256 bidPrice, uint256 nonce);

    event FillUnfilledBuyOrder(address indexed seller, uint256 indexed tokenId);
    event FillOrder(address indexed seller, address indexed buyer, uint256 filledPrice, uint256 indexed tokenId);
    event FillOrderFromPool(address indexed buyer, uint256 bidPrice, uint256 amount);

    event CloseOrder(address indexed user, uint256 indexed tokenId, bool buyOrder);
    event CloseUnfilledBuyOrder(address indexed user, bytes4 indexed series, uint256 buyOrderNonce);

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

    struct BuyOrdersUnfilled {
        address payable buyer;
        uint256 bidPrice;
        bytes4 series;
        uint256 qUnderlying;
        address aUnderlying;
        uint256 qStrike;
        address aStrike;
        uint256 tExpiry;
    }

    /* MAPS TOKENIDS WITH SELL ORDER DETAILS */
    mapping(uint256 => SellOrders) public _sellOrders;

    /* MAPS TOKENIDS WITH BUY ORDER DETAILS */
    mapping(uint256 => BuyOrders) public _buyOrders;

     /* MAPS HASH OF PROPERTIES TO AN ORDER NONCE THAT RETURNS THE UNFILLED ORDER DETAILS */
    mapping(bytes4 => mapping(uint256 => BuyOrdersUnfilled)) public _buyOrdersUnfilled;

    /* MAX HEIGHT OF UNFILLED ORDERS */
    mapping(bytes4 => uint256) public _unfilledNonce;

    /* MAPS USERS TO ETHER BALANCES IN EXCHANGE */
    mapping(address => uint256) public _etherBalance;

    /* Maps a user to added pool funds */
    mapping(address => uint256) private _feePoolContribution;

    /* INTIALIZES TOKEN 0 -> ALL ORDERS ARE RESET TO THIS DEFAULT VALUE WHEN FILLED/CLOSED */
    constructor(address primeAddress) public {
        _primeAddress = primeAddress;
        _prime = IPrime(primeAddress);
        _feePool = 0;

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

        _buyOrdersUnfilled[0][0] = BuyOrdersUnfilled(
            address(0),
            0,
            0,
            0,
            address(0),
            0,
            address(0),
            0
        );
    }

    receive() external payable {}

    /* SET POOL ADDRESS */
    function setPoolAddress(address poolAddress) external onlyOwner {
        _poolAddress = poolAddress;
        _pool = IPool(poolAddress);
    }

    /* KILL SWITCH */
    function killSwitch() external onlyOwner {
        _pause();
    }

    /* REVIVE */
    function unpause() external onlyOwner {
        _unpause();
    }

    /* Prime Address */
    function getPrimeAddress() public view returns (address) {
        return _primeAddress;
    }

    /**
     * @dev users withdraw ether rather than have it directly sent to them
     * @param amount value of ether to withdraw
     */
    function withdrawEther(uint256 amount) external nonReentrant {
        require(_etherBalance[msg.sender] >= amount, 'Bal < amount');
        (bool success, ) = msg.sender.call.value(amount)("");
        require(success, "Transfer failed.");
    }


    /* CORE MUTATIVE FUNCTIONS */


    /** 
     * @dev List a valid Prime for sale
     * @param tokenId the Prime's nonce when minted
     * @param askPrice value in wei desired as payment
     * @return bool Whether or not the tx succeeded
     */
    function sellOrder(
        uint256 tokenId, 
        uint256 askPrice
    ) 
        external
        whenNotPaused
        returns (bool) 
    {

        /* CHECKS */
        require(tokenId > 0, 'Invalid Token');
        require(askPrice > 0, 'Ask < 0');
        _prime.isTokenExpired(tokenId);
        require(!isListed(tokenId), 'Token listed already');

        /* EFFECTS */

        /* Gets a buy order request ID if tokenId has matching properties and can fill order*/
        uint256 buyOrderNonce = checkUnfilledBuyOrders(tokenId, askPrice);

        /* INTERACTIONS */

        /* 
            If a buy order request matches a token's properties, and the bid price
            fulfills the order, fill it 
        */
        if(buyOrderNonce > 0) {
            /* Unique hash of the Prime's key properties: Asset addresses & expiration date */
            bytes4 series = _prime.getSeries(tokenId);
            /* Buy order request of hash 'series' at order request nonce */
            BuyOrdersUnfilled memory unfilledBuyOrder = _buyOrdersUnfilled[series][buyOrderNonce];
            return fillUnfilledBuyOrder(
                tokenId, 
                unfilledBuyOrder.bidPrice, 
                askPrice,
                unfilledBuyOrder.buyer,
                msg.sender, 
                buyOrderNonce,
                series
            );
        }
        
        /* 
         * If a buy order for the tokenId is available, fill it,
         * else, list it for sale and transfer it from user to the dex
        */
        if(buyOrderNonce == 0) {

            BuyOrders memory buyOrderObject = _buyOrders[tokenId];

            if(buyOrderObject.bidPrice >= askPrice) {
                return fillOrder(
                    false,
                    tokenId,
                    buyOrderObject.bidPrice,
                    askPrice,
                    buyOrderObject.buyer,
                    msg.sender
                );
            } else {
                /* Add sell order to state */
                _sellOrders[tokenId] = SellOrders(
                    msg.sender,
                    askPrice,
                    tokenId
                );

                _prime.safeTransferFrom(msg.sender, address(this), tokenId);
                emit SellOrder(msg.sender, askPrice, tokenId, false);
                return true;
            }
        }
    }

    /**
     * @dev offer a bid for a specific token
     * @param tokenId nonce of token when minted
     * @param bidPrice value offered to purchase Prime
     * @return bool whether the tx succeeds
     */
    function buyOrder(
        uint256 tokenId, 
        uint256 bidPrice
    ) 
        public 
        payable
        nonReentrant
        whenNotPaused
        returns (bool) 
    {
        /* CHECKS */
        require(tokenId > 0, 'Invalid Token');
        require(bidPrice > 0, 'Bid < 0');

        uint256 fee = bidPrice.div(_feeDenomination);
        uint256 totalCost = bidPrice.add(fee);
        require(msg.value >= totalCost, 'Val < cost');
        /* Transfer remaining bid to Buyer */
        if(msg.value > totalCost) {
            (bool success, ) = msg.sender.call.value(msg.value.sub(totalCost))("");
            require(success, 'Transfer fail.');
        }

        /* EFFECTS */

        SellOrders memory sellOrderObject = _sellOrders[tokenId];

        /* INTERACTIONS */

        /* 
         * If the token is listed for sale, fill it
         * Else, submit an offer to buy a specific token
        */
        if(isListed(tokenId) && bidPrice >= sellOrderObject.askPrice ) {
            return fillOrder(
                true,
                tokenId,
                bidPrice,
                sellOrderObject.askPrice,
                msg.sender,
                sellOrderObject.seller
            );
        } else {
            _buyOrders[tokenId] = BuyOrders(
                msg.sender,
                bidPrice,
                tokenId
            );
            emit BuyOrder(msg.sender, bidPrice, tokenId, false);
            return true;
        }
    }

    /**
     * @dev fill an order 
     * @param isBuyOrder whether this order is a buy order
     * @param tokenId nonce of Prime when minted
     * @param bidPrice value offered to buy Prime
     * @param askPrice value required to buy Prime
     * @param buyer address of buying party
     * @param seller address of selling party (can be DEX or user)
     * @return bool whether the tx succeeds
     */
    function fillOrder(
        bool isBuyOrder,
        uint256 tokenId, 
        uint256 bidPrice, 
        uint256 askPrice,
        address payable buyer, 
        address payable seller
    ) 
        private 
        returns (bool) 
    {
        
        /* CHECKS */

        /* EFFECTS */

        /* Clears order from state */
        if(isBuyOrder) {
            emit BuyOrder(buyer, bidPrice, tokenId, true);
            clearSellOrder(tokenId);
        } else {
            emit SellOrder(seller, askPrice, tokenId, true);
            clearBuyOrder(tokenId);
        }

        /* Update ether balance state of buyer, seller, and reward pool */
        _etherBalance[seller] = _etherBalance[seller].add(askPrice);
        uint256 fee = bidPrice.div(_feeDenomination);
        _feePoolContribution[seller] = _feePoolContribution[seller].add(fee);
        _feePool = _feePool.add(fee);

        /* INTERACTIONS */

        /* 
         * IF ITS BUY ORDER - PRIME IS OWNED BY EXCHANGE
         * IF ITS SELL ORDER - PRIME IS OWNED BY SELLER
         */
        if(isBuyOrder) {
            _prime.safeTransferFrom(address(this), buyer, tokenId);
        } else {
            _prime.safeTransferFrom(seller, buyer, tokenId);
        }

        emit FillOrder(seller, buyer, askPrice, tokenId);
        return true;
    }


    /**
     * @dev request to buy a Prime with params
     * @param bidPrice value offered to buy Prime
     * @param qUnderlying amount of collateral (underlying) asset
     * @param aUnderlying address of collateral ERC-20 token
     * @param qStrike amount of payment (strike) asset
     * @param aStrike address of strike ERC-20 token
     * @param tExpiry timestamp of expiration
     * @return bool whether the tx suceeds
     */
    function buyOrderUnfilled(
        uint256 bidPrice,
        uint256 qUnderlying,
        address aUnderlying,
        uint256 qStrike,
        address aStrike,
        uint256 tExpiry
    )
        external
        payable
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        /* CHECKS */
        require(bidPrice > 0, 'Bid < 0');

        /* EFFECTS */

        /* If the pool can fill the order, mint the Prime from pool */
        if(_pool.getAvailableAssets() >= qUnderlying) {
            /* FIX with variable premium from Pool - 20% of collateral */
            uint256 premiumToPay = qUnderlying.mul(20).div(10**2);
            require(bidPrice >= premiumToPay, 'Bid < premium');
            
            /* Calculate the payment */
            uint256 feeOnPayment = premiumToPay.mul(3).div(1000);
            uint256 amountNotReturned = premiumToPay.add(feeOnPayment);

            /* Update fee pool state */
            _feePoolContribution[msg.sender] = _feePoolContribution[msg.sender].add(feeOnPayment);

            /* Mint Prime */
            _pool.mintPrimeFromPool.value(premiumToPay)(
                qUnderlying,
                qStrike,
                aStrike,
                tExpiry,
                msg.sender
            );

            emit FillOrderFromPool(msg.sender, bidPrice, qUnderlying);

            /* Transfer remaining bid to Buyer */
            if(msg.value > amountNotReturned) {
                (bool success,) = msg.sender.call.value(msg.value.sub(amountNotReturned))("");
                require(success, 'Transfer fail.');
                return success;
            }
            return true;
        }

        /* Fee */
        uint256 fee = bidPrice.div(_feeDenomination);
        uint256 totalCost = bidPrice.add(fee);
        require(msg.value >= totalCost, 'Val < cost');
        
        /* Get chain data and log the nonce of the order */
        bytes4 series = bytes4(
            keccak256(abi.encodePacked(aUnderlying))) 
            ^ bytes4(keccak256(abi.encodePacked(aStrike))) 
            ^ bytes4(keccak256(abi.encodePacked(tExpiry))
        );
        uint256 nonce = (_unfilledNonce[series]).add(1);
        _unfilledNonce[series] = nonce;

        /* Update Buy Order State */
        _buyOrdersUnfilled[series][nonce] = BuyOrdersUnfilled(
            msg.sender,
            bidPrice,
            series,
            qUnderlying,
            aUnderlying,
            qStrike,
            aStrike,
            tExpiry
        );

        emit BuyOrderUnfilled(msg.sender, bidPrice, _unfilledNonce[series]);

        /* Return any remaining bid to Buyer */
        if(msg.value > totalCost) {
            (bool success, ) = msg.sender.call.value(msg.value.sub(totalCost))("");
            require(success, 'Transfer fail.');
            return success;
        }
        return true;
    }

    /**
     * @dev compares tokenID properties with requested buy order
     * @param tokenId nonce of Prime when minted
     * @return uint256 unfilled buy order nonce, returns 0 if none found
     */
    function checkUnfilledBuyOrders(
        uint256 tokenId,
        uint256 askPrice
    ) 
        public 
        view 
        returns (uint256) 
    {
        address writer;
        uint256 qUnderlying;
        address aUnderlying;
        uint256 qStrike;
        address aStrike;
        uint256 tExpiry;
        address receiver;
        bytes4 series;
        (writer, qUnderlying, aUnderlying, qStrike, aStrike, tExpiry, receiver, series, ) = _prime.getPrime(tokenId);
        
        bytes32 primeHash = keccak256(
            abi.encodePacked(
                    qUnderlying,
                    aUnderlying,
                    qStrike,
                    aStrike,
                    tExpiry
                )
            );
         
        for(uint i = 1; i <= _unfilledNonce[series]; i++) {
            BuyOrdersUnfilled memory unfilledBuyOrder = _buyOrdersUnfilled[series][i];
            bytes32 buyHash = keccak256(
                abi.encodePacked(
                    unfilledBuyOrder.qUnderlying,
                    unfilledBuyOrder.aUnderlying,
                    unfilledBuyOrder.qStrike,
                    unfilledBuyOrder.aStrike,
                    unfilledBuyOrder.tExpiry
                )
            );

            if(primeHash == buyHash && unfilledBuyOrder.bidPrice >= askPrice) {
                return i;
            }
        }

        return 0;
    }

    /**
     * @dev fills a sell order using an unfilled buy order
     * @param tokenId nonce of Prime when minted
     * @param bidPrice value of offer
     * @param askPrice value in wei that the seller requires
     * @param buyer address of buyer
     * @param seller address of seller
     * @param _buyOrderNonce nonce when buy order request was submitted
     * @param series hash of asset 1 address + asset 2 address + expiration
     * @return bool whether or not the tx succeeded
     */
    function fillUnfilledBuyOrder(
        uint256 tokenId,
        uint256 bidPrice,
        uint256 askPrice,
        address payable buyer,
        address payable seller,
        uint256 _buyOrderNonce,
        bytes4 series
    ) 
        private
        nonReentrant
        returns (bool) 
    {
        /* CHECKS */

        /* EFFECTS */

        /* Clears the buy order request from state */
        clearUnfilledBuyOrder(series, _buyOrderNonce);

        /* Updates state of the user's ether balance in the dex */
        _etherBalance[seller] = _etherBalance[seller].add(askPrice);
        uint256 fee = bidPrice.div(_feeDenomination);
        _feePoolContribution[seller] = _feePoolContribution[seller].add(fee);
        _feePool = _feePool.add(fee);

        /* INTERACTIONS */

        /* Transfers the Prime to the buyer */
        _prime.safeTransferFrom(seller, buyer, tokenId);
        emit SellOrder(seller, askPrice, tokenId, true);
        emit FillUnfilledBuyOrder(seller, tokenId);
        return true;
    }
   
    /**
     * @dev changes state of order to 0
     * @param tokenId nonce of Prime when minted
     */
    function clearSellOrder(uint256 tokenId) internal {
        _sellOrders[tokenId] = _sellOrders[0];
    }

    /**
     * @dev changes state of order to 0
     * @param tokenId nonce of Prime when minted
     */
    function clearBuyOrder(uint256 tokenId) internal {
        /* CLEARS BUY ORDER */
        _buyOrders[tokenId] = _buyOrders[0];
    }

    /**
     * @dev changes state of order to 0
     * @param series hash of asset 1 address + asset 2 address + expiration
     * @param _buyOrderNonce nonce of buy order request
     */
    function clearUnfilledBuyOrder(bytes4 series, uint256 _buyOrderNonce) internal {
        _buyOrdersUnfilled[series][_buyOrderNonce] = _buyOrdersUnfilled[0][0];
    }

    /**
     * @dev clears a sell order from state and returns funds/assets
     * @param tokenId nonce of Prime when minted
     * @return bool whether the tx succeeds
     */
    function closeSellOrder(uint256 tokenId) external nonReentrant returns (bool) {
        SellOrders memory sellOrderObject = _sellOrders[tokenId];

        /* CHECKS */
        require(tokenId > 0, 'Invalid Token');
        require(msg.sender == sellOrderObject.seller, 'Msg.sender != seller');

        /* EFFECTS */
        clearSellOrder(tokenId);

        /* INTERACTIONS */
        _prime.safeTransferFrom(address(this), sellOrderObject.seller, tokenId);
        emit CloseOrder(msg.sender, tokenId, false);
        return true;
    }

    /**
     * @dev clears a buy order from state and returns funds/assets
     * @param tokenId nonce of Prime when minted
     * @return bool whether the tx succeeds
     */
    function closeBuyOrder(uint256 tokenId) external nonReentrant returns (bool) {
        BuyOrders memory buyOrderObject = _buyOrders[tokenId];

        /* CHECKS */
        require(tokenId > 0, 'Invalid Token');
        require(msg.sender == buyOrderObject.buyer, 'Msg.sender != buyer');
        
        /* EFFECTS */
        
        /* Clear buy order state */
        clearBuyOrder(tokenId);

        /* Update user's withdrawable ether balance */
        _etherBalance[buyOrderObject.buyer].add(buyOrderObject.bidPrice);

        /* INTERACTIONS */

        emit CloseOrder(msg.sender, tokenId, true);
        return true;
    }

    /**
     * @dev clears an unfilled buy order from state and returns funds/assets
     * @param series keccak256 hash of asset 1 address ^ asset 2 Address ^ expiration
     * @param _buyOrderNonce nonce of when buy order was submitted
     * @return bool whether the tx succeeds
     */
    function closeUnfilledBuyOrder(
        bytes4 series,
        uint256 _buyOrderNonce
    ) 
        external 
        nonReentrant 
        returns (bool) 
    {
        /* Buy order request of hash 'chain' at order request nonce */
        BuyOrdersUnfilled memory unfilledBuyOrder = _buyOrdersUnfilled[series][_buyOrderNonce];

        /* CHECKS */
        require(msg.sender == unfilledBuyOrder.buyer, 'Msg.sender != buyer');

        /* EFFECTS */
        
        /* Clears the buy order request from state */
        clearUnfilledBuyOrder(series, _buyOrderNonce);

        /* Update user's withdrawable ether balance */
        _etherBalance[unfilledBuyOrder.buyer].add(unfilledBuyOrder.bidPrice);

        /* INTERACTIONS */

        emit CloseUnfilledBuyOrder(msg.sender, series, _buyOrderNonce);
        return true;
    }


    /* VIEW FUNCTIONS */


    function getFeesGenerated(address payable user) public view returns(uint256) {
        return _etherBalance[user];
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
        BuyOrders memory buyOrderObject = _buyOrders[_tokenId];
        return (
            buyOrderObject.buyer,
            buyOrderObject.bidPrice,
            buyOrderObject.tokenId
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
        SellOrders memory sellOrderObject = _sellOrders[_tokenId];
        return (
            sellOrderObject.seller,
            sellOrderObject.askPrice,
            sellOrderObject.tokenId
        );
    }

    function isListed(uint256 tokenId) public view returns(bool) {
        SellOrders memory sellOrderObject = _sellOrders[tokenId];
        return sellOrderObject.seller != address(0);
    }

}