import { defineConfig } from "tsup";

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
	banner: {
		js: "#!/usr/bin/env node",
	},
});
