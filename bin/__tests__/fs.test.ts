import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	createBackup,
	fileExists,
	readJsonFile,
	writeFile,
	writeJsonFile,
} from "../utils/index.js";

const JSON_EXT_REGEX = /\.json$/;

describe("writeFile", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should create a file with the given content", () => {
		const filePath = join(tempDir, "test.txt");
		writeFile(filePath, "hello world");
		expect(readFileSync(filePath, "utf-8")).toBe("hello world");
	});

	it("should create parent directories if they do not exist", () => {
		const filePath = join(tempDir, "a", "b", "c", "test.txt");
		writeFile(filePath, "nested content");
		expect(existsSync(filePath)).toBe(true);
		expect(readFileSync(filePath, "utf-8")).toBe("nested content");
	});

	it("should set executable permission when requested", () => {
		const filePath = join(tempDir, "script.sh");
		writeFile(filePath, "#!/bin/sh\necho hello", true);
		const stats = statSync(filePath);
		// Check that at least the owner execute bit is set (0o100)
		expect(stats.mode & 0o111).toBeGreaterThan(0);
	});

	it("should not set executable permission by default", () => {
		const filePath = join(tempDir, "regular.txt");
		writeFile(filePath, "content");
		const stats = statSync(filePath);
		// Owner execute bit should not be set on a regular file
		expect(stats.mode & 0o100).toBe(0);
	});

	it("should overwrite existing files", () => {
		const filePath = join(tempDir, "overwrite.txt");
		writeFile(filePath, "first");
		writeFile(filePath, "second");
		expect(readFileSync(filePath, "utf-8")).toBe("second");
	});
});

describe("readJsonFile", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should read and parse valid JSON", () => {
		const filePath = join(tempDir, "data.json");
		writeFileSync(filePath, JSON.stringify({ name: "test", version: 1 }));
		const result = readJsonFile(filePath);
		expect(result).toEqual({ name: "test", version: 1 });
	});

	it("should return null for invalid JSON", () => {
		const filePath = join(tempDir, "invalid.json");
		writeFileSync(filePath, "not valid json {{{");
		const result = readJsonFile(filePath);
		expect(result).toBeNull();
	});

	it("should return null for non-existent file", () => {
		const result = readJsonFile(join(tempDir, "nonexistent.json"));
		expect(result).toBeNull();
	});

	it("should handle nested JSON structures", () => {
		const filePath = join(tempDir, "nested.json");
		const data = { a: { b: { c: [1, 2, 3] } } };
		writeFileSync(filePath, JSON.stringify(data));
		const result = readJsonFile(filePath);
		expect(result).toEqual(data);
	});
});

describe("writeJsonFile", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should write JSON with tab indentation", () => {
		const filePath = join(tempDir, "output.json");
		writeJsonFile(filePath, { name: "test" });
		const content = readFileSync(filePath, "utf-8");
		expect(content).toBe('{\n\t"name": "test"\n}\n');
	});

	it("should end with a trailing newline", () => {
		const filePath = join(tempDir, "output.json");
		writeJsonFile(filePath, { a: 1 });
		const content = readFileSync(filePath, "utf-8");
		expect(content.endsWith("\n")).toBe(true);
	});

	it("should handle complex nested structures", () => {
		const filePath = join(tempDir, "complex.json");
		const data = { scripts: { build: "tsc", test: "vitest" }, dependencies: { react: "^18" } };
		writeJsonFile(filePath, data);
		const result = readJsonFile(filePath);
		expect(result).toEqual(data);
	});

	it("should create parent directories if needed", () => {
		const filePath = join(tempDir, "sub", "dir", "output.json");
		writeJsonFile(filePath, { created: true });
		expect(existsSync(filePath)).toBe(true);
		const result = readJsonFile(filePath);
		expect(result).toEqual({ created: true });
	});
});

describe("createBackup", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should return null when file does not exist", () => {
		const result = createBackup(join(tempDir, "nonexistent.json"));
		expect(result).toBeNull();
	});

	it("should create a backup file with correct content", () => {
		const filePath = join(tempDir, "config.json");
		const content = '{"original": true}';
		writeFileSync(filePath, content);

		const backupPath = createBackup(filePath);
		expect(backupPath).not.toBeNull();
		expect(existsSync(backupPath as string)).toBe(true);
		expect(readFileSync(backupPath as string, "utf-8")).toBe(content);
	});

	it("should include 'backup' in the backup filename", () => {
		const filePath = join(tempDir, "config.json");
		writeFileSync(filePath, "{}");

		const backupPath = createBackup(filePath);
		expect(backupPath).not.toBeNull();
		expect(backupPath).toContain("backup");
	});

	it("should preserve the original file extension", () => {
		const filePath = join(tempDir, "settings.json");
		writeFileSync(filePath, "{}");

		const backupPath = createBackup(filePath);
		expect(backupPath).not.toBeNull();
		expect(backupPath).toMatch(JSON_EXT_REGEX);
	});

	it("should not modify the original file", () => {
		const filePath = join(tempDir, "original.json");
		const content = '{"keep": "me"}';
		writeFileSync(filePath, content);

		createBackup(filePath);
		expect(readFileSync(filePath, "utf-8")).toBe(content);
	});
});

describe("fileExists", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "quality-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("should return true when file exists", () => {
		const filePath = join(tempDir, "exists.txt");
		writeFileSync(filePath, "");
		expect(fileExists(filePath)).toBe(true);
	});

	it("should return false when file does not exist", () => {
		expect(fileExists(join(tempDir, "nope.txt"))).toBe(false);
	});

	it("should return true for directories", () => {
		// existsSync returns true for directories too
		expect(fileExists(tempDir)).toBe(true);
	});
});
