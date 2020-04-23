pragma solidity ^0.6.2;

/**
 * @title Primitive's Market Creator Contract
 * @author Primitive
 */

import "../PrimeOption.sol";
import { IControllerMarket } from "./ControllerInterface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract ControllerOption is Ownable {
    using SafeMath for uint256;

    uint256 public _marketNonce;
    IControllerMarket public market;

    constructor(
        address controller
    ) public {
        transferOwnership(controller);
        market = IControllerMarket(controller);
    }

    function addOption(
        string calldata name,
        string calldata symbol,
        address tokenU,
        address tokenS,
        uint256 ratio,
        uint256 expiry
    )
        external
        onlyOwner
        returns (address payable, uint256)
    {
        _marketNonce = _marketNonce.add(1);
        PrimeOption primeOption = new PrimeOption(
            name,
            symbol,
            _marketNonce,
            tokenU,
            tokenS,
            ratio,
            expiry
        );
        return (address(primeOption), _marketNonce);
    }

    function setRedeem(address redeem, address payable primeOption) public onlyOwner returns (bool) {
        PrimeOption option = PrimeOption(primeOption);
        return option.setRPulp(redeem);
    }
}

