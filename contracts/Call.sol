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
}


abstract contract OCall {
    function mint(address to, uint256 tokenId, string memory tokenURI) public virtual returns (bool);
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
    function initialize(address _ocall) public virtual returns (bool);
    function deposit(uint256 _amount, address _underlying) public virtual returns (bool success);
    function exercise(uint256 _amount, uint256 _tokenId) public virtual returns (bool success);
}


contract Call is ICall {
    using SafeMath for uint256;

    string constant URI = '../URI/OCNFT.json';

    ERC20 public underlying;
    OCall public ocall;
    address public controller;
    uint256 public oNonce;
    uint256 public constant INCREMENT = 1;

    mapping(address => mapping(uint256 => uint256)) public deposits;

    function initialize(address _ocall) public override returns (bool) {
        ocall = OCall(_ocall);
        controller = address(this);
        return true;
    }

    function getDepositAmount(address _addr, uint256 _tokenId) public view returns (uint256) {
        return deposits[_addr][_tokenId];
    }

    /** 
     * @dev `msg.sender` Underwrites an asset (underlying) which can be bought with (strike) asset.
     * @param _amount Amount of collateral to deposit.
     * @param _underlying Address of token.
     * @return success Whether or not deposit was successful.
     */
    function deposit(uint256 _amount, address _underlying) public override returns (bool success) {
        // CHECKS
        underlying = ERC20(_underlying);
        uint256 bal = underlying.balanceOf(msg.sender);
        require(bal >= _amount, 'Cannot send amount > bal');

        // EFFECTS
        oNonce = oNonce.add(INCREMENT);
        deposits[msg.sender][oNonce] = _amount;

        // INTERACTIONS
        ocall.mint(msg.sender, oNonce, URI);
        return underlying.transferFrom(msg.sender, address(this), _amount);
    }

    /** 
     * @dev `msg.sender` Exercised right to purchase collateral.
     * @param _amount Amount of contracts (OCNFT) to exercise (burn).
     * @param _tokenId ID of OCNFT.
     * @return success Whether or not deposit was successful.
     */
    function exercise(uint256 _amount, uint256 _tokenId) public override returns (bool success) {
        // CHECKS
        uint256 bal = ocall.balanceOf(msg.sender);
        require(bal >= _amount, 'Cannot send amount > bal');

        address owner = ocall.ownerOf(_tokenId);
        require(owner == msg.sender, 'Owner is not sender');

        // EFFECTS

        // INTERACTIONS

    }
}