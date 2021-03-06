#!/usr/bin/env node
// (C) 2020 GoodData Corporation

import program from "commander";
import * as process from "process";
import * as pkg from "../package.json";
import { logError } from "./cli/loggers";
import { devTo } from "./devTo/action";

program
    .version(pkg.version)
    .command("devTo <path>")
    .description("Links SDK libraries to an application residing in <path>")
    .action(devTo);

async function run() {
    program.parse(process.argv);

    if (program.args.length === 0) {
        program.help();
    }
}

run().catch((err) => {
    logError(`An unexpected error has occurred: ${err}`);
    console.error(err);

    process.exit(1);
});
