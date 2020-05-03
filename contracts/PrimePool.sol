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

interface PriceOracleProxy {
    function getUnderlyingPrice(address cToken) external view returns (uint);
}

contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    address public COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant MAX_SLIPPAGE = 92;
    uint256 public constant MIN_VOLATILITY = 10**15;

    uint256 public volatility;

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
     * @param amount The quantity of tokenU to deposit.
     */
    function deposit(
        uint256 amount,
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
        require(IERC20(tokenU).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_UNDERLYING");

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(tokenU, msg.sender, amount);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        (success) = IERC20(tokenU).transferFrom(msg.sender, address(this), amount);
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
        // To deposit ETH, tokenU needs to be WETH.
        require(tokenU == weth, "ERR_NOT_WETH");

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(tokenU, msg.sender, msg.value);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        IWETH(weth).deposit.value(msg.value)();
        success = true;
    }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(address tokenU, address to, uint256 amount)
        private
        returns (uint256 outTokenPULP)
    {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint256 balanceU = IERC20(tokenU).balanceOf(address(this));
        uint256 _totalSupply = totalSupply();
         
        // If liquidity is not intiialized, mint the initial liquidity and lock it by
        // minting it to this contract.
        if(_totalSupply == 0) {
            outTokenPULP = amount.sub(10**4);
            _mint(address(this), 10**4);
        } else {
            outTokenPULP = amount.mul(_totalSupply).div(balanceU);
        }

        // Calculate the amount of tokenPULP to output.
        require(outTokenPULP > 0, "ERR_ZERO_LIQUIDITY");
        _mint(to, outTokenPULP);
        emit Deposit(to, amount, outTokenPULP);
    }

    /**
     * @dev liquidity Provider burns their tokenPULP for proportional amount of tokenU + tokenS.
     * @notice  outTokenU = inTokenPULP * balanceU / Total Supply tokenPULP, 
     *          outTokenS = inTokenPULP * balanceR / Total Supply tokenPULP,
     *          If the pool is fully utilized and there are no strike assets to redeem,
     *          the LPs will have to wait for options to be exercised or become expired.
     * @param amount The quantity of liquidity tokens to burn.
     * @param tokenP The address of the Prime option token.
     * @return bool True if liquidity tokens were burned, and both tokenU + tokenS were sent to user.
     */
    function withdraw(
        uint256 amount,
        address tokenP
    ) 
        external
        nonReentrant
        valid(tokenP)
        returns (uint256 outTokenU, bool success)
    {
        // Check tokenPULP balance.
        require(balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_PULP");
        
        // Store Total Supply before we burn
        uint256 _totalSupply = totalSupply();

        // Burn tokenPULP.
        _burn(msg.sender, amount);

        // Get tokenU balances.
        (uint256 balanceU, uint256 totalBalance) = _totalBalances(tokenP);

        // outTokenU = inTokenPULP * Balance of tokenU / Total Supply of tokenPULP.
        // Checks to make sure numerator >= denominator.
        // Will revert in cases that amount * total balance < total supply of tokenPULP.
        outTokenU = amount.mul(totalBalance).div(_totalSupply);
        require(balanceU >= outTokenU && outTokenU > 0, "ERR_BAL_UNDERLYING");

        // Send outTokenU to msg.sender.
        emit Withdraw(msg.sender, amount, outTokenU);
        (success) = _settle(IPrime(tokenP).tokenU(), msg.sender, outTokenU);
    }

    /**
     * @dev Private function to get the current and total tokenU balances.
     * @notice This is a large function. It pulls tokenU from the option contract (tokenP).
     * It also swaps tokenS to tokenU using a uniswap pool.
     * @param tokenP The option contract address.
     */
    function _totalBalances(address tokenP)
        private
        valid(tokenP)
        returns (uint256 balanceU, uint256 totalBalance)
    {
        // Store locally for gas savings.
        (
            address tokenU, // underlying asset of tokenP.
            address tokenS, // strike asset of tokenS.
            address tokenR, // redeem token for tokenP.
            uint256 base, // quantity of underlying asset.
            uint256 price // quantity of strike asset.
             , // expiry is missing, we don't need it.
        ) = IPrime(tokenP).prime();

        // Pull tokenS into this contract.
        assert(_redeem(tokenP, tokenR) > 0);

        // Push tokenS to uniswap pool and pull tokenU.
        assert(_exchange(tokenP, tokenU, tokenS) > 0);

        // Store balance of tokenU in memory for gas savings.
        balanceU = IERC20(tokenU).balanceOf(address(this));

        // Calculate total pool balance. Oustanding underwrites + Assets.
        totalBalance = balanceU.add(
                poolUtilized(
                    tokenR,
                    base,
                    price
                )
        );
    }

    /**
     * @dev Private function to push tokenR to option contract then pull tokenS.
     * @notice Should only be called when Pool cannot fill withdraw request.
     * Will revert if maxDraw is 0.
     * @param tokenP Address of Prime option contract.
     */
    function _redeem(address tokenP, address tokenR) private valid(tokenP) returns (uint256 outTokenR) {
        // Check how many tokenS can be pulled from PrimeOption.sol.
        (uint256 maxDraw) = IPrime(tokenP).maxDraw();
        require(maxDraw > 0, "ERR_BAL_STRIKE");

        // Push tokenR to tokenP so we can call redeem() and pull tokenS.
        (bool success) = IERC20(tokenR).transfer(tokenP, maxDraw);

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
    function _exchange(address tokenP, address tokenU, address tokenS) private valid(tokenP) returns (uint256 inTokenU) {
        // Get uniswap exchange address.
        address exchange = UniswapFactoryInterface(factory).getExchange(tokenU);

        // Unwrap WETH in the contract.
        // Assumes WETH has already been redeemed from the Prime contract and WETH is in the pool.
        assert(tokenS == weth);
        IWETH(weth).withdraw(IERC20(tokenS).balanceOf(address(this)));

        // Get price of 1 ETH denominated in tokenU from compound oracle. 1 ETH = 1e36 / oracle's price.
        // Assumes oracle never returns a value greater than 1e36.
        uint256 oraclePrice = (ONE_ETHER).mul(ONE_ETHER)
                                .div(PriceOracleProxy(oracle).getUnderlyingPrice(COMPOUND_DAI));

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
     * @dev Private function to push assets to msg.sender. Will push ethers or tokens depending,
     * on the address passed in the parameter.
     */
    function _settle(address token, address to, uint256 amount) private nonReentrant returns (bool) {
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
     * @param amount The quantity of tokenS (ETH) to 'cover' with an option. Denominated in tokenS (WETH).
     * @return bool True if the msg.sender receives tokenP.
     */
    function buy(
        uint256 amount,
        address tokenP
    )
        external 
        payable
        nonReentrant
        valid(tokenP)
        returns (bool)
    {
        // Store locally for gas savings.
        (
            address _tokenU, // Assume DAI
            address _tokenS, // Assume ETH
            address _tokenR, // Assume Redeemable for DAI 1:1.
            uint256 _base,
            uint256 _price,
            uint256 _expiry
        ) = IPrime(tokenP).prime();

        // Calculates the Intrinsic + Extrinsic value of tokenP.
        volatility = calculateVolatilityProxy(_tokenU, _tokenR, _base, _price);
        (uint256 premium, ) = calculatePremium(_base, _price, _expiry);
        premium = amount.mul(premium).div(ONE_ETHER);

        // Premium is paid in tokenS. If tokenS is WETH, its paid with ETH, which is then swapped to WETH.
        if(_tokenS == weth) {
            require(msg.value >= premium /* && premium > 0 */, "ERR_BAL_ETH");
            IWETH(weth).deposit.value(premium)();
            // Refunds remainder.
            sendEther(msg.sender, msg.value.sub(premium));
        } else {
            require(IERC20(_tokenS).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_STRIKE");
        }

        // tokenU = Amount * Quantity of tokenU (base) / Quantity of tokenS (price).
        uint256 outTokenU = amount.mul(_base).div(_price); 

        // Transfer tokenU (assume DAI) to option contract using Pool funds.
        (bool transferU) = IERC20(_tokenU).transfer(tokenP, outTokenU);

        // Mint Prime and Prime Redeem to this contract.
        (uint256 inTokenU,) = IPrime(tokenP).mint(address(this));

        // Send Prime to msg.sender.
        emit Buy(msg.sender, amount, outTokenU, premium);
        return transferU && IPrime(tokenP).transfer(msg.sender, inTokenU);
    }

    /**
     * @dev Calculates the intrinsic + extrinsic value of the option.
     * @notice Strike / Market * (Volatility * 1000) * sqrt(T in seconds remaining) / Seconds in a Day.
     */
    function calculatePremium(uint256 base, uint256 price, uint256 expiry)
        public
        view
        returns (uint256 premium, uint256 timeRemainder)
    {
        // Assume the oracle gets the Price of ETH using compound's oracle for DAI per ETH.
        // Price = ETH per DAI.
        uint256 market = PriceOracleProxy(oracle).getUnderlyingPrice(COMPOUND_DAI);
        // Strike price of DAI per ETH. ETH / DAI = price of dai per eth, then scaled to 10^18 units.
        uint256 strike = price.mul(ONE_ETHER).div(base);
        // Difference = Base * market price / strike price.
        uint256 difference = base.mul(market).div(strike);
        // Intrinsic value in DAI.
        uint256 intrinsic = difference >= base ? difference.sub(base) : 0;
        // Time left in seconds.
        timeRemainder = (expiry.sub(block.timestamp));
        // Strike / market scaled to 1e18.
        uint256 moneyness = strike.mul(ONE_ETHER).div(market);
        // Extrinsic value in DAI.
        // Assumes the previously cached volatility.
        uint256 extrinsic = moneyness
                            .mul(ONE_ETHER)
                            .mul(volatility)
                            .mul(sqrt(timeRemainder))
                                .div(ONE_ETHER)
                                .div(SECONDS_IN_DAY);
        // Total Premium in ETH.
        premium = (extrinsic.add(intrinsic)).mul(market).div(ONE_ETHER);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 100.
     */
    function calculateVolatilityProxy(address tokenU, address tokenR, uint256 base, uint256 price)
        public
        view
        returns (uint256 _volatility)
    {
        (uint256 utilized) = poolUtilized(tokenR, base, price);
        uint256 totalBalance = IERC20(tokenU).balanceOf(address(this)).add(utilized);
        _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if(_volatility < MIN_VOLATILITY) {
            _volatility = 10; // 10 = 1%, where 1000 = 100%.
        } else {
            _volatility = _volatility.div(MIN_VOLATILITY);
        }

    }

    /**
     * @dev Calculates the amount of utilized tokenU assets outstanding.
     */
    function poolUtilized(address tokenR, uint256 base, uint256 price)
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
        utilized = IERC20(tokenR).balanceOf(address(this)).mul(base).div(price);
    }

    /**
     * @dev Utility function to send ethers safely.
     */
    function sendEther(address to, uint256 amount) private returns (bool) {
        (bool success, ) = to.call.value(amount)("");
        require(success, "ERR_SEND_ETHER");
        return success;
    }

    /**
     * @dev Utility function to calculate the square root of an integer. Used in calculating premium.
     */
    function sqrt(uint256 y) public pure returns (uint256 z) {
        if (y > 3) {
            uint256 x = (y + 1) / 2;
            z = y;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

    