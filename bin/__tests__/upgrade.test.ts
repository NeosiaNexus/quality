import { describe, expect, it } from "vitest";
import { analyzeChanges } from "../commands/upgrade.js";

describe("analyzeChanges (recursive)", () => {
	it("should return no changes for identical empty objects", () => {
		const result = analyzeChanges({}, {});
		expect(result.added).toEqual([]);
		expect(result.modified).toEqual([]);
		expect(result.removed).toEqual([]);
	});

	it("should return no changes for identical non-empty objects", () => {
		const obj = { a: 1, b: "hello", c: [1, 2] };
		const result = analyzeChanges(obj, { ...obj });
		expect(result.added).toEqual([]);
		expect(result.modified).toEqual([]);
		expect(result.removed).toEqual([]);
	});

	it("should detect added top-level keys", () => {
		const current = { a: 1 };
		const updated = { a: 1, b: 2, c: 3 };
		const result = analyzeChanges(current, updated);
		expect(result.added).toEqual(["b", "c"]);
		expect(result.modified).toEqual([]);
		expect(result.removed).toEqual([]);
	});

	it("should detect modified top-level values", () => {
		const current = { a: 1, b: "old" };
		const updated = { a: 1, b: "new" };
		const result = analyzeChanges(current, updated);
		expect(result.added).toEqual([]);
		expect(result.modified).toEqual(["b"]);
		expect(result.removed).toEqual([]);
	});

	it("should detect removed top-level keys", () => {
		const current = { a: 1, b: 2, c: 3 };
		const updated = { a: 1 };
		const result = analyzeChanges(current, updated);
		expect(result.added).toEqual([]);
		expect(result.modified).toEqual([]);
		expect(result.removed).toEqual(["b", "c"]);
	});

	it("should detect deeply nested additions", () => {
		const current = {
			linter: { rules: { recommended: true } },
		};
		const updated = {
			linter: { rules: { recommended: true, nursery: { newRule: "error" } } },
		};
		const result = analyzeChanges(current, updated);
		expect(result.added).toEqual(["linter.rules.nursery"]);
		expect(result.modified).toEqual([]);
		expect(result.removed).toEqual([]);
	});

	it("should detect deeply nested modifications", () => {
		const current = {
			linter: { rules: { complexity: { maxDepth: 5 } } },
		};
		const updated = {
			linter: { rules: { complexity: { maxDepth: 10 } } },
		};
		const result = analyzeChanges(current, updated);
		expect(result.added).toEqual([]);
		expect(result.modified).toEqual(["linter.rules.complexity.maxDepth"]);
		expect(result.removed).toEqual([]);
	});

	it("should detect deeply nested removals", () => {
		const current = {
			linter: { rules: { style: { useConst: "error", noVar: "error" } } },
		};
		const updated = {
			linter: { rules: { style: { useConst: "error" } } },
		};
		const result = analyzeChanges(current, updated);
		expect(result.added).toEqual([]);
		expect(result.modified).toEqual([]);
		expect(result.removed).toEqual(["linter.rules.style.noVar"]);
	});

	it("should handle mixed changes at different depths", () => {
		const current = {
			$schema: "https://old.schema",
			linter: {
				rules: {
					complexity: { maxDepth: 5 },
					style: { noVar: "error" },
				},
			},
			formatter: { indentStyle: "tab" },
		};
		const updated = {
			$schema: "https://new.schema",
			linter: {
				rules: {
					complexity: { maxDepth: 10, maxLines: 300 },
					performance: { noDelete: "warn" },
				},
			},
			formatter: { indentStyle: "tab" },
			organizeImports: { enabled: true },
		};
		const result = analyzeChanges(current, updated);

		expect(result.modified).toContain("$schema");
		expect(result.added).toContain("organizeImports");
		expect(result.modified).toContain("linter.rules.complexity.maxDepth");
		expect(result.added).toContain("linter.rules.complexity.maxLines");
		expect(result.added).toContain("linter.rules.performance");
		expect(result.removed).toContain("linter.rules.style");
	});

	it("should treat array changes as modifications, not recurse into them", () => {
		const current = { include: ["src"] };
		const updated = { include: ["src", "lib"] };
		const result = analyzeChanges(current, updated);
		expect(result.modified).toEqual(["include"]);
		expect(result.added).toEqual([]);
		expect(result.removed).toEqual([]);
	});

	it("should handle type changes from primitive to object", () => {
		const current = { rules: "strict" };
		const updated = { rules: { noVar: "error" } };
		const result = analyzeChanges(
			current as Record<string, unknown>,
			updated as Record<string, unknown>,
		);
		expect(result.modified).toEqual(["rules"]);
	});

	it("should handle type changes from object to primitive", () => {
		const current = { rules: { noVar: "error" } };
		const updated = { rules: "off" };
		const result = analyzeChanges(
			current as Record<string, unknown>,
			updated as Record<string, unknown>,
		);
		expect(result.modified).toEqual(["rules"]);
	});
});
