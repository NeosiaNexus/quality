import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectType } from "./constants.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(currentDir, "..", "..");

/**
 * Generates biome.json configuration that extends from this package
 */
export function generateBiomeConfig(): Record<string, unknown> {
	return {
		$schema: "https://biomejs.dev/schemas/2.3.13/schema.json",
		extends: ["@neosianexus/quality"],
	};
}

/**
 * Gets the extends path for tsconfig based on project type
 */
function getExtendsPath(type: ProjectType): string {
	switch (type) {
		case "nextjs":
			return "@neosianexus/quality/tsconfig.nextjs";
		case "react":
			return "@neosianexus/quality/tsconfig.react";
		default:
			return "@neosianexus/quality/tsconfig.base";
	}
}

/**
 * Generates tsconfig.json for the project
 */
export function generateTsConfig(type: ProjectType): Record<string, unknown> {
	const config: Record<string, unknown> = {
		extends: getExtendsPath(type),
		compilerOptions: {
			baseUrl: ".",
			paths: {
				"@/*": ["./src/*"],
			},
		},
		include: ["src", "**/*.ts", "**/*.tsx"],
		exclude: ["node_modules", "dist", "build", ".next"],
	};

	if (type === "nextjs") {
		config.include = ["src", "next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"];
	}

	return config;
}

/**
 * Generates commitlint.config.js content
 */
export function generateCommitlintConfig(): string {
	return `import config from "@neosianexus/quality/commitlint";

export default config;
`;
}

/**
 * Generates the pre-commit hook script
 */
export function generatePreCommitHook(execCommand: string): string {
	return `#!/bin/sh

# Pre-commit hook - runs lint-staged to check and fix staged files
# To skip: git commit --no-verify

echo "\\033[0;36m🔍 Running pre-commit checks...\\033[0m"

if ! ${execCommand} lint-staged; then
    echo ""
    echo "\\033[0;31m✗ Pre-commit checks failed\\033[0m"
    echo ""
    echo "\\033[0;33mHow to fix:\\033[0m"
    echo "  1. Review the errors above"
    echo "  2. Run 'bun run check:fix' to auto-fix issues"
    echo "  3. Stage the fixed files with 'git add'"
    echo "  4. Try committing again"
    echo ""
    echo "\\033[0;90mTo skip this check: git commit --no-verify\\033[0m"
    exit 1
fi

echo "\\033[0;32m✓ Pre-commit checks passed\\033[0m"
`;
}

/**
 * Generates the commit-msg hook script
 */
export function generateCommitMsgHook(withCommitlint: boolean, execCommand: string): string {
	if (withCommitlint) {
		return `#!/bin/sh

# Commit message validation - enforces Conventional Commits format
# To skip: git commit --no-verify
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

if ! ${execCommand} --no -- commitlint --edit "$1"; then
    echo ""
    echo "\\033[0;31m✗ Commit message validation failed\\033[0m"
    echo ""
    echo "\\033[0;33mExpected format:\\033[0m type(scope): description"
    echo ""
    echo "\\033[0;33mExamples:\\033[0m"
    echo "  feat: add user authentication"
    echo "  fix(api): resolve timeout issue"
    echo "  docs: update README"
    echo ""
    echo "\\033[0;33mAllowed types:\\033[0m"
    echo "  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    echo ""
    echo "\\033[0;90mTo skip: git commit --no-verify\\033[0m"
    exit 1
fi
`;
	}

	return `#!/bin/sh

# Conventional Commits validation (disabled)
# To enable, run: bunx quality init --commitlint
# Or manually install: bun add -D @commitlint/cli @commitlint/config-conventional
`;
}

/**
 * Gets VS Code settings configuration
 */
