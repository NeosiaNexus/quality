import { join } from "node:path";
import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import merge from "deepmerge";
import pc from "picocolors";
import {
	createBackup,
	detectProjectType,
	generateBiomeConfig,
	generateKnipConfig,
	generateTsConfig,
	getLintStagedConfig,
	getPackageScripts,
	getVscodeExtensions,
	getVscodeSettings,
	PACKAGE_NAME,
	readJsonFile,
	readPackageJson,
	VERSION,
	writeJsonFile,
} from "../utils/index.js";

interface ConfigFile {
	name: string;
	path: string;
	currentContent: Record<string, unknown> | null;
	newDefaults: Record<string, unknown>;
	requiresMerge: boolean;
}

/**
 * Custom merge that preserves user arrays (doesn't combine them)
 */
function smartMerge<T extends Record<string, unknown>>(defaults: T, userConfig: T): T {
	return merge(defaults, userConfig, {
		// User arrays completely override defaults (don't merge arrays)
		arrayMerge: (_target, source) => source,
		// Clone objects to avoid mutation
		clone: true,
	}) as T;
}

/**
 * Recursively analyze differences between current and new config
 */
export function analyzeChanges(
	current: Record<string, unknown>,
	updated: Record<string, unknown>,
): { added: string[]; modified: string[]; removed: string[] } {
	const added: string[] = [];
	const modified: string[] = [];
	const removed: string[] = [];

	function compare(
		curr: Record<string, unknown>,
		upd: Record<string, unknown>,
		prefix: string,
	): void {
		const currKeys = new Set(Object.keys(curr));
		const updKeys = new Set(Object.keys(upd));

		for (const key of updKeys) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (!currKeys.has(key)) {
				added.push(path);
			} else if (
				typeof curr[key] === "object" &&
				curr[key] !== null &&
				!Array.isArray(curr[key]) &&
				typeof upd[key] === "object" &&
				upd[key] !== null &&
				!Array.isArray(upd[key])
			) {
				compare(curr[key] as Record<string, unknown>, upd[key] as Record<string, unknown>, path);
			} else if (JSON.stringify(curr[key]) !== JSON.stringify(upd[key])) {
				modified.push(path);
			}
		}

		for (const key of currKeys) {
			const path = prefix ? `${prefix}.${key}` : key;
			if (!updKeys.has(key)) {
				removed.push(path);
			}
		}
	}

	compare(current, updated, "");
	return { added, modified, removed };
}

/**
 * Upgrade a single config file with smart merge
 */
function upgradeConfigFile(
	config: ConfigFile,
	options: { force: boolean; dryRun: boolean; backup: boolean },
): { upgraded: boolean; backupPath: string | null } {
	if (!config.currentContent) {
		// File doesn't exist, just create it
		if (!options.dryRun) {
			writeJsonFile(config.path, config.newDefaults);
		}
		return { upgraded: true, backupPath: null };
	}

	let finalContent: Record<string, unknown>;
	let backupPath: string | null = null;

	if (config.requiresMerge) {
		// Smart merge: new defaults + user customizations
		finalContent = smartMerge(config.newDefaults, config.currentContent);
	} else {
		// Simple replacement with backup
		finalContent = config.newDefaults;
	}

	// Check if anything changed
	if (JSON.stringify(config.currentContent) === JSON.stringify(finalContent)) {
		return { upgraded: false, backupPath: null };
	}

	// Create backup before modifying
	if (options.backup && !options.dryRun) {
		backupPath = createBackup(config.path);
	}

	// Write the updated config
	if (!options.dryRun) {
		writeJsonFile(config.path, finalContent);
	}

	return { upgraded: true, backupPath };
}

