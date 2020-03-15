pragma solidity ^0.6.2;

/**
 * @title Carbon's Prime Contract
 * @notice The core ERC721 contract that holds all Slates. 
 *         A Prime is two-party contract. A Slate is an NFT with the properties of the contract.
 * @author Carbon
 */


import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";


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

    event Debug(
        uint256 _return,
        bool _success
    );


    function createSlate(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) public virtual returns (bool);
    function exercise(uint256 _tokenId) public virtual returns (bool);
    function withdraw(uint256 _amount, address _addr) public virtual returns (bool);
    function close(uint256 _collateralId, uint256 _burnId) public virtual returns (bool);
}


contract Prime is IPrime, ERC721Full {
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
    address public _controller;

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
        ERC721Full(
            "Prime Derivative",
            "PD"
        )
    {
        _controller = msg.sender;
    }

    /** 
     * @dev `msg.sender` Deposits asset x, mints new Slate.
     * @param _xis Amount of collateral to deposit.
     * @param _yak Address of collateral asset.
     * @param _zed Amount of payment asset.
     * @param _wax Payment asset address.
     * @param _pow Expiry timestamp.
     * @param _gem Receiver address.
     * @return bool Success.
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
        require(
            yak.balanceOf(msg.sender) >= _xis, 
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

        _safeMint(
            msg.sender, 
            nonce
        );

        return yak.transferFrom(msg.sender, address(this), _xis);
    }

    /** 
     * @dev `msg.sender` Exercises right to purchase collateral.
     * @param _tokenId ID of Slate.
     * @return bool Success.
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

        // Get Slate
        Slates memory _slate = _slates[_tokenId];
        ERC20 _yak = ERC20(_slate.yak);
        ERC20 _wax = ERC20(_slate.wax);

        require(
            _wax.balanceOf(msg.sender) >= _slate.zed, 
            'Bal cannot be < payment amount'
        );
        
        require(
            _slate.pow >= block.timestamp, 
            'Expired Slate'
        );

        // EFFECTS
        require(
            _wax.transferFrom(msg.sender, address(this), _slate.zed), 
            'Payment not transferred'
        );

        // Depositor cannot withdraw collateral x.
        _bank[_slate.ace][_slate.yak] = 0;
        // Payment receiver can withdraw payment z.
        _bank[_slate.gem][_slate.wax] = _slate.zed;
        // Payer can withdraw collateral x.
        _bank[msg.sender][_slate.yak] = _slate.xis;

        // INTERACTIONS
        emit SlateExercised(
            msg.sender,
            _slate.xis,
            _slate.yak,
            _slate.zed,
            _slate.wax,
            _tokenId, 
            block.timestamp
        );
        _burn(msg.sender, _tokenId);
        return true;
    }

    /** 
     * @dev `msg.sender` Closes Slate and 
     * can withdraw collateral as Slate minter.
     * Msg.sender can burn any Slate NFT 
     * that has matching properties when compared
     * to their minted Slate NFT. This way, 
     * they can sell their Minted Slate, and if
     * they need to close the position, 
     * they can buy another Slate rather than track down 
     * the exact one they sold/traded away. 
     * @param _collateralId Slate NFT ID with Minter's collateral.
     * @param _burnId Slate NFT ID that Minter owns,
     *  and intends to burn to withdraw collateral.
     * @return bool Success.
     */
    function close(
        uint256 _collateralId,
        uint256 _burnId
    ) 
        public 
        override 
        returns (bool) 
    {
        // CHECKS
        require(
            balanceOf(msg.sender) >= 1, 
            'Cannot send Slate amount > bal'
        );

        require(
            ownerOf(_burnId) == msg.sender, 
            'Owner of Slate is not sender'
        );

        // Get Minter of Collateral Slate
        Slates memory _collateralSlate = _slates[_collateralId];

        // Get Burn Slate
        Slates memory _burnSlate = _slates[_burnId];
        ERC20 _yakBurn = ERC20(_burnSlate.yak);

        // Msg.sender burns a Slate that they did not mint.
        // Slate properties need to match, else the tx reverts.
        if(_collateralSlate.ace != _burnSlate.ace) {
            bool burn = _slateCompare(_collateralId, _burnId);

            require(
                burn,
                'Slate props do not match'
            );
        }

        require(
            _bank[msg.sender][_burnSlate.yak] > 0, 
            'User has no collateral to claim'
        );

        require(
            _burnSlate.pow >= block.timestamp, 
            'Expired Slate'
        );

        // EFFECTS
        _bank[msg.sender][_burnSlate.yak] = 0;

        // INTERACTIONS
        emit SlateClosed(
            msg.sender, 
            _burnSlate.xis,
            _burnSlate.yak,
            _burnId, 
            block.timestamp
        );

        _burn(msg.sender, _burnId);

        return _yakBurn.transfer(msg.sender, _burnSlate.xis);
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

    /** 
     * @dev Utility to compare hashes of Slate properties.
     * @return burn Whether Slates match.
     */
    function _slateCompare(
        uint256 _collateralId,
        uint256 _burnId
    ) 
        internal 
        view 
        returns
        (bool burn)
    {
        Slates memory _collateralSlate = _slates[_collateralId];
        Slates memory _burnSlate = _slates[_burnId];

        bytes32 hashCollateral = keccak256(
            abi.encodePacked(
                _collateralSlate.xis,
                _collateralSlate.yak,
                _collateralSlate.zed,
                _collateralSlate.wax,
                _collateralSlate.pow
            )
        );

        bytes32 hashBurn = keccak256(
            abi.encodePacked(
                _burnSlate.xis,
                _burnSlate.yak,
                _burnSlate.zed,
                _burnSlate.wax,
                _burnSlate.pow
            )
        );

        if(hashCollateral == hashBurn) {
            return true;
        } else {
            revert();
        }
    }

    /** 
     * @dev Public view function to get Slate properties.
     */
    function getSlate(uint256 _tokenId) public view returns (
            address ace,
            uint256 xis,
            address yak,
            uint256 zed,
            address wax,
            uint256 pow,
            address gem
        ) {
            Slates memory _slate = _slates[_tokenId];
            return (
                _slate.ace,
                _slate.xis,
                _slate.yak,
                _slate.zed,
                _slate.wax,
                _slate.pow,
                _slate.gem
            );
    }
}