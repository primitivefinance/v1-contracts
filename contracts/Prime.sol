pragma solidity ^0.6.2;

/**
 * @title   Karbon's Prime Contract
 * @notice  The core ERC721 contract that holds all Instruments.Primes.
 *          A Prime isn ERC-721 token that wraps ERC-20 assets
 *          with functions to interact with them.
 * @author  Karbon
 */


import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Full.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./Instruments.sol";


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

    event Debug(
        uint256 _return,
        bool _success
    );


    function createPrime(uint256 _xis, address _yak, uint256 _zed, address _wax, uint256 _pow, address _gem) external virtual returns (bool);
    function exercise(uint256 _tokenId) external virtual returns (bool);
    function close(uint256 _collateralId, uint256 _burnId) external virtual returns (bool);
    function withdraw(uint256 _amount, address _asset) public virtual returns (bool);
}


contract Prime is IPrime, ERC721Full, ReentrancyGuard, Ownable {
    using SafeMath for uint256;

    string constant URI = '';
    uint256 constant INCREMENT = 1;
    uint256 public nonce;

    // Map NFT IDs to Prime Struct
    mapping(uint256 => Instruments.Primes) public _primes;

    // Maps a user's withdrawable asset balance
    mapping(address => mapping(address => uint256)) private _bank;

    // Maps user addresses to Actor accounts
    mapping(address => Instruments.Actors) public _actors;


    constructor () public
        ERC721Full(
            "Prime Derivative",
            "PD"
        ) {}
    

    /* CORE FUNCTIONS */


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
    function createPrime(
        uint256 _xis,
        address _yak,
        uint256 _zed,
        address _wax,
        uint256 _pow,
        address _gem
    ) 
        external 
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
        _primes[nonce] = Instruments.Primes(
            msg.sender, 
            _xis,
            _yak, 
            _zed, 
            _wax, 
            _pow, 
            _gem
        );

        _actors[msg.sender].actor = msg.sender;
        _actors[msg.sender].mintedTokens.push(nonce);

        _bank[msg.sender][_yak] = _bank[msg.sender][_yak].add(_xis);

        // INTERACTIONS
        emit PrimeMinted(
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
     * @param _tokenId ID of Prime.
     * @return bool Success.
     */
    function exercise(
        uint256 _tokenId
    ) 
        external 
        override
        nonReentrant
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

        // Get Prime
        Instruments.Primes memory _prime = _primes[_tokenId];
        ERC20 _wax = ERC20(_prime.wax);

        require(
            _wax.balanceOf(msg.sender) >= _prime.zed, 
            'Bal cannot be < payment amount'
        );
        
        require(
            _prime.pow >= block.timestamp, 
            'Expired Prime'
        );

        // EFFECTS

        _actors[msg.sender].deactivatedTokens.push(_tokenId);

        // Original Minter has their collateral balance debited.
        _bank[_prime.ace][_prime.yak] = _bank[_prime.ace][_prime.yak].sub(_prime.xis);
        // Payment receiver has their payment balance credited.
        _bank[_prime.gem][_prime.wax] = _bank[_prime.gem][_prime.wax].add(_prime.zed);
        // Exercisor has their collateral balance credited.
        _bank[msg.sender][_prime.yak] = _bank[msg.sender][_prime.yak].add(_prime.xis);

        // INTERACTIONS

        _burn(msg.sender, _tokenId);

        emit PrimeExercised(
            msg.sender,
            _prime.xis,
            _prime.yak,
            _prime.zed,
            _prime.wax,
            _tokenId, 
            block.timestamp
        );
        
        return _wax.transferFrom(msg.sender, address(this), _prime.zed);
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
        // CHECKS
        require(
            balanceOf(msg.sender) >= 1, 
            'Cannot send Prime amount > bal'
        );

        require(
            ownerOf(_burnId) == msg.sender, 
            'Owner of Prime is not sender'
        );


        // Get Prime that will get Burned
        Instruments.Primes memory _burnPrime = _primes[_burnId];
        ERC20 _yakBurn = ERC20(_burnPrime.yak);

        // Msg.sender burns a Prime that they did not mint.
        // Prime properties need to match, else the tx reverts.
        
        bool burn = _primeCompare(_collateralId, _burnId);
        require(
            burn,
            'Prime Properties do not match'
        );

        require(
            _bank[msg.sender][_burnPrime.yak] > 0, 
            'User has no collateral to claim'
        );

        require(
            _burnPrime.pow >= block.timestamp, 
            'Expired Prime'
        );

        // EFFECTS

        _actors[msg.sender].deactivatedTokens.push(_burnId);

        // Minter's collateral is debited.
        _bank[msg.sender][_burnPrime.yak] = _bank[msg.sender][_burnPrime.yak].sub(_burnPrime.xis);

        // INTERACTIONS
        emit PrimeClosed(
            msg.sender, 
            _burnPrime.xis,
            _burnPrime.yak,
            _burnId, 
            block.timestamp
        );

        _burn(msg.sender, _burnId);

        return _yakBurn.transfer(msg.sender, _burnPrime.xis);
    }

    /** 
     * @dev `msg.sender` Withdraw assets from contract.
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
        nonReentrant
        returns (bool) 
    {
        // CHECKS
        uint256 bank = _bank[msg.sender][_asset];
        require(
            bank >= _amount, 
            'Cannot withdraw amount > bal'
        );

        // EFFECTS

        // User's account is debited
        _bank[msg.sender][_asset] = bank.sub(_amount);

        // INTERACTIONS 
        emit Withdrawal(
            msg.sender, 
            _amount,
            _asset,
            block.timestamp
        );

        ERC20 erc20 = ERC20(_asset);
        return erc20.transfer(msg.sender, _amount);
    }


    /* UTILITY FUNCTIONS */


    /** 
     * @dev Utility to update tokenId Nonce.
     * @return uint256 nonce.
     */
    function _incrementNonce() internal returns (uint256) {
        nonce = nonce.add(INCREMENT);
        return nonce;
    }

    /** 
     * @dev Utility to compare hashes of Prime properties.
     * @return burn bool of whether Instruments.Primes match.
     */
    function _primeCompare(
        uint256 _collateralId,
        uint256 _burnId
    ) 
        internal 
        view 
        returns
        (bool burn)
    {
        Instruments.Primes memory _collateralPrime = _primes[_collateralId];
        Instruments.Primes memory _burnPrime = _primes[_burnId];

        bytes32 hashCollateral = keccak256(
            abi.encodePacked(
                _collateralPrime.xis,
                _collateralPrime.yak,
                _collateralPrime.zed,
                _collateralPrime.wax,
                _collateralPrime.pow
            )
        );

        bytes32 hashBurn = keccak256(
            abi.encodePacked(
                _burnPrime.xis,
                _burnPrime.yak,
                _burnPrime.zed,
                _burnPrime.wax,
                _burnPrime.pow
            )
        );

        if(hashCollateral == hashBurn) {
            return true;
        } else {
            revert('Prime Properties do not match');
        }
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
            address gem
        ) {
            Instruments.Primes memory _prime = _primes[_tokenId];
            return (
                _prime.ace,
                _prime.xis,
                _prime.yak,
                _prime.zed,
                _prime.wax,
                _prime.pow,
                _prime.gem
            );
    }

    /** 
     * @dev Public view function to get the Bank's balance of a User
     */
    function getBalance(address _user, address _asset) public view returns (
        uint256
        ) {
            return _bank[_user][_asset];
    }

    /** 
     * @dev Public view function to Actor properties
     */
    function getActor(address _user) external view returns (
        address actor,
        uint[] memory mintedTokens,
        uint[] memory deactivatedTokens
        ) {
            Instruments.Actors memory _actor = _actors[_user];
            return (
                _actor.actor,
                _actor.mintedTokens,
                _actor.deactivatedTokens
            );
    }
}