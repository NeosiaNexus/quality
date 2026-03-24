import { describe, expect, it } from "vitest";
import {
	generateBiomeConfig,
	generateCommitlintConfig,
	generateCommitMsgHook,
	generateKnipConfig,
	generatePreCommitHook,
	generateTsConfig,
	getLintStagedConfig,
	getPackageScripts,
} from "../utils/index.js";

describe("generateBiomeConfig", () => {
	it("should return config with correct extends", () => {
		const config = generateBiomeConfig();
		expect(config.$schema).toBe("https://biomejs.dev/schemas/latest/schema.json");
		expect(config.extends).toEqual(["@neosianexus/quality"]);
	});
});

describe("generateTsConfig", () => {
	it("should generate base tsconfig", () => {
		const config = generateTsConfig("base");
		expect(config.extends).toBe("@neosianexus/quality/tsconfig.base");
		expect(config.include).toEqual(["src", "**/*.ts", "**/*.tsx"]);
	});

	it("should generate react tsconfig", () => {
		const config = generateTsConfig("react");
		expect(config.extends).toBe("@neosianexus/quality/tsconfig.react");
		expect(config.include).toEqual(["src", "**/*.ts", "**/*.tsx"]);
	});

	it("should generate nextjs tsconfig with additional includes", () => {
		const config = generateTsConfig("nextjs");
		expect(config.extends).toBe("@neosianexus/quality/tsconfig.nextjs");
		expect(config.include).toEqual([
			"src",
			"next-env.d.ts",
			".next/types/**/*.ts",
			"**/*.ts",
			"**/*.tsx",
		]);
	});

	it("should include compilerOptions with baseUrl and paths", () => {
		const config = generateTsConfig("base");
		const compilerOptions = config.compilerOptions as Record<string, unknown>;
		expect(compilerOptions.baseUrl).toBe(".");
		expect(compilerOptions.paths).toEqual({ "@/*": ["./src/*"] });
	});

	it("should include standard exclude paths", () => {
		const config = generateTsConfig("base");
		expect(config.exclude).toEqual(["node_modules", "dist", "build", ".next"]);
	});
});

describe("generateCommitlintConfig", () => {
	it("should return correct import string", () => {
		const config = generateCommitlintConfig();
		expect(config).toContain('import config from "@neosianexus/quality/commitlint"');
		expect(config).toContain("export default config");
	});
});

describe("generatePreCommitHook", () => {
	it("should include the provided execCommand and runCommand", () => {
		const hook = generatePreCommitHook("bunx", "bun run");
		expect(hook).toContain("bunx lint-staged");
		expect(hook).toContain("bun run check:fix");
		expect(hook.startsWith("#!/bin/sh")).toBe(true);
	});

	it("should use pnpm exec when provided", () => {
		const hook = generatePreCommitHook("pnpm exec", "pnpm run");
		expect(hook).toContain("pnpm exec lint-staged");
		expect(hook).toContain("pnpm run check:fix");
	});

	it("should use npx when provided", () => {
		const hook = generatePreCommitHook("npx", "npm run");
		expect(hook).toContain("npx lint-staged");
		expect(hook).toContain("npm run check:fix");
	});

	it("should include error instructions", () => {
		const hook = generatePreCommitHook("bunx", "bun run");
		expect(hook).toContain("Pre-commit checks failed");
		expect(hook).toContain("exit 1");
	});

	it("should use yarn commands correctly", () => {
		const hook = generatePreCommitHook("yarn", "yarn");
		expect(hook).toContain("yarn lint-staged");
		expect(hook).toContain("yarn check:fix");
	});
});

describe("generateCommitMsgHook", () => {
	it("should generate enabled commitlint hook with exec command", () => {
		const hook = generateCommitMsgHook(true, "bunx");
		expect(hook.startsWith("#!/bin/sh")).toBe(true);
		expect(hook).toContain("bunx --no -- commitlint --edit");
		expect(hook).toContain("Commit message validation failed");
		expect(hook).toContain("exit 1");
	});

	it("should generate enabled hook with pnpm exec", () => {
		const hook = generateCommitMsgHook(true, "pnpm exec");
		expect(hook).toContain("pnpm exec --no -- commitlint --edit");
	});

	it("should generate disabled hook when commitlint is false", () => {
		const hook = generateCommitMsgHook(false, "bunx");
		expect(hook.startsWith("#!/bin/sh")).toBe(true);
		expect(hook).toContain("disabled");
		expect(hook).not.toContain("commitlint --edit");
	});
});

