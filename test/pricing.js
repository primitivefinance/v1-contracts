const { assert, expect } = require("chai");
const truffleAssert = require("truffle-assertions");
const chai = require("chai");
const BN = require("bn.js");
chai.use(require("chai-bn")(BN));
const Pricing = artifacts.require("Pricing");
const utils = require("./utils");
const setup = require("./setup");
const constants = require("./constants");
const { toWei, fromWei, assertWithinError } = utils;
const { newERC20, newWeth } = setup;
const { ONE_ETHER, MILLION_ETHER } = constants.VALUES;

const LOG_INTRINSIC = false;
const LOG_EXTRINSIC = false;
const LOG_SPECIFIC = false;
const LOG_VERBOSE = false;

contract("Pricing Contract", (accounts) => {
    let pricing;
    let s, k, o, t;

    let Alice = accounts[0];

    before(async () => {
        pricing = await Pricing.new();
        s = toWei("235");
        k = toWei("220");
        o = 650;
        t = 31449600; //one year
    });

    describe("Test ATM", () => {
        it("Tests the ATM function", async () => {
            let atm = await pricing.calculateATM(s, o, t);
            console.log("ATM", atm.toString());
        });

        it("Tests the d1 function", async () => {
            let d1 = await pricing.auxiliary(s, k, o, t);
            console.log("d1", d1.toString());
        });

        it("Tests the d2 function", async () => {
            let d2 = await pricing.auxiliary2(s, k, o, t);
            console.log("d2", d2.toString());
        });

        it("Tests the normdist function", async () => {
            let z = 873;
            let normdist = await pricing.normdist(z);
            console.log("normdist", normdist.toString());
        });

        it("Tests the bs function", async () => {
            let bs = await pricing.bs(s, k, o, t);
            console.log("bs", bs.toString());
        });

        it("Tests the price function", async () => {
            let extrinsic = await pricing.extrinsic(s, k, o, t);
            console.log("PRICE", extrinsic.toString());
        });
    });

    describe("Test SQRT", () => {
        it("Tests the sqrt function branches", async () => {});
    });
});
