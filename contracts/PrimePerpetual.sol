pragma solidity ^0.6.2;

/**
 * @title   Vanilla Perpetual Option
 * @author  Primitive
 */

import "./PrimePoolV1.sol";
import "./interfaces/IPrime.sol";
import "./interfaces/IPrimePool.sol";

interface ICDai {
    function mint(uint mintAmount) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
}

contract PrimePerpetual is PrimePoolV1 {
    using SafeMath for uint;

    address public constant CDAI = 0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643;

    uint public volatility;
    uint public fee;
    address public factory;
    address public tokenP;

    event Market(address tokenP);
    event Mint(address indexed from, uint inTokenS, uint outTokenU);
    event Redeem(address indexed from, uint inTokenP, uint outTokenS);

    constructor(address _tokenP, address _factory) public PrimePoolV1(_tokenP, _factory) {
        volatility = 100;
        fee = 1e15;
    }

    /**
     * @dev Mint perpetual.
     * @notice Deposit tokenS to receive tokenP, which is minted using the pool"s tokenU.
     */
    function mint(uint inTokenS) external nonReentrant whenNotPaused returns (bool) {
        // Store in memory for gas savings.
        address _tokenP = tokenP;
        (address tokenU, address tokenS, , uint base, uint price, ,) = IPrime(_tokenP).prime();


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
        require(IERC20(tokenU).balanceOf(address(this)) >= outTokenU, "ERR_BAL_UNDERLYING");
        (bool transferU) = IERC20(tokenU).transfer(_tokenP, outTokenU);

        // Mint Prime and Prime Redeem to this contract.
        // If outTokenU is zero because the numerator is smaller than the denominator,
        // or because the inTokenS is 0, the mint function will revert. This is because
        // the mint function only works when tokens are sent into the Prime contract.
        (uint inTokenP, ) = IPrime(_tokenP).write(address(this));

        // Pulls payment in tokenS from msg.sender and then pushes tokenP (option).
        // WARNING: Two calls to untrusted addresses.
        assert((IERC20(_tokenP).balanceOf(address(this)) >= inTokenP);
        emit Mint(msg.sender, inTokenS, outTokenU);

        // Pull tokenS.
        (bool received) = IERC20(tokenS).transferFrom(msg.sender, address(this), payment);
        // Swap tokenS to interest bearing version.
        swapToInterestBearing(payment);
        return received && transferU && IERC20(_tokenP).transfer(msg.sender, inTokenP);
    }

    /**
     * @dev User Redeems their Insured Dai for Dai
     * @param amountToRedeem amount of Insured Dai to convert to DAI
     */
    function redeem(uint inTokenP) external nonReentrant returns (bool) {
        address _tokenP = tokenP;
        address tokenS = IPrime(_tokenP).tokenS();
        address tokenR = IPrime(_tokenP).tokenR();
        require(IERC20(_tokenP).balanceOf(msg.sender) >= inTokenP, "ERR_BAL_PRIME");

        // Calculate amount of tokenS to push out.
        uint outTokenS = inTokenP.mul(price).div(base); 

        // Swap from interest bearing to push to msg.sender.
        swapFromInterestBearing(outTokenS);

        // Assume this is DAI
        assert(IERC20(tokenS).balanceOf(address(this)) >= outTokenS);

        // Transfer redeemed amount to msg.sender and option tokens to prime option.
        IERC20(tokenS).transfer(msg.sender, outTokenS);
        IERC20(_tokenP).transferFrom(msg.sender, _tokenP, inTokenP);
        IERC20(_tokenR).transfer(_tokenP, outTokenS);

        // Close the position, allowing the tokenU to return to the pool.
        IPrime(_tokenP).close(address(this));
        emit Redeem(msg.sender, inTokenP, outTokenS);
    }

    /**
     @dev converts Dai to interest bearing cDai (Compound Protocol)
     @param amount Dai that will be swapped to cDai
     */
    function swapToInterestBearing(uint amount) internal returns (bool) {
        (uint success ) = ICDai(CDAI).mint(amount);
        require(success == 0, "ERR_CDAI_MINT");
        return success == 0;
    }

    /**
     @dev converts cDai back into Dai
     @param amount Dai that will be swapped from cDai
     */
    function swapFromInterestBearing(uint amount) internal returns (bool) {
        uint redeemResult = ICDai(CDAI).redeemUnderlying(amount);
        require(redeemResult == 0, "ERR_REDEEM_CDAI");
        return redeemResult == 0;
    }
}

    