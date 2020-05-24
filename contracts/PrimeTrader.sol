pragma solidity ^0.6.2;

/**
 * @title   Primitive's Trader Contract
 * @notice  Safely interacts with the Prime Vanilla Option Primitive
 * @author  Primitive
 */

import "./interfaces/IPrime.sol";
import "./interfaces/IPrimeTrader.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimeTrader is IPrimeTrader, ReentrancyGuard {
    using SafeMath for uint256;

    address payable public weth;

    event Mint(address indexed from, uint256 outTokenP, uint256 outTokenR);
    event Exercise(address indexed from, uint256 outTokenU, uint256 inTokenS);
    event Redeem(address indexed from, uint256 inTokenR);
    event Close(address indexed from, uint256 inTokenP);

    constructor (address payable _weth) public {
        weth = _weth;
    }

    /**
     * @dev Mint Primes by depositing tokenU.
     * @notice Also mints Prime Redeem tokens. Calls msg.sender with transferFrom.
     * @param tokenP The address of the Prime Option to trade with.
     * @param amount Quantity of Prime options to mint and tokenU to deposit.
     * @param receiver The newly minted tokens are sent to the receiver address.
     */
    function safeMint(
        IPrime tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        override
        returns (uint256 inTokenU, uint256 outTokenR)
    {
        require(amount > 0, "ERR_ZERO");
        address tokenU = tokenP.tokenU();
        verifyBalance(
            IERC20(tokenU).balanceOf(msg.sender),
            amount,
            "ERR_BAL_UNDERLYING"
        );
        require(
            IERC20(tokenU).transferFrom(msg.sender, address(tokenP), amount),
            "ERR_TRANSFER_IN_FAIL"
        );
        (inTokenU, outTokenR) = tokenP.mint(receiver);
        emit Mint(msg.sender, inTokenU, outTokenR);
    }

    /**
     * @dev Swaps tokenS to tokenU using ratio as the exchange rate.
     * @notice Burns Prime, contract receives tokenS, user receives tokenU.
     * Calls msg.sender with transferFrom.
     * @param amount Quantity of Primes to use to swap.
     */
    function safeExercise(
        IPrime tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        override returns (uint256 inTokenS, uint256 inTokenP, uint256 outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        address tokenS = tokenP.tokenS();
        verifyBalance(
            IERC20(address(tokenP)).balanceOf(msg.sender),
            amount,
            "ERR_BAL_PRIME"
        );

        inTokenS = amount.mul(tokenP.price()).div(tokenP.base());
        verifyBalance(
            IERC20(tokenS).balanceOf(msg.sender),
            inTokenS,
            "ERR_BAL_STRIKE"
        );
        (bool inTransferS) = IERC20(tokenS).transferFrom(msg.sender, address(tokenP), inTokenS);
        (bool inTransferP) = IERC20(address(tokenP)).transferFrom(msg.sender, address(tokenP), amount);
        require(inTransferS && inTransferP, "ERR_TRANSFER_IN_FAIL");
        (inTokenS, inTokenP) = tokenP.exercise(receiver, amount, new bytes(0));
    }

    /**
     * @dev Burns Prime Redeem tokens to withdraw available tokenS.
     * @notice inTokenR = outTokenS
     * @param amount Quantity of Prime Redeem to spend.
     */
    function safeRedeem(
        IPrime tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        override returns (uint256 inTokenR)
    {
        require(amount > 0, "ERR_ZERO");
        address tokenS = tokenP.tokenS();
        address tokenR = tokenP.tokenR();

        verifyBalance(
            IERC20(tokenR).balanceOf(msg.sender),
            amount,
            "ERR_BAL_REDEEM"
        );

        // There can be the case there is no available tokenS to redeem.
        // This is the first verification of a tokenS balance to draw from.
        // There is a second verification in the redeem() function.
        verifyBalance(
            IERC20(tokenS).balanceOf(address(tokenP)),
            amount,
            "ERR_BAL_STRIKE"
        );
        IERC20(tokenR).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenR) = tokenP.redeem(receiver);
        emit Redeem(msg.sender, inTokenR);
    }

    /**
     * @dev Burn Prime and Prime Redeem tokens to withdraw tokenU.
     * @notice Takes paramter for quantity of Primes to burn.
     * The Prime Redeems to burn is equal to the Primes * ratio.
     * inTokenP = inTokenR / strike ratio = outTokenU
     * @param amount Quantity of Primes to burn.
     */
    function safeClose(
        IPrime tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        override returns (uint256 inTokenR, uint256 inTokenP, uint256 outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        address tokenR = tokenP.tokenR();

        inTokenR = amount.mul(tokenP.price()).div(tokenP.base());

        verifyBalance(
            IERC20(tokenR).balanceOf(msg.sender),
            inTokenR,
            "ERR_BAL_REDEEM"
        );

        verifyBalance(
            IERC20(address(tokenP)).balanceOf(msg.sender),
            amount,
            "ERR_BAL_PRIME"
        );

        IERC20(tokenR).transferFrom(msg.sender, address(tokenP), inTokenR);
        IERC20(address(tokenP)).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenR, inTokenP, outTokenU) = tokenP.close(receiver);
        emit Close(msg.sender, inTokenP);
    }

    /**
     * @dev Burn Prime Redeem tokens to withdraw tokenU and tokenS from expired options.
     * @notice Takes paramter for quantity of Primes to burn.
     * The Prime Redeems to burn is equal to the Primes * ratio.
     * @param amount Quantity of tokenU to withdraw.
     */
    function safeUnwind(
        IPrime tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        override returns (uint256 inTokenR, uint256 inTokenP, uint256 outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        require(tokenP.expiry() < block.timestamp, "ERR_NOT_EXPIRED");
        address tokenR = tokenP.tokenR();

        inTokenR = amount.mul(tokenP.price()).div(tokenP.base());

        verifyBalance(
            IERC20(tokenR).balanceOf(msg.sender),
            inTokenR,
            "ERR_BAL_REDEEM"
        );

        IERC20(tokenR).transferFrom(msg.sender, address(tokenP), inTokenR);
        (inTokenR, inTokenP, outTokenU) = tokenP.close(receiver);
        emit Close(msg.sender, inTokenP);
    }

    function verifyBalance(
        uint256 balance,
        uint256 minBalance,
        string memory errorCode
    ) internal pure {
        minBalance == 0 ?
            require(balance > minBalance, errorCode) :
            require(balance >= minBalance, errorCode);
    }
}