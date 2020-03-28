const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");
const Exchange = artifacts.require('Exchange');

contract('Exchange', accounts => {

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
        val
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    async function getBal(contract, address, name, units) {
        let bal = (await web3.utils.fromWei((await contract.balanceOf(address)).toString()));
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }

    async function getEthBal(address, name, units) {
        let bal = await web3.utils.fromWei((await web3.eth.getBalance(address)).toString());
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }


    beforeEach(async () => {

        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _tETH = await tETH.deployed();
        _exchange = await Exchange.deployed();
        collateral = await web3.utils.toWei('1');
        payment = await web3.utils.toWei('10');
        primeAddress = await _exchange.getPrimeAddress();

        await getBal(_tUSD, Alice, 'Alice', 'tUSD');
        await getBal(_tETH, Alice, 'Alice', 'tETH');
        await getEthBal(Alice, 'Alice', 'ETH')

        await getBal(_tUSD, Bob, 'Bob', 'tUSD');
        await getBal(_tETH, Bob, 'Bob', 'tETH');
        await getEthBal(Bob, 'Bob', 'ETH')
        
        
        await _tETH.approve(_prime.address, payment);
        await _tUSD.approve(_prime.address, payment);
        await _tETH.approve(_prime.address, payment, {from: Bob});
        await _tUSD.approve(_prime.address, payment, {from: Bob});

        await _tETH.mint(Alice, payment);
        await _tUSD.mint(Alice, payment);
        await _tETH.mint(Bob, payment);
        await _tUSD.mint(Bob, payment);
        val = (9*10**18).toString();

    });
    

    it('Prime mint and exchange sell order', async () => {
        let cAmt = (10**18).toString();
        let sAmt = (10**20).toString();
        await _tETH.approve(_prime.address, sAmt);
        await _tUSD.approve(_prime.address, sAmt);

        let xis, yak, zed, wax, pow, gem;
        xis = cAmt;
        yak = _tETH.address;
        zed = sAmt;
        wax = _tUSD.address;
        pow = '1600473585';
        gem = _exchange.address;

        /* TOKEN MINTED TO ALICE */
        let mint = await _prime.createPrime(xis, yak, zed, wax, pow, gem);
        let tokenId = await _prime.nonce();
        console.log((tokenId).toString());
        let buyer = Bob;
        let seller = Alice;

        let buyerBal = await web3.utils.fromWei(await web3.eth.getBalance(buyer));
        let sellerBal =  await web3.utils.fromWei(await web3.eth.getBalance(seller));
        let bidPrice = (5*10**18).toString(); // 0.5 eth
        let askPrice = (10**17).toString(); // 0.1 eth
        let netPrice = ((bidPrice - askPrice) / 10**18).toString();

        /* ALICE APPROVES EXCHANGE TO SELL TOKEN */
        await _prime.approve(_exchange.address, tokenId, {from: seller});
        

        /* BOB SUBMITS BUY ORDER FOR TOKEN */
        let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: buyer, value: val});

        /* ALICE SUBMITS SELL ORDER FOR TOKEN */
        let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: seller});
        console.log(sellOrder.logs)
        
        buyerBal = await web3.utils.fromWei(await web3.eth.getBalance(buyer)) - buyerBal;
        sellerBal =  await web3.utils.fromWei(await web3.eth.getBalance(seller)) - sellerBal;
        console.log({buyerBal, sellerBal, netPrice})

        let owner = await _prime.ownerOf(tokenId);
        assert.strict(owner, buyer, `buyer should be owner of ${tokenId}`);

        /* CHECK BUY ORDER CLEARED */
        let buyOrders = await _exchange.getBuyOrder(tokenId);
        console.log({buyOrders})

    });

    it('can handle multiple orders', async () => {

        async function mintPrime(address) {
            let xis, yak, zed, wax, pow, gem;
            xis = collateral;
            yak = _tETH.address;
            zed = payment;
            wax = _tUSD.address;
            pow = '1600473585';
            gem = _exchange.address;

            /* TOKEN MINTED TO ADDRESS */
            let mint = await _prime.createPrime(xis, yak, zed, wax, pow, gem, {from: address});
            let tokenId = await _prime.nonce();
            return tokenId;
        }

        async function buyOrder(address, bid, tokenId) {
            let bidPrice = (bid*10**17).toString(); // 0.5 eth

            /* ADDRESS SUBMITS BUY ORDER FOR TOKEN */
            let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: address, value: val});
            return buyOrder;
        }

        async function sellOrder(address, ask, tokenId) {
            let askPrice = (ask*10**17).toString(); // 0.5 eth
            /* ADDRESS APPROVES EXCHANGE TO SELL TOKEN */
            await _prime.approve(_exchange.address, tokenId, {from: address});

            /* ADDRESS SUBMITS BUY ORDER FOR TOKEN */
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: address});
            return sellOrder;
        }

        let aliceToken1 = await mintPrime(Alice);
        let bobToken1 = await mintPrime(Bob);
        

        let aliceBal = await web3.utils.fromWei(await web3.eth.getBalance(Alice));
        let bobBal =  await web3.utils.fromWei(await web3.eth.getBalance(Bob));

        let bobBid = 2.5;
        let bobAsk = 3.5;
        let aliceBid = 4;
        let aliceAsk = 1;

        /* 
            BOB SELLS HIS TOKEN FOR 3.5 ETH
            ALICE SELLS HER TOKEN FOR 1 ETH

            BOBS BALANCE SHOULD INCREASE BY 2.5
            ALICE'S BALANCE SHOULD DECREASE BY 2.5
        
        */
        let bobBuyToken = await buyOrder(Bob, bobBid, aliceToken1);
        let bobSellToken = await sellOrder(Bob, bobAsk, bobToken1);

        let aliceBuyToken = await buyOrder(Alice, aliceBid, bobToken1);
        let aliceSellToken = await sellOrder(Alice, aliceAsk, aliceToken1);

        /* console.log((aliceBuyToken.logs[1].args._filledPrice / 10**18).toString())
        console.log((aliceSellToken.logs[0].args._filledPrice / 10**18).toString()) */

        aliceBal = await web3.utils.fromWei(await web3.eth.getBalance(Alice)) - aliceBal;
        bobBal =  await web3.utils.fromWei(await web3.eth.getBalance(Bob)) - bobBal;
        let aliceNet = aliceAsk - bobAsk;
        let bobNet = bobAsk - aliceAsk;
        console.log({aliceBal, bobBal, aliceNet, bobNet})

    });

    it('handles close order', async () => {
        async function mintPrime(address) {
            let xis, yak, zed, wax, pow, gem;
            xis = collateral;
            yak = _tETH.address;
            zed = payment;
            wax = _tUSD.address;
            pow = '1600473585';
            gem = _exchange.address;

            /* TOKEN MINTED TO ADDRESS */
            let mint = await _prime.createPrime(xis, yak, zed, wax, pow, gem, {from: address});
            let tokenId = await _prime.nonce();
            return tokenId;
        }

        async function sellOrder(address, ask, tokenId) {
            let askPrice = (ask*10**18).toString(); // 0.5 eth
            /* ADDRESS APPROVES EXCHANGE TO SELL TOKEN */
            await _prime.approve(_exchange.address, tokenId, {from: address});

            /* ADDRESS SUBMITS BUY ORDER FOR TOKEN */
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: address});
            return sellOrder;
        }

        let aliceToken1 = await mintPrime(Alice);
        let aliceSellToken = await sellOrder(Alice, 4, aliceToken1);
        /* let close = await _exchange.closeOrder(aliceToken1);
        console.log(close.logs) */

    });

    it('gets rank', async () => {
        async function mintPrime(address) {
            let xis, yak, zed, wax, pow, gem;
            xis = collateral;
            yak = _tETH.address;
            zed = payment;
            wax = _tUSD.address;
            pow = '1600473585';
            gem = _exchange.address;

            /* TOKEN MINTED TO ADDRESS */
            let mint = await _prime.createPrime(xis, yak, zed, wax, pow, gem, {from: address});
            let tokenId = await _prime.nonce();
            return tokenId;
        }

        let aliceToken1 = await mintPrime(Alice);

        let chain = (await _prime.getChain(aliceToken1));
        console.log({chain})
    });

    it('fill unfilled buy order', async () => {
        async function mintPrime(address) {
            let xis, yak, zed, wax, pow, gem;
            xis = collateral;
            yak = _tETH.address;
            zed = payment;
            wax = _tUSD.address;
            pow = '1600473585';
            gem = _exchange.address;

            /* TOKEN MINTED TO ADDRESS */
            let mint = await _prime.createPrime(xis, yak, zed, wax, pow, gem, {from: address});
            let tokenId = await _prime.nonce();
            return tokenId;
        }
        let xis, yak, zed, wax, pow, gem;
        xis = collateral;
        yak = _tETH.address;
        zed = payment;
        wax = _tUSD.address;
        pow = '1600473585';
        gem = _exchange.address;

        let aliceToken1 = await mintPrime(Alice);
        let aliceToken2 = await mintPrime(Alice);
        let chain = (await _prime.getChain(aliceToken1));
        ask = 0.25;
        let bid = await web3.utils.toWei((ask).toString());
        let unfilled = await _exchange.buyOrderUnfilled(
            bid,
            xis, 
            yak, 
            zed, 
            wax, 
            pow, 
            {from: Bob, value: val});
        console.log((unfilled.logs[0].args._bidPrice).toString())
        let bidPrice = (unfilled.logs[0].args._bidPrice).toString()
        
        async function sellOrder(address, ask, tokenId) {
            let askPrice = await web3.utils.toWei((ask).toString()); // 0.5 eth
            console.log({askPrice})
            assert.strictEqual(bidPrice, askPrice, 'BID NOT EQUAL ASK');
            
            /* ADDRESS APPROVES EXCHANGE TO SELL TOKEN */
            await _prime.approve(_exchange.address, tokenId, {from: address});

            /* ADDRESS SUBMITS BUY ORDER FOR TOKEN */
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: address});
            return sellOrder;
        }

        let sell = await sellOrder(Alice, ask, aliceToken1)
        let bobOwns = await _prime.ownerOf(aliceToken1, {from: Bob});
        console.log({bobOwns, Bob})
        console.log(sell)
        
    });

    it('fill unfilled buy order', async () => {
        async function mintPrime(address) {
            let xis, yak, zed, wax, pow, gem;
            xis = collateral;
            yak = _tETH.address;
            zed = payment;
            wax = _tUSD.address;
            pow = '1600473585';
            gem = _exchange.address;

            /* TOKEN MINTED TO ADDRESS */
            let mint = await _prime.createPrime(xis, yak, zed, wax, pow, gem, {from: address});
            let tokenId = await _prime.nonce();
            return tokenId;
        }
        let xis, yak, zed, wax, pow, gem;
        xis = collateral;
        yak = _tETH.address;
        zed = payment;
        wax = _tUSD.address;
        pow = '1600473585';
        gem = _exchange.address;

        let aliceToken1 = await mintPrime(Alice);
        let aliceToken2 = await mintPrime(Alice);
        let chain = await _prime.getChain(aliceToken1);
        ask = 0.25;
        let bid = await web3.utils.toWei((ask).toString());
        let unfilled = await _exchange.buyOrderUnfilled(
            bid,
            xis,
            yak,
            zed,
            wax,
            pow,
            {from: Bob, value: val}
        );
        console.log((unfilled.logs[0].args._bidPrice).toString())
        let bidPrice = (unfilled.logs[0].args._bidPrice).toString()
        
        async function sellOrder(address, ask, tokenId) {
            let askPrice = await web3.utils.toWei((ask).toString()); // 0.5 eth
            console.log({askPrice})
            assert.strictEqual(bidPrice, askPrice, 'BID NOT EQUAL ASK');
            
            /* ADDRESS APPROVES EXCHANGE TO SELL TOKEN */
            await _prime.approve(_exchange.address, tokenId, {from: address});

            /* ADDRESS SUBMITS BUY ORDER FOR TOKEN */
            let sellOrder = await _exchange.sellOrder(tokenId, askPrice, {from: address});
            return sellOrder;
        }

        let sell = await sellOrder(Alice, ask, aliceToken1)

        async function buyOrder(address, bid, tokenId) {
            let bidPrice = (bid*10**18).toString(); // 0.5 eth

            /* ADDRESS SUBMITS BUY ORDER FOR TOKEN */
            let buyOrder = await _exchange.buyOrder(tokenId, bidPrice, {from: address, value: val});
            return buyOrder;
        }

        let buy2 = await buyOrder(Bob, 0.1, aliceToken2)

        let sell2 = await sellOrder(Alice, ask, aliceToken2)
        let bobOwns = await _prime.ownerOf(aliceToken1, {from: Bob});
        console.log({bobOwns, Bob})
        console.log(sell)
    });

})