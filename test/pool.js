const { expect } = require("chai");
const Dai = artifacts.require("DAI");

contract("Pool contract", () => {
  let accounts;
  let dai;

  before(async () => {
    accounts = await web3.eth.getAccounts();
    dai = await Dai.deployed();
  });

  describe("Deployment", () => {
    it("Should deploy with the right supply", async () => {
      let supply = await dai.totalSupply();
      console.log((supply).toString());
      let tx = await dai.transfer(accounts[1], 1000);
      
      assert.equal(await dai.totalSupply(), 1000);
      await dai.mint(accounts[1], 100000);
    });
  });

  describe("Pool.deposit()", () => {
    it("Should deploy with the right supply", async () => {
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
