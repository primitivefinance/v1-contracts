pragma solidity ^0.6.2;

/**
 * @title   Vanilla Option Pool
 * @author  Primitive
 */

import "./interfaces/IPrime.sol";
import "./interfaces/IPrimePool.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimePoolV1 is IPrimePool, Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint;

    uint public constant MIN_LIQUIDITY = 10**4;

    address public factory;
    address public tokenP;

    event Deposit(address indexed from, uint inTokenU, uint outTokenPULP);
    event Withdraw(address indexed from, uint inTokenPULP, uint outTokenU);

    constructor(address _tokenP, address _factory)
        public
        ERC20("Primitive V1 Pool", "PULP")
    {
        tokenP = _tokenP;
        factory = _factory;
    }

    function kill() public onlyOwner returns (bool) { paused() ? _unpause() : _pause(); }

    /**
     * @dev Adds liquidity by depositing tokenU. Receives tokenPULP.
     * @param inTokenU The quantity of tokenU to deposit.
     */
    function _deposit(address to, uint inTokenU)
        internal
        whenNotPaused
        returns (uint outTokenPULP, bool success)
    {
        // Store locally for gas savings.
        address _tokenP = tokenP;
        address tokenU = IPrime(_tokenP).tokenU();

        // Require inTokenU greater than 0 and the depositor to have the inTokenU.
        require(
            IERC20(tokenU).balanceOf(to) >= inTokenU &&
            inTokenU >= MIN_LIQUIDITY,
            "ERR_BAL_UNDERLYING"
        );

        // Add liquidity to pool and push tokenPULP to depositor.
        (outTokenPULP) = _addLiquidity(_tokenP, to, inTokenU, uint(1));

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        (success) = IERC20(tokenU).transferFrom(to, address(this), inTokenU);
    }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(address _tokenP, address to, uint inTokenU, uint totalBalance)
        internal
        returns (uint outTokenPULP)
    {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        uint _totalSupply = totalSupply();
        (, , , uint base, uint price,) = IPrime(_tokenP).prime();

        // If liquidity is not intiialized, mint the initial liquidity.
        if(_totalSupply == 0) {
            outTokenPULP = inTokenU.mul(IPrime(_tokenP).price()).div(1 ether);
        } else {
            outTokenPULP = inTokenU.mul(_totalSupply).div(totalBalance);
        }

        require(outTokenPULP > 0, "ERR_ZERO_LIQUIDITY");
        _mint(to, outTokenPULP);
        emit Deposit(to, inTokenU, outTokenPULP);
    }

    /**
     * @dev liquidity Provider burns their tokenPULP for proportional amount of tokenU.
     * @notice  outTokenU = inTokenPULP * Total balanceU / Total Supply tokenPULP
     * @param inTokenPULP The quantity of liquidity tokens to burn.
     */
    function _withdraw(address to, uint inTokenPULP, uint totalBalance)
        internal
        nonReentrant
        returns (bool)
    {
        // Check tokenPULP balance.
        require(balanceOf(to) >= inTokenPULP && inTokenPULP > 0, "ERR_BAL_PULP");
        
        // Store for gas savings.
        address _tokenP = tokenP;
        uint _totalSupply = totalSupply();
        (uint balanceU, uint balanceR) = balances();
        (address tokenU) = IPrime(_tokenP).tokenU();

        // Calculate output amounts.
        uint outTokenU = inTokenPULP.mul(totalBalance).div(_totalSupply);
        require(balanceU >= outTokenU && outTokenU > 0, "ERR_BAL_INSUFFICIENT");
        // Burn tokenPULP.
        _burn(to, inTokenPULP);
        // Push outTokenU to `to` address.
        emit Withdraw(to, inTokenPULP, outTokenU);
        return IERC20(tokenU).transfer(to, outTokenU);
    }

    function _removeLiquidity(address to, uint inTokenPULP, uint totalBalance)
        internal
        returns (uint outTokenU)
    {
        // Check tokenPULP balance.
        require(balanceOf(to) >= inTokenPULP && inTokenPULP > 0, "ERR_BAL_PULP");
        
        // Store for gas savings.
        uint _totalSupply = totalSupply();

        // Calculate output amounts.
        outTokenU = inTokenPULP.mul(totalBalance).div(_totalSupply);
        require(outTokenU > 0, "ERR_ZERO");
        // Burn tokenPULP.
        _burn(to, inTokenPULP);
        // Push outTokenU to `to` address.
        emit Withdraw(to, inTokenPULP, outTokenU);
    }

    function balances() public view returns (uint balanceU, uint balanceR) {
        (address tokenU, , address tokenR) = IPrime(tokenP).getTokens();
        balanceU = IERC20(tokenU).balanceOf(address(this));
        balanceR = IERC20(tokenR).balanceOf(address(this));
    }

    /* function totalBalance() public view returns (uint totalBalance) {
        (uint balanceU, uint balanceR) = balances();
        (, , , uint base, uint price,) = IPrime(tokenP).prime();
        totalBalance = balanceU.add(balanceR.mul(price).div(base));
    } */
} 