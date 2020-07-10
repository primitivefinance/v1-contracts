const { assert, expect } = require("chai");
const constants = require("./constants");
const { ethers } = require("ethers");
const { solidity } = require("ethereum-waffle");

const assertBNEqual = (actualBN, expectedBN, message) => {
    assert.equal(actualBN.toString(), expectedBN.toString(), message);
};

const assertWithinError = (actualBN, expectedBN, error, message) => {
    error = error;
    let max = expectedBN.add(expectedBN.div(error));
    let min = expectedBN.sub(expectedBN.div(error));
    if (actualBN.gt(0)) {
        expect(actualBN).to.be.a.bignumber.that.is.at.most(max);
        expect(actualBN).to.be.a.bignumber.that.is.at.least(min);
    } else {
        expect(actualBN).to.be.a.bignumber.that.is.at.most(0);
    }
};

const calculateAddLiquidity = (_inTokenU, _totalSupply, _totalBalance) => {
    let inTokenU = _inTokenU;
    let totalSupply = _totalSupply;
    let totalBalance = _totalBalance;
    if (totalBalance.eq(0)) {
        return inTokenU;
    }
    let liquidity = inTokenU.mul(totalSupply).div(totalBalance);
    return liquidity;
};

const calculateRemoveLiquidity = (
    _inTokenPULP,
    _totalSupply,
    _totalBalance
) => {
    let inTokenPULP = _inTokenPULP;
    let totalSupply = _totalSupply;
    let totalBalance = _totalBalance;
    let zero = 0;
    if (totalBalance.isZero() || totalSupply.isZero()) {
        return zero;
    }
    let outTokenU = inTokenPULP.mul(totalBalance).div(totalSupply);
    return outTokenU;
};

const getTokenBalance = async (token, address) => {
    let bal = await token.balanceOf(address);
    return bal;
};

const getTotalSupply = async (instance) => {
    let bal = await instance.totalSupply();
    return bal;
};

const getTotalBalance = async (instance) => {
    let bal = await instance.totalBalance();
    return bal;
};

const withdraw = async (
    from,
    inTokenPULP,
    tokenU,
    strikeToken,
    pool,
    optionToken,
    redeem
) => {
    inTokenPULP = inTokenPULP;
    let balance0U = await getTokenBalance(tokenU, from);
    let balance0P = await getTokenBalance(pool, from);
    let balance0CU = await getTokenBalance(tokenU, pool.address);
    let balance0TS = await getTotalSupply(pool);
    let balance0TP = await getTotalBalance(pool);

    let liquidity = calculateRemoveLiquidity(
        inTokenPULP,
        balance0TS,
        balance0TP
    );

    if (balance0P.lt(inTokenPULP)) {
        console.error("insufficient token balance");
        return;
    }

    let event = await pool.withdraw(inTokenPULP, {
        from: from,
    });
    truffleAssert.eventEmitted(event, "Withdraw", (ev) => {
        return (
            expect(ev.from).to.be.eq(from) &&
            expect(ev.inTokenPULP.toString()).to.be.eq(inTokenPULP.toString())
        );
    });

    let balance1U = await getTokenBalance(tokenU, from);
    let balance1P = await getTokenBalance(pool, from);
    let balance1CU = await getTokenBalance(tokenU, pool.address);
    let balance1TS = await getTotalSupply(pool);
    let balance1TP = await getTotalBalance(pool);

    let deltaU = balance1U.sub(balance0U);
    let deltaP = balance1P.sub(balance0P);
    let deltaCU = balance1CU.sub(balance0CU);
    let deltaTS = balance1TS.sub(balance0TS);
    let deltaTP = balance1TP.sub(balance0TP);

    let slippage = constants.PARAMETERS.MAX_SLIPPAGE;
    let maxValue = liquidity.add(liquidity.div(slippage));
    let minValue = liquidity.sub(liquidity.div(slippage));
    expect(deltaU).to.be.a.bignumber.that.is.at.most(maxValue);
    expect(deltaU).to.be.a.bignumber.that.is.at.least(minValue);
    assertBNEqual(deltaP, inTokenPULP.neg());
    assertBNEqual(deltaTS, inTokenPULP.neg());
    expect(deltaTP).to.be.a.bignumber.that.is.at.least(maxValue.neg());
    expect(deltaTP).to.be.a.bignumber.that.is.at.most(minValue.neg());

    await verifyOptionInvariants(tokenU, strikeToken, optionToken, redeem);
};

const deposit = async (
    from,
    inTokenU,
    tokenU,
    strikeToken,
    optionToken,
    redeem,
    pool
) => {
    inTokenU = inTokenU;
    let balance0U = await getBalance(tokenU, from);
    let balance0P = await getBalance(pool, from);
    let balance0CU = await getBalance(tokenU, pool.address);
    let balance0TS = await getTotalSupply(pool);
    let balance0TP = await getTotalPoolBalance(pool);

    let liquidity = calculateAddLiquidity(inTokenU, balance0TS, balance0TP);

    if (balance0U.lt(inTokenU)) {
        console.error("insufficient token balance");
        return;
    }
    let depo = await pool.deposit(inTokenU, {
        from: from,
    });
    truffleAssert.eventEmitted(depo, "Deposit", (ev) => {
        return (
            expect(ev.from).to.be.eq(from) &&
            expect(ev.outTokenPULP.toString()).to.be.eq(liquidity.toString())
        );
    });

    let balance1U = await getBalance(tokenU, from);
    let balance1P = await getBalance(pool, from);
    let balance1CU = await getBalance(tokenU, pool.address);
    let balance1TS = await getTotalSupply(pool);
    let balance1TP = await getTotalPoolBalance(pool);

    let deltaU = balance1U.sub(balance0U);
    let deltaP = balance1P.sub(balance0P);
    let deltaCU = balance1CU.sub(balance0CU);
    let deltaTS = balance1TS.sub(balance0TS);
    let deltaTP = balance1TP.sub(balance0TP);

    assertBNEqual(deltaU, inTokenU.neg());
    assertBNEqual(deltaP, liquidity);
    assertBNEqual(deltaCU, inTokenU);
    assertBNEqual(deltaTS, liquidity);
    assertBNEqual(deltaTP, inTokenU);
};

const verifyOptionInvariants = async (
    tokenU,
    strikeToken,
    optionToken,
    redeem
) => {
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
    const underlyingBalance = await getTokenBalance(
        Primitive.underlyingToken,
        address
    );
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
    assertWithinError,
    calculateAddLiquidity,
    calculateRemoveLiquidity,
    withdraw,
    deposit,
    verifyOptionInvariants,
    getTokenBalances,
    getTokenBalance,
};
