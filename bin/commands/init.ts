import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";
import {
	detectPackageManager,
	detectProjectType,
	fileExists,
	generateBiomeConfig,
	generateClaudeMd,
	generateCommitlintConfig,
	generateCommitMsgHook,
	generateKnipConfig,
	generatePreCommitHook,
	generateTsConfig,
	getLintStagedConfig,
	getPackageManagerCommands,
	getPackageScripts,
	getVscodeExtensions,
	getVscodeSettings,
	isGitRepository,
	PACKAGE_NAME,
	type PackageManager,
	type ProjectType,
	readPackageJson,
	runCommand,
	VERSION,
	writeFile,
	writeJsonFile,
} from "../utils/index.js";

interface InitOptions {
	cwd: string;
	packageManager: PackageManager;
	projectType: ProjectType;
	commitlint: boolean;
	husky: boolean;
	vscode: boolean;
	knip: boolean;
	claudeMd: boolean;
	force: boolean;
	dryRun: boolean;
}

/**
 * Interactive prompts to gather init options
 */
async function promptInitOptions(defaults: {
	packageManager: PackageManager;
	projectType: ProjectType;
}): Promise<Omit<InitOptions, "cwd" | "dryRun" | "force"> | null> {
	const options = await p.group(
		{
			projectType: () =>
				p.select({
					message: "Type de projet ?",
					initialValue: defaults.projectType,
					options: [
						{
							value: "nextjs" as const,
							label: "Next.js",
							hint: defaults.projectType === "nextjs" ? "détecté" : undefined,
						},
						{
							value: "react" as const,
							label: "React",
							hint: defaults.projectType === "react" ? "détecté" : undefined,
						},
						{
							value: "base" as const,
							label: "Node.js / TypeScript",
							hint: defaults.projectType === "base" ? "détecté" : undefined,
						},
					],
				}),
			packageManager: () =>
				p.select({
					message: "Package manager ?",
					initialValue: defaults.packageManager,
					options: [
						{
							value: "bun" as const,
							label: "Bun",
							hint: defaults.packageManager === "bun" ? "détecté" : "recommandé",
						},
						{
							value: "pnpm" as const,
							label: "pnpm",
							hint: defaults.packageManager === "pnpm" ? "détecté" : undefined,
						},
						{
							value: "yarn" as const,
							label: "Yarn",
							hint: defaults.packageManager === "yarn" ? "détecté" : undefined,
						},
						{
							value: "npm" as const,
							label: "npm",
							hint: defaults.packageManager === "npm" ? "détecté" : undefined,
						},
					],
				}),
			commitlint: () =>
				p.confirm({
					message: "Activer Conventional Commits (commitlint) ?",
					initialValue: true,
				}),
			husky: () =>
				p.confirm({
					message: "Configurer les git hooks (Husky + lint-staged) ?",
					initialValue: true,
				}),
			vscode: () =>
				p.confirm({
					message: "Ajouter la configuration VS Code ?",
					initialValue: true,
				}),
			knip: () =>
				p.confirm({
					message: "Ajouter Knip (détection de code mort) ?",
					initialValue: true,
				}),
			claudeMd: () =>
				p.confirm({
					message: "Créer CLAUDE.md (instructions pour Claude Code) ?",
					initialValue: true,
				}),
		},
		{
			onCancel: () => {
				p.cancel("Annulé.");
				process.exit(0);
			},
		},
	);

	return options as Omit<InitOptions, "cwd" | "dryRun" | "force">;
}

/**
 * Execute the init command
 */
