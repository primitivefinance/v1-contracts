pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Creator Contract
 * @author Primitive
 */

import "../PrimeOption.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ControllerOption is Ownable {
    using SafeMath for uint256;

    uint256 public _marketNonce;

    constructor(
        address _controller
    ) public {
        transferOwnership(_controller);
    }

    function addOption(
        string calldata name,
        string calldata symbol,
        address tokenU,
        address tokenS,
        uint256 base,
        uint256 price,
        uint256 expiry
    )
        external
        onlyOwner
        returns (address, uint256)
    {
        _marketNonce = _marketNonce.add(1);
        PrimeOption tokenP = new PrimeOption(
            name,
            symbol,
            _marketNonce,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );
        return (address(tokenP), _marketNonce);
    }

    function setRedeem(address tokenR, address tokenP) public onlyOwner returns (bool) {
        PrimeOption option = PrimeOption(tokenP);
        return option.initTokenR(tokenR);
    }
}