export function getVscodeSettings(): Record<string, unknown> {
	const settingsPath = join(packageRoot, "vscode", "settings.json");

	if (existsSync(settingsPath)) {
		try {
			return JSON.parse(readFileSync(settingsPath, "utf-8")) as Record<string, unknown>;
		} catch {
			// Fall through to default
		}
	}

	return {
		"editor.defaultFormatter": "biomejs.biome",
		"editor.formatOnSave": true,
		"editor.formatOnPaste": true,
		"editor.codeActionsOnSave": {
			"quickfix.biome": "explicit",
			"source.organizeImports.biome": "explicit",
		},
		"editor.rulers": [100],
		"editor.tabSize": 2,
		"editor.insertSpaces": false,
		"files.eol": "\n",
		"files.trimTrailingWhitespace": true,
		"files.insertFinalNewline": true,
		"[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
		"[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
		"[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
		"[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
		"[json]": { "editor.defaultFormatter": "biomejs.biome" },
		"[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
		"[css]": { "editor.defaultFormatter": "biomejs.biome" },
		"[markdown]": { "files.trimTrailingWhitespace": false },
		"typescript.tsdk": "node_modules/typescript/lib",
		"typescript.enablePromptUseWorkspaceTsdk": true,
		"typescript.preferences.importModuleSpecifier": "non-relative",
		"typescript.preferences.preferTypeOnlyAutoImports": true,
	};
}

/**
 * Gets VS Code extensions configuration
 */
export function getVscodeExtensions(): Record<string, unknown> {
	const extensionsPath = join(packageRoot, "vscode", "extensions.json");

	if (existsSync(extensionsPath)) {
		try {
			return JSON.parse(readFileSync(extensionsPath, "utf-8")) as Record<string, unknown>;
		} catch {
			// Fall through to default
		}
	}

	return {
		recommendations: [
			"biomejs.biome",
			"usernamehw.errorlens",
			"editorconfig.editorconfig",
			"streetsidesoftware.code-spell-checker",
			"eamodio.gitlens",
			"gruntfuggly.todo-tree",
		],
		unwantedRecommendations: ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"],
	};
}

/**
 * Generates knip.json configuration for dead code detection
 */
export function generateKnipConfig(type: ProjectType): Record<string, unknown> {
	const baseConfig = {
		$schema: "https://unpkg.com/knip@5/schema.json",
		ignore: ["**/*.d.ts"],
		ignoreBinaries: ["biome"],
	};

	if (type === "nextjs") {
		return {
			...baseConfig,
			entry: ["src/app/**/page.tsx", "src/app/**/layout.tsx", "src/app/**/route.ts"],
			project: ["src/**/*.{ts,tsx}"],
			ignoreDependencies: ["tailwindcss", "postcss", "autoprefixer"],
			next: {
				entry: ["next.config.{js,ts,mjs}"],
			},
			postcss: {
				config: ["postcss.config.{js,mjs,cjs}"],
			},
			tailwind: {
				config: ["tailwind.config.{js,ts,mjs,cjs}"],
			},
		};
	}

	if (type === "react") {
		return {
			...baseConfig,
			project: ["src/**/*.{ts,tsx,js,jsx}"],
			entry: ["src/index.{ts,tsx}", "src/main.{ts,tsx}", "src/App.{ts,tsx}"],
			ignoreDependencies: ["tailwindcss", "postcss", "autoprefixer"],
		};
	}

	return {
		...baseConfig,
		project: ["src/**/*.{ts,tsx,js,jsx}"],
		entry: ["src/index.ts", "src/main.ts"],
	};
}

/**
 * Gets the scripts to add to package.json
 */
export function getPackageScripts(options: {
	commitlint: boolean;
	knip: boolean;
	husky: boolean;
}): Record<string, string> {
	const scripts: Record<string, string> = {
		lint: "biome lint .",
		"lint:fix": "biome lint --write .",
		format: "biome format --write .",
		check: "biome check .",
		"check:fix": "biome check --write .",
		typecheck: "tsc --noEmit",
	};

	if (options.husky) {
		scripts.prepare = "husky";
	}

	if (options.commitlint) {
		scripts.commitlint = "commitlint --edit";
	}

	if (options.knip) {
		scripts.knip = "knip";
		scripts["knip:fix"] = "knip --fix";
	}

	return scripts;
}

/**
 * Gets the lint-staged configuration
 */
export function getLintStagedConfig(): Record<string, string[]> {
	return {
		"*.{js,jsx,ts,tsx,json,css,md}": ["biome check --write --no-errors-on-unmatched"],
	};
}
