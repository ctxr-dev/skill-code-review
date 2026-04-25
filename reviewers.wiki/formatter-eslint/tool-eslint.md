---
id: tool-eslint
type: primary
depth_role: leaf
focus: Detect misconfigured, suppressed, or under-utilized ESLint setups -- unjustified disables, missing recommended presets, flat config migration issues, and conflicting rule definitions
parents:
  - index.md
covers:
  - eslint-disable comments without a rule name or justification
  - eslint-disable for an entire file without architectural rationale
  - "Conflicting rules between multiple ESLint config files (root vs nested)"
  - "Missing recommended or strict presets for the project's framework"
  - Custom rules without corresponding unit tests
  - "Flat config (eslint.config.js) migration issues and legacy .eslintrc co-existence"
  - Auto-fixable rules not adopted despite being available
  - "Overrides block too broad (targeting **/* instead of specific paths)"
  - Plugin version mismatches causing rule resolution failures
  - Ignoring TypeScript-specific rules when project uses TypeScript
  - eslint-disable-next-line suppressing multiple rules on one line
  - Missing eslint-plugin-import or eslint-plugin-unused-imports
tags:
  - eslint
  - linter
  - javascript
  - typescript
  - lint-suppression
  - flat-config
  - code-quality
activation:
  file_globs:
    - "**/.eslintrc*"
    - "**/eslint.config.*"
    - "**/.eslintignore"
    - "**/package.json"
  keyword_matches:
    - eslint-disable
    - eslint-enable
    - eslint-disable-next-line
    - eslint-disable-line
    - "@typescript-eslint"
    - eslint-plugin
  structural_signals:
    - eslint config file present
    - inline eslint suppression annotation
source:
  origin: file
  path: tool-eslint.md
  hash: "sha256:99e6999f14df5ff91871004c40aef917082488902380c300ced54db598da0241"
---
# ESLint Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains ESLint configuration files (.eslintrc.*, eslint.config.js/mjs/cjs), when eslint-disable annotations appear in the diff, or when ESLint-related packages are present in package.json. Focuses on whether ESLint is configured effectively and whether suppressions are justified -- not on individual lint violations (which the tool itself catches).

## Audit Surface

- [ ] eslint-disable or eslint-disable-next-line without a named rule
- [ ] eslint-disable without an adjacent comment explaining why the rule does not apply
- [ ] eslint-disable for an entire file -- verify architectural necessity
- [ ] Conflicting rule severity between root config and nested override
- [ ] Project uses TypeScript but @typescript-eslint/recommended is absent
- [ ] Project uses React/Vue/Angular but framework ESLint plugin is missing
- [ ] Custom ESLint rule exists without a test file
- [ ] Legacy .eslintrc.* coexists with eslint.config.js (flat config) -- only one should be active
- [ ] Auto-fixable rule violations present that eslint --fix would resolve
- [ ] Overrides glob pattern matches too many files
- [ ] eslint-disable-next-line suppresses 3+ rules -- the line likely needs refactoring
- [ ] Rule turned off in config that is recommended by the preset (weakening defaults)
- [ ] Plugin listed in config but not in package.json dependencies
- [ ] ESLint config extends deprecated or unmaintained shareable config
- [ ] env or globals block includes unnecessary entries

## Detailed Checks

### Blanket and Unjustified Suppressions
<!-- activation: keywords=["eslint-disable", "eslint-disable-next-line", "eslint-disable-line"] -->

- [ ] Flag `/* eslint-disable */` without a rule name -- this suppresses all rules and is almost never justified
- [ ] Flag `// eslint-disable-next-line` without a rule name -- same problem at line level
- [ ] Flag any eslint-disable with a rule name but no adjacent comment explaining the exception -- the rule name alone does not constitute justification
- [ ] Flag eslint-disable blocks that span more than 10 lines -- long suppression blocks suggest the code should be restructured or the rule reconsidered at config level
- [ ] Flag eslint-disable-next-line suppressing 3 or more rules on one line -- the line is doing too much or is fundamentally incompatible with the config
- [ ] Count new eslint-disable annotations in the PR -- more than 3 new suppressions warrant discussion

### Config File Consistency and Presets
<!-- activation: file_globs=["**/.eslintrc*", "**/eslint.config.*"] -->

