const { assert, expect } = require("chai");
const chai = require("chai");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));

const { toWei } = web3.utils;
const { fromWei } = web3.utils;

const assertBNEqual = (actualBN, expectedBN, message) => {
    assert.equal(actualBN.toString(), expectedBN.toString(), message);
};

const assertWithinError = (actualBN, expectedBN, error, message) => {
    error = new BN(error);
    let max = expectedBN.add(expectedBN.div(error));
    let min = expectedBN.sub(expectedBN.div(error));
    if (actualBN.gt(new BN(0))) {
        expect(actualBN).to.be.a.bignumber.that.is.at.most(max);
        expect(actualBN).to.be.a.bignumber.that.is.at.least(min);
    } else {
        expect(actualBN).to.be.a.bignumber.that.is.at.most(new BN(0));
    }
};

module.exports = {
    toWei,
    fromWei,
    assertBNEqual,
    assertWithinError,
};
