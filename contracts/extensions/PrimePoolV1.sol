pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Pool
 * @author  Primitive
 */

import "../interfaces/IPrime.sol";
import "../interfaces/IPrimePool.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimePoolV1 is IPrimePool, Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint;

    uint public constant MIN_LIQUIDITY = 10**4;

    address public override factory;
    address public override tokenP;

    event Deposit(address indexed from, uint inTokenU, uint outTokenPULP);
    event Withdraw(address indexed from, uint inTokenPULP, uint outTokenU);

    constructor(address _tokenP, address _factory)
        public
        ERC20("Primitive V1 Pool", "PULP")
    {
        tokenP = _tokenP;
        factory = _factory;
    }

    function kill() public override onlyOwner returns (bool) { paused() ? _unpause() : _pause(); }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(address _tokenP, address to, uint inTokenU, uint totalBalance)
        internal
        returns (uint outTokenPULP)
    {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint _totalSupply = totalSupply();
        uint price = IPrime(_tokenP).price();

        // If liquidity is not intiialized, mint the initial liquidity.
        if(_totalSupply == 0) {
            outTokenPULP = inTokenU;
        } else {
            outTokenPULP = inTokenU.mul(_totalSupply).div(totalBalance);
        }

        require(outTokenPULP > uint(0) && outTokenPULP >= MIN_LIQUIDITY, "ERR_LIQUIDITY");
        _mint(to, outTokenPULP);
        emit Deposit(to, inTokenU, outTokenPULP);
    }

    function _removeLiquidity(address to, uint inTokenPULP, uint totalBalance)
        internal
        returns (uint outTokenU)
    {
        require(balanceOf(to) >= inTokenPULP && inTokenPULP > 0, "ERR_BAL_PULP");
        uint _totalSupply = totalSupply();

        // Calculate output amounts.
        outTokenU = inTokenPULP.mul(totalBalance).div(_totalSupply);
        require(outTokenU > uint(0), "ERR_ZERO");
        // Burn tokenPULP.
        _burn(to, inTokenPULP);
        emit Withdraw(to, inTokenPULP, outTokenU);
    }

    function _write(address receiver, uint outTokenU) internal returns (uint outTokenP) {
        address _tokenP = tokenP;

        // Transfer underlying tokens to option contract.
        IERC20(IPrime(_tokenP).tokenU()).transfer(_tokenP, outTokenU);

        // Mint Prime and Prime Redeem to the receiver.
        (outTokenP, ) = IPrime(_tokenP).mint(receiver);
    }

    function _exercise(address receiver, uint inTokenS, uint inTokenP)
        internal
        returns (uint outTokenU)
    {
        address _tokenP = tokenP;
        // Transfer strike token to option contract.
        IERC20(IPrime(_tokenP).tokenS()).transfer(_tokenP, inTokenS);

        // Transfer prime token to option contract.
        IERC20(_tokenP).transferFrom(msg.sender, _tokenP, inTokenP);
        
        // Call the exercise function to receive underlying tokens.
        (, outTokenU) = IPrime(_tokenP).exercise(receiver, inTokenP, new bytes(0));
    }

    function _flash(address receiver, uint outTokenU, bytes memory data)
        internal
        returns (bool)
    {
        // Call the exercise function to receive underlying tokens.
        IPrime(tokenP).exercise(receiver, outTokenU, data);
        return true;
    }

    function _redeem(address receiver, uint outTokenR) internal returns (uint inTokenS) {
        address _tokenP = tokenP;
        // Push tokenR to _tokenP so we can call redeem() and pull tokenS.
        IERC20(IPrime(_tokenP).tokenR()).transfer(_tokenP, outTokenR);
        // Call redeem function to pull tokenS.
        inTokenS = IPrime(_tokenP).redeem(receiver);
    }

    function _close(uint inTokenR, uint inTokenP) internal returns (uint outTokenU) {
        address _tokenP = tokenP;
        // Transfer redeem to the option contract.
        IERC20(IPrime(_tokenP).tokenR()).transfer(_tokenP, inTokenR);

        // Transfer prime token to prime contract.
        IERC20(_tokenP).transferFrom(msg.sender, _tokenP, inTokenP);
        
        // Call the close function to have the receive underlying tokens.
        (,,outTokenU) = IPrime(_tokenP).close(address(this));
    }

    function balances() public override view returns (uint balanceU, uint balanceR) {
        (address tokenU, , address tokenR) = IPrime(tokenP).getTokens();
        balanceU = IERC20(tokenU).balanceOf(address(this));
        balanceR = IERC20(tokenR).balanceOf(address(this));
    }
} 