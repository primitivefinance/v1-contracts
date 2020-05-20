pragma solidity ^0.6.2;

/**
 * @title Option Factory Contract
 * @author Primitive
 */

import "./PrimeOption.sol";
/* import "./PrimeRedeem.sol"; */
import "@openzeppelin/contracts/access/Ownable.sol";

contract Factory is Ownable, Pausable, ReentrancyGuard {
    using SafeMath for uint256;

    string public constant SYMBOL = "PRIME";
    string public constant NAME = "Primitive Vanilla Option";
    string public constant RSYMBOL = "REDEEM";
    string public constant RNAME = "Primitive Strike Redeem";

    address public admin;
    uint256 public nonce;
    mapping(uint256 => address) public options;

    event Deploy(address indexed from, address indexed tokenP, address indexed tokenR);

    constructor() public {
        admin = msg.sender;
    }

    function deployOption(address tokenU, address tokenS, uint256 base, uint256 price, uint256 expiry)
        external nonReentrant whenNotPaused returns (address prime) {
            /* nonce = nonce.add(1); */
            uint256 _nonce = nonce;
            /* prime = address(new PrimeOption(NAME, SYMBOL, 1, tokenU, tokenS, base, price, expiry)); */
            /* options[_nonce] = prime; */
            /* address redeem = address(new PrimeRedeem(RNAME, RSYMBOL, prime, tokenS));
            PrimeOption(prime).initTokenR(redeem); */
            /* emit Deploy(msg.sender, prime, redeem); */
    }

    function kill(uint256 id) external onlyOwner {
        PrimeOption(options[id]).kill();
    }

}