describe("generateKnipConfig", () => {
	it("should generate base knip config", () => {
		const config = generateKnipConfig("base");
		expect(config.$schema).toBe("https://unpkg.com/knip@5/schema.json");
		expect(config.ignore).toEqual(["**/*.d.ts"]);
		expect(config.ignoreBinaries).toEqual(["biome"]);
		expect(config.project).toEqual(["src/**/*.{ts,tsx,js,jsx}"]);
		expect(config.entry).toEqual(["src/index.ts", "src/main.ts"]);
	});

	it("should generate react knip config", () => {
		const config = generateKnipConfig("react");
		expect(config.project).toEqual(["src/**/*.{ts,tsx,js,jsx}"]);
		expect(config.entry).toEqual(["src/index.{ts,tsx}", "src/main.{ts,tsx}", "src/App.{ts,tsx}"]);
		expect(config.ignoreDependencies).toEqual(["tailwindcss", "postcss", "autoprefixer"]);
	});

	it("should generate nextjs knip config with framework-specific settings", () => {
		const config = generateKnipConfig("nextjs");
		expect(config.entry).toEqual([
			"src/app/**/page.tsx",
			"src/app/**/layout.tsx",
			"src/app/**/route.ts",
		]);
		expect(config.project).toEqual(["src/**/*.{ts,tsx}"]);
		expect(config.ignoreDependencies).toEqual(["tailwindcss", "postcss", "autoprefixer"]);
		expect(config.next).toEqual({ entry: ["next.config.{js,ts,mjs}"] });
		expect(config.postcss).toEqual({ config: ["postcss.config.{js,mjs,cjs}"] });
		expect(config.tailwind).toEqual({ config: ["tailwind.config.{js,ts,mjs,cjs}"] });
	});

	it("should include common fields across all project types", () => {
		for (const type of ["base", "react", "nextjs"] as const) {
			const config = generateKnipConfig(type);
			expect(config.$schema).toBe("https://unpkg.com/knip@5/schema.json");
			expect(config.ignore).toEqual(["**/*.d.ts"]);
			expect(config.ignoreBinaries).toEqual(["biome"]);
		}
	});
});

describe("getPackageScripts", () => {
	it("should return base scripts without optional features", () => {
		const scripts = getPackageScripts({ commitlint: false, knip: false, husky: false });
		expect(scripts.lint).toBe("biome lint .");
		expect(scripts["lint:fix"]).toBe("biome lint --write --unsafe .");
		expect(scripts.format).toBe("biome format --write .");
		expect(scripts.check).toBe("biome check .");
		expect(scripts["check:fix"]).toBe("biome check --write --unsafe .");
		expect(scripts.typecheck).toBe("tsc --noEmit");
		expect(scripts.prepare).toBeUndefined();
		expect(scripts.commitlint).toBeUndefined();
		expect(scripts.knip).toBeUndefined();
	});

	it("should include husky prepare script when enabled", () => {
		const scripts = getPackageScripts({ commitlint: false, knip: false, husky: true });
		expect(scripts.prepare).toBe("husky");
	});

	it("should include commitlint script when enabled", () => {
		const scripts = getPackageScripts({ commitlint: true, knip: false, husky: false });
		expect(scripts.commitlint).toBe("commitlint --edit");
	});

	it("should include knip scripts when enabled", () => {
		const scripts = getPackageScripts({ commitlint: false, knip: true, husky: false });
		expect(scripts.knip).toBe("knip");
		expect(scripts["knip:fix"]).toBe("knip --fix");
	});

	it("should include all optional scripts when all options are enabled", () => {
		const scripts = getPackageScripts({ commitlint: true, knip: true, husky: true });
		expect(scripts.prepare).toBe("husky");
		expect(scripts.commitlint).toBe("commitlint --edit");
		expect(scripts.knip).toBe("knip");
		expect(scripts["knip:fix"]).toBe("knip --fix");
	});
});

describe("getLintStagedConfig", () => {
	it("should return correct biome check command for staged files", () => {
		const config = getLintStagedConfig();
		expect(config["*.{js,jsx,ts,tsx,json,css,md}"]).toEqual([
			"biome check --write --unsafe --no-errors-on-unmatched",
		]);
	});

	it("should only have one glob pattern", () => {
		const config = getLintStagedConfig();
		const keys = Object.keys(config);
		expect(keys).toHaveLength(1);
		expect(keys[0]).toBe("*.{js,jsx,ts,tsx,json,css,md}");
	});
});
