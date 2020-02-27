pragma solidity ^0.6.2;

/*
Title: Carbon Protocol - Carbonprotocol.finance - PRIME - A financial smart contract agreement.
Description: Deposit underlying asset (collateral) to mint corresponding ERC-20 token. 
             Sell token.
             Token holders can burn the token to either
             1. trade, or 2. withdraw, the underlying asset,
             depending on which party deposited the collateral.
             Underlying asset is priced in strike asset.
Architecture: User mints a Contract Object called OPrime, basically a certificate that a deposit was made.
Authors: Alexander
.*/

import "./tokens/SafeMath.sol";


abstract contract ERC20 {
    function balanceOf(address _owner) virtual external returns(uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public virtual returns (bool);
    function transfer(address recipient, uint256 amount) public virtual returns (bool);
}


abstract contract OPrime {
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


abstract contract IPrime {
    event Deposit(address indexed from, address indexed asset, uint256 amount, uint256 indexed tokenId);
    event Exercise(address indexed from, address indexed asset, uint256 amount, uint256 indexed tokenId);
    event Close(address indexed from, address indexed asset, uint256 amount, uint256 indexed tokenId);
    event CollateralUpdate(uint256 _amount, uint256 indexed _tokenId);
    event NewTicket(uint256 indexed _tokenId);

    function initialize(address _ocall) public virtual returns (bool);
    function deposit(uint256 _x, address _y, uint256 _z, address _w, uint256 _p, address _g) public virtual returns (bool success);
    function exercise(uint256 _tokenId) public virtual returns (bool success);
    function withdraw(uint256 _amount, address _addr) public virtual returns (bool success);
    function close(uint256 _tokenId) public virtual returns (bool success);
}


contract Prime is IPrime {
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
    uint256 public constant INCREMENT = 1;
    ERC20 public underlying;
    OPrime public oPrime;
    address public controller;
    uint256 public oNonce;
    
    mapping(uint256 => Ticket) public _tickets; // NFT ID -> Ticket.
    mapping(uint256 => uint256) public _collateral; // NFT ID -> collateral amount.
    mapping(address => mapping(address => uint256)) private _bank; // Users -> asset address -> withdrawable balance.

    function initialize(address _oPrime) public override returns (bool) {
        oPrime = OPrime(_oPrime);
        controller = address(this);
        return true;
    }

    function getCollateralAmount(uint256 _tokenId) public view returns (uint256) {
        return _collateral[_tokenId];
    }

    /** 
     * @dev `msg.sender` Deposits asset x, mints new Ticket.
     * @param _x Amount of collateral to deposit.
     * @param _y Address of collateral asset.
     * @param _z Amount of payment asset.
     * @param _w Payment asset address.
     * @param _p Expiry timestamp.
     * @param _g Receiver address.
     * @return success
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
        ERC20 y = ERC20(_y);
        uint256 b = y.balanceOf(msg.sender);
        require(b >= _x, 'Cannot send amount > bal');

        // EFFECTS
        _incrementNonce();
        _tickets[oNonce] = Ticket(msg.sender, _x, _y, _z, _w, _p, _g);
        _updateCollateral(_x, oNonce);
        _bank[msg.sender][_y] = _x; // Depositor can withdraw collateral

        // INTERACTIONS
        emit Deposit(msg.sender, _y, _x, oNonce);
        oPrime.mint(msg.sender, oNonce, URI);
        return y.transferFrom(msg.sender, address(this), _x);
    }

    /** 
     * @dev `msg.sender` Exercises right to purchase collateral.
     * @param _tokenId ID of Ticket.
     * @return success
     */
    function exercise(uint256 _tokenId) public override returns (bool success) {
        // CHECKS
        uint256 b = oPrime.balanceOf(msg.sender);
        require(b >= 1, 'Cannot send amount > bal');

        address o = oPrime.ownerOf(_tokenId);
        require(o == msg.sender, 'Owner is not sender');

        address a = _tickets[_tokenId].a;
        uint256 x = _tickets[_tokenId].x;
        address y = _tickets[_tokenId].y;
        uint256 z = _tickets[_tokenId].z;
        address w = _tickets[_tokenId].w;
        uint256 p = _tickets[_tokenId].p;
        address g = _tickets[_tokenId].g;
        ERC20 _y = ERC20(_tickets[_tokenId].y);
        ERC20 _w = ERC20(_tickets[_tokenId].w);

        require(_w.balanceOf(msg.sender) >= z, 'Bal < payment amount');
        require(p >= block.timestamp, 'Expired Ticket');

        // EFFECTS
        require(_w.transferFrom(msg.sender, address(this), z), 'Payment not transferred');
        _bank[a][y] = 0; // Depositor cannot withdraw collateral x.
        _bank[g][w] = z; // Payment receiver can withdraw payment z.
        _bank[msg.sender][y] = x; // Payer can withdraw collateral x.

        // INTERACTIONS
        emit Exercise(msg.sender, w, z, _tokenId);
        return oPrime.burn(msg.sender, _tokenId);
    }

    /** 
     * @dev `msg.sender` Close ticket and withdraw collateral as ticket minter.
     * @param _tokenId Ticket NFT ID to close.
     * @return success
     */
    function close(uint256 _tokenId) public override returns (bool success) {
        // CHECKS
        uint256 b = oPrime.balanceOf(msg.sender);
        require(b >= 1, 'Cannot send amount > bal');

        address o = oPrime.ownerOf(_tokenId);
        require(o == msg.sender, 'Owner is not sender');

        address a = _tickets[_tokenId].a;
        uint256 x = _tickets[_tokenId].x;
        address y = _tickets[_tokenId].y;
        uint256 p = _tickets[_tokenId].p;
        ERC20 _y = ERC20(_tickets[_tokenId].y);

        require(msg.sender == a, 'User is not ticket creator');
        require(_bank[msg.sender][y] > 0, 'User has no collateral to claim');
        require(p >= block.timestamp, 'Expired Ticket');

        // EFFECTS
        _bank[msg.sender][y] = 0;

        // INTERACTIONS
        emit Close(msg.sender, y, x, _tokenId);
        oPrime.burn(msg.sender, _tokenId);
        return _y.transfer(msg.sender, x);
    }

    /** 
     * @dev `msg.sender` Withdraw assets from contract.
     * @param _amount Quantity to withdraw.
     * @param _addr Address of asset.
     * @return success
     */
    function withdraw(uint256 _amount, address _addr) public override returns (bool success) {
        // CHECKS
        uint256 b = _bank[msg.sender][_addr];
        require(b >= _amount, 'Cannot withdraw amount > bal');

        // INTERACTIONS
        ERC20 _a = ERC20(_addr);
        return _a.transfer(msg.sender, _amount);
    }

    /** 
     * @dev Utility to update [tokenId] = collateral mapping.
     * @param _amount Quantity of Ticket Collateral.
     * @param _tokenId Nonce of Ticket.
     */
    function _updateCollateral(uint256 _amount, uint256 _tokenId) internal {
        _collateral[_tokenId] = _amount;
        emit CollateralUpdate(_amount, _tokenId);
    }

    /** 
     * @dev Utility to update tokenId Nonce.
     * @return Nonce.
     */
    function _incrementNonce() internal returns (uint256) {
        oNonce = oNonce.add(INCREMENT);
        emit NewTicket(oNonce);
        return oNonce;
    }
}