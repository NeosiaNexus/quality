import { join } from "node:path";
import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import merge from "deepmerge";
import pc from "picocolors";
import {
	createBackup,
	detectProjectType,
	generateBiomeConfig,
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
 * Analyze differences between current and new config
 */
function analyzeChanges(
	current: Record<string, unknown>,
	updated: Record<string, unknown>,
): { added: string[]; modified: string[]; removed: string[] } {
	const added: string[] = [];
	const modified: string[] = [];
	const removed: string[] = [];

	const currentKeys = new Set(Object.keys(current));
	const updatedKeys = new Set(Object.keys(updated));

	for (const key of updatedKeys) {
		if (!currentKeys.has(key)) {
			added.push(key);
		} else if (JSON.stringify(current[key]) !== JSON.stringify(updated[key])) {
			modified.push(key);
		}
	}

	for (const key of currentKeys) {
		if (!updatedKeys.has(key)) {
			removed.push(key);
		}
	}

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
			p.log.warn(pc.yellow("Mode dry-run: aucun fichier ne sera modifié"));
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
			p.log.success("Toutes les configurations sont à jour !");
			p.outro(pc.dim("Rien à faire."));
			return;
		}

		// Show what will be updated
		p.log.info(pc.cyan("Fichiers à mettre à jour:"));

		for (const { config, changes, isNew } of toUpgrade) {
			if (isNew) {
				p.log.step(`  ${pc.green("+")} ${config.name} ${pc.dim("(nouveau)")}`);
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
					? "Continuer sans backup ?"
					: "Continuer ? (les fichiers seront sauvegardés)",
				initialValue: true,
			});

			if (!shouldContinue || p.isCancel(shouldContinue)) {
				p.cancel("Annulé.");
				process.exit(0);
			}
		}

		// Perform upgrades
		const spinner = p.spinner();
		spinner.start("Mise à jour des configurations...");

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

		spinner.stop("Mise à jour terminée");

		// Show results
		p.log.success(pc.green(`${results.length} fichier(s) mis à jour`));

		const backups = results.filter((r) => r.backupPath);
		if (backups.length > 0) {
			p.note(backups.map((b) => `${pc.dim(b.backupPath)}`).join("\n"), "Backups créés");
		}

		if (args["dry-run"]) {
			p.note("Exécutez sans --dry-run pour appliquer les changements", "Mode dry-run");
		}

		p.outro(pc.green("Configuration mise à jour !"));
	},
});
