"use strict";

const path = require("path");

function modifyEnvironmentIfMonorepo() {
    const parsed = path.parse(path.parse(path.join(__dirname, "..")).dir);
    if (
        parsed.base === "packages" &&
        require(path.join(parsed.dir, "package.json")).name === "0confirmation"
    ) {
        const mode = require("@nomiclabs/buidler/internal/core/execution-mode");
        const { getExecutionMode } = mode;
        mode.getExecutionMode = () => mode.ExecutionMode.EXECUTION_MODE_LINKED;
        const cwd = process.cwd();
        process.chdir(path.join(__dirname, "..", "node_modules"));
        return () => {
            process.chdir(cwd);
            mode.getExecutionMode = getExecutionMode;
        };
    } else return () => {};
}

module.exports = modifyEnvironmentIfMonorepo;
