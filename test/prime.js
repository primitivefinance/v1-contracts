const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const ControllerMarket = artifacts.require('ControllerMarket');
const ControllerPool = artifacts.require('ControllerPool');
const PrimeOption = artifacts.require('PrimeOption.sol');
const PrimeRedeem = artifacts.require('PrimeRedeem');
const Usdc = artifacts.require("USDC");
const Dai = artifacts.require('DAI');
const Weth = require('../build/contracts/WETH9.json');

contract('PrimeERC20', accounts => {
    const { toWei } = web3.utils;
    const { fromWei } = web3.utils;
    const { getBalance } = web3.eth;
    const ROUNDING_ERR = 10**16;
    const ERR_ZERO = "ERR_ZERO";
    const ERR_NOT_OWNER = "ERR_NOT_OWNER";
    const ERR_OPTION_TYPE = "ERR_OPTION_TYPE";
    const ERR_BAL_STRIKE = "ERR_BAL_STRIKE";
    const ERR_BAL_PRIME = "ERR_BAL_PRIME";
    const ERR_BAL_REDEEM = "ERR_BAL_REDEEM";
    const ERR_BAL_ETH = "ERR_BAL_ETH";
    const ERR_BAL_TOKENS = "ERR_BAL_TOKENS";
    const ERR_BAL_OPTIONS = "ERR_BAL_OPTIONS";
    const MAINNET_COMPOUND_ETH = '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5';
    const MAINNET_ORACLE = '0x79fEbF6B9F76853EDBcBc913e6aAE8232cFB9De9';
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

    let _controllerMarket,
        _controllerPool,

        WETH,
        _tokenP,
        _tokenR,
        _tokenU,
        _tokenS,

        name,
        symbol,
        tokenU
        tokenS,
        ratio,
        expiry
        ;

    before(async () => {
        // Get the Market Controller Contract
        _controllerMarket = await ControllerMarket.deployed();
        _controllerPool = await ControllerPool.deployed();

        WETH = new web3.eth.Contract(Weth.abi, await _controllerPool.weth());

        _tokenS = await Usdc.deployed();
        _tokenU = WETH;

        name = 'ETH201212C150USDC';
        symbol = 'PRIME';
        tokenS = _tokenS.address;
        tokenU = _tokenU._address;
        expiry = '1607774400';
        ratio = TEN_ETHER;

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

        _tokenP = await PrimeOption.at(await _controllerMarket.getOption(firstMarket));
        _tokenR = await PrimeRedeem.at(await _tokenP.tokenR());
        await _tokenU.methods.deposit().send({from: Alice, value: TEN_ETHER});
        await _tokenU.methods.deposit().send({from: Bob, value: TEN_ETHER});
        await _tokenS.approve(_tokenP.address, MILLION_ETHER, {from: Alice});
        await _tokenU.methods.approve(_tokenP.address, MILLION_ETHER).send({from: Alice});
        await _tokenS.approve(_tokenP.address, MILLION_ETHER, {from: Bob});
        await _tokenU.methods.approve(_tokenP.address, MILLION_ETHER).send({from: Bob});
    });

    describe('PrimeOption.sol', () => {
        beforeEach(async () => {

        });

        it('should have market id 1', async () => {
            let marketId = await _tokenP.marketId();
            assert.strictEqual((marketId).toString(), '1', 'Not market id 1');
        });

        describe('PrimeOption.mint()', () => {

            it('revert if msg.value = 0', async () => {
                await truffleAssert.reverts(
                    _tokenP.safeMint(
                        0,
                        {from: Alice,  value: 0}
                    ),
                    "ERR_ZERO"
                );
            });

            it('mints rPulp and oPulp', async () => {
                let rPulp = toWei('1');
                let oPulp = (TEN_ETHER).toString();
                await _tokenP.safeMint(TEN_ETHER, {from: Alice, value: 0});
                let rPulpBal = (await _tokenR.balanceOf(Alice)).toString();
                let oPulpBal = (await _tokenP.balanceOf(Alice)).toString();
                assert.strictEqual(rPulpBal, rPulp, `${rPulpBal} != ${rPulp}`);
                assert.strictEqual(oPulpBal, oPulp, `${oPulpBal} != ${oPulp}`);
            });
        });

        
        describe('PrimeOption.swap()', () => {
            beforeEach(async () => {

            });

            it('reverts if user doesnt have enough oPulp', async () => {
                await truffleAssert.reverts(
                    _tokenP.safeSwap(
                        MILLION_ETHER,
                        {from: Alice,  value: 0}
                    ),
                    "ERR_BAL_PRIME"
                );
            });

            it('swaps oPulp for underlying', async () => {
                await _tokenP.safeMint(ONE_ETHER, {from: Alice});
                let iEth = await _tokenU.methods.balanceOf(Alice).call();
                let ioPulp = await _tokenP.balanceOf(Alice);
                let iStrike = await _tokenS.balanceOf(Alice);
                await _tokenP.safeSwap(ONE_ETHER, {from: Alice, value: 0});
                let eEth = await _tokenU.methods.balanceOf(Alice).call();
                let eoPulp = await _tokenP.balanceOf(Alice);
                let eStrike = await _tokenS.balanceOf(Alice);
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
                    _tokenP.withdraw(
                        MILLION_ETHER,
                        {from: Alice, value: 0}),
                    "ERR_BAL_REDEEM"
                );
            });

            it('withdraws strike assets', async () => {
                let iStrike = await _tokenS.balanceOf(Alice);
                let beforeStrike = ONE_ETHER * ratio / toWei('1');
                await _tokenP.withdraw((ONE_ETHER * ratio / toWei('1')).toString(), {from: Alice, value: 0});
                let erPulp = await _tokenR.balanceOf(Alice);
                let eStrike = await _tokenS.balanceOf(Alice);
                assert.strictEqual((erPulp*1 - beforeStrike*1 - erPulp) <= ROUNDING_ERR, true, 'rPulp not equal');
                assert.strictEqual((iStrike*1 + (ONE_ETHER * beforeStrike / toWei('1'))*1 - eStrike) <= ROUNDING_ERR, true, 'Strike not equal');
            });
        });

        
        describe('PrimeOption.close()', () => {
            beforeEach(async () => {

            });

            it('reverts if rPulp is less than ratio', async () => {
                await truffleAssert.reverts(
                    _tokenP.close(
                        MILLION_ETHER,
                        {from: Alice, value: 0}),
                    "ERR_BAL_REDEEM"
                );
            });


            it('closes position', async () => {
                let irPulp = await _tokenR.balanceOf(Alice);
                let ioPulp = await _tokenP.balanceOf(Alice);
                let iEth = await _tokenU.methods.balanceOf(Alice).call();
                let ratio = await _tokenP.ratio();
                let strikeBefore = ONE_ETHER*1 * ratio*1 / toWei('1');
                await _tokenP.close(ONE_ETHER, {from: Alice, value: 0});
                let erPulp = await _tokenR.balanceOf(Alice);
                let eoPulp = await _tokenP.balanceOf(Alice);
                let eEth = await _tokenU.methods.balanceOf(Alice).call();
                assert.strictEqual((erPulp*1 - strikeBefore*1 - erPulp) <= ROUNDING_ERR, true, `expected redeem ${erPulp}, actual: ${erPulp*1 + strikeBefore*1 - erPulp}`);
                assert.strictEqual((eoPulp*1 - ONE_ETHER*1 - eoPulp) <= ROUNDING_ERR, true, 'oPulp not equal');
                assert.strictEqual((iEth*1 + ONE_ETHER*1 - eEth) <= ROUNDING_ERR, true, `expectedEth: ${eEth} actual: ${iEth*1 + ONE_ETHER*1 - eEth}`);
            });
        });
    }); 
})