const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerPool = artifacts.require('ControllerPool');
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimePool = artifacts.require('PrimePool.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');
const Usdc = artifacts.require("USDC");
const Dai = artifacts.require('DAI');
const Weth = require('../build/contracts/WETH9.json');
const wethAbi = "[{\"constant\":true,\"inputs\":[],\"name\":\"name\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"guy\",\"type\":\"address\"},{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"approve\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"totalSupply\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"src\",\"type\":\"address\"},{\"name\":\"dst\",\"type\":\"address\"},{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"transferFrom\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"withdraw\",\"outputs\":[],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"decimals\",\"outputs\":[{\"name\":\"\",\"type\":\"uint8\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"}],\"name\":\"balanceOf\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[],\"name\":\"symbol\",\"outputs\":[{\"name\":\"\",\"type\":\"string\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[{\"name\":\"dst\",\"type\":\"address\"},{\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"transfer\",\"outputs\":[{\"name\":\"\",\"type\":\"bool\"}],\"payable\":false,\"stateMutability\":\"nonpayable\",\"type\":\"function\"},{\"constant\":false,\"inputs\":[],\"name\":\"deposit\",\"outputs\":[],\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"function\"},{\"constant\":true,\"inputs\":[{\"name\":\"\",\"type\":\"address\"},{\"name\":\"\",\"type\":\"address\"}],\"name\":\"allowance\",\"outputs\":[{\"name\":\"\",\"type\":\"uint256\"}],\"payable\":false,\"stateMutability\":\"view\",\"type\":\"function\"},{\"payable\":true,\"stateMutability\":\"payable\",\"type\":\"fallback\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"src\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"guy\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Approval\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"src\",\"type\":\"address\"},{\"indexed\":true,\"name\":\"dst\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Transfer\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"dst\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Deposit\",\"type\":\"event\"},{\"anonymous\":false,\"inputs\":[{\"indexed\":true,\"name\":\"src\",\"type\":\"address\"},{\"indexed\":false,\"name\":\"wad\",\"type\":\"uint256\"}],\"name\":\"Withdrawal\",\"type\":\"event\"}]"

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
    const ONE_ETHER = toWei('0.1');
    const TWO_ETHER = toWei('0.2');
    const FIVE_ETHER = toWei('0.5');
    const TEN_ETHER = toWei('1');
    const MILLION_ETHER = toWei('1000000');


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
        tokenS,
        expiry,
        isEthCall,
        name,
        _redeem,
        _pool,
        _option,
        _exchange,
        totalLiquidity,
        isTokenOption,
        symol,
        _controllerPool,
        WETH
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    beforeEach(async () => {
        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();
        _controllerPool = await ControllerPool.deployed();

        WETH = new web3.eth.Contract(Weth.abi, await _controllerPool.weth());
        // Get the Option Parameters
        _strike = await Usdc.deployed();
        _underlying = WETH;
        tokenS = _strike.address;
        tokenU = WETH._address;
        expiry = '1607774400';
        ratio = TEN_ETHER;
        name = 'ETH201212C150USDC';
        symbol = 'PRIME';

        

        // Create a new Eth Option Market
        const firstMarket = 1;
        await _controllerMarket.createMarket(
            name,
            symbol,
            tokenU,
            tokenS,
            ratio,
            expiry
        );
        
        
        _pool = await PrimePool.at(await _controllerMarket.getMaker(firstMarket));
        _option = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));
        _redeem = await PrimeRedeem.at(await _option.tokenR());
        await _underlying.methods.deposit().send({from: Alice, value: TEN_ETHER});
        await _underlying.methods.deposit().send({from: Bob, value: TEN_ETHER});
        await _strike.approve(_option.address, MILLION_ETHER, {from: Alice});
        await _underlying.methods.approve(_option.address, MILLION_ETHER).send({from: Alice});
        await _strike.approve(_option.address, MILLION_ETHER, {from: Bob});
        await _underlying.methods.approve(_option.address, MILLION_ETHER).send({from: Bob});
        await _strike.approve(_pool.address, MILLION_ETHER, {from: Alice});
        await _underlying.methods.approve(_pool.address, MILLION_ETHER).send({from: Alice});
        await _strike.approve(_pool.address, MILLION_ETHER, {from: Bob});
        await _underlying.methods.approve(_pool.address, MILLION_ETHER).send({from: Bob});

        userA = Alice;
        userB = Bob;
    });

    describe('PrimeOption.sol', () => {
        beforeEach(async () => {

        });

        it('should have market id 1', async () => {
            let marketId = await _option.marketId();
            assert.strictEqual((marketId).toString(), '1', 'Not market id 1');
        });

        describe('PrimeOption.mint()', () => {

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _option.safeMint(
                        0,
                        {from: userA,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            });

            it('mints rPulp and oPulp', async () => {
                let rPulp = toWei('1');
                let oPulp = (TEN_ETHER).toString();
                await _option.safeMint(TEN_ETHER, {from: userA, value: 0});
                let rPulpBal = (await _redeem.balanceOf(userA)).toString();
                let oPulpBal = (await _option.balanceOf(userA)).toString();
                assert.strictEqual(rPulpBal, rPulp, `${rPulpBal} != ${rPulp}`);
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });
        });

        
        describe('PrimeOption.swap()', () => {
            beforeEach(async () => {

            });

            it('reverts if user doesnt have enough oPulp', async () => {
                await truffleAssert.reverts(
                    _option.safeSwap(
                        MILLION_ETHER,
                        {from: userA,  value: 0}
                    ),
                    "ERR_BAL_PRIME"
                );
            });

            it('swaps oPulp for underlying', async () => {
                await _option.safeMint(ONE_ETHER, {from: userA});
                let iEth = await _underlying.methods.balanceOf(userA).call();
                let ioPulp = await _option.balanceOf(userA);
                let iStrike = await _strike.balanceOf(userA);
                await _option.safeSwap(ONE_ETHER, {from: userA, value: 0});
                let eEth = await _underlying.methods.balanceOf(userA).call();
                let eoPulp = await _option.balanceOf(userA);
                let eStrike = await _strike.balanceOf(userA);
                assert.strictEqual((iEth*1 + ONE_ETHER*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth}, actual: ${iEth*1 + ONE_ETHER*1}`);
                assert.strictEqual((eoPulp*1 - ONE_ETHER*1 - eoPulp) <= ROUNDING_ERR, true, `expectedoPulp: ${eoPulp}, actual: ${eoPulp*1 - ONE_ETHER*1}`);
                assert.strictEqual((eStrike*1 - ratio*1 - eStrike) <= ROUNDING_ERR, true, `expectedeStrike: ${eStrike}, actual: ${eStrike*1 - ratio*1}`);
            });
        });

        
        describe('PrimeOption.withdraw()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than qStrike', async () => {
                await truffleAssert.reverts(
                    _option.withdraw(
                        MILLION_ETHER,
                        {from: userA, value: 0}),
                    "ERR_BAL_REDEEM"
                );
            });

            it('withdraws strike assets', async () => {
                let iStrike = await _strike.balanceOf(userA);
                let beforeStrike = ONE_ETHER * ratio / toWei('1');
                await _option.withdraw((ONE_ETHER * ratio / toWei('1')).toString(), {from: userA, value: 0});
                let erPulp = await _redeem.balanceOf(userA);
                let eStrike = await _strike.balanceOf(userA);
                assert.strictEqual((erPulp*1 - beforeStrike*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((iStrike*1 + (ONE_ETHER * beforeStrike / toWei('1'))*1 - eStrike) <= ROUNDING_ERR, true, 'Strike not equal');
            });
        });

        
        describe('PrimeOption.close()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than ratio', async () => {
                await truffleAssert.reverts(
                    _option.close(
                        MILLION_ETHER,
                        {from: userA, value: 0}),
                    "ERR_BAL_REDEEM"
                );
            });


            it('closes position', async () => {
                let irPulp = await _redeem.balanceOf(userA);
                let ioPulp = await _option.balanceOf(userA);
                let iEth = await _underlying.methods.balanceOf(userA).call();
                let ratio = await _option.ratio();
                let strikeBefore = ONE_ETHER*1 * ratio*1 / toWei('1');
                await _option.close(ONE_ETHER, {from: userA, value: 0});
                let erPulp = await _redeem.balanceOf(userA);
                let eoPulp = await _option.balanceOf(userA);
                let eEth = await _underlying.methods.balanceOf(userA).call();
                assert.strictEqual((erPulp*1 - strikeBefore*1 - erPulp) <= ROUNDING_ERR, true, `expected redeem ${erPulp}, actual: ${erPulp*1 + strikeBefore*1 - erPulp}`);
                assert.strictEqual((eoPulp*1 - ONE_ETHER*1 - eoPulp) <= ROUNDING_ERR, true, 'oPulp not equal');
                assert.strictEqual((iEth*1 + ONE_ETHER*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth} actual: ${iEth*1 + ONE_ETHER*1 - eEth}`);
            });
        });
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

            it('mints LP tokens', async () => {
                let oPulp = (TEN_ETHER).toString();
                await _pool.deposit(TEN_ETHER, {from: userA, value: TEN_ETHER});
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
                        MILLION_ETHER,
                        userA,
                        {from: userA,  value: 0}
                    ),
                    "ERR_INVALID_OPTION"
                );
            });

            it('reverts if pool doesnt have enough underlying assets', async () => {
                await truffleAssert.reverts(
                    _pool.buy(
                        MILLION_ETHER,
                        _option.address,
                        {from: userB,  value: 0}
                    ),
                    "ERR_BAL_UNDERLYING"
                );
            });

            it('purchases prime option', async () => {
                await _pool.deposit(ONE_ETHER, {from: userA, value: ONE_ETHER});
                let ioPulp = await _option.balanceOf(userA);
                await _pool.buy(ONE_ETHER, _option.address, {from: userA, value: ONE_ETHER});
                console.log(fromWei(ONE_ETHER));
                console.log('[PRIME BALANCE]', fromWei(await _option.balanceOf(_pool.address)));
                console.log('[test MIN UNDERLYING BALANCE]', fromWei(await _pool._test()));
                let eoPulp = await _option.balanceOf(userA);
                assert.strictEqual((eoPulp*1 - ONE_ETHER*1 - ioPulp) <= ROUNDING_ERR, true, `expectedoPulp: ${eoPulp}, actual: ${eoPulp*1 - ONE_ETHER*1}`);
            });
        });

        
        describe('PrimePool.withdraw()', () => {
            beforeEach(async () => {

            });

            it('reverts if user does not have enough LP tokens', async () => {
                await truffleAssert.reverts(
                    _pool.withdraw(
                        MILLION_ETHER,
                        {from: userA, value: 0}),
                    "ERR_BAL_LPROVIDER"
                );
            });

            /* it('reverts if there is not enough liquidity to withdraw from', async () => {
                await _pool.deposit(TWO_ETHER, {from: userA, value: TWO_ETHER});
                await truffleAssert.reverts(
                    _pool.withdraw(
                        (toWei('1.2')).toString(),
                        {from: userA, value: 0}),
                    "ERR_BAL_STRIKE"
                );
            }); */

            it('withdraws liquidity tokens', async () => {
                let iLP = await _pool.balanceOf(userA);
                console.log('[LP BALANCE OF USER]', fromWei(iLP));
                console.log('[TOTAL UNUTILIZED]', fromWei(await _pool.totalUnutilized()));
                console.log('[TOTAL SUPPLY]', fromWei(await _pool.totalSupply()));
                console.log('[TOTAL ETHER]', fromWei(await _pool.totalEtherBalance()));
                console.log('[TOTAL POOL BALANCE]', fromWei(await _pool.juice()));
                console.log('[TOTAL OPTION SUPPLY]', fromWei(await _pool.cacheU()));
                console.log('[TOTAL REDEEM BALANCE]', fromWei(await _redeem.balanceOf(_pool.address)));
                await _option.safeSwap(ONE_ETHER, {from: userA});
                await _pool.withdraw(ONE_ETHER, {from: userA, value: 0});
                let eLP = await _pool.balanceOf(userA);
                console.log('[LP BALANCES]', 'BEFORE', fromWei(iLP), 'AFTER', fromWei(eLP));
                /* assert.strictEqual((iLP*1 + (ONE_ETHER * beforeLP / toWei('1'))*1 - eLP) <= ROUNDING_ERR, true, `expected ${eLP}, actual ${iLP*1 + (ONE_ETHER * beforeLP / toWei('1'))*1 - eLP}`); */
            });
        });
    });
})