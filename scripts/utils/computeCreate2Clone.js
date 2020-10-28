const OptionContract = require("../../artifacts/Option.json");
const {
    arrayify,
    getCreate2Address,
    solidityKeccak256,
} = require("ethers/lib/utils");
const assembleClone = require("./assembleClone");

const OPTION_IMPLEMENTATION_SALT = solidityKeccak256(
    ["string"],
    ["primitive-option"]
);
const OPTION_INITCODEHASH = solidityKeccak256(
    ["bytes"],
    [OptionContract.bytecode]
);

const computeCreate2Clone = (factory, salt) => {
    const implementation = getCreate2Address(
        factory,
        arrayify(OPTION_IMPLEMENTATION_SALT),
        arrayify(OPTION_INITCODEHASH)
    );
    return getCreate2Address(
        factory,
        salt,
        arrayify(
            solidityKeccak256(
                ["bytes"],
                [assembleClone(factory, implementation)]
            )
        )
    );
};

module.exports = computeCreate2Clone;
