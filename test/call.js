const assert = require('assert').strict;
const Underlying = artifacts.require("Underlying");
const Strike = artifacts.require("Strike");
const Prime = artifacts.require("Prime");
const OPrime = artifacts.require("TPrime");

contract('Call Test', accounts => {




    // User Accounts
    var Alice = accounts[0]
    var Bob = accounts[1]
    var Mary = accounts[2]
    var Kiln = accounts[3]
    var Don = accounts[4]
    var Penny = accounts[5]
    var Cat = accounts[6]
    var Bjork = accounts[7]
    var Olga = accounts[8]
    var Treasury = accounts[9]
    var typeC = 'C'
    var typeP = 'P'


    // Accounts Array
    var acc_ray = [
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


    async function getGas(func, name) {
        /*
        @param func function to get gas from
        @param name string of function name
        */
        let spent = await func.receipt.gasUsed
        gas.push([name + ' gas: ', spent])
    }

    async function getBal(contract, address, name, units) {
        let bal = (await web3.utils.fromWei((await contract.balanceOf(address)).toString()));
        console.log(`${name} has a balance of ${bal} ${units}.`);
    }

    it('Deposit function', async () => {
        let _y = await Underlying.deployed();
        let _w = await Strike.deployed();
        let _p = await Prime.deployed();
        let _o = await OPrime.deployed();

        let _tokenId = 1;

        let _init = await _p.initialize(_o.address);
        let _wetController = await _o.setController(_p.address);

        let x = (10**19).toString(); // underlying amt
        let y = _y.address; // underlying address
        let z = (10**18).toString(); // strike amount
        let w = _w.address; // strike address 
        let p = (1588291200).toString(); // unix timestamp for expiration
        let g = Bob; // payment receiver address

        let xApprove = await _y.approve(_p.address, x);
        let zApprove = await _w.approve(_p.address, z);

        async function balances() {
            console.log("\n === Break === \n")
            await getBal(_o, Alice, 'Alice', 'o');
            await getBal(_o, _p.address, 'Call', 'o');
            await getBal(_y, Alice, 'Alice', 'x');
            await getBal(_w, Alice, 'Alice', 'z');
            await getBal(_y, _p.address, 'Call', 'x');
            await getBal(_w, _p.address, 'Call', 'z');
            await getBal(_w, Bob, 'Bob', 'z');
        }

        await balances();

        let _deposit = await _p.deposit(x, y, z, w, p, g);
        await balances();

        let _exercise = await _p.exercise(_tokenId);
        await balances();

        let _withdrawX = await _p.withdraw(x, y);
        let _withdrawZ = await _p.withdraw(z, w, {from: g});
        await balances();

        let xApprove2 = await _y.approve(_p.address, x);
        let zApprove2 = await _w.approve(_p.address, z);

        let _deposit2 = await _p.deposit(x, y, z, w, p, g);
        await balances();
        let _tokenId2 = (_deposit2.receipt.logs[2].args.tokenId).toString();

        let _close = await _p.close(_tokenId2);
        await balances();

        async function getMetadata(contract) {
            let _name = await _o.name();
            let _symbol = await _o.symbol();
            console.log(`${_name} is ${_symbol}`);
        }
        
        await getMetadata(_o);
    });


})