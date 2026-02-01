import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageManager, ProjectType } from "./constants.js";

/**
 * Detects the package manager based on lock files in the project
 */
export function detectPackageManager(cwd: string): PackageManager {
	if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) {
		return "bun";
	}
	if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
		return "pnpm";
	}
	if (existsSync(join(cwd, "yarn.lock"))) {
		return "yarn";
	}
	if (existsSync(join(cwd, "package-lock.json"))) {
		return "npm";
	}
	return "bun";
}

/**
 * Reads and parses package.json from the project
 */
export function readPackageJson(cwd: string): Record<string, unknown> | null {
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

/**
 * Detects the project type based on dependencies
 */
export function detectProjectType(cwd: string): ProjectType {
	const packageJson = readPackageJson(cwd);

	if (!packageJson) {
		return "base";
	}

	const deps = {
		...(packageJson.dependencies as Record<string, string> | undefined),
		...(packageJson.devDependencies as Record<string, string> | undefined),
	};

	if (deps.next) {
		return "nextjs";
	}
	if (deps.react) {
		return "react";
	}
	return "base";
}

/**
 * Checks if the project is a git repository
 */
export function isGitRepository(cwd: string): boolean {
	return existsSync(join(cwd, ".git"));
}

/**
 * Gets install commands for the detected package manager
 */
export function getPackageManagerCommands(pm: PackageManager): {
	install: string;
	addDev: string[];
	exec: string;
} {
	switch (pm) {
		case "bun":
			return { install: "bun install", addDev: ["bun", "add", "-D"], exec: "bunx" };
		case "pnpm":
			return { install: "pnpm install", addDev: ["pnpm", "add", "-D"], exec: "pnpm exec" };
		case "yarn":
			return { install: "yarn", addDev: ["yarn", "add", "-D"], exec: "yarn" };
		default:
			return { install: "npm install", addDev: ["npm", "install", "-D"], exec: "npx" };
	}
}
