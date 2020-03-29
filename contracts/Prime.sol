pragma solidity ^0.6.0;

/**
 * @title   Primitive's Prime Contract
 * @notice  The core ERC721 contract that holds all Instruments.Primes.
 *          A Prime is a ERC-721 token that wraps ERC-20 assets
 *          with functions to interact with them.
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
        bytes4 chain;
        bytes4 fullChain;
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
 * @title Counters
 * @author Matt Condon (@shrugs)
 * @dev Provides counters that can only be incremented or decremented by one. This can be used e.g. to track the number
 * of elements in a mapping, issuing ERC721 ids, or counting request ids.
 *
 * Include with `using Counters for Counters.Counter;`
 * Since it is not possible to overflow a 256 bit integer with increments of one, `increment` can skip the {SafeMath}
 * overflow check, thereby saving gas. This does assume however correct usage, in that the underlying `_value` is never
 * directly accessed.
 */
library Counters {
    using SafeMath for uint256;

    struct Counter {
        // This variable should never be directly accessed by users of the library: interactions must be restricted to
        // the library's function. As of Solidity v0.5.2, this cannot be enforced, though there is a proposal to add
        // this feature: see https://github.com/ethereum/solidity/issues/4637
        uint256 _value; // default: 0
    }

    function current(Counter storage counter) internal view returns (uint256) {
        return counter._value;
    }

    function increment(Counter storage counter) internal {
        // The {SafeMath} overflow check can be skipped here, see the comment at the top
        counter._value += 1;
    }

    function decrement(Counter storage counter) internal {
        counter._value = counter._value.sub(1);
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

/**
 * @title ERC721 Non-Fungible Token Standard basic implementation
 * @dev see https://eips.ethereum.org/EIPS/eip-721
 */
contract ERC721 is Context, ERC165, IERC721 {
    using SafeMath for uint256;
    using Address for address;
    using Counters for Counters.Counter;

    // Equals to `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`
    // which can be also obtained as `IERC721Receiver(0).onERC721Received.selector`
    bytes4 private constant _ERC721_RECEIVED = 0x150b7a02;

    // Mapping from token ID to owner
    mapping (uint256 => address) private _tokenOwner;

    // Mapping from token ID to approved address
    mapping (uint256 => address) private _tokenApprovals;

    // Mapping from owner to number of owned token
    mapping (address => Counters.Counter) private _ownedTokensCount;

    // Mapping from owner to operator approvals
    mapping (address => mapping (address => bool)) private _operatorApprovals;

    /*
     *     bytes4(keccak256('balanceOf(address)')) == 0x70a08231
     *     bytes4(keccak256('ownerOf(uint256)')) == 0x6352211e
     *     bytes4(keccak256('approve(address,uint256)')) == 0x095ea7b3
     *     bytes4(keccak256('getApproved(uint256)')) == 0x081812fc
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) == 0x23b872dd
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256)')) == 0x42842e0e
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)')) == 0xb88d4fde
     *
     *     => 0x70a08231 ^ 0x6352211e ^ 0x095ea7b3 ^ 0x081812fc ^
     *        0xa22cb465 ^ 0xe985e9c ^ 0x23b872dd ^ 0x42842e0e ^ 0xb88d4fde == 0x80ac58cd
     */
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    constructor () public {
        // register the supported interfaces to conform to ERC721 via ERC165
        _registerInterface(_INTERFACE_ID_ERC721);
    }

    /**
     * @dev Gets the balance of the specified address.
     * @param owner address to query the balance of
     * @return uint256 representing the amount owned by the passed address
     */
    function balanceOf(address owner) public view override returns (uint256) {
        require(owner != address(0), "ERC721: balance query for the zero address");

        return _ownedTokensCount[owner].current();
    }

    /**
     * @dev Gets the owner of the specified token ID.
     * @param tokenId uint256 ID of the token to query the owner of
     * @return address currently marked as the owner of the given token ID
     */
    function ownerOf(uint256 tokenId) public view override returns (address) {
        address owner = _tokenOwner[tokenId];
        require(owner != address(0), "ERC721: owner query for nonexistent token");

        return owner;
    }

    /**
     * @dev Approves another address to transfer the given token ID
     * The zero address indicates there is no approved address.
     * There can only be one approved address per token at a given time.
     * Can only be called by the token owner or an approved operator.
     * @param to address to be approved for the given token ID
     * @param tokenId uint256 ID of the token to be approved
     */
    function approve(address to, uint256 tokenId) public virtual override {
        address owner = ownerOf(tokenId);
        require(to != owner, "ERC721: approval to current owner");

        require(_msgSender() == owner || isApprovedForAll(owner, _msgSender()),
            "ERC721: approve caller is not owner nor approved for all"
        );

        _approve(to, tokenId);
    }

    /**
     * @dev Gets the approved address for a token ID, or zero if no address set
     * Reverts if the token ID does not exist.
     * @param tokenId uint256 ID of the token to query the approval of
     * @return address currently approved for the given token ID
     */
    function getApproved(uint256 tokenId) public view override returns (address) {
        require(_exists(tokenId), "ERC721: approved query for nonexistent token");

        return _tokenApprovals[tokenId];
    }

    /**
     * @dev Sets or unsets the approval of a given operator
     * An operator is allowed to transfer all tokens of the sender on their behalf.
     * @param operator operator address to set the approval
     * @param approved representing the status of the approval to be set
     */
    function setApprovalForAll(address operator, bool approved) public virtual override {
        require(operator != _msgSender(), "ERC721: approve to caller");

        _operatorApprovals[_msgSender()][operator] = approved;
        emit ApprovalForAll(_msgSender(), operator, approved);
    }

    /**
     * @dev Tells whether an operator is approved by a given owner.
     * @param owner owner address which you want to query the approval of
     * @param operator operator address which you want to query the approval of
     * @return bool whether the given operator is approved by the given owner
     */
    function isApprovedForAll(address owner, address operator) public view override returns (bool) {
        return _operatorApprovals[owner][operator];
    }

    /**
     * @dev Transfers the ownership of a given token ID to another address.
     * Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     * Requires the msg.sender to be the owner, approved, or operator.
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     */
    function transferFrom(address from, address to, uint256 tokenId) public virtual override {
        //solhint-disable-next-line max-line-length
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");

        _transferFrom(from, to, tokenId);
    }

    /**
     * @dev Safely transfers the ownership of a given token ID to another address
     * If the target address is a contract, it must implement {IERC721Receiver-onERC721Received},
     * which is called upon a safe transfer, and return the magic value
     * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
     * the transfer is reverted.
     * Requires the msg.sender to be the owner, approved, or operator
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     */
    function safeTransferFrom(address from, address to, uint256 tokenId) public virtual override {
        safeTransferFrom(from, to, tokenId, "");
    }

    /**
     * @dev Safely transfers the ownership of a given token ID to another address
     * If the target address is a contract, it must implement {IERC721Receiver-onERC721Received},
     * which is called upon a safe transfer, and return the magic value
     * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
     * the transfer is reverted.
     * Requires the _msgSender() to be the owner, approved, or operator
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes data to send along with a safe transfer check
     */
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) public virtual override {
        require(_isApprovedOrOwner(_msgSender(), tokenId), "ERC721: transfer caller is not owner nor approved");
        _safeTransferFrom(from, to, tokenId, _data);
    }

    /**
     * @dev Safely transfers the ownership of a given token ID to another address
     * If the target address is a contract, it must implement `onERC721Received`,
     * which is called upon a safe transfer, and return the magic value
     * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
     * the transfer is reverted.
     * Requires the msg.sender to be the owner, approved, or operator
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes data to send along with a safe transfer check
     */
    function _safeTransferFrom(address from, address to, uint256 tokenId, bytes memory _data) internal virtual {
        _transferFrom(from, to, tokenId);
        require(_checkOnERC721Received(from, to, tokenId, _data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    /**
     * @dev Returns whether the specified token exists.
     * @param tokenId uint256 ID of the token to query the existence of
     * @return bool whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        address owner = _tokenOwner[tokenId];
        return owner != address(0);
    }

    /**
     * @dev Returns whether the given spender can transfer a given token ID.
     * @param spender address of the spender to query
     * @param tokenId uint256 ID of the token to be transferred
     * @return bool whether the msg.sender is approved for the given token ID,
     * is an operator of the owner, or is the owner of the token
     */
    function _isApprovedOrOwner(address spender, uint256 tokenId) internal view returns (bool) {
        require(_exists(tokenId), "ERC721: operator query for nonexistent token");
        address owner = ownerOf(tokenId);
        return (spender == owner || getApproved(tokenId) == spender || isApprovedForAll(owner, spender));
    }

    /**
     * @dev Internal function to safely mint a new token.
     * Reverts if the given token ID already exists.
     * If the target address is a contract, it must implement `onERC721Received`,
     * which is called upon a safe transfer, and return the magic value
     * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
     * the transfer is reverted.
     * @param to The address that will own the minted token
     * @param tokenId uint256 ID of the token to be minted
     */
    function _safeMint(address to, uint256 tokenId) internal virtual {
        _safeMint(to, tokenId, "");
    }

    /**
     * @dev Internal function to safely mint a new token.
     * Reverts if the given token ID already exists.
     * If the target address is a contract, it must implement `onERC721Received`,
     * which is called upon a safe transfer, and return the magic value
     * `bytes4(keccak256("onERC721Received(address,address,uint256,bytes)"))`; otherwise,
     * the transfer is reverted.
     * @param to The address that will own the minted token
     * @param tokenId uint256 ID of the token to be minted
     * @param _data bytes data to send along with a safe transfer check
     */
    function _safeMint(address to, uint256 tokenId, bytes memory _data) internal virtual {
        _mint(to, tokenId);
        require(_checkOnERC721Received(address(0), to, tokenId, _data), "ERC721: transfer to non ERC721Receiver implementer");
    }

    /**
     * @dev Internal function to mint a new token.
     * Reverts if the given token ID already exists.
     * @param to The address that will own the minted token
     * @param tokenId uint256 ID of the token to be minted
     */
    function _mint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        require(!_exists(tokenId), "ERC721: token already minted");

        _beforeTokenTransfer(address(0), to, tokenId);

        _tokenOwner[tokenId] = to;
        _ownedTokensCount[to].increment();

        emit Transfer(address(0), to, tokenId);
    }

    /**
     * @dev Internal function to burn a specific token.
     * Reverts if the token does not exist.
     * @param tokenId uint256 ID of the token being burned
     */
    function _burn(uint256 tokenId) internal virtual {
        address owner = ownerOf(tokenId);

        _beforeTokenTransfer(owner, address(0), tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _ownedTokensCount[owner].decrement();
        _tokenOwner[tokenId] = address(0);

        emit Transfer(owner, address(0), tokenId);
    }

    /**
     * @dev Internal function to transfer ownership of a given token ID to another address.
     * As opposed to {transferFrom}, this imposes no restrictions on msg.sender.
     * @param from current owner of the token
     * @param to address to receive the ownership of the given token ID
     * @param tokenId uint256 ID of the token to be transferred
     */
    function _transferFrom(address from, address to, uint256 tokenId) internal virtual {
        require(ownerOf(tokenId) == from, "ERC721: transfer of token that is not own");
        require(to != address(0), "ERC721: transfer to the zero address");

        _beforeTokenTransfer(from, to, tokenId);

        // Clear approvals
        _approve(address(0), tokenId);

        _ownedTokensCount[from].decrement();
        _ownedTokensCount[to].increment();

        _tokenOwner[tokenId] = to;

        emit Transfer(from, to, tokenId);
    }

    /**
     * @dev Internal function to invoke {IERC721Receiver-onERC721Received} on a target address.
     * The call is not executed if the target address is not a contract.
     *
     * @param from address representing the previous owner of the given token ID
     * @param to target address that will receive the tokens
     * @param tokenId uint256 ID of the token to be transferred
     * @param _data bytes optional data to send along with the call
     * @return bool whether the call correctly returned the expected magic value
     */
    function _checkOnERC721Received(address from, address to, uint256 tokenId, bytes memory _data)
        private returns (bool)
    {
        if (!to.isContract()) {
            return true;
        }
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, bytes memory returndata) = to.call(abi.encodeWithSelector(
            IERC721Receiver(to).onERC721Received.selector,
            _msgSender(),
            from,
            tokenId,
            _data
        ));
        if (!success) {
            if (returndata.length > 0) {
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    let returndata_size := mload(returndata)
                    revert(add(32, returndata), returndata_size)
                }
            } else {
                revert("ERC721: transfer to non ERC721Receiver implementer");
            }
        } else {
            bytes4 retval = abi.decode(returndata, (bytes4));
            return (retval == _ERC721_RECEIVED);
        }
    }

    function _approve(address to, uint256 tokenId) private {
        _tokenApprovals[tokenId] = to;
        emit Approval(ownerOf(tokenId), to, tokenId);
    }

    /**
     * @dev Hook that is called before any token transfer. This includes minting
     * and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `from`'s `tokenId` will be
     * transferred to `to`.
     * - when `from` is zero, `tokenId` will be minted for `to`.
     * - when `to` is zero, `from`'s `tokenId` will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:using-hooks.adoc[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual { }
}

/**
 * @title ERC-721 Non-Fungible Token Standard, optional metadata extension
 * @dev See https://eips.ethereum.org/EIPS/eip-721
 */
interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

contract ERC721Metadata is Context, ERC165, ERC721, IERC721Metadata {
    // Token name
    string private _name;

    // Token symbol
    string private _symbol;

    // Optional mapping for token URIs
    mapping(uint256 => string) private _tokenURIs;

    // Base URI
    string private _baseURI;

    /*
     *     bytes4(keccak256('name()')) == 0x06fdde03
     *     bytes4(keccak256('symbol()')) == 0x95d89b41
     *     bytes4(keccak256('tokenURI(uint256)')) == 0xc87b56dd
     *
     *     => 0x06fdde03 ^ 0x95d89b41 ^ 0xc87b56dd == 0x5b5e139f
     */
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;

    /**
     * @dev Constructor function
     */
    constructor (string memory name, string memory symbol) public {
        _name = name;
        _symbol = symbol;

        // register the supported interfaces to conform to ERC721 via ERC165
        _registerInterface(_INTERFACE_ID_ERC721_METADATA);
    }

    /**
     * @dev Gets the token name.
     * @return string representing the token name
     */
    function name() external view override returns (string memory) {
        return _name;
    }

    /**
     * @dev Gets the token symbol.
     * @return string representing the token symbol
     */
    function symbol() external view override returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the URI for a given token ID. May return an empty string.
     *
     * If the token's URI is non-empty and a base URI was set (via
     * {_setBaseURI}), it will be added to the token ID's URI as a prefix.
     *
     * Reverts if the token ID does not exist.
     */
    function tokenURI(uint256 tokenId) external view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");

        string memory _tokenURI = _tokenURIs[tokenId];

        // Even if there is a base URI, it is only appended to non-empty token-specific URIs
        if (bytes(_tokenURI).length == 0) {
            return "";
        } else {
            // abi.encodePacked is being used to concatenate strings
            return string(abi.encodePacked(_baseURI, _tokenURI));
        }
    }

    /**
     * @dev Internal function to set the token URI for a given token.
     *
     * Reverts if the token ID does not exist.
     *
     * TIP: if all token IDs share a prefix (e.g. if your URIs look like
     * `http://api.myproject.com/token/<id>`), use {_setBaseURI} to store
     * it and save gas.
     */
    function _setTokenURI(uint256 tokenId, string memory _tokenURI) internal virtual {
        require(_exists(tokenId), "ERC721Metadata: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    /**
     * @dev Internal function to set the base URI for all token IDs. It is
     * automatically added as a prefix to the value returned in {tokenURI}.
     */
    function _setBaseURI(string memory baseURI) internal virtual {
        _baseURI = baseURI;
    }

    /**
    * @dev Returns the base URI set via {_setBaseURI}. This will be
    * automatically added as a preffix in {tokenURI} to each token's URI, when
    * they are non-empty.
    */
    function baseURI() external view returns (string memory) {
        return _baseURI;
    }


    function _beforeTokenTransfer(address from, address to, uint256 tokenId) internal virtual override {
        super._beforeTokenTransfer(from, to, tokenId);

        if (to == address(0)) { // When burning tokens
            // Clear metadata (if any)
            if (bytes(_tokenURIs[tokenId]).length != 0) {
                delete _tokenURIs[tokenId];
            }
        }
    }
}

abstract contract ERC20 {
    function balanceOf(address _owner) virtual external returns(uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public virtual returns (bool);
    function transfer(address recipient, uint256 amount) public virtual returns (bool);
}

abstract contract IPool {
    function exercise(uint256 _long, uint256 _short, address _strike) external payable virtual returns (bool);
}

abstract contract IPrime {
    /**
    * @dev Emitted when a Minter deposits collateral.
    * @param _user Address of user.
    * @param _collateralQty Quantity of the deposited asset.
    * @param _collateral Address of the deposited asset.
    * @param _paymentQty Quantity of the deposited asset.
    * @param _payment Address of the deposited asset.
    * @param _tokenId Nonce of minted Prime -> ID.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event PrimeMinted(
        address indexed _user,
        uint256 _collateralQty,
        address  _collateral,
        uint256 _paymentQty,
        address  _payment,
        uint256 indexed _tokenId, 
        uint256 _timestamp
    );

    /**
    * @dev Emitted when a Burner purchases collateral.
    * @param _user Address of user.
    * @param _collateralQty Quantity of the deposited asset.
    * @param _collateral Address of the deposited asset.
    * @param _paymentQty Quantity of the deposited asset.
    * @param _payment Address of the deposited asset.
    * @param _tokenId Nonce of minted Prime -> ID.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event PrimeExercised(
        address indexed _user,
        uint256 _collateralQty,
        address  _collateral,
        uint256 _paymentQty,
        address  _payment,
        uint256 indexed _tokenId, 
        uint256 _timestamp
    );

    /**
    * @dev Emitted when collateral is withdrawable by Minter.
    * @param _user Address of user.
    * @param _collateralQty Quantity of the deposited asset.
    * @param _collateral Address of the deposited asset.
    * @param _tokenId Nonce of minted Prime -> ID.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event PrimeClosed(
        address indexed _user,
        uint256 _collateralQty,
        address  indexed _collateral,
        uint256 indexed _tokenId, 
        uint256 _timestamp
    );

    /**
    * @dev Emitted when collateral is withdrawn from Prime.
    * @param _user Address of user.
    * @param _collateralQty Quantity of the deposited asset.
    * @param _collateral Address of the deposited asset.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event Withdrawal(
        address indexed _user,
        uint256 _collateralQty,
        address indexed _collateral,
        uint256 _timestamp
    );


    function createPrime(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) external payable virtual returns (uint256);
    function exercise(uint256 _tokenId) external payable virtual returns (bool);
    function close(uint256 _collateralId, uint256 _burnId) external virtual returns (bool);
    function withdraw(uint256 _amount, address _asset) public virtual returns (bool);
}

contract Prime is IPrime, ERC721Metadata, ReentrancyGuard {
    using SafeMath for uint256;

    uint256 public nonce;
    address private _owner;
    address public _poolAddress;
    IPool public _pool;

    /* Maps a user's withdrawable asset balance */
    mapping(address => mapping(address => uint256)) private _assets;
    mapping(address => mapping(address => uint256)) private _liabilities;

    /* Map NFT IDs to Prime Struct */
    mapping(uint256 => Instruments.Primes) public _primes;

    constructor () public
        ERC721Metadata(
            "Prime Derivative",
            "PRIME"
        ) {
            _owner = msg.sender;
        }
    
    receive() external payable {}

    /* SET*/
    function setPoolAddress(address poolAddress) external {
        require(msg.sender == _owner, 'not owner');
        _poolAddress = poolAddress;
        _pool = IPool(poolAddress);
    }

    /* PRIME FUNCTIONS */

    /** 
     * @dev `msg.sender` Deposits asset x, mints new Slate.
     * @param _xis Amount of collateral to deposit.
     * @param _yak Address of collateral asset.
     * @param _zed Amount of payment asset.
     * @param _wax Payment asset address.
     * @param _pow Expiry timestamp.
     * @param _gem Receiver address.
     * @return _nonce nonce of token minted
     */
    function createPrime(
        uint256 _xis,
        address _yak,
        uint256 _zed,
        address _wax,
        uint256 _pow,
        address _gem
    ) 
        external
        payable
        override
        returns (uint256) 
    {
        /* CHECKS */
        
        /* If this is an Ether Call Prime */
        if(_yak == _poolAddress && msg.sender != _poolAddress) {
            isGreaterThanOrEqual(msg.value, _xis);
        }

        /* EFFECTS */

        /* Update collateral liability of Prime minter */
        _liabilities[msg.sender][_yak] = _liabilities[msg.sender][_yak].add(_xis);

        /* INTERACTIONS */

        /* Create Prime and Mint to msg.sender */
        addPrime(msg.sender, _xis, _yak, _zed, _wax, _pow, _gem);

        /* If its an ERC-20 Prime, withdraw token from minter */
        if(_yak != _poolAddress && msg.sender != _poolAddress) {
            ERC20 yak = ERC20(_yak);
            isGreaterThanOrEqual(yak.balanceOf(msg.sender), _xis);
            yak.transferFrom(msg.sender, address(this), _xis);
            return nonce;
        }

        return nonce;
    }

    /**
     * @dev adds Prime to state, emits event, and mints
     */
    function addPrime(
        address _tokenReceiver,
        uint256 _xis,
        address _yak,
        uint256 _zed,
        address _wax,
        uint256 _pow,
        address _gem
    ) internal nonReentrant returns (uint256) {
        nonce = nonce.add(1);

        bytes4 chain = bytes4(
            keccak256(abi.encodePacked(_yak))) 
            ^ bytes4(keccak256(abi.encodePacked(_wax))) 
            ^ bytes4(keccak256(abi.encodePacked(_pow))
        );

        bytes4 fullChain = (
            chain 
            ^ bytes4(keccak256(abi.encodePacked(_xis))) 
            ^ bytes4(keccak256(abi.encodePacked(_zed)))
        );

        _primes[nonce] = Instruments.Primes(
            _tokenReceiver, 
            _xis,
            _yak, 
            _zed, 
            _wax, 
            _pow, 
            _gem,
            chain,
            fullChain
        );

        /* INTERACTIONS */
        emit PrimeMinted(
            _tokenReceiver, 
            _xis,
            _yak,
            _zed,
            _wax,
            nonce, 
            block.timestamp
        );

        _safeMint(
            _tokenReceiver, 
            nonce
        );
        return nonce;
    }

    /** 
     * @dev Swaps strike asset for collateral
     * @param _tokenId ID of Prime.
     * @return bool Success.
     */
    function exercise(
        uint256 _tokenId
    ) 
        external 
        payable
        override
        nonReentrant
        returns (bool) 
    {
        /* CHECKS */
        isTokenExpired(_tokenId);
        isOwner(_tokenId, msg.sender);

        /* Get Prime */
        Instruments.Primes memory _prime = _primes[_tokenId];

        /* If wax is a pool, its an Ether Put Prime, else its an ERC-20 Prime */
        ERC20 _wax = ERC20(_prime.wax);

        /* Require strike assets to be transferred into Prime contract */
        if(_prime.wax == _poolAddress) {
            /* Strike asset is ether, so it should be transferred in as msg.value */
            isGreaterThanOrEqual(msg.value, _prime.zed);
        } else {
            /* Strike asset is a token, user should have a balance >= strike amount */
            isGreaterThanOrEqual(_wax.balanceOf(msg.sender), _prime.zed);
        }

        /* EFFECTS */

        /* UPDATE COLLATERAL BALANCE SHEET */

        /* Original Minter has their collateral balance debited. */
        _liabilities[_prime.ace][_prime.yak] = _liabilities[_prime.ace][_prime.yak].sub(_prime.xis);
        /* Exercisor has their collateral balance credited. */
        _assets[msg.sender][_prime.yak] = _assets[msg.sender][_prime.yak].add(_prime.xis);
        
        /* UPDATE STRIKE BALANCE SHEET */

        /* Payment receiver has their payment balance credited. */
        _assets[_prime.gem][_prime.wax] = _assets[_prime.gem][_prime.wax].add(_prime.zed);
        
        
        /* INTERACTIONS */

        emit PrimeExercised(
            msg.sender,
            _prime.xis,
            _prime.yak,
            _prime.zed,
            _prime.wax,
            _tokenId, 
            block.timestamp
        );
        
        _burn(_tokenId);

        /* DEBIT THE EXERCISOR'S STRIKE */

        /* If strike receiver is pool, pull strike asset from Prime */
        if(_prime.gem == _poolAddress) {
            /* Transfer the strike asset into the Prime Contract */
            _wax.transferFrom(msg.sender, address(this), _prime.zed);
            /* Calls the Pool to (1) Send collateral ether to Prime and (2) withdraw strike assets from Prime */
            return _pool.exercise(_prime.xis, _prime.zed, _prime.wax);
        }

        /* If strike asset is a token, transfer from user to Prime contract */
        if(_prime.wax != _poolAddress) {
            return _wax.transferFrom(msg.sender, address(this), _prime.zed);
        }

        /* Strike asset is ether, it was already transferred in as msg.value */
        return true;
    }

    /** 
     * @dev `msg.sender` Closes Prime and 
     * can withdraw collateral as Prime minter.
     * Msg.sender can burn any Prime NFT 
     * that has matching properties when compared
     * to their minted Prime NFT. This way, 
     * they can sell their Minted Prime, and if
     * they need to close the position, 
     * they can buy another Prime rather than track down 
     * the exact one they sold/traded away. 
     * @param _collateralId Prime NFT ID with Minter's collateral.
     * @param _burnId Prime NFT ID that Minter owns,
     *  and intends to burn to withdraw collateral.
     * @return bool Success.
     */
    function close(
        uint256 _collateralId,
        uint256 _burnId
    ) 
        external 
        override
        nonReentrant
        returns (bool) 
    {
        /* CHECKS */
        isOwner(_burnId, msg.sender);
        arePrimesInSameSeries(_collateralId, _burnId);
        isTokenExpired(_burnId);

        /* Get Prime that will get Burned */
        Instruments.Primes memory _burnPrime = _primes[_burnId];
        ERC20 _yakBurn = ERC20(_burnPrime.yak);
        isGreaterThanOrEqual(_assets[msg.sender][_burnPrime.yak], 0);

        /* EFFECTS */

        /* Minter's collateral is debited. */
        _assets[msg.sender][_burnPrime.yak] = _assets[msg.sender][_burnPrime.yak].sub(_burnPrime.xis);

        /* INTERACTIONS */
        emit PrimeClosed(
            msg.sender, 
            _burnPrime.xis,
            _burnPrime.yak,
            _burnId, 
            block.timestamp
        );

        _burn(_burnId);

        /* If the collateral asset is Ether, send ether to the user. */
        if(_burnPrime.yak == _poolAddress) {
            return sendEther(_burnPrime.xis, msg.sender);
        }

        /* Else, the collateral is an ERC-20 token. Send it to the user. */
        return _yakBurn.transfer(msg.sender, _burnPrime.xis);
    }

    /** 
     * @dev Users pull their assets from the Prime contract
     * @param _amount Quantity to withdraw.
     * @param _asset Address of asset.
     * @return success
     */
    function withdraw(
        uint256 _amount, 
        address _asset
    ) 
        public 
        override
        returns (bool) 
    {
        /* CHECKS */
        /* Checks User's ledger balance */
        uint256 assetBal = _assets[msg.sender][_asset];
        isGreaterThanOrEqual(assetBal, _amount);

        /* EFFECTS */

        /* User's account is debited */
        _assets[msg.sender][_asset] = assetBal.sub(_amount);

        /* INTERACTIONS  */
        emit Withdrawal(
            msg.sender, 
            _amount,
            _asset,
            block.timestamp
        );

        /* If asset is Ether (pool address), withdraw ether */
        if(_asset == _poolAddress) {
            return sendEther(_amount, msg.sender);
        }

        /* Else, asset is a token, transfer it to user. */
        ERC20 erc20 = ERC20(_asset);
        return erc20.transfer(msg.sender, _amount);
    }

    /* CAPITAL MANAGEMENT FUNCTION */

    function sendEther(uint256 _amount, address payable _to) internal returns (bool) {
        (bool success, ) = _to.call.value(_amount)("");
        require(success, "Transfer failed.");
        return success;
    }


    /* VIEW FUNCTIONS */


    /** 
     * @dev Public view function to get Prime properties.
     */
    function getPrime(uint256 _tokenId) external view returns (
            address ace,
            uint256 xis,
            address yak,
            uint256 zed,
            address wax,
            uint256 pow,
            address gem,
            bytes4 chain
        ) {
            Instruments.Primes memory _prime = _primes[_tokenId];
            return (
                _prime.ace,
                _prime.xis,
                _prime.yak,
                _prime.zed,
                _prime.wax,
                _prime.pow,
                _prime.gem,
                _prime.chain
            );
    }

    function getChain(uint256 _tokenId) public view returns (
            bytes4 chain
        ) {
            Instruments.Primes memory _prime = _primes[_tokenId];
            return (
                _prime.chain
            );
    }

    function getFullChain(uint256 _tokenId) public view returns (
            bytes4 fullChain
        ) {
            Instruments.Primes memory _prime = _primes[_tokenId];
            return (
                _prime.fullChain
            );
    }

    /** 
     * @dev Public view function to get the Bank's balance of a User
     */
    function getAssetBalance(address _user, address _asset) public view returns (uint256) {
            return _assets[_user][_asset];
    }

    function isTokenExpired(uint256 _tokenId) public view returns(bool) {
        require( _primes[_tokenId].pow >= block.timestamp, 'expired');
        return true;
    }

    function isOwner(uint256 _tokenId, address _user) public view returns(bool) {
        require(ownerOf(_tokenId) == _user, '!own');
        return true;
    }

    function isGreaterThanOrEqual(uint256 _a, uint256 _b) public pure returns(bool) {
        require(_a >= _b, 'a < b');
        return true;
    }


    /* UTILITY FUNCTIONS */


    /** 
     * @dev Utility to compare hashes of Prime properties.
     * @param _collateralId id of token that is having its collateral withdraw
     * @param _burnId id of token that is being burned
     * @return bool of whether Instruments.Primes match.
    */
    function arePrimesInSameSeries(
        uint256 _collateralId,
        uint256 _burnId
    ) 
        public 
        view 
        returns
        (bool)
    {
        bytes4 hashCollateral = getFullChain(_collateralId);
        bytes4 hashBurn = getFullChain(_burnId);

        require(hashCollateral == hashBurn, 'Props !=');
        return hashCollateral == hashBurn;
    }
}