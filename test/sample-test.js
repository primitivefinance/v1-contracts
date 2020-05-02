const { expect } = require("chai");
const Dai = artifacts.require("Dai");

describe("Dai contract", function() {
  let accounts;

  before(async function() {
    accounts = await web3.eth.getAccounts();
  });

  describe("Deployment", function() {
    it("Should deploy with the right supply", async function() {
      const dai = await Dai.new(1000);
      let supply = await dai.totalSupply();
      console.log((supply).toString());
      let tx = await dai.transfer(accounts[1], 1000);
      
      assert.equal(await dai.totalSupply(), 1000);
      await dai.mint(accounts[1], 100000);
    });
  });
});
