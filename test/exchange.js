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