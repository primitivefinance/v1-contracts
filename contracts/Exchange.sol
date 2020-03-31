pragma solidity ^0.6.0;

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
 *  @title Primitive's Instruments
 * @author Primitive Finance
*/
library Instruments {
     struct Actors {
        uint[] mintedTokens;
        uint[] deactivatedTokens;
    }

     /** 
     * @dev A Prime has these properties.
     * @param ace `msg.sender` of the createPrime function.
     * @param xis Quantity of collateral asset token.
     * @param yak Address of collateral asset token.
     * @param zed Purchase price of collateral, denominated in quantity of token z.
     * @param wax Address of purchase price asset token.
     * @param pow UNIX timestamp of valid time period.
     * @param gem Address of payment receiver of token z.
     */
    struct Primes {
        address ace;
        uint256 xis;
        address yak;
        uint256 zed;
        address wax;
        uint256 pow;
        address gem;
    }

     /** 
     * @dev A Prime has these properties.
     * @param chain Keccak256 hash of collateral
     *  asset address, strike asset address, and  expiration date.
     */
    struct Chain {
        bytes4 chain;
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

abstract contract IPool {
    function withdrawExercisedEth(address payable _receiver, uint256 _amount) external virtual returns (bool);
    function clearLiability(uint256 liability, address strike, uint256 short) external virtual returns (bool);
    function exercise(uint256 _long, uint256 _short, address _strike) external payable virtual returns (bool);
    function mintPrimeFromPool(
        uint256 _long,
        uint256 _short,
        address _strike,
        uint256 _expiration,
        address _primeReceiver
    ) external payable virtual returns (bool);
    function getAvailableAssets() public virtual returns (uint256);
}

abstract contract IPrime {
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual;
    function createPrime(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) external virtual returns (bool);
    function exercise(uint256 _tokenId) external virtual returns (bool);
    function close(uint256 _collateralId, uint256 _burnId) external virtual returns (bool);
    function withdraw(uint256 _amount, address _asset) public virtual returns (bool);
    function getPrime(uint256 _tokenId) external view virtual returns(
            address ace,
            uint256 xis,
            address yak,
            uint256 zed,
            address wax,
            uint256 pow,
            address gem,
            bytes4 chain
        );
    function _primeCompare(uint256 _collateralId, uint256 _burnId) public view virtual returns (bool burn);
    function getChain(uint256 _tokenId) external view virtual returns (bytes4 chain);
    function isTokenExpired(uint256 _tokenId) public view virtual returns(bool);
}

contract Exchange is ERC721Holder, ReentrancyGuard, Ownable, Pausable {
    using SafeMath for uint256;

    address public _owner;
    address private _primeAddress;
    address public _poolAddress;
    IPool public _poolInterface;

    uint256 public _feePool;
    uint256 constant _feeDenomination = 333; /* 0.30% = 0.003 = 1 / 333 */
    uint256 constant _poolPremiumDenomination = 5; /* 20% = 0.2 = 1 / 5 - FIX */
    
    event SellOrder(address _seller, uint256 _askPrice, uint256 _tokenId, bool _filled);
    event BuyOrder(address _buyer, uint256 _bidPrice, uint256 _tokenId, bool _filled);
    event BuyOrderUnfilled(address _buyer, uint256 _bidPrice, uint256 _nonce);

    event FillUnfilledBuyOrder(address _seller, uint256 _tokenId);
    event FillOrder(address _seller, address _buyer, uint256 _filledPrice, uint256 _tokenId);
    event FillOrderFromPool(address _buyer, uint256 _bidPrice, uint256 _amount);

    event CloseOrder(address _user, uint256 _tokenId, bool _buyOrder);
    event CloseUnfilledBuyOrder(address _user, bytes4 _chain, uint256 _buyOrderNonce);

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
        bytes4 chain;
        uint256 xis;
        address yak;
        uint256 zed;
        address wax;
        uint256 pow;
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
        _owner = msg.sender;
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
        _poolInterface = IPool(poolAddress);
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
     * @param _amount value of ether to withdraw
     */
    function withdrawEther(uint256 _amount) external nonReentrant {
        require(_etherBalance[msg.sender] >= _amount, 'Bal < amount');
        (bool success, ) = msg.sender.call.value(_amount)("");
        require(success, "Transfer failed.");
    }


    /* CORE MUTATIVE FUNCTIONS */


    /** 
     * @dev List a valid Prime for sale
     * @param _tokenId the Prime's nonce when minted
     * @param _askPrice value in wei desired as payment
     * @return bool Whether or not the tx succeeded
     */
    function sellOrder(
        uint256 _tokenId, 
        uint256 _askPrice
    ) 
        external
        whenNotPaused
        returns (bool) 
    {
        IPrime _prime = IPrime(_primeAddress);

        /* CHECKS */
        require(_tokenId > 0, 'Invalid Token');
        require(_askPrice > 0, 'Ask < 0');
        _prime.isTokenExpired(_tokenId);
        require(!isListed(_tokenId), 'Token listed already');

        /* EFFECTS */

        /* Gets a buy order request ID if _tokenId has matching properties and can fill order*/
        uint256 fillable = checkUnfilledBuyOrders(_tokenId, _askPrice);

        /* INTERACTIONS */

        /* 
            If a buy order request matches a token's properties, and the bid price
            fulfills the order, fill it 
        */
        if(fillable > 0) {
            /* Unique hash of the Prime's key properties: Asset addresses & expiration date */
            bytes4 chain = _prime.getChain(_tokenId);
            /* Buy order request of hash 'chain' at order request nonce */
            BuyOrdersUnfilled memory _buyUnfilled = _buyOrdersUnfilled[chain][fillable];
            return fillUnfilledBuyOrder(
                _tokenId, 
                _buyUnfilled.bidPrice, 
                _askPrice,
                _buyUnfilled.buyer,
                msg.sender, 
                fillable,
                chain
            );
        }
        
        /* 
         * If a buy order for the _tokenId is available, fill it,
         * else, list it for sale and transfer it from user to the dex
        */
        if(fillable == 0) {

            BuyOrders memory _buy = _buyOrders[_tokenId];

            if(_buy.bidPrice >= _askPrice) {
                return fillOrder(
                    false,
                    _tokenId,
                    _buy.bidPrice,
                    _askPrice,
                    _buy.buyer,
                    msg.sender
                );
            } else {
                /* Add sell order to state */
                _sellOrders[_tokenId] = SellOrders(
                    msg.sender,
                    _askPrice,
                    _tokenId
                );

                /* Take prime from sender */
                _prime.safeTransferFrom(msg.sender, address(this), _tokenId);
        
                emit SellOrder(msg.sender, _askPrice, _tokenId, false);
                return true;
            }
        }
    }

    /**
     * @dev offer a bid for a specific token
     * @param _tokenId nonce of token when minted
     * @param _bidPrice value offered to purchase Prime
     * @return bool whether the tx succeeds
     */
    function buyOrder(
        uint256 _tokenId, 
        uint256 _bidPrice
    ) 
        public 
        payable
        nonReentrant
        whenNotPaused
        returns (bool) 
    {
        /* CHECKS */
        require(_tokenId > 0, 'Invalid Token');
        require(_bidPrice > 0, 'Bid < 0');
        uint256 _fee = _bidPrice.div(_feeDenomination);
        uint256 _totalCost = _bidPrice.add(_fee);
        require(msg.value >= _totalCost, 'Val < cost');
        /* Transfer remaining bid to Buyer */
        if(msg.value > _totalCost) {
            (bool success, ) = msg.sender.call.value(msg.value.sub(_totalCost))("");
            require(success, 'Transfer fail.');
        }

        /* EFFECTS */

        SellOrders memory _sell = _sellOrders[_tokenId];

        /* INTERACTIONS */

        /* 
         * If the token is listed for sale, fill it
         * Else, submit an offer to buy a specific token
        */
        if(isListed(_tokenId) && _bidPrice >= _sell.askPrice ) {
            return fillOrder(
                true,
                _tokenId,
                _bidPrice,
                _sell.askPrice,
                msg.sender,
                _sell.seller
            );
        } else {
            _buyOrders[_tokenId] = BuyOrders(
                msg.sender,
                _bidPrice,
                _tokenId
            );
            emit BuyOrder(msg.sender, _bidPrice, _tokenId, false);
            return true;
        }
    }

    /**
     * @dev fill an order 
     * @param _buyOrder whether this order is a buy order
     * @param _tokenId nonce of Prime when minted
     * @param _bidPrice value offered to buy Prime
     * @param _askPrice value required to buy Prime
     * @param _buyer address of buying party
     * @param _seller address of selling party (can be DEX or user)
     * @return bool whether the tx succeeds
     */
    function fillOrder(
        bool _buyOrder,
        uint256 _tokenId, 
        uint256 _bidPrice, 
        uint256 _askPrice,
        address payable _buyer, 
        address payable _seller
    ) 
        private 
        returns (bool) 
    {
        
        /* CHECKS */

        /* EFFECTS */

        /* Clears order from state */
        if(_buyOrder) {
            emit BuyOrder(_buyer, _bidPrice, _tokenId, true);
            clearSellOrder(_tokenId);
        } else {
            emit SellOrder(_seller, _askPrice, _tokenId, true);
            clearBuyOrder(_tokenId);
        }

        /* Update ether balance state of buyer, seller, and reward pool */
        _etherBalance[_seller] = _etherBalance[_seller].add(_askPrice);
        uint256 _fee = _bidPrice.div(_feeDenomination);
        _feePoolContribution[_seller] = _feePoolContribution[_seller].add(_fee);
        _feePool = _feePool.add(_fee);

        /* INTERACTIONS */

        /* 
         * IF ITS BUY ORDER - PRIME IS OWNED BY EXCHANGE
         * IF ITS SELL ORDER - PRIME IS OWNED BY SELLER
         */
        IPrime _prime = IPrime(_primeAddress);
        if(_buyOrder) {
            _prime.safeTransferFrom(address(this), _buyer, _tokenId);
        } else {
            _prime.safeTransferFrom(_seller, _buyer, _tokenId);
        }

        emit FillOrder(_seller, _buyer, _askPrice, _tokenId);
        return true;
    }


    /**
     * @dev request to buy a Prime with params
     * @param _bidPrice value offered to buy Prime
     * @param _xis amount of collateral (underlying) asset
     * @param _yak address of collateral ERC-20 token
     * @param _zed amount of payment (strike) asset
     * @param _wax address of strike ERC-20 token
     * @param _pow timestamp of expiration
     * @return bool whether the tx suceeds
     */
    function buyOrderUnfilled(
        uint256 _bidPrice,
        /* bytes4 _chain, */
        uint256 _xis,
        address _yak,
        uint256 _zed,
        address _wax,
        uint256 _pow
    )
        external
        payable
        nonReentrant
        whenNotPaused
        returns (bool)
    {
        /* CHECKS */
        require(_bidPrice > 0, 'Bid < 0');

        /* EFFECTS */

        /* If the pool can fill the order, mint the Prime from pool */
        if(_poolInterface.getAvailableAssets() >= _xis) {
            /* FIX with variable premium from Pool - 20% of collateral */
            uint256 premiumToPay = _xis.mul(20).div(10**2);
            require(_bidPrice >= premiumToPay, 'Bid < premium');
            
            /* Calculate the payment */
            uint256 feeOnPayment = premiumToPay.mul(3).div(1000);
            uint256 amountNotReturned = premiumToPay.add(feeOnPayment);

            /* Update fee pool state */
            _feePoolContribution[msg.sender] = _feePoolContribution[msg.sender].add(feeOnPayment);

            /* Mint Prime */
            _poolInterface.mintPrimeFromPool.value(premiumToPay)(
                _xis,
                _zed,
                _wax,
                _pow,
                msg.sender
            );

            emit FillOrderFromPool(msg.sender, _bidPrice, _xis);

            /* Transfer remaining bid to Buyer */
            if(msg.value > amountNotReturned) {
                (bool success,) = msg.sender.call.value(msg.value.sub(amountNotReturned))("");
                require(success, 'Transfer fail.');
                return success;
            }
            return true;
        }

        /* Fee */
        uint256 fee = _bidPrice.div(_feeDenomination);
        uint256 totalCost = _bidPrice.add(fee);
        require(msg.value >= totalCost, 'Val < cost');
        
        /* Get chain data and log the nonce of the order */
        bytes4 _chain = bytes4(
            keccak256(abi.encodePacked(_yak))) 
            ^ bytes4(keccak256(abi.encodePacked(_wax))) 
            ^ bytes4(keccak256(abi.encodePacked(_pow))
        );
        uint256 nonce = (_unfilledNonce[_chain]).add(1);
        _unfilledNonce[_chain] = nonce;

        /* Update Buy Order State */
        _buyOrdersUnfilled[_chain][nonce] = BuyOrdersUnfilled(
            msg.sender,
            _bidPrice,
            _chain,
            _xis,
            _yak,
            _zed,
            _wax,
            _pow
        );

        emit BuyOrderUnfilled(msg.sender, _bidPrice, _unfilledNonce[_chain]);

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
     * @param _tokenId nonce of Prime when minted
     * @return uint256 unfilled buy order nonce, returns 0 if none found
     */
    function checkUnfilledBuyOrders(
        uint256 _tokenId,
        uint256 _askPrice
    ) 
        public 
        view 
        returns (uint256) 
    {
        IPrime _prime = IPrime(_primeAddress);
        address ace;
        uint256 xis;
        address yak;
        uint256 zed;
        address wax;
        uint256 pow;
        address gem;
        bytes4 chain;
        chain = _prime.getChain(_tokenId);
        (ace, xis, yak, zed, wax, pow, gem, ) = _prime.getPrime(_tokenId);
        
        bytes32 primeHash = keccak256(
            abi.encodePacked(
                    xis,
                    yak,
                    zed,
                    wax,
                    pow
                )
            );
         
        for(uint i = 1; i <= _unfilledNonce[chain]; i++) {
            BuyOrdersUnfilled memory _buyObj = _buyOrdersUnfilled[chain][i];
            bytes32 buyHash = keccak256(
                abi.encodePacked(
                    _buyObj.xis,
                    _buyObj.yak,
                    _buyObj.zed,
                    _buyObj.wax,
                    _buyObj.pow
                )
            );

            if(primeHash == buyHash && _buyObj.bidPrice >= _askPrice) {
                return i;
            }
        }

        return 0;
    }

    /**
     * @dev fills a sell order using an unfilled buy order
     * @param _tokenId nonce of Prime when minted
     * @param _bidPrice value of offer
     * @param _askPrice value in wei that the seller requires
     * @param _buyer address of buyer
     * @param _seller address of seller
     * @param _buyOrderNonce nonce when buy order request was submitted
     * @param _chain hash of asset 1 address + asset 2 address + expiration
     * @return bool whether or not the tx succeeded
     */
    function fillUnfilledBuyOrder(
        uint256 _tokenId,
        uint256 _bidPrice,
        uint256 _askPrice,
        address payable _buyer,
        address payable _seller,
        uint256 _buyOrderNonce,
        bytes4 _chain
    ) 
        private
        nonReentrant
        returns (bool) 
    {
        /* CHECKS */

        /* EFFECTS */

        /* Clears the buy order request from state */
        clearUnfilledBuyOrder(_chain, _buyOrderNonce);

        /* Updates state of the user's ether balance in the dex */
        _etherBalance[_seller] = _etherBalance[_seller].add(_askPrice);
        uint256 _fee = _bidPrice.div(_feeDenomination);
        _feePoolContribution[_seller] = _feePoolContribution[_seller].add(_fee);
        _feePool = _feePool.add(_fee);

        /* INTERACTIONS */

        /* Transfers the Prime to the buyer */
        IPrime _prime = IPrime(_primeAddress);
        _prime.safeTransferFrom(_seller, _buyer, _tokenId);
        emit SellOrder(_seller, _askPrice, _tokenId, true);
        emit FillUnfilledBuyOrder(_seller, _tokenId);
        return true;
    }
   
    /**
     * @dev changes state of order to 0
     * @param _tokenId nonce of Prime when minted
     */
    function clearSellOrder(uint256 _tokenId) internal {
        _sellOrders[_tokenId] = _sellOrders[0];
    }

    /**
     * @dev changes state of order to 0
     * @param _tokenId nonce of Prime when minted
     */
    function clearBuyOrder(uint256 _tokenId) internal {
        /* CLEARS BUY ORDER */
        _buyOrders[_tokenId] = _buyOrders[0];
    }

    /**
     * @dev changes state of order to 0
     * @param _chain hash of asset 1 address + asset 2 address + expiration
     * @param _buyOrderNonce nonce of buy order request
     */
    function clearUnfilledBuyOrder(bytes4 _chain, uint256 _buyOrderNonce) internal {
        _buyOrdersUnfilled[_chain][_buyOrderNonce] = _buyOrdersUnfilled[0][0];
    }

    /**
     * @dev clears a sell order from state and returns funds/assets
     * @param _tokenId nonce of Prime when minted
     * @return bool whether the tx succeeds
     */
    function closeSellOrder(uint256 _tokenId) external nonReentrant returns (bool) {
        SellOrders memory _sells = _sellOrders[_tokenId];

        /* CHECKS */
        require(_tokenId > 0, 'Invalid Token');
        require(msg.sender == _sells.seller, 'Msg.sender != seller');

        /* EFFECTS */
        clearSellOrder(_tokenId);

        /* INTERACTIONS */
        IPrime _prime = IPrime(_primeAddress);
        _prime.safeTransferFrom(address(this), _sells.seller, _tokenId);
        emit CloseOrder(msg.sender, _tokenId, false);
        return true;
    }

    /**
     * @dev clears a buy order from state and returns funds/assets
     * @param _tokenId nonce of Prime when minted
     * @return bool whether the tx succeeds
     */
    function closeBuyOrder(uint256 _tokenId) external nonReentrant returns (bool) {
        BuyOrders memory _buys = _buyOrders[_tokenId];

        /* CHECKS */
        require(_tokenId > 0, 'Invalid Token');
        require(msg.sender == _buys.buyer, 'Msg.sender != buyer');
        
        /* EFFECTS */
        
        /* Clear buy order state */
        clearBuyOrder(_tokenId);

        /* Update user's withdrawable ether balance */
        _etherBalance[_buys.buyer].add(_buys.bidPrice);

        /* INTERACTIONS */

        emit CloseOrder(msg.sender, _tokenId, true);
        return true;
    }

    /**
     * @dev clears an unfilled buy order from state and returns funds/assets
     * @param _chain keccak256 hash of asset 1 address ^ asset 2 Address ^ expiration
     * @param _buyOrderNonce nonce of when buy order was submitted
     * @return bool whether the tx succeeds
     */
    function closeUnfilledBuyOrder(
        bytes4 _chain,
        uint256 _buyOrderNonce
    ) 
        external 
        nonReentrant 
        returns (bool) 
    {
        /* Buy order request of hash 'chain' at order request nonce */
        BuyOrdersUnfilled memory _buyUnfilled = _buyOrdersUnfilled[_chain][_buyOrderNonce];

        /* CHECKS */
        require(msg.sender == _buyUnfilled.buyer, 'Msg.sender != buyer');

        /* EFFECTS */
        
        /* Clears the buy order request from state */
        clearUnfilledBuyOrder(_chain, _buyOrderNonce);

        /* Update user's withdrawable ether balance */
        _etherBalance[_buyUnfilled.buyer].add(_buyUnfilled.bidPrice);

        /* INTERACTIONS */

        emit CloseUnfilledBuyOrder(msg.sender, _chain, _buyOrderNonce);
        return true;
    }


    /* VIEW FUNCTIONS */


    function getFeesGenerated(address payable _user) public view returns(uint256) {
        return _etherBalance[_user];
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

    function isListed(uint256 _tokenId) public view returns(bool) {
        SellOrders memory _sells = _sellOrders[_tokenId];
        return _sells.seller != address(0);
    }

}