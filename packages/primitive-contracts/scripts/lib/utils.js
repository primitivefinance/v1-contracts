const verifyContract = async (
    fullName,
    address,
    constructorArgs,
    libraries
) => {
    await run("verify-contract", {
        contractName: fullName,
        address: address,
        constructorArguments: constructorArgs,
        libraries: JSON.stringify(libraries),
    });
};

Object.assign(module.exports, {
    verifyContract,
});
