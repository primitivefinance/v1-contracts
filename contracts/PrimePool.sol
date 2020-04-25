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

interface AggregatorInterface {
  function currentAnswer() external view returns (int256);
}

contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    uint256 public constant THOUSAND_BPS = 10;
    uint256 public constant FIVE_HUNDRED_BPS = 20;
    uint256 public constant ONE_HUNDRED_BPS = 100;

    IPrime public prime;
    AggregatorInterface public oracle;

    address payable public weth;
    address payable[] public _optionMarkets;

    mapping(address => bool) public isValidOption;

    // Total Options held in Pool. Each Option is 1:1 with Ether underlying.
    uint256 public cacheR;
    uint256 public cacheU;
    uint256 public cacheS;
    

    uint256 public _test;
    

    event Deposit(uint256 deposit, address indexed user, uint256 minted);
    event Withdraw(uint256 withdraw, address indexed user, uint256 burned);
    event Buy(address indexed user, uint256 amount, uint256 premium);

    constructor (
        address compoundDaiAddress,
        address _oracle,
        address payable _weth
    ) 
        public
        ERC20(
            "Market Maker Primitive Underlying LP",
            "mPULP"
        )
    {
        oracle = AggregatorInterface(_oracle);
        weth = _weth;
    }

    function _fund(uint256 _cacheU, uint256 _cacheS, uint256 _cacheR) private {
        cacheU = _cacheU;
        cacheS = _cacheS;
        cacheR = _cacheR;
    }

    function addMarket(address payable primeOption) public onlyOwner returns (address) {
        // Assume the first option defines the series (strike and underlying assets + expiration)
        if(_optionMarkets.length == 0) {
            prime = IPrime(primeOption);
        }
        isValidOption[primeOption] = true;
        _optionMarkets.push(primeOption);
        IPrime _prime = IPrime(primeOption);

        // Assume this is DAI
        IERC20 strike = IERC20(_prime.tokenS());
        strike.approve(primeOption, 1000000000 ether);
        
        // Assume this is USDC
        IERC20 underlying = IERC20(_prime.tokenU());
        underlying.approve(primeOption, 1000000000 ether);

        IPrimeRedeem rPulp = IPrimeRedeem(_prime.tokenR());
        rPulp.approve(primeOption, 1000000000 ether);
        return primeOption;
    }


    receive() external payable {}


    /* =========== MAKER FUNCTIONS =========== */

    /**
     * @dev Adds liquidity by depositing underlying assets in exchange for liquidity tokens.
     * @param amount The quantity of Underlying assets to deposit.
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
        /* CHECKS */

        // Assume this is the underlying asset of the series
        IERC20 underlying = IERC20(prime.tokenU());
        if(address(underlying) == weth) {
            require(msg.value == amount && msg.value > 0, "ERR_BAL_ETH");
        } else {
            require(underlying.balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_UNDERLYING");
        }
        
        /* EFFECTS */

        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance
        uint256 pulp;
        uint256 juice = juice();
        uint256 totalSupply = totalSupply();
         
        // If liquidity is not intiialized, mint LP tokens equal to deposit
        if(juice.mul(totalSupply) == 0) {
            pulp = amount;
        } else {
            pulp = amount.mul(totalSupply).div(juice);
        }

        /* INTERACTIONS */

        _mint(msg.sender, pulp);
        _fund(amount, cacheS, cacheR);
        emit Deposit(amount, msg.sender, pulp);

        // Assume we hold the underlying asset until it is utilized in minting a Prime
        if(address(underlying) == weth) {
            IWETH(weth).deposit.value(msg.value)();
            return true;
        } else {
            return underlying.transferFrom(msg.sender, address(this), amount);
        }
        
    }

    /**
     * @dev liquidity Provider burns their LP tokens in exchange for underlying or redeemed strike assets.
     * @notice If the pool is fully utilized and there are no strike assets to redeem, the LP will have to wait.
     * @param amount The quantity of liquidity tokens to burn.
     * @return bool Returns true if liquidity tokens were burned and underlying or strike assets were sent to user.
     */
    function withdraw(
        uint256 amount
    ) 
        external 
        nonReentrant 
        returns (bool)
    {

        /* CHECKS */
        require(balanceOf(msg.sender) >= amount, "ERR_BAL_LPROVIDER");

        /* EFFECTS */

        IERC20 tokenS = IERC20(prime.tokenS());
        IERC20 tokenU = IERC20(prime.tokenU());

        uint256 redeems = cacheR;
        uint256 strikes = tokenS.balanceOf(address(this));
        uint256 underlyings = tokenU.balanceOf(address(this));

        uint256 withdrawU = amount.mul(cacheU).div(totalSupply());
        uint256 withdrawR = amount.mul(cacheR).div(totalSupply());

        if(withdrawU > underlyings) {
            uint256 remainder = withdrawR;
            for(uint8 i = 0; i < _optionMarkets.length; i++) {
                IPrime option = IPrime(_optionMarkets[i]);
                (uint256 draw) = option.maxDraw();
                option.withdraw(draw);
                redeems.sub(draw);
                if(draw > remainder) {
                    break;
                } else {
                    remainder.sub(draw);
                }
            }

            strikes = tokenS.balanceOf(address(this));
            require(strikes >= withdrawR, "ERR_BAL_STRIKE");
            withdrawU = amount.mul(underlyings).div(totalSupply()); 
        } else {
            withdrawR = 0;
        }

        

        /* INTERACTIONS */
        _burn(msg.sender, amount);
        
        
        if(withdrawR > 0) {
            tokenS.transfer(msg.sender, withdrawR);
        }
        
        _fund(
            underlyings.sub(withdrawU),
            strikes.sub(withdrawR),
            redeems
        );

        emit Withdraw(withdrawU, msg.sender, amount);
    
        if(address(tokenU) == weth) {
            IWETH(weth).withdraw(withdrawU);
            return sendEther(msg.sender, withdrawU);
        } else {
            return tokenU.transfer(msg.sender, withdrawU);
        }
    }


    /* =========== TAKER FUNCTIONS =========== */


    /**
     * @dev Purchases Prime Option ERC-20 Tokens from the Pool
     */
    function buy(uint256 amount, address optionAddress)
        public 
        payable
        nonReentrant
        returns (bool)
    {

        require(isValidOption[optionAddress], "ERR_INVALID_OPTION");
        IPrime option = IPrime(optionAddress);

        require(totalUnutilized() >= amount, "ERR_BAL_UNDERLYING");


        uint256 premium = amount.div(FIVE_HUNDRED_BPS); 


        uint256 price = uint(oracle.currentAnswer());

        uint256 intrinsic;
        if(option.ratio() > price) {
            intrinsic = 0;
        } else {
            intrinsic = price.sub(option.ratio());
        }

        uint256 cost = premium.add(intrinsic);

        require(msg.value >= cost, "ERR_BAL_ETH");
        if(msg.value > cost) {
            uint256 refund = msg.value.sub(cost);
            sendEther(msg.sender, refund);
        }

        (uint256 primes, uint256 redeems) = option.mint(amount);
        _fund(primes, cacheS, redeems);
        
        return option.transfer(msg.sender, amount);
    }

    /**
     * @dev Gets the Unutilized asset balance of the Pool.
     * @notice Gets the total assets that are not being utilized as underlying assets in Prime Options.
     */
    function totalUnutilized() public view returns (uint256) {
        IERC20 underlying = IERC20(prime.tokenU());
        uint256 unutilized;
        if(address(underlying) == address(prime)) {
            unutilized = totalEtherBalance();
        } else {
            unutilized = underlying.balanceOf(address(this));
        }
        return unutilized;
    }

    /**
     * @dev Gets the Utilized asset balance of the Pool.
     * @notice Gets the total assets that are being utilized as underlying assets in Prime Options.
     */
    function juice() public view returns (uint256) {
        return cacheU;
    }


    /**
     * @dev max amount of LP tokens that can be burned to withdraw underlying assets
     * @notice Max Burn = Underlying Balance * Total Supply of LP Tokens / Total Underlying + Strike Assets denominated in the Underlying
     * @return uint256 max amount of tokens that can be burned to withdraw underlying assets
     */
    function maxLiquidityWithdrawable() public view returns (uint256) {
        /* LP = (ET - L) * ST / ET where ST = Total Supply */
        uint256 maxLiquidity = totalUnutilized().mul(totalSupply()).div(juice());
        require(maxLiquidity <= totalUnutilized(), "ERR_BAL_UNUTILIZED");
        return maxLiquidity;
    }

    /* CAPITAL MANAGEMENT FUNCTIONS */

    /**
     @dev function to send ether with the most security
     */
    function sendEther(address payable user, uint256 amount) internal returns (bool) {
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }

    function totalEtherBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

    