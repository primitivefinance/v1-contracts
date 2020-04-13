pragma solidity ^0.6.2;

/**
 * @title   Primitive's Market Maker Pool Contract
 * @author  Primitive
 */


import '../Instruments.sol';
import './InterfaceERC20.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import '@openzeppelin/contracts/lifecycle/Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';

abstract contract ICEther {
    function mint() external payable virtual;
    function redeem(uint redeemTokens) external virtual returns (uint);
    function redeemUnderlying(uint redeemAmount) external virtual returns (uint);
    function transfer(address dst, uint amount) external virtual returns (bool);
    function transferFrom(address src, address dst, uint amount) external virtual returns (bool);
    function approve(address spender, uint amount) external virtual returns (bool);
    function allowance(address owner, address spender) external virtual view returns (uint);
    function balanceOf(address owner) external virtual view returns (uint);
    function balanceOfUnderlying(address owner) external virtual returns (uint);
    function getAccountSnapshot(address account) external virtual view returns (uint, uint, uint, uint);
    function borrowRatePerBlock() external virtual view returns (uint);
    function supplyRatePerBlock() external virtual view returns (uint);
    function totalBorrowsCurrent() external virtual returns (uint);
    function borrowBalanceCurrent(address account) external virtual returns (uint);
    function borrowBalanceStored(address account) public virtual view returns (uint);
    function _exchangeRateCurrent() public virtual returns (uint);
    function _exchangeRateStored() public virtual view returns (uint);
    function getCash() external virtual view returns (uint);
    function accrueInterest() public virtual returns (uint);
    function seize(address liquidator, address borrower, uint seizeTokens) external virtual returns (uint);
}

