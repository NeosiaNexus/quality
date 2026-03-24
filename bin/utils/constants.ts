/**
 * Package version - injected at build time from package.json via tsup define
 */
export const VERSION = process.env.PACKAGE_VERSION ?? "0.0.0-dev";

/**
 * Package name
 */
export const PACKAGE_NAME = "@neosianexus/quality";

/**
 * Supported package managers
 */
export type PackageManager = "npm" | "yarn" | "pnpm" | "bun";

/**
 * Supported project types
 */
export type ProjectType = "nextjs" | "react" | "base";
