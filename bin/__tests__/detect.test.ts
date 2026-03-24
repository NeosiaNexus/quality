import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	detectPackageManager,
	detectProjectType,
	getPackageManagerCommands,
	isGitRepository,
} from "../utils/index.js";

describe("detectPackageManager", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should detect bun from bun.lock", () => {
		writeFileSync(join(tempDir, "bun.lock"), "");
		expect(detectPackageManager(tempDir)).toBe("bun");
	});

	it("should detect bun from bun.lockb", () => {
		writeFileSync(join(tempDir, "bun.lockb"), "");
		expect(detectPackageManager(tempDir)).toBe("bun");
	});

	it("should detect pnpm from pnpm-lock.yaml", () => {
		writeFileSync(join(tempDir, "pnpm-lock.yaml"), "");
		expect(detectPackageManager(tempDir)).toBe("pnpm");
	});

	it("should detect yarn from yarn.lock", () => {
		writeFileSync(join(tempDir, "yarn.lock"), "");
		expect(detectPackageManager(tempDir)).toBe("yarn");
	});

	it("should detect npm from package-lock.json", () => {
		writeFileSync(join(tempDir, "package-lock.json"), "{}");
		expect(detectPackageManager(tempDir)).toBe("npm");
	});

	it("should fallback to bun when no lock file is found", () => {
		expect(detectPackageManager(tempDir)).toBe("bun");
	});

	it("should prioritize bun over other lock files", () => {
		writeFileSync(join(tempDir, "bun.lock"), "");
		writeFileSync(join(tempDir, "package-lock.json"), "{}");
		expect(detectPackageManager(tempDir)).toBe("bun");
	});
});

describe("detectProjectType", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should detect nextjs when next is in dependencies", () => {
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ dependencies: { next: "^14.0.0", react: "^18.0.0" } }),
		);
		expect(detectProjectType(tempDir)).toBe("nextjs");
	});

	it("should detect react when react is in dependencies", () => {
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ dependencies: { react: "^18.0.0" } }),
		);
		expect(detectProjectType(tempDir)).toBe("react");
	});

	it("should detect react when react is in devDependencies", () => {
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ devDependencies: { react: "^18.0.0" } }),
		);
		expect(detectProjectType(tempDir)).toBe("react");
	});

	it("should return base when no framework dependencies are found", () => {
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ dependencies: { lodash: "^4.0.0" } }),
		);
		expect(detectProjectType(tempDir)).toBe("base");
	});

	it("should return base when package.json has no dependencies", () => {
		writeFileSync(join(tempDir, "package.json"), JSON.stringify({ name: "test" }));
		expect(detectProjectType(tempDir)).toBe("base");
	});

	it("should return base when package.json does not exist", () => {
		expect(detectProjectType(tempDir)).toBe("base");
	});

	it("should prioritize nextjs over react when both are present", () => {
		writeFileSync(
			join(tempDir, "package.json"),
			JSON.stringify({ dependencies: { next: "^14.0.0", react: "^18.0.0" } }),
		);
		expect(detectProjectType(tempDir)).toBe("nextjs");
	});
});

describe("isGitRepository", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should return true when .git directory exists", () => {
		mkdirSync(join(tempDir, ".git"));
		expect(isGitRepository(tempDir)).toBe(true);
	});

	it("should return false when .git directory does not exist", () => {
		expect(isGitRepository(tempDir)).toBe(false);
	});
});

describe("getPackageManagerCommands", () => {
	it("should return correct commands for bun", () => {
		const cmds = getPackageManagerCommands("bun");
		expect(cmds.install).toBe("bun install");
		expect(cmds.addDev).toEqual(["bun", "add", "-D"]);
		expect(cmds.exec).toBe("bunx");
		expect(cmds.run).toBe("bun run");
	});

	it("should return correct commands for pnpm", () => {
		const cmds = getPackageManagerCommands("pnpm");
		expect(cmds.install).toBe("pnpm install");
		expect(cmds.addDev).toEqual(["pnpm", "add", "-D"]);
		expect(cmds.exec).toBe("pnpm exec");
		expect(cmds.run).toBe("pnpm run");
	});

	it("should return correct commands for yarn", () => {
		const cmds = getPackageManagerCommands("yarn");
		expect(cmds.install).toBe("yarn");
		expect(cmds.addDev).toEqual(["yarn", "add", "-D"]);
		expect(cmds.exec).toBe("yarn");
		expect(cmds.run).toBe("yarn");
	});

	it("should return correct commands for npm", () => {
		const cmds = getPackageManagerCommands("npm");
		expect(cmds.install).toBe("npm install");
		expect(cmds.addDev).toEqual(["npm", "install", "-D"]);
		expect(cmds.exec).toBe("npx");
		expect(cmds.run).toBe("npm run");
	});
});
