const assert = require('assert').strict;
const Underlying = artifacts.require("Underlying");
const Strike = artifacts.require("Strike");
const Call = artifacts.require("Call");
const OCall = artifacts.require("OCall");

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
        let _u = await Underlying.deployed();
        let _s = await Strike.deployed();
        let _c = await Call.deployed();
        let _o = await OCall.deployed();

        let _tokenId = 1;

        let _init = await _c.initialize(_o.address);
        let _setController = await _o.setController(_c.address);

        let x = (10**19).toString(); // underlying amt
        let y = _u.address; // underlying address
        let z = (10**18).toString(); // strike amount
        let w = _s.address; // strike address 
        let p = (1588291200).toString(); // unix timestamp for expiration
        let g = Bob; // payment receiver address

        let xApprove = await _u.approve(_c.address, x);
        let zApprove = await _s.approve(_c.address, z);

        async function balances() {
            console.log("\n === Break === \n")
            await getBal(_o, Alice, 'Alice', 'o');
            await getBal(_o, _c.address, 'Call', 'o');
            await getBal(_u, Alice, 'Alice', 'x');
            await getBal(_s, Alice, 'Alice', 'z');
            await getBal(_u, _c.address, 'Call', 'x');
            await getBal(_s, _c.address, 'Call', 'z');
            await getBal(_s, Bob, 'Bob', 'z');
        }

        await balances();

        let _deposit = await _c.deposit(x, y, z, w, p, g);
        await balances();

        let _exercise = await _c.exercise(_tokenId);
        await balances();

        let _withdrawX = await _c.withdraw(x, y);
        let _withdrawZ = await _c.withdraw(z, w, {from: g});
        await balances();

        let xApprove2 = await _u.approve(_c.address, x);
        let zApprove2 = await _s.approve(_c.address, z);

        let _deposit2 = await _c.deposit(x, y, z, w, p, g);
        await balances();
        let _tokenId2 = (_deposit2.receipt.logs[0].args.tokenId).toString();

        let _close = await _c.close(_tokenId2);
        await balances();
    });


})