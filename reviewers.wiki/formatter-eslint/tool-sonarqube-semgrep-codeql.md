---
id: tool-sonarqube-semgrep-codeql
type: primary
depth_role: leaf
focus: Detect misconfigured or under-utilized SAST tools -- SonarQube quality gates bypassed, Semgrep rules not in CI, CodeQL queries missing for critical paths, untriaged false positives, and custom rules without tests
parents:
  - index.md
covers:
  - SonarQube quality gate bypassed or set to permissive thresholds
  - Semgrep rules present in repo but not enforced in CI
  - "CodeQL queries missing for critical security paths (auth, crypto, input handling)"
  - SAST false positives not triaged or suppressed without justification
  - Custom Semgrep or CodeQL rules without test cases
  - SonarQube exclusions covering production source directories
  - "@SuppressWarnings for SAST findings without justification"
  - nosemgrep or nosec comments without explanation
  - SAST tool version pinned to an outdated release missing recent rules
  - Multiple SAST tools with overlapping but inconsistent findings
tags:
  - sonarqube
  - semgrep
  - codeql
  - sast
  - security
  - quality-gate
  - static-analysis
  - custom-rules
activation:
  file_globs:
    - "**/sonar-project.properties"
    - "**/.semgrep.yml"
    - "**/.semgrep/**"
    - "**/.github/codeql/**"
    - "**/codeql-config.yml"
    - "**/.github/workflows/codeql*.yml"
  keyword_matches:
    - nosemgrep
    - nosec
    - sonar
    - semgrep
    - codeql
    - quality gate
    - SuppressWarnings
    - NOSONAR
  structural_signals:
    - SAST config file present
    - inline SAST suppression annotation
    - CI workflow references SAST tool
source:
  origin: file
  path: tool-sonarqube-semgrep-codeql.md
  hash: "sha256:72ee08d29244e14f5bbcdfc9ee3a6721908a8fdd04894fa8c602d1c3f7dad70d"
---
# SonarQube / Semgrep / CodeQL Configuration and Suppression Hygiene

## When This Activates

Activates when the repository contains SAST tool configuration (sonar-project.properties, .semgrep.yml, CodeQL config/workflow files), when SAST suppression annotations appear in the diff (nosemgrep, nosec, NOSONAR), or when CI workflows reference these tools. Focuses on whether SAST tools are effectively integrated and whether findings are triaged responsibly.

## Audit Surface

- [ ] SonarQube quality gate condition set to permissive thresholds
- [ ] SonarQube sonar.exclusions covers production source paths
- [ ] Semgrep rules exist but CI does not run semgrep
- [ ] CodeQL config exists but is not in CI workflow
- [ ] nosemgrep comment without justification
- [ ] nosec or @SuppressWarnings(security) without justification
- [ ] Custom Semgrep rule without a test YAML
- [ ] Custom CodeQL query without a test directory
- [ ] SAST tool pinned to an outdated version
- [ ] SonarQube issue ignore patterns overly broad
- [ ] CodeQL using only default queries without project-specific additions
- [ ] SAST findings marked as wontfix without documented reason
- [ ] Multiple SAST tools with unreconciled overlapping findings
- [ ] Security hotspots marked safe without review evidence

## Detailed Checks

### SAST Suppression Discipline
<!-- activation: keywords=["nosemgrep", "nosec", "NOSONAR", "SuppressWarnings", "@SuppressWarnings"] -->

- [ ] Flag `// nosemgrep` or `# nosemgrep` without a justification comment -- Semgrep suppressions should explain why the finding is a false positive
- [ ] Flag `# nosec` (Bandit/GoSec) without specifying the rule ID and explaining the exception
- [ ] Flag `// NOSONAR` without a SonarQube issue key or justification -- NOSONAR suppresses all rules on the line
- [ ] Flag `@SuppressWarnings` for security-related warnings without a detailed comment explaining why the code is safe
- [ ] Count new SAST suppressions in the PR -- security suppressions warrant individual review
- [ ] Flag suppressions that reference a ticket but the ticket is closed without resolution

### SonarQube Quality Gate and Exclusions
<!-- activation: file_globs=["**/sonar-project.properties", "**/.sonarcloud.properties"] -->

