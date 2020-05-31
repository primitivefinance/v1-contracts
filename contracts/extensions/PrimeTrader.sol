pragma solidity ^0.6.2;

/**
 * @title   Trader
 * @notice  Abstracts the interfacing with the protocol for ease-of-use.
 * @author  Primitive
 */

import "../interfaces/IPrime.sol";
import "../interfaces/IPrimeTrader.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimeTrader is IPrimeTrader, ReentrancyGuard {
    using SafeMath for uint;

    address payable public weth;

    constructor (address payable _weth) public { weth = _weth; }

    /**
     * @dev Mint Primes by depositing tokenU.
     * @notice Also mints Prime Redeem tokens. Calls msg.sender with transferFrom.
     * @param tokenP The address of the Prime Option contract.
     * @param amount Quantity of Prime options to mint and tokenU to deposit.
     * @param receiver The newly minted tokens are sent to the receiver address.
     */
    function safeMint(IPrime tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenU, uint outTokenR)
    {
        require(amount > 0, "ERR_ZERO");
        IERC20(tokenP.tokenU()).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenU, outTokenR) = tokenP.mint(receiver);
    }

    /**
     * @dev Swaps tokenS to tokenU using the strike ratio as the exchange rate.
     * @notice Burns Prime, contract receives tokenS, user receives tokenU.
     * @param tokenP The address of the Prime Option contract.
     * @param amount Quantity of Prime options to exercise.
     * @param receiver The underlying tokens are sent to the receiver address.
     */
    function safeExercise(
        IPrime tokenP,
        uint amount,
        address receiver
    )
        external
        override
        nonReentrant
        returns (uint inTokenS, uint inTokenP, uint outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        inTokenS = amount.mul(tokenP.price()).div(tokenP.base());
        IERC20(tokenP.tokenS()).transferFrom(msg.sender, address(tokenP), inTokenS);
        IERC20(address(tokenP)).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenS, inTokenP) = tokenP.exercise(receiver, amount, new bytes(0));
    }

    /**
     * @dev Burns Prime Redeem tokens to withdraw available tokenS.
     * @notice inTokenR = outTokenS.
     * @param tokenP The address of the Prime Option contract.
     * @param amount Quantity of Redeems to burn.
     * @param receiver The strike tokens are sent to the receiver address.
     */
    function safeRedeem(IPrime tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR)
    {
        require(amount > 0, "ERR_ZERO");
        // There can be the case there is no available tokenS to redeem, causing a revert.
        IERC20(tokenP.tokenR()).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenR) = tokenP.redeem(receiver);
    }

    /**
     * @dev Burn Prime and Prime Redeem tokens to withdraw tokenU.
     * @notice The Prime Redeems to burn is equal to the Primes * strike ratio.
     * inTokenP = inTokenR / strike ratio = outTokenU
     * @param tokenP The address of the Prime Option contract.
     * @param amount Quantity of Primes to burn.
     * @param receiver The underlying tokens are sent to the receiver address.
     */
    function safeClose(IPrime tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR, uint inTokenP, uint outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        inTokenR = amount.mul(tokenP.price()).div(tokenP.base());
        IERC20(tokenP.tokenR()).transferFrom(msg.sender, address(tokenP), inTokenR);
        IERC20(address(tokenP)).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenR, inTokenP, outTokenU) = tokenP.close(receiver);
    }

    /**
     * @dev Burn Prime Redeem tokens to withdraw tokenU and tokenS from expired options.
     * @param tokenP The address of the Prime Option contract.
     * @param amount Quantity of Redeems to burn.
     * @param receiver The underlying tokens are sent to the receiver address.
     */
    function safeUnwind(IPrime tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR, uint inTokenP, uint outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        require(tokenP.expiry() < block.timestamp, "ERR_NOT_EXPIRED");
        inTokenR = amount.mul(tokenP.price()).div(tokenP.base());
        IERC20(tokenP.tokenR()).transferFrom(msg.sender, address(tokenP), inTokenR);
        (inTokenR, inTokenP, outTokenU) = tokenP.close(receiver);
    }
}