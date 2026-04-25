---
id: cicd-jenkins
type: primary
depth_role: leaf
focus: Detect Jenkins pipeline security and reliability issues including script blocks in declarative pipelines, credentials in pipeline code, unpinned shared libraries, overly broad agent labels, missing timeouts, and missing retry on flaky stages
parents:
  - index.md
covers:
  - Scripted pipeline blocks where declarative suffices
  - "Credentials hardcoded in Jenkinsfile instead of credentials() binding"
  - Shared library loaded without version pin
  - Agent label too broad -- any available node
  - Missing timeout on pipeline or stage
  - Missing retry on stages with known transient failures
  - "Groovy sandbox escape using @NonCPS or metaprogramming"
  - Credentials exposed via shell echo or environment dump
  - Pipeline without post block for cleanup
  - Approval gate missing on production deployment stage
  - Variable groups with secrets stored as plain YAML instead of secret variables
  - Service connections without scope restrictions or approval checks
  - "Template references without version pin (branch or tag reference)"
  - Missing approval gates on environment deployments
  - Agent pool without capability matching for job requirements
  - Secrets in pipeline YAML variable blocks
  - Pipeline parameters used unsanitized in scripts
  - Missing branch filter on deployment stages
  - "Excessive pipeline permissions (build service identity)"
  - Missing timeout on jobs and stages
tags:
  - jenkins
  - ci-cd
  - pipeline
  - jenkinsfile
  - groovy
  - credentials
  - shared-library
  - CWE-798
  - CWE-269
  - azure-devops
  - service-connection
  - variable-group
  - approval-gate
aliases:
  - cicd-azure-devops-pipelines
activation:
  file_globs:
    - "**/Jenkinsfile*"
    - "**/jenkins/**"
    - "**/*.jenkinsfile"
    - "**/jenkins-pipeline*"
  keyword_matches:
    - "pipeline {"
    - Jenkinsfile
    - "agent {"
    - "stages {"
    - withCredentials
    - "@Library"
    - "sh '"
    - "credentials("
    - input message
    - "timeout("
  structural_signals:
    - Jenkinsfile or Jenkins pipeline change
    - Shared library reference change
source:
  origin: file
  path: cicd-jenkins.md
  hash: "sha256:4326de48fa70c6a67a11675f47b038f27db46f768475f12bc699a9c980f294fa"
---
# Jenkins Pipeline Security and Reliability

## When This Activates

Activates when diffs touch Jenkinsfiles or Jenkins pipeline configuration. Jenkins pipelines execute Groovy code with access to the Jenkins controller, stored credentials, and build agents. Scripted blocks bypass the declarative sandbox, shared libraries execute on the controller with full trust, and credentials bound without care leak to build logs. This reviewer detects Jenkins-specific patterns that compromise credential security, allow privilege escalation, or reduce pipeline reliability.

## Audit Surface

- [ ] script {} block inside declarative pipeline
- [ ] Hardcoded password, token, or API key in Jenkinsfile
- [ ] @Library without version tag or commit pin
- [ ] Agent label too broad for privileged stages
- [ ] Stage without timeout wrapper
- [ ] Stage with known flaky steps but no retry
- [ ] Echo or sh step printing credential values
- [ ] @NonCPS annotation on sensitive method
- [ ] Missing post { always { } } block for cleanup
- [ ] Deploy stage without input step for approval
- [ ] Missing disableConcurrentBuilds option
- [ ] withCredentials variable used in sh echo
- [ ] External script loaded without integrity check

## Detailed Checks

### Declarative vs. Scripted Pipeline
<!-- activation: keywords=["script {", "node {", "pipeline {", "stage(", "steps {", "@NonCPS", "Groovy"] -->

- [ ] **Script block in declarative pipeline**: flag `script { }` blocks inside declarative pipeline stages -- scripted blocks bypass the declarative sandbox and can execute arbitrary Groovy on the controller. Refactor to use declarative steps, shared libraries, or custom pipeline steps instead
- [ ] **Fully scripted pipeline**: flag Jenkinsfiles using the scripted `node { }` / `stage()` syntax instead of declarative `pipeline { }` -- declarative pipelines enforce structure, enable Blue Ocean visualization, and limit Groovy execution to the sandbox. Migrate to declarative unless scripted is genuinely required
- [ ] **@NonCPS methods**: flag methods annotated with `@NonCPS` -- these execute outside the Groovy CPS sandbox and can perform unrestricted operations. Verify they do not access credentials, file systems, or network resources that should be sandboxed

### Credentials and Secrets
<!-- activation: keywords=["credentials(", "withCredentials", "usernamePassword", "sshUserPrivateKey", "string(", "secret", "password", "token", "echo", "sh '"] -->

