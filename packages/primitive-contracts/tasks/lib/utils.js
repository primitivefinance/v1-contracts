const bre = require("@nomiclabs/buidler/config");
const { ethers } = require("ethers");
const { parseEther } = ethers.utils;
const { AddressZero } = ethers.constants;

async function checkAllowance(owner, spender, token) {
    const amount = parseEther("10000000000");
    let allowance = await token.allowance(owner.address, spender.address);
    if (allowance <= amount) {
        await token.approve(spender.address, amount, { from: owner.address });
    }
}

async function checkInitialization(registry, factory, factoryRedeem) {
    const fac = await registry.factory();
    if (fac == AddressZero)
        await registry.initialize(factory.address, factoryRedeem.address);
}

module.exports = {
    checkAllowance,
    checkInitialization,
};
