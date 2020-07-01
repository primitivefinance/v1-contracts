pragma solidity ^0.6.2;

/**
 * @title   Trader
 * @notice  Abstracts the interfacing with the protocol for ease-of-use.
 * @author  Primitive
 */

import "../interfaces/IOption.sol";
import "../interfaces/ITrader.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract Trader is ITrader, ReentrancyGuard {
    using SafeMath for uint;

    address payable public weth;

    event Mint(address indexed from, uint256 outTokenP, uint256 outTokenR);
    event Exercise(address indexed from, uint256 outTokenU, uint256 inTokenS);
    event Redeem(address indexed from, uint256 inTokenR);
    event Close(address indexed from, uint256 inTokenP);

    constructor (address payable _weth) public { weth = _weth; }

    /**
     * @dev Mint s by depositing tokenU.
     * @notice Also mints  Redeem tokens. Calls msg.sender with transferFrom.
     * @param tokenP The address of the  Option contract.
     * @param amount Quantity of  options to mint and tokenU to deposit.
     * @param receiver The newly minted tokens are sent to the receiver address.
     */
    function safeMint(IOption tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenU, uint outTokenR)
    {
        require(amount > 0, "ERR_ZERO");
        IERC20(tokenP.tokenU()).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenU, outTokenR) = tokenP.mint(receiver);
        emit Mint(msg.sender, inTokenU, outTokenR);
    }

    /**
     * @dev Swaps tokenS to tokenU using the strike ratio as the exchange rate.
     * @notice Burns , contract receives tokenS, user receives tokenU.
     * @param tokenP The address of the  Option contract.
     * @param amount Quantity of  options to exercise.
     * @param receiver The underlying tokens are sent to the receiver address.
     */
    function safeExercise(IOption tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenS, uint inTokenP)
    {
        require(amount > 0, "ERR_ZERO");
        require(IERC20(address(tokenP)).balanceOf(msg.sender) >= amount, "ERR_BAL_PRIME");
        inTokenS = amount.add(amount.div(1000)).mul(tokenP.quote()).div(tokenP.base());
        //uint fee = inTokenS.div(1000);
        require(IERC20(tokenP.tokenS()).balanceOf(msg.sender) >= inTokenS, "ERR_BAL_STRIKE");
        IERC20(tokenP.tokenS()).transferFrom(msg.sender, address(tokenP), inTokenS);
        IERC20(address(tokenP)).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenS, inTokenP) = tokenP.exercise(receiver, amount, new bytes(0));
    }

    /**
     * @dev Burns  Redeem tokens to withdraw available tokenS.
     * @notice inTokenR = outTokenS.
     * @param tokenP The address of the  Option contract.
     * @param amount Quantity of Redeems to burn.
     * @param receiver The strike tokens are sent to the receiver address.
     */
    function safeRedeem(IOption tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR)
    {
        require(amount > 0, "ERR_ZERO");
        require(IERC20(tokenP.tokenR()).balanceOf(msg.sender) >= amount, "ERR_BAL_REDEEM");
        // There can be the case there is no available tokenS to redeem, causing a revert.
        IERC20(tokenP.tokenR()).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenR) = tokenP.redeem(receiver);
        emit Redeem(msg.sender, inTokenR);
    }

    /**
     * @dev Burn  and  Redeem tokens to withdraw tokenU.
     * @notice The  Redeems to burn is equal to the s * strike ratio.
     * inTokenP = inTokenR / strike ratio = outTokenU
     * @param tokenP The address of the  Option contract.
     * @param amount Quantity of s to burn.
     * @param receiver The underlying tokens are sent to the receiver address.
     */
    function safeClose(IOption tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR, uint inTokenP, uint outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        require(IERC20(address(tokenP)).balanceOf(msg.sender) >= amount, "ERR_BAL_PRIME");
        inTokenR = amount.mul(tokenP.quote()).div(tokenP.base());
        require(IERC20(tokenP.tokenR()).balanceOf(msg.sender) >= inTokenR, "ERR_BAL_REDEEM");
        IERC20(tokenP.tokenR()).transferFrom(msg.sender, address(tokenP), inTokenR);
        IERC20(address(tokenP)).transferFrom(msg.sender, address(tokenP), amount);
        (inTokenR, inTokenP, outTokenU) = tokenP.close(receiver);
        emit Close(msg.sender, inTokenP);
    }

    /**
     * @dev Burn  Redeem tokens to withdraw tokenU and tokenS from expired options.
     * @param tokenP The address of the  Option contract.
     * @param amount Quantity of Redeems to burn.
     * @param receiver The underlying tokens are sent to the receiver address.
     */
    function safeUnwind(IOption tokenP, uint amount, address receiver)
        external
        override
        nonReentrant
        returns (uint inTokenR, uint inTokenP, uint outTokenU)
    {
        require(amount > 0, "ERR_ZERO");
        require(tokenP.expiry() < block.timestamp, "ERR_NOT_EXPIRED");
        inTokenR = amount.mul(tokenP.quote()).div(tokenP.base());
        require(IERC20(tokenP.tokenR()).balanceOf(msg.sender) >= inTokenR, "ERR_BAL_REDEEM");
        IERC20(tokenP.tokenR()).transferFrom(msg.sender, address(tokenP), inTokenR);
        (inTokenR, inTokenP, outTokenU) = tokenP.close(receiver);
        emit Close(msg.sender, inTokenP);
    }
}