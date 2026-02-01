import {
	chmodSync,
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join } from "node:path";

/**
 * Writes a file, creating directories if needed
 */
export function writeFile(filePath: string, content: string, executable = false): void {
	const dir = dirname(filePath);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}

	writeFileSync(filePath, content, "utf-8");

	if (executable) {
		chmodSync(filePath, 0o755);
	}
}

/**
 * Reads a JSON file and parses it
 */
export function readJsonFile<T = Record<string, unknown>>(filePath: string): T | null {
	if (!existsSync(filePath)) {
		return null;
	}

	try {
		const content = readFileSync(filePath, "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Writes a JSON file with proper formatting
 */
export function writeJsonFile(filePath: string, data: unknown): void {
	writeFile(filePath, `${JSON.stringify(data, null, "\t")}\n`);
}

/**
 * Creates a timestamped backup of a file
 * @returns The backup file path, or null if file doesn't exist
 */
export function createBackup(filePath: string): string | null {
	if (!existsSync(filePath)) {
		return null;
	}

	const dir = dirname(filePath);
	const ext = extname(filePath);
	const base = basename(filePath, ext);
	const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
	const backupPath = join(dir, `${base}.backup.${timestamp}${ext}`);

	copyFileSync(filePath, backupPath);
	return backupPath;
}

/**
 * Checks if a file exists
 */
export function fileExists(filePath: string): boolean {
	return existsSync(filePath);
}
