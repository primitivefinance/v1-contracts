pragma solidity ^0.6.2;

/**
 * @title   ERC-20 Vanilla Option Primitive
 * @author  Primitive
 */

import "../../Primitives.sol";
import "../interfaces/IOption.sol";
import "../interfaces/IRedeem.sol";
import "../interfaces/IFlash.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract Option is IOption, ERC20, ReentrancyGuard, Pausable {
    using SafeMath for uint;

    Primitives.Option public option;

    uint public override constant FEE = 1000;
    uint public override cacheU;
    uint public override cacheS;
    address public override tokenR;
    address public override factory;

    event Mint(address indexed from, uint outTokenP, uint outTokenR);
    event Exercise(address indexed from, uint outTokenU, uint inTokenS);
    event Redeem(address indexed from, uint inTokenR);
    event Close(address indexed from, uint inTokenP);
    event Fund(uint cacheU, uint cacheS);
    constructor() ERC20("Primitive V1 Vanilla Option", "OPTION") public {}
    function initialize (
        address tokenU,
        address tokenS,
        uint base,
        uint quote,
        uint expiry
    )
        public 
    {
        require(factory == address(0x0), "already initialized");
        factory = msg.sender;
        option = Primitives.Option(
            tokenU,
            tokenS,
            base,
            quote,
            expiry
        );
    }

    modifier notExpired {
        require(option.expiry >= block.timestamp, "ERR_EXPIRED");
        _;
    }

    function initTokenR(address _tokenR) external override {
        require(msg.sender == factory, "ERR_NOT_OWNER");
        tokenR = _tokenR;
    }

    function kill() external {
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
     * @dev Mints options at a 1:1 ratio to underlying token deposits.
     * @notice inTokenU = outTokenP, inTokenU / strike ratio = outTokenR.
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
        uint quote = option.quote;

        // Mint inTokenU equal to the difference between current and cached balance of tokenU.
        inTokenU = balanceU.sub(cacheU);
        outTokenR = inTokenU.mul(quote).div(base);
        require(outTokenR > 0, "ERR_ZERO");

        // Mint the tokens.
        IRedeem(tokenR).mint(receiver, outTokenR);
        _mint(receiver, inTokenU);

        // Update the caches.
        _fund(balanceU, cacheS);
        emit Mint(receiver, inTokenU, outTokenR);
    }

    /**
     * @dev Sends out underlying tokens then checks to make sure they are returned or paid for.
     * @notice If the underlying tokens are returned, only the fee has to be paid.
     * @param receiver The outTokenU is sent to the receiver address.
     * @param outTokenU Quantity of underlyings to transfer to receiver optimistically.
     * @param data Passing in any abritrary data will trigger the flash callback function.
     */
    function exercise(address receiver, uint outTokenU, bytes calldata data)
        external
        override
        nonReentrant
        notExpired
        whenNotPaused
        returns (uint inTokenS, uint inTokenP)
    {
        // Store the cached balances and token addresses in memory.
        address _tokenU = option.tokenU;
        (uint _cacheU, uint _cacheS) = getCaches();

        // Require outTokenU > 0, and cacheU > outTokenU.
        require(outTokenU > 0, "ERR_ZERO");
        require(IERC20(_tokenU).balanceOf(address(this)) >= outTokenU, "ERR_BAL_UNDERLYING");

        // Optimistically transfer out tokenU.
        IERC20(_tokenU).transfer(receiver, outTokenU);
        if (data.length > 0) IFlash(receiver).primitiveFlash(receiver, outTokenU, data);

        // Store in memory for gas savings.
        uint balanceS = IERC20(option.tokenS).balanceOf(address(this));
        uint balanceU = IERC20(_tokenU).balanceOf(address(this));

        // Calculate the Differences.
        inTokenS = balanceS.sub(_cacheS);
        uint inTokenU = balanceU.sub(_cacheU.sub(outTokenU)); // will be > 0 if tokenU returned.
        require(inTokenS > 0 || inTokenU > 0, "ERR_ZERO");

        // Add the fee to the total required payment.
        //outTokenU = outTokenU.add(outTokenU.div(FEE));

        uint feeToPay = outTokenU.div(FEE);

        // Calculate the remaining amount of tokenU that needs to be paid for.
        uint remainder = inTokenU > outTokenU ? 0 : outTokenU.sub(inTokenU);

        // Calculate the expected payment of tokenS.
        uint payment = remainder.add(feeToPay).mul(option.quote).div(option.base);

        // Assumes the cached tokenP balance is 0.
        inTokenP = balanceOf(address(this));

        // Enforce the invariants.
        require(inTokenS >= payment && inTokenP >= remainder, "ERR_BAL_INPUT");

        // Burn the  options at a 1:1 ratio to outTokenU.
        _burn(address(this), inTokenP);

        // Update the cached balances.
        _fund(balanceU, balanceS);
        emit Exercise(receiver, outTokenU, inTokenS);
    }

    /**
     * @dev Burns tokenR to withdraw tokenS at a ratio of 1:1.
     * @notice inTokenR = outTokenS. Only callable when strike tokens are in the contract.
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
        uint balanceS = IERC20(_tokenS).balanceOf(address(this));
        uint balanceR = IERC20(_tokenR).balanceOf(address(this));

        // Difference between tokenR balance and cache.
        inTokenR = balanceR;
        require(inTokenR > 0, "ERR_ZERO");
        require(balanceS >= inTokenR, "ERR_BAL_STRIKE");

        // Burn tokenR in the contract. Send tokenS to msg.sender.
        IRedeem(_tokenR).burn(address(this), inTokenR);
        require(
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
     * @dev Burn  and  Redeem tokens to withdraw underlying tokens.
     * @notice inTokenR / ratio = outTokenU && inTokenP >= outTokenU.
     * @param receiver The outTokenU is sent to the receiver address.
     */
    function close(address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR, uint inTokenP, uint outTokenU)
    {
        // Stores addresses and balances locally for gas savings.
        address _tokenU = option.tokenU;
        address _tokenR = tokenR;
        uint balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint balanceR = IERC20(_tokenR).balanceOf(address(this));
        uint balanceP = balanceOf(address(this));

        // Differences between current and cached balances.
        inTokenR = balanceR;

        // The quantity of tokenU to send out it still determined by the amount of inTokenR.
        // inTokenR is in units of strike tokens, which is converted to underlying tokens
        // by multiplying inTokenR by the strike ratio: base / quote.
        // This outTokenU amount is checked against inTokenP.
        // inTokenP must be greater than or equal to outTokenU.
        // balanceP must be greater than or equal to outTokenU.
        // Neither inTokenR or inTokenP can be zero.
        outTokenU = inTokenR.mul(option.base).div(option.quote);

        // Assumes the cached balance is 0 so inTokenP = balance of tokenP.
        // If option is expired, tokenP does not need to be sent in. Only tokenR.
        inTokenP = option.expiry > block.timestamp ? balanceP : outTokenU;
        require(inTokenR > 0 && inTokenP > 0, "ERR_ZERO");
        require(inTokenP >= outTokenU && balanceU >= outTokenU, "ERR_BAL_UNDERLYING");

        // Burn  tokens.  tokens are only sent into contract when not expired.
        if(option.expiry > block.timestamp) {
            _burn(address(this), inTokenP);
        }

        // Send underlying tokens to user.
        // Burn tokenR held in the contract.
        // User does not receive extra tokenU if there was extra tokenP in the contract.
        // User receives outTokenU proportional to inTokenR.
        IRedeem(_tokenR).burn(address(this), inTokenR);
        require(
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
    function quote() public view override returns (uint) { return option.quote; }
    function expiry() public view override returns (uint) { return option.expiry; }

    function getOption() public view override returns (
            address _tokenU,
            address _tokenS,
            address _tokenR,
            uint _base,
            uint _quote,
            uint _expiry
        )
    {
        Primitives.Option memory _option = option;
        _tokenU = _option.tokenU;
        _tokenS = _option.tokenS;
        _tokenR = tokenR;
        _base = _option.base;
        _quote = _option.quote;
        _expiry = _option.expiry;
    }
}
