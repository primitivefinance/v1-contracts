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
        s = 241;
        k = 240;
        o = 80;
        t = 1;
    });

    describe("Test ATM", () => {
        it("Tests the ATM function", async () => {
            let atm = await pricing.calculateATM(s, k, o, t);
            console.log("ATM", atm.toString());
        });
        it("Tests the magic function", async () => {
            let x = 760;
            let magic = await pricing.magic(x);
            console.log("M", magic.toString());
        });

        it("Tests the d1 function", async () => {
            let d1 = await pricing.d1(s, k, o, t);
            console.log("d1", d1.toString());
        });

        it("Tests the price function", async () => {
            let x = 760;
            let atm = await pricing.calculateATM(s, k, o, t);
            let price = await pricing.price(x, atm);
            console.log("PRICE", price.toString());
        });
    });

    describe("Test SQRT", () => {
        it("Tests the sqrt function branches", async () => {});
    });
});
