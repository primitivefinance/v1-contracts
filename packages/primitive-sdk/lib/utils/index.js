"use strict";

const computeRedeemAddress = require("./compute-redeem-address");
const computeOptionAddress = require("./compute-option-address");
const assembleCloneCode = require("./assemble-clone-code");

Object.assign(module.exports, {
    computeRedeemAddress,
    computeOptionAddress,
    assembleCloneCode,
});
