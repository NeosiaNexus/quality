import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(import.meta.dirname, "..", "..");

describe("biome presets parse cleanly with installed Biome", () => {
	it.each([
		["stable", resolve(repoRoot, ".github/fixtures/stable-preset")],
		["strict", resolve(repoRoot, ".github/fixtures/strict-preset")],
	])("%s preset fixture", (_name, fixtureDir) => {
		expect(() => {
			execFileSync("bunx", ["@biomejs/biome", "check", fixtureDir], {
				cwd: fixtureDir,
				stdio: "pipe",
			});
		}).not.toThrow();
	});
});