- [ ] Verify the quality gate is not bypassed -- check for conditions weakened below industry standards (e.g., coverage gate < 60%, reliability rating > A)
- [ ] Flag sonar.exclusions patterns that cover production source directories -- exclusions should target generated code, vendor directories, and test fixtures only
- [ ] Flag sonar.issue.ignore.multicriteria entries that suppress entire rule categories rather than specific rules on specific files
- [ ] Check that sonar.sources and sonar.tests correctly partition the codebase -- misclassification leads to wrong coverage calculations
- [ ] Verify that security hotspots are reviewed (not auto-marked as safe) -- hotspots require human judgment

### Semgrep Rule Enforcement
<!-- activation: file_globs=["**/.semgrep.yml", "**/.semgrep/**", "**/.github/workflows/*"] -->

- [ ] If .semgrep.yml or a rules/ directory exists, verify Semgrep runs in CI -- rules that do not run are documentation, not enforcement
- [ ] For custom Semgrep rules, verify each rule file has a corresponding test YAML file (with test annotations: `ruleid:` and `ok:` markers)
- [ ] Check that Semgrep rules target the project's critical paths: authentication, authorization, input validation, cryptography, database queries
- [ ] Verify Semgrep is not limited to only the `p/default` ruleset when the project has language-specific rulesets available (p/python, p/javascript, p/golang)
- [ ] Flag Semgrep rules with overly broad patterns that produce high false-positive rates -- rules should be precise

### CodeQL Query Coverage
<!-- activation: file_globs=["**/.github/codeql/**", "**/codeql-config.yml", "**/.github/workflows/codeql*"] -->

- [ ] Verify CodeQL is configured in the CI workflow -- a codeql-config.yml without a workflow is inert
- [ ] Check that CodeQL scans cover all languages in the repository -- multi-language projects need per-language configuration
- [ ] If the project handles sensitive data (auth, payments, PII), verify custom CodeQL queries or extended suites beyond the default are configured
- [ ] Verify CodeQL results are reviewed via GitHub Security tab or equivalent -- unreviewd results provide no value
- [ ] Check that CodeQL is not set to only `security-queries` when `security-and-quality` would catch additional issues

## Common False Positives

- **Test code with intentional vulnerabilities**: Security tests, penetration test scripts, and SAST rule tests intentionally contain vulnerable patterns. These should be excluded by path, not inline suppressed.
- **Framework-handled sanitization**: Web frameworks (Rails, Django, Spring) auto-escape output by default. SAST tools may flag template rendering as XSS when the framework handles it.
- **ORM-parameterized queries**: SAST tools may flag SQL queries built by ORMs as injection risks when the ORM handles parameterization.
- **Cryptographic test vectors**: Test files using weak algorithms (MD5, SHA1) as test fixtures are not security vulnerabilities.
- **Third-party/vendored code**: Findings in vendored dependencies should be tracked upstream, not suppressed in the consuming project.

## Severity Guidance

| Finding | Severity |
|---|---|
| SonarQube quality gate bypassed or thresholds weakened | Critical |
| SAST security finding suppressed without justification | Critical |
| Semgrep rules exist but do not run in CI | Important |
| CodeQL configured but not running in CI workflow | Important |
| Security hotspots marked safe without review evidence | Important |
| Custom SAST rule without test cases | Minor |
| SAST tool version outdated by 6+ months | Minor |
| Default-only CodeQL queries without project-specific additions | Minor |
| Multiple SAST tools with unreconciled findings | Minor |

## See Also

- `style-guide-supremacy` -- SAST tools are a security authority; this reviewer checks their configuration while style-guide-supremacy covers formatting tools
- `author-self-review-hygiene` -- bare nosemgrep/NOSONAR without justification is a hygiene issue
- `principle-fail-fast` -- suppressing SAST findings defers security failure detection to production
- `tool-phpstan-psalm-phan` -- Psalm's taint analysis complements Semgrep/SonarQube for PHP security
- `tool-mypy-pyright-pyre` -- type checking complements SAST for Python correctness

## Authoritative References

- [SonarQube: Quality Gates](https://docs.sonarsource.com/sonarqube/latest/user-guide/quality-gates/)
- [Semgrep: Writing Rules](https://semgrep.dev/docs/writing-rules/overview/)
- [CodeQL: Configuration](https://docs.github.com/en/code-security/code-scanning/creating-an-advanced-setup-for-code-scanning/customizing-your-advanced-setup-for-code-scanning)
- [OWASP: Static Analysis](https://owasp.org/www-community/controls/Static_Code_Analysis)
