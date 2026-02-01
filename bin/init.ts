#!/usr/bin/env bun

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(currentDir, "..");

const COLORS = {
	reset: "\x1b[0m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	dim: "\x1b[2m",
	bold: "\x1b[1m",
};

function log(message: string, color: keyof typeof COLORS = "reset"): void {
	console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function success(message: string): void {
	log(`  ${message}`, "green");
}

function warn(message: string): void {
	log(`  ${message}`, "yellow");
}

function info(message: string): void {
	log(`  ${message}`, "blue");
}

interface InitOptions {
	force: boolean;
	cwd: string;
}

function parseArgs(): InitOptions {
	const args = process.argv.slice(2);
	return {
		force: args.includes("--force") || args.includes("-f"),
		cwd: process.cwd(),
	};
}

function writeFileIfNotExists(filePath: string, content: string, options: InitOptions): boolean {
	const exists = existsSync(filePath);

	if (exists && !options.force) {
		warn(`Skipped: ${filePath} (already exists, use --force to overwrite)`);
		return false;
	}

	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	writeFileSync(filePath, content, "utf-8");

	if (exists) {
		success(`Overwrote: ${filePath}`);
	} else {
		success(`Created: ${filePath}`);
	}

	return true;
}

function readPackageJson(cwd: string): Record<string, unknown> | null {
	const packageJsonPath = join(cwd, "package.json");
	if (!existsSync(packageJsonPath)) {
		return null;
	}

	try {
		const content = readFileSync(packageJsonPath, "utf-8");
		return JSON.parse(content) as Record<string, unknown>;
	} catch {
		return null;
	}
}

function writePackageJson(cwd: string, data: Record<string, unknown>): void {
	const packageJsonPath = join(cwd, "package.json");
	writeFileSync(packageJsonPath, `${JSON.stringify(data, null, "\t")}\n`, "utf-8");
}

function addScriptsToPackageJson(cwd: string): boolean {
	const packageJson = readPackageJson(cwd);

	if (!packageJson) {
		warn("No package.json found, skipping scripts addition");
		return false;
	}

	const scripts = (packageJson.scripts as Record<string, string>) || {};
	const newScripts = {
		lint: "biome lint .",
		format: "biome format --write .",
		check: "biome check .",
		"check:fix": "biome check --write .",
	};

	let added = 0;
	let skipped = 0;

	for (const [name, command] of Object.entries(newScripts)) {
		if (scripts[name]) {
			skipped++;
		} else {
			scripts[name] = command;
			added++;
		}
	}

	packageJson.scripts = scripts;
	writePackageJson(cwd, packageJson);

	if (added > 0) {
		success(`Added ${added} script(s) to package.json`);
	}
	if (skipped > 0) {
		info(`Skipped ${skipped} existing script(s)`);
	}

	return true;
}

function generateBiomeConfig(): string {
	return JSON.stringify(
		{
			$schema: "https://biomejs.dev/schemas/2.3.13/schema.json",
			extends: ["@neosianexus/quality/biome.json"],
		},
		null,
		"\t",
	);
}

function getVscodeSettings(): string {
	const settingsPath = join(packageRoot, "vscode", "settings.json");
	return readFileSync(settingsPath, "utf-8");
}

function getVscodeExtensions(): string {
	const extensionsPath = join(packageRoot, "vscode", "extensions.json");
	return readFileSync(extensionsPath, "utf-8");
}

function printBanner(): void {
	console.log();
	log("  @neosianexus/quality", "bold");
	log("  Ultra-strict Biome configuration for React/Next.js + TypeScript", "dim");
	console.log();
}

function printUsage(): void {
	console.log();
	log("Usage:", "bold");
	info("bunx quality-init [options]");
	console.log();
	log("Options:", "bold");
	info("--force, -f   Overwrite existing files");
	console.log();
}

function main(): void {
	const options = parseArgs();

	if (process.argv.includes("--help") || process.argv.includes("-h")) {
		printBanner();
		printUsage();
		process.exit(0);
	}

	printBanner();

	log("Initializing quality configuration...", "blue");
	console.log();

	// Create biome.json
	const biomeConfigPath = join(options.cwd, "biome.json");
	writeFileIfNotExists(biomeConfigPath, generateBiomeConfig(), options);

	// Create .vscode/settings.json
	const vscodeSettingsPath = join(options.cwd, ".vscode", "settings.json");
	writeFileIfNotExists(vscodeSettingsPath, getVscodeSettings(), options);

	// Create .vscode/extensions.json
	const vscodeExtensionsPath = join(options.cwd, ".vscode", "extensions.json");
	writeFileIfNotExists(vscodeExtensionsPath, getVscodeExtensions(), options);

	// Add scripts to package.json
	console.log();
	addScriptsToPackageJson(options.cwd);

	console.log();
	log("Done!", "green");
	console.log();
	log("Next steps:", "bold");
	info("1. Install Biome: bun add -D @biomejs/biome");
	info("2. Run: bun check");
	info("3. Fix issues: bun check:fix");
	console.log();
}

main();
