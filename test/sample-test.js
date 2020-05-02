const { expect } = require("chai");
const Dai = artifacts.require("DAI");

contract("Dai contract", function() {
  let accounts;
  let dai;

  before(async function() {
    accounts = await web3.eth.getAccounts();
    dai = await Dai.deployed();
  });

  describe("Deployment", function() {
    it("Should deploy with the right supply", async function() {
      /* console.log(await Dai.deployed());
      const dai = await Dai.deployed(); */
      let supply = await dai.totalSupply();
      console.log((supply).toString());
      let tx = await dai.transfer(accounts[1], 1000);
      
      assert.equal(await dai.totalSupply(), 1000);
      await dai.mint(accounts[1], 100000);
    });
  });
});
