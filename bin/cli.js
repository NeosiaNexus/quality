#!/usr/bin/env node

// bin/cli.ts
import { defineCommand as defineCommand3, runCommand as runCommand2, runMain } from "citty";

// bin/commands/init.ts
import { existsSync as existsSync3, mkdirSync as mkdirSync2 } from "fs";
import { join as join3 } from "path";
import * as p from "@clack/prompts";
import { defineCommand } from "citty";
import pc from "picocolors";

// bin/utils/constants.ts
var VERSION = "1.0.0-beta.7";
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
      return { install: "bun install", addDev: ["bun", "add", "-D"], exec: "bunx", run: "bun run" };
    case "pnpm":
      return {
        install: "pnpm install",
        addDev: ["pnpm", "add", "-D"],
        exec: "pnpm exec",
        run: "pnpm run"
      };
    case "yarn":
      return { install: "yarn", addDev: ["yarn", "add", "-D"], exec: "yarn", run: "yarn" };
    default:
      return {
        install: "npm install",
        addDev: ["npm", "install", "-D"],
        exec: "npx",
        run: "npm run"
      };
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
function generateBiomeConfig() {
  return {
    $schema: "https://biomejs.dev/schemas/latest/schema.json",
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
function generatePreCommitHook(execCommand, runCommand3) {
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
    echo "  2. Run '${runCommand3} check:fix' to auto-fix issues"
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
# To enable, run: npx @neosianexus/quality init --commitlint
`;
}
function getVscodeSettings() {
  return {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true,
    "editor.formatOnPaste": true,
    "editor.codeActionsOnSave": {
      "source.organizeImports.biome": "explicit",
      "quickfix.biome": "explicit"
    },
    "editor.rulers": [100],
    "editor.tabSize": 2,
    "editor.insertSpaces": false,
    "files.eol": "\n",
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "[javascript]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[javascriptreact]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[typescript]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[typescriptreact]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[json]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[jsonc]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[css]": {
      "editor.defaultFormatter": "biomejs.biome"
    },
    "[markdown]": {
      "files.trimTrailingWhitespace": false
    },
    "biome.enabled": true,
    "biome.lspBin": null,
    "typescript.tsdk": "node_modules/typescript/lib",
    "typescript.enablePromptUseWorkspaceTsdk": true,
    "typescript.preferences.importModuleSpecifier": "non-relative",
    "typescript.suggest.autoImports": true,
    "typescript.updateImportsOnFileMove.enabled": "always",
    "typescript.preferences.preferTypeOnlyAutoImports": true,
    "javascript.preferences.importModuleSpecifier": "non-relative",
    "javascript.updateImportsOnFileMove.enabled": "always"
  };
}
function getVscodeExtensions() {
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
function generateEditorConfig() {
  return `# EditorConfig helps maintain consistent coding styles
# https://editorconfig.org

root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = tab
indent_size = 2

[*.md]
trim_trailing_whitespace = false

[*.{yml,yaml}]
indent_style = space
indent_size = 2

[*.json]
indent_style = tab
indent_size = 2

[*.sh]
end_of_line = lf
`;
}
function generateKnipConfig(type) {
  const baseConfig = {
    $schema: "https://unpkg.com/knip@5/schema.json",
    ignore: ["**/*.d.ts"],
    ignoreBinaries: ["biome"]
  };
  if (type === "nextjs") {
    return {
      ...baseConfig,
      entry: ["src/app/**/page.tsx", "src/app/**/layout.tsx", "src/app/**/route.ts"],
      project: ["src/**/*.{ts,tsx}"],
      ignoreDependencies: ["tailwindcss", "postcss", "autoprefixer"],
      next: {
        entry: ["next.config.{js,ts,mjs}"]
      },
      postcss: {
        config: ["postcss.config.{js,mjs,cjs}"]
      },
      tailwind: {
        config: ["tailwind.config.{js,ts,mjs,cjs}"]
      }
    };
  }
  if (type === "react") {
    return {
      ...baseConfig,
      project: ["src/**/*.{ts,tsx,js,jsx}"],
      entry: ["src/index.{ts,tsx}", "src/main.{ts,tsx}", "src/App.{ts,tsx}"],
      ignoreDependencies: ["tailwindcss", "postcss", "autoprefixer"]
    };
  }
  return {
    ...baseConfig,
    project: ["src/**/*.{ts,tsx,js,jsx}"],
    entry: ["src/index.ts", "src/main.ts"]
  };
}
function getPackageScripts(options) {
  const scripts = {
    lint: "biome lint .",
    "lint:fix": "biome lint --write --unsafe .",
    format: "biome format --write .",
    check: "biome check .",
    "check:fix": "biome check --write --unsafe .",
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
    scripts["knip:fix"] = "knip --fix";
  }
  return scripts;
}
function getLintStagedConfig() {
  return {
    "*.{js,jsx,ts,tsx,json,css,md}": ["biome check --write --unsafe --no-errors-on-unmatched"]
  };
}
function generateClaudeMd(options) {
  const { projectType, commitlint, knip, packageManager } = options;
  const pm = packageManager === "npm" ? "npm run" : packageManager;
  const sections = [];
  sections.push(`# Project Quality Configuration

This project uses \`@neosianexus/quality\` with ultra-strict TypeScript and Biome.`);
  const commands = [
    `${pm} check      # Lint + Format (Biome)`,
    `${pm} typecheck  # TypeScript strict mode`
  ];
  if (knip) {
    commands.push(`${pm} knip       # Dead code detection`);
  }
  sections.push(`## Verification Commands

IMPORTANT: Always run these before committing:

\`\`\`bash
${commands.join("\n")}
\`\`\``);
  sections.push(`## Critical TypeScript Rules

This project uses ultra-strict TypeScript. You MUST:

- \`noUncheckedIndexedAccess\`: Always check array/object access (\`arr[0]?.value\`)
- \`exactOptionalPropertyTypes\`: \`undefined\` must be explicit for optional props
- \`noImplicitAny\`: Never use implicit \`any\`, always type explicitly
- \`verbatimModuleSyntax\`: Use \`import type { X }\` for type-only imports`);
  let biomeRules = `## Biome Rules (replaces ESLint + Prettier)

- NO \`forEach\` \u2192 use \`for...of\` or \`map\`
- NO CommonJS \u2192 use ES modules (\`import\`/\`export\`)
- NO non-null assertions (\`!\`) \u2192 use proper null checks
- NO implicit \`any\` \u2192 always type explicitly
- Max 15 cognitive complexity per function
- Max 4 parameters per function`;
  if (projectType === "nextjs") {
    biomeRules += `
- Default exports allowed ONLY for Next.js pages/layouts/routes`;
  } else {
    biomeRules += `
- NO default exports (use named exports)`;
  }
  sections.push(biomeRules);
  sections.push(`## Code Style (enforced automatically)

- Indentation: Tabs (2-space width)
- Quotes: Double quotes (\`"\`)
- Semicolons: Always
- Line width: 100 characters
- Trailing commas: Everywhere`);
  if (commitlint) {
    sections.push(`## Commit Format (Conventional Commits)

\`\`\`
<type>(<scope>): <subject>
\`\`\`

Types: \`feat\` | \`fix\` | \`docs\` | \`style\` | \`refactor\` | \`perf\` | \`test\` | \`build\` | \`ci\` | \`chore\``);
  }
  let fileNaming = `## File Naming

- Components: \`PascalCase.tsx\` (e.g., \`UserCard.tsx\`)
- Utilities: \`camelCase.ts\` (e.g., \`formatDate.ts\`)
- Configs: \`kebab-case\` (e.g., \`next.config.ts\`)`;
  if (projectType === "nextjs") {
    fileNaming += `
- Routes: \`page.tsx\`, \`layout.tsx\`, \`route.ts\``;
  }
  sections.push(fileNaming);
  return `${sections.join("\n\n")}
`;
}

// bin/commands/init.ts
async function promptInitOptions(defaults) {
  const options = await p.group(
    {
      projectType: () => p.select({
        message: "Project type?",
        initialValue: defaults.projectType,
        options: [
          {
            value: "nextjs",
            label: "Next.js",
            hint: defaults.projectType === "nextjs" ? "detected" : void 0
          },
          {
            value: "react",
            label: "React",
            hint: defaults.projectType === "react" ? "detected" : void 0
          },
          {
            value: "base",
            label: "Node.js / TypeScript",
            hint: defaults.projectType === "base" ? "detected" : void 0
          }
        ]
      }),
      packageManager: () => p.select({
        message: "Package manager?",
        initialValue: defaults.packageManager,
        options: [
          {
            value: "bun",
            label: "Bun",
            hint: defaults.packageManager === "bun" ? "detected" : "recommended"
          },
          {
            value: "pnpm",
            label: "pnpm",
            hint: defaults.packageManager === "pnpm" ? "detected" : void 0
          },
          {
            value: "yarn",
            label: "Yarn",
            hint: defaults.packageManager === "yarn" ? "detected" : void 0
          },
          {
            value: "npm",
            label: "npm",
            hint: defaults.packageManager === "npm" ? "detected" : void 0
          }
        ]
      }),
      commitlint: () => p.confirm({
        message: "Enable Conventional Commits (commitlint)?",
        initialValue: true
      }),
      husky: () => p.confirm({
        message: "Set up git hooks (Husky + lint-staged)?",
        initialValue: true
      }),
      vscode: () => p.confirm({
        message: "Add VS Code configuration?",
        initialValue: true
      }),
      knip: () => p.confirm({
        message: "Add Knip (dead code detection)?",
        initialValue: true
      }),
      claudeMd: () => p.confirm({
        message: "Create CLAUDE.md (instructions for Claude Code)?",
        initialValue: true
      })
    },
    {
      onCancel: () => {
        p.cancel("Cancelled.");
        process.exit(0);
      }
    }
  );
  return options;
}
function executeInit(options) {
  const {
    cwd,
    packageManager,
    projectType,
    commitlint,
    husky,
    vscode,
    knip,
    claudeMd,
    force,
    dryRun
  } = options;
  const pmCommands = getPackageManagerCommands(packageManager);
  const tasks = [];
  const biomePath = join3(cwd, "biome.json");
  if (!fileExists(biomePath) || force) {
    if (!dryRun) {
      writeJsonFile(biomePath, generateBiomeConfig());
    }
    tasks.push("biome.json");
  }
  const tsconfigPath = join3(cwd, "tsconfig.json");
  if (!fileExists(tsconfigPath) || force) {
    if (!dryRun) {
      writeJsonFile(tsconfigPath, generateTsConfig(projectType));
    }
    tasks.push("tsconfig.json");
  }
  if (projectType === "nextjs" || projectType === "react") {
    const typesDir = join3(cwd, "src", "types");
    const cssDeclarationPath = join3(typesDir, "css.d.ts");
    if (!fileExists(cssDeclarationPath) || force) {
      if (!dryRun) {
        if (!existsSync3(typesDir)) {
          mkdirSync2(typesDir, { recursive: true });
        }
        writeFile(cssDeclarationPath, 'declare module "*.css";\n');
      }
      tasks.push("src/types/css.d.ts");
    }
  }
  if (vscode) {
    const vscodeDir = join3(cwd, ".vscode");
    if (!(dryRun || existsSync3(vscodeDir))) {
      mkdirSync2(vscodeDir, { recursive: true });
    }
    const settingsPath = join3(vscodeDir, "settings.json");
    if (!fileExists(settingsPath) || force) {
      if (!dryRun) {
        writeJsonFile(settingsPath, getVscodeSettings());
      }
      tasks.push(".vscode/settings.json");
    }
    const extensionsPath = join3(vscodeDir, "extensions.json");
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
    let lintStagedAdded = false;
    if (husky && !packageJson["lint-staged"]) {
      packageJson["lint-staged"] = getLintStagedConfig();
      lintStagedAdded = true;
    }
    if ((scriptsAdded > 0 || lintStagedAdded) && !dryRun) {
      writeJsonFile(join3(cwd, "package.json"), packageJson);
    }
    if (scriptsAdded > 0) {
      tasks.push(`package.json (${scriptsAdded} scripts)`);
    }
  }
  {
    const coreDeps = ["@biomejs/biome", "typescript"];
    if (!dryRun) {
      const spinner3 = p.spinner();
      spinner3.start(`Installing core dependencies (${packageManager})...`);
      const [cmd, ...baseArgs] = pmCommands.addDev;
      const result = runCommand(cmd, [...baseArgs, ...coreDeps], cwd);
      if (result.success) {
        spinner3.stop("Core dependencies installed");
      } else {
        spinner3.stop("Installation failed");
        p.log.warn(`Install manually: ${pmCommands.addDev.join(" ")} ${coreDeps.join(" ")}`);
      }
    }
    tasks.push(`dependencies: ${coreDeps.join(", ")}`);
  }
  if (husky) {
    const deps = ["husky", "lint-staged"];
    if (commitlint) {
      deps.push("@commitlint/cli", "@commitlint/config-conventional");
    }
    if (!dryRun) {
      const spinner3 = p.spinner();
      spinner3.start(`Installing hook dependencies (${packageManager})...`);
      const [cmd, ...baseArgs] = pmCommands.addDev;
      const result = runCommand(cmd, [...baseArgs, ...deps], cwd);
      if (result.success) {
        spinner3.stop("Hook dependencies installed");
      } else {
        spinner3.stop("Installation failed");
        p.log.warn(`Install manually: ${pmCommands.addDev.join(" ")} ${deps.join(" ")}`);
      }
    }
    tasks.push(`dependencies: ${deps.join(", ")}`);
    if (!isGitRepository(cwd)) {
      if (!dryRun) {
        runCommand("git", ["init"], cwd);
      }
      tasks.push("git init");
    }
    const huskyDir = join3(cwd, ".husky");
    if (!(dryRun || existsSync3(huskyDir))) {
      mkdirSync2(huskyDir, { recursive: true });
    }
    const preCommitPath = join3(huskyDir, "pre-commit");
    if (!fileExists(preCommitPath) || force) {
      if (!dryRun) {
        writeFile(preCommitPath, generatePreCommitHook(pmCommands.exec, pmCommands.run), true);
      }
      tasks.push(".husky/pre-commit");
    }
    const commitMsgPath = join3(huskyDir, "commit-msg");
    if (!fileExists(commitMsgPath) || force) {
      if (!dryRun) {
        writeFile(commitMsgPath, generateCommitMsgHook(commitlint, pmCommands.exec), true);
      }
      tasks.push(".husky/commit-msg");
    }
    if (!dryRun) {
      const parts = pmCommands.exec.split(" ");
      const execCmd = parts[0] ?? "npx";
      const execArgs = parts.slice(1);
      runCommand(execCmd, [...execArgs, "husky"], cwd);
    }
  }
  if (commitlint) {
    const commitlintPath = join3(cwd, "commitlint.config.js");
    if (!fileExists(commitlintPath) || force) {
      if (!dryRun) {
        writeFile(commitlintPath, generateCommitlintConfig());
      }
      tasks.push("commitlint.config.js");
    }
  }
  if (knip) {
    const knipPath = join3(cwd, "knip.json");
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
  const editorconfigPath = join3(cwd, ".editorconfig");
  if (!fileExists(editorconfigPath) || force) {
    if (!dryRun) {
      writeFile(editorconfigPath, generateEditorConfig());
    }
    tasks.push(".editorconfig");
  }
  if (claudeMd) {
    const claudeMdPath = join3(cwd, "CLAUDE.md");
    if (!fileExists(claudeMdPath) || force) {
      if (!dryRun) {
        writeFile(
          claudeMdPath,
          generateClaudeMd({
            projectType,
            commitlint,
            knip,
            packageManager
          })
        );
      }
      tasks.push("CLAUDE.md");
    }
  }
  return tasks;
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
    "claude-md": {
      type: "boolean",
      description: "Create CLAUDE.md for Claude Code instructions",
      default: void 0
    },
    "skip-claude-md": {
      type: "boolean",
      description: "Skip CLAUDE.md creation",
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
    const detectedPM = detectPackageManager(cwd);
    const detectedType = detectProjectType(cwd);
    p.intro(`${pc.cyan(pc.bold(PACKAGE_NAME))} ${pc.dim(`v${VERSION}`)}`);
    if (args2["dry-run"]) {
      p.log.warn(pc.yellow("Dry-run mode: no files will be modified"));
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
        claudeMd: args2["claude-md"] ?? !args2["skip-claude-md"],
        force: args2.force,
        dryRun: args2["dry-run"]
      };
      p.log.info(`Project: ${pc.cyan(options.projectType)}`);
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
    spinner3.start("Configuring...");
    const tasks = executeInit(options);
    spinner3.stop("Configuration complete");
    const pmRun = options.packageManager === "npm" ? "npm run" : options.packageManager;
    p.log.success(pc.green(`Setup complete! (${tasks.length} files created/updated)`));
    p.note(
      [
        `${pc.cyan("Available scripts:")}`,
        `  ${pc.dim(pmRun)} check      ${pc.dim("# Lint + Format")}`,
        `  ${pc.dim(pmRun)} check:fix  ${pc.dim("# Auto-fix")}`,
        `  ${pc.dim(pmRun)} typecheck  ${pc.dim("# TypeScript")}`,
        options.knip ? `  ${pc.dim(pmRun)} knip       ${pc.dim("# Dead code")}` : "",
        "",
        options.commitlint ? [
          `${pc.cyan("Commit format:")}`,
          `  ${pc.green("feat")}: new feature`,
          `  ${pc.green("fix")}: bug fix`,
          `  ${pc.green("docs")}: documentation`
        ].join("\n") : `${pc.dim("Tip: Add commitlint with")} quality init --commitlint`,
        "",
        options.claudeMd ? `${pc.cyan("CLAUDE.md created")} ${pc.dim("- Instructions for Claude Code")}` : `${pc.dim("Tip: Add CLAUDE.md with")} quality init --claude-md`
      ].filter(Boolean).join("\n"),
      "Next steps"
    );
    p.outro(`${pc.dim("Documentation:")} ${pc.cyan("https://github.com/NeosiaNexus/quality")}`);
  }
});

// bin/commands/upgrade.ts
import { join as join4 } from "path";
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
  function compare(curr, upd, prefix) {
    const currKeys = new Set(Object.keys(curr));
    const updKeys = new Set(Object.keys(upd));
    for (const key of updKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!currKeys.has(key)) {
        added.push(path);
      } else if (typeof curr[key] === "object" && curr[key] !== null && !Array.isArray(curr[key]) && typeof upd[key] === "object" && upd[key] !== null && !Array.isArray(upd[key])) {
        compare(curr[key], upd[key], path);
      } else if (JSON.stringify(curr[key]) !== JSON.stringify(upd[key])) {
        modified.push(path);
      }
    }
    for (const key of currKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (!updKeys.has(key)) {
        removed.push(path);
      }
    }
  }
  compare(current, updated, "");
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
      p2.log.warn(pc2.yellow("Dry-run mode: no files will be modified"));
    }
    const configs = [
      {
        name: "biome.json",
        path: join4(cwd, "biome.json"),
        currentContent: readJsonFile(join4(cwd, "biome.json")),
        newDefaults: generateBiomeConfig(),
        requiresMerge: true
        // biome.json can be safely merged
      },
      {
        name: "tsconfig.json",
        path: join4(cwd, "tsconfig.json"),
        currentContent: readJsonFile(join4(cwd, "tsconfig.json")),
        newDefaults: generateTsConfig(projectType),
        requiresMerge: true
        // tsconfig.json should preserve user paths/includes
      },
      {
        name: "knip.json",
        path: join4(cwd, "knip.json"),
        currentContent: readJsonFile(join4(cwd, "knip.json")),
        newDefaults: generateKnipConfig(projectType),
        requiresMerge: true
        // knip.json should preserve user ignores
      },
      {
        name: ".vscode/settings.json",
        path: join4(cwd, ".vscode", "settings.json"),
        currentContent: readJsonFile(join4(cwd, ".vscode", "settings.json")),
        newDefaults: getVscodeSettings(),
        requiresMerge: true
        // VSCode settings should be merged
      },
      {
        name: ".vscode/extensions.json",
        path: join4(cwd, ".vscode", "extensions.json"),
        currentContent: readJsonFile(join4(cwd, ".vscode", "extensions.json")),
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
      p2.log.success("All configurations are up to date!");
      p2.outro(pc2.dim("Nothing to do."));
      return;
    }
    p2.log.info(pc2.cyan("Files to update:"));
    for (const { config, changes, isNew } of toUpgrade) {
      if (isNew) {
        p2.log.step(`  ${pc2.green("+")} ${config.name} ${pc2.dim("(new)")}`);
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
        message: args2["no-backup"] ? "Continue without backup?" : "Continue? (files will be backed up)",
        initialValue: true
      });
      if (!shouldContinue || p2.isCancel(shouldContinue)) {
        p2.cancel("Cancelled.");
        process.exit(0);
      }
    }
    const spinner3 = p2.spinner();
    spinner3.start("Updating configurations...");
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
        createBackup(join4(cwd, "package.json"));
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
        writeJsonFile(join4(cwd, "package.json"), packageJson);
      }
      results.push({ name: "package.json", backupPath: null });
    }
    spinner3.stop("Update complete");
    p2.log.success(pc2.green(`${results.length} file(s) updated`));
    const backups = results.filter((r) => r.backupPath);
    if (backups.length > 0) {
      p2.note(backups.map((b) => `${pc2.dim(b.backupPath)}`).join("\n"), "Backups created");
    }
    if (args2["dry-run"]) {
      p2.note("Run without --dry-run to apply changes", "Dry-run mode");
    }
    p2.outro(pc2.green("Configuration updated!"));
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
