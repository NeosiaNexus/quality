/** @type {import('@commitlint/types').UserConfig} */
export default {
	extends: ["@commitlint/config-conventional"],
	rules: {
		// Type must be one of the following
		"type-enum": [
			2,
			"always",
			[
				"feat", // New feature
				"fix", // Bug fix
				"docs", // Documentation only
				"style", // Code style (formatting, semicolons, etc.)
				"refactor", // Code refactoring (no feature/fix)
				"perf", // Performance improvement
				"test", // Adding or updating tests
				"build", // Build system or dependencies
				"ci", // CI/CD configuration
				"chore", // Other changes (maintenance)
				"revert", // Revert a previous commit
				"wip", // Work in progress (optional)
			],
		],
		// Type must be lowercase
		"type-case": [2, "always", "lower-case"],
		// Type cannot be empty
		"type-empty": [2, "never"],
		// Subject cannot be empty
		"subject-empty": [2, "never"],
		// Subject must not end with a period
		"subject-full-stop": [2, "never", "."],
		// Subject max length
		"subject-max-length": [2, "always", 72],
		// Header max length
		"header-max-length": [2, "always", 100],
		// Body max line length
		"body-max-line-length": [2, "always", 100],
		// Footer max line length
		"footer-max-line-length": [2, "always", 100],
	},
	prompt: {
		questions: {
			type: {
				description: "Select the type of change you're committing",
				enum: {
					feat: {
						description: "A new feature",
						title: "Features",
						emoji: "✨",
					},
					fix: {
						description: "A bug fix",
						title: "Bug Fixes",
						emoji: "🐛",
					},
					docs: {
						description: "Documentation only changes",
						title: "Documentation",
						emoji: "📚",
					},
					style: {
						description: "Changes that do not affect the meaning of the code",
						title: "Styles",
						emoji: "💎",
					},
					refactor: {
						description: "A code change that neither fixes a bug nor adds a feature",
						title: "Code Refactoring",
						emoji: "📦",
					},
					perf: {
						description: "A code change that improves performance",
						title: "Performance Improvements",
						emoji: "🚀",
					},
					test: {
						description: "Adding missing tests or correcting existing tests",
						title: "Tests",
						emoji: "🚨",
					},
					build: {
						description: "Changes that affect the build system or dependencies",
						title: "Builds",
						emoji: "🛠",
					},
					ci: {
						description: "Changes to CI configuration files and scripts",
						title: "Continuous Integrations",
						emoji: "⚙️",
					},
					chore: {
						description: "Other changes that don't modify src or test files",
						title: "Chores",
						emoji: "♻️",
					},
					revert: {
						description: "Reverts a previous commit",
						title: "Reverts",
						emoji: "🗑",
					},
				},
			},
			scope: {
				description: "What is the scope of this change (e.g. component or file name)",
			},
			subject: {
				description: "Write a short, imperative tense description of the change",
			},
			body: {
				description: "Provide a longer description of the change",
			},
			isBreaking: {
				description: "Are there any breaking changes?",
			},
			breakingBody: {
				description:
					"A BREAKING CHANGE commit requires a body. Please provide a longer description",
			},
			breaking: {
				description: "Describe the breaking changes",
			},
			isIssueAffected: {
				description: "Does this change affect any open issues?",
			},
			issuesBody: {
				description:
					"If issues are closed, the commit requires a body. Please provide a longer description",
			},
			issues: {
				description: 'Add issue references (e.g. "fix #123", "re #123".)',
			},
		},
	},
};
