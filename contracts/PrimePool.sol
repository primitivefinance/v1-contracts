pragma solidity ^0.6.2;

/**
 * @title   Primitive's Market Maker Pool
 * @author  Primitive
 */


import "./PrimeInterface.sol";
import "./controller/Instruments.sol";
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

interface ICDai {

    /*** User Interface ***/

    function mint(uint mintAmount) external returns (uint);
    function redeem(uint redeemTokens) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function borrow(uint borrowAmount) external returns (uint);
    function repayBorrow(uint repayAmount) external returns (uint);
    function repayBorrowBehalf(address borrower, uint repayAmount) external returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
    function transfer(address dst, uint amount) external returns (bool);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
}

interface PriceOracleProxy {
    function getUnderlyingPrice(address cToken) external view returns (uint);
}

contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    address public COMPOUND_DAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;
    uint256 public constant VOLATILITY = 870; // 87% * 1000
    uint256 public constant SECONDS_IN_DAY = 86400;
    uint256 public constant MILLISECONDS_TO_SECONDS = 1000;
    uint256 public constant ONE_ETHER = 1 ether;

    address public oracle;
    address public tokenU;
    address public tokenS;
    address public tokenR;
    address payable public weth;
    address[] public _optionMarkets;

    /* uint256 public cacheR;
    uint256 public cacheU;
    uint256 public cacheS; */

    /* mapping(address => bool) public isValidOption; */

    event Deposit(address indexed user, uint256 inTokenU, uint256 outTokenPULP);
    event Withdraw(address indexed user, uint256 outTokenU, uint256 inTokenR);
    event Buy(address indexed user, uint256 inTokenS, uint256 outTokenU, uint256 premium);
    event Market(address tokenP);

    constructor (
        address payable _weth,
        address _oracle,
        string memory name,
        string memory symbol,
        address _tokenU,
        address _tokenS
    ) 
        public
        ERC20(name, symbol)
    {
        weth = _weth;
        oracle = _oracle;
        tokenU = _tokenU;
        tokenS = _tokenS;
    }

    function assets() public view returns (address _tokenU, address _tokenS) {
        _tokenU = tokenU;
        _tokenS = tokenS;
    }

    function addMarket(address tokenP) public onlyOwner returns (address) {
        /* isValidOption[tokenP] = true; */
        _optionMarkets.push(tokenP);
        address _tokenR = IPrime(tokenP).tokenR();
        tokenR = _tokenR;

        IERC20(tokenS).approve(tokenP, 1000000000 ether);
        IERC20(tokenU).approve(tokenP, 1000000000 ether);
        IERC20(_tokenR).approve(tokenP, 1000000000 ether);
        emit Market(tokenP);
        return tokenP;
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
        uint256 amount
    )
        external
        payable
        whenNotPaused
        nonReentrant
        returns (bool)
    {

        // Store locally for gas savings.
        address _tokenU = tokenU;
        if(_tokenU == weth) {
            require(msg.value == amount && amount > 0, "ERR_BAL_ETH");
        } else {
            require(IERC20(_tokenU).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_UNDERLYING");
        }
        

        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance
        uint256 outTokenPULP;
        uint256 balanceU = IERC20(_tokenU).balanceOf(address(this));
        /* uint256 _cacheU = cacheU; */
        uint256 totalSupply = totalSupply();
         
        // If liquidity is not intiialized, mint LP tokens equal to deposit
        if(balanceU.mul(totalSupply) == 0) {
            outTokenPULP = amount;
        } else {
            require(amount.mul(totalSupply) >= balanceU, "ERR_ZERO");
            outTokenPULP = amount.mul(totalSupply).div(balanceU);
        }

        /* uint256 balanceU = IERC20(_tokenU).balanceOf(address(this)); */

        _mint(msg.sender, outTokenPULP);

        /* _fund(balanceU, cacheS, cacheR); */

        emit Deposit(msg.sender, amount, outTokenPULP);

        // Assume we hold the _tokenU asset until it is utilized in minting a Prime
        if(_tokenU == weth) {
            IWETH(weth).deposit.value(msg.value)();
            return true;
        } else {
            return IERC20(_tokenU).transferFrom(msg.sender, address(this), amount);
        }
    }

    /**
     * @dev liquidity Provider burns their tokenPULP for proportional amount of tokenU + tokenS.
     * @notice  outTokenU = inTokenPULP * cacheU / total supply tokenPULP, 
     *          outTokenS = inTokenPULP * cacheR / total supply tokenPULP 
     *          If the pool is fully utilized and there are no strike assets to redeem,
     *          the LPs will have to wait.
     * @param amount The quantity of liquidity tokens to burn.
     * @return bool Returns true if liquidity tokens were burned both tokenU + tokenS were sent to user.
     */
    function withdraw(
        uint256 amount,
        address tokenP
    ) 
        external 
        nonReentrant 
        returns (bool)
    {
        // Check tokenPULP balance.
        require(balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_PULP");
        
        // Store total supply before we burn
        uint256 totalSupply = totalSupply();

        // Burn tokenPULP.
        _burn(msg.sender, amount);

        // Store locally for gas savings.
        address _tokenU = tokenU;
        address _tokenS = tokenS;
        address _tokenR = tokenR;
        
        // Current balance.
        uint256 balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint256 balanceR = IERC20(_tokenR).balanceOf(address(this));

        // outTokenU = inTokenPULP * cached balance of tokenU / Total Supply of tokenPULP
        uint256 outTokenU = amount.mul(balanceU).div(totalSupply);

        // outTokenR = inTokenPULP * cached balance of tokenR / Total Supply of tokenPULP
        // tokenR is redeemable for 1:1 of tokenS.
        // Redeem outTokenS amount of tokenR.
        // Send redeemed tokenS to msg.sender.
        uint256 outTokenR = amount.mul(balanceR).div(totalSupply);

        // Cached balance of tokenS in tokenP must be >= outTokenR.
        (uint256 maxDraw) = IPrime(tokenP).maxDraw();
        require(maxDraw >= outTokenR, "ERR_BAL_STRIKE");

        // Send tokenR to tokenP so we can call redeem() later to tokenP.
        (bool success) = IERC20(_tokenR).transfer(tokenP, outTokenR);

        // Current balances.
        /* balanceU = IERC20(_tokenU).balanceOf(address(this));
        balanceR = IERC20(_tokenR).balanceOf(address(this)); */

        // Update cached balances.
        /* _fund(balanceU, balanceS, balanceR); */
        emit Withdraw(msg.sender, outTokenU, outTokenR);
    
        // Call redeem.
        (uint256 inTokenR) = IPrime(tokenP).redeem(msg.sender);
        assert(inTokenR == outTokenR && success);

        // Send outTokenU to msg.sender.
        if(_tokenU == weth) {
            IWETH(weth).withdraw(outTokenU);
            (success, ) = msg.sender.call.value(outTokenU)("");
            require(success, "Send ether fail");
            return success;
        } else {
            return IERC20(_tokenU).transfer(msg.sender, outTokenU);
        }
    }


    /* =========== TAKER FUNCTIONS =========== */


    /**
     * @dev Purchase ETH Put -> tokenU is DAI and tokenS is WETH. Pool holds tokenU.
     * @notice an eth put is 200 DAI / 1 ETH. Swap 1 ETH (tokenS) for 200 Dai (tokenU).
     * As a user, you want to cover ETH, so you pay in ETH. Every 1 Q of ETH covers 200 DAI.
     * A user specifies the amount of ETH they want covered, i.e. the amount of ETH they can sell.
     * @param amount The quantity of tokenU to 'cover' with an option. Denominated in tokenS.
     */
    function buy(
        uint256 amount,
        address tokenP
    )
        external 
        payable
        nonReentrant
        returns (bool)
    {
        // Store locally for gas savings.
        address _tokenP = tokenP; // Assume Option
        address _tokenU = tokenU; // Assume DAI
        address _tokenS = tokenS; // Assume ETH

        // Premium is 1% - FIX
        (uint256 premium, ) = calculatePremium(tokenP);
        premium = amount.mul(premium).div(ONE_ETHER);

        // Premium is paid in tokenS. If tokenS is WETH, its paid with ETH.
        if(_tokenS == weth) {
            require(msg.value >= premium && premium > 0, "ERR_BAL_ETH");
            IWETH(weth).deposit.value(premium)();
        } else {
            require(IERC20(_tokenS).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_STRIKE");
        }

        // Current balance.
        uint256 balanceU = IERC20(_tokenU).balanceOf(address(this));

        // ex. 1-0.1=0.9, 0.9 * 200 / 1 = 180.
        uint256 outTokenU = amount.mul(IPrime(_tokenP).base()).div(IPrime(_tokenP).price()); 

        // Transfer tokenU (assume DAI) to option contract using Pool funds.
        require(balanceU >= outTokenU, "ERR_BAL_UNDERLYING");
        (bool transferU) = IERC20(_tokenU).transfer(_tokenP, outTokenU);

        // Mint Prime.
        (uint256 inTokenU,) = IPrime(_tokenP).mint(address(this)); // MAYBE FIX MINT FUNC

        // Send Prime to msg.sender.
        (bool transferP) = IPrime(_tokenP).transfer(msg.sender, inTokenU);

        // Current balances.
        /* balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint256 balanceS = IERC20(_tokenS).balanceOf(address(this));
        uint256 balanceR = IERC20(tokenR).balanceOf(address(this)); */

        // Update cached balances.
        /* _fund(balanceU, balanceS, balanceR); */
        emit Buy(msg.sender, amount, outTokenU, premium);
        return transferP && transferU;
    }

    /**
     * @dev Calculates the intrinsic + extrinsic value of the option.
     * @notice Strike / Market * (Volatility * 1000) * sqrt(T in seconds remaining) / Seconds in a Day
     */
    function calculatePremium(address tokenP) public view returns (uint256 timeRemainder, uint256 premium) {
        // Assume the oracle gets the Price of ETH using compound's oracle for Dai per ETH.
        // Price = ETH per DAI.
        uint256 market = PriceOracleProxy(oracle).getUnderlyingPrice(COMPOUND_DAI); // FIX ONLY WORKS ON MAINNET Assume price of ETHER

        // Quantity of DAI.
        uint256 base = IPrime(tokenP).base();
        // Strike price of DAI per ETH. ETH / DAI = price of dai per eth, then scaled to 10^18 units.
        uint256 strike = IPrime(tokenP).price().mul(ONE_ETHER).div(base);
        // Difference = Base * market price / strike price = new Base.
        uint256 difference = base.mul(market).div(strike);
        // Intrinsic value in DAI.
        uint256 intrinsic = difference >= base ? difference.sub(base) : 0;
        // Time left in seconds
        timeRemainder = (IPrime(tokenP).expiry().sub(block.timestamp));
        // Strike / market scaled to 1e18
        uint256 moneyness = strike.mul(ONE_ETHER).div(market);
        // Extrinsic value in DAI.
        uint256 extrinsic = moneyness
                            .mul(ONE_ETHER)
                            .mul(VOLATILITY)
                            .mul(sqrt(timeRemainder))
                                .div(ONE_ETHER)
                                .div(SECONDS_IN_DAY);
        // Total Premium in ETH.
        premium = (extrinsic.add(intrinsic)).mul(market).div(ONE_ETHER);
    }

    function calculateVolatilityProxy(uint256 base, uint256 price) public view returns (uint256 volatility) {
        uint256 utilized = utilized(base, price);
        uint256 balanceU = IERC20(tokenU).balanceOf(address(this));
        volatility = utilized
                        .mul(1000)
                        .div(balanceU.add(utilized));

    }

    function utilized(uint256 base, uint256 price) public view returns (uint256 utilized) {
        utilized = IERC20(tokenR).balanceOf(address(this))
                    .mul(price)
                    .mul(ONE_ETHER)
                    .div(base)
                    .div(ONE_ETHER);
    }

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

    