pragma solidity ^0.6.2;

/**
 * @title   Primitive's Pool for Writing Short Ether Puts 
 * @author  Primitive
 */


import "./PrimeInterface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

interface UniswapFactoryInterface {
    // Get Exchange and Token Info
    function getExchange(address token) external view returns (address exchange);
}

interface UniswapExchangeInterface {
    // Get Prices
    function getEthToTokenInputPrice(uint256 eth_sold) external view returns (uint256 tokens_bought);
    // Trade ETH to ERC20
    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline) external payable returns (uint256  tokens_bought);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    address public constant COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant MAX_SLIPPAGE = 92;
    uint256 public constant MIN_VOLATILITY = 10**15;
    uint256 public constant MIN_PREMIUM = 100;

    uint256 public volatility;

    // Assume oracle is compound's price proxy oracle.
    address public oracle;
    address public factory;
    address payable public weth;
    
    mapping(uint256 => address) public primes;

    event Market(address tokenP);
    event Deposit(address indexed user, uint256 inTokenU, uint256 outTokenPULP);
    event Withdraw(address indexed user, uint256 inTokenPULP, uint256 outTokenU);
    event Buy(address indexed user, uint256 inTokenS, uint256 outTokenU, uint256 premium);

    constructor (
        address payable _weth,
        address _oracle,
        address _factory,
        string memory name,
        string memory symbol
    ) 
        public
        ERC20(name, symbol)
    {
        weth = _weth;
        oracle = _oracle;
        factory = _factory;
        volatility = 100;
    }

    function addMarket(address tokenP) public onlyOwner returns (address) {
        primes[IPrime(tokenP).marketId()] = tokenP;
        emit Market(tokenP);
        return tokenP;
    }

    function kill() public onlyOwner returns (bool) {
        if(paused()) {
            _unpause();
        } else {
            _pause();
        }
        return true;
    }

    modifier valid(address tokenP) {
        require(primes[IPrime(tokenP).marketId()] == tokenP, "ERR_PRIME");
        _;
    }

    receive() external payable {
        assert(msg.sender == weth);
    }


    /* =========== MAKER FUNCTIONS =========== */


    /**
     * @dev Adds liquidity by depositing tokenU. Receives tokenPULP.
     * @param inTokenU The quantity of tokenU to deposit.
     */
    function deposit(
        uint256 inTokenU,
        address tokenP
    )
        external
        whenNotPaused
        nonReentrant
        valid(tokenP)
        returns (uint256 outTokenPULP, bool success)
    {
        // Store locally for gas savings.
        address tokenU = IPrime(tokenP).tokenU();

        // Require inTokenUs greater than 0 and the msg.sender to have the inTokenU in the params.
        require(IERC20(tokenU).balanceOf(msg.sender) >= inTokenU && inTokenU > 0, "ERR_BAL_UNDERLYING");

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(tokenP, msg.sender, inTokenU);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        (success) = IERC20(tokenU).transferFrom(msg.sender, address(this), inTokenU);
    }

    /**
     * @dev Adds liquidity by depositing ETH. Receives tokenPULP.
     * @notice Requires tokenU to be WETH.
     * msg.value is The quantity of tokenU to deposit.
     */
    function depositEth(
        address tokenP
    )
        external
        payable
        whenNotPaused
        nonReentrant
        valid(tokenP)
        returns (uint256 outTokenPULP, bool success)
    {
        // Save in memory for gas savings.
        address tokenU = IPrime(tokenP).tokenU();
        address _weth = weth;

        // To deposit ETH, tokenU needs to be WETH.
        require(tokenU == _weth, "ERR_NOT_WETH");

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(tokenU, msg.sender, msg.value);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        IWETH(_weth).deposit.value(msg.value)();
        success = true;
    }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(address tokenP, address to, uint256 inTokenU)
        private
        returns (uint256 outTokenPULP)
    {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint256 _totalSupply = totalSupply();
        (uint256 totalBalance) = totalPoolBalance(tokenP);
         
        // If liquidity is not intiialized, mint the initial liquidity and lock it by
        // minting it to this contract.
        if(_totalSupply == 0) {
            outTokenPULP = inTokenU.sub(10**4);
            _mint(address(this), 10**4);
        } else {
            outTokenPULP = inTokenU.mul(_totalSupply).div(totalBalance);
        }

        // Calculate the amount of tokenPULP to output.
        require(outTokenPULP > 0, "ERR_ZERO_LIQUIDITY");
        _mint(to, outTokenPULP);
        emit Deposit(to, inTokenU, outTokenPULP);
    }

    /**
     * @dev liquidity Provider burns their tokenPULP for proportional amount of tokenU + tokenS.
     * @notice  outTokenU = inTokenPULP * balanceU / Total Supply tokenPULP, 
     *          outTokenS = inTokenPULP * balanceR / Total Supply tokenPULP,
     *          If the pool is fully utilized and there are no strike assets to redeem,
     *          the LPs will have to wait for options to be exercised or become expired.
     * @param inTokenPULP The quantity of liquidity tokens to burn.
     * @param tokenP The address of the Prime option token.
     */
    function withdraw(
        uint256 inTokenPULP,
        address tokenP
    ) 
        external
        nonReentrant
        valid(tokenP)
        returns (uint256 outTokenU, bool success)
    {
        // Check tokenPULP balance.
        require(balanceOf(msg.sender) >= inTokenPULP && inTokenPULP > 0, "ERR_BAL_PULP");
        
        // Store Total Supply before we burn
        uint256 _totalSupply = totalSupply();

        // Get tokenU balances.
        (uint256 balanceU, uint256 totalBalance) = _removeLiquidity(tokenP, inTokenPULP);

        // outTokenU = inTokenPULP * Balance of tokenU / Total Supply of tokenPULP.
        // Checks to make sure numerator >= denominator.
        // Will revert in cases that inTokenPULP * total balance < total supply of tokenPULP.
        outTokenU = inTokenPULP.mul(totalBalance).div(_totalSupply);
        require(balanceU >= outTokenU && outTokenU > 0, "ERR_BAL_UNDERLYING");

        // Push outTokenU to msg.sender.
        emit Withdraw(msg.sender, inTokenPULP, outTokenU);
        (success) = _withdraw(IPrime(tokenP).tokenU(), msg.sender, outTokenU);
    }

    /**
     * @dev Private function to burn tokenPULP, pull tokenS, swap tokenS to tokenU, and push tokenU.
     * @notice This is a large function. It pulls tokenU from the option contract (tokenP).
     * It also swaps tokenS to tokenU using a uniswap pool.
     * @param tokenP The option contract address.
     */
    function _removeLiquidity(address tokenP, uint256 inTokenPULP)
        private
        valid(tokenP)
        returns (uint256 balanceU, uint256 totalBalance)
    {
        // Burn tokenPULP.
        _burn(msg.sender, inTokenPULP);

        // Pull tokenS into this contract.
        assert(_redeem(tokenP) > 0);

        // Push tokenS to uniswap pool and pull tokenU.
        assert(_exchange(tokenP) > 0);

        // Get the actual balance of tokenU in the pool.
        (balanceU) = totalUnutilized(tokenP);

        // Calculate total pool balance. Oustanding underwrites + balance.
        (totalBalance) = totalPoolBalance(tokenP);
    }

    /**
     * @dev Private function to push tokenR to option contract then pull tokenS.
     * @notice Should only be called when Pool cannot fill withdraw request.
     * Will revert if maxDraw is 0.
     * @param tokenP Address of Prime option contract.
     */
    function _redeem(address tokenP) private valid(tokenP) returns (uint256 outTokenR) {
        // Check how many tokenS can be pulled from PrimeOption.sol.
        (uint256 maxDraw) = IPrime(tokenP).maxDraw();
        require(maxDraw > 0, "ERR_BAL_STRIKE");

        // Push tokenR to tokenP so we can call redeem() and pull tokenS.
        (bool success) = IERC20(IPrime(tokenP).tokenR()).transfer(tokenP, maxDraw);

        // Call redeem function to pull tokenS.
        outTokenR = IPrime(tokenP).redeem(address(this));
        assert(outTokenR == maxDraw && success);
    }

    /**
     * @dev Swaps tokenS to tokenU through uniswap.
     * @notice Assumes tokenU is DAI and tokenS is WETH.
     * In future versions this can be made more modular.
     * It should be able to swap any tokenS into any tokenU.
     * This will be made possible when UniswapV2 is released.
     */
    function _exchange(address tokenP) private valid(tokenP) returns (uint256 inTokenU) {
        // Get uniswap exchange address.
        address exchange = UniswapFactoryInterface(factory).getExchange(IPrime(tokenP).tokenU());

        // Unwrap WETH in the contract.
        // Assumes WETH has already been redeemed from the Prime contract and WETH is in the pool.
        address tokenS = IPrime(tokenP).tokenS();
        assert(tokenS == weth);
        IWETH(weth).withdraw(IERC20(tokenS).balanceOf(address(this)));

        // Get price of 1 ETH denominated in tokenU from compound oracle. 1 ETH = 1e36 / oracle's price.
        // Assumes oracle never returns a value greater than 1e36.
        uint256 oraclePrice = (ONE_ETHER).mul(ONE_ETHER)
                                .div(IPrimeOracle(oracle).marketPrice(IPrime(tokenP).tokenU()));

        // Get price of 1 ETH denominated in tokenU from uniswap pool.
        uint256 uniPrice = UniswapExchangeInterface(exchange).getEthToTokenInputPrice(ONE_ETHER);

        // Calculate the max slippage price. Assumes oracle price is never < 100 wei.
        uint256 slippage = oraclePrice.div(MAX_SLIPPAGE);

        // Subtract max slippage amount from uniswap price to get min received tokenU per tokenS.
        uint256 minReceived = uniPrice.sub(slippage);

        // Store in memory for gas savings.
        uint256 outEthers = address(this).balance;

        // Swaps ETH to tokenU.
        // Amount ETH swapped = msg.value sent.
        // Min tokenU Received: Amount ETH * minRecieved / 10^18
        // Deadline = now + 3 minutes.
        inTokenU = UniswapExchangeInterface(exchange)
                        .ethToTokenSwapInput
                        .value(outEthers)(outEthers.mul(minReceived).div(ONE_ETHER), now + 3 minutes);

    }

    /**
     * @dev Private function to push assets to msg.sender. Will push ethers or tokens depending
     * on the address passed in the parameter.
     */
    function _withdraw(address token, address to, uint256 amount) private nonReentrant returns (bool) {
        if(token == weth) {
            IWETH(weth).withdraw(amount);
            return sendEther(to, amount);
        } else {
            return IERC20(token).transfer(to, amount);
        }
    }


    /* =========== TAKER FUNCTIONS =========== */


    /**
     * @dev Purchase ETH Put.
     * @notice An eth put is 200 DAI / 1 ETH. The right to swap 1 ETH (tokenS) for 200 Dai (tokenU).
     * As a user, you want to cover ETH, so you pay in ETH. Every 1 Quantity of ETH covers 200 DAI.
     * A user specifies the amount of ETH they want covered, i.e. the amount of ETH they can swap.
     * @param inTokenS The quantity of tokenS (ETH) to 'cover' with an option. Denominated in tokenS (WETH).
     * @return bool True if the msg.sender receives tokenP.
     */
    function buy(
        uint256 inTokenS,
        address tokenP
    )
        external 
        nonReentrant
        valid(tokenP)
        returns (bool)
    {
        // Store in memory for gas savings.
        (
            address tokenU, // Assume DAI.
             , // Assume ETH and we don't need it in this function.
             , // Assume tokenR and we don't need it in this function.
            uint256 base,
            uint256 price,
            uint256 expiry
        ) = IPrime(tokenP).prime();

        // Optimistically mint tokenP.

        // outTokenU = inTokenS * Quantity of tokenU (base) / Quantity of tokenS (price).
        // Units = tokenS * tokenU / tokenS = tokenU.
        uint256 outTokenU = inTokenS.mul(base).div(price); 

        // Transfer tokenU (assume DAI) to option contract using Pool funds.
        // We do this because the mint function in the Prime contract will check the balance,
        // against its previously cached balance. The difference is the amount of tokens that were
        // deposited, which determines how many Primes to mint.
        (bool transferU) = IERC20(tokenU).transfer(tokenP, outTokenU);

        // Mint Prime and Prime Redeem to this contract.
        // If outTokenU is zero because the numerator is smaller than the denominator,
        // or because the inTokenS is 0, the mint function will revert. This is because
        // the mint function only works when tokens are sent into the Prime contract.
        (uint256 inTokenP, ) = IPrime(tokenP).mint(address(this));
        
        // Calculate premium. Denominated in tokenU PER tokenS 'covered'.
        (uint256 premium) = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            volatility,
            base,
            price,
            expiry
        );

        // Calculate total premium to pay, total premium = premium per tokenS * inTokenS.
        // Units = tokenS * (tokenU / tokenS) = tokenU.
        premium = inTokenS.mul(premium).div(ONE_ETHER);
        require(premium > 0, "ERR_PREMIUM_ZERO");

        // Updates the volatility global state variable.
        volatility = calculateVolatilityProxy(tokenP);

        // Pulls payment in tokenU from msg.sender and then pushes tokenP (option).
        // WARNING: Two calls to untrusted addresses.
        require(IPrime(tokenU).balanceOf(msg.sender) >= premium, "ERR_BAL_UNDERLYING");
        emit Buy(msg.sender, inTokenS, outTokenU, premium);
        (bool received) = IPrime(tokenU).transferFrom(msg.sender, address(this), premium);
        return received && transferU && IPrime(tokenP).transfer(msg.sender, inTokenP);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 250.
     */
    function calculateVolatilityProxy(address tokenP)
        public
        view
        returns (uint256 _volatility)
    {
        (uint256 utilized) = totalUtilized(tokenP);
        uint256 totalBalance = totalPoolBalance(tokenP);
        _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if(_volatility < MIN_VOLATILITY) {
            _volatility = 250; // 250 = 25%, where 1000 = 100%.
        } else {
            _volatility = _volatility.div(MIN_VOLATILITY);
        }

    }

    /**
     * @dev Calculates the amount of utilized tokenU assets outstanding.
     */
    function totalUtilized(address tokenP)
        public
        view
        returns (uint256 utilized)
    {
        // Assume tokenR is proportional to tokenS (WETH) at a 1:1 ratio.
        // TokenR is always minted proportionally to the ratio between tokenU and tokenS (strike price).
        // Assume a ratio of 200 DAI per 1 ETH.
        // If 200 tokenU is used to mint a Prime, it will return 1 tokenR.
        // 1 tokenR * 200 (base) / 1 (price) = 200 tokenU utilized.
        // The returned value for `utilized` should always be greater than 1.
        // TokenR is redeemable to tokenS at a 1:1 ratio (1 tokenR can be redeemed for 1 WETH).
        // The utilized amount of tokenU is therefore this calculation:
        // (tokenR = tokenS = WETH) * Quantity of tokenU (base) / Quantity of tokenS (price).
        ( , , address tokenR, uint256 base, uint256 price, ) = IPrime(tokenP).prime();
        utilized = IERC20(tokenR).balanceOf(address(this)).mul(base).div(price);
    }

    /**
     * @dev Returns the contract balance of tokenU.
     */
    function totalUnutilized(address tokenP) public view returns (uint256 balanceU) {
        // The unutilized balance is equal to the balance of tokenU held by the pool.
        balanceU = IERC20(IPrime(tokenP).tokenU()).balanceOf(address(this));
    }

    /**
     * @dev Returns to total balance of tokenU that the contract has accross accounts.
     * @notice Total Balance = utilized + unutilized. Utilized = underwritten tokenU.
     */
    function totalPoolBalance(address tokenP) public view returns (uint256 totalBalance) {
        // Unutilized is the balance of tokenU in the contract. Utilized is outstanding tokenU.
        // Utilized assets are held in the Prime contract waiting to be exercised or expired.
        totalBalance = totalUnutilized(tokenP).add(totalUtilized(tokenP));
    }

    /**
     * @dev Utility function to send ethers safely.
     */
    function sendEther(address to, uint256 amount) private returns (bool) {
        (bool success, ) = to.call.value(amount)("");
        require(success, "ERR_SEND_ETHER");
        return success;
    }
}

    