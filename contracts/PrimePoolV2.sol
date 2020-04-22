pragma solidity ^0.6.2;

/**
 * @title   Primitive's Market Maker Pool
 * @author  Primitive
 */


import './PrimeInterface.sol';
import './controller/Instruments.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/lifecycle/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';

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
  function latestAnswer() external view returns (uint256);
}

contract PrimePoolV2 is Ownable, Pausable, ReentrancyGuard, ERC20, ERC20Detailed {
    using SafeMath for uint256;

    ICDai public _cDai;
    IPrimeOption public prime;
    AggregatorInterface public _oracle;

    address payable[]  public _optionMarkets;
    mapping(address => bool) public isValidOption;

    // Maps User Addresses to Option Addresses and the User's claimable balance of options held in the Pool
    mapping(address => mapping(address => uint256)) public _optionBalance;

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
        ERC20Detailed(
            "Market Maker Primitive Underlying LP",
            "mPULP",
            18
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
        IERC20 strike = IERC20(_prime.getStrike());
        strike.approve(primeOption, 1000000000 ether);
        strike.approve(address(_cDai), 1000000000 ether);
        
        // Assume this is USDC
        IERC20 underlying = IERC20(_prime.getUnderlying());
        underlying.approve(primeOption, 1000000000 ether);

        IPrimeRedeem rPulp = IPrimeRedeem(_prime._rPulp());
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
        IERC20 underlying = IERC20(prime.getUnderlying());
        if(address(underlying) == address(prime)) {
            require(msg.value == amount, "ERR_BAL_ETH");
        } else {
            require(underlying.balanceOf(msg.sender) >= amount, "ERR_BAL_UNDERLYING");
        }
        

        /* EFFECTS */

        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance
        uint256 amountToMint;
        uint256 totalSupply = totalSupply();
        uint256 poolBalance = totalOptionSupply();
         
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
        require(maxInsuranceProviderTokenBurnAmount() >= amount, "ERR_BAL_RESERVE");

        /* EFFECTS */

        IERC20 strike = IERC20(prime.getStrike());
        IPrimeRedeem redeem = IPrimeRedeem(prime._rPulp());

        // Total Redeem Balance = Strike Balance in Redeem Contract
        uint256 maxRedeem = redeem.balanceOf(address(this));

        // Price of Underlying, Assume ETH
        uint256 price = _oracle.latestAnswer();
        
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
        assert(strike.balanceOf(address(this)) >= strikeToWithdraw);
        if(strikeToWithdraw > 0) {
            strike.transfer(msg.sender, strikeToWithdraw);
        }
    
        // Transfer the underlying
        IERC20 underlying = IERC20(prime.getUnderlying());
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
        // Assert the option is writable by the pool
        require(isValidOption[optionAddress], "ERR_INVALID_OPTION");
        IPrimeOption option = IPrimeOption(optionAddress);

        // Need Amount of Option * qUnderlying of Option amount of underlying assets to be unutilized
        uint256 minUnderlying = amount.mul(option.getQuantityUnderlying()).div(1 ether);

        // Check to see if there is available provider funds to mint the options
        require(totalUnutilized() >= minUnderlying, "ERR_BAL_UNDERLYING");

        // Check to see if User has enough ETH to pay the premium
        // Ex. Buying 1 Option = 1 Option * 1 ETH = 1 ETH Minimum
        // Premium Fee = 5%. Premium = 0.05 ETH. Extrinsic value.
        uint256 premium = minUnderlying.div(FIVE_HUNDRED_BPS); // FIX

        // Assume this is ETH's USD Price. Call Intrinsic Value = Market Price - Strike.
        uint256 price = _oracle.latestAnswer();

        uint256 intrinsic;
        if(option.getQuantityStrike() > price) {
            intrinsic = 0;
        } else {
            intrinsic = price.sub(option.getQuantityStrike());
        }

        uint256 cost = premium.add(intrinsic);

        require(msg.value >= cost, "ERR_BAL_ETH");

        // Update total option's minted by Pool
        _totalOptionSupply = _totalOptionSupply.add(amount);

        // Mint the option using the Pool's unutilized balance
        // Perpetual Should Have Approved Underlying Assets to Prime
        option.deposit(minUnderlying);

        // Send the options to the user
        assert(option.balanceOf(address(this)) >= amount);
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
        uint256 maxExtrinsic = amountToRedeem.mul(option.getQuantityUnderlying()).div(1 ether).div(ONE_HUNDRED_BPS);

        // Assume this is ETH's USD Price. Call Intrinsic Value = Market Price - Strike.
        uint256 price = _oracle.latestAnswer();

        // Assume qStrike is a stablecoin pegged to $1
        uint256 intrinsic;
        if(option.getQuantityStrike() > price) {
            intrinsic = 0;
        } else {
            intrinsic = price.sub(option.getQuantityStrike());
        }

        uint256 maxEth = maxExtrinsic.add(intrinsic);
        require(totalUnutilized() >= maxEth, "ERR_BAL_ETH");

        // Transfer Options from User to Pool contract
        option.transferFrom(msg.sender, address(this), amountToRedeem);

        // Convert Options back into underlying assets (ETH) by closing the option
        option.close(amountToRedeem);

        // Send the premium to the redeemer (seller)
        return sendEther(msg.sender, maxEth);
    }

    /**
     * @dev function to calculate premiums earned from net Dai deposits and cDai interest
     * @notice This is the difference between the total Dai owned by the pool and the total Dai
     * being insured. We can calculate the difference using the Prime Option Redeem Tokens as 
     * the amount of insured Dai. We subtract this amount from the total Dai owned by the Pool
     * to get the total Dai return.
     * FIX - SHOULD RETURN TO A NOT VIEW FUNCTION WHEN SWAPPING CDAI ENABLED
     */
    function calculatePremiums() public view returns (uint256) {

        // Get the Prime Redeem Token
        IERC20 redeem = IERC20(prime._rPulp());

        // Get the Redeem Token Balance of this Contract (corresponds to underwritten strike assets - Dai)
        uint256 redeemBalance = redeem.balanceOf(address(this));

        // Get the total Dai balance of the contract - includes interest accrued Dai
        /* uint256 daiBalance = _cDai.balanceOfUnderlying(address(this)); */
        IERC20 strike = IERC20(prime.getStrike());
        uint256 daiBalance = totalDaiBalance();

        // Get the net difference of Total Dai - Insured Dai
        assert(daiBalance > redeemBalance);
        uint256 premiums = daiBalance.sub(redeemBalance);

        return premiums;
    }

    /**
     * @dev Calculates the Pool Balance: Assets in Pool + Outstanding Borrows 
     */
    function totalPoolBalance() public view returns (uint256) {
        uint256 unutilized = totalUnutilized();
        return unutilized;

    }

    /* GET BALANCE SHEET ITEMS */
    /**
     * @dev view function to get this contract's USDC Balance
     * @notice gets the total assets that are not being utilized as underlying assets in Prime Options
     */
    function totalDaiBalance() public view returns (uint256) {

        // Assume this is USDC
        IERC20 strike = IERC20(prime.getStrike());
        uint256 daiBalance = strike.balanceOf(address(this));
        return daiBalance;
    }


    /**
     * @dev Gets the Unutilized asset balance of the Pool.
     * @notice Gets the total assets that are not being utilized as underlying assets in Prime Options.
     */
    function totalUnutilized() public view returns (uint256) {
        IERC20 underlying = IERC20(prime.getUnderlying());
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
    function totalUtilized() public view returns (uint256) {
        return totalOptionSupply();
    }
    

    /**
     * @dev get total assets helpd by this contract USDC (unutilized assets) + cDAI (utilized Assets)
     * @return uint256 balance of this insured asset (DAI) in this contract
     */
    function totalDaiAndUSDC() public returns(uint256) {
        // Amount of DAI redeemed after converting entire contract balance of cDAI
        uint256 dai = _cDai.balanceOfUnderlying(address(this));
        uint256 usdc = totalUnutilized();

        uint256 poolBalance = dai.add(usdc);
        return poolBalance;
    }

    /**
     * @dev max amount of LP tokens that can be burned to withdraw underlying assets USDC
     * @notice Max Burn = USDC Balance * Total Supply of IP Tokens / Total Dai + Total USDC
     * @return uint256 max amount of tokens that can be burned to withdraw underlying assets
     */
    function maxInsuranceProviderTokenBurnAmount() public returns (uint256) {
        /* LP = (ET - L) * ST / ET where ST = Total Supply */
        uint256 maxBurn = totalUnutilized().mul(totalSupply()).div(totalDaiAndUSDC());
        require(maxBurn <= totalUnutilized(), 'ERR_BAL_UNUTILIZED');
        return maxBurn;
    }

    /**
     * @dev returns the amount of USDC returned from burned amount of Insurance Provider Tokens
     * @notice USDC = Amount * Total Pool Assets / Total Supply
     * @return uint256 amount of cTokens proportional to parameter amount
     */
    function calculateUSDCWithdraw(uint256 amount) public returns (uint256) {
        if(totalSupply().mul(totalDaiAndUSDC()) == 0) {
            return amount;
        }
        return amount.mul(totalDaiAndUSDC()).div(totalSupply());
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

    function balanceOfOptions(address user, address option) public view returns (uint256) {
        return _optionBalance[user][option];
    }

    function totalOptionSupply() public view returns (uint256) {
        return _totalOptionSupply;
    }

    function totalEtherBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

    