- [ ] **Hardcoded credentials in Jenkinsfile**: flag string literals that appear to be passwords, tokens, API keys, or connection strings in Jenkinsfile -- pipeline files are committed to version control. Use Jenkins credential store and `credentials()` or `withCredentials()` bindings
- [ ] **Credential leaked in shell step**: flag `withCredentials` blocks where the bound variable is used in `sh "echo $CRED"` or `sh "curl -u $USER:$PASS"` -- shell output is captured in build logs. Use `set +x` before credential-using commands, or pass credentials via environment variables that Jenkins auto-masks
- [ ] **Credential scope too broad**: flag credentials bound at the pipeline level when they are only needed in a single stage -- broad scope increases the window of exposure. Bind credentials in the narrowest scope possible
- [ ] **Environment block with credential fallback**: flag `environment { API_KEY = credentials('api-key') ?: 'default-key' }` -- fallback values defeat the purpose of credential management and may end up in production

### Shared Libraries and External Code
<!-- activation: keywords=["@Library", "library(", "libraryResource", "load(", "evaluate("] -->

- [ ] **Unpinned shared library**: flag `@Library('my-lib')` or `@Library('my-lib@main')` without a version tag or commit pin -- shared libraries execute on the Jenkins controller with full trust. A compromised library compromises all pipelines that use it. Pin to a specific tag or commit: `@Library('my-lib@v2.1.0')`
- [ ] **Dynamic library loading**: flag `library()` step with a dynamically computed name or version -- this can be manipulated to load malicious code. Use static `@Library` annotations with pinned versions
- [ ] **External script without verification**: flag `load('script.groovy')` or `sh 'curl ... | groovy'` patterns that fetch and execute external Groovy or shell scripts without integrity checks -- these are supply chain injection vectors

### Agent Labels and Resource Management
<!-- activation: keywords=["agent {", "agent any", "label '", "docker {", "dockerfile", "node("] -->

- [ ] **agent any for privileged stages**: flag `agent any` or `agent { label 'any' }` on stages that access credentials, deploy, or perform privileged operations -- the stage may run on any available node including shared or untrusted agents. Use specific labels that map to hardened, dedicated agents
- [ ] **Missing agent specification**: flag stages without an `agent` directive that inherit the pipeline-level agent -- if the pipeline agent is broad, every stage inherits the risk. Consider per-stage agent directives for isolation
- [ ] **Docker agent without image pin**: flag `agent { docker { image 'node' } }` without a tag or digest -- this pulls :latest, making builds non-reproducible. Pin the image: `image 'node:20.11.0'`

### Timeouts, Retries, and Reliability
<!-- activation: keywords=["timeout(", "retry(", "post {", "always {", "failure {", "options {", "disableConcurrentBuilds", "timestamps"] -->

- [ ] **Missing timeout**: flag pipelines and stages without `timeout(time: N, unit: 'MINUTES')` -- without a timeout, stuck builds consume executor slots indefinitely. Set pipeline-level and stage-level timeouts appropriate to expected duration
- [ ] **Missing retry on flaky stage**: flag stages that interact with external services (npm registry, Docker Hub, cloud APIs) without `retry(N)` -- transient network failures cause pipeline failures. Add retry with a count of 2-3 for known-flaky external interactions
- [ ] **Missing post block**: flag pipelines without `post { always { } }` -- cleanup actions (workspace cleanup, notification, resource release) must run regardless of pipeline outcome. Use `post { always { cleanWs() } }` at minimum
- [ ] **Missing disableConcurrentBuilds**: flag pipelines that deploy or modify shared state without `options { disableConcurrentBuilds() }` -- concurrent builds to the same deployment target cause race conditions

## Common False Positives

- **Scripted pipeline in legacy projects**: some Jenkins features (complex parallel execution, dynamic stage generation) genuinely require scripted syntax. Flag only when declarative alternatives exist.
- **agent any for test-only pipelines**: test pipelines that do not access secrets or deploy may legitimately use `agent any` for faster scheduling.
- **Retry on intentionally failing stages**: stages designed to test failure scenarios (chaos engineering, failure injection) may not need retry.
- **Credentials in example Jenkinsfiles**: template or example Jenkinsfiles with placeholder credentials (`'your-credential-id'`) are not real secrets.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded credential in Jenkinsfile | Critical |
| Shared library loaded without version pin | Critical |
| Credential leaked in shell echo or log output | Critical |
| Deploy stage without input approval gate | Important |
| Script block bypassing declarative sandbox | Important |
| agent any on stage accessing credentials | Important |
| @NonCPS method accessing credentials or network | Important |
| Missing timeout on pipeline or stage | Minor |
| Missing retry on stages calling external services | Minor |
| Missing post { always { } } cleanup block | Minor |
| Missing disableConcurrentBuilds for deploy pipelines | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- credential lifecycle and rotation
- `sec-supply-chain-sbom-slsa-sigstore` -- shared library pinning as supply chain control
- `cicd-pipeline-secrets-discipline` -- cross-platform secrets hygiene
- `cicd-deploy-strategies` -- deployment safety and rollback mechanisms
- `sec-owasp-a05-misconfiguration` -- Jenkins misconfigurations as security risk

## Authoritative References

- [Jenkins Pipeline Security](https://www.jenkins.io/doc/book/security/controller-isolation/)
- [Jenkins Shared Libraries](https://www.jenkins.io/doc/book/pipeline/shared-libraries/)
- [Jenkins Credentials Plugin](https://www.jenkins.io/doc/book/using/using-credentials/)
- [Jenkins Declarative Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [OWASP CI/CD Security Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/)
