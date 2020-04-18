const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const Usdc = artifacts.require("USDC");
const Dai = artifacts.require("DAI");
const Prime = artifacts.require("Prime");
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimeExchange = artifacts.require('PrimeExchange.sol');
const PrimePool = artifacts.require('PrimePool.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');
const PrimePerpetual = artifacts.require('PrimePerpetual');

contract('PrimeERC20', accounts => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;
    const ROUNDING_ERR = 10**16;
    const ERR_ZERO = "ERR_ZERO";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_OPULP = "ERR_BAL_OPULP";
    const ERR_BAL_RPULP = "ERR_BAL_RPULP";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const oneEther = toWei('0.1');
    const twoEther = toWei('0.2');
    const fiveEther = toWei('0.5');
    const tenEther = toWei('1');
    const millionEther = toWei('1000000');


    // User Accounts
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

    let _prime,
        userA,
        userB,
        _strike,
        _controllerMarket,
        qUnderlying,
        aUnderlying,
        qStrike,
        aStrike,
        tExpiry,
        isEthCall,
        ethCallName,
        _redeem,
        _pool,
        _option,
        _exchange,
        totalLiquidity,
        isTokenOption
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    beforeEach(async () => {

        // Get the Option Parameters
        _underlying = await Usdc.deployed();
        _strike = await Dai.deployed();
        qUnderlying = oneEther;
        aUnderlying = _underlying.address;
        qStrike = oneEther;
        aStrike = _strike.address;
        tExpiry = '1587607322'
        isEthCall = false;
        isTokenOption = true;
        perpetualPutName = 'QUANT DAI'
        

        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();

        // Create a new Eth Option Market
        const firstMarket = 1;
        await _controllerMarket.createMarket(
            qUnderlying,
            aUnderlying,
            qStrike,
            aStrike,
            tExpiry,
            perpetualPutName,
            isEthCall,
            isTokenOption,
        );
        
        // Get the market contracts
        _prime = await Prime.deployed();
        _redeem = await PrimeRedeem.at(await _controllerMarket._crRedeem());
        _pool = await PrimePool.at(await _controllerMarket.getMaker(firstMarket));
        _perpetual = await PrimePerpetual.at(await _controllerMarket.getPerpetual(firstMarket));
        _exchange = await PrimeExchange.at(await _controllerMarket.getExchange(firstMarket));
        _option = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));
        await _underlying.approve(_perpetual.address, millionEther, {from: Alice});
        await _strike.approve(_perpetual.address, millionEther, {from: Alice});

        userA = Alice;
        userB = Bob;
    });

    describe('Perpetual Put Option', () => {
        beforeEach(async () => {

        });

        it('should be a token option', async () => {
            let isCall = await _option.isEthCallOption();
            assert.strictEqual(isCall, false, 'A Call but shouldnt be');
        });

        describe('PrimePerpetual.deposit()', () => {

            /* it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _option.deposit(
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            }); */
            it('Has the right details', async () => {
                console.log('[NAME]', await _perpetual.name());
                console.log('[SYMBOL]', await _perpetual.symbol());
                console.log('[NAME]', await _option.name());
                console.log('[SYMBOL]', await _option.symbol());
                console.log('[MARKETS0]', await _perpetual._optionMarkets(0));
                console.log('[OPTION]', await _option.address);
                console.log('[CDAI]', await _perpetual._cDai());
                console.log('[AUNDERLYINGSYMBOL]', await _underlying.symbol());
                console.log('[UNDERLYING]', await _option.getUnderlying());
                console.log('[AUNDERLYING]', await _underlying.address);
                console.log('[ASTRIKESYMBOL]', await _strike.symbol());
                console.log('[STRIKE]', await _option.getStrike());
                console.log('[ASTRIKE]', await _strike.address);
                console.log('[RPULP]', await _option._rPulp());
                console.log('[ARPULP]', await _controllerMarket._crRedeem());
                console.log('[USDCBALANCE]', fromWei(await _perpetual.totalUSDCBalance()));
                console.log('[PREMIUM]', await _perpetual.FIVE_HUNDRED_BPS());
            });

            it('Deposits USDC for Insurance Provider Tokens', async () => {
                let oPulp = (oneEther).toString();
                await _perpetual.deposit(oneEther, {from: userA});
                let oPulpBal = (await _perpetual.balanceOf(userA)).toString();
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
                console.log('[USDCBALANCE]', fromWei(await _perpetual.totalUSDCBalance()));
            });

            it('Insures Dai with USDC By Depositing Dai, Receives Quant Dai', async () => {
                let oPulp = (oneEther).toString();
                // Deposits 1 DAI to get Insured Dai - Quant Dai
                // Needs to approve strike assets to perpetual
                console.log('[ERROR CODE]', (await _perpetual._test()).toString());
                await _perpetual.insure(oneEther, {from: userA});
                console.log('[ERROR CODE]', (await _perpetual._test()).toString());
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                console.log('[QUANTDAI]', fromWei(await _option.balanceOf(userA)));
                console.log('[DAI]', fromWei(await _strike.balanceOf(_perpetual.address)));
                console.log('[PREMIUMS]', fromWei(await _perpetual.calculatePremiums()));
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });

            it('Redeems Quant Dai to Receive Dai Back', async () => {
                let oPulp = (oneEther).toString();
                await _option.approve(_perpetual.address, millionEther, {from: userA});
                await _perpetual.redeem(oneEther, {from: userA});
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                console.log('[QUANTDAI]', fromWei(await _option.balanceOf(userA)));
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });
        });
    });
})