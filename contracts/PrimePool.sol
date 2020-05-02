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


interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
    function totalSupply() external view returns (uint);
    function approve(address guy, uint wad) external returns (bool);
    function transfer(address dst, uint wad) external returns (bool);
    function transferFrom(address src, address dst, uint wad) external returns (bool);
}

interface PriceOracleProxy {
    function getUnderlyingPrice(address cToken) external view returns (uint);
}

contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    address public COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant ONE_ETHER = 1 ether;

    uint256 public volatility;

    address public oracle;
    address payable public weth;
    
    mapping(uint256 => address) public primes;

    event Market(address tokenP);
    event Deposit(address indexed user, uint256 inTokenU, uint256 outTokenPULP);
    event Withdraw(address indexed user, uint256 outTokenU, uint256 inTokenR);
    event Buy(address indexed user, uint256 inTokenS, uint256 outTokenU, uint256 premium);

    constructor (
        address payable _weth,
        address _oracle,
        string memory name,
        string memory symbol
    ) 
        public
        ERC20(name, symbol)
    {
        weth = _weth;
        oracle = _oracle;
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
     * @return bool True if the transaction suceeds.
     */
    function deposit(
        uint256 amount,
        address tokenP
    )
        external
        payable
        whenNotPaused
        nonReentrant
        returns (bool)
    {
        // Store locally for gas savings.
        address tokenU = IPrime(tokenP).tokenU();
        if(tokenU == weth) {
            require(msg.value == amount && amount > 0, "ERR_BAL_ETH");
        } else {
            require(IERC20(tokenU).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_UNDERLYING");
        }

        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint256 outTokenPULP;
        uint256 balanceU = IERC20(tokenU).balanceOf(address(this));
        uint256 totalSupply = totalSupply();
         
        // If liquidity is not intiialized, mint LP tokens equal to deposit.
        if(balanceU.mul(totalSupply) == 0) {
            outTokenPULP = amount;
        } else if(amount.mul(totalSupply) < balanceU) {
            require(amount.mul(totalSupply) >= balanceU, "ERR_ZERO");
        } else {
            outTokenPULP = amount.mul(totalSupply).div(balanceU);
        }

        _mint(msg.sender, outTokenPULP);
        emit Deposit(msg.sender, amount, outTokenPULP);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        if(tokenU == weth) {
            IWETH(weth).deposit.value(msg.value)();
            return true;
        } else {
            return IERC20(tokenU).transferFrom(msg.sender, address(this), amount);
        }
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
        returns (bool)
    {
        // Check tokenPULP balance.
        require(balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_PULP");
        
        // Store Total Supply before we burn
        uint256 totalSupply = totalSupply();

        // Burn tokenPULP.
        _burn(msg.sender, amount);

        // Store locally for gas savings.
        address tokenU = IPrime(tokenP).tokenU();
        address tokenR = IPrime(tokenP).tokenR();

        // outTokenU = inTokenPULP * Balance of tokenU / Total Supply of tokenPULP.
        uint256 outTokenU = amount.mul(IERC20(tokenU).balanceOf(address(this))).div(totalSupply);

        // TokenR:TokenS = 1:1.
        // outTokenR = inTokenPULP * Balance of tokenR / Total Supply of tokenPULP.
        uint256 outTokenR = amount.mul(IERC20(tokenR).balanceOf(address(this))).div(totalSupply);

        // Balance of tokenS in tokenP must be >= outTokenR.
        if(outTokenR > 0) {
            (uint256 maxDraw) = IPrime(tokenP).maxDraw();
            require(maxDraw >= outTokenR, "ERR_BAL_STRIKE");

            // Send tokenR to tokenP so we can call redeem() later to tokenP.
            (bool success) = IERC20(tokenR).transfer(tokenP, outTokenR);

            // Call redeem function to send tokenS to msg.sender.
            (uint256 inTokenR) = IPrime(tokenP).redeem(msg.sender);
            assert(inTokenR == outTokenR && success);
        }

        // Send outTokenU to msg.sender.
        emit Withdraw(msg.sender, outTokenU, outTokenR);
        if(tokenU == weth) {
            IWETH(weth).withdraw(outTokenU);
            return sendEther(msg.sender, outTokenU);
        } else {
            return IERC20(tokenU).transfer(msg.sender, outTokenU);
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
        uint256 balanceU = IERC20(tokenU).balanceOf(address(this));
        _volatility = utilized > 0 ?
                        utilized
                        .mul(1000)
                        .div(balanceU.add(utilized)) :
                        100;

    }

    /**
     * @dev Calculates the amount of utilized tokenU assets in the Pool.
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

    