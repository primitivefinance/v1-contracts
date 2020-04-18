pragma solidity ^0.6.2;

/**
 * @title   Primitive's Market Maker Pool Contract
 * @author  Primitive
 */


import './controller/Instruments.sol';
import './PrimeInterface.sol';
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

contract PrimePerpetual is Ownable, Pausable, ReentrancyGuard, ERC20, ERC20Detailed {
    using SafeMath for uint256;

    address public _exchangeAddress;

    ICDai public _cDai;
    IPrimeOption public _prime;

    address payable[]  public _optionMarkets;

    uint256 public _test;

    /* For testing */
    uint256 public constant _premiumDenomination = 5; /* 20% = 0.2 = 1 / 5 */
    uint256 public constant FIVE_HUNDRED_BPS = 20; /* 5% = 0.05 = 1 / 20 */

    event Deposit(uint256 deposit, address indexed user, uint256 minted);
    event Withdraw(uint256 withdraw, address indexed user, uint256 burned);
    event PoolMint(uint256 nonce, uint256 qUnderlying, uint256 qStrike, uint256 indexed tExpiry);
    event Exercise(uint256 amount, uint256 qStrike);
    event Close(uint256 amountClosed, address indexed user, uint256 burned);

    constructor (
        /* address primeOption, */
        address compoundDaiAddress
        /* address exchangeAddress */
    ) 
        public
        ERC20Detailed(
            "Perpetual USDC Insurance Provider Pool",
            "iPULP",
            18
        )
    {
        /* _exchangeAddress = exchangeAddress; */
        /* _prime = IPrimeOption(primeOption); */
        _cDai = ICDai(compoundDaiAddress);
    }

    function addMarket(address payable primeOption) public onlyOwner returns (address) {
        _optionMarkets.push(primeOption);
        IPrimeOption prime = IPrimeOption(primeOption);

        // Assume this is DAI
        IERC20 strike = IERC20(prime.getStrike());
        strike.approve(primeOption, 1000000000 ether);
        strike.approve(address(_cDai), 1000000000 ether);
        
        // Assume this is USDC
        IERC20 underlying = IERC20(prime.getUnderlying());
        underlying.approve(primeOption, 1000000000 ether);

        IPrimeRedeem rPulp = IPrimeRedeem(prime._rPulp());
        rPulp.approve(primeOption, 1000000000 ether)
        return primeOption;
    }


    receive() external payable {}

    /* CAPITAL INPUT / OUTPUT FUNCTIONS*/

    /**
     * @dev Deposits USDC - Mints Options - Insurance Provider (IP) Receives IP Tokens called iPULP
     * @param amount amount of USDC to deposit
     * @return bool true if liquidity tokens were minted and Options were minted to PrimePerpetual
     */
    function deposit(
        uint256 amount
    )
        external
        payable
        whenNotPaused
        returns (bool)
    {
        /* CHECKS */

        // Assume this is 1 USDC / 1 DAI Option
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

        // Assume this is USDC
        IERC20 underlying = IERC20(prime.getUnderlying());

        // Assume this is checking for USDC Balance >= Deposit Amount
        require(underlying.balanceOf(msg.sender) >= amount, 'ERR_BAL_UNDERLYING');

        // Mint IP tokens proportionally so interest isnt applied retroactively

        /* EFFECTS */
        uint256 totalSupply = totalSupply();
        uint256 poolBalance = totalDaiAndUSDC();
        uint256 amountToMint;
         
        if(poolBalance.mul(totalSupply) == 0) {
            amountToMint = amount;
        } else {
            amountToMint = amount.mul(totalSupply).div(poolBalance);
        }

        /* INTERACTIONS */
        emit Deposit(amount, msg.sender, amountToMint);
        _mint(msg.sender, amountToMint);

        // Assume we hold the USDC until options need to be minted
        return underlying.transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Deposits DAI to receive iDAI Options - DAI that is Perpetually Insured by USDC
     */
    function insure(uint256 amount) public nonReentrant returns (bool) {
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

        // Check to see if there is available provider funds to mint the options
        require(totalUSDCBalance() >= amount, "ERR_BAL_UNDERLYING");

        // Check to see if User has enough DAI to pay the premium
        uint256 premium = amount.div(FIVE_HUNDRED_BPS);
        uint256 cost = amount.add(premium);

        // Assume this is DAI
        IERC20 strike = IERC20(prime.getStrike());
        require(strike.balanceOf(msg.sender) >= cost, "ERR_BAL_STRIKE");

        // Mint the insured DAI using the Pool's USDC Balance
        // Perpetual Should Have Approved Underlying Assets to Prime
        prime.deposit(amount);

        // Send the insured DAI - iDAI - to the User (options)
        assert(prime.balanceOf(address(this)) >= amount);
        prime.transfer(msg.sender, amount);
        
        // Transfer the DAI from the User
        strike.transferFrom(msg.sender, address(this), cost);

        // Convert the DAI to cDAI
        // Doesnt work unless you mint real DAI through the forked mainnet - or through rinkeby
        /* return swapDaiToCDai(cost); */
        return true;
    }

    /**
     * @dev Insurance Provider Withdraws USDC + Premiums by burning iPULP tokens
     * @notice if there is no available USDC, Insurance Providers must wait
     * @param amount amount of Insurance Provider Tokens to Burn
     * @return bool true if liquidity tokens were burned and DAI or USDC was sent to user
     */
    function withdraw(
        uint256 amount
    ) 
        public 
        nonReentrant 
        returns (bool)
    {
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

        /* CHECKS */
        require(balanceOf(msg.sender) >= amount, 'ERR_BAL_IPROVIDER');
        require(maxInsuranceProviderTokenBurnAmount() >= amount, 'ERR_BAL_USDC');

        /* EFFECTS */
        // Accrued interest from cDAI = Premiums
        uint256 totalPremiums = calculatePremiums();
        uint256 premiumsToWithdraw = amount.mul(totalPremiums).div(totalSupply());

        // USDC = IP Tokens
        uint256 usdcToWithdraw = amount;

        /* INTERACTIONS */

        // Burn IP Tokens
        _burn(msg.sender, amount);
        emit Withdraw(usdcToWithdraw, msg.sender, amount);
    
        // Swap cDAI to DAI then send to user
        /* swapCDaiToDai(premiumsToWithdraw); */

        IERC20 strike = IERC20(prime.getStrike());
        assert(strike.balanceOf(address(this)) >= premiumsToWithdraw);
        strike.transfer(msg.sender, premiumsToWithdraw);

        // Send USDC
        IERC20 underlying = IERC20(prime.getUnderlying());
        return underlying.transfer(msg.sender, usdcToWithdraw);
    }

    /**
     * @dev User Redeems their Insured Dai for Dai
     * @param amountToRedeem amount of Insured Dai to convert to DAI
     */
    function redeem(
        uint256 amountToRedeem
    )
        external
        whenNotPaused
        returns (bool) 
    {
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

        /* CHECKS */
        require(prime.balanceOf(msg.sender) >= amountToRedeem, 'ERR_BAL_INSUREDDAI');

        // Swap cDAI into amount DAI needed to redeem
        /* swapCDaiToDai(amountToRedeem); */

        // Assume this is DAI
        IERC20 strike = IERC20(prime.getStrike());
        assert(strike.balanceOf(address(this)) >= amountToRedeem);
        strike.transfer(msg.sender, amountToRedeem);

        // Transfer Options from User to PrimePerpetual contract
        prime.transferFrom(msg.sender, address(this), amountToRedeem);

        // Convert Options back into underlying assets (USDC) by closing the option
        return prime.close(amountToRedeem);
    }

    /**
     * @dev user can exercise through this contract?
     */
    function exercise() public returns (bool) {
        return true;
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
        // Assume this is a 1 USDC / 1 DAI Option
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

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

    /* GET BALANCE SHEET ITEMS */
    /**
     * @dev view function to get this contract's USDC Balance
     * @notice gets the total assets that are not being utilized as underlying assets in Prime Options
     */
    function totalDaiBalance() public view returns (uint256) {
        // Assume this is a 1 USDC / 1 DAI Option
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

        // Assume this is USDC
        IERC20 strike = IERC20(prime.getStrike());
        uint256 daiBalance = strike.balanceOf(address(this));
        return daiBalance;
    }


    /**
     * @dev view function to get this contract's USDC Balance
     * @notice gets the total assets that are not being utilized as underlying assets in Prime Options
     */
    function totalUSDCBalance() public view returns (uint256) {
        // Assume this is a 1 USDC / 1 DAI Option
        address primeAddress = _optionMarkets[0];
        IPrimeOption prime = IPrimeOption(primeAddress);

        // Assume this is USDC
        IERC20 underlying = IERC20(prime.getUnderlying());
        uint256 usdcBalance = underlying.balanceOf(address(this));
        return usdcBalance;
    }

    /**
     * @dev get total assets helpd by this contract USDC (unutilized assets) + cDAI (utilized Assets)
     * @return uint256 balance of this insured asset (DAI) in this contract
     */
    function totalDaiAndUSDC() public returns(uint256) {
        // Amount of DAI redeemed after converting entire contract balance of cDAI
        uint256 dai = _cDai.balanceOfUnderlying(address(this));
        uint256 usdc = totalUSDCBalance();

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
        uint256 maxBurn = totalUSDCBalance().mul(totalSupply()).div(totalDaiAndUSDC());
        require(maxBurn <= totalUSDCBalance(), 'ERR_BAL_UNUTILIZED');
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
     @dev converts Dai to interest bearing cDai (Compound Protocol)
     @param amount Dai that will be swapped to cDai
     */
    function swapDaiToCDai(uint256 amount) internal returns (bool) {
        (uint256 success ) = _cDai.mint(amount);
        _test = success;
        /* require(success == 0, "ERR_CDAI_MINT"); */
        return success == 0;
    }

    /**
     @dev converts cDai back into Dai
     @param amount Dai that will be swapped from cDai
     */
    function swapCDaiToDai(uint256 amount) internal returns (bool) {
        uint256 redeemResult = _cDai.redeemUnderlying(amount);
        require(redeemResult == 0, 'ERR_REDEEM_CDAI');
        return redeemResult == 0;
    }
}

    