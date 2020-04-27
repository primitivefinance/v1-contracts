pragma solidity ^0.6.2;

/**
 * @title   Primitive's Market Maker Pool
 * @author  Primitive
 */


import "./PrimeInterface.sol";
import "./controller/Instruments.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";


interface IWETH {
    function deposit() external payable;
    function withdraw(uint wad) external;
    function totalSupply() external view returns (uint);
    function approve(address guy, uint wad) external returns (bool);
    function transfer(address dst, uint wad) external returns (bool);
    function transferFrom(address src, address dst, uint wad) external returns (bool);
}

interface AggregatorInterface {
  function currentAnswer() external view returns (int256);
}


contract PrimePool is Ownable, Pausable, ReentrancyGuard, ERC20 {
    using SafeMath for uint256;

    uint256 public constant THOUSAND_BPS = 10;
    uint256 public constant FIVE_HUNDRED_BPS = 20;
    uint256 public constant ONE_HUNDRED_BPS = 100;

    AggregatorInterface public oracle;

    address public tokenU;
    address public tokenS;
    address public tokenR;
    address payable public weth;
    address[] public _optionMarkets;

    uint256 public cacheR;
    uint256 public cacheU;
    uint256 public cacheS;

    mapping(address => bool) public isValidOption;

    event Deposit(address indexed user, uint256 inTokenU, uint256 outTokenPULP);
    event Withdraw(address indexed user, uint256 outTokenU, uint256 inTokenR);
    event Buy(address indexed user, uint256 inTokenS, uint256 outTokenU, uint256 premium);
    event Fund(uint256 cacheU, uint256 cacheS, uint256 cacheR);
    event Market(address tokenP);

    constructor (
        address payable _weth,
        address _oracle,
        string memory name,
        string memory symbol,
        address _tokenU,
        address _tokenS
    ) 
        public
        ERC20(name, symbol)
    {
        oracle = AggregatorInterface(_oracle);
        weth = _weth;
        tokenU = _tokenU;
        tokenS = _tokenS;
    }

    function assets() public view returns (address _tokenU, address _tokenS) {
        _tokenU = tokenU;
        _tokenS = tokenS;
    }

    function _fund(uint256 _cacheU, uint256 _cacheS, uint256 _cacheR) private {
        cacheU = _cacheU;
        cacheS = _cacheS;
        cacheR = _cacheR;
        emit Fund(cacheU, cacheS, cacheR);
    }

    function addMarket(address tokenP) public onlyOwner returns (address) {
        isValidOption[tokenP] = true;
        _optionMarkets.push(tokenP);
        address _tokenR = IPrime(tokenP).tokenR();
        tokenR = _tokenR;

        IERC20(tokenS).approve(tokenP, 1000000000 ether);
        IERC20(tokenU).approve(tokenP, 1000000000 ether);
        IERC20(_tokenR).approve(tokenP, 1000000000 ether);
        emit Market(tokenP);
        return tokenP;
    }


    receive() external payable {
        assert(msg.sender == weth);
    }


    /* =========== MAKER FUNCTIONS =========== */

    /**
     * @dev Adds liquidity by depositing tokenU. Receives tokenPULP.
     * @param amount The quantity of tokenU to deposit.
     * @return bool True if the transaction suceeds.
     */
    function deposit(
        uint256 amount
    )
        external
        payable
        whenNotPaused
        nonReentrant
        returns (bool)
    {

        // Store locally for gas savings.
        address _tokenU = tokenU;
        if(_tokenU == weth) {
            require(msg.value == amount && amount > 0, "ERR_BAL_ETH");
        } else {
            require(IERC20(_tokenU).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_UNDERLYING");
        }
        

        // Mint LP tokens proportional to the Total LP Supply and Total Pool Balance
        uint256 outTokenPULP;
        uint256 _cacheU = cacheU;
        uint256 totalSupply = totalSupply();
         
        // If liquidity is not intiialized, mint LP tokens equal to deposit
        if(_cacheU.mul(totalSupply) == 0) {
            outTokenPULP = amount;
        } else {
            require(amount.mul(totalSupply) >= _cacheU, "ERR_ZERO");
            outTokenPULP = amount.mul(totalSupply).div(_cacheU);
        }


        _mint(msg.sender, outTokenPULP);
        _fund(amount, cacheS, cacheR);
        emit Deposit(msg.sender, amount, outTokenPULP);

        // Assume we hold the _tokenU asset until it is utilized in minting a Prime
        if(_tokenU == weth) {
            IWETH(weth).deposit.value(msg.value)();
            return true;
        } else {
            return IERC20(_tokenU).transferFrom(msg.sender, address(this), amount);
        }
    }

    /**
     * @dev liquidity Provider burns their tokenPULP for proportional amount of tokenU + tokenS.
     * @notice  outTokenU = inTokenPULP * cacheU / total supply tokenPULP, 
     *          outTokenS = inTokenPULP * cacheR / total supply tokenPULP 
     *          If the pool is fully utilized and there are no strike assets to redeem,
     *          the LPs will have to wait.
     * @param amount The quantity of liquidity tokens to burn.
     * @return bool Returns true if liquidity tokens were burned both tokenU + tokenS were sent to user.
     */
    function withdraw(
        uint256 amount,
        address tokenP
    ) 
        external 
        nonReentrant 
        returns (bool)
    {
        // Check tokenPULP balance.
        require(balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_PULP");
        
        // Burn tokenPULP.
        _burn(msg.sender, amount);

        // Store locally for gas savings.
        address _tokenU = tokenU;
        address _tokenS = tokenS;
        address _tokenR = tokenR;
        uint256 totalSupply = totalSupply();

        // Current balance.
        uint256 balanceU = IERC20(_tokenU).balanceOf(address(this));

        // outTokenU = inTokenPULP * cached balance of tokenU / Total Supply of tokenPULP
        uint256 outTokenU = amount.mul(cacheU).div(totalSupply);

        // outTokenR = inTokenPULP * cached balance of tokenR / Total Supply of tokenPULP
        // tokenR is redeemable for 1:1 of tokenS.
        // Redeem outTokenS amount of tokenR.
        // Send redeemed tokenS to msg.sender.
        uint256 outTokenR = amount.mul(cacheR).div(totalSupply);

        // Cached balance of tokenS in tokenP must be >= outTokenR.
        (uint256 maxDraw) = IPrime(tokenP).maxDraw();
        require(maxDraw >= outTokenR, "ERR_BAL_STRIKE");

        // Send tokenR to tokenP so we can call redeem() later to tokenP.
        IERC20(_tokenR).transfer(tokenP, outTokenR);

        // Current balances.
        balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint256 balanceS = IERC20(_tokenS).balanceOf(address(this));
        uint256 balanceR = IERC20(_tokenR).balanceOf(address(this));

        // Update cached balances.
        _fund(balanceU, balanceS, balanceR);
        emit Withdraw(msg.sender, outTokenU, outTokenR);
    
        // Call redeem.
        (uint256 inTokenR) = IPrime(tokenP).redeem(msg.sender);
        assert(inTokenR == outTokenR);

        // Send outTokenU to msg.sender.
        if(_tokenU == weth) {
            IWETH(weth).withdraw(outTokenU);
            return sendEther(msg.sender, outTokenU);
        } else {
            return IERC20(_tokenU).transfer(msg.sender, outTokenU);
        }
    }


    /* =========== TAKER FUNCTIONS =========== */


    /**
     * @dev Purchase ETH Put -> tokenU is DAI and tokenS is WETH. Pool holds tokenU.
     */
    function buy(
        uint256 amount,
        address tokenP
    )
        public 
        payable
        nonReentrant
        returns (bool)
    {
        // Store locally for gas savings.
        address _tokenP = tokenP; // Assume Option
        address _tokenU = tokenU; // Assume DAI
        address _tokenS = tokenS; // Assume ETH

        // Premium is 1% - FIX
        uint256 premium = amount.div(ONE_HUNDRED_BPS);

        // Premium is paid in tokenS. If tokenS is WETH, its paid with ETH.
        if(_tokenS == weth) {
            require(msg.value >= premium && premium > 0, "ERR_BAL_ETH");
            IWETH(weth).deposit.value(premium)();
        } else {
            require(IERC20(_tokenS).balanceOf(msg.sender) >= amount && amount > 0, "ERR_BAL_STRIKE");
        }

        // Current balance.
        uint256 balanceU = IERC20(_tokenU).balanceOf(address(this));

        // ex. 0.99*10^18 ETH * 100*10^18 DAI / 10^18 = 0.99*10^18 * 100 = 99*10^18 DAI = outTokenU
        uint256 outTokenU = amount.mul(IPrime(_tokenP).ratio()).div(1 ether); 

        // Transfer tokenU (assume DAI) to option contract using Pool funds.
        require(balanceU >= outTokenU, "ERR_BAL_UNDERLYING");
        IERC20(_tokenU).transfer(_tokenP, outTokenU);

        // Mint Prime.
        (uint256 inTokenU,) = IPrime(_tokenP).mint(address(this)); // MAYBE FIX MINT FUNC

        // Send Prime to msg.sender.
        IPrime(_tokenP).transfer(msg.sender, inTokenU);

        // Current balances.
        balanceU = IERC20(_tokenU).balanceOf(address(this));
        uint256 balanceS = IERC20(_tokenS).balanceOf(address(this));
        uint256 balanceR = IERC20(tokenR).balanceOf(address(this));

        // Update cached balances.
        _fund(balanceU, balanceS, balanceR);
        emit Buy(msg.sender, amount, outTokenU, premium);
        return true;
    }

    /* CAPITAL MANAGEMENT FUNCTIONS */

    /**
     @dev function to send ether with the most security
     */
    function sendEther(address payable user, uint256 amount) internal returns (bool) {
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }
}

    