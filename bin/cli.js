#!/usr/bin/env node

// bin/cli.ts
import { defineCommand as defineCommand3, runCommand as runCommand2, runMain } from "citty";

// bin/commands/init.ts
import { existsSync as existsSync4, mkdirSync as mkdirSync2 } from "fs";
import { join as join4 } from "path";
import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

// bin/utils/constants.ts
var VERSION = "1.0.0-beta.1";
var PACKAGE_NAME = "@neosianexus/quality";

// bin/utils/detect.ts
import { existsSync, readFileSync } from "fs";
import { join } from "path";
function detectPackageManager(cwd) {
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(join(cwd, "package-lock.json"))) {
    return "npm";
  }
  return "bun";
}
function readPackageJson(cwd) {
  const packageJsonPath = join(cwd, "package.json");
  if (!existsSync(packageJsonPath)) {
    return null;
  }
  try {
    const content = readFileSync(packageJsonPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function detectProjectType(cwd) {
  const packageJson = readPackageJson(cwd);
  if (!packageJson) {
    return "base";
  }
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  if (deps.next) {
    return "nextjs";
  }
  if (deps.react) {
    return "react";
  }
  return "base";
}
function isGitRepository(cwd) {
  return existsSync(join(cwd, ".git"));
}
function getPackageManagerCommands(pm) {
  switch (pm) {
    case "bun":
      return { install: "bun install", addDev: ["bun", "add", "-D"], exec: "bunx" };
    case "pnpm":
      return { install: "pnpm install", addDev: ["pnpm", "add", "-D"], exec: "pnpm exec" };
    case "yarn":
      return { install: "yarn", addDev: ["yarn", "add", "-D"], exec: "yarn" };
    default:
      return { install: "npm install", addDev: ["npm", "install", "-D"], exec: "npx" };
  }
}

// bin/utils/exec.ts
import { spawnSync } from "child_process";
function runCommand(command, args2, cwd) {
  try {
    const result = spawnSync(command, args2, {
      cwd,
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"]
    });
    return {
      success: result.status === 0,
      output: result.stdout || result.stderr || "",
      code: result.status
    };
  } catch (err) {
    return {
      success: false,
      output: err instanceof Error ? err.message : "Unknown error",
      code: null
    };
  }
}

// bin/utils/fs.ts
import {
  chmodSync,
  copyFileSync,
  existsSync as existsSync2,
  mkdirSync,
  readFileSync as readFileSync2,
  writeFileSync
} from "fs";
import { basename, dirname, extname, join as join2 } from "path";
function writeFile(filePath, content, executable = false) {
  const dir = dirname(filePath);
  if (!existsSync2(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(filePath, content, "utf-8");
  if (executable) {
    chmodSync(filePath, 493);
  }
}
function readJsonFile(filePath) {
  if (!existsSync2(filePath)) {
    return null;
  }
  try {
    const content = readFileSync2(filePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}
function writeJsonFile(filePath, data) {
  writeFile(filePath, `${JSON.stringify(data, null, "	")}
`);
}
function createBackup(filePath) {
  if (!existsSync2(filePath)) {
    return null;
  }
  const dir = dirname(filePath);
  const ext = extname(filePath);
  const base = basename(filePath, ext);
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/:/g, "-");
  const backupPath = join2(dir, `${base}.backup.${timestamp}${ext}`);
  copyFileSync(filePath, backupPath);
  return backupPath;
}
function fileExists(filePath) {
  return existsSync2(filePath);
}

// bin/utils/generators.ts
import { existsSync as existsSync3, readFileSync as readFileSync3 } from "fs";
import { dirname as dirname2, join as join3 } from "path";
import { fileURLToPath } from "url";
var currentDir = dirname2(fileURLToPath(import.meta.url));
var packageRoot = join3(currentDir, "..", "..");
function generateBiomeConfig() {
  return {
    $schema: "https://biomejs.dev/schemas/2.0.0/schema.json",
    extends: ["@neosianexus/quality"]
  };
}
function getExtendsPath(type) {
  switch (type) {
    case "nextjs":
      return "@neosianexus/quality/tsconfig.nextjs";
    case "react":
      return "@neosianexus/quality/tsconfig.react";
    default:
      return "@neosianexus/quality/tsconfig.base";
  }
}
function generateTsConfig(type) {
  const config = {
    extends: getExtendsPath(type),
    compilerOptions: {
      baseUrl: ".",
      paths: {
        "@/*": ["./src/*"]
      }
    },
    include: ["src", "**/*.ts", "**/*.tsx"],
    exclude: ["node_modules", "dist", "build", ".next"]
  };
  if (type === "nextjs") {
    config.include = ["src", "next-env.d.ts", ".next/types/**/*.ts", "**/*.ts", "**/*.tsx"];
  }
  return config;
}
function generateCommitlintConfig() {
  return `import config from "@neosianexus/quality/commitlint";

export default config;
`;
}
function generatePreCommitHook(execCommand) {
  return `#!/bin/sh

# Pre-commit hook - runs lint-staged to check and fix staged files
# To skip: git commit --no-verify

echo "\\033[0;36m\u{1F50D} Running pre-commit checks...\\033[0m"

if ! ${execCommand} lint-staged; then
    echo ""
    echo "\\033[0;31m\u2717 Pre-commit checks failed\\033[0m"
    echo ""
    echo "\\033[0;33mHow to fix:\\033[0m"
    echo "  1. Review the errors above"
    echo "  2. Run 'bun run check:fix' to auto-fix issues"
    echo "  3. Stage the fixed files with 'git add'"
    echo "  4. Try committing again"
    echo ""
    echo "\\033[0;90mTo skip this check: git commit --no-verify\\033[0m"
    exit 1
fi

echo "\\033[0;32m\u2713 Pre-commit checks passed\\033[0m"
`;
}
function generateCommitMsgHook(withCommitlint, execCommand) {
  if (withCommitlint) {
    return `#!/bin/sh

# Commit message validation - enforces Conventional Commits format
# To skip: git commit --no-verify
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert

if ! ${execCommand} --no -- commitlint --edit "$1"; then
    echo ""
    echo "\\033[0;31m\u2717 Commit message validation failed\\033[0m"
    echo ""
    echo "\\033[0;33mExpected format:\\033[0m type(scope): description"
    echo ""
    echo "\\033[0;33mExamples:\\033[0m"
    echo "  feat: add user authentication"
    echo "  fix(api): resolve timeout issue"
    echo "  docs: update README"
    echo ""
    echo "\\033[0;33mAllowed types:\\033[0m"
    echo "  feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert"
    echo ""
    echo "\\033[0;90mTo skip: git commit --no-verify\\033[0m"
    exit 1
fi
`;
  }
  return `#!/bin/sh

# Conventional Commits validation (disabled)
# To enable, run: bunx quality init --commitlint
# Or manually install: bun add -D @commitlint/cli @commitlint/config-conventional
`;
}
function getVscodeSettings() {
  const settingsPath = join3(packageRoot, "vscode", "settings.json");
  if (existsSync3(settingsPath)) {
    try {
      return JSON.parse(readFileSync3(settingsPath, "utf-8"));
    } catch {
    }
  }
  return {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true,
    "editor.formatOnPaste": true,
    "editor.codeActionsOnSave": {
      "quickfix.biome": "explicit",
      "source.organizeImports.biome": "explicit"
    },
    "editor.rulers": [100],
    "editor.tabSize": 2,
    "editor.insertSpaces": false,
    "files.eol": "\n",
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "[javascript]": { "editor.defaultFormatter": "biomejs.biome" },
    "[javascriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
    "[typescript]": { "editor.defaultFormatter": "biomejs.biome" },
    "[typescriptreact]": { "editor.defaultFormatter": "biomejs.biome" },
    "[json]": { "editor.defaultFormatter": "biomejs.biome" },
    "[jsonc]": { "editor.defaultFormatter": "biomejs.biome" },
    "[css]": { "editor.defaultFormatter": "biomejs.biome" },
    "[markdown]": { "files.trimTrailingWhitespace": false },
    "typescript.tsdk": "node_modules/typescript/lib",
    "typescript.enablePromptUseWorkspaceTsdk": true,
    "typescript.preferences.importModuleSpecifier": "non-relative",
    "typescript.preferences.preferTypeOnlyAutoImports": true
  };
}
function getVscodeExtensions() {
  const extensionsPath = join3(packageRoot, "vscode", "extensions.json");
  if (existsSync3(extensionsPath)) {
    try {
      return JSON.parse(readFileSync3(extensionsPath, "utf-8"));
    } catch {
    }
  }
  return {
    recommendations: [
      "biomejs.biome",
      "usernamehw.errorlens",
      "editorconfig.editorconfig",
      "streetsidesoftware.code-spell-checker",
      "eamodio.gitlens",
      "gruntfuggly.todo-tree"
    ],
    unwantedRecommendations: ["esbenp.prettier-vscode", "dbaeumer.vscode-eslint"]
  };
}
function generateKnipConfig(type) {
  const baseConfig = {
    $schema: "https://unpkg.com/knip@5/schema.json",
    project: ["src/**/*.{ts,tsx,js,jsx}"],
    ignore: ["**/*.d.ts"]
  };
  if (type === "nextjs") {
    return {
      ...baseConfig,
      entry: ["src/app/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      project: ["src/**/*.{ts,tsx}", "app/**/*.{ts,tsx}"],
      next: {
        entry: ["next.config.{js,ts,mjs}"]
      }
    };
  }
  if (type === "react") {
    return {
      ...baseConfig,
      entry: ["src/index.{ts,tsx}", "src/main.{ts,tsx}", "src/App.{ts,tsx}"]
    };
  }
  return {
    ...baseConfig,
    entry: ["src/index.ts", "src/main.ts"]
  };
}
function getPackageScripts(options) {
  const scripts = {
    lint: "biome lint .",
    "lint:fix": "biome lint --write .",
    format: "biome format --write .",
    check: "biome check .",
    "check:fix": "biome check --write .",
    typecheck: "tsc --noEmit"
  };
  if (options.husky) {
    scripts.prepare = "husky";
  }
  if (options.commitlint) {
    scripts.commitlint = "commitlint --edit";
  }
  if (options.knip) {
    scripts.knip = "knip";
  }
  return scripts;
}
function getLintStagedConfig() {
  return {
    "*.{js,jsx,ts,tsx,json,css,md}": ["biome check --write --no-errors-on-unmatched"]
  };
}

// bin/commands/init.ts
async function promptInitOptions(defaults) {
  const options = await p.group(
    {
      projectType: () => p.select({
        message: "Type de projet ?",
        initialValue: defaults.projectType,
        options: [
          {
            value: "nextjs",
            label: "Next.js",
            hint: defaults.projectType === "nextjs" ? "d\xE9tect\xE9" : void 0
          },
          {
            value: "react",
            label: "React",
            hint: defaults.projectType === "react" ? "d\xE9tect\xE9" : void 0
          },
          {
            value: "base",
            label: "Node.js / TypeScript",
            hint: defaults.projectType === "base" ? "d\xE9tect\xE9" : void 0
          }
        ]
      }),
      packageManager: () => p.select({
        message: "Package manager ?",
        initialValue: defaults.packageManager,
        options: [
          {
            value: "bun",
            label: "Bun",
            hint: defaults.packageManager === "bun" ? "d\xE9tect\xE9" : "recommand\xE9"
          },
          {
            value: "pnpm",
            label: "pnpm",
            hint: defaults.packageManager === "pnpm" ? "d\xE9tect\xE9" : void 0
          },
          {
            value: "yarn",
            label: "Yarn",
            hint: defaults.packageManager === "yarn" ? "d\xE9tect\xE9" : void 0
          },
          {
            value: "npm",
            label: "npm",
            hint: defaults.packageManager === "npm" ? "d\xE9tect\xE9" : void 0
          }
        ]
      }),
      commitlint: () => p.confirm({
        message: "Activer Conventional Commits (commitlint) ?",
        initialValue: true
      }),
      husky: () => p.confirm({
        message: "Configurer les git hooks (Husky + lint-staged) ?",
        initialValue: true
      }),
      vscode: () => p.confirm({
        message: "Ajouter la configuration VS Code ?",
        initialValue: true
      }),
      knip: () => p.confirm({
        message: "Ajouter Knip (d\xE9tection de code mort) ?",
        initialValue: true
      })
    },
    {
      onCancel: () => {
        p.cancel("Annul\xE9.");
        process.exit(0);
      }
    }
  );
  return options;
}
function executeInit(options) {
  const { cwd, packageManager, projectType, commitlint, husky, vscode, knip, force, dryRun } = options;
  const pmCommands = getPackageManagerCommands(packageManager);
  const tasks = [];
  const biomePath = join4(cwd, "biome.json");
  if (!fileExists(biomePath) || force) {
    if (!dryRun) {
      writeJsonFile(biomePath, generateBiomeConfig());
    }
    tasks.push("biome.json");
  }
  const tsconfigPath = join4(cwd, "tsconfig.json");
  if (!fileExists(tsconfigPath) || force) {
    if (!dryRun) {
      writeJsonFile(tsconfigPath, generateTsConfig(projectType));
    }
    tasks.push("tsconfig.json");
  }
  if (vscode) {
    const vscodeDir = join4(cwd, ".vscode");
    if (!(dryRun || existsSync4(vscodeDir))) {
      mkdirSync2(vscodeDir, { recursive: true });
    }
    const settingsPath = join4(vscodeDir, "settings.json");
    if (!fileExists(settingsPath) || force) {
      if (!dryRun) {
        writeJsonFile(settingsPath, getVscodeSettings());
      }
      tasks.push(".vscode/settings.json");
    }
    const extensionsPath = join4(vscodeDir, "extensions.json");
    if (!fileExists(extensionsPath) || force) {
      if (!dryRun) {
        writeJsonFile(extensionsPath, getVscodeExtensions());
      }
      tasks.push(".vscode/extensions.json");
    }
  }
  const packageJson = readPackageJson(cwd);
  if (packageJson) {
    const scripts = packageJson.scripts || {};
    const newScripts = getPackageScripts({ commitlint, knip, husky });
    let scriptsAdded = 0;
    for (const [name, command] of Object.entries(newScripts)) {
      if (!scripts[name]) {
        scripts[name] = command;
        scriptsAdded++;
      }
    }
    if (scriptsAdded > 0) {
      packageJson.scripts = scripts;
    }
    if (husky && !packageJson["lint-staged"]) {
      packageJson["lint-staged"] = getLintStagedConfig();
    }
    if (!dryRun) {
      writeJsonFile(join4(cwd, "package.json"), packageJson);
    }
    if (scriptsAdded > 0) {
      tasks.push(`package.json (${scriptsAdded} scripts)`);
    }
  }
  if (husky) {
    const deps = ["husky", "lint-staged"];
    if (commitlint) {
      deps.push("@commitlint/cli", "@commitlint/config-conventional");
    }
    if (!dryRun) {
      const spinner3 = p.spinner();
      spinner3.start(`Installation des d\xE9pendances (${packageManager})...`);
      const [cmd, ...baseArgs] = pmCommands.addDev;
      const result = runCommand(cmd, [...baseArgs, ...deps], cwd);
      if (result.success) {
        spinner3.stop("D\xE9pendances install\xE9es");
      } else {
        spinner3.stop("\xC9chec de l'installation");
        p.log.warn(`Installez manuellement: ${pmCommands.addDev.join(" ")} ${deps.join(" ")}`);
      }
    }
    tasks.push(`d\xE9pendances: ${deps.join(", ")}`);
    if (!isGitRepository(cwd)) {
      if (!dryRun) {
        runCommand("git", ["init"], cwd);
      }
      tasks.push("git init");
    }
    const huskyDir = join4(cwd, ".husky");
    if (!(dryRun || existsSync4(huskyDir))) {
      mkdirSync2(huskyDir, { recursive: true });
    }
    const preCommitPath = join4(huskyDir, "pre-commit");
    if (!fileExists(preCommitPath) || force) {
      if (!dryRun) {
        writeFile(preCommitPath, generatePreCommitHook(pmCommands.exec), true);
      }
      tasks.push(".husky/pre-commit");
    }
    const commitMsgPath = join4(huskyDir, "commit-msg");
    if (!fileExists(commitMsgPath) || force) {
      if (!dryRun) {
        writeFile(commitMsgPath, generateCommitMsgHook(commitlint, pmCommands.exec), true);
      }
      tasks.push(".husky/commit-msg");
    }
    if (!dryRun) {
      runCommand("npx", ["husky"], cwd);
    }
  }
  if (commitlint) {
    const commitlintPath = join4(cwd, "commitlint.config.js");
    if (!fileExists(commitlintPath) || force) {
      if (!dryRun) {
        writeFile(commitlintPath, generateCommitlintConfig());
      }
      tasks.push("commitlint.config.js");
    }
  }
  if (knip) {
    const knipPath = join4(cwd, "knip.json");
    if (!fileExists(knipPath) || force) {
      if (!dryRun) {
        writeJsonFile(knipPath, generateKnipConfig(projectType));
      }
      tasks.push("knip.json");
    }
    if (!dryRun) {
      const [cmd, ...baseArgs] = pmCommands.addDev;
      runCommand(cmd, [...baseArgs, "knip"], cwd);
    }
  }
  return;
}
var initCommand = defineCommand({
  meta: {
    name: "init",
    description: "Initialize quality configuration in your project"
  },
  args: {
    yes: {
      type: "boolean",
      alias: "y",
      description: "Skip prompts and use defaults",
      default: false
    },
    force: {
      type: "boolean",
      alias: "f",
      description: "Overwrite existing files",
      default: false
    },
    commitlint: {
      type: "boolean",
      alias: "c",
      description: "Enable Conventional Commits validation",
      default: void 0
    },
    "skip-husky": {
      type: "boolean",
      description: "Skip Husky and lint-staged setup",
      default: false
    },
    "skip-vscode": {
      type: "boolean",
      description: "Skip VS Code configuration",
      default: false
    },
    knip: {
      type: "boolean",
      alias: "k",
      description: "Add Knip for dead code detection",
      default: void 0
    },
    "dry-run": {
      type: "boolean",
      alias: "d",
      description: "Preview changes without writing files",
      default: false
    }
  },
  async run({ args: args2 }) {
    const cwd = process.cwd();
    const detectedPM = detectPackageManager(cwd);
    const detectedType = detectProjectType(cwd);
    p.intro(`${pc.cyan(pc.bold(PACKAGE_NAME))} ${pc.dim(`v${VERSION}`)}`);
    if (args2["dry-run"]) {
      p.log.warn(pc.yellow("Mode dry-run: aucun fichier ne sera modifi\xE9"));
    }
    let options;
    if (args2.yes) {
      options = {
        cwd,
        packageManager: detectedPM,
        projectType: detectedType,
        commitlint: args2.commitlint ?? true,
        husky: !args2["skip-husky"],
        vscode: !args2["skip-vscode"],
        knip: args2.knip ?? true,
        force: args2.force,
        dryRun: args2["dry-run"]
      };
      p.log.info(`Projet: ${pc.cyan(options.projectType)}`);
      p.log.info(`Package manager: ${pc.cyan(options.packageManager)}`);
    } else {
      const prompted = await promptInitOptions({
        packageManager: detectedPM,
        projectType: detectedType
      });
      if (!prompted) {
        return;
      }
      options = {
        cwd,
        ...prompted,
        force: args2.force,
        dryRun: args2["dry-run"]
      };
    }
    const spinner3 = p.spinner();
    spinner3.start("Configuration en cours...");
    executeInit(options);
    spinner3.stop("Configuration termin\xE9e");
    p.log.success(pc.green("Setup termin\xE9 !"));
    p.note(
      [
        `${pc.cyan("Scripts disponibles:")}`,
        `  ${pc.dim("bun run")} check      ${pc.dim("# Lint + Format")}`,
        `  ${pc.dim("bun run")} check:fix  ${pc.dim("# Auto-fix")}`,
        `  ${pc.dim("bun run")} typecheck  ${pc.dim("# TypeScript")}`,
        options.knip ? `  ${pc.dim("bun run")} knip       ${pc.dim("# Code mort")}` : "",
        "",
        options.commitlint ? [
          `${pc.cyan("Format des commits:")}`,
          `  ${pc.green("feat")}: nouvelle fonctionnalit\xE9`,
          `  ${pc.green("fix")}: correction de bug`,
          `  ${pc.green("docs")}: documentation`
        ].join("\n") : `${pc.dim("Tip: Ajoutez commitlint avec")} quality init --commitlint`
      ].filter(Boolean).join("\n"),
      "Prochaines \xE9tapes"
    );
    p.outro(`${pc.dim("Documentation:")} ${pc.cyan("https://github.com/neosianexus/quality")}`);
  }
});

// bin/commands/upgrade.ts
import { join as join5 } from "path";
import * as p2 from "@clack/prompts";
import { defineCommand as defineCommand2 } from "citty";
import merge from "deepmerge";
import pc2 from "picocolors";
function smartMerge(defaults, userConfig) {
  return merge(defaults, userConfig, {
    // User arrays completely override defaults (don't merge arrays)
    arrayMerge: (_target, source) => source,
    // Clone objects to avoid mutation
    clone: true
  });
}
function analyzeChanges(current, updated) {
  const added = [];
  const modified = [];
  const removed = [];
  const currentKeys = new Set(Object.keys(current));
  const updatedKeys = new Set(Object.keys(updated));
  for (const key of updatedKeys) {
    if (!currentKeys.has(key)) {
      added.push(key);
    } else if (JSON.stringify(current[key]) !== JSON.stringify(updated[key])) {
      modified.push(key);
    }
  }
  for (const key of currentKeys) {
    if (!updatedKeys.has(key)) {
      removed.push(key);
    }
  }
  return { added, modified, removed };
}
function upgradeConfigFile(config, options) {
  if (!config.currentContent) {
    if (!options.dryRun) {
      writeJsonFile(config.path, config.newDefaults);
    }
    return { upgraded: true, backupPath: null };
  }
  let finalContent;
  let backupPath = null;
  if (config.requiresMerge) {
    finalContent = smartMerge(config.newDefaults, config.currentContent);
  } else {
    finalContent = config.newDefaults;
  }
  if (JSON.stringify(config.currentContent) === JSON.stringify(finalContent)) {
    return { upgraded: false, backupPath: null };
  }
  if (options.backup && !options.dryRun) {
    backupPath = createBackup(config.path);
  }
  if (!options.dryRun) {
    writeJsonFile(config.path, finalContent);
  }
  return { upgraded: true, backupPath };
}
var upgradeCommand = defineCommand2({
  meta: {
    name: "upgrade",
    description: "Upgrade existing quality configuration to the latest version"
  },
  args: {
    yes: {
      type: "boolean",
      alias: "y",
      description: "Skip confirmation prompts",
      default: false
    },
    force: {
      type: "boolean",
      alias: "f",
      description: "Replace configs instead of merging",
      default: false
    },
    "no-backup": {
      type: "boolean",
      description: "Don't create backups before modifying files",
      default: false
    },
    "dry-run": {
      type: "boolean",
      alias: "d",
      description: "Preview changes without writing files",
      default: false
    }
  },
  async run({ args: args2 }) {
    const cwd = process.cwd();
    const projectType = detectProjectType(cwd);
    p2.intro(`${pc2.cyan(pc2.bold(PACKAGE_NAME))} ${pc2.magenta("upgrade")} ${pc2.dim(`v${VERSION}`)}`);
    if (args2["dry-run"]) {
      p2.log.warn(pc2.yellow("Mode dry-run: aucun fichier ne sera modifi\xE9"));
    }
    const configs = [
      {
        name: "biome.json",
        path: join5(cwd, "biome.json"),
        currentContent: readJsonFile(join5(cwd, "biome.json")),
        newDefaults: generateBiomeConfig(),
        requiresMerge: true
        // biome.json can be safely merged
      },
      {
        name: "tsconfig.json",
        path: join5(cwd, "tsconfig.json"),
        currentContent: readJsonFile(join5(cwd, "tsconfig.json")),
        newDefaults: generateTsConfig(projectType),
        requiresMerge: true
        // tsconfig.json should preserve user paths/includes
      },
      {
        name: ".vscode/settings.json",
        path: join5(cwd, ".vscode", "settings.json"),
        currentContent: readJsonFile(join5(cwd, ".vscode", "settings.json")),
        newDefaults: getVscodeSettings(),
        requiresMerge: true
        // VSCode settings should be merged
      },
      {
        name: ".vscode/extensions.json",
        path: join5(cwd, ".vscode", "extensions.json"),
        currentContent: readJsonFile(join5(cwd, ".vscode", "extensions.json")),
        newDefaults: getVscodeExtensions(),
        requiresMerge: true
        // Extensions can be merged
      }
    ];
    const toUpgrade = [];
    for (const config of configs) {
      if (!config.currentContent) {
        toUpgrade.push({
          config,
          changes: { added: Object.keys(config.newDefaults), modified: [], removed: [] },
          isNew: true
        });
      } else {
        const merged = args2.force ? config.newDefaults : smartMerge(config.newDefaults, config.currentContent);
        const changes = analyzeChanges(config.currentContent, merged);
        if (changes.added.length > 0 || changes.modified.length > 0) {
          toUpgrade.push({ config, changes, isNew: false });
        }
      }
    }
    const packageJson = readPackageJson(cwd);
    const newScripts = getPackageScripts({ commitlint: true, knip: true, husky: true });
    const currentScripts = packageJson?.scripts || {};
    const missingScripts = [];
    for (const [name] of Object.entries(newScripts)) {
      if (!currentScripts[name]) {
        missingScripts.push(name);
      }
    }
    if (toUpgrade.length === 0 && missingScripts.length === 0) {
      p2.log.success("Toutes les configurations sont \xE0 jour !");
      p2.outro(pc2.dim("Rien \xE0 faire."));
      return;
    }
    p2.log.info(pc2.cyan("Fichiers \xE0 mettre \xE0 jour:"));
    for (const { config, changes, isNew } of toUpgrade) {
      if (isNew) {
        p2.log.step(`  ${pc2.green("+")} ${config.name} ${pc2.dim("(nouveau)")}`);
      } else {
        const parts = [];
        if (changes.added.length > 0) {
          parts.push(pc2.green(`+${changes.added.length}`));
        }
        if (changes.modified.length > 0) {
          parts.push(pc2.yellow(`~${changes.modified.length}`));
        }
        p2.log.step(`  ${pc2.yellow("~")} ${config.name} ${pc2.dim(`(${parts.join(", ")})`)}`);
      }
    }
    if (missingScripts.length > 0) {
      p2.log.step(`  ${pc2.green("+")} package.json ${pc2.dim(`(${missingScripts.length} scripts)`)}`);
    }
    if (!(args2.yes || args2["dry-run"])) {
      const shouldContinue = await p2.confirm({
        message: args2["no-backup"] ? "Continuer sans backup ?" : "Continuer ? (les fichiers seront sauvegard\xE9s)",
        initialValue: true
      });
      if (!shouldContinue || p2.isCancel(shouldContinue)) {
        p2.cancel("Annul\xE9.");
        process.exit(0);
      }
    }
    const spinner3 = p2.spinner();
    spinner3.start("Mise \xE0 jour des configurations...");
    const results = [];
    for (const { config } of toUpgrade) {
      const result = upgradeConfigFile(config, {
        force: args2.force,
        dryRun: args2["dry-run"],
        backup: !args2["no-backup"]
      });
      if (result.upgraded) {
        results.push({ name: config.name, backupPath: result.backupPath });
      }
    }
    if (packageJson && missingScripts.length > 0) {
      if (!(args2["no-backup"] || args2["dry-run"])) {
        createBackup(join5(cwd, "package.json"));
      }
      const scripts = packageJson.scripts || {};
      for (const name of missingScripts) {
        const script = newScripts[name];
        if (script) {
          scripts[name] = script;
        }
      }
      packageJson.scripts = scripts;
      if (!packageJson["lint-staged"]) {
        packageJson["lint-staged"] = getLintStagedConfig();
      }
      if (!args2["dry-run"]) {
        writeJsonFile(join5(cwd, "package.json"), packageJson);
      }
      results.push({ name: "package.json", backupPath: null });
    }
    spinner3.stop("Mise \xE0 jour termin\xE9e");
    p2.log.success(pc2.green(`${results.length} fichier(s) mis \xE0 jour`));
    const backups = results.filter((r) => r.backupPath);
    if (backups.length > 0) {
      p2.note(backups.map((b) => `${pc2.dim(b.backupPath)}`).join("\n"), "Backups cr\xE9\xE9s");
    }
    if (args2["dry-run"]) {
      p2.note("Ex\xE9cutez sans --dry-run pour appliquer les changements", "Mode dry-run");
    }
    p2.outro(pc2.green("Configuration mise \xE0 jour !"));
  }
});

// bin/cli.ts
var main = defineCommand3({
  meta: {
    name: "quality",
    version: VERSION,
    description: `${PACKAGE_NAME} - Ultra-strict Biome + TypeScript + Husky configuration`
  },
  subCommands: {
    init: initCommand,
    upgrade: upgradeCommand
  }
});
var args = process.argv.slice(2);
var subcommands = ["init", "upgrade"];
var hasSubcommand = args.some(
  (arg) => subcommands.includes(arg) || arg === "--help" || arg === "-h" || arg === "--version"
);
if (hasSubcommand) {
  runMain(main);
} else {
  runCommand2(initCommand, { rawArgs: args });
}
/**
 * @fileoverview Quality CLI - Ultra-strict Biome + TypeScript + Husky configuration
 * @author neosianexus
 * @license MIT
 */
