pragma solidity ^0.6.2;

/**
 * @title   Primitive's Pool for Writing Short Ether Puts 
 * @author  Primitive
 */


import "../interfaces/IPrime.sol";
import "../interfaces/IPrimePool.sol";
import "../interfaces/IPrimeOracle.sol";
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
        // Trade ERC20 to ETH
    function tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline) external returns (uint256  eth_bought);
    // Trade ETH to ERC20
    function ethToTokenSwapInput(uint256 min_tokens, uint256 deadline) external payable returns (uint256  tokens_bought);
}

interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

contract PrimePool is IPrimePool, Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    address public constant COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    /* address public constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; */
    
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant MAX_SLIPPAGE = 95;
    uint256 public constant MIN_VOLATILITY = 10**15;
    uint256 public constant MIN_PREMIUM = 100;
    uint256 public constant MIN_LIQUIDITY = 10**4;
    uint256 public constant ONE_ETHER = 1 ether;
    uint256 public constant MANTISSA = 10**36;
    uint256 public constant DISCOUNT_RATE = 5;

    uint256 public volatility;

    // Assume oracle is compound's price proxy oracle.
    address public oracle;
    address public override factory;
    address public override tokenP;
    address public WETH;

    event Market(address tokenP);
    event Deposit(address indexed from, uint256 inTokenU, uint256 outTokenPULP);
    event Withdraw(address indexed from, uint256 inTokenPULP, uint256 outTokenU);
    event Buy(address indexed from, uint256 inTokenS, uint256 outTokenU, uint256 premium);
    event Sell(address indexed from, uint256 inTokenP, uint256 premium);

    constructor (
        address _weth,
        address _tokenP,
        address _oracle,
        address _factory,
        string memory name,
        string memory symbol
    ) 
        public
        ERC20(name, symbol)
    {
        WETH = _weth;
        tokenP = _tokenP;
        oracle = _oracle;
        factory = _factory;
        volatility = 100;
    }

    function kill() public override onlyOwner returns (bool) {
        if(paused()) {
            _unpause();
        } else {
            _pause();
        }
        return true;
    }

    receive() external payable {}

    /* =========== MAKER FUNCTIONS =========== */


    /**
     * @dev Adds liquidity by depositing tokenU. Receives tokenPULP.
     * @param inTokenU The quantity of tokenU to deposit.
     */
    function deposit(
        uint256 inTokenU
    )
        external
        whenNotPaused
        nonReentrant
        returns (uint256 outTokenPULP, bool success)
    {
        // Store locally for gas savings.
        address _tokenP = tokenP;
        address tokenU = IPrime(_tokenP).tokenU();

        // Require inTokenUs greater than 0 and the msg.sender to have the inTokenU in the params.
        require(
            IERC20(tokenU).balanceOf(msg.sender) >= inTokenU &&
            inTokenU >= MIN_LIQUIDITY,
            "ERR_BAL_UNDERLYING"
        );

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(_tokenP, msg.sender, inTokenU);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        (success) = IERC20(tokenU).transferFrom(msg.sender, address(this), inTokenU);
    }

    /**
     * @dev Adds liquidity by depositing ETH. Receives tokenPULP.
     * @notice Requires tokenU to be WETH.
     * msg.value is The quantity of tokenU to deposit.
     */
    function depositEth()
        external
        payable
        whenNotPaused
        nonReentrant
        returns (uint256 outTokenPULP, bool success)
    {
        // Save in memory for gas savings.
        address _tokenP = tokenP;
        address tokenU = IPrime(_tokenP).tokenU();
        require(
            msg.value >= MIN_LIQUIDITY,
            "ERR_BAL_UNDERLYING"
        );

        // To deposit ETH, tokenU needs to be WETH.
        require(tokenU == WETH, "ERR_NOT_WETH");

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(_tokenP, msg.sender, msg.value);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        IWETH(WETH).deposit.value(msg.value)();
        success = true;
    }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(address _tokenP, address to, uint256 inTokenU)
        private
        returns (uint256 outTokenPULP)
    {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint256 _totalSupply = totalSupply();
        (uint256 totalBalance) = totalPoolBalance(_tokenP);
         
        // If liquidity is not intiialized, mint the initial liquidity and lock it by
        // minting it to this contract.
        if(_totalSupply == 0) {
            outTokenPULP = inTokenU;
        } else {
            outTokenPULP = inTokenU.mul(_totalSupply).div(totalBalance);
            require(outTokenPULP > 0, "ERR_ZERO_LIQUIDITY");
        }
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
     */
    function withdraw(
        uint256 inTokenPULP
    ) 
        external
        nonReentrant
        returns (bool)
    {
        // Check tokenPULP balance.
        require(
            balanceOf(msg.sender) >= inTokenPULP &&
            inTokenPULP > 0,
            "ERR_BAL_PULP"
        );
        
        // Store for gas savings.
        address _tokenP = tokenP;

        // Store Total Supply before we burn
        uint256 _totalSupply = totalSupply();

        // Get the actual balance of tokenU in the pool.
        (uint256 balanceU) = totalUnutilized(_tokenP);

        // Calculate total pool balance. Oustanding underwrites + balance.
        (uint256 totalBalance) = totalPoolBalance(_tokenP);

        // outTokenU = inTokenPULP * Balance of tokenU / Total Supply of tokenPULP.
        // Checks to make sure numerator >= denominator.
        // Will revert in cases that inTokenPULP * total balance < total supply of tokenPULP.
        uint256 outTokenU = inTokenPULP.mul(totalBalance).div(_totalSupply);
        if(balanceU >= outTokenU) {
            require(outTokenU > 0, "ERR_BAL_UNDERLYING");
            // Burn tokenPULP.
            _burn(msg.sender, inTokenPULP);

            // Push outTokenU to msg.sender.
            emit Withdraw(msg.sender, inTokenPULP, outTokenU);
            return _withdraw(IPrime(_tokenP).tokenU(), msg.sender, outTokenU);
        } else {
            // Get tokenU balances.
            (balanceU, totalBalance) = _removeLiquidity(_tokenP, inTokenPULP);
            outTokenU = inTokenPULP.mul(totalBalance).div(_totalSupply);
            
            // Push outTokenU to msg.sender.
            emit Withdraw(msg.sender, inTokenPULP, outTokenU);
            return _withdraw(IPrime(_tokenP).tokenU(), msg.sender, outTokenU);
        }
    }

    /**
     * @dev Private function to burn tokenPULP, pull tokenS, swap tokenS to tokenU, and push tokenU.
     * @notice This is a large function. It pulls tokenU from the option contract (tokenP).
     * It also swaps tokenS to tokenU using a uniswap pool.
     * @param _tokenP The option contract address.
     */
    function _removeLiquidity(address _tokenP, uint256 inTokenPULP)
        private
        returns (uint256 balanceU, uint256 totalBalance)
    {
        // Burn tokenPULP.
        _burn(msg.sender, inTokenPULP);

        // Pull tokenS into this contract.
        assert(_redeem(_tokenP) > 0);

        // Push tokenS to uniswap pool and pull tokenU.
        assert(_exchange(_tokenP) > 0);

        // Get the actual balance of tokenU in the pool.
        (balanceU) = totalUnutilized(_tokenP);

        // Calculate total pool balance. Oustanding underwrites + balance.
        (totalBalance) = totalPoolBalance(_tokenP);
    }

    /**
     * @dev Private function to push tokenR to option contract then pull tokenS.
     * @notice Should only be called when Pool cannot fill withdraw request.
     * Will revert if maxDraw is 0.
     * @param _tokenP Address of Prime option contract.
     */
    function _redeem(address _tokenP)
        private
        returns (uint256 outTokenR)
    {
        // Check how many tokenS can be pulled from PrimeOption.sol.
        (uint256 maxDraw) = IPrime(_tokenP).maxDraw();

        // Push tokenR to _tokenP so we can call redeem() and pull tokenS.
        IERC20(IPrime(_tokenP).tokenR()).transfer(_tokenP, maxDraw);

        // Call redeem function to pull tokenS.
        outTokenR = IPrime(_tokenP).redeem(address(this));
        assert(outTokenR == maxDraw);
    }

    /**
     * @dev Swaps tokenS to tokenU through uniswap.
     * @notice Assumes tokenU is DAI and tokenS is WETH.
     * In future versions this can be made more modular.
     * It should be able to swap any tokenS into any tokenU.
     * This will be made possible when UniswapV2 is released.
     */
    function _exchange(address _tokenP)
        private
        returns (uint256 inTokenU)
    {
        // Get addresses for gas savings.
        address tokenS = IPrime(_tokenP).tokenS();
        address tokenU = IPrime(_tokenP).tokenU();
        address exchange;
        if(tokenU == WETH) {
            exchange = tokenS;
        } else exchange = tokenU;
        exchange = UniswapFactoryInterface(factory).getExchange(exchange);
        // Get price of 1 ETH denominated in tokenU from compound oracle. 1 ETH = 1e36 / oracle's price.
        // Assumes oracle never returns a value greater than 1e36.
        (uint256 oraclePrice) = marketRatio(_tokenP);
        // Get price of 1 ETH denominated in tokenU from uniswap pool.
        uint256 uniPrice = UniswapExchangeInterface(exchange).getEthToTokenInputPrice(ONE_ETHER);
        // Calculate the max slippage price. Assumes oracle price is never < 100 wei.
        uint256 slippage = oraclePrice.div(MAX_SLIPPAGE);
        // Subtract max slippage amount from uniswap price to get min received tokenU per tokenS.
        uint256 minReceived = uniPrice.sub(slippage);
        // Initialize outTokenS variable.
        uint256 outTokenS;
        if(tokenU == WETH) {
            // Get current balance of tokenS to send to uniswap pool.
            outTokenS = IERC20(tokenS).balanceOf(address(this));
            // Get the minimum amount of ETH received by selling outTokenS at the current price.
            minReceived = outTokenS.mul(ONE_ETHER).div(minReceived);
            // Swaps tokenS to ETH.
            // Min tokenU Received: Amount ETH * minRecieved / 10^18
            // Deadline = now + 3 minutes.
            IERC20(tokenS).approve(exchange, outTokenS);
            inTokenU = UniswapExchangeInterface(exchange)
                            .tokenToEthSwapInput(outTokenS, minReceived, now + 3 minutes);

            // Wrap WETH.
            IWETH(WETH).deposit.value(address(this).balance)();
        } else {
            assert(tokenS == WETH);
            // Unwrap WETH.
            IWETH(WETH).withdraw(IERC20(tokenS).balanceOf(address(this)));
            // Get balance to send to uniswap pool.
            outTokenS = address(this).balance;
            // Swaps ETH to tokenU.
            // Amount ETH swapped = msg.value sent.
            // Min tokenU Received: Amount ETH * minRecieved / 10^18
            // Deadline = now + 3 minutes.
            inTokenU = UniswapExchangeInterface(exchange)
                            .ethToTokenSwapInput
                            .value(outTokenS)(outTokenS.mul(minReceived).div(ONE_ETHER), now + 3 minutes);
        }
    }

    /**
     * @dev Private function to push assets to msg.sender. Will push ethers or tokens depending
     * on the address passed in the parameter.
     */
    function _withdraw(address token, address to, uint256 amount) private returns (bool) {
        if(token == WETH) {
            IWETH(WETH).withdraw(amount);
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
        uint256 inTokenS
    )
        external 
        nonReentrant
        returns (bool)
    {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH.
             , // Assume tokenR and we don't need it in this function.
            uint256 base,
            uint256 price,
            uint256 expiry
        ) = IPrime(_tokenP).prime();

        // Optimistically mint tokenP.

        // outTokenU = inTokenS * Quantity of tokenU (base) / Quantity of tokenS (price).
        // Units = tokenS * tokenU / tokenS = tokenU.
        uint256 outTokenU = inTokenS.mul(base).div(price); 

        // Transfer tokenU (assume DAI) to option contract using Pool funds.
        // We do this because the mint function in the Prime contract will check the balance,
        // against its previously cached balance. The difference is the amount of tokens that were
        // deposited, which determines how many Primes to mint.
        require(IERC20(tokenU).balanceOf(address(this)) >= outTokenU, "ERR_BAL_UNDERLYING");
        (bool transferU) = IERC20(tokenU).transfer(_tokenP, outTokenU);

        // Mint Prime and Prime Redeem to this contract.
        // If outTokenU is zero because the numerator is smaller than the denominator,
        // or because the inTokenS is 0, the mint function will revert. This is because
        // the mint function only works when tokens are sent into the Prime contract.
        (uint256 inTokenP, ) = IPrime(_tokenP).mint(address(this));
        
        // Calculate premium. Denominated in tokenU PER tokenS 'covered'.
        (uint256 premium) = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            tokenS,
            volatility,
            base,
            price,
            expiry
        );
        
        // Calculate total premium to pay, total premium = premium per tokenS * inTokenS.
        // Units = tokenS * (tokenU / tokenS) / 10^18 units = tokenU.
        premium = inTokenS.mul(premium).div(ONE_ETHER);
        require(premium > 0, "ERR_PREMIUM_ZERO");

        // Updates the volatility global state variable.
        volatility = calculateVolatilityProxy(_tokenP);

        // Pulls payment in tokenU from msg.sender and then pushes tokenP (option).
        // WARNING: Two calls to untrusted addresses.
        require(IERC20(tokenU).balanceOf(msg.sender) >= premium, "ERR_BAL_UNDERLYING");
        require(IERC20(_tokenP).balanceOf(address(this)) >= inTokenP, "ERR_BAL_PRIME");
        emit Buy(msg.sender, inTokenS, outTokenU, premium);
        (bool received) = IERC20(tokenU).transferFrom(msg.sender, address(this), premium);
        return received && transferU && IERC20(_tokenP).transfer(msg.sender, inTokenP);
    }

    /**
     * @dev Sell Prime options back to the pool.
     * @notice The pool buys options at a discounted rate based on the current premium price.
     * @param inTokenP The amount of Prime option tokens that are being sold.
     */
    function sell(
        uint256 inTokenP
    )
        external
        nonReentrant
        returns (bool)
    {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (
            address tokenU, // Assume DAI.
            address tokenS, // Assume ETH.
            address tokenR, // Assume tokenR.
            uint256 base,
            uint256 price,
            uint256 expiry
        ) = IPrime(_tokenP).prime();

        // Check tokenP balance.
        require(
            IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP &&
            inTokenP > 0,
            "ERR_BAL_PRIME"
        );

        // Calculate the current premium price.
        (uint256 premium) = IPrimeOracle(oracle).calculatePremium(
            tokenU,
            tokenS,
            volatility,
            base,
            price,
            expiry
        );

        // Calculate discounted premium. This is the value of tokenU per tokenS covered.
        premium = premium.sub(premium.div(DISCOUNT_RATE));

        // Calculate total premium.
        // Units: tokenU * (tokenU / tokenS) / 10^18 units = total quantity tokenU price.
        premium = inTokenP.mul(premium).div(ONE_ETHER);

        // Check to see if pool has the premium to pay out.
        require(IERC20(tokenU).balanceOf(address(this)) >= premium, "ERR_BAL_UNDERLYING");
        
        // Calculate amount of redeem needed to close position with inTokenU.
        uint256 redeem = inTokenP.mul(price).div(base);

        // Transfer redeem to prime token optimistically.
        IERC20(tokenR).transfer(tokenP, redeem);

        // Transfer prime token to prime contract optimistically.
        require(IERC20(_tokenP).transferFrom(msg.sender, tokenP, inTokenP), "ERR_TRANSFER_IN_PRIME");
        
        // Call the close function to have the transferred prime and redeem tokens burned.
        // Returns tokenU.
        IPrime(_tokenP).close(address(this));

        // Pay out the total premium to the seller.
        emit Sell(msg.sender, inTokenP, premium);
        return IERC20(tokenU).transfer(msg.sender, premium);
    }

    /**
     * @dev Calculates the Pool's Utilization to use as a proxy for volatility.
     * @notice If Pool is not utilized at all, the default volatility is 250.
     */
    function calculateVolatilityProxy(address _tokenP)
        public
        view
        returns (uint256 _volatility)
    {
        (uint256 utilized) = totalUtilized(_tokenP);
        uint256 totalBalance = totalPoolBalance(_tokenP);
        if(totalBalance > 0) _volatility = utilized.mul(ONE_ETHER).div(totalBalance); // Volatility with 1e18 decimals.
        if(_volatility < MIN_VOLATILITY) {
            _volatility = 1000;
        } else _volatility = _volatility.div(MIN_VOLATILITY).add(1000);

    }

    /**
     * @dev Calculates the amount of utilized tokenU assets outstanding.
     */
    function totalUtilized(address _tokenP)
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
        ( , , address tokenR, , uint256 price, ) = IPrime(_tokenP).prime();
        (uint256 oraclePrice) = marketRatio(_tokenP);
        utilized = IERC20(tokenR).balanceOf(address(this)).mul(oraclePrice).div(price);
    }

    /**
     * @dev Returns the contract balance of tokenU.
     */
    function totalUnutilized(address _tokenP) public view returns (uint256 balanceU) {
        // The unutilized balance is equal to the balance of tokenU held by the pool.
        balanceU = IERC20(IPrime(_tokenP).tokenU()).balanceOf(address(this));
    }

    /**
     * @dev Returns to total balance of tokenU that the contract has accross accounts.
     * @notice Total Balance = utilized + unutilized. Utilized = underwritten tokenU.
     */
    function totalPoolBalance(address _tokenP) public view returns (uint256 totalBalance) {
        // Unutilized is the balance of tokenU in the contract. Utilized is outstanding tokenU.
        // Utilized assets are held in the Prime contract waiting to be exercised or expired.
        totalBalance = totalUnutilized(_tokenP).add(totalUtilized(_tokenP));
    }

    /**
     * @dev Utility function to get the market ratio of tokenS denominated in tokenU.
     * @notice Assumes the getUnderlyingPrice function call from the oracle never returns
     * a value greater than 1e36 (MANTISSA).
     */
    function marketRatio(address _tokenP) public view returns(uint256 oraclePrice) {
        address _tokenU = IPrime(_tokenP).tokenU();
        address token = _tokenU == WETH ? IPrime(_tokenP).tokenS() : _tokenU;
        oraclePrice = MANTISSA.div(IPrimeOracle(oracle).marketPrice(token));
    }

    /**
     * @dev Utility function to send ethers safely.
     */
    function sendEther(address to, uint256 amount) private returns (bool) {
        (bool success, ) = to.call.value(amount)("");
        require(success, "ERR_SEND_ETHER");
        return success;
    }

    function balances() public override view returns(uint balanceU, uint balanceR) {
        balanceU = IERC20(IPrime(tokenP).tokenU()).balanceOf(address(this));
        balanceR = IERC20(IPrime(tokenP).tokenR()).balanceOf(address(this));
    }
}

    