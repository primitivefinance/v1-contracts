const { assert } = require("chai");

const assertBNEqual = (actualBN, expectedBN, message) => {
    assert.equal(actualBN.toString(), expectedBN.toString(), message);
};

const getTokenBalance = async (token, address) => {
    let bal = await token.balanceOf(address);
    return bal;
};

const verifyOptionInvariants = async (tokenU, strikeToken, optionToken, redeem) => {
    let underlyingBalance = await tokenU.balanceOf(optionToken.address);
    let underlyingCache = await optionToken.underlyingCache();
    let strikeCache = await optionToken.strikeCache();
    let strikeBalance = await strikeToken.balanceOf(optionToken.address);
    let optionBalance = await optionToken.balanceOf(optionToken.address);
    let redeemBalance = await redeem.balanceOf(optionToken.address);
    let optionTotalSupply = await optionToken.totalSupply();

    assertBNEqual(underlyingBalance, optionTotalSupply);
    assertBNEqual(underlyingCache, optionTotalSupply);
    assertBNEqual(strikeBalance, strikeCache);
    assertBNEqual(optionBalance, 0);
    assertBNEqual(redeemBalance, 0);
};

const getTokenBalances = async (Primitive, address) => {
    const underlyingBalance = await getTokenBalance(Primitive.underlyingToken, address);
    const strikeBalance = await getTokenBalance(Primitive.strikeToken, address);
    const redeemBalance = await getTokenBalance(Primitive.redeemToken, address);
    const optionBalance = await getTokenBalance(Primitive.optionToken, address);

    const tokenBalances = {
        underlyingBalance,
        strikeBalance,
        redeemBalance,
        optionBalance,
    };
    return tokenBalances;
};

module.exports = {
    assertBNEqual,
    verifyOptionInvariants,
    getTokenBalances,
    getTokenBalance,
};
