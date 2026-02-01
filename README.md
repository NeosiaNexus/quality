# @neosianexus/quality

[![npm version](https://img.shields.io/npm/v/@neosianexus/quality.svg)](https://www.npmjs.com/package/@neosianexus/quality)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

> Ultra-strict Biome + TypeScript + Husky + Commitlint configuration for React/Next.js projects

A comprehensive, enterprise-grade configuration package that provides **ultra-strict code quality standards** for TypeScript/JavaScript projects. Zero-config setup with an interactive CLI.

## Features

- **Ultra-strict Biome configuration** - 100+ linting rules with maximum strictness
- **TypeScript strict mode** - All strict flags enabled including `noUncheckedIndexedAccess`
- **Conventional Commits** - Commitlint integration with automatic validation
- **Git hooks** - Husky + lint-staged for pre-commit checks
- **Dead code detection** - Knip integration to find unused exports
- **VS Code configuration** - Optimized settings and recommended extensions
- **AI assistant ready** - CLAUDE.md generation for Claude Code integration
- **Multi-project support** - Next.js, React, and Node.js/TypeScript configurations
- **Package manager agnostic** - Works with npm, yarn, pnpm, and bun

## Installation

### Prerequisites

- Node.js >= 18.0.0
- Git (for Husky hooks)

### Quick Install

```bash
# Run directly with npx (recommended)
npx @neosianexus/quality

# Or install as a dev dependency
npm install --save-dev @neosianexus/quality
```

### Peer Dependencies

These are required and will be installed automatically:

```bash
npm install --save-dev @biomejs/biome typescript
```

## Quick Start

### Interactive Setup (Recommended)

```bash
npx @neosianexus/quality
```

The CLI will guide you through:

1. **Project type detection** - Automatically detects Next.js, React, or Node.js
2. **Package manager detection** - Detects bun, pnpm, yarn, or npm
3. **Feature selection** - Choose which tools to enable:
   - Conventional Commits (commitlint)
   - Git hooks (Husky + lint-staged)
   - VS Code configuration
   - Dead code detection (Knip)
   - CLAUDE.md for AI assistants

### Non-Interactive Setup

```bash
# Use all detected defaults
npx @neosianexus/quality init --yes

# Preview changes without writing
npx @neosianexus/quality init --dry-run
```

## CLI Commands

The CLI provides two main commands: `init` for initial setup and `upgrade` for updating existing configurations.

### Running the CLI

```bash
# Method 1: Run directly with npx (no installation required)
npx @neosianexus/quality

# Method 2: Run after installing the package
npx quality

# Method 3: If installed globally
quality
```

> **Note**: Running `quality` without any subcommand automatically executes the `init` command.

---

### `quality init`

Initialize quality configuration in your project. This is the main command for setting up code quality tools.

```bash
quality init [options]
```

#### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--yes` | `-y` | Skip all prompts and use detected defaults |
| `--force` | `-f` | Overwrite existing configuration files |
| `--commitlint` | `-c` | Enable Conventional Commits validation |
| `--skip-husky` | | Skip Husky and lint-staged setup |
| `--skip-vscode` | | Skip VS Code configuration |
| `--knip` | `-k` | Enable Knip for dead code detection |
| `--claude-md` | | Generate CLAUDE.md for AI assistants |
| `--skip-claude-md` | | Skip CLAUDE.md generation |
| `--dry-run` | `-d` | Preview changes without writing files |

#### Interactive Flow

When you run `quality init` without flags, you'll see an interactive wizard:

```
┌  @neosianexus/quality v1.0.0
│
◇  Type de projet ?
│  ● Next.js (détecté)
│  ○ React
│  ○ Node.js / TypeScript
│
◇  Gestionnaire de paquets ?
│  ● bun (détecté)
│  ○ pnpm
│  ○ yarn
│  ○ npm
│
◇  Activer Conventional Commits (commitlint) ?
│  ● Oui / ○ Non
│
◇  Configurer les hooks Git (Husky + lint-staged) ?
│  ● Oui / ○ Non
│
◇  Ajouter la configuration VS Code ?
│  ● Oui / ○ Non
│
◇  Ajouter Knip pour la détection du code mort ?
│  ● Oui / ○ Non
│
◇  Générer CLAUDE.md pour l'assistant IA ?
│  ● Oui / ○ Non
│
◆  Configuration en cours...
```

#### Usage Examples

```bash
# Interactive setup (recommended for first-time users)
npx @neosianexus/quality

# Quick setup with all defaults (CI/CD friendly)
npx @neosianexus/quality init --yes

# Setup with specific features
npx @neosianexus/quality init --commitlint --knip --claude-md

# Setup without git hooks (useful for monorepos)
npx @neosianexus/quality init --skip-husky

# Preview what would be created
npx @neosianexus/quality init --dry-run

# Force overwrite existing configs
npx @neosianexus/quality init --force

# Minimal setup: just Biome + TypeScript
npx @neosianexus/quality init --yes --skip-husky --skip-vscode
```

#### What Happens During Init

1. **Detection Phase**
   - Reads `package.json` to detect project type (Next.js, React, or Node.js)
   - Checks for lock files to detect package manager
   - Verifies if Git is initialized

2. **Configuration Generation**
   - Creates `biome.json` extending the strict preset
   - Creates `tsconfig.json` with path aliases (`@/*` → `src/*`)
   - Optionally creates commitlint, Knip, VS Code configs

3. **Dependency Installation**
   - Installs required peer dependencies (`@biomejs/biome`, `typescript`)
   - Installs optional dependencies based on selections (husky, lint-staged, commitlint, knip)

4. **Git Hooks Setup** (if not skipped)
   - Initializes Husky
   - Creates `pre-commit` hook running lint-staged
   - Creates `commit-msg` hook running commitlint (if enabled)

5. **Package.json Updates**
   - Adds quality scripts (`check`, `lint`, `format`, `typecheck`)
   - Adds lint-staged configuration
   - Adds `prepare` script for Husky

---

### `quality upgrade`

Upgrade existing configuration to the latest version with intelligent merging.

```bash
quality upgrade [options]
```

#### Options

| Option | Short | Description |
|--------|-------|-------------|
| `--yes` | `-y` | Skip confirmation prompts |
| `--force` | `-f` | Replace configs entirely instead of merging |
| `--no-backup` | | Don't create backup files before modifying |
| `--dry-run` | `-d` | Preview changes without writing files |

#### How Smart Merge Works

The upgrade command uses intelligent merging to preserve your customizations:

```
Your Config          +    New Defaults         =    Merged Result
─────────────────────────────────────────────────────────────────
{                         {                         {
  "rules": {                "rules": {                "rules": {
    "myRule": "off"  ←──    "newRule": "error"        "myRule": "off",    ← preserved
  }                         "myRule": "error"          "newRule": "error"  ← added
}                         }                         }
                                                   }
```

- **Your custom rules are preserved** - If you disabled a rule, it stays disabled
- **New rules are added** - Latest recommended rules are merged in
- **Arrays are replaced, not concatenated** - Avoids duplicate entries

#### Usage Examples

```bash
# Interactive upgrade with confirmation
npx @neosianexus/quality upgrade

# Automatic upgrade (CI/CD friendly)
npx @neosianexus/quality upgrade --yes

# Preview changes before applying
npx @neosianexus/quality upgrade --dry-run

# Full replacement (discard customizations)
npx @neosianexus/quality upgrade --force

# Upgrade without creating backups
npx @neosianexus/quality upgrade --yes --no-backup
```

#### Upgrade Output Example

```
┌  @neosianexus/quality upgrade
│
◇  Analyse des fichiers de configuration...
│
│  biome.json
│    + linter.rules.nursery.noSecrets: "error"
│    + linter.rules.nursery.useImportRestrictions: "error"
│    ~ formatter.lineWidth: 80 → 100
│
│  tsconfig.json
│    + compilerOptions.noUncheckedSideEffectImports: true
│
◇  Appliquer ces modifications ?
│  ● Oui / ○ Non
│
◆  Sauvegarde créée: biome.backup.2026-02-01T14-30-45.json
◆  Configuration mise à jour avec succès !
```

---

### CLI Architecture

The CLI is built with the [citty](https://github.com/unjs/citty) framework and follows this structure:

```
quality [command] [options]
    │
    ├── (no command) → runs "init" by default
    │
    ├── init
    │   ├── Interactive prompts (via @clack/prompts)
    │   ├── Project detection
    │   ├── Config generation
    │   ├── Dependency installation
    │   └── Git hooks setup
    │
    └── upgrade
        ├── Config analysis
        ├── Smart merge (via deepmerge)
        ├── Backup creation
        └── File updates
```

## What Gets Created

### Configuration Files

| File | Description |
|------|-------------|
| `biome.json` | Ultra-strict linting and formatting rules |
| `tsconfig.json` | TypeScript configuration with path aliases |
| `commitlint.config.js` | Conventional Commits validation (optional) |
| `.vscode/settings.json` | VS Code editor settings (optional) |
| `.vscode/extensions.json` | Recommended extensions (optional) |
| `knip.json` | Dead code detection config (optional) |
| `.husky/pre-commit` | Git pre-commit hook |
| `.husky/commit-msg` | Git commit message hook (optional) |
| `CLAUDE.md` | AI assistant instructions (optional) |
| `src/types/css.d.ts` | CSS module type declarations (React/Next.js) |

### Package.json Updates

The following scripts are added to your `package.json`:

```json
{
  "scripts": {
    "check": "biome check .",
    "check:fix": "biome check --write --unsafe .",
    "lint": "biome lint .",
    "lint:fix": "biome lint --write --unsafe .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "knip": "knip",
    "prepare": "husky"
  }
}
```

## Project Types

The CLI auto-detects your project type and applies the appropriate configuration:

### Next.js

- TypeScript: Extends `@neosianexus/quality/tsconfig.nextjs`
- Biome: Allows default exports for pages/routes
- Knip: Configured for App Router entry points

### React

- TypeScript: Extends `@neosianexus/quality/tsconfig.react`
- Biome: Named exports only (no default exports)
- Knip: Configured for typical React entry points

### Node.js / TypeScript

- TypeScript: Extends `@neosianexus/quality/tsconfig.base`
- Biome: Full strictness, no default exports
- Knip: Minimal configuration

## Package Managers

Auto-detected from lock files in this priority order:

| Package Manager | Lock File |
|----------------|-----------|
| bun | `bun.lockb` or `bun.lock` |
| pnpm | `pnpm-lock.yaml` |
| yarn | `yarn.lock` |
| npm | `package-lock.json` |

## Extending Configurations

You can import and extend the provided configurations directly:

### Biome

```json
{
  "extends": ["@neosianexus/quality"]
}
```

### TypeScript

```json
{
  "extends": "@neosianexus/quality/tsconfig.base"
}
```

Available TypeScript configurations:
- `@neosianexus/quality/tsconfig.base` - Base strict configuration
- `@neosianexus/quality/tsconfig.react` - React with JSX support
- `@neosianexus/quality/tsconfig.nextjs` - Next.js optimized

### Commitlint

```javascript
// commitlint.config.js
import config from "@neosianexus/quality/commitlint";
export default config;
```

### Knip

```json
{
  "extends": ["@neosianexus/quality/knip"]
}
```

## Configuration Details

### Biome Rules

The Biome configuration includes 100+ rules with maximum strictness:

- **Formatting**: Tabs (2-space width), double quotes, semicolons always, 100-char line width
- **Accessibility**: All a11y rules set to `error`
- **Complexity**: Max cognitive complexity of 15
- **Security**: All security rules enabled
- **Import organization**: Auto-sorted imports enabled

### TypeScript Strict Mode

All strict flags are enabled:

```json
{
  "strict": true,
  "noImplicitAny": true,
  "exactOptionalPropertyTypes": true,
  "noUncheckedIndexedAccess": true,
  "noImplicitReturns": true,
  "verbatimModuleSyntax": true
}
```

### Conventional Commits

When enabled, commit messages must follow this format:

```
type(scope): description

[optional body]

[optional footer]
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

## Development

### Setup

```bash
git clone https://github.com/neosianexus/quality.git
cd quality
bun install
```

### Scripts

| Script | Description |
|--------|-------------|
| `bun run build` | Build the CLI |
| `bun run validate` | Run lint + typecheck + knip |
| `bun run check` | Lint and format check |
| `bun run check:fix` | Auto-fix lint/format issues |
| `bun run typecheck` | TypeScript type checking |
| `bun run knip` | Find unused code |
| `bun run dev` | Run CLI directly from TypeScript |

### Architecture

```
quality/
├── bin/
│   ├── cli.ts              # CLI entry point (citty framework)
│   ├── commands/
│   │   ├── init.ts         # Init command implementation
│   │   └── upgrade.ts      # Upgrade command implementation
│   └── utils/
│       ├── constants.ts    # Package metadata and types
│       ├── detect.ts       # Project/PM detection logic
│       ├── exec.ts         # Shell command execution
│       ├── fs.ts           # File system utilities
│       └── generators.ts   # Config file generators
├── vscode/                 # VS Code configuration templates
├── biome.json              # Exported Biome config
├── tsconfig.*.json         # Exported TypeScript configs
├── commitlint.config.js    # Exported Commitlint config
└── knip.config.json        # Exported Knip config
```

## Troubleshooting

### Common Issues

**Biome not found**

```bash
npm install --save-dev @biomejs/biome
```

**TypeScript not found**

```bash
npm install --save-dev typescript
```

**Husky hooks not running**

```bash
npx husky install
```

**Permission denied on hooks**

```bash
chmod +x .husky/pre-commit .husky/commit-msg
```

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the `main` branch.

1. Fork the repository
2. Create your feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feat/amazing-feature`)
5. Open a Pull Request

## Support

- [GitHub Issues](https://github.com/neosianexus/quality/issues) - Bug reports and feature requests
- [GitHub Sponsors](https://github.com/sponsors/neosianexus) - Support the project

## License

[MIT](LICENSE) - Made with care by [neosianexus](https://github.com/neosianexus)
