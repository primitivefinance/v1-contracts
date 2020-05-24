pragma solidity ^0.6.2;

/**
 * @title Option Factory Contract
 * @author Primitive
 */

import "./PrimeOption.sol";
import "./interfaces/IFactoryRedeem.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Factory is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

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
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        external
        nonReentrant
        whenNotPaused
        returns (address prime)
    {
            prime = address(new PrimeOption(tokenU, tokenS, base, price, expiry));
            bytes32 id = keccak256(abi.encodePacked(tokenU, tokenS, base, price, expiry));
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
        uint256 base,
        uint256 price,
        uint256 expiry
    ) public pure returns (bytes32 id) {
        id = keccak256(abi.encodePacked(tokenU, tokenS, base, price, expiry));
    } 
}