const assert = require('assert').strict;
const truffleAssert = require('truffle-assertions');
const tETH = artifacts.require("tETH");
const tUSD = artifacts.require("tUSD");
const Prime = artifacts.require("Prime");

contract('Prime', accounts => {

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
        _collateralID
        ;

    async function getGas(func, name) {
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    async function getBal(contract, address, name, units) {
        let bal = (await web3.utils.fromWei((await contract.balanceOf(address)).toString()));
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }


    beforeEach(async () => {

        _prime = await Prime.deployed();
        _tUSD = await tUSD.deployed();
        _tETH = await tETH.deployed();
        await getBal(_tUSD, Alice, 'Alice', 'tUSD');
        await getBal(_tETH, Alice, 'Alice', 'tETH');
        
        collateral = await web3.utils.toWei('1');
        payment = await web3.utils.toWei('10');

    });
    

    it('should mint a new Prime', async () => {
        await _tETH.approve(_prime.address, collateral);

        xis = collateral;
        yak = _tETH.address;
        zed = payment;
        wax = _tUSD.address;
        pow = 1585973044;
        gem = Alice;

        mint = await _prime.createPrime(
            xis,
            yak,
            zed,
            wax,
            pow,
            gem
        );
    });

    it('should exercise a Prime', async () => {
        await _tUSD.approve(_prime.address, payment);
        let tokenId = (await _prime.nonce()); 
        exercise = await _prime.exercise(tokenId);
    });

    it('should mint two primes and close the second Prime', async () => {
        await _tETH.approve(_prime.address, collateral);

        xis = collateral;
        yak = _tETH.address;
        zed = payment;
        wax = _tUSD.address;
        pow = 1585973044;
        gem = Alice;

        mint = await _prime.createPrime(
            xis,
            yak,
            zed,
            wax,
            pow,
            gem
        );
        let firstNonce = (await _prime.nonce()).toString();
        await _tETH.approve(_prime.address, collateral);
        mint = await _prime.createPrime(
            xis,
            yak,
            zed,
            wax,
            pow,
            gem
        );
        let secondNonce = (await _prime.nonce()).toString();

        console.log({firstNonce, secondNonce});
        console.log(await _prime.getPrime(firstNonce));
        console.log(await _prime.getPrime(secondNonce));
        _collateralID = firstNonce;
        _burnId = secondNonce;
        close = await _prime.close(_collateralID, _burnId);
    });
    

    it('should withdraw assets from Prime', async () => {
        await _tUSD.approve(_prime.address, payment);
        _collateralID = (await _prime.nonce()) - 1;
        exercise = await _prime.exercise(_collateralID);
        withdraw = await _prime.withdraw(collateral, _tETH.address);
        withdraw = await _prime.withdraw(payment, _tUSD.address);
    });

    it('test balance amounts', async () => {
    });

    it('attempts to close an unequal Prime', async () => {
        let collateral2 = await web3.utils.toWei('2')
        let payment2 = await web3.utils.toWei('25')
        
        await _tETH.approve(_prime.address, collateral2);

        xis = collateral2;
        zed = payment2;
        gem = Bob;
        mint = await _prime.createPrime(
            xis,
            yak,
            zed,
            wax,
            pow,
            gem
        );

        _collateralID = (await _prime.nonce()) - 2;
        _burnId = ((await _prime.nonce())).toString();

        await truffleAssert.reverts(
            _prime.close(_collateralID, _burnId),
            "Props !="
        );
    });

    it('attempts to close already burned Prime', async () => {
        _collateralID = (await _prime.nonce()) - 2;
        await truffleAssert.reverts(
            _prime.close(_collateralID, _collateralID),
            "ERC721: owner query for nonexistent token"
        );
    });
})