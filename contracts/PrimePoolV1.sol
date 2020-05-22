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
    event Withdraw(address indexed from, uint inTokenPULP, uint outTokenU, uint outTokenR);

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
    function deposit(address to, uint inTokenU)
        external
        whenNotPaused
        nonReentrant
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
        (outTokenPULP) = _addLiquidity(_tokenP, to, inTokenU);

        // Assume we hold the tokenU asset until it is utilized in minting a Prime.
        (success) = IERC20(tokenU).transferFrom(to, address(this), inTokenU);
    }

    /**
     * @dev Private function to mint tokenPULP to depositor.
     */
    function _addLiquidity(address _tokenP, address to, uint inTokenU)
        private
        returns (uint outTokenPULP)
    {
        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance.
        (uint balanceU, uint balanceR) = totalBalances();
        uint _totalSupply = totalSupply();

        // If liquidity is not intiialized, mint the initial liquidity.
        if(_totalSupply == 0) {
            outTokenPULP = inTokenU.mul(IPrime(_tokenP).price()).div(1 ether);
        } else {
            uint equityU = inTokenU.mul(_totalSupply).div(balanceU);
            uint equityR = inTokenU.mul(_totalSupply).div(balanceR);
            outTokenPULP = equityU.add(equityR);
        }

        require(outTokenPULP > 0, "ERR_ZERO_LIQUIDITY");
        _mint(to, outTokenPULP);
        emit Deposit(to, inTokenU, outTokenPULP);
    }

    /**
     * @dev liquidity Provider burns their tokenPULP for proportional amount of tokenU + tokenR.
     * @notice  outTokenU = inTokenPULP * balanceU / Total Supply tokenPULP, 
     *          outTokenR = inTokenPULP * balanceR / Total Supply tokenPULP,
     * @param inTokenPULP The quantity of liquidity tokens to burn.
     */
    function withdraw(address to, uint inTokenPULP) external nonReentrant returns (bool) {
        // Check tokenPULP balance.
        require(balanceOf(to) >= inTokenPULP && inTokenPULP > 0, "ERR_BAL_PULP");
        
        // Store for gas savings.
        address _tokenP = tokenP;
        (uint balanceU, uint balanceR) = totalBalances();
        (address tokenU, , address tokenR) = IPrime(_tokenP).getTokens();
        uint _totalSupply = totalSupply();

        // Calculate output amounts.
        uint outTokenU = inTokenPULP.mul(balanceU).div(_totalSupply);
        uint outTokenR = inTokenPULP.mul(balanceR).div(_totalSupply);
        require(balanceU >= outTokenU && balanceR >= outTokenR, "ERR_BAL_OUTPUT");
        require(outTokenU > 0 || outTokenR > 0, "ERR_ZERO");
        // Burn tokenPULP.
        _burn(to, inTokenPULP);
        // Push outTokenU to `to` address.
        emit Withdraw(to, inTokenPULP, outTokenU, outTokenR);
        return IERC20(tokenU).transfer(to, outTokenU) && IERC20(tokenR).transfer(to, outTokenR);
    }

    function totalBalances() public view returns (uint balanceU, uint balanceR) {
        (address tokenU, , address tokenR) = IPrime(tokenP).getTokens();
        balanceU = IERC20(tokenU).balanceOf(address(this));
        balanceR = IERC20(tokenR).balanceOf(address(this));
    }
} 