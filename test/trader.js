const { assert, expect } = require("chai");
const chai = require('chai');
const truffleAssert = require('truffle-assertions');
const BN = require('bn.js');
const PrimeTrader = artifacts.require("PrimeTrader");
const PrimeOption = artifacts.require("PrimeOption");
const PrimeRedeem = artifacts.require("PrimeRedeem");
const Weth = artifacts.require("WETH9");
const Dai = artifacts.require("DAI");

contract("Trader", accounts => {
    // WEB3
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;

    // ERROR CODES
    const ERR_ZERO = "ERR_ZERO";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ERR_BAL_UNDERLYING = "ERR_BAL_UNDERLYING";

    // COMMON AMOUNTS
    const ROUNDING_ERR = 10**8;
    const HUNDRETH = toWei('0.01');
    const ONE_ETHER = toWei('1');
    const TWO_ETHER = toWei('2');
    const FIVE_ETHER = toWei('5');
    const TEN_ETHER = toWei('10');
    const FIFTY_ETHER = toWei('50');
    const HUNDRED_ETHER = toWei('100');
    const THOUSAND_ETHER = toWei('1000');
    const MILLION_ETHER = toWei('1000000');
    const MIN_LIQUIDITY = 10**4;
    const ACCURACY = 10**12;

    // ACCOUNTS
    const Alice = accounts[0]
    const Bob = accounts[1]
    const Mary = accounts[2]
    const Kiln = accounts[3]
    const Don = accounts[4]
    const Penny = accounts[5]
    const Cat = accounts[6]
    const Bjork = accounts[7]
    const Olga = accounts[8]
    const Treasury = accounts[9]


    let trader, weth, dai, prime, redeem;
    let tokenU, tokenS, _tokenU, _tokenS, tokenP;
    let base, price, expiry;

    const assertBNEqual = (actualBN, expectedBN, message) => {
        assert.equal(actualBN.toString(), expectedBN.toString(), message);
    }

    before(async () => {
        weth = await Weth.new();
        dai = await Dai.new(THOUSAND_ETHER);
        trader = await PrimeTrader.new(weth.address);

        _tokenU = dai;
        _tokenS = weth;
        tokenU = dai.address;
        tokenS = weth.address;
        marketId = 1;
        optionName = "ETH Put 200 DAI Expiring May 30 2020";
        optionSymbol = "PRIME";
        redeemName = "ETH Put Redeemable Token";
        redeemSymbol = "REDEEM";
        base = toWei('200');
        price = toWei('1');
        expiry = '1590868800'; // May 30, 2020, 8PM UTC
        prime = await PrimeOption.new(
            optionName,
            optionSymbol,
            marketId,
            tokenU,
            tokenS,
            base,
            price,
            expiry
        );

        tokenP = prime.address;

        redeem = await PrimeRedeem.new(
            redeemName,
            redeemSymbol,
            tokenP,
            tokenS
        );

        await prime.initTokenR(redeem.address);

        getBalance = async (token, address) => {
            let bal = new BN(await token.balanceOf(address));
            return bal;
        }
    });

    describe("Constructor", () => {
        it("should return the correct weth address", async () => {
            expect(await trader.weth()).to.be.equal(weth.address);
        });
    });

    describe("safeMint", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenS.approve(trader.address, MILLION_ETHER, {from: Alice});

            safeMint = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let outTokenR = inTokenU.mul(new BN(price)).div(new BN(base));

                let balanceU = await getBalance(_tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceR = await getBalance(redeem, Alice);

                let mint = await trader.safeMint(tokenP, inTokenU, Alice);
                
                let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaR = (await getBalance(redeem, Alice)).sub(balanceR);

                assertBNEqual(deltaU, inTokenU.neg());
                assertBNEqual(deltaP, inTokenU);
                assertBNEqual(deltaR, outTokenR);

                await truffleAssert.eventEmitted(mint, "Mint", (ev) => {
                    return  expect(ev.from).to.be.eq(Alice) &&
                            expect((ev.outTokenP).toString()).to.be.eq(inTokenU.toString()) &&
                            expect((ev.outTokenR).toString()).to.be.eq(outTokenR.toString())
                });
            }
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeMint(
                    tokenP,
                    0,
                    Alice
                ),
                ERR_ZERO
            );
        });

        it("should revert if tokenP is not a Prime", async () => {
            await truffleAssert.reverts(
                trader.safeMint(
                    Alice,
                    10,
                    Alice
                )
            );
        });

        it("should revert if msg.sender does not have enough tokenU for tx", async () => {
            await truffleAssert.reverts(
                trader.safeMint(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_UNDERLYING
            );
        });

        it("should emit the Mint event", async () => {
            let inTokenU = new BN(ONE_ETHER);
            let outTokenR = inTokenU.mul(new BN(price)).div(new BN(base));
            let mint = await trader.safeMint(tokenP, inTokenU, Alice);
            await truffleAssert.eventEmitted(mint, "Mint", (ev) => {
                return  expect(ev.from).to.be.eq(Alice) &&
                        expect((ev.outTokenP).toString()).to.be.eq(inTokenU.toString()) &&
                        expect((ev.outTokenR).toString()).to.be.eq(outTokenR.toString())
            });
        });

        it("should mint primes and redeems in correct amounts", async () => {
            await safeMint(ONE_ETHER);
        });

        it("should successfully call safe mint a few times in a row", async () => {
            await safeMint(ONE_ETHER);
            await safeMint(TEN_ETHER);
            await safeMint(FIVE_ETHER);
            await safeMint(toWei('0.5123542351'));
            await safeMint(toWei('1.23526231124324'));
            await safeMint(toWei('2.234345'));
        });
    });

    describe("safeSwap", () => {
        beforeEach(async () => {
            trader = await PrimeTrader.new(weth.address);
            await _tokenU.approve(trader.address, MILLION_ETHER, {from: Alice});
            await _tokenS.approve(trader.address, MILLION_ETHER, {from: Alice});
            await prime.approve(trader.address, MILLION_ETHER, {from: Alice});
            await safeMint(TEN_ETHER);

            safeSwap = async (inTokenU) => {
                inTokenU = new BN(inTokenU);
                let inTokenP = inTokenU;
                let inTokenS = inTokenU.mul(new BN(price)).div(new BN(base));

                let balanceU = await getBalance(_tokenU, Alice);
                let balanceP = await getBalance(prime, Alice);
                let balanceS = await getBalance(_tokenS, Alice);

                let swap = await trader.safeSwap(tokenP, inTokenU, Alice);
                
                let deltaU = (await getBalance(_tokenU, Alice)).sub(balanceU);
                let deltaP = (await getBalance(prime, Alice)).sub(balanceP);
                let deltaS = (await getBalance(_tokenS, Alice)).sub(balanceS);

                assertBNEqual(deltaU, inTokenU);
                assertBNEqual(deltaP, inTokenP.neg());
                assertBNEqual(deltaS, inTokenS.neg());

                await truffleAssert.eventEmitted(swap, "Swap", (ev) => {
                    return  expect(ev.from).to.be.eq(Alice) &&
                            expect((ev.outTokenU).toString()).to.be.eq(inTokenU.toString()) &&
                            expect((ev.inTokenS).toString()).to.be.eq(inTokenS.toString())
                });
            }
        });

        it("should revert if amount is 0", async () => {
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    0,
                    Alice
                ),
                ERR_ZERO
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_PRIME
            );
        });

        it("should revert if user does not have enough prime tokens", async () => {
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    MILLION_ETHER,
                    Alice
                ),
                ERR_BAL_PRIME
            );
        });

        it("should revert if user does not have enough strike tokens", async () => {
            await trader.safeMint(tokenP, ONE_ETHER, Bob);
            await _tokenS.transfer(Alice, await _tokenS.balanceOf(Bob), {from: Bob})
            await truffleAssert.reverts(
                trader.safeSwap(
                    tokenP,
                    ONE_ETHER,
                    Bob,
                    {from: Bob}
                ),
                ERR_BAL_STRIKE
            );
        });

        it("should swap consecutively", async () => {
            await _tokenS.deposit({from: Alice, value: TEN_ETHER});
            await safeSwap(toWei('0.1'));
            await safeSwap(toWei('0.32525'));
            await safeSwap(ONE_ETHER);
        });
    });
});