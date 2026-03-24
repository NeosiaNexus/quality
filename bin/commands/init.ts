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
	generateEditorConfig,
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
					message: "Project type?",
					initialValue: defaults.projectType,
					options: [
						{
							value: "nextjs" as const,
							label: "Next.js",
							hint: defaults.projectType === "nextjs" ? "detected" : undefined,
						},
						{
							value: "react" as const,
							label: "React",
							hint: defaults.projectType === "react" ? "detected" : undefined,
						},
						{
							value: "base" as const,
							label: "Node.js / TypeScript",
							hint: defaults.projectType === "base" ? "detected" : undefined,
						},
					],
				}),
			packageManager: () =>
				p.select({
					message: "Package manager?",
					initialValue: defaults.packageManager,
					options: [
						{
							value: "bun" as const,
							label: "Bun",
							hint: defaults.packageManager === "bun" ? "detected" : "recommended",
						},
						{
							value: "pnpm" as const,
							label: "pnpm",
							hint: defaults.packageManager === "pnpm" ? "detected" : undefined,
						},
						{
							value: "yarn" as const,
							label: "Yarn",
							hint: defaults.packageManager === "yarn" ? "detected" : undefined,
						},
						{
							value: "npm" as const,
							label: "npm",
							hint: defaults.packageManager === "npm" ? "detected" : undefined,
						},
					],
				}),
			commitlint: () =>
				p.confirm({
					message: "Enable Conventional Commits (commitlint)?",
					initialValue: true,
				}),
			husky: () =>
				p.confirm({
					message: "Set up git hooks (Husky + lint-staged)?",
					initialValue: true,
				}),
			vscode: () =>
				p.confirm({
					message: "Add VS Code configuration?",
					initialValue: true,
				}),
			knip: () =>
				p.confirm({
					message: "Add Knip (dead code detection)?",
					initialValue: true,
				}),
			claudeMd: () =>
				p.confirm({
					message: "Create CLAUDE.md (instructions for Claude Code)?",
					initialValue: true,
				}),
		},
		{
			onCancel: () => {
				p.cancel("Cancelled.");
				process.exit(0);
			},
		},
	);

	return options as Omit<InitOptions, "cwd" | "dryRun" | "force">;
}

/**
 * Execute the init command
 */
function executeInit(options: InitOptions): string[] {
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
		let lintStagedAdded = false;
		if (husky && !packageJson["lint-staged"]) {
			packageJson["lint-staged"] = getLintStagedConfig();
			lintStagedAdded = true;
		}

		if ((scriptsAdded > 0 || lintStagedAdded) && !dryRun) {
			writeJsonFile(join(cwd, "package.json"), packageJson);
		}

		if (scriptsAdded > 0) {
			tasks.push(`package.json (${scriptsAdded} scripts)`);
		}
	}

	// 5. Install core peer dependencies (biome + typescript)
	{
		const coreDeps = ["@biomejs/biome", "typescript"];

		if (!dryRun) {
			const spinner = p.spinner();
			spinner.start(`Installing core dependencies (${packageManager})...`);

			const [cmd, ...baseArgs] = pmCommands.addDev as [string, ...string[]];
			const result = runCommand(cmd, [...baseArgs, ...coreDeps], cwd);

			if (result.success) {
				spinner.stop("Core dependencies installed");
			} else {
				spinner.stop("Installation failed");
				p.log.warn(`Install manually: ${pmCommands.addDev.join(" ")} ${coreDeps.join(" ")}`);
			}
		}

		tasks.push(`dependencies: ${coreDeps.join(", ")}`);
	}

	// 6. Install Husky/lint-staged and setup git hooks
	if (husky) {
		const deps = ["husky", "lint-staged"];
		if (commitlint) {
			deps.push("@commitlint/cli", "@commitlint/config-conventional");
		}

		if (!dryRun) {
			const spinner = p.spinner();
			spinner.start(`Installing hook dependencies (${packageManager})...`);

			const [cmd, ...baseArgs] = pmCommands.addDev as [string, ...string[]];
			const result = runCommand(cmd, [...baseArgs, ...deps], cwd);

			if (result.success) {
				spinner.stop("Hook dependencies installed");
			} else {
				spinner.stop("Installation failed");
				p.log.warn(`Install manually: ${pmCommands.addDev.join(" ")} ${deps.join(" ")}`);
			}
		}

		tasks.push(`dependencies: ${deps.join(", ")}`);

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
				writeFile(preCommitPath, generatePreCommitHook(pmCommands.exec, pmCommands.run), true);
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

		// Initialize husky using detected package manager
		if (!dryRun) {
			const parts = pmCommands.exec.split(" ");
			const execCmd = parts[0] ?? "npx";
			const execArgs = parts.slice(1);
			runCommand(execCmd, [...execArgs, "husky"], cwd);
		}
	}

	// 7. Create commitlint config
	if (commitlint) {
		const commitlintPath = join(cwd, "commitlint.config.js");
		if (!fileExists(commitlintPath) || force) {
			if (!dryRun) {
				writeFile(commitlintPath, generateCommitlintConfig());
			}
			tasks.push("commitlint.config.js");
		}
	}

	// 8. Create knip config
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

	// 9. Create .editorconfig
	const editorconfigPath = join(cwd, ".editorconfig");
	if (!fileExists(editorconfigPath) || force) {
		if (!dryRun) {
			writeFile(editorconfigPath, generateEditorConfig());
		}
		tasks.push(".editorconfig");
	}

	// 10. Create CLAUDE.md
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

	return tasks;
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
			p.log.warn(pc.yellow("Dry-run mode: no files will be modified"));
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

			p.log.info(`Project: ${pc.cyan(options.projectType)}`);
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
		spinner.start("Configuring...");

		const tasks = executeInit(options);

		spinner.stop("Configuration complete");

		// Summary
		const pmRun = options.packageManager === "npm" ? "npm run" : options.packageManager;

		p.log.success(pc.green(`Setup complete! (${tasks.length} files created/updated)`));

		p.note(
			[
				`${pc.cyan("Available scripts:")}`,
				`  ${pc.dim(pmRun)} check      ${pc.dim("# Lint + Format")}`,
				`  ${pc.dim(pmRun)} check:fix  ${pc.dim("# Auto-fix")}`,
				`  ${pc.dim(pmRun)} typecheck  ${pc.dim("# TypeScript")}`,
				options.knip ? `  ${pc.dim(pmRun)} knip       ${pc.dim("# Dead code")}` : "",
				"",
				options.commitlint
					? [
							`${pc.cyan("Commit format:")}`,
							`  ${pc.green("feat")}: new feature`,
							`  ${pc.green("fix")}: bug fix`,
							`  ${pc.green("docs")}: documentation`,
						].join("\n")
					: `${pc.dim("Tip: Add commitlint with")} quality init --commitlint`,
				"",
				options.claudeMd
					? `${pc.cyan("CLAUDE.md created")} ${pc.dim("- Instructions for Claude Code")}`
					: `${pc.dim("Tip: Add CLAUDE.md with")} quality init --claude-md`,
			]
				.filter(Boolean)
				.join("\n"),
			"Next steps",
		);

		p.outro(`${pc.dim("Documentation:")} ${pc.cyan("https://github.com/NeosiaNexus/quality")}`);
	},
});
