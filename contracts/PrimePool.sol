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

interface AggregatorInterface {
  function currentAnswer() external view returns (int256);
}

contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    ICDai public _cDai;
    IPrimeOption public prime;
    AggregatorInterface public _oracle;

    address payable[]  public _optionMarkets;
    mapping(address => bool) public isValidOption;


    // Total Options held in Pool. Each Option is 1:1 with Ether underlying.
    uint256 public _totalOptionSupply;
    

    uint256 public _test;

    /* For testing */
    uint256 public constant THOUSAND_BPS = 10;
    uint256 public constant FIVE_HUNDRED_BPS = 20;
    uint256 public constant ONE_HUNDRED_BPS = 100;

    event Deposit(uint256 deposit, address indexed user, uint256 minted);
    event Withdraw(uint256 withdraw, address indexed user, uint256 burned);

    constructor (
        address compoundDaiAddress,
        address oracle
    ) 
        public
        ERC20(
            "Market Maker Primitive Underlying LP",
            "mPULP"
        )
    {
        _cDai = ICDai(compoundDaiAddress);
        _oracle = AggregatorInterface(oracle);
    }

    function addMarket(address payable primeOption) public onlyOwner returns (address) {
        // Assume the first option defines the series (strike and underlying assets + expiration)
        if(_optionMarkets.length == 0) {
            prime = IPrimeOption(primeOption);
        }
        isValidOption[primeOption] = true;
        _optionMarkets.push(primeOption);
        IPrimeOption _prime = IPrimeOption(primeOption);

        // Assume this is DAI
        IERC20 strike = IERC20(_prime.tokenS());
        strike.approve(primeOption, 1000000000 ether);
        strike.approve(address(_cDai), 1000000000 ether);
        
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
        if(address(underlying) == address(prime)) {
            require(msg.value == amount && msg.value > 0, "ERR_BAL_ETH");
        } else {
            require(underlying.balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_UNDERLYING");
        }
        

        /* EFFECTS */

        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance
        uint256 amountToMint;
        uint256 totalSupply = totalSupply();
        uint256 poolBalance = totalPoolBalance();
         
        // If liquidity is not intiialized, mint LP tokens equal to deposit
        if(poolBalance.mul(totalSupply) == 0) {
            amountToMint = amount;
        } else {
            amountToMint = amount.mul(totalSupply).div(poolBalance);
        }

        /* INTERACTIONS */

        emit Deposit(amount, msg.sender, amountToMint);
        _mint(msg.sender, amountToMint);

        // Assume we hold the underlying asset until it is utilized in minting a Prime
        if(address(underlying) == address(prime)) {
            return true;
        } else {
            return underlying.transferFrom(msg.sender, address(this), amount);
        }
        
    }


    //  REFACTOR
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
        require(maxLiquidityWithdrawable() >= amount, "ERR_BAL_RESERVE");

        /* EFFECTS */

        IERC20 strike = IERC20(prime.tokenS());
        IPrimeRedeem redeem = IPrimeRedeem(prime.tokenR());

        // Total Redeem Balance = Strike Balance in Redeem Contract
        uint256 maxRedeem = redeem.balanceOf(address(this));

        // Price of Underlying, Assume ETH
        uint256 price = uint(_oracle.currentAnswer());
        
        // Total Strike Balance in Pool Contract
        uint256 strikeBalance = strike.balanceOf(address(this));

        // Total Strike balance across contracts
        uint256 totalStrike = maxRedeem.add(strikeBalance);

        // Convert the strike assets, assume a stablecoin, to their ETH value
        uint256 strikeInEth = totalStrike.mul(1 ether).div(price).div(1 ether);

        // Pool Balance in Ether is the Pool's Ether Balance + Strike Assets denominated in Ether
        uint256 poolBalance = totalUnutilized().add(strikeInEth);

        // Total Underlying, Assume ETH, that will be withdrawn using LP tokens
        uint256 underlyingToWithdraw = amount.mul(poolBalance).div(totalSupply());
        uint256 strikeToWithdraw;

        // If the Pool does not have enough ETH, send the remainder denominated in strike assets (stablecoins)
        if(underlyingToWithdraw > totalEtherBalance()) {
            uint256 remainder = underlyingToWithdraw.sub(totalEtherBalance());
            strikeToWithdraw = remainder.mul(price).div(1 ether);
            // Redeem the strike assets
            require(strike.balanceOf(address(redeem)) >= strikeToWithdraw, "ERR_BAL_STRIKE");
            redeem.redeem(strikeToWithdraw);

            // Set the underlying withdraw amount to the total ether pool balance
            underlyingToWithdraw = underlyingToWithdraw.sub(remainder);
        }

        /* INTERACTIONS */

        // Burn The LP Tokens
        _burn(msg.sender, amount);
        emit Withdraw(underlyingToWithdraw, msg.sender, amount);
    

        // Transfer the remainder in strike assets
        if(strikeToWithdraw > 0) {
            strike.transfer(msg.sender, strikeToWithdraw);
        }
    
        // Transfer the underlying
        IERC20 underlying = IERC20(prime.tokenU());
        if(address(underlying) == address(prime)) {
            return sendEther(msg.sender, underlyingToWithdraw);
        } else {
            return underlying.transfer(msg.sender, underlyingToWithdraw);
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
        IPrimeOption option = IPrimeOption(optionAddress);

        require(totalUnutilized() >= amount, "ERR_BAL_UNDERLYING");


        uint256 premium = amount.div(FIVE_HUNDRED_BPS); 


        uint256 price = uint(_oracle.currentAnswer());

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

        _totalOptionSupply = _totalOptionSupply.add(amount);
        option.mint(amount);
        
        return option.transfer(msg.sender, amount);
    }

    /**
     * @dev User Redeems their Options for Premium.
     * @param amountToRedeem Quantity of options to redeem.
     * @param optionAddress The option's address to redeem from.
     */
    function redeem(
        uint256 amountToRedeem,
        address optionAddress
    )
        external
        whenNotPaused
        returns (bool) 
    {
        /* CHECKS */

        // Assert the option is valid in the pool
        require(isValidOption[optionAddress] , "ERR_INVALID_OPTION");
        IPrimeOption option = IPrimeOption(optionAddress);

        
        require(option.balanceOf(msg.sender) >= amountToRedeem, "ERR_BAL_OPTION");

        _totalOptionSupply = _totalOptionSupply.sub(amountToRedeem);

        // Would be 5% of 1 ETH of 1 Redeemed Option = 0.05 ETH. FIX - NEEDS TO ACCOUNT FOR EXPIRATION
        uint256 maxExtrinsic = amountToRedeem.div(ONE_HUNDRED_BPS);

        // Assume this is ETH's USD Price. Call Intrinsic Value = Market Price - Strike.
        uint256 price = uint(_oracle.currentAnswer());

        // Assume qStrike is a stablecoin pegged to $1
        uint256 intrinsic;
        if(option.ratio() > price) {
            intrinsic = 0;
        } else {
            intrinsic = price.sub(option.ratio());
        }

        uint256 maxEth = maxExtrinsic.add(intrinsic);
        require(totalUnutilized() >= maxEth, "ERR_BAL_ETH");

        // Transfer Options from User to Pool contract
        option.transferFrom(msg.sender, address(this), amountToRedeem);

        // Convert Options back into underlying assets (ETH) by closing the option
        option.close(amountToRedeem);

        // Send the premium to the redeemer (seller)
        _test = maxEth;
        return sendEther(msg.sender, maxEth);
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
    function totalPoolBalance() public view returns (uint256) {
        return totalOptionSupply().add(totalUnutilized());
    }


    /**
     * @dev max amount of LP tokens that can be burned to withdraw underlying assets
     * @notice Max Burn = Underlying Balance * Total Supply of LP Tokens / Total Underlying + Strike Assets denominated in the Underlying
     * @return uint256 max amount of tokens that can be burned to withdraw underlying assets
     */
    function maxLiquidityWithdrawable() public view returns (uint256) {
        /* LP = (ET - L) * ST / ET where ST = Total Supply */
        uint256 maxLiquidity = totalUnutilized().mul(totalSupply()).div(totalPoolBalance());
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

    function totalOptionSupply() public view returns (uint256) {
        return _totalOptionSupply;
    }

    function totalEtherBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

    