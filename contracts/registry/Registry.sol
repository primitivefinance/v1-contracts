pragma solidity ^0.6.2;

/**
 * @title Protocol Registry Contract for Deployed Options
 * @author Primitive
 */

import "../interfaces/IPrime.sol";
import "../interfaces/IRegistry.sol";
import "../interfaces/IFactory.sol";
import "../interfaces/IFactoryRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Registry is IRegistry, Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint;

    uint public constant WEEK_SECONDS = 604800;

    address public feeReceiver;
    address public factory;
    address public factoryRedeem;
    address[] public activeOptions;

    mapping(bytes32 => address) public options;

    event Deploy(address indexed from, address indexed tokenP, bytes32 indexed id);

    constructor() public { transferOwnership(msg.sender); }

    function initialize(address _factory, address _factoryRedeem) external onlyOwner {
        factory = _factory;
        factoryRedeem = _factoryRedeem;
    }

    function deployOption(
        address tokenU,
        address tokenS,
        uint base,
        uint price,
        uint expiry
    )
        external
        nonReentrant
        whenNotPaused
        returns (address prime)
    {
        // Do appropriate checks and calculate the expiry timestamp.
        require(tokenU != tokenS && tokenU != address(0) && tokenS != address(0), "ERR_ADDRESS");
        /* uint expiry = week == uint8(0) ? uint(-1) : now.add(uint(week).mul(WEEK_SECONDS)); */
        bytes32 id = getId(tokenU, tokenS, base, price, expiry);
        /* require(options[id] == address(0), "ERR_OPTION_DEPLOYED"); */

        // Deploy option and redeem.
        prime = IFactory(factory).deploy(tokenU, tokenS, base, price, expiry);
        options[id] = prime;
        activeOptions.push(prime);
        address redeem = IFactoryRedeem(factoryRedeem).deploy(prime, tokenS);

        IFactory(factory).initialize(prime, redeem);
        emit Deploy(msg.sender, prime, id);
    }

    function kill(address prime) external onlyOwner {
        IFactory(factory).kill(prime);
    }

    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        feeReceiver = _feeReceiver;
    }

    function optionsLength() public view returns (uint len) {
        len = activeOptions.length;
    }

    function getId(
        address tokenU,
        address tokenS,
        uint base,
        uint price,
        uint expiry
    ) public pure returns (bytes32 id) {
        id = keccak256(abi.encodePacked(tokenU, tokenS, base, price, expiry));
    }

    function getOption(
        address tokenU,
        address tokenS,
        uint base,
        uint price,
        uint expiry
    ) public view returns (address option) {
        option = options[getId(tokenU, tokenS, base, price, expiry)];
    }
}