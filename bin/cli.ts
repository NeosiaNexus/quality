/**
 * @fileoverview Quality CLI - Ultra-strict Biome + TypeScript + Husky configuration
 * @author neosianexus
 * @license MIT
 */

import { defineCommand, runCommand, runMain } from "citty";
import { initCommand, upgradeCommand } from "./commands/index.js";
import { PACKAGE_NAME, VERSION } from "./utils/index.js";

const main = defineCommand({
	meta: {
		name: "quality",
		version: VERSION,
		description: `${PACKAGE_NAME} - Ultra-strict Biome + TypeScript + Husky configuration`,
	},
	subCommands: {
		init: initCommand,
		upgrade: upgradeCommand,
	},
});

// Check if a subcommand is provided
const args = process.argv.slice(2);
const subcommands = ["init", "upgrade"];
const hasSubcommand = args.some(
	(arg) => subcommands.includes(arg) || arg === "--help" || arg === "-h" || arg === "--version",
);

if (hasSubcommand) {
	// Run normally with citty
	runMain(main);
} else {
	// No subcommand provided, run init by default
	// This allows: `npx @neosianexus/quality` to work directly
	runCommand(initCommand, { rawArgs: args });
}
