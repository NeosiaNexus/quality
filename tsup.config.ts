import { readFileSync } from "node:fs";
import { defineConfig } from "tsup";

const pkg: { version: string } = JSON.parse(readFileSync("./package.json", "utf-8"));

export default defineConfig({
	entry: ["bin/cli.ts"],
	format: ["esm"],
	target: "node18",
	outDir: "bin",
	clean: false,
	splitting: false,
	sourcemap: false,
	dts: false,
	minify: false,
	define: {
		"process.env.PACKAGE_VERSION": JSON.stringify(pkg.version),
	},
	banner: {
		js: "#!/usr/bin/env node",
	},
});
