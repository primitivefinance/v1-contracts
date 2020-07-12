require("@nomiclabs/buidler/config");
const option = require("./option");
const trader = require("./trader");

Object.assign(module.exports, {
    option,
    trader,
});
