"use strict";

const assembleCloneCode = require("./assemble-clone-code");
const ethers = require("ethers");
const Option = require("@primitive/contracts/artifacts/Option");

const OPTION_SALT = ethers.utils.solidityKeccak256(
    ["string"],
    ["primitive-option"]
);
const OPTION_INITCODEHASH = ethers.utils.solidityKeccak256(
    ["bytes"],
    [Option.bytecode]
);

const computeOptionAddress = ({
    factory,
    tokenU,
    tokenS,
    base,
    quote,
    expiry,
}) => {
    const implementation = ethers.utils.getCreate2Address({
        from: factory,
        salt: ethers.utils.arrayify(OPTION_SALT),
        initCodeHash: ethers.utils.arrayify(OPTION_INITCODEHASH),
    });
    return ethers.utils.getCreate2Address({
        from: factory,
        salt: ethers.utils.arrayify(
            ethers.utils.solidityKeccak256(
                [
                    "bytes32",
                    "address",
                    "address",
                    "uint256",
                    "uint256",
                    "uint256",
                ],
                [OPTION_SALT, tokenU, tokenS, base, quote, expiry]
            )
        ),
        initCodeHash: ethers.utils.arrayify(
            ethers.utils.solidityKeccak256(
                ["bytes"],
                [assembleCloneCode(factory, implementation)]
            )
        ),
    });
};

module.exports = computeOptionAddress;
