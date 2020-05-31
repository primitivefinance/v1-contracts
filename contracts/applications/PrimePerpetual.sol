pragma solidity ^0.6.2;

/**
 * @title   Vanilla Perpetual Option Pool
 * @author  Primitive
 */

import "../extensions/PrimePoolV1.sol";
import "../interfaces/IPrime.sol";
import "../interfaces/ICToken.sol";
import "../interfaces/IPrimePerpetual.sol";

contract PrimePerpetual is IPrimePerpetual, PrimePoolV1 {
    using SafeMath for uint;

    address public override cdai;
    address public override cusdc;

    uint public override fee;

    event Market(address tokenP);
    event Insure(address indexed from, uint inTokenS, uint outTokenU);
    event Redemption(address indexed from, uint inTokenP, uint outTokenS);
    event Swap(address indexed from, uint inTokenP, uint outTokenS);

    constructor(address _cdai, address _cusdc, address _tokenP, address _factory)
        public PrimePoolV1(_tokenP, _factory)
    {
        fee = 1e15;
        cdai = _cdai;
        cusdc = _cusdc;
        IERC20(ICToken(_cusdc).underlying()).approve(_cusdc, 10000000000 ether);
        IERC20(ICToken(_cdai).underlying()).approve(_cdai, 100000000000 ether);
    }

    function deposit(uint inTokenU) external override whenNotPaused nonReentrant
        returns (uint outTokenPULP, bool success)
    {
        address _tokenP = tokenP;
        address tokenU = ICToken(cusdc).underlying();
        (uint totalBalance) = totalBalance();
        (outTokenPULP) = _addLiquidity(_tokenP, msg.sender, inTokenU, totalBalance);
        require(
            IERC20(tokenU).transferFrom(msg.sender, address(this), inTokenU) &&
            inTokenU >= MIN_LIQUIDITY,
            "ERR_BAL_UNDERLYING"
        );
        swapToInterestBearing(cusdc, inTokenU);
        success = true;
    }

    function withdraw(uint inTokenPULP) external override whenNotPaused nonReentrant returns (bool) {
        address _tokenP = tokenP;
        address tokenU = ICToken(cusdc).underlying();
        (uint totalBalance) = totalBalance();
        (uint outTokenU) = _removeLiquidity(msg.sender, inTokenPULP, totalBalance);
        swapFromInterestBearing(cusdc, outTokenU);
        (uint balanceU,) = balances();
        require(balanceU >= outTokenU, "ERR_BAL_INSUFFICIENT");
        return IERC20(tokenU).transfer(msg.sender, outTokenU);
    }

    /**
     * @dev Mint perpetual.
     * @notice Deposit tokenS to receive tokenP, which is minted using the pool's tokenU.
     */
    function mint(uint inTokenS) external override nonReentrant whenNotPaused returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (address tokenU, address tokenS, , uint base, uint price,) = IPrime(_tokenP).prime();

        // outTokenU = inTokenS * Quantity of tokenU (base) / Quantity of tokenS (price).
        // Units = tokenS * tokenU / tokenS = tokenU.
        uint outTokenU = inTokenS.mul(base).div(price);
        uint _fee = inTokenS.div(fee);
        uint payment = inTokenS.add(_fee);
        require(IERC20(tokenS).balanceOf(msg.sender) >= payment, "ERR_BAL_STRIKE");

        // Transfer tokenU (assume USDC) to option contract using Pool funds.
        // We do this because the mint function in the Prime contract will check the balance
        // against its previously cached balance. The difference is the amount of tokens that were
        // deposited, which determines how many Primes to mint.
        swapFromInterestBearing(cusdc, outTokenU);
        (uint inTokenP,) = _write(msg.sender, outTokenU);

        // Pull tokenS.
        IERC20(tokenS).transferFrom(msg.sender, address(this), payment);
        // Swap tokenS to interest bearing version.
        emit Insure(msg.sender, inTokenS, outTokenU);
        return swapToInterestBearing(cdai, payment);
    }

    /**
     * @dev Redeem tokenP for tokenS.
     */
    function redeem(uint inTokenP) external override nonReentrant returns (bool) {
        address _tokenP = tokenP;
        (, address tokenS, address tokenR, uint base, uint price,) = IPrime(_tokenP).prime();
        require(IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP, "ERR_BAL_PRIME");

        // Calculate amount of tokenS to push out.
        uint outTokenS = inTokenP.mul(price).div(base); 

        // Swap from interest bearing to push to msg.sender.
        swapFromInterestBearing(cdai, outTokenS);

        // Transfer redeemed amount to msg.sender and option tokens to prime option.
        IERC20(tokenS).transfer(msg.sender, outTokenS);

        // Close the option position by burning prime and redeem tokens.
        _close(outTokenS, inTokenP);
        emit Redemption(msg.sender, inTokenP, outTokenS);
    }

    function exercise(uint inTokenP) external override nonReentrant returns (bool) {
        address _tokenP = tokenP;
        (, address tokenS, address tokenR, uint base, uint price,) = IPrime(_tokenP).prime();
        require(IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP, "ERR_BAL_PRIME");

        // Calculate amount of tokenS to push out.
        uint outTokenS = inTokenP.mul(price).div(base); 

        // Swap from interest bearing to push to msg.sender.
        swapFromInterestBearing(cdai, outTokenS);

        // Exercise the options.
        _exercise(msg.sender, outTokenS, inTokenP);
        emit Swap(msg.sender, inTokenP, outTokenS);
    }

    /**
     * @dev Converts token to compound token.
     * @param token Address of the underlying token which should be converted to cToken version.
     * @param amount Quantity of token to convert to cToken.
     */
    function swapToInterestBearing(address token, uint amount) internal returns (bool) {
        (uint success ) = ICToken(token).mint(amount);
        require(success == 0, "ERR_CTOKEN_MINT");
        return success == 0;
    }

    /**
     * @dev Converts compound token back into underlying token.
     * @param token Address of the underlying token which should be converted from cToken.
     * @param amount Quantity of token to convert to cToken.
     */
    function swapFromInterestBearing(address token, uint amount) internal returns (bool) {
        uint redeemResult = ICToken(token).redeemUnderlying(amount);
        require(redeemResult == 0, "ERR_REDEEM_CTOKEN");
        return redeemResult == 0;
    }

    function interestBalances() public view override returns (uint balanceU, uint balanceR) {
        balanceU = ICToken(cusdc).balanceOfUnderlying(address(this));
        balanceR = ICToken(cdai).balanceOfUnderlying(address(this));
    }

    function totalBalance() public override view returns (uint totalBalance) {
        (uint balanceU,) = interestBalances();
        (, , address tokenR, uint base, uint price,) = IPrime(tokenP).prime();
        totalBalance = balanceU.add(IERC20(tokenR).balanceOf(address(this)).mul(base).div(price));
    }
}

    