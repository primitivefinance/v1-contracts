pragma solidity ^0.6.2;

/**
 * @title Primitive's Base ERC-20 Option
 * @author Primitive
 */

import "./PrimeInterface.sol";
import "./controller/Instruments.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrimeOption is ERC20, ReentrancyGuard {
    using SafeMath for uint256;

    uint256 public constant DENOMINATOR = 1 ether;

    address public factory;
    address public tokenR;

    uint256 public marketId;
    uint256 public cacheU;
    uint256 public cacheS;
    
    Instruments.PrimeOption public option;

    function getCaches() public view returns (uint256 _cacheU, uint256 _cacheS) {
        _cacheU = cacheU;
        _cacheS = cacheS;
    }

    event Mint(address indexed from, uint256 amount);
    event Swap(address indexed from, uint256 amount, uint256 strikes);
    event Redeem(address indexed from, uint256 amount);
    event Close(address indexed from, uint256 amount);
    event Fund(uint256 cacheU, uint256 cacheS);

    constructor (
        string memory name,
        string memory symbol,
        uint256 _marketId,
        address tokenU,
        address tokenS,
        uint256 ratio,
        uint256 expiry
    ) 
        public
        ERC20(name, symbol)
    {
        marketId = _marketId;
        factory = msg.sender;
        option = Instruments.PrimeOption(
            tokenU,
            tokenS,
            ratio,
            expiry
        );
    }

    receive() external payable {}

    function setRPulp(address _redeem) public returns (bool) {
        require(msg.sender == factory, 'ERR_NOT_OWNER');
        tokenR = _redeem;
        return true;
    }

    /**
     * @dev Sets the cache balances to new values.
     */
    function _fund(uint256 balanceU, uint256 balanceS) private {
        cacheU = balanceU;
        cacheS = balanceS;
        emit Fund(balanceU, balanceS);
    }

    /**
     * @dev Mint Primes by depositing tokenU.
     * @notice Also mints Prime Redeem tokens.
     * @param amount Quantity of Prime options to mint.
     */
    function safeMint(uint256 amount) external nonReentrant returns (uint256 primes, uint256 redeems) {
        verifyBalance(IERC20(option.tokenU).balanceOf(msg.sender), amount, "ERR_BAL_UNDERLYING");
        IERC20(option.tokenU).transferFrom(msg.sender, address(this), amount);
        (primes, redeems) = mint();
    }

    /**
     * @dev Core function to mint the Primes.
     */
    function mint() public returns (uint256 primes, uint256 redeems) {
        uint256 balanceU = IERC20(option.tokenU).balanceOf(address(this));
        primes = balanceU.sub(cacheU);
        redeems = primes.mul(option.ratio).div(DENOMINATOR);
        require(primes > 0 && redeems > 0, "ERR_ZERO");
        IPrimeRedeem(tokenR).mint(msg.sender, redeems);
        _mint(msg.sender, primes);
        _fund(balanceU, cacheS);
        emit Mint(msg.sender, primes);
    }

    /**
     * @dev Swaps tokenS to tokenU using Ratio as the exchange rate.
     * @notice Burns Prime, contract receives tokenS, user receives tokenU.
     * @param amount Quantity of Primes to use to swap.
     */
    function safeSwap(uint256 amount) external nonReentrant returns (bool) {
        verifyBalance(balanceOf(msg.sender), amount, "ERR_BAL_PRIME");
        uint256 strikes = amount.mul(option.ratio).div(DENOMINATOR);
        IERC20(option.tokenS).transferFrom(msg.sender, address(this), strikes);
        return swap();
    }

    /**
     * @dev Private function to update balances.
     */
    function swap() public returns (bool) {
        uint256 balanceS = IERC20(option.tokenS).balanceOf(address(this));
        uint256 balanceU = IERC20(option.tokenU).balanceOf(address(this));
        uint256 strikes = balanceS.sub(cacheS);
        uint256 underlyings = strikes.mul(DENOMINATOR).div(option.ratio);

        _burn(msg.sender, underlyings);
        IERC20(option.tokenU).transfer(msg.sender, underlyings);

        balanceS = IERC20(option.tokenS).balanceOf(address(this));
        _fund(balanceU, balanceS);

        emit Swap(msg.sender, underlyings, strikes);
        return true;
    }

    /**
     * @dev Burns Prime Redeem tokens to withdraw available tokenS.
     * @param amount Quantity of Prime Redeem to spend.
     * @return bool True if burn and transfer succeeds.
     */
    function withdraw(uint256 amount) external nonReentrant returns (bool) {
        return _withdraw(amount, msg.sender);
    }

    /**
     * @dev Private function to burn tokenR and withdraw tokenS.
     */
    function _withdraw(uint256 amount, address payable receiver) private returns (bool) {
        uint256 balanceR = IPrimeRedeem(tokenR).balanceOf(receiver);
        verifyBalance(balanceR, amount, "ERR_BAL_REDEEM");

        uint256 balanceS = IERC20(option.tokenS).balanceOf(address(this));
        verifyBalance(balanceS, amount, "ERR_BAL_STRIKE");

        IPrimeRedeem(tokenR).burn(receiver, amount);
        IERC20(option.tokenS).transfer(receiver, amount);

        balanceS = IERC20(option.tokenS).balanceOf(address(this));
        _fund(cacheU, balanceS);

        emit Redeem(msg.sender, amount);
        return true;
    }

    /**
     * @dev Burn Prime and Prime Redeem tokens to withdraw tokenU.
     * @param amount Quantity of Primes to burn.
     * @return bool if the transaction succeeds
     */
    function close(uint256 amount) external returns (bool) {

        uint256 balanceR = IPrimeRedeem(tokenR).balanceOf(msg.sender);
        uint256 redeems = amount.mul(option.ratio).div(DENOMINATOR);

        verifyBalance(balanceR, redeems, "ERR_BAL_REDEEM");
        verifyBalance(balanceOf(msg.sender), amount, "ERR_BAL_PRIME");

        IPrimeRedeem(tokenR).burn(msg.sender, redeems);        
        _burn(msg.sender, amount);

        IERC20(option.tokenU).transfer(msg.sender, amount);
        uint256 balanceU = IERC20(option.tokenU).balanceOf(address(this));
        _fund(balanceU, cacheS);
        emit Close(msg.sender, amount);
        return true;
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

    function tokenS() public view returns (address) {
        return option.tokenS;
    }

    function tokenU() public view returns (address) {
        return option.tokenU;
    }

    function ratio() public view returns (uint256) {
        return option.ratio;
    }

    function expiry() public view returns (uint256) {
        return option.expiry;
    }

    function maxDraw() public view returns (uint256 draw) {
        uint256 bal = IPrimeRedeem(tokenR).balanceOf(msg.sender);
        cacheU > bal ?
            draw = bal :
            draw = cacheU;
    }
}