pragma solidity ^0.6.2;

/**
 * @title Carbon's Prime Contract
 * @notice The core ERC721 contract that holds all Slates. 
 *         A Prime is two-party contract. A Slate is an NFT with the properties of the contract.
 * @author Carbon
 */


import "./tokens/SafeMath.sol";
import "./Slate.sol";


abstract contract ERC20 {
    function balanceOf(address _owner) virtual external returns(uint256);
    function transferFrom(address sender, address recipient, uint256 amount) public virtual returns (bool);
    function transfer(address recipient, uint256 amount) public virtual returns (bool);
}


abstract contract IPrime {
    /**
    * @dev Emitted when a Minter deposits collateral.
    * @param _user Address of user.
    * @param _collateralQty Quantity of the deposited asset.
    * @param _collateral Address of the deposited asset.
    * @param _paymentQty Quantity of the deposited asset.
    * @param _payment Address of the deposited asset.
    * @param _tokenId Nonce of minted Slate -> ID.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event SlateMinted(
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
    * @param _tokenId Nonce of minted Slate -> ID.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event SlateExercised(
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
    * @param _tokenId Nonce of minted Slate -> ID.
    * @param _timestamp Block.timestamp of deposit.
    **/
    event SlateClosed(
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


    function createSlate(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) public virtual returns (bool);
    function exercise(uint256 _tokenId) public virtual returns (bool);
    function withdraw(uint256 _amount, address _addr) public virtual returns (bool);
    function close(uint256 _tokenId) public virtual returns (bool);
}


contract Prime is IPrime, Slate {
    using SafeMath for uint256;

    /** 
     * @dev A Slate has the properties of a Prime.
     * @param ace `msg.sender` of the createSlate function.
     * @param xis Quantity of collateral asset token.
     * @param yak Address of collateral asset token.
     * @param zed Purchase price of collateral, denominated in quantity of token z.
     * @param wax Address of purchase price asset token.
     * @param pow UNIX timestamp of valid time period.
     * @param gem Address of payment receiver of token z.
     */
    struct Slates {
        address ace;
        uint256 xis;
        address yak;
        uint256 zed;
        address wax;
        uint256 pow;
        address gem;
    }

    string constant URI = '';
    uint256 constant INCREMENT = 1;
    uint256 public nonce;

    // Map NFT IDs to Slates
    mapping(uint256 => Slates) public _slates;

    // Maps Slates to Collateral Assets and Quantity
    mapping(uint256 => mapping(uint256 => uint256)) public _collateral;

    // Maps a user's withdrawable
    mapping(address => mapping(address => uint256)) private _bank; // Users -> asset -> withdrawable balance.


    constructor (
        string memory name, 
        string memory symbol
    ) 
        public 
        Slate(name, symbol) 
    {
        _name = name;
        _symbol = symbol;
        _controller = msg.sender;

        // register the supported interfaces to conform to ERC721 via ERC165
        _registerInterface(_INTERFACE_ID_ERC721_METADATA);
    }

    /** 
     * @dev `msg.sender` Deposits asset x, mints new Slate.
     * @param _xis Amount of collateral to deposit.
     * @param _yak Address of collateral asset.
     * @param _zed Amount of payment asset.
     * @param _wax Payment asset address.
     * @param _pow Expiry timestamp.
     * @param _gem Receiver address.
     * @return success
     */
    function createSlate(
        uint256 _xis,
        address _yak,
        uint256 _zed,
        address _wax,
        uint256 _pow,
        address _gem
    ) 
        public 
        override 
        returns (bool) 
    {

        // CHECKS
        ERC20 yak = ERC20(_yak);
        uint256 bal = yak.balanceOf(msg.sender);
        require(
            bal >= _xis, 
            'Cannot send amount > bal'
        );

        // EFFECTS
        _incrementNonce();
        _slates[nonce] = Slates(
            msg.sender, 
            _xis,
            _yak, 
            _zed, 
            _wax, 
            _pow, 
            _gem
        );

        _bank[msg.sender][_yak] = _xis; // Depositor can withdraw collateral

        // INTERACTIONS
        emit SlateMinted(
            msg.sender, 
            _xis,
            _yak,
            _zed,
            _wax,
            nonce, 
            block.timestamp
        );

        mintSlate(
            msg.sender, 
            nonce, 
            URI
        );

        return yak.transferFrom(msg.sender, address(this), _xis);
    }

    /** 
     * @dev `msg.sender` Exercises right to purchase collateral.
     * @param _tokenId ID of Slate.
     * @return success
     */
    function exercise(
        uint256 _tokenId
    ) 
        public 
        override 
        returns (bool) 
    {
        // CHECKS
        uint256 bal = balanceOf(msg.sender);
        require(
            bal >= 1, 
            'Cannot send amount > bal'
        );

        address own = ownerOf(_tokenId);
        require(
            own == msg.sender, 
            'Owner is not sender'
        );

        address ace = _slates[_tokenId].ace;
        uint256 xis = _slates[_tokenId].xis;
        address yak = _slates[_tokenId].yak;
        uint256 zed = _slates[_tokenId].zed;
        address wax = _slates[_tokenId].wax;
        uint256 pow = _slates[_tokenId].pow;
        address gem = _slates[_tokenId].gem;
        ERC20 _yak = ERC20(_slates[_tokenId].yak);
        ERC20 _wax = ERC20(_slates[_tokenId].wax);

        require(
            _wax.balanceOf(msg.sender) >= zed, 
            'Bal < payment amount'
        );
        
        require(
            pow >= block.timestamp, 
            'Expired Slate'
        );

        // EFFECTS
        require(
            _wax.transferFrom(msg.sender, address(this), zed), 
            'Payment not transferred'
        );

        _bank[ace][yak] = 0; // Depositor cannot withdraw collateral x.
        _bank[gem][wax] = zed; // Payment receiver can withdraw payment z.
        _bank[msg.sender][yak] = xis; // Payer can withdraw collateral x.

        // INTERACTIONS
        emit SlateExercised(
            msg.sender,
            xis,
            yak,
            zed,
            wax,
            _tokenId, 
            block.timestamp
        );
        return burn(msg.sender, _tokenId);
    }

    /** 
     * @dev `msg.sender` Close Slate and withdraw collateral as Slate minter.
     * @param _tokenId Slate NFT ID to close.
     * @return success
     */
    function close(
        uint256 _tokenId
    ) 
        public 
        override 
        returns (bool) 
    {
        // CHECKS
        uint256 bal = balanceOf(msg.sender);
        require(
            bal >= 1, 
            'Cannot send amount > bal'
        );

        address own = ownerOf(_tokenId);
        require(
            own == msg.sender, 
            'Owner is not sender'
        );

        address ace = _slates[_tokenId].ace;
        uint256 xis = _slates[_tokenId].xis;
        address yak = _slates[_tokenId].yak;
        uint256 pow = _slates[_tokenId].pow;
        ERC20 _yak = ERC20(_slates[_tokenId].yak);

        require(
            msg.sender == ace, 
            'User is not Slate creator'
        );

        require(
            _bank[msg.sender][yak] > 0, 
            'User has no collateral to claim'
        );

        require(
            pow >= block.timestamp, 
            'Expired Slate'
        );

        // EFFECTS
        _bank[msg.sender][yak] = 0;

        // INTERACTIONS
        emit SlateClosed(
            msg.sender, 
            xis,
            yak,
            _tokenId, 
            block.timestamp
        );

        burn(msg.sender, _tokenId);

        return _yak.transfer(msg.sender, xis);
    }

    /** 
     * @dev `msg.sender` Withdraw assets from contract.
     * @param _amount Quantity to withdraw.
     * @param _addr Address of asset.
     * @return success
     */
    function withdraw(
        uint256 _amount, 
        address _addr
    ) 
        public 
        override 
        returns (bool) 
    {
        // CHECKS
        uint256 bank = _bank[msg.sender][_addr];
        require(
            bank >= _amount, 
            'Cannot withdraw amount > bal'
        );

        // INTERACTIONS 
        emit Withdrawal(
            msg.sender, 
            _amount,
            _addr,
            block.timestamp
        );

        ERC20 erc20 = ERC20(_addr);
        return erc20.transfer(msg.sender, _amount);
    }

    /** 
     * @dev Utility to update tokenId Nonce.
     * @return uint256 nonce.
     */
    function _incrementNonce() internal returns (uint256) {
        nonce = nonce.add(INCREMENT);
        return nonce;
    }
}