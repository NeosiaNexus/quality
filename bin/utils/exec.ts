import { spawnSync } from "node:child_process";

export interface CommandResult {
	success: boolean;
	output: string;
	code: number | null;
}

/**
 * Runs a shell command and returns the result
 */
export function runCommand(command: string, args: string[], cwd: string): CommandResult {
	try {
		const result = spawnSync(command, args, {
			cwd,
			encoding: "utf-8",
			stdio: ["inherit", "pipe", "pipe"],
		});

		return {
			success: result.status === 0,
			output: result.stdout || result.stderr || "",
			code: result.status,
		};
	} catch (err) {
		return {
			success: false,
			output: err instanceof Error ? err.message : "Unknown error",
			code: null,
		};
	}
}
