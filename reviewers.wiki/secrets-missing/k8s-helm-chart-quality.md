---
id: k8s-helm-chart-quality
type: primary
depth_role: leaf
focus: Detect Helm chart pitfalls including hardcoded values in templates, missing defaults, absent schema validation, deprecated APIs, missing labels, and untested charts
parents:
  - index.md
covers:
  - Hardcoded values in templates that should be parameterized via values.yaml
  - Missing default values in values.yaml -- install fails without user overrides
  - Missing NOTES.txt -- user gets no post-install instructions
  - Missing _helpers.tpl -- repeated template fragments instead of reusable definitions
  - Chart without tests directory or helm test hooks
  - values.yaml without values.schema.json -- no input validation
  - "Deprecated Kubernetes API versions in templates (extensions/v1beta1, apps/v1beta2)"
  - "Missing app.kubernetes.io/* standard labels on resources"
  - Helm hooks without weight or delete-policy annotation
  - Subcharts pinned to latest or unpinned version range
  - "Missing chart documentation (Chart.yaml description, README)"
tags:
  - kubernetes
  - helm
  - chart
  - values
  - templates
  - quality
  - labels
  - hooks
  - schema
activation:
  file_globs:
    - "**/Chart.yaml"
    - "**/values.yaml"
    - "**/templates/**"
    - "**/*.tpl"
  keyword_matches:
    - helm
    - Helm
    - Chart
    - values
    - template
    - range
    - include
    - define
    - tpl
    - Release
    - .Values
source:
  origin: file
  path: k8s-helm-chart-quality.md
  hash: "sha256:4149f953002dae90e9dbe0650112a6a3fcc4dac4a60632bb1fc40c89d1ace434"
---
# Helm Chart Quality

## When This Activates

Activates on diffs touching Helm chart files: Chart.yaml, values.yaml, templates/, or .tpl files. Helm charts are the primary packaging format for Kubernetes applications, and subtle mistakes in chart design cause install failures, silent misconfigurations, and upgrade regressions that are difficult to debug. Hardcoded values in templates bypass the parameterization contract, missing defaults break fresh installs, absent schema validation accepts invalid inputs silently, and deprecated API versions cause failures on newer clusters. This reviewer detects chart-level pitfalls that undermine the reusability, correctness, and maintainability Helm is designed to provide.

## Audit Surface

- [ ] Template file with hardcoded image, port, replica count, or resource values
- [ ] values.yaml key referenced in template but missing default value
- [ ] Chart missing templates/NOTES.txt file
- [ ] Chart missing templates/_helpers.tpl file
- [ ] Chart missing tests/ directory or test connection hook
- [ ] Chart missing values.schema.json for input validation
- [ ] Template using deprecated apiVersion (extensions/v1beta1, apps/v1beta2)
- [ ] Resource manifest missing app.kubernetes.io/name label
- [ ] Resource manifest missing app.kubernetes.io/instance label
- [ ] Resource manifest missing app.kubernetes.io/managed-by label
- [ ] Helm hook annotation without helm.sh/hook-weight
- [ ] Helm hook annotation without helm.sh/hook-delete-policy
- [ ] Subchart dependency with version '*' or unpinned range
- [ ] Chart.yaml missing description or appVersion field
- [ ] Template using .Release.Namespace instead of explicit namespace override

## Detailed Checks

### Hardcoded Values and Missing Defaults
<!-- activation: keywords=[".Values", "values.yaml", "default", "required", "image", "repository", "tag", "replicaCount", "port"] -->

- [ ] **Hardcoded values in templates**: flag templates that embed literal image names, port numbers, replica counts, or resource limits instead of referencing `.Values.*` -- this defeats parameterization and makes the chart useless for different environments
- [ ] **Missing default in values.yaml**: flag `.Values.x.y` references in templates where `x.y` has no entry in values.yaml -- `helm install` without overrides produces nil dereference or empty fields, causing silent misconfigurations or runtime crashes
- [ ] **Missing `required` or `default` guard**: flag `.Values` references that have neither a `default` function nor a `required` call in the template -- the template silently renders empty strings for missing values instead of failing fast
- [ ] **Secrets hardcoded in values.yaml**: flag values.yaml entries containing passwords, tokens, or connection strings with non-placeholder defaults -- these get committed to version control

### Chart Structure and Reusability
<!-- activation: keywords=["_helpers.tpl", "NOTES.txt", "define", "include", "template", "Chart.yaml", "description", "appVersion"] -->

- [ ] **Missing _helpers.tpl**: flag charts without templates/_helpers.tpl when templates contain repeated label blocks, name computations, or selector logic -- duplicated template fragments drift out of sync across resources
- [ ] **Missing NOTES.txt**: flag charts without templates/NOTES.txt -- users get no post-install instructions; NOTES.txt should display access URLs, credentials retrieval commands, and next steps
- [ ] **Duplicated template fragments**: flag identical label blocks or name patterns appearing in more than two template files -- extract into a named template in _helpers.tpl using `define`/`include`
- [ ] **Chart.yaml incomplete**: flag Chart.yaml missing `description`, `appVersion`, or `maintainers` -- downstream consumers and Helm repositories rely on these fields for discovery and version tracking

