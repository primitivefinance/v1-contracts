pragma solidity ^0.6.2;

/**
 * @title Primitive's Trader Contract
 * @notice Safely interacts with the Prime Base ERC-20 Option
 * @author Primitive
 */

import "./PrimeInterface.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimeTrader is ReentrancyGuard {
    using SafeMath for uint256;

    uint256 public constant DENOMINATOR = 1 ether;

    address payable public weth;

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
        address tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        returns (uint256 inTokenU, uint256 outTokenR)
    {
        IPrime _tokenP = IPrime(tokenP);
        address _tokenU = _tokenP.tokenU();
        verifyBalance(
            IERC20(_tokenU).balanceOf(msg.sender),
            amount,
            "ERR_BAL_UNDERLYING"
        );
        IERC20(_tokenU).transferFrom(msg.sender, tokenP, amount);
        (inTokenU, outTokenR) = _tokenP.mint(receiver);
    }

    /**
     * @dev Swaps tokenS to tokenU using ratio as the exchange rate.
     * @notice Burns Prime, contract receives tokenS, user receives tokenU.
     * Calls msg.sender with transferFrom.
     * @param amount Quantity of Primes to use to swap.
     */
    function safeSwap(
        address tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        returns (uint256 inTokenS, uint256 inTokenP, uint256 outTokenU)
    {
        IPrime _tokenP = IPrime(tokenP);
        address _tokenS = _tokenP.tokenS();

        verifyBalance(
            _tokenP.balanceOf(msg.sender),
            amount,
            "ERR_BAL_PRIME"
        );

        inTokenS = amount.mul(_tokenP.ratio()).div(DENOMINATOR);
        verifyBalance(
            IERC20(_tokenS).balanceOf(msg.sender),
            inTokenS,
            "ERR_BAL_STRIKE"
        );
        IERC20(_tokenS).transferFrom(msg.sender, tokenP, inTokenS);
        _tokenP.transferFrom(msg.sender, tokenP, amount);
        (inTokenS, inTokenP, outTokenU) = _tokenP.swap(receiver);
    }

    /**
     * @dev Burns Prime Redeem tokens to withdraw available tokenS.
     * @param amount Quantity of Prime Redeem to spend.
     */
    function safeRedeem(
        address tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        returns (uint256 inTokenR)
    {
        IPrime _tokenP = IPrime(tokenP);
        address _tokenS = _tokenP.tokenS();
        address _tokenR = _tokenP.tokenR();

        verifyBalance(
            IERC20(_tokenR).balanceOf(msg.sender),
            amount,
            "ERR_BAL_REDEEM"
        );

        // There can be the case there is no available tokenS to redeem.
        // This is the first verification of a tokenS balance to draw from.
        // There is a second verification in the redeem() function.
        verifyBalance(
            IERC20(_tokenS).balanceOf(tokenP),
            amount,
            "ERR_BAL_STRIKE"
        );
        IERC20(_tokenR).transferFrom(msg.sender, tokenP, amount);
        (inTokenR) = _tokenP.redeem(receiver);
    }

    /**
     * @dev Burn Prime and Prime Redeem tokens to withdraw tokenU.
     * @notice Takes paramter for quantity of Primes to burn.
     * The Prime Redeems to burn is equal to the Primes * ratio.
     * @param amount Quantity of Primes to burn.
     */
    function safeClose(
        address tokenP,
        uint256 amount,
        address receiver
    )
        external
        nonReentrant
        returns (uint256 inTokenR, uint256 inTokenP, uint256 outTokenU)
    {
        IPrime _tokenP = IPrime(tokenP);
        address _tokenR = _tokenP.tokenR();
        uint256 ratio = _tokenP.ratio();

        inTokenR = amount.mul(ratio).div(DENOMINATOR);

        verifyBalance(
            IERC20(_tokenR).balanceOf(msg.sender),
            inTokenR,
            "ERR_BAL_REDEEM"
        );

        verifyBalance(
            _tokenP.balanceOf(msg.sender),
            amount,
            "ERR_BAL_PRIME"
        );

        IERC20(_tokenR).transferFrom(msg.sender, address(this), inTokenR);
        _tokenP.transferFrom(msg.sender, address(this), amount);
        (inTokenR, inTokenP, outTokenU) = _tokenP.close(receiver);
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