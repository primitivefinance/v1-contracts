pragma solidity ^0.6.2;

/**
 * @title Protocol Registry Contract for Deployed Options
 * @author Primitive
 */

import "../../interfaces/IOption.sol";
import "../../interfaces/IRegistry.sol";
import "../../interfaces/IFactory.sol";
import "../../interfaces/IFactoryRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract Registry is IRegistry, Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint;

    address public factory;
    address public factoryRedeem;
    address[] public activeOptions;

    mapping(address => bool) public isSupported;
    mapping(bytes32 => address) public options;

    event Deploy(address indexed from, address indexed tokenP, bytes32 indexed id);
    constructor() public { transferOwnership(msg.sender); }

    function initialize(address _factory, address _factoryRedeem) external override onlyOwner {
        factory = _factory;
        factoryRedeem = _factoryRedeem;
    }

    function addSupported(address token) external override onlyOwner {
        isSupported[token] = true;
    }

    function deployOption(address tokenU, address tokenS, uint base, uint quote, uint expiry)
        external
        override
        nonReentrant
        whenNotPaused
        returns (address option)
    {
        // Checks
        require(tokenU != tokenS && isSupported[tokenU] && isSupported[tokenS], "ERR_ADDRESS");
        bytes32 id = getId(tokenU, tokenS, base, quote, expiry);
        require(options[id] == address(0), "ERR_OPTION_DEPLOYED");

        // Deploy option and redeem.
        option = IFactory(factory).deploy(tokenU, tokenS, base, quote, expiry);
        options[id] = option;
        activeOptions.push(option);
        address redeem = IFactoryRedeem(factoryRedeem).deploy(option, tokenS);

        IFactory(factory).initialize(option, redeem);
        emit Deploy(msg.sender, option, id);
    }

    function kill(address option) external override onlyOwner {
        IFactory(factory).kill(option);
    }

    function optionsLength() public view override returns (uint len) {
        len = activeOptions.length;
    }

    function getId(address tokenU, address tokenS, uint base, uint quote, uint expiry)
        public pure returns (bytes32 id) {
        id = keccak256(abi.encodePacked(tokenU, tokenS, base, quote, expiry));
    }

    function getOption(address tokenU, address tokenS, uint base, uint quote, uint expiry)
        public view returns (address option) {
        option = options[getId(tokenU, tokenS, base, quote, expiry)];
    }
}