pragma solidity ^0.6.2;

/**
 * @title   ERC-20 Vanilla Option Primitive
 * @author  Primitive
 */

import "./Primitives.sol";
import "./interfaces/IPrime.sol";
import "./interfaces/IPrimeRedeem.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract PrimeOption is IPrime, ERC20, ReentrancyGuard, Pausable {
    using SafeMath for uint;

    Primitives.Option public option;

    uint public override cacheU;
    uint public override cacheS;
    address public override factory;
    address public override tokenR;

    event Mint(address indexed from, uint outTokenP, uint outTokenR);
    event Swap(address indexed from, uint outTokenU, uint inTokenS);
    event Redeem(address indexed from, uint inTokenR);
    event Close(address indexed from, uint inTokenP);
    event Fund(uint cacheU, uint cacheS);

    constructor (
        address tokenU,
        address tokenS,
        uint base,
        uint price,
        uint expiry
    )
        public
        ERC20("Primitive V1 Vanilla Option", "PRIME")
    {
        factory = msg.sender;
        option = Primitives.Option(
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );
    }

    modifier notExpired {
        require(option.expiry >= block.timestamp, "ERR_EXPIRED");
        _;
    }

    // Called by factory on deployment once.
    function initTokenR(address _tokenR) public {
        require(msg.sender == factory, "ERR_NOT_OWNER");
        tokenR = _tokenR;
    }

    function kill() public {
        require(msg.sender == factory, "ERR_NOT_OWNER");
        paused() ? _unpause() : _pause();
    }

    /* === ACCOUNTING === */

    /**
     * @dev Updates the cached balances to the actual current balances.
     */
    function update() external nonReentrant {
        _fund(
            IERC20(option.tokenU).balanceOf(address(this)),
            IERC20(option.tokenS).balanceOf(address(this))
        );
    }

    /**
     * @dev Difference between balances and caches is sent out so balances == caches.
     * Fixes tokenU, tokenS, tokenR, and tokenP balances.
     */
    function take() external nonReentrant {
        (address _tokenU, address _tokenS, address _tokenR) = getTokens();
        IERC20(_tokenU).transfer(
            msg.sender, IERC20(_tokenU).balanceOf(address(this)).sub(cacheU)
        );
        IERC20(_tokenS).transfer(
            msg.sender, IERC20(_tokenS).balanceOf(address(this)).sub(cacheS)
        );
        IERC20(_tokenR).transfer(
            msg.sender, IERC20(_tokenR).balanceOf(address(this))
        );
        IERC20(address(this)).transfer(
            msg.sender, IERC20(address(this)).balanceOf(address(this))
        );
    }

    /**
     * @dev Sets the cache balances to new values.
     */
    function _fund(uint balanceU, uint balanceS) private {
        cacheU = balanceU;
        cacheS = balanceS;
        emit Fund(balanceU, balanceS);
    }

    /* === FUNCTIONS === */

    /**
     * @dev Core function to mint new Prime ERC-20 Options.
     * @notice inTokenU = outTokenP, inTokenU * ratio = outTokenR
     * Checks the balance of the contract against the token's 'cache',
     * The difference is the amount of tokenU sent into the contract.
     * The difference determines how many Primes and Redeems to mint.
     * Only callable when the option is not expired.
     * @param receiver The newly minted tokens are sent to the receiver address.
     */
    function mint(address receiver)
        external
        override
        nonReentrant
        notExpired
        whenNotPaused
        returns (uint inTokenU, uint outTokenR)
    {
        // Save on gas.
        uint balanceU = IERC20(option.tokenU).balanceOf(address(this));
        uint base = option.base;
        uint price = option.price;

        // Mint inTokenU equal to the difference between current and cached balance of tokenU.
        inTokenU = balanceU.sub(cacheU);

        // Make sure outToken is not 0.
        require(inTokenU.mul(price) >= base, "ERR_ZERO");

        // Mint outTokenR equal to tokenU * ratio FIX - FURTHER CHECKS
        outTokenR = inTokenU.mul(price).div(base);

        // Mint the tokens.
        IPrimeRedeem(tokenR).mint(receiver, outTokenR);
        _mint(receiver, inTokenU);

        // Update the caches.
        _fund(balanceU, cacheS);
        emit Mint(receiver, inTokenU, outTokenR);
    }

    /**
     * @dev Swap tokenS to tokenU at a rate of tokenS / ratio = tokenU.
     * @notice inTokenS / ratio = outTokenU && inTokenP >= outTokenU
     * Checks the balance against the previously cached balance.
     * The difference is the amount of tokenS sent into the contract.
     * The difference determines how much tokenU to send out.
     * Only callable when the option is not expired.
     * @param receiver The outTokenU is sent to the receiver address.
     */
    function swap(address receiver)
        external
        override
        nonReentrant
        notExpired
        whenNotPaused
        returns (uint inTokenS, uint inTokenP, uint outTokenU)
    {
        // Stores addresses in memory for gas savings.
        address _tokenU = option.tokenU;
        address _tokenS = option.tokenS;

        // Current balances.
        uint balanceS = IERC20(_tokenS).balanceOf(address(this));
        uint balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint balanceP = balanceOf(address(this));

        // Differences between tokenS balance less cache.
        inTokenS = balanceS.sub(cacheS);

        // Assumes the cached balance is 0.
        // This is because the close function burns the Primes received.
        // Only external transfers will be able to send Primes to this contract.
        // Close() and swap() are the only function that check for the Primes balance.
        inTokenP = balanceP;

        // inTokenS / ratio = outTokenU
        outTokenU = inTokenS.mul(option.base).div(option.price); // FIX

        require(inTokenS > 0 && inTokenP > 0, "ERR_ZERO");
        require(
            inTokenP >= outTokenU &&
            balanceU >= outTokenU,
            "ERR_BAL_UNDERLYING"
        );

        // Burn the Prime options at a 1:1 ratio to outTokenU.
        _burn(address(this), inTokenP);

        // Transfer the swapped tokenU to receiver.
        require(
            IERC20(_tokenU).transfer(receiver, outTokenU),
            "ERR_TRANSFER_OUT_FAIL"
        );

        // Current balances.
        balanceS = IERC20(_tokenS).balanceOf(address(this));
        balanceU = IERC20(_tokenU).balanceOf(address(this));

        // Update the cached balances.
        _fund(balanceU, balanceS);
        emit Swap(receiver, outTokenU, inTokenS);
    }

    /**
     * @dev Burns tokenR to withdraw tokenS at a ratio of 1:1.
     * @notice inTokenR = outTokenS
     * Should only be called by a contract that checks the balanaces to be sent correctly.
     * Checks the tokenR balance against the previously cached tokenR balance.
     * The difference is the amount of tokenR sent into the contract.
     * The difference is equal to the amount of tokenS sent out.
     * Callable even when expired.
     * @param receiver The inTokenR quantity of tokenS is sent to the receiver address.
     */
    function redeem(address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR)
    {
        address _tokenS = option.tokenS;
        address _tokenR = tokenR;

        // Current balances.
        uint balanceS = IERC20(_tokenS).balanceOf(address(this));
        uint balanceR = IERC20(_tokenR).balanceOf(address(this));

        // Difference between tokenR balance and cache.
        inTokenR = balanceR;
        require(inTokenR > 0, "ERR_ZERO");
        require(balanceS >= inTokenR, "ERR_BAL_STRIKE");

        // Burn tokenR in the contract. Send tokenS to msg.sender.
        require(
            IPrimeRedeem(_tokenR).burn(address(this), inTokenR) &&
            IERC20(_tokenS).transfer(receiver, inTokenR),
            "ERR_TRANSFER_OUT_FAIL"
        );

        // Current balances.
        balanceS = IERC20(_tokenS).balanceOf(address(this));
        balanceR = IERC20(_tokenR).balanceOf(address(this));

        // Update the cached balances.
        _fund(cacheU, balanceS);
        emit Redeem(receiver, inTokenR);
    }

    /**
     * @dev Burn Prime and Prime Redeem tokens to withdraw tokenU.
     * @notice inTokenR / ratio = outTokenU && inTokenP >= outTokenU
     * Checks the balances against the previously cached balances.
     * The difference between the tokenR balance and cache is the inTokenR.
     * The balance of tokenP is equal to the inTokenP.
     * The outTokenU is equal to the inTokenR / ratio.
     * The contract requires the inTokenP >= outTokenU and the balanceU >= outTokenU.
     * The contract burns the inTokenR and inTokenP amounts.
     * @param receiver The outTokenU is sent to the receiver address.
     */
    function close(address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR, uint inTokenP, uint outTokenU)
    {
        // Stores addresses locally for gas savings.
        address _tokenU = option.tokenU;
        address _tokenR = tokenR;

        // Current balances.
        uint balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint balanceR = IERC20(_tokenR).balanceOf(address(this));
        uint balanceP = balanceOf(address(this));

        // Differences between current and cached balances.
        inTokenR = balanceR;

        // The quantity of tokenU to send out it still determined by the amount of inTokenR.
        // This outTokenU amount is checked against inTokenP.
        // inTokenP must be greater than or equal to outTokenU.
        // balanceP must be greater than or equal to outTokenU.
        // Neither inTokenR or inTokenP can be zero.
        outTokenU = inTokenR.mul(option.base).div(option.price);

        // Assumes the cached balance is 0.
        // This is because the close function burns the Primes received.
        // Only external transfers will be able to send Primes to this contract.
        // Close() and swap() are the only function that check for the Primes balance.
        // If option is expired, tokenP does not need to be sent in. Only tokenR.
        inTokenP = option.expiry > block.timestamp ? balanceP : outTokenU;

        require(inTokenR > 0 && inTokenP > 0, "ERR_ZERO");
        require(inTokenP >= outTokenU && balanceU >= outTokenU, "ERR_BAL_UNDERLYING");

        // Burn inTokenR and inTokenP.
        if(option.expiry > block.timestamp) {
            _burn(address(this), inTokenP);
        }

        // Send outTokenU to user.
        // User does not receive extra tokenU if there was extra tokenP in the contract.
        // User receives outTokenU proportional to inTokenR.
        // Amount of inTokenP must be greater than outTokenU.
        // If tokenP was sent to the contract from an external call,
        // a user could send only tokenR and receive the proportional amount of tokenU,
        // as long as the amount of outTokenU is less than or equal to
        // the balance of tokenU and tokenP.
        require(
            IPrimeRedeem(_tokenR).burn(address(this), inTokenR) &&
            IERC20(_tokenU).transfer(receiver, outTokenU),
            "ERR_TRANSFER_OUT_FAIL"
        );

        // Current balances of tokenU and tokenR.
        balanceU = IERC20(_tokenU).balanceOf(address(this));
        balanceR = IERC20(_tokenR).balanceOf(address(this));

        // Update the cached balances.
        _fund(balanceU, cacheS);
        emit Close(receiver, outTokenU);
    }
    
    /* === VIEW === */
    function getCaches() public view override returns (uint _cacheU, uint _cacheS) {
        _cacheU = cacheU;
        _cacheS = cacheS;
    }

    function getTokens() public view override returns (
        address _tokenU, address _tokenS, address _tokenR
    ) {
        _tokenU = option.tokenU;
        _tokenS = option.tokenS;
        _tokenR = tokenR;
    }

    function tokenS() public view override returns (address) { return option.tokenS; }
    function tokenU() public view override returns (address) { return option.tokenU;}
    function base() public view override returns (uint) { return option.base; }
    function price() public view override returns (uint) { return option.price; }
    function expiry() public view override returns (uint) { return option.expiry; }

    function prime() public view override returns (
            address _tokenU,
            address _tokenS,
            address _tokenR,
            uint _base,
            uint _price,
            uint _expiry
        )
    {
        Primitives.Option memory _prime = option;
        _tokenU = _prime.tokenU;
        _tokenS = _prime.tokenS;
        _tokenR = tokenR;
        _base = _prime.base;
        _price = _prime.price;
        _expiry = _prime.expiry;
    }

    /**
     * @dev Utility function to get the max withdrawable tokenS amount of msg.sender.
     */
    function maxDraw() public view override returns (uint draw) {
        uint balanceR = IERC20(tokenR).balanceOf(msg.sender);
        draw = cacheS > balanceR ? balanceR : cacheS;
    }
}