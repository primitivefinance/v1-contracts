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

        /* _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _exchange = await Exchange.deployed();
        _pool = await Pool.deployed(); */
        
        /* collateral = await web3.utils.toWei('1');
        payment = await web3.utils.toWei('10');
        collateralPoolAddress = _pool.address;
        strikeAddress = _tUSD.address;
        primeAddress = await _exchange.getPrimeAddress();
        expiration = '1587607322';
        premium = (13*10**16).toString(); */
    });
    

    describe('Prime.sol', () => {
        describe('createPrime()', () => {
            let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
            beforeEach(async () => {
                _prime = await Prime.deployed();
                _tUSD = await tUSD.deployed();
                _exchange = await Exchange.deployed();
                _pool = await Pool.deployed();

                minter = Bob;
                collateralAmount = await web3.utils.toWei('1');
                strikeAmount = await web3.utils.toWei('10');
                collateral = _pool.address;
                strike = _tUSD.address;
                expiry = '1587607322';
                receiver = minter;
            });

            it('revert if collateral is > users balance', async () => {
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
                collateral = _tUSD.address;
                await _tUSD.mint(minter, collateralAmount, {from: minter});
                await _tUSD.approve(_prime.address, collateralAmount, {from: minter});
                await _prime.createPrime(
                    collateralAmount,
                    collateral,
                    strikeAmount,
                    strike,
                    expiry,
                    receiver,
                    {from: minter,  value: collateralAmount}
                );
                let tokenBalanceOfMinterBefore = (await _tUSD.balanceOf(minter)).toString();
                let tokenId = await _prime.nonce();
                await _prime.close(tokenId, tokenId, {from: minter});
                let tokenBalanceOfMinterAfter = (await _tUSD.balanceOf(minter)).toString();
                /* Need to account for interest accumulated - FIX */
                /* assert.strictEqual(
                    tokenBalanceOfMinterAfter,
                    (tokenBalanceOfMinterBefore*1 + collateralAmount*1).toString(),
                    `Token balance after should have added collateral amount.
                    Token Bal After: ${tokenBalanceOfMinterAfter}, Before: ${tokenBalanceOfMinterBefore}`
                ); */
            });
        });

        describe('withdraw()', () => {
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

            it('mint a prime, then try to withdraw more collateral than exercised', async () => {
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
                await _tUSD.mint(minter, strikeAmount);
                await _tUSD.approve(_prime.address, strikeAmount, {from: minter});
                await _prime.exercise(tokenId, {from: minter, value: 0});
                let million = await web3.utils.toWei('1000000');
                await truffleAssert.reverts(
                    _prime.withdraw(million, collateral, {from: minter, value: 0}),
                    "a < b"
                );
            });

            it('should withdraw valid amount and debited it from assets', async () => {
                let assetBalanceBefore = (await _prime._assets(minter, collateral, {from: minter, value: 0}));
                await _prime.withdraw(collateralAmount, collateral, {from: minter, value: 0});
                let assetBalanceAfter = (await _prime._assets(minter, collateral, {from: minter, value: 0})).toString();
                assert.strictEqual(
                    assetBalanceAfter,
                    (assetBalanceBefore*1 - collateralAmount*1).toString(),
                    `Withdrawed assets should have been debited.
                    Before: ${(assetBalanceBefore*1 - collateralAmount*1).toString()}, After: ${assetBalanceAfter}`
                );
            });
        });
    });

    describe('Pool.sol', () => {
        describe('setExchangeAddress()', () => {
            let minter;
            beforeEach(async () => {
                minter = Bob;
                _prime = await Prime.deployed();
                _tUSD = await tUSD.deployed();
                _exchange = await Exchange.deployed();
                _pool = await Pool.deployed();
            });

            it('should assert only owner can call set exchange', async () => {
                await truffleAssert.reverts(
                    _pool.setExchangeAddress(minter, {from: minter}),
                    "Ownable: caller is not the owner"
                );
            });
        });

        describe('deposit()', () => {
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

            it('should revert if msg.value != deposit amount', async () => {
                await truffleAssert.reverts(
                    _pool.deposit(collateralAmount, {from: minter, value: strikeAmount}),
                    "Deposit: Val < deposit"
                );
            });

            it('check initial LP token mint is equal to deposit amount', async () => {
                let deposit = await _pool.deposit(collateralAmount, {from: minter, value: collateralAmount});
                await truffleAssert.eventEmitted(deposit, "Deposit");
                let mintedPulpTokens = (await _pool.balanceOf(minter)).toString();
                /* FIX - NEED TO FIND A WAY TO CALCULATE EXCHANGE RATE BETWEEN PULP AND ETHER */
                /* assert.strictEqual(
                    mintedPulpTokens,
                    collateralAmount,
                    `Minted LP tokens should match deposit for the initial supply.
                    Minted: ${mintedPulpTokens}, Collateral: ${collateralAmount}`
                ); */
            });

            it('asserts the ether was converted into cEther', async () => {
                /* FIX */

                /* let etherBalanceOfPool = (await web3.eth.getBalance(_pool.address)).toString();
                let cEtherBalanceOfPool = (await _pool.getPoolBalance()).toString();
                assert.strictEqual(
                    etherBalanceOfPool,
                    cEtherBalanceOfPool,
                    `Gets balance of underlying through cEther and compares to deposit.
                    Ether Bal: ${etherBalanceOfPool}, cEther Equivalent: ${cEtherBalanceOfPool}`
                ); */
            });

            it('asserts deposit event was emitted', async () => {
                let deposit = await _pool.deposit(collateralAmount, {from: minter, value: collateralAmount});
                await truffleAssert.eventEmitted(deposit, 'Deposit');
            });
        });

        describe('withdraw()', () => {
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
            
            it('revert with attempted withdraw amount is greater than deposit', async () => {
                let million = (await web3.utils.toWei('1000000')).toString();
                await truffleAssert.reverts(
                    _pool.withdraw(million, {from: minter, value: 0}),
                    `Withdraw: Bal < withdraw`
                )
            });

            it('revert with attempted withdraw amount is greater than max draw', async () => {
                /* FIX - need to find a way to fill the pool with just enough liabilities to trigger this */
                
                /* Make a liabilitiy */
                /* await _pool.mintPrimeFromPool(
                    collateralAmount,
                    strikeAmount,
                    strike,
                    expiry,
                    minter,
                    {from: minter, value: collateralAmount}
                );
                let totalBalance = (await _pool.totalSupply()).toString();
                await truffleAssert.reverts(
                    _pool.withdraw(
                        totalBalance,
                        {from: minter, value: 0}
                    ),
                    "Withdraw: max burn < amt"
                ); */
            });
        });

        describe('closePosition()', () => {
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

            it('should revert, attempts to close a position larger than their position', async () => {
                let million = (await web3.utils.toWei('1000000')).toString();
                await truffleAssert.reverts(
                    _pool.closePosition(million, {from: minter, value: 0}),
                    "Close: Eth Bal < amt"
                );
            });

            it('should revert, attempts to close a position without paying its debt', async () => {
                let pulpBalanceOfUser = (await _pool.balanceOf(minter, {from: minter})).toString();
                /* Make a liabilitiy */
                await _pool.mintPrimeFromPool(
                    collateralAmount,
                    strikeAmount,
                    strike,
                    expiry,
                    minter,
                    {from: minter, value: collateralAmount}
                );
                await truffleAssert.reverts(
                    _pool.closePosition(pulpBalanceOfUser, {from: minter, value: 0}),
                    "Close: Value < debt"
                );
            });

            it('should close position by paying debt', async () => {
                let pulpBalanceOfUser = (await _pool.balanceOf(minter, {from: minter})).toString();
                let etherBalanceOfUserBefore = (await web3.eth.getBalance(minter)).toString();
                let close = await _pool.closePosition(pulpBalanceOfUser, {from: minter, value: pulpBalanceOfUser});
                let pulpBalanceOfUserAfter = (await _pool.balanceOf(minter, {from: minter})).toString();
                let etherBalanceOfUserAfter = (await web3.eth.getBalance(minter)).toString();
                assert.strictEqual(
                    pulpBalanceOfUserAfter,
                    (pulpBalanceOfUser*1 - pulpBalanceOfUser*1).toString(),
                    `Should burn all the pulp tokens.
                    Pulp before: ${pulpBalanceOfUser}, Pulp after: ${pulpBalanceOfUserAfter}`
                );
                await truffleAssert.eventEmitted(close, 'Close');
                /* Assertion below has 0.0001 ether difference because of Compound interest - FIX */
                /* assert.strictEqual(
                    etherBalanceOfUserAfter,
                    (etherBalanceOfUserBefore*1 + pulpBalanceOfUser*1).toString(),
                    `Should have sent ether proportional to pulp burned.
                    Ether before: ${etherBalanceOfUserBefore}, Ether After: ${etherBalanceOfUserAfter}`
                ); */
            });
        });
    });

    describe('Exchange.sol', () => {
        let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
        beforeEach(async () => {
            _prime = await Prime.deployed();
            _tUSD = await tUSD.deployed();
            _exchange = await Exchange.deployed();
            _pool = await Pool.deployed();

            minter = Bob;
            collateralAmount = await web3.utils.toWei('1');
            strikeAmount = await web3.utils.toWei('10');
            collateral = _pool.address;
            strike = _tUSD.address;
            expiry = '1607775120';
            receiver = minter;
            
        });
        it('should assert only owner can call set exchange', async () => {
            await truffleAssert.reverts(
                _exchange.setPoolAddress(Bob, {from: Bob}),
                "Ownable: caller is not the owner"
            );
        });

        it('should assert only owner can call killswitch', async () => {
            await truffleAssert.reverts(
                _exchange.killSwitch({from: Bob}),
                "Ownable: caller is not the owner"
            );
        });

        it('should assert only owner can call unpause', async () => {
            await truffleAssert.reverts(
                _exchange.unpause({from: Bob}),
                "Ownable: caller is not the owner"
            );
        });

        it('should revert if user trys to withdraw more ether than their balance', async () => {
            let amount = await web3.utils.toWei('10');
            await truffleAssert.reverts(
                _exchange.withdrawEther(amount, {from: Bob}),
                "Bal < amount"
            );
        });

    describe('sellOrder()', () => {
        let minter, collateralAmount, strikeAmount, collateral, strike, expiry, receiver;
        beforeEach(async () => {
            _prime = await Prime.deployed();
            _tUSD = await tUSD.deployed();
            _exchange = await Exchange.deployed();
            _pool = await Pool.deployed();

            minter = Bob;
            collateralAmount = await web3.utils.toWei('1');
            strikeAmount = await web3.utils.toWei('10');
            collateral = _pool.address;
            strike = _tUSD.address;
            expiry = '1607775120';
            receiver = minter;
            
        });

        it('should revert if tokenId <= 0', async () => {
            let askPrice = collateralAmount;
            let tokenId = 0;
            await truffleAssert.reverts(
                _exchange.sellOrder(tokenId, askPrice, {from: minter}),
                "Invalid Token"
            );
            tokenId = -1;
            /* ah, maybe since uint it converts to 1? 
            this is interesting, reverts because expired not because invalid? 
            even though require(valid) is first */
            await truffleAssert.reverts(
                _exchange.sellOrder(tokenId, askPrice, {from: minter}),
                "expired"
            );
        });

        it('should revert if askPrice <= 0', async () => {
            let askPrice = 0;
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            );
            let tokenId = await _prime.nonce();
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            await truffleAssert.reverts(
                _exchange.sellOrder(tokenId, askPrice, {from: minter}),
                "Ask < 0"
            );
            /* How to deal with negatives? */
            /* askPrice = -1;
            await truffleAssert.reverts(
                _exchange.sellOrder(tokenId, askPrice, {from: minter}),
                "Ask < 0"
            ); */
        });

        it('should revert if token is expired', async () => {
            let expiry = '1607775120';
            /* FIX - needs a javascript function to get a unix timestamp that will expire immediatly after */
            /* await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strikeAddress,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            )
            let tokenId = await _prime.nonce();
            await truffleAssert.reverts(
                _exchange.sellOrder(tokenId, askPrice, {from: minter}),
                "Token expired"
            ); */
        });

        it('should revert if token is already listed', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            ); /* might not work because it wont let an expired token to be made */
            let tokenId = await _prime.nonce();
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            await _exchange.sellOrder(tokenId, collateralAmount, {from: minter});
            await truffleAssert.reverts(
                _exchange.sellOrder(tokenId, collateralAmount, {from: minter}),
                "Token listed already"
            );
        });

        it('should fill unfilled buy order', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            ); /* might not work because it wont let an expired token to be made */
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.75')).toString();
            let askPrice = (await web3.utils.toWei('0.5')).toString();
            let buyOrderUnfilled = await _exchange.buyOrderUnfilled(
                bidPrice,
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry, 
                {from: minter, value: collateralAmount}
            );
            await truffleAssert.eventEmitted(buyOrderUnfilled, 'BuyOrderUnfilled');
            /* GOES TO FILL UNFILLED BUY ORDER INTERNAL FUNCTION */
            let chain = await _prime.getChain(tokenId);
            let buyNonce = await _exchange._unfilledNonce(chain);
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: minter});
            
            await truffleAssert.eventEmitted(sellOrder, 'SellOrder');
            await truffleAssert.eventEmitted(sellOrder, 'FillUnfilledBuyOrder');

            let etherBalanceOfSeller = (await _exchange._etherBalance(minter, {from: minter})).toString();
            assert.strictEqual(
                etherBalanceOfSeller,
                askPrice,
                `Should have the ask price credited to the sellers balance.
                ether bal credit: ${etherBalanceOfSeller}, ask price: ${askPrice}`
            );
            /* Need to work on fee assertions */
        });

        it('assert buyer received prime from seller', async () => {
            let tokenId = await _prime.nonce();
            let owner = await _prime.ownerOf(tokenId);
            assert.strictEqual(
                owner,
                minter,
                `Owner should == minter, because they sold then bought it.
                owner: ${owner} minter: ${minter}`
            );
        });

        it('assert buyer received prime from seller', async () => {
            let tokenId = await _prime.nonce();
            let owner = await _prime.ownerOf(tokenId);
            assert.strictEqual(
                owner,
                minter,
                `Owner should == minter, because they sold then bought it.
                owner: ${owner} minter: ${minter}`
            );
        });

        it('should fill a buy order for the specific token ID', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            ); /* might not work because it wont let an expired token to be made */
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let askPrice = (await web3.utils.toWei('0.5')).toString();
            /* Pool should not have funds, else itll fill order */
            let buyOrder = await _exchange.buyOrder(
                tokenId,
                bidPrice,
                {from: minter, value: collateralAmount}
            );
            await truffleAssert.eventEmitted(buyOrder, 'BuyOrder');
            /* GOES TO FILL ORDER INTERNAL FUNCTION */
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: minter});
            await truffleAssert.eventEmitted(sellOrder, 'FillOrder');
            /* Need to work on fee assertions */
        });

        it('should list a sell order if no buy orders', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            ); /* might not work because it wont let an expired token to be made */
            let tokenId = await _prime.nonce();
            let askPrice = (await web3.utils.toWei('0.5')).toString();
            /* Pool should not have funds, else itll fill order */
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: minter});
            await truffleAssert.eventEmitted(sellOrder, 'SellOrder');
        });

        it('should have updated state with sell order', async () => {
            let tokenId = await _prime.nonce();
            let askPrice = (await web3.utils.toWei('0.5')).toString();
            let sellOrder = await _exchange.getSellOrder(tokenId, {from: minter});
            assert.strictEqual(
                sellOrder.seller,
                minter,
                'Sell order seller should be minter'
            );
            assert.strictEqual(
                (sellOrder.askPrice).toString(),
                askPrice,
                'Sell order ask should be ask price'
            );
            assert.strictEqual(
                (sellOrder.tokenId).toString(),
                (tokenId).toString(),
                `Sell order token id should be token id
                sell order: ${sellOrder.tokenId}, tokenId: ${tokenId}`
            );
        });

        it('should have transferred Prime from seller to exchange', async () => {
            let tokenId = await _prime.nonce();
            let owner = await _prime.ownerOf(tokenId, {from: minter});
            assert.strictEqual(
                owner,
                _exchange.address,
                `Owner should be exchange.
                owner: ${owner} exchange: ${_exchange.address}`
            );
        });
    });

    describe('buyOrder()', () => {
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
        
        it('should revert if tokenId <= 0', async () => {
            let bidPrice = collateralAmount;
            let tokenId = 0;
            await truffleAssert.reverts(
                _exchange.buyOrder(tokenId, bidPrice, {from: minter}),
                "Invalid Token"
            );
        });

        it('should revert if bidPrice <= 0', async () => {
            let bidPrice = 0;
            let tokenId = 1;
            await truffleAssert.reverts(
                _exchange.buyOrder(tokenId, bidPrice, {from: minter}),
                "Bid < 0"
            );
        });

        /* Fee unit tests - need to be reworked */

        it('should fill a buy order for an already listed tokenId', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                Alice,
                {from: Alice, value: collateralAmount}
            );
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            await _prime.approve(_exchange.address, tokenId, {from: Alice});
            await _exchange.sellOrder(tokenId, bidPrice, {from: Alice});
            let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: minter, value: collateralAmount});
            await truffleAssert.eventEmitted(buyOrder, 'FillOrder');
        });

        it('asserts sellers exchange balance had the ask price added to it', async () => {
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let etherBalanceOfSeller = (await _exchange._etherBalance(Alice, {from: Alice})).toString();
            assert.strictEqual(
                etherBalanceOfSeller,
                bidPrice,
                `Ether balance should = ask price = bid price. 
                ether bal: ${etherBalanceOfSeller} bid/ask: ${bidPrice}`
            );
        });

        it('asserts prime token was transferred from exchange to buyer', async () => {
            let tokenId = await _prime.nonce();
            let owner = await _prime.ownerOf(tokenId);
            assert.strictEqual(
                owner,
                minter,
                `Minter purchased it so they should be the owner.`
            );
        });

        it('should submit a buy order for a tokenId', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            );
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: minter, value: collateralAmount});
            await truffleAssert.eventEmitted(buyOrder, 'BuyOrder');
        });

        it('should have updated state with a buy order for token Id', async () => {
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let buyOrder = await _exchange.getBuyOrder(tokenId, {from: minter});
            assert.strictEqual(
                buyOrder.buyer,
                minter,
                'Buy order buyer should be minter'
            );
            assert.strictEqual(
                (buyOrder.bidPrice).toString(),
                (bidPrice).toString(),
                'Buy order bid should be bid price'
            );
            assert.strictEqual(
                (buyOrder.tokenId).toString(),
                (tokenId).toString(),
                'Buy order token id should be token id'
            );
        });
    });

    describe('closeSellOrder()', () => {
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

        it('should revert if trying to close a token ID <= 0', async () => {
            let tokenId = 0;
            await truffleAssert.reverts(
                _exchange.closeSellOrder(tokenId, {from: minter}),
                "Invalid Token"
            );
        });

        it('should revert is trying to close sell order without being seller', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            );
            let tokenId = await _prime.nonce();
            let askPrice = (await web3.utils.toWei('0.5')).toString();
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: minter});
            await truffleAssert.reverts(
                _exchange.closeSellOrder(tokenId, {from: Alice}),
                "Msg.sender != seller"
            );
        });

        it('close sell order', async () => {
            let tokenId = await _prime.nonce();
            let askPrice = (await web3.utils.toWei('0.5')).toString();
            let closeSellOrder = await _exchange.closeSellOrder(tokenId, {from: minter});
            await truffleAssert.eventEmitted(closeSellOrder, 'CloseOrder');
        });

        it('assert sell order was cleared from state', async () => {
            let tokenId = await _prime.nonce();
            let askPrice = 0;
            await _prime.approve(_exchange.address, tokenId, {from: minter});
            let sellOrder = await _exchange.getSellOrder(tokenId, {from: minter});
            let zeroAddress = '0x0000000000000000000000000000000000000000';
            assert.strictEqual(
                sellOrder.seller,
                zeroAddress,
                'Sell order Seller should be zero address'
            );
            assert.strictEqual(
                (sellOrder.askPrice).toString(),
                (askPrice).toString(),
                'Sell order bid should be 0'
            );
            assert.strictEqual(
                (sellOrder.tokenId).toString(),
                '0',
                'Sell order token id should be 0'
            );
        });

        it('assert prime was transferred from exchange to seller', async () => {
            let tokenId = await _prime.nonce();
            let owner = await _prime.ownerOf(tokenId, {from: minter});
            assert.strictEqual(
                owner,
                minter,
                `Should be seller who receives prime token back.`
            );
        });
    });

    describe('closeBuyOrder()', () => {
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

        it('should revert if trying to close a token ID <= 0', async () => {
            let tokenId = 0;
            await truffleAssert.reverts(
                _exchange.closeBuyOrder(tokenId, {from: minter}),
                "Invalid Token"
            );
        });

        it('should revert is trying to close buy order without being buyer', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            );
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: minter, value: collateralAmount});
            await truffleAssert.reverts(
                _exchange.closeBuyOrder(tokenId, {from: Alice}),
                "Msg.sender != buyer"
            );
        });

        it('close buy order', async () => {
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: minter, value: collateralAmount});
            let closeBuyOrder = await _exchange.closeBuyOrder(tokenId, {from: minter});
            await truffleAssert.eventEmitted(closeBuyOrder, 'CloseOrder');
        });

        it('assert buy order was cleared from state', async () => {
            let tokenId = await _prime.nonce();
            let bidPrice = 0;
            let buyOrder = await _exchange.getBuyOrder(tokenId, {from: Alice});
            let zeroAddress = '0x0000000000000000000000000000000000000000';
            assert.strictEqual(
                buyOrder.buyer,
                zeroAddress,
                'Buy order buyer should be zero address'
            );
            assert.strictEqual(
                (buyOrder.bidPrice).toString(),
                (bidPrice).toString(),
                'Buy order bid should be 0'
            );
            assert.strictEqual(
                (buyOrder.tokenId).toString(),
                '0',
                'Buy order token id should be 0'
            );
        });

        it('assert prime bid was added to withdraw amount', async () => {
            let tokenId = await _prime.nonce();
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let etherBalanceOfBuyer = (await _exchange._etherBalance(Alice, {from: Alice})).toString();
            assert.strictEqual(
                etherBalanceOfBuyer,
                bidPrice,
                `Bid price should be users balance in exchange.`
            );
        });
    });
    
    describe('closeUnfilledBuyOrder()', () => {
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

        it('should revert if trying to close buy order without being buyer', async () => {
            await _prime.createPrime(
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                minter,
                {from: minter, value: collateralAmount}
            );
            let tokenId = await _prime.nonce();
            let chain = await _prime.getChain(tokenId);
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let buyOrderUnfilled = await _exchange.buyOrderUnfilled(
                bidPrice,
                collateralAmount,
                collateral,
                strikeAmount,
                strike,
                expiry,
                {from: Alice, value: collateralAmount}
            );

            let buyOrderNonce = await _exchange._unfilledNonce(chain);
            tokenId = 0;
            await truffleAssert.reverts(
                _exchange.closeUnfilledBuyOrder(chain, buyOrderNonce, {from: minter}),
                "Msg.sender != buyer"
            );
        });

        it('close unfilled buy order', async () => {
            let tokenId = await _prime.nonce();
            let chain = await _prime.getChain(tokenId);
            let buyOrderNonce = await _exchange._unfilledNonce(chain);
            let closeUnfilledBuyOrder = await _exchange.closeUnfilledBuyOrder(chain, buyOrderNonce, {from: Alice});
            await truffleAssert.eventEmitted(closeUnfilledBuyOrder, 'CloseUnfilledBuyOrder');
        });

        it('assert unfilled buy order was cleared from state', async () => {
            let tokenId = await _prime.nonce();
            let bidPrice = 0;
            let chain = await _prime.getChain(tokenId);
            let buyOrderNonce = await _exchange._unfilledNonce(chain);
            let buyOrder = await _exchange._buyOrdersUnfilled(chain, buyOrderNonce, {from: Alice});
            let zeroAddress = '0x0000000000000000000000000000000000000000';
            assert.strictEqual(
                buyOrder.buyer,
                zeroAddress,
                'Buy order buyer should be zero address'
            );
            assert.strictEqual(
                (buyOrder.bidPrice).toString(),
                (bidPrice).toString(),
                'Buy order bid should be 0'
            );
            /* Undefined tokenId */
            /* assert.strictEqual(
                (buyOrder.tokenId).toString(),
                '0',
                `Buy order token id should be 0
                buy order tokenid: ${buyOrder.tokenId}`
            ); */
        });

        it('assert prime was transferred from exchange to buyer', async () => {
            let bidPrice = (await web3.utils.toWei('0.5')).toString();
            let etherBalanceOfBuyer = (await _exchange._etherBalance(Alice, {from: Alice})).toString();
            assert.strictEqual(
                etherBalanceOfBuyer,
                bidPrice,
                `Bid price should be users balance in exchange.`
            );
        });
    });
    });
})