contract PoolERC20 is Ownable, Pausable, ReentrancyGuard, ERC20, ERC20Detailed {
    using SafeMath for uint256;

    /* Address of Prime ERC-721 */
    address public _primeAddress;
    address public _compoundEthAddress;
    address public _exchangeAddress;

    ICEther public _cEther;
    IPrimeERC20 public _prime;

    /* Ether liability */
    uint256 public _liability;

    /* For testing */
    uint256 public constant _premiumDenomination = 5; /* 20% = 0.2 = 1 / 5 */

    event Deposit(uint256 deposit, address indexed user, uint256 minted);
    event Withdraw(uint256 withdraw, address indexed user, uint256 burned);
    event PoolMint(uint256 nonce, uint256 qUnderlying, uint256 qStrike, uint256 indexed tExpiry);
    event Exercise(uint256 amount, uint256 qStrike);
    event Close(uint256 amountClosed, address indexed user, uint256 burned);

    constructor (
        address primeAddress,
        address compoundEthAddress,
        address exchangeAddress
    ) 
        public
        ERC20Detailed(
            "Market Maker Primitive LP",
            "mPULP",
            18
        )
    {
        _exchangeAddress = exchangeAddress;
        _prime = IPrimeERC20(primeAddress);
        _cEther = ICEther(compoundEthAddress);
        _compoundEthAddress = compoundEthAddress;
    }

    /* SET */
    function setExchangeAddress(address exchangeAddress) external onlyOwner {
        _exchangeAddress = exchangeAddress;
    }

    receive() external payable {}

    /* CAPITAL INPUT / OUTPUT FUNCTIONS*/

    /**
     * @dev deposits funds to the liquidity pool
     * @param amount amount of ether to deposit
     * @return bool true if liquidity tokens were minted and ether deposit swapped to cETher
     */
    function deposit(
        uint256 amount
    )
        external
        payable
        whenNotPaused
        returns (bool)
    {
        /* CHECKS */
        require(msg.value == amount, 'Deposit: Val < deposit');

        /* EFFECTS */
        uint256 totalSupply = totalSupply();
        uint256 poolBalance = getPoolBalance();
        uint256 amountToMint;
        
        if(poolBalance.mul(totalSupply) == 0) {
            amountToMint = amount;
        } else {
            amountToMint = amount.mul(totalSupply).div(poolBalance);
        }

        /* INTERACTIONS */
        emit Deposit(amount, msg.sender, amountToMint);
        _mint(msg.sender, amountToMint);

        // NEW DEPOSIT
        uint256 ethReturn = _prime.depositAndSell.value(amount)();
        return swapEtherToCompoundEther(ethReturn);
    }

    /**
     * @dev withdraw ether that is not utilized as collateral
     * @notice withdrawing utilized collateral requires the debt to be paid using the close function
     * @param amount amount of ether to withdraw
     * @return bool true if liquidity tokens were burned, cEther was swapped to ether and sent
     */
    function withdraw(
        uint256 amount
    ) 
        public 
        nonReentrant 
        returns (bool)
    {
        /* CHECKS */
        require(balanceOf(msg.sender) >= amount, 'Withdraw: Bal < withdraw');
        require(getMaxBurnAmount() >= amount, 'Withdraw: max burn < amt');

        /* EFFECTS */

        /* INTERACTIONS */
        _burn(msg.sender, amount);
        emit Withdraw(etherToCEther(amount), msg.sender, amount);
        return swapCEtherToEtherThenSend(amount, msg.sender);
    }

    /* GET BALANCE SHEET ITEMS */

    /**
     * @dev get ether balance of this contract
     * @return uint256 balance of this contract in ether
     */
    function getPoolBalance() public returns(uint256) {
        return _cEther.balanceOfUnderlying(address(this));
    }
    
    /**
     * @dev gets the total assets that are not being utilized as underlying assets in Primes
     * @notice Net Assets = Pool Assets - Pool Liabilities
     * @return pool amount of available assets
     */
    function getAvailableAssets() public returns (uint256) {
        uint256 poolBalance = getPoolBalance();
        if(_liability > poolBalance) {
            return 0;
        }
        uint256 available = poolBalance.sub(_liability);
        return available;
    }

    /**
     * @dev returns Total Supply / Total Pool Assets
     * @return pool returns 1 / Exchange Rate to use in LP token swaps
     */
    function totalSupplyDivTotalEther() public returns (uint256) {
        if(totalSupply().mul(getPoolBalance()) == 0) {
            return 1;
        }
        return totalSupply().div(getPoolBalance());
    }

    /**
     * @dev tokens to burn to withdraw non-utilized pool assets
     * @notice Max Burn = Net Assets * Total Supply / Total Pool Assets
     * @return uint256 max amount of tokens that can be burned for ether
     */
    function getMaxBurnAmount() public returns (uint256) {
        /* LP = (ET - L) * ST / ET where ST = Total Supply */
        uint256 maxBurn = getAvailableAssets().mul(totalSupply()).div(getPoolBalance());
        require(etherToCEther(maxBurn) <= getAvailableAssets(), 'Withdraw > net assets');
        return maxBurn;
    }

    /**
     * @dev returns the amount of ETH returned from swapped amount of Liquidity tokens
     * @notice Ether = Amount * Total Pool Assets / Total Supply
     * @return uint256 amount of cTokens proportional to parameter amount
     */
    function etherToCEther(uint256 amount) public returns (uint256) {
        if(totalSupply().mul(getPoolBalance()) == 0) {
            return amount;
        }
        return amount.mul(getPoolBalance()).div(totalSupply());
    }

    /* PRIME INTERACTION FUNCTIONS */

    /**
     * @dev user mints a Prime option from the pool
     * @param qUnderlying amount of ether (in wei)
     * @return bool whether or not the Prime is minted
     */
    function mintPrimeAndSell(
        uint256 qUnderlying
    )
        external
        payable
        whenNotPaused
        returns (bool) 
    {
        require(getAvailableAssets() >= qUnderlying, 'Mint: available < amt');
        uint256 ethReturn = _prime.depositAndSell.value(qUnderlying)();
        return swapEtherToCompoundEther(ethReturn);
    }

    /**
     * @dev Called ONLY from the Prime contract
     * @param qUnderlying amount of collateral
     */
    function redeem(
        uint256 qUnderlying
    )
        external
        payable
        whenNotPaused
        returns (bool) 
    {
        /* CHECKS */
        require(balanceOf(msg.sender) >= qUnderlying, 'Swap: ether < collat'); 
        uint256 qStrike = _prime.withdraw(qUnderlying);
        ERC20 _strike = ERC20(_prime._strikeAddress());
        _burn(msg.sender, qUnderlying);
        return _prime._strike().transfer(msg.sender, qStrike);
    }

    /**
     * @dev buy debt, withdraw capital
     * @notice user must purchase option and sell to pool, i.e. burn liability (Prime Token)
     * @param amount size of position to close and withdraw in ether
     * @return bool if the transaction suceeds
     */
    function closePosition(uint256 amount) external payable returns (bool) {
        /* CHECKS */
        uint256 userEthBal = balanceOf(msg.sender);
        require(userEthBal >= amount, 'Close: Eth Bal < amt');

        uint256 poolBalance = getPoolBalance();
        uint256 debt = amount.mul(_liability).div(poolBalance);
        require(msg.value >= debt, 'Close: Value < debt');

        /* EFFECTS */
        uint256 refundEther = msg.value.sub(debt);

        /* INTERACTIONS */
        _burn(msg.sender, amount);
        uint256 amountInCEther = etherToCEther(amount.add(refundEther));
        emit Close(amountInCEther, msg.sender, amount);
        return swapCEtherToEtherThenSend(amountInCEther, msg.sender);
    }


    /* CAPITAL MANAGEMENT FUNCTIONS */

    /**
     @dev function to send ether with the most security
     */
    function sendEther(uint256 amount, address payable user) internal returns (bool) {
        (bool success, ) = user.call.value(amount)("");
        require(success, "Send ether fail");
        return success;
    }

    /* COMPOUND INTERFACE FUNCTIONS */

    /**
     @dev converts ether to interest bearing cEther (Compound Protocol)
     @param amount ether that will be swapped to cEther
     */
    function swapEtherToCompoundEther(uint256 amount) internal returns (bool) {
        _cEther.mint.value(amount).gas(250000)();
        return true;
    }

    /**
     @dev converts cEther back into Ether
     @param amount ether that will be swapped to cEther
     */
    function swapCEtherToEtherThenSend(uint256 amount, address payable user) internal returns (bool) {
        uint256 redeemResult = _cEther.redeemUnderlying(amount);
        require(redeemResult == 0, 'redeem != 0');
        (bool success, ) = user.call.value(amount)("");
        require(success, 'Transfer fail.');
        return success;
    }

    function getSnapshot() public view returns (uint, uint, uint, uint) {
        return _cEther.getAccountSnapshot(msg.sender);
    }
}

    