const { task } = require("@nomiclabs/buidler/config");

require("@nomiclabs/buidler/config");

task("fake", "Tests a task").setAction(() => {
    console.log("works");
});

module.exports = {};