- [ ] Verify the config extends a recommended preset (eslint:recommended, plugin:@typescript-eslint/recommended, plugin:react/recommended) -- projects without a base preset miss critical rules
- [ ] Check for rules set to "off" that are part of the extended recommended preset -- turning off recommended rules weakens the safety net and needs justification
- [ ] Check for conflicting rule configurations between the root config and overrides or nested configs -- a rule set to "error" at root but "off" in an override deserves a comment
- [ ] Verify that all plugins referenced in the config are listed in package.json devDependencies
- [ ] Check that the config does not extend deprecated shareable configs (e.g., eslint-config-airbnb for projects that have moved to flat config)

### Flat Config Migration
<!-- activation: file_globs=["**/eslint.config.*", "**/.eslintrc*"] -->

- [ ] If both .eslintrc.*and eslint.config.* exist, flag the co-existence -- ESLint 9+ uses flat config exclusively and ignores .eslintrc if eslint.config exists
- [ ] If the project uses ESLint 9+ (check package.json) but still has .eslintrc.*, flag the stale legacy config
- [ ] In flat config, verify that languageOptions.globals replaces the old env block -- missing globals cause false "no-undef" positives
- [ ] Verify that flat config uses the new plugin format (imported objects) rather than string-based plugin names

### Framework and TypeScript Integration
<!-- activation: keywords=["@typescript-eslint", "eslint-plugin-react", "eslint-plugin-vue", "eslint-plugin-angular"] -->

- [ ] If tsconfig.json exists but @typescript-eslint is not in the ESLint config, flag the gap -- JS-only rules miss type-aware checks
- [ ] If React is in dependencies but eslint-plugin-react and eslint-plugin-react-hooks are absent, flag the missing plugins
- [ ] If parser is set to @typescript-eslint/parser, verify that parserOptions.project points to the correct tsconfig -- wrong project path silently disables type-aware rules
- [ ] Check that type-aware rules (e.g., @typescript-eslint/no-floating-promises, @typescript-eslint/no-misused-promises) are enabled when parserOptions.project is set

## Common False Positives

- **Generated files**: Files produced by code generators (protobuf, GraphQL codegen) often have a file-level eslint-disable that is correct and intentional -- check .eslintignore or the generated file header.
- **Test files with intentional violations**: Test files for the linter itself or for custom rules intentionally contain lint violations -- they should be in an overrides block with relaxed rules.
- **Migration PRs**: Large PRs migrating from .eslintrc to flat config may temporarily have both files. Verify the migration is in progress, not abandoned.
- **Monorepo nested configs**: Monorepos legitimately have nested ESLint configs with different rules per package. Conflicting rules between packages are expected.
- **eslint-disable for external API shapes**: Code that must match an external API shape (e.g., naming-convention violations for a third-party callback) may need a justified suppression.

## Severity Guidance

| Finding | Severity |
|---|---|
| eslint-disable without any rule name (blanket suppression) | Important |
| Recommended preset absent -- no base safety net | Important |
| Legacy .eslintrc coexists with flat config in ESLint 9+ | Important |
| Plugin in config but missing from package.json | Important |
| eslint-disable with rule name but no justification comment | Minor |
| Auto-fixable violations present in changed files | Minor |
| Rule turned off that is part of recommended preset | Minor |
| Framework plugin missing (react-hooks, vue, angular) | Minor |
| Overrides glob pattern overly broad | Minor |

## See Also

- `style-guide-supremacy` -- ESLint is a style authority; this reviewer checks its configuration health while style-guide-supremacy enforces its output
- `author-self-review-hygiene` -- bare eslint-disable without justification is a hygiene issue caught by both reviewers
- `principle-fail-fast` -- disabling lint rules defers error detection; fail-fast demands they be addressed immediately
- `tool-prettier-black-gofmt-rustfmt` -- formatting rules should be handled by Prettier, not ESLint; conflicting formatting rules are caught there
- `tool-tsc-flow` -- TypeScript type checking complements ESLint's type-aware rules

## Authoritative References

- [ESLint: Configuring ESLint](https://eslint.org/docs/latest/use/configure/)
- [ESLint: Migration to Flat Config](https://eslint.org/docs/latest/use/configure/migration-guide)
- [typescript-eslint: Getting Started](https://typescript-eslint.io/getting-started/)
- [eslint-plugin-react: Configuration](https://github.com/jsx-eslint/eslint-plugin-react#configuration)
