pragma solidity ^0.6.2;

/**
 * @title Protocol Registry Contract for Deployed Options
 * @author Primitive
 */

import "../primitives/PrimeOption.sol";
import "../interfaces/IFactoryRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Factory is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint;

    uint public constant WEEK_SECONDS = 604800;

    address public admin;
    address public feeReceiver;
    address public factoryRedeem;

    mapping(bytes32 => address) public options;

    event Deploy(address indexed from, address indexed tokenP, bytes32 indexed id);

    constructor() public {
        admin = msg.sender;
    }

    function initialize(address _factoryRedeem) external onlyOwner {
        factoryRedeem = _factoryRedeem;
    }

    function deployOption(
        address tokenU,
        address tokenS,
        uint base,
        uint price,
        uint8 week
    )
        external
        nonReentrant
        whenNotPaused
        returns (address prime)
    {
        require(tokenU != tokenS && tokenU != address(0) && tokenS != address(0), "ERR_ADDRESS");
        uint expiry = week == uint8(0) ? uint(-1) : now.add(uint(week).mul(WEEK_SECONDS));
        bytes32 id = keccak256(abi.encodePacked(tokenU, tokenS, base, price, expiry));
        require(options[id] == address(0), "ERR_OPTION_DEPLOYED");
        prime = address(new PrimeOption(tokenU, tokenS, base, price, expiry));
        options[id] = prime;
        address redeem = IFactoryRedeem(factoryRedeem).deploy(prime, tokenS);
        PrimeOption(prime).initTokenR(redeem);
        //emit Deploy(msg.sender, prime, id);
    }

    /* function kill(bytes32 id) external onlyOwner {
        PrimeOption(options[id]).kill();
    } */

    /*
    function setFeeReceiver(address _feeReceiver) external onlyOwner {
        feeReceiver = _feeReceiver;
    }*/

    function getId(
        address tokenU,
        address tokenS,
        uint base,
        uint price,
        uint expiry
    ) public pure returns (bytes32 id) {
        id = keccak256(abi.encodePacked(tokenU, tokenS, base, price, expiry));
    } 
}