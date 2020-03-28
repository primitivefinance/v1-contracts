pragma solidity ^0.6.0;

/**
 * @title   Primitive's Pool Contract
 * @notice  The pool contract.
 * @author  Primitive
 */


/** 
 *  @title Primitive's Instruments
 * @author Primitive Finance
 */
library Instruments {
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
 * @dev Collection of functions related to the address type
 */
library Address {
    /**
     * @dev Returns true if `account` is a contract.
     *
     * [IMPORTANT]
     * ====
     * It is unsafe to assume that an address for which this function returns
     * false is an externally-owned account (EOA) and not a contract.
     *
     * Among others, `isContract` will return false for the following
     * types of addresses:
     *
     *  - an externally-owned account
     *  - a contract in construction
     *  - an address where a contract will be created
     *  - an address where a contract lived, but was destroyed
     * ====
     */
    function isContract(address account) internal view returns (bool) {
        // According to EIP-1052, 0x0 is the value returned for not-yet created accounts
        // and 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470 is returned
        // for accounts without code, i.e. `keccak256('')`
        bytes32 codehash;
        bytes32 accountHash = 0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470;
        // solhint-disable-next-line no-inline-assembly
        assembly { codehash := extcodehash(account) }
        return (codehash != accountHash && codehash != 0x0);
    }

    /**
     * @dev Replacement for Solidity's `transfer`: sends `amount` wei to
     * `recipient`, forwarding all available gas and reverting on errors.
     *
     * https://eips.ethereum.org/EIPS/eip-1884[EIP1884] increases the gas cost
     * of certain opcodes, possibly making contracts go over the 2300 gas limit
     * imposed by `transfer`, making them unable to receive funds via
     * `transfer`. {sendValue} removes this limitation.
     *
     * https://diligence.consensys.net/posts/2019/09/stop-using-soliditys-transfer-now/[Learn more].
     *
     * IMPORTANT: because control is transferred to `recipient`, care must be
     * taken to not create reentrancy vulnerabilities. Consider using
     * {ReentrancyGuard} or the
     * https://solidity.readthedocs.io/en/v0.5.11/security-considerations.html#use-the-checks-effects-interactions-pattern[checks-effects-interactions pattern].
     */
    function sendValue(address payable recipient, uint256 amount) internal {
        require(address(this).balance >= amount, "Address: insufficient balance");

        // solhint-disable-next-line avoid-low-level-calls, avoid-call-value
        (bool success, ) = recipient.call.value(amount)("");
        require(success, "Address: unable to send value, recipient may have reverted");
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

/**
 * @dev Interface of the ERC165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[EIP].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts may inherit from this and call {_registerInterface} to declare
 * their support of an interface.
 */
contract ERC165 is IERC165 {
    /*
     * bytes4(keccak256('supportsInterface(bytes4)')) == 0x01ffc9a7
     */
    bytes4 private constant _INTERFACE_ID_ERC165 = 0x01ffc9a7;

    /**
     * @dev Mapping of interface ids to whether or not it's supported.
     */
    mapping(bytes4 => bool) private _supportedInterfaces;

    constructor () internal {
        // Derived contracts need only register support for their own interfaces,
        // we register support for ERC165 itself here
        _registerInterface(_INTERFACE_ID_ERC165);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     *
     * Time complexity O(1), guaranteed to always use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view override returns (bool) {
        return _supportedInterfaces[interfaceId];
    }

    /**
     * @dev Registers the contract as an implementer of the interface defined by
     * `interfaceId`. Support of the actual ERC165 interface is automatic and
     * registering its interface id is not required.
     *
     * See {IERC165-supportsInterface}.
     *
     * Requirements:
     *
     * - `interfaceId` cannot be the ERC165 invalid interface (`0xffffffff`).
     */
    function _registerInterface(bytes4 interfaceId) internal virtual {
        require(interfaceId != 0xffffffff, "ERC165: invalid interface id");
        _supportedInterfaces[interfaceId] = true;
    }
}

/**
 * @dev Required interface of an ERC721 compliant contract.
 */
interface IERC721 is IERC165 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    /**
     * @dev Returns the number of NFTs in `owner`'s account.
     */
    function balanceOf(address owner) external view returns (uint256 balance);

    /**
     * @dev Returns the owner of the NFT specified by `tokenId`.
     */
    function ownerOf(uint256 tokenId) external view returns (address owner);

    /**
     * @dev Transfers a specific NFT (`tokenId`) from one account (`from`) to
     * another (`to`).
     *
     *
     *
     * Requirements:
     * - `from`, `to` cannot be zero.
     * - `tokenId` must be owned by `from`.
     * - If the caller is not `from`, it must be have been allowed to move this
     * NFT by either {approve} or {setApprovalForAll}.
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    /**
     * @dev Transfers a specific NFT (`tokenId`) from one account (`from`) to
     * another (`to`).
     *
     * Requirements:
     * - If the caller is not `from`, it must be approved to move this NFT by
     * either {approve} or {setApprovalForAll}.
     */
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(uint256 tokenId) external view returns (address operator);

    function setApprovalForAll(address operator, bool _approved) external;
    function isApprovedForAll(address owner, address operator) external view returns (bool);


    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
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

abstract contract ERC20 {
    function balanceOf(address _owner) virtual external returns(uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public virtual returns (bool);
    function transfer(address recipient, uint256 amount) public virtual returns (bool);
}

abstract contract IPrime {
    function createPrime(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) external virtual returns (uint256 _tokenId);
    function exercise(uint256 _tokenId) external virtual returns (bool);
    function close(uint256 _collateralId, uint256 _burnId) external virtual returns (bool);
    function withdraw(uint256 _amount, address _asset) public virtual returns (bool);
    function safeTransferFrom(address from, address to, uint256 tokenId) external virtual;
    function isGreaterThanOrEqual(uint256 _a, uint256 _b) public pure virtual returns(bool);
}

abstract contract ICEther {
    function mint() external payable virtual;
    function redeem(uint redeemTokens) external virtual returns (uint);
    function transfer(address dst, uint amount) external virtual returns (bool);
    function transferFrom(address src, address dst, uint amount) external virtual returns (bool);
    function approve(address spender, uint amount) external virtual returns (bool);
    function allowance(address owner, address spender) external virtual view returns (uint);
    function balanceOf(address owner) external virtual view returns (uint);
    function balanceOfUnderlying(address owner) external virtual returns (uint);
    function getAccountSnapshot(address account) external virtual view returns (uint, uint, uint, uint);
    function borrowRatePerBlock() external virtual view returns (uint);
    function supplyRatePerBlock() external virtual view returns (uint);
    function totalBorrowsCurrent() external virtual returns (uint);
    function borrowBalanceCurrent(address account) external virtual returns (uint);
    function borrowBalanceStored(address account) public virtual view returns (uint);
    function exchangeRateCurrent() public virtual returns (uint);
    function exchangeRateStored() public virtual view returns (uint);
    function getCash() external virtual view returns (uint);
    function accrueInterest() public virtual returns (uint);
    function seize(address liquidator, address borrower, uint seizeTokens) external virtual returns (uint);
}

contract Pool is Ownable, Pausable, ReentrancyGuard, ERC721Holder {
    using SafeMath for uint256;

    /* Address of Prime ERC-721 */
    address public _primeAddress;
    address public _compoundEthAddress;
    address public _exchangeAddress;
    uint256 public _startTime;

    ICEther public _cEther;
    IPrime public _prime;

    /* Total accumulated ether in pool */
    uint256 public _totalDeposit;

    /* Ether balance in pool */
    uint256 public _pool;

    /* Ether liability */
    uint256 public _liability;

    /* Ether Revenue */
    uint256 public _revenue;

    /* Ether balance of user */
    mapping(address => uint256) public _collateral;

    /* Time balance of user */
    mapping(address => uint256) public _time;

    /* Array of token Ids owned by Pool */
    uint[] public _ownedTokens;

    /* Token ID of the largest collateral token */
    uint256 public _largestToken;

    /* For testing */
    uint256 public constant _premiumDenomination = 5; /* 20% = 0.2 = 1 / 5 */

    event Debug(string error, uint256 result, uint256 tokenBalance);

    constructor(address primeAddress, address compoundEthAddress, address exchangeAddress) public {
        _primeAddress = primeAddress;
        _exchangeAddress = exchangeAddress;
        _prime = IPrime(primeAddress);
        _cEther = ICEther(compoundEthAddress);
        _compoundEthAddress = compoundEthAddress;
        _startTime = block.timestamp;
    }

    /* SET*/
    function setExchangeAddress(address exchangeAddress) external onlyOwner {
        _exchangeAddress = exchangeAddress;
    }

    receive() external payable {}

    /**
     * @dev deposits funds to the liquidity pool
     */
    function deposit(
        uint256 _value
    )
        external
        payable
        whenNotPaused
        returns (bool)
    {
        /* CHECKS */
        require(msg.value == _value, 'Value < deposit');

        /* EFFECTS */

        /* Track user's liquidity contribution */
        _collateral[msg.sender] = _collateral[msg.sender].add(msg.value);

        /* Track the funds start time in Pool */
        _time[msg.sender] = block.timestamp;

        /* Add the deposit to total deposits to measure user's share */
        _totalDeposit = _totalDeposit.add(msg.value);

        /* Add deposit to available assets that can be used by Pool */
        _pool = _pool.add(msg.value);

        /* INTERACTIONS */

        /* Swap ether to interest bearing cEther */
        return swapEtherToCompoundEther(msg.value);
    }

    /**
     * @dev user mints a Prime option from the pool
     * @param _long amount of ether (in wei)
     * @param _short amount of strike asset
     * @param _strike address of strike
     * @param _expiration timestamp of series expiration
     * @return bool whether or not the Prime is minted
     */
    function mintPrimeFromPool(
        uint256 _long,
        uint256 _short,
        address _strike,
        uint256 _expiration,
        address payable _primeReceiver
    )
        external
        payable
        whenNotPaused
        returns (bool) 
    {
        /* CHECKS */

        /* Checks to see if the tx pays the premium - 20% constant right now */
        uint256 calculatedPremium = _long.div(_premiumDenomination);
        require(msg.value >= calculatedPremium, 'Value < premium');

        /* Cannot be already expired */
        require(_expiration > block.timestamp, 'expired');

        /* EFFECTS */

        /* Get Available liquidity */
        uint256 _availableEth = _pool.sub(_liability);

        /* Add the ether liability to the Pool */
        _liability = _liability.add(_long);

        /* Check if there's enough capital to fill position */
        require(_availableEth >= _long, 'available < amount');

        /* Credit revenue the premium */
        _revenue = _revenue.add(calculatedPremium);

        /* INTERACTIONS */

        /* Trusted Contract */
        IPrime _prime = IPrime(_primeAddress);

        /* Mint a Prime */
        uint256 nonce = _prime.createPrime(
                _long,
                address(this),
                _short,
                _strike,
                _expiration,
                address(this)
            );

        /* Transfer Prime to User */
        _prime.safeTransferFrom(address(this), _primeReceiver, nonce);
        
        /* Swap Pool ether to interest Bearing cEther */
        return swapEtherToCompoundEther(msg.value);
    }

    /**
     * @dev Called ONLY from the Prime contract
     */
    function exercise(
        uint256 _long,
        uint256 _short,
        address _strike
    )
        external
        payable
        whenNotPaused
        returns (bool) 
    {
        /* CHECKS */

        /* This function should only be called by Prime */
        require(msg.sender == _primeAddress);

        /* EFFECTS */

        /* Reduce available assets in Pool for writing positions */
        _pool = _pool.sub(_long);

        /* INTERACTIONS */

        /* Ether collateral is sent to Prime, where it can be withdrawn by User who exercised */
        sendEther(_long, msg.sender);

        /* Clears the liability from State and withdraws Strike asset from Prime */
        return clearLiability(_long, _short, _strike);
    }

    /**
     * @dev users withdraw ether rather than have it directly sent to them
     * @param _receiver address of user to send ether to
     * @param _amount value of ether to withdraw
     */
    function withdrawExercisedEth(
        address payable _receiver,
        uint256 _amount
    ) 
        external 
        nonReentrant 
        returns (bool)
    {

        /* CHECKS */
        require(msg.sender == _primeAddress, 'Addr != Prime');

        /* EFFECTS */

        /* Subtract the ether liability */
        _liability = _liability.sub(_amount);

        /* INTERACTIONS */
        return sendEther(_amount, _receiver);
    }

    /**
     * @dev users withdraw up to the total amount of assets they deposited less liabilities
     * @notice for a user to withdraw all funds, they need to purchase the debt (close position)
     * @param _amount value of ether to withdraw
     */
    function withdrawLpFunds(
        uint256 _amount,
        address payable _user
    ) 
        public 
        nonReentrant 
        returns (bool)
    {

        /* CHECKS */
        require(msg.sender == _user || msg.sender == address(this), 'Caller is not user or pool');

        uint256 userEthBal = _collateral[_user];
        require(userEthBal >= _amount, 'Bal < amt');

        /* EFFECTS */
        
        /* Calculate Liability of user */
        uint256 liable = _liability.mul(userEthBal).div(_totalDeposit);

        /* Calculate Net Assets */
        uint256 userAssets = userEthBal.sub(liable);

        /* Calculate Available Net Pool Assets */
        uint256 poolAssets = _pool.sub(_liability);

        /* Calculate User's Portion of Available Net Assets */
        uint256 proceeds = poolAssets.mul(userEthBal).div(_totalDeposit);

        /* Calculate User's Earnings (Proportional Revenue) - FIX */
        uint256 dividend = _revenue.mul(userEthBal).div(_totalDeposit);

        /* UPDATE SYSTEM BALANCES */

        /* Subtract the user's assets from their total collateral */
        _collateral[_user] = _collateral[_user].sub(userAssets);

        /* Subtract net assets withdrawn from pool */
        _pool = _pool.sub(proceeds);

        /* Subtract the revenue withdrawn */
        _revenue = _revenue.sub(dividend);

        /* Get cToken equity owned by user */
        uint256 equity = _cEther.balanceOf(address(this)).mul(userEthBal).div(_totalDeposit);

        /* Subtract the net assets withdrawn by user from total deposits */
        _totalDeposit = _totalDeposit.sub(userAssets);


        /* INTERACTIONS */
        
        /* Calculate the amount of equity to redeem, net of liabilities */
        uint256 redeemAmount = equity.sub(liable);

        /* Redeem cTokens and send user Ether */
        return swapCTokensToEtherThenSend(redeemAmount, _user);
    }

    /**
     * @dev buy debt, withdraw capital
     * @notice user must purchase option and sell to pool, i.e. burn liability (Prime Token)
     */
    function closePosition(uint256 _amount) external payable returns (bool) {
        /* CHECKS */
        uint256 userEthBal = _collateral[msg.sender];
        require(userEthBal >= _amount, 'Eth Bal < amt');
        require(msg.value == _amount, 'Value < amt');

        /* EFFECTS */
        
        /* Calculate Liability of user */
        uint256 liable = _liability.mul(userEthBal).div(_totalDeposit);

        /* Calculate User's Earnings (Proportional Revenue) */
        uint256 dividend = _revenue.mul(userEthBal).div(_totalDeposit);

        /* Calculate remaining funds after liabilities paid and dividends received */
        uint256 remainingFunds = _amount.add(dividend).sub(liable);

        /* UPDATE SYSTEM BALANCES */

        /* Subtract the ether from user's assets */
        _collateral[msg.sender] = _collateral[msg.sender].sub(userEthBal);

        /* Subtract net assets withdrawn from pool */
        _pool = _pool.sub(remainingFunds);

        /* Subtract the revenue withdrawn */
        _revenue = _revenue.sub(dividend);

        /* Subtract the net assets from total deposits */
        _totalDeposit = _totalDeposit.sub(userEthBal);


        /* INTERACTIONS */
        swapCTokensToEtherThenSend(remainingFunds, msg.sender);
        return sendEther(msg.value, msg.sender);
    }

    /**
     @dev function to send ether with the most security
     */
    function sendEther(uint256 _amount, address payable _user) internal returns (bool) {
        (bool success, ) = _user.call.value(_amount)("");
        require(success, "Transfer failed.");
        return success;
    }

    /**
     @dev converts ether to interest bearing cEther (Compound Protocol)
     @param _amount ether that will be swapped to cEther
     */
    function swapEtherToCompoundEther(uint256 _amount) internal returns (bool) {
        _cEther.mint.value(_amount).gas(250000)();
        return true;
    }

    /**
     @dev converts cEther back into Ether
     @param _amount ether that will be swapped to cEther
     */
    function swapCTokensToEtherThenSend(uint256 _amount, address payable _user) internal returns (bool) {
        uint256 redeemResult = _cEther.redeem(_amount);
        uint256 exchangeRate = _cEther.exchangeRateCurrent();
        emit Debug("If this is not 0, error", redeemResult, _amount);
        require(redeemResult == 0, 'redeem != 0');
        (bool success, ) = _user.call.value(_amount.mul(exchangeRate).div(10**18))("");
        require(success, 'Transfer fail.');
        return success;
    }

    /**
     * @dev reduces liability and gets strike assets from exercised Prime
     */
    function clearLiability(uint256 liability, uint256 short, address strike) internal returns (bool) {
        _liability = _liability.sub(liability);
        return _prime.withdraw(short, strike);
        
    }

    /**
     * @dev view function to get pool - liabilities
     * @return pool amount of available assets
     */
    function getAvailableAssets() public view returns (uint256 pool) {
        /* Available liquidity */
        return _pool.sub(_liability);
    }
}

    