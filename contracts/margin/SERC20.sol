pragma solidity >=0.5.12 <=0.6.2;

import { IERC20, ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { IClearingHouse } from "./interfaces/IClearingHouse.sol";
import { ISERC20 } from "./interfaces/ISERC20.sol";

contract SERC20 is ERC20("Primitive Synthetic ERC20", "SERC20"), ISERC20 {
    IClearingHouse public house;

    function initialize(address houseAddress) public override {
        require(address(house) == address(0x0), "ERR_INTIIALIZED");
        house = IClearingHouse(houseAddress);
    }

    modifier onlyHouse {
        require(msg.sender == address(house), "ERR_NOT_HOUSE");
        _;
    }

    function mint(address to, uint256 quantity)
        external
        override
        onlyHouse
        returns (bool)
    {
        _mint(to, quantity);
        return true;
    }

    function burn(address to, uint256 quantity)
        external
        override
        onlyHouse
        returns (bool)
    {
        _burn(to, quantity);
        return true;
    }
}
