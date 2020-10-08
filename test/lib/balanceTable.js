const colors = require("colors/safe");
const fs = require("fs");
const Table = require("cli-table3");
const _ = require("lodash");

class BalanceTable {
    constructor(config) {
        this.config = config;
    }
    /**
     * Formats and prints a token balance table. Optionally writes to a file.
     * Based on Alan Lu's (github.com/@cag) stats for Gnosis
     * @param  {Object} info   BalanceData instance with `tokens` and `balances` data
     */
    generate(info) {
        colors.enabled = !this.config.noColors || false;

        // ---------------------------------------------------------------------------------------------
        // Assemble section: balances
        // ---------------------------------------------------------------------------------------------
        const tokenRows = [];

        _.forEach(info.balances, (data, tokenId) => {
            if (!data) return;
            const section = [];
            section.push(colors.grey(data.contract));
            section.push(data.tokenName);
            section.push({ hAlign: "right", content: data.tokenBalance });
            section.push({ hAlign: "right", content: data.base });
            section.push({ hAlign: "right", content: data.quote });
            section.push({ hAlign: "right", content: data.underlying });
            section.push({ hAlign: "right", content: data.strike });
            tokenRows.push(section);
        });

        // ---------------------------------------------------------------------------------------------
        // Assemble section: headers
        // ---------------------------------------------------------------------------------------------

        // Configure indentation for RTD
        const leftPad = this.config.rst ? "  " : "";

        // Format table
        const table = new Table({
            style: {
                head: [],
                border: [],
                "padding-left": 2,
                "padding-right": 2,
            },
            chars: {
                mid: "·",
                "top-mid": "|",
                "left-mid": `${leftPad}·`,
                "mid-mid": "|",
                "right-mid": "·",
                left: `${leftPad}|`,
                "top-left": `${leftPad}·`,
                "top-right": "·",
                "bottom-left": `${leftPad}·`,
                "bottom-right": "·",
                middle: "·",
                top: "-",
                bottom: "-",
                "bottom-mid": "|",
            },
        });

        let title = [
            {
                hAlign: "center",
                colSpan: 7,
                content: colors.grey(`Balance Sheet`),
            },
        ];

        let methodSubtitle;

        methodSubtitle = [
            {
                hAlign: "left",
                colSpan: 7,
                content: colors.green.bold("Balances"),
            },
        ];

        const header = [
            colors.bold("Contract"),
            colors.bold("Token"),
            colors.green("Balance"),
            colors.green("Base"),
            colors.green("Quote"),
            colors.green("Underlying"),
            colors.green("Strike"),
        ];

        // ---------------------------------------------------------------------------------------------
        // Final assembly
        // ---------------------------------------------------------------------------------------------
        table.push(title);
        table.push(methodSubtitle);
        table.push(header);

        tokenRows.sort((a, b) => {
            const contractName = a[0].localeCompare(b[0]);
            const tokenName = a[1].localeCompare(b[1]);
            return contractName || tokenName;
        });

        tokenRows.forEach((row) => table.push(row));

        // ---------------------------------------------------------------------------------------------
        // RST / ReadTheDocs / Sphinx output
        // ---------------------------------------------------------------------------------------------
        let rstOutput = "";
        if (this.config.rst) {
            rstOutput += `${this.config.rstTitle}\n`;
            rstOutput += `${"=".repeat(this.config.rstTitle.length)}\n\n`;
            rstOutput += `.. code-block:: shell\n\n`;
        }

        let tableOutput = rstOutput + table.toString();

        // ---------------------------------------------------------------------------------------------
        // Print
        // ---------------------------------------------------------------------------------------------
        this.config.outputFile
            ? fs.writeFileSync(this.config.outputFile, tableOutput)
            : console.log(tableOutput);

        this.saveCodeChecksData(info);
    }

    /**
     * Writes acccumulated data and the current config to gasReporterOutput.json so it
     * can be consumed by codechecks
     * @param  {Object} info  GasData instance
     */
    saveCodeChecksData(info) {
        const output = {
            namespace: "balanceReporter",
            config: this.config,
            info: info,
        };

        if (process.env.CI) {
            fs.writeFileSync(
                "./balanceReporterOutput.json",
                JSON.stringify(output)
            );
        }
    }
}

module.exports = BalanceTable;