export const upgradeCommand = defineCommand({
	meta: {
		name: "upgrade",
		description: "Upgrade existing quality configuration to the latest version",
	},
	args: {
		yes: {
			type: "boolean",
			alias: "y",
			description: "Skip confirmation prompts",
			default: false,
		},
		force: {
			type: "boolean",
			alias: "f",
			description: "Replace configs instead of merging",
			default: false,
		},
		"no-backup": {
			type: "boolean",
			description: "Don't create backups before modifying files",
			default: false,
		},
		"dry-run": {
			type: "boolean",
			alias: "d",
			description: "Preview changes without writing files",
			default: false,
		},
	},
	async run({ args }) {
		const cwd = process.cwd();
		const projectType = detectProjectType(cwd);

		p.intro(`${pc.cyan(pc.bold(PACKAGE_NAME))} ${pc.magenta("upgrade")} ${pc.dim(`v${VERSION}`)}`);

		if (args["dry-run"]) {
			p.log.warn(pc.yellow("Dry-run mode: no files will be modified"));
		}

		// Collect all config files to analyze
		const configs: ConfigFile[] = [
			{
				name: "biome.json",
				path: join(cwd, "biome.json"),
				currentContent: readJsonFile(join(cwd, "biome.json")),
				newDefaults: generateBiomeConfig(),
				requiresMerge: true, // biome.json can be safely merged
			},
			{
				name: "tsconfig.json",
				path: join(cwd, "tsconfig.json"),
				currentContent: readJsonFile(join(cwd, "tsconfig.json")),
				newDefaults: generateTsConfig(projectType),
				requiresMerge: true, // tsconfig.json should preserve user paths/includes
			},
			{
				name: "knip.json",
				path: join(cwd, "knip.json"),
				currentContent: readJsonFile(join(cwd, "knip.json")),
				newDefaults: generateKnipConfig(projectType),
				requiresMerge: true, // knip.json should preserve user ignores
			},
			{
				name: ".vscode/settings.json",
				path: join(cwd, ".vscode", "settings.json"),
				currentContent: readJsonFile(join(cwd, ".vscode", "settings.json")),
				newDefaults: getVscodeSettings(),
				requiresMerge: true, // VSCode settings should be merged
			},
			{
				name: ".vscode/extensions.json",
				path: join(cwd, ".vscode", "extensions.json"),
				currentContent: readJsonFile(join(cwd, ".vscode", "extensions.json")),
				newDefaults: getVscodeExtensions(),
				requiresMerge: true, // Extensions can be merged
			},
		];

		// Analyze each config
		const toUpgrade: Array<{
			config: ConfigFile;
			changes: { added: string[]; modified: string[]; removed: string[] };
			isNew: boolean;
		}> = [];

		for (const config of configs) {
			if (!config.currentContent) {
				toUpgrade.push({
					config,
					changes: { added: Object.keys(config.newDefaults), modified: [], removed: [] },
					isNew: true,
				});
			} else {
				const merged = args.force
					? config.newDefaults
					: smartMerge(config.newDefaults, config.currentContent);

				const changes = analyzeChanges(config.currentContent, merged);

				if (changes.added.length > 0 || changes.modified.length > 0) {
					toUpgrade.push({ config, changes, isNew: false });
				}
			}
		}

		// Check package.json scripts
		const packageJson = readPackageJson(cwd);
		const newScripts = getPackageScripts({ commitlint: true, knip: true, husky: true });
		const currentScripts = (packageJson?.scripts as Record<string, string>) || {};
		const missingScripts: string[] = [];

		for (const [name] of Object.entries(newScripts)) {
			if (!currentScripts[name]) {
				missingScripts.push(name);
			}
		}

		if (toUpgrade.length === 0 && missingScripts.length === 0) {
			p.log.success("All configurations are up to date!");
			p.outro(pc.dim("Nothing to do."));
			return;
		}

		// Show what will be updated
		p.log.info(pc.cyan("Files to update:"));

		for (const { config, changes, isNew } of toUpgrade) {
			if (isNew) {
				p.log.step(`  ${pc.green("+")} ${config.name} ${pc.dim("(new)")}`);
			} else {
				const parts: string[] = [];
				if (changes.added.length > 0) {
					parts.push(pc.green(`+${changes.added.length}`));
				}
				if (changes.modified.length > 0) {
					parts.push(pc.yellow(`~${changes.modified.length}`));
				}
				p.log.step(`  ${pc.yellow("~")} ${config.name} ${pc.dim(`(${parts.join(", ")})`)}`);
			}
		}

		if (missingScripts.length > 0) {
			p.log.step(`  ${pc.green("+")} package.json ${pc.dim(`(${missingScripts.length} scripts)`)}`);
		}

		// Confirm unless --yes
		if (!(args.yes || args["dry-run"])) {
			const shouldContinue = await p.confirm({
				message: args["no-backup"]
					? "Continue without backup?"
					: "Continue? (files will be backed up)",
				initialValue: true,
			});

			if (!shouldContinue || p.isCancel(shouldContinue)) {
				p.cancel("Cancelled.");
				process.exit(0);
			}
		}

		// Perform upgrades
		const spinner = p.spinner();
		spinner.start("Updating configurations...");

		const results: Array<{ name: string; backupPath: string | null }> = [];

		for (const { config } of toUpgrade) {
			const result = upgradeConfigFile(config, {
				force: args.force,
				dryRun: args["dry-run"],
				backup: !args["no-backup"],
			});

			if (result.upgraded) {
				results.push({ name: config.name, backupPath: result.backupPath });
			}
		}

		// Update package.json scripts
		if (packageJson && missingScripts.length > 0) {
			if (!(args["no-backup"] || args["dry-run"])) {
				createBackup(join(cwd, "package.json"));
			}

			const scripts = (packageJson.scripts as Record<string, string>) || {};
			for (const name of missingScripts) {
				const script = newScripts[name];
				if (script) {
					scripts[name] = script;
				}
			}
			packageJson.scripts = scripts;

			// Also ensure lint-staged is present
			if (!packageJson["lint-staged"]) {
				packageJson["lint-staged"] = getLintStagedConfig();
			}

			if (!args["dry-run"]) {
				writeJsonFile(join(cwd, "package.json"), packageJson);
			}

			results.push({ name: "package.json", backupPath: null });
		}

		spinner.stop("Update complete");

		// Show results
		p.log.success(pc.green(`${results.length} file(s) updated`));

		const backups = results.filter((r) => r.backupPath);
		if (backups.length > 0) {
			p.note(backups.map((b) => `${pc.dim(b.backupPath)}`).join("\n"), "Backups created");
		}

		if (args["dry-run"]) {
			p.note("Run without --dry-run to apply changes", "Dry-run mode");
		}

		p.outro(pc.green("Configuration updated!"));
	},
});
