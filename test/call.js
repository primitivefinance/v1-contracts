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

        let _amount = (10**19).toString();
        let _approve = await _u.approve(_c.address, _amount);

        await getBal(_u, Alice, 'Alice', 'U');
        await getBal(_u, _c.address, 'Call', 'U');
        let _deposit = await _c.deposit(_amount, _u.address);
        await getBal(_u, Alice, 'Alice', 'U');
        await getBal(_u, _c.address, 'Call', 'U');

        let _owner = await _o.ownerOf(_tokenId);
        assert.strictEqual(_owner, Alice, 'Owner should be Alice');

        let _getURI = await _o.tokenURI(_tokenId);

        
    });


})