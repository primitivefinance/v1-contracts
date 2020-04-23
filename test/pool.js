const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const Usdc = artifacts.require("USDC");
const Prime = artifacts.require("Prime");
const PrimeOption = artifacts.require('PrimeOption.sol');
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
        _strike = await Usdc.deployed();
        qUnderlying = oneEther;
        qStrike = toWei('18');
        aStrike = _strike.address;
        tExpiry = '1607774400'
        isEthCall = true;
        ethCallName = 'ETH201212C150USDC'
        isTokenOption = false;

        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();

        // Create a new Eth Option Market
        const firstMarket = 1;
        await _controllerMarket.createMarket(
            qUnderlying,
            aStrike,
            qStrike,
            aStrike,
            tExpiry,
            ethCallName,
            isEthCall,
            isTokenOption,
        );
        
        // Get the market contracts
        _prime = await Prime.deployed();
        
        _pool = await PrimePool.at(await _controllerMarket.getMaker(firstMarket));
        _option = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));
        _redeem = await PrimeRedeem.at(await _option._rPulp());

        userA = Alice;
        userB = Bob;
    });

    describe('PrimePool.sol', () => {
        beforeEach(async () => {

        });

        describe('PrimePool.deposit()', () => {

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _pool.deposit(
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_BAL_ETH"
                );
            });

            it('should deposit underlying and mint LP tokens', async () => {
                let oPulp = (tenEther).toString();
                await _pool.deposit(tenEther, {from: userA, value: tenEther});
                let oPulpBal = (await _pool.balanceOf(userA)).toString();
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });
        });

        
        describe('PrimePool.buy()', () => {
            beforeEach(async () => {

            });

            it('reverts if the option address is not valid', async () => {
                await truffleAssert.reverts(
                    _pool.buy(
                        millionEther,
                        userA,
                        {from: userA,  value: 0}
                    ),
                    "ERR_INVALID_OPTION"
                );
            });

            it('reverts if pool doesnt have enough underlying assets', async () => {
                await truffleAssert.reverts(
                    _pool.buy(
                        millionEther,
                        _option.address,
                        {from: userB,  value: 0}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
            });

            it('purchases prime option', async () => {
                await _pool.deposit(oneEther, {from: userA, value: oneEther});
                let ioPulp = await _option.balanceOf(userA);
                await _pool.buy(oneEther, _option.address, {from: userA, value: oneEther});
                console.log(fromWei(oneEther));
                console.log('[PRIME BALANCE]', fromWei(await _option.balanceOf(_pool.address)));
                console.log('[test MIN UNDERLYING BALANCE]', fromWei(await _pool._test()));
                let eoPulp = await _option.balanceOf(userA);
                assert.strictEqual((eoPulp*1 - oneEther*1 - ioPulp) <= ROUNDING_ERR, true, `expectedoPulp: ${eoPulp}, actual: ${eoPulp*1 - oneEther*1}`);
            });
        });

        
        describe('PrimePool.withdraw()', () => {
            beforeEach(async () => {

            });

            it('reverts if user does not have enough LP tokens', async () => {
                await truffleAssert.reverts(
                    _pool.withdraw(
                        millionEther,
                        {from: userA, value: 0}),
                    "ERR_BAL_LPROVIDER"
                );
            });

            it('reverts if there is not enough liquidity to withdraw from', async () => {
                await _pool.deposit(twoEther, {from: userA, value: twoEther});
                await truffleAssert.reverts(
                    _pool.withdraw(
                        (toWei('1.2')).toString(),
                        {from: userA, value: 0}),
                    "ERR_BAL_RESERVE"
                );
            });

            it('withdraws liquidity tokens', async () => {
                let iLP = await _pool.balanceOf(userA);
                console.log('[LP BALANCE OF USER]', fromWei(iLP));
                console.log('[TOTAL UNUTILIZED]', fromWei(await _pool.totalUnutilized()));
                console.log('[TOTAL SUPPLY]', fromWei(await _pool.totalSupply()));
                console.log('[TOTAL ETHER]', fromWei(await _pool.totalEtherBalance()));
                console.log('[TOTAL POOL BALANCE]', fromWei(await _pool.totalPoolBalance()));
                console.log('[TOTAL OPTION SUPPLY]', fromWei(await _pool.totalOptionSupply()));
                console.log('[TOTAL REDEEM BALANCE]', fromWei(await _redeem.balanceOf(_pool.address)));
                await _pool.withdraw(oneEther, {from: userA, value: 0});
                let eLP = await _pool.balanceOf(userA);
                console.log('[LP BALANCES]', 'BEFORE', fromWei(iLP), 'AFTER', fromWei(eLP));
                /* assert.strictEqual((iLP*1 + (oneEther * beforeLP / toWei('1'))*1 - eLP) <= ROUNDING_ERR, true, `expected ${eLP}, actual ${iLP*1 + (oneEther * beforeLP / toWei('1'))*1 - eLP}`); */
            });
        });

        
        describe('PrimePool.redeem()', () => {
            beforeEach(async () => {

            });

            it('reverts if the option address is not valid', async () => {
                await truffleAssert.reverts(
                    _pool.redeem(
                        millionEther,
                        userA,
                        {from: userA,  value: 0}
                    ),
                    "ERR_INVALID_OPTION"
                );
            });

            it('closes position by redeeming', async () => {
                let irPulp = await _redeem.balanceOf(_option.address);
                let ioPulp = await _option.balanceOf(userA);
                let iEth = await getBalance(_pool.address);
                let strikeBefore = oneEther*1 * qStrike*1 / toWei('1');
                await _option.approve(_pool.address, millionEther, {from: userA});
                await _pool.redeem(oneEther, _option.address, {from: userA, value: 0});
                console.log('[ETH PREMIUM SENT]', fromWei(await _pool._test()));
                console.log('[ETH BALANCES]', 'BEFORE:', fromWei(iEth), 'AFTER:', fromWei(await getBalance(_pool.address)));
                let erPulp = await _redeem.balanceOf(_option.address);
                let eoPulp = await _option.balanceOf(userA);
                let eEth = await getBalance(_pool.address);
                assert.strictEqual((erPulp*1 - strikeBefore*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((eoPulp*1 - oneEther*1 - eoPulp) <= ROUNDING_ERR, true, 'oPulp not equal');
                assert.strictEqual((iEth*1 + oneEther*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth} actual: ${iEth*1 + oneEther*1 - eEth}`);
            });
        });
    });
})