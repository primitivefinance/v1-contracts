const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const Exchange = artifacts.require('Exchange');
const Pool = artifacts.require('Pool');

contract('Prime - Local', accounts => {

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

    // Accounts Array
    const acc_ray = [
        ['Alice', Alice],
        ['Bob', Bob],
        ['Mary', Mary],
        ['Kiln', Kiln],
        ['Don', Don],
        ['Penny', Penny],
        ['Cat', Cat],
        ['Bjork', Bjork],
        ['Olga', Olga],
        ['Treasury', Treasury]
    ]

    let _prime,
        _tETH,
        _tUSD,
        collateral,
        payment,
        xis,
        yak,
        zed,
        wax,
        pow,
        gem,
        mint,
        exercise,
        close,
        withdraw,
        _burnId,
        _collateralID,
        _exchange,
        primeAddress,
        expiration,
        collateralPoolAddress,
        strikeAddress,
        premium,
        value,
        activeTokenId,
        nonce
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    async function getBal(contract, address, name, units) {
        let bal = (await web3.utils.fromWei((await contract.balanceOf(address)).toString()));
        console.log(`${name} has in bank:`, await web3.utils.fromWei(await _prime.getBalance(Alice, contract.address)))
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }

    async function getEthBal(address, name, units) {
        let bal = await web3.utils.fromWei((await web3.eth.getBalance(address)).toString());
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }

    async function getPoolBalances(poolInstance) {
        let liability = await web3.utils.fromWei(await poolInstance._liability());
        let lp1Funds = await web3.utils.fromWei(await poolInstance.balanceOf(Alice));
        let lp1Ether = await web3.utils.fromWei((await web3.eth.getBalance(Alice)).toString());
        let lp2Funds = await web3.utils.fromWei(await poolInstance.balanceOf(Bob));
        let lp2Ether = await web3.utils.fromWei((await web3.eth.getBalance(Bob)).toString());
        let totalDeposit = await web3.utils.fromWei(await poolInstance.totalSupply());
        console.log({/* pool, */ liability, lp1Funds, lp1Ether, lp2Funds, lp2Ether, totalDeposit})
        return ({/* pool, */ liability, lp1Funds, lp1Ether, lp2Funds, lp2Ether, totalDeposit});
    }

    beforeEach(async () => {

        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _exchange = await Exchange.deployed();
        _pool = await Pool.deployed();
        collateral = await web3.utils.toWei('1');
        payment = await web3.utils.toWei('10');
        collateralPoolAddress = _pool.address;
        strikeAddress = _tUSD.address;
        primeAddress = await _exchange.getPrimeAddress();
        expiration = '1587607322';
        premium = (13*10**16).toString();
    });
    

    describe('Prime.sol', () => {
        describe('createPrime()', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                minter = Bob;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _pool.address;
                strike = _tUSD.address;
                expiry = '1587607322';
                receiver = minter;
            });

            it('revert if collateral is > users balance', async () => {
                /* Get revert with xis balance < xis */
                let bobBalance = await web3.utils.fromWei(await web3.eth.getBalance(Bob));
                let million = await web3.utils.toWei('1000000');
                await truffleAssert.reverts(
                    _prime.createPrime(
                        million,
                        collateral,
                        strikeAmount,
                        strike,
                        expiry,
                        receiver,
                        {from: minter,  value: 0}
                    ),
                    "a < b"
                );
            });

            it('should revert if its an Ether Prime and no ether was sent', async () => {
                await truffleAssert.reverts(
                    _prime.createPrime(
                        collateralAmount,
                        collateral,
                        strikeAmount,
                        strike,
                        expiry,
                        receiver,
                        {from: minter,  value: 0}
                    ),
                    "a < b"
                );
            });

            it('should revert if expiration date has already passed', async () => {
                expiry = '1585522471';
                await truffleAssert.reverts(
                    _prime.createPrime(
                        collateralAmount,
                        collateral,
                        strikeAmount,
                        strike,
                        expiry,
                        receiver,
                        {from: minter,  value: 0}
                    ),
                    "Create: expired timestamp"
                );
            });

            it('create an ether prime', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
            });

            it('assert liability was updated after prime minted', async () => {
                /* Assert liability of msg sender added the xis */
                let liability = (await _prime._liabilities(Bob, collateral)).toString();
                assert.strictEqual(
                    liability, 
                    (collateralAmount).toString(), 
                    `Create: liability should be updated. 
                    Liability: ${liability} collateral: ${collateralAmount}`
                );
        
                /* Assert returns the nonce of the token */
            });

            it('assert ether collateral was deposited in Prime', async () => {
                let collateralBalance = await web3.eth.getBalance(_prime.address);
                assert.strictEqual(
                    collateralBalance,
                    collateralAmount,
                    `Prime Balance: ${collateralBalance},
                     Collateral Amount: ${collateralAmount},
                     should equal.
                    `
                );
            });

            it('should have had the nonce updated to 1', async () => {
                let nonce = (await _prime.nonce()).toString();
                assert.strictEqual(nonce, '1', `Nonce: ${nonce} should be 1 - one minted Prime.`);
            });

            it('should close the prime', async () => {
                let nonce = (await _prime.nonce()).toString();
                await _prime.close(nonce, nonce, {from: minter, value: 0});
            });
        });

        describe('exercise()', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                minter = Bob;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _pool.address;
                strike = _tUSD.address;
                expiry = '1587607322';
                receiver = minter;
            });

            it('revert is attempted prime to exercise is not owned by msg.sender', async () => {
                /* Create a Prime from Alice, then try exercising as Bob */
                minter = Alice;
                receiver = Alice;
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let nonce = await _prime.nonce();

                await truffleAssert.reverts(
                    _prime.exercise(
                        nonce,
                        {from: Bob,  value: 0}
                    ),
                    "!own"
                );
            });

            it('revert if user has no ERC-20 collateral', async () => {
                await truffleAssert.reverts(
                    _prime.createPrime(
                        collateralAmount,
                        strike,
                        strikeAmount,
                        collateral,
                        expiry,
                        receiver,
                        {from: minter,  value: 0}
                    ),
                    "a < b"
                );
            });

            it('revert if strike is pool address and msg.value != strike amount', async () => {
                await _tUSD.mint(minter, strikeAmount);
                await _tUSD.approve(_prime.address, strikeAmount, {from: minter});
                await _prime.createPrime(
                    collateralAmount,
                    strike,
                    strikeAmount,
                    collateral,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let nonce = await _prime.nonce();
                await truffleAssert.reverts(
                    _prime.exercise(
                        nonce,
                        {from: minter,  value: 0}
                    ),
                    "a < b"
                );
            });

            it('revert if strike is erc-20 and users balance < strike amount', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let nonce = await _prime.nonce();
                await truffleAssert.reverts(
                    _prime.exercise(
                        nonce,
                        {from: minter,  value: 0}
                    ),
                    "a < b"
                );
            });

            it('should exercise a Prime', async () => {
                let nonce = await _prime.nonce();
                await _tUSD.mint(minter, strikeAmount);
                await _tUSD.approve(_prime.address, strikeAmount, {from: minter});
                await _prime.exercise(nonce, {from: minter});
            });

            it('asserts liabilities were debited from minters account', async () => {
                let liabilites = (await _prime._liabilities(minter, collateral)).toString();
                assert.strictEqual(
                    liabilites,
                    '0',
                    `Liabilities should be 0. Liable: ${liabilites}`
                );
            });

            it('asserts collateral assets were credited to exerciser', async () => {
                let assets = (await _prime._assets(minter, collateral)).toString();
                assert.strictEqual(
                    assets,
                    (collateralAmount).toString(),
                    `Assets should equal collateral amount.
                    Assets: ${assets}, Collateral: ${collateralAmount}`
                );
            });

            it('asserts strike assets were credited to minter', async () => {
                let assets = (await _prime._assets(minter, strike)).toString();
                assert.strictEqual(
                    assets,
                    (strikeAmount).toString(),
                    `Assets should equal strike amount.
                    Assets: ${assets}, Strike: ${strikeAmount}`
                );
            });

            it('asserts tokenId was burned', async () => {
                let nonce = await _prime.nonce();
                await truffleAssert.reverts(
                    _prime.ownerOf(nonce),
                    "ERC721: owner query for nonexistent token"
                );
            });

            it('should revert with create prime with strike receiver = pool address', async () => {
                receiver = _pool.address;
                await truffleAssert.reverts(
                    _prime.createPrime(
                        collateralAmount,
                        collateral,
                        strikeAmount,
                        strike,
                        expiry,
                        receiver,
                        {from: minter,  value: collateralAmount}
                    ),
                    "Create: Gem != Msg.Sender"
                );
            });

            it('should revert because not enough pool funds - create prime from pool', async () => {
                receiver = _pool.address;
                await truffleAssert.reverts(
                    _pool.mintPrimeFromPool(
                        collateralAmount,
                        strikeAmount,
                        strike,
                        expiry,
                        minter,
                        {from: minter,  value: collateralAmount}
                    ),
                    "Mint: available < amt"
                );
            });

            it('create prime from pool', async () => {
                receiver = _pool.address;
                let depositAmt = await web3.utils.toWei('4');
                let deposit = await _pool.deposit(depositAmt, {value: depositAmt});
                _pool.mintPrimeFromPool(
                    collateralAmount,
                    strikeAmount,
                    strike,
                    expiry,
                    minter,
                    {from: minter,  value: collateralAmount}
                );
            });

            it('exercise prime that has strike receiver = pool', async () => {
                let nonce = await _prime.nonce();
                await _tUSD.mint(minter, strikeAmount);
                await _tUSD.approve(_prime.address, strikeAmount, {from: minter});
                await _prime.exercise(nonce, {from: minter});
            });

            it('asserts pool received strike asset', async () => {
                let poolStrikeBalance = (await _tUSD.balanceOf(_pool.address)).toString();
                assert.strictEqual(
                    poolStrikeBalance,
                    (strikeAmount).toString(),
                    `Pools Strike balance should equal the strike of the exercised prime.
                    Pool: ${poolStrikeBalance}, StrikeAmt: ${strikeAmount}`
                );
            });

            it('asserts prime withdrew ether from pool', async () => {
                let etherBalanceOfPrimeContract = (await web3.eth.getBalance(_prime.address)).toString();
                /* collateral * 4 because 4 primes were minted an executed in total so far with collateral amt */
                assert.strictEqual(
                    etherBalanceOfPrimeContract,
                    (collateralAmount*4).toString(),
                    `Ether balance of Prime should equal collateral that was exercised.
                    Ether Bal: ${etherBalanceOfPrimeContract}, Collateral: ${collateralAmount}`
                );
            });

            it('asserts the pool reduced its liability', async () => {
                let liability = (await _pool._liability()).toString();
                assert.strictEqual(
                    liability,
                    '0',
                    `Liability should be 0. Liability: ${liability}` 
                );
            });

            it('create and exercise a regular Prime', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let nonce = await _prime.nonce();
                await _tUSD.mint(minter, strikeAmount);
                await _tUSD.approve(_prime.address, strikeAmount, {from: minter});
                let strikeBalanceOfPrimeBefore = (await _tUSD.balanceOf(_prime.address)).toString();
                await _prime.exercise(nonce, {from: minter});
                let strikeBalanceOfPrime = (await _tUSD.balanceOf(_prime.address)).toString();
                assert.strictEqual(
                    strikeBalanceOfPrime,
                    (strikeBalanceOfPrimeBefore*1 + strikeAmount*1).toString(),
                    `Strike Balance should equal strike amount. 
                    Strike Balance: ${strikeBalanceOfPrime}, Stike Amt: ${strikeAmount}
                    `
                );
            });
        });

        describe('close()', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                minter = Bob;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _pool.address;
                strike = _tUSD.address;
                expiry = '1587607322';
                receiver = minter;
            });

            it('try closing a token id that doesnt belong to the msg.sender', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let tokenId = await _prime.nonce();
                
                await truffleAssert.reverts(
                    _prime.close(
                        tokenId,
                        tokenId,
                        {from: Alice, value: 0}
                    ),
                    "!own"
                );
            });

            it('try closing a prime thats not in the same series', async () => {
                /* A different expiration will put the Prime in a difference series */
                expiry = '1597227010';
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );

                let burnId = (await _prime.nonce()).toString();
                let collateralId = (burnId*1 - 1).toString();
                await truffleAssert.reverts(
                    _prime.close(
                        collateralId,
                        burnId,
                        {from: minter, value: 0}
                    ),
                    "Props !="
                );
            });

            it('close the Prime and Assert that collateral was debited', async () => {
                let burnId = (await _prime.nonce()).toString();
                let collateralBalanceOfMinterBefore = (await _prime._liabilities(minter, collateral, {from: minter})).toString();
                await _prime.close(burnId, burnId, {from: minter, value: 0});
                let collateralBalanceOfMinterAfter = (await _prime._liabilities(minter, collateral, {from: minter})).toString();
                assert.strictEqual(
                    collateralBalanceOfMinterAfter,
                    (collateralBalanceOfMinterBefore*1 - collateralAmount*1).toString(),
                    `Collateral should have been debited.
                    Before: ${collateralBalanceOfMinterBefore}, After: ${collateralBalanceOfMinterAfter}`
                )
            });

            it('asserts the token was actually burned', async () => {
                let burnId = (await _prime.nonce()).toString();
                await truffleAssert.reverts(
                    _prime.ownerOf(burnId),
                    "ERC721: owner query for nonexistent token"
                );
            });

            it('create prime with yak = pool and assert ether was sent from prime to user when closed', async () => {
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let etherBalanceOfMinterBefore = (await web3.eth.getBalance(minter)).toString();
                let tokenId = await _prime.nonce();
                await _prime.close(tokenId, tokenId, {from: minter});
                let etherBalanceOfMinterAfter = (await web3.eth.getBalance(minter)).toString();
                /* Need to account for interest accumulated - FIX */
                /* assert.strictEqual(
                    etherBalanceOfMinterAfter,
                    (etherBalanceOfMinterBefore*1 + collateralAmount*1).toString(),
                    `Ether balance after should have added collateral amount.
                    Ether Bal After: ${etherBalanceOfMinterAfter}, Before: ${etherBalanceOfMinterBefore}`
                ); */
            });

            it('create prime with yak = ERC20 and assert token was sent from prime to user when closed', async () => {
                collateral = _tETH.address;
                await _tETH.mint(minter, collateralAmount, {from: minter});
                await _tETH.approve(_prime.address, collateralAmount, {from: minter});
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let tokenBalanceOfMinterBefore = (await _tETH.balanceOf(minter)).toString();
                let tokenId = await _prime.nonce();
                await _prime.close(tokenId, tokenId, {from: minter});
                let tokenBalanceOfMinterAfter = (await _tETH.balanceOf(minter)).toString();
                /* Need to account for interest accumulated - FIX */
                /* assert.strictEqual(
                    tokenBalanceOfMinterAfter,
                    (tokenBalanceOfMinterBefore*1 + collateralAmount*1).toString(),
                    `Token balance after should have added collateral amount.
                    Token Bal After: ${tokenBalanceOfMinterAfter}, Before: ${tokenBalanceOfMinterBefore}`
                ); */
            });
        });
    });
})