function executeInit(options: InitOptions): void {
	const {
		cwd,
		packageManager,
		projectType,
		commitlint,
		husky,
		vscode,
		knip,
		claudeMd,
		force,
		dryRun,
	} = options;
	const pmCommands = getPackageManagerCommands(packageManager);

	// Track what we're doing
	const tasks: string[] = [];

	// 1. Create biome.json
	const biomePath = join(cwd, "biome.json");
	if (!fileExists(biomePath) || force) {
		if (!dryRun) {
			writeJsonFile(biomePath, generateBiomeConfig());
		}
		tasks.push("biome.json");
	}

	// 2. Create tsconfig.json
	const tsconfigPath = join(cwd, "tsconfig.json");
	if (!fileExists(tsconfigPath) || force) {
		if (!dryRun) {
			writeJsonFile(tsconfigPath, generateTsConfig(projectType));
		}
		tasks.push("tsconfig.json");
	}

	// 2b. Create type declarations for CSS/assets (React/Next.js)
	if (projectType === "nextjs" || projectType === "react") {
		const typesDir = join(cwd, "src", "types");
		const cssDeclarationPath = join(typesDir, "css.d.ts");

		if (!fileExists(cssDeclarationPath) || force) {
			if (!dryRun) {
				if (!existsSync(typesDir)) {
					mkdirSync(typesDir, { recursive: true });
				}
				writeFile(cssDeclarationPath, 'declare module "*.css";\n');
			}
			tasks.push("src/types/css.d.ts");
		}
	}

	// 3. VS Code configuration
	if (vscode) {
		const vscodeDir = join(cwd, ".vscode");
		if (!(dryRun || existsSync(vscodeDir))) {
			mkdirSync(vscodeDir, { recursive: true });
		}

		const settingsPath = join(vscodeDir, "settings.json");
		if (!fileExists(settingsPath) || force) {
			if (!dryRun) {
				writeJsonFile(settingsPath, getVscodeSettings());
			}
			tasks.push(".vscode/settings.json");
		}

		const extensionsPath = join(vscodeDir, "extensions.json");
		if (!fileExists(extensionsPath) || force) {
			if (!dryRun) {
				writeJsonFile(extensionsPath, getVscodeExtensions());
			}
			tasks.push(".vscode/extensions.json");
		}
	}

	// 4. Update package.json
	const packageJson = readPackageJson(cwd);
	if (packageJson) {
		const scripts = (packageJson.scripts as Record<string, string>) || {};
		const newScripts = getPackageScripts({ commitlint, knip, husky });
		let scriptsAdded = 0;

		for (const [name, command] of Object.entries(newScripts)) {
			if (!scripts[name]) {
				scripts[name] = command;
				scriptsAdded++;
			}
		}

		if (scriptsAdded > 0) {
			packageJson.scripts = scripts;
		}

		// Add lint-staged config if husky is enabled
		if (husky && !packageJson["lint-staged"]) {
			packageJson["lint-staged"] = getLintStagedConfig();
		}

		if (!dryRun) {
			writeJsonFile(join(cwd, "package.json"), packageJson);
		}

		if (scriptsAdded > 0) {
			tasks.push(`package.json (${scriptsAdded} scripts)`);
		}
	}

	// 5. Install dependencies and setup Husky
	if (husky) {
		const deps = ["husky", "lint-staged"];
		if (commitlint) {
			deps.push("@commitlint/cli", "@commitlint/config-conventional");
		}

		if (!dryRun) {
			const spinner = p.spinner();
			spinner.start(`Installation des dépendances (${packageManager})...`);

			const [cmd, ...baseArgs] = pmCommands.addDev as [string, ...string[]];
			const result = runCommand(cmd, [...baseArgs, ...deps], cwd);

			if (result.success) {
				spinner.stop("Dépendances installées");
			} else {
				spinner.stop("Échec de l'installation");
				p.log.warn(`Installez manuellement: ${pmCommands.addDev.join(" ")} ${deps.join(" ")}`);
			}
		}

		tasks.push(`dépendances: ${deps.join(", ")}`);

		// Initialize git if needed
		if (!isGitRepository(cwd)) {
			if (!dryRun) {
				runCommand("git", ["init"], cwd);
			}
			tasks.push("git init");
		}

		// Create .husky directory and hooks
		const huskyDir = join(cwd, ".husky");
		if (!(dryRun || existsSync(huskyDir))) {
			mkdirSync(huskyDir, { recursive: true });
		}

		const preCommitPath = join(huskyDir, "pre-commit");
		if (!fileExists(preCommitPath) || force) {
			if (!dryRun) {
				writeFile(preCommitPath, generatePreCommitHook(pmCommands.exec), true);
			}
			tasks.push(".husky/pre-commit");
		}

		const commitMsgPath = join(huskyDir, "commit-msg");
		if (!fileExists(commitMsgPath) || force) {
			if (!dryRun) {
				writeFile(commitMsgPath, generateCommitMsgHook(commitlint, pmCommands.exec), true);
			}
			tasks.push(".husky/commit-msg");
		}

		// Initialize husky
		if (!dryRun) {
			runCommand("npx", ["husky"], cwd);
		}
	}

	// 6. Create commitlint config
	if (commitlint) {
		const commitlintPath = join(cwd, "commitlint.config.js");
		if (!fileExists(commitlintPath) || force) {
			if (!dryRun) {
				writeFile(commitlintPath, generateCommitlintConfig());
			}
			tasks.push("commitlint.config.js");
		}
	}

	// 7. Create knip config
	if (knip) {
		const knipPath = join(cwd, "knip.json");
		if (!fileExists(knipPath) || force) {
			if (!dryRun) {
				writeJsonFile(knipPath, generateKnipConfig(projectType));
			}
			tasks.push("knip.json");
		}

		// Install knip
		if (!dryRun) {
			const [cmd, ...baseArgs] = pmCommands.addDev as [string, ...string[]];
			runCommand(cmd, [...baseArgs, "knip"], cwd);
		}
	}

	// 8. Create CLAUDE.md
	if (claudeMd) {
		const claudeMdPath = join(cwd, "CLAUDE.md");
		if (!fileExists(claudeMdPath) || force) {
			if (!dryRun) {
				writeFile(
					claudeMdPath,
					generateClaudeMd({
						projectType,
						commitlint,
						knip,
						packageManager,
					}),
				);
			}
			tasks.push("CLAUDE.md");
		}
	}

	return;
}

export const initCommand = defineCommand({
	meta: {
		name: "init",
		description: "Initialize quality configuration in your project",
	},
	args: {
		yes: {
			type: "boolean",
			alias: "y",
			description: "Skip prompts and use defaults",
			default: false,
		},
		force: {
			type: "boolean",
			alias: "f",
			description: "Overwrite existing files",
			default: false,
		},
		commitlint: {
			type: "boolean",
			alias: "c",
			description: "Enable Conventional Commits validation",
			default: undefined,
		},
		"skip-husky": {
			type: "boolean",
			description: "Skip Husky and lint-staged setup",
			default: false,
		},
		"skip-vscode": {
			type: "boolean",
			description: "Skip VS Code configuration",
			default: false,
		},
		knip: {
			type: "boolean",
			alias: "k",
			description: "Add Knip for dead code detection",
			default: undefined,
		},
		"claude-md": {
			type: "boolean",
			description: "Create CLAUDE.md for Claude Code instructions",
			default: undefined,
		},
		"skip-claude-md": {
			type: "boolean",
			description: "Skip CLAUDE.md creation",
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
		const detectedPM = detectPackageManager(cwd);
		const detectedType = detectProjectType(cwd);

		p.intro(`${pc.cyan(pc.bold(PACKAGE_NAME))} ${pc.dim(`v${VERSION}`)}`);

		if (args["dry-run"]) {
			p.log.warn(pc.yellow("Mode dry-run: aucun fichier ne sera modifié"));
		}

		let options: InitOptions;

		if (args.yes) {
			// Non-interactive mode with defaults
			options = {
				cwd,
				packageManager: detectedPM,
				projectType: detectedType,
				commitlint: args.commitlint ?? true,
				husky: !args["skip-husky"],
				vscode: !args["skip-vscode"],
				knip: args.knip ?? true,
				claudeMd: args["claude-md"] ?? !args["skip-claude-md"],
				force: args.force,
				dryRun: args["dry-run"],
			};

			p.log.info(`Projet: ${pc.cyan(options.projectType)}`);
			p.log.info(`Package manager: ${pc.cyan(options.packageManager)}`);
		} else {
			// Interactive mode
			const prompted = await promptInitOptions({
				packageManager: detectedPM,
				projectType: detectedType,
			});

			if (!prompted) {
				return;
			}

			options = {
				cwd,
				...prompted,
				force: args.force,
				dryRun: args["dry-run"],
			};
		}

		const spinner = p.spinner();
		spinner.start("Configuration en cours...");

		executeInit(options);

		spinner.stop("Configuration terminée");

		// Summary
		p.log.success(pc.green("Setup terminé !"));

		p.note(
			[
				`${pc.cyan("Scripts disponibles:")}`,
				`  ${pc.dim("bun run")} check      ${pc.dim("# Lint + Format")}`,
				`  ${pc.dim("bun run")} check:fix  ${pc.dim("# Auto-fix")}`,
				`  ${pc.dim("bun run")} typecheck  ${pc.dim("# TypeScript")}`,
				options.knip ? `  ${pc.dim("bun run")} knip       ${pc.dim("# Code mort")}` : "",
				"",
				options.commitlint
					? [
							`${pc.cyan("Format des commits:")}`,
							`  ${pc.green("feat")}: nouvelle fonctionnalité`,
							`  ${pc.green("fix")}: correction de bug`,
							`  ${pc.green("docs")}: documentation`,
						].join("\n")
					: `${pc.dim("Tip: Ajoutez commitlint avec")} quality init --commitlint`,
				"",
				options.claudeMd
					? `${pc.cyan("CLAUDE.md créé")} ${pc.dim("- Instructions pour Claude Code")}`
					: `${pc.dim("Tip: Ajoutez CLAUDE.md avec")} quality init --claude-md`,
			]
				.filter(Boolean)
				.join("\n"),
			"Prochaines étapes",
		);

		p.outro(`${pc.dim("Documentation:")} ${pc.cyan("https://github.com/neosianexus/quality")}`);
	},
});