### Schema Validation and Testing
<!-- activation: keywords=["values.schema.json", "helm test", "test-connection", "tests/", "JSON Schema"] -->

- [ ] **Missing values.schema.json**: flag charts without values.schema.json -- without a JSON Schema, `helm install` accepts any values file, including typos and invalid types, with no error; schema validation catches these at install time
- [ ] **No helm tests**: flag charts without a tests/ directory or test-connection pod -- `helm test` verifies the release works after install; without tests, regressions in chart changes go undetected until production
- [ ] **Schema not matching values.yaml**: flag values.schema.json that does not cover all top-level keys in values.yaml -- partial schemas give false confidence; uncovered keys bypass validation entirely

### API Versions and Compatibility
<!-- activation: keywords=["apiVersion", "extensions/v1beta1", "apps/v1beta2", "policy/v1beta1", "networking.k8s.io/v1beta1", "Capabilities.APIVersions"] -->

- [ ] **Deprecated API versions**: flag templates using extensions/v1beta1, apps/v1beta2, policy/v1beta1, or networking.k8s.io/v1beta1 -- these APIs are removed in Kubernetes 1.22+; the chart will fail to install on modern clusters
- [ ] **Missing API version capability check**: flag templates that hardcode apiVersion instead of using `.Capabilities.APIVersions.Has` -- charts should degrade gracefully across cluster versions rather than failing on version mismatch
- [ ] **Deprecated chart API version**: flag Chart.yaml using `apiVersion: v1` when the chart uses Helm 3 features (dependencies in Chart.yaml, library charts) -- use `apiVersion: v2`

### Labels, Hooks, and Dependencies
<!-- activation: keywords=["app.kubernetes.io", "helm.sh/hook", "hook-weight", "hook-delete-policy", "dependencies", "subchart", "condition", "alias"] -->

- [ ] **Missing standard labels**: flag resources without app.kubernetes.io/name, app.kubernetes.io/instance, and app.kubernetes.io/managed-by labels -- these labels are required for `helm list`, `kubectl` filtering, and service mesh integration
- [ ] **Hook without weight**: flag helm.sh/hook annotations without helm.sh/hook-weight -- hooks execute in undefined order when weight is absent; pre-install migrations may run after the app starts
- [ ] **Hook without delete-policy**: flag hooks without helm.sh/hook-delete-policy -- hook resources persist after execution, cluttering the namespace and potentially conflicting on subsequent releases
- [ ] **Unpinned subchart versions**: flag dependencies in Chart.yaml using `version: "*"`, `>=`, or broad ranges without a lock file -- Chart.lock should pin exact versions to ensure reproducible installs

## Common False Positives

- **Library charts**: library charts (type: library in Chart.yaml) have no templates/ directory, no NOTES.txt, and no tests. These omissions are correct by design.
- **Umbrella charts**: parent charts that only aggregate subcharts may have minimal templates and values. The subcharts themselves should be validated individually.
- **Operator-generated charts**: charts generated by operator SDKs may follow different structural conventions. Verify against the operator's documentation.
- **Template conditionals**: values that appear hardcoded may actually be guarded by `{{ if }}` blocks that reference values. Check the full template context before flagging.
- **Helm 2 compatibility**: older charts using `apiVersion: v1` may be intentionally supporting Helm 2. Verify the chart's stated compatibility range.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets hardcoded in values.yaml with real defaults | Critical |
| Deprecated API versions causing install failure on modern clusters | Critical |
| Hardcoded values defeating chart parameterization | Important |
| Missing default for required values (install fails) | Important |
| Missing values.schema.json (no input validation) | Important |
| Unpinned subchart versions (non-reproducible installs) | Important |
| Missing standard app.kubernetes.io labels | Minor |
| Missing NOTES.txt post-install instructions | Minor |
| Missing _helpers.tpl with duplicated template fragments | Minor |
| Hook without delete-policy (resource clutter) | Minor |
| Missing helm tests directory | Minor |

## See Also

- `k8s-manifest-correctness` -- manifest-level checks that complement chart-level validation
- `k8s-pod-security-standards` -- pod security checks applicable to rendered Helm templates
- `sec-supply-chain-sbom-slsa-sigstore` -- subchart pinning and chart provenance
- `sec-owasp-a05-misconfiguration` -- chart misconfigurations as a class of security misconfiguration
- `principle-fail-fast` -- missing schema validation and defaults violate fail-fast

## Authoritative References

- [Helm Documentation: Chart Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Helm Documentation: Values Schema Files](https://helm.sh/docs/topics/charts/#schema-files)
- [Helm Documentation: Chart Tests](https://helm.sh/docs/topics/chart_tests/)
- [Kubernetes Documentation: Recommended Labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
- [Kubernetes Deprecation Guide: Removed APIs by Version](https://kubernetes.io/docs/reference/using-api/deprecation-guide/)
