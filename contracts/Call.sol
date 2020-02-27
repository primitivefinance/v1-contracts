pragma solidity ^0.6.2;

/*
Title: Carbon.finance - Interchangeable finance. Call option derivative.
Description: Deposit underlying asset (collateral) to mint corresponding ERC-20 token. Sell token.
             Token holders can burn the token to either 1. trade, or 2. withdraw, the underlying asset,
             depending on which party deposited the collateral.
             Underlying asset is priced in strike asset.
Architecture: User mints a Contract Object called OCall, basically a certificate that a deposit was made.
Authors: Alexander
.*/

import "./tokens/SafeMath.sol";


abstract contract ERC20 {
    function balanceOf(address _owner) virtual external returns(uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public virtual returns (bool);
    function transfer(address recipient, uint256 amount) public virtual returns (bool);
}


abstract contract OCall {
    function mint(address to, uint256 tokenId, string memory tokenURI) public virtual returns (bool);
    function burn(address owner, uint256 tokenId) public virtual returns (bool);
    function ownerOf(uint256 tokenId) public view virtual returns (address);
    function balanceOf(address owner) public view virtual returns (uint256);
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


abstract contract ICall {
    event Deposit(address indexed from, address indexed asset, uint256 amount, uint256 indexed tokenId);
    event Exercise(address indexed from, address indexed asset, uint256 amount, uint256 indexed tokenId);
    event Close(address indexed from, address indexed asset, uint256 amount, uint256 indexed tokenId);

    function initialize(address _ocall) public virtual returns (bool);
    function deposit(uint256 _x, address _y, uint256 _z, address _w, uint256 _p, address _g) public virtual returns (bool success);
    function exercise(uint256 _tokenId) public virtual returns (bool success);
    function withdraw(uint256 _amount, address _addr) public virtual returns (bool success);
    function close(uint256 _tokenId) public virtual returns (bool success);
}


contract Call is ICall {
    using SafeMath for uint256;

    struct Ticket {
        address a;
        uint256 x;
        address y;
        uint256 z;
        address w;
        uint256 p;
        address g;
    }

    string constant URI = '../URI/OCNFT.json';
    ERC20 public underlying;
    OCall public ocall;
    address public controller;
    uint256 public oNonce;
    uint256 public constant INCREMENT = 1;

    
    mapping(uint256 => Ticket) public _tickets; // NFT Id <--> tickets
    mapping(uint256 => uint256) public _collateral; // tokenId -> collateral amount
    mapping(address => mapping(address => uint256)) private _bank; // Users -> asset address -> withdrawable balance

    function initialize(address _ocall) public override returns (bool) {
        ocall = OCall(_ocall);
        controller = address(this);
        return true;
    }

    function getCollateralAmount(uint256 _tokenId) public view returns (uint256) {
        return _collateral[_tokenId];
    }

    /** 
     * @dev `msg.sender` Underwrites an asset (underlying) which can be bought with (strike) asset.
     * @param _x Amount of collateral to deposit.
     * @param _y Address of collateral asset.
     * @param _z Amount of payment asset.
     * @param _w Payment asset address.
     * @param _p Expiry timestamp.
     * @param _g Payment asset receiver address.
     * @return success Whether or not deposit was successful.
     */
    function deposit(
        uint256 _x,
        address _y,
        uint256 _z,
        address _w,
        uint256 _p,
        address _g
        ) public override returns (bool success) {
        // CHECKS
        underlying = ERC20(_y);
        uint256 bal = underlying.balanceOf(msg.sender);
        require(bal >= _x, 'Cannot send amount > bal');

        // EFFECTS
        oNonce = oNonce.add(INCREMENT);
        _tickets[oNonce] = Ticket(msg.sender, _x, _y, _z, _w, _p, _g);
        _collateral[oNonce] = _x; // x amount deposited to tokenId by address of user
        _bank[msg.sender][_y] = _x; // Depositor can withdraw collateral

        // INTERACTIONS
        emit Deposit(msg.sender, _y, _x, oNonce);
        ocall.mint(msg.sender, oNonce, URI);
        return underlying.transferFrom(msg.sender, address(this), _x);
    }

    /** 
     * @dev `msg.sender` Exercises right to purchase collateral.
     * @param _tokenId ID of Ticket.
     * @return success Whether or not exercise was successful.
     */
    function exercise(uint256 _tokenId) public override returns (bool success) {
        // CHECKS
        uint256 bal = ocall.balanceOf(msg.sender);
        require(bal >= 1, 'Cannot send amount > bal'); // Has a ticket.

        address owner = ocall.ownerOf(_tokenId);
        require(owner == msg.sender, 'Owner is not sender'); // Owns *this* ticket.

        address a = _tickets[_tokenId].a;
        uint256 x = _tickets[_tokenId].x;
        ERC20 y = ERC20(_tickets[_tokenId].y);
        uint256 z = _tickets[_tokenId].z;
        ERC20 w = ERC20(_tickets[_tokenId].w);
        uint256 p = _tickets[_tokenId].p;
        address g = _tickets[_tokenId].g;

        require(w.balanceOf(msg.sender) >= z, 'Bal < payment amount'); // Enough to pay
        require(p >= block.timestamp, 'Expired Ticket'); // Ticket not expired

        // EFFECTS
        require(
            w.transferFrom(msg.sender, address(this), z), 
            'Payment not transferred'); // Transfer payment z to call contract
        _bank[a][address(y)] = 0; // Depositor cannot withdraw collateral x
        _bank[g][address(w)] = z; // Payment receiver can withdraw payment z
        _bank[msg.sender][address(y)] = x; // Payer can withdraw collateral x

        // INTERACTIONS
        emit Exercise(msg.sender, address(w), z, _tokenId);
        return ocall.burn(msg.sender, _tokenId);
    }

    /** 
     * @dev `msg.sender` Close ticket and withdraw collateral as ticket creator.
     * @param _tokenId Ticket NFT ID to close.
     * @return success Whether or not withdraw was successful.
     */
    function close(uint256 _tokenId) public override returns (bool success) {
        // CHECKS
        uint256 bal = ocall.balanceOf(msg.sender);
        require(bal >= 1, 'Cannot send amount > bal'); // Has a ticket.

        address owner = ocall.ownerOf(_tokenId);
        require(owner == msg.sender, 'Owner is not sender'); // Owns *this* ticket.

        address a = _tickets[_tokenId].a;
        uint256 x = _tickets[_tokenId].x;
        ERC20 y = ERC20(_tickets[_tokenId].y);
        uint256 p = _tickets[_tokenId].p;

        require(msg.sender == a, 'User is not ticket creator');
        require(_bank[msg.sender][address(y)] > 0, 'User has no collateral to claim');
        require(p >= block.timestamp, 'Expired Ticket');

        // EFFECTS
        _bank[msg.sender][address(y)] = 0;

        // INTERACTIONS
        emit Close(msg.sender, address(y), x, _tokenId);
        ocall.burn(msg.sender, _tokenId);
        return y.transfer(msg.sender, x);
    }

     /** 
     * @dev `msg.sender` Withdraw assets from contract.
     * @param _amount Quantity to withdraw.
     * @param _addr Address of asset to withdraw.
     * @return success Whether or not withdraw was successful.
     */
    function withdraw(uint256 _amount, address _addr) public override returns (bool success) {
        uint256 bal = _bank[msg.sender][_addr];
        require(bal >= _amount, 'Cannot withdraw amount > bal');
        ERC20 asset = ERC20(_addr);
        return asset.transfer(msg.sender, _amount);
    }
}