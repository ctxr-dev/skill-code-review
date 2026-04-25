---
id: k8s-kustomize-discipline
type: primary
depth_role: leaf
focus: Detect Kustomize anti-patterns including full-manifest patches, unpinned remote bases, missing namespace overlays, stale configMaps, and overlay complexity obscuring intent
parents:
  - index.md
covers:
  - Patches duplicating entire manifests instead of strategic merge patches
  - Missing namespace in overlay kustomization -- deploys to default namespace
  - Bases referenced by URL without pinned commit or tag
  - Overlapping patches creating merge conflicts on the same field
  - configMapGenerator without hash suffix -- stale configMaps on rollout
  - Missing commonLabels for resource selection and ownership
  - Overlay complexity hiding base intent -- deep override chains
  - Kustomize build not tested in CI pipeline
  - Duplicate resource declarations across bases and overlays
  - "Missing secretGenerator for secret management (hardcoded secrets)"
tags:
  - kubernetes
  - kustomize
  - overlay
  - patch
  - configmap
  - base
  - gitops
  - configuration
activation:
  file_globs:
    - "**/kustomization.yaml"
    - "**/kustomization.yml"
    - "**/kustomize/**"
  keyword_matches:
    - kustomize
    - Kustomize
    - bases
    - resources
    - patches
    - overlays
    - components
    - generators
    - transformers
    - namePrefix
    - commonLabels
source:
  origin: file
  path: k8s-kustomize-discipline.md
  hash: "sha256:838f9785c70addc9f20f34447589f0f2934b46f0a75f81462187c2dd8fe4141b"
---
# Kustomize Discipline

## When This Activates

Activates on diffs touching kustomization.yaml files, overlay directories, or patch files associated with Kustomize-based Kubernetes configuration. Kustomize provides template-free customization by overlaying patches on base manifests, but without discipline the overlay structure becomes harder to reason about than the templates it replaced. Full-manifest patches negate the benefit of bases, unpinned remote references introduce supply chain risk, missing namespace fields cause silent deployment to the wrong namespace, and configMaps without hash suffixes cause stale configuration on rollouts. This reviewer detects structural anti-patterns that undermine Kustomize's declarative configuration model.

## Audit Surface

- [ ] Strategic merge patch that reproduces >80% of the base manifest
- [ ] Overlay kustomization.yaml without namespace field
- [ ] Remote base URL without pinned ref (?ref=v1.2.3 or ?ref=sha)
- [ ] Two patches modifying the same field on the same resource
- [ ] configMapGenerator without hash suffix disabled
- [ ] Kustomization without commonLabels for resource grouping
- [ ] Overlay chain deeper than 3 levels
- [ ] CI pipeline without kustomize build step
- [ ] Same resource name defined in both bases and resources arrays
- [ ] Literal secrets in kustomization.yaml instead of secretGenerator
- [ ] Patch targeting a resource not present in bases
- [ ] vars or replacements referencing non-existent resources
- [ ] kustomization.yaml using deprecated bases field instead of resources

## Detailed Checks

### Patch Quality and Minimality
<!-- activation: keywords=["patches", "patchesStrategicMerge", "patchesJson6902", "patch", "target", "path", "op", "replace", "add"] -->

- [ ] **Full-manifest patches**: flag strategic merge patches where the patch file reproduces more than 80% of the base manifest fields -- this defeats the purpose of overlay customization; extract only the fields that differ from the base
- [ ] **Overlapping patches**: flag two or more patches that modify the same field path on the same resource (e.g., two patches both set `spec.replicas`) -- Kustomize applies patches in order, and the last one wins silently, masking intended configurations
- [ ] **Patch targeting missing resource**: flag patches whose target (kind/name/namespace) does not match any resource in the base -- the patch silently does nothing, leaving the intended customization unapplied
- [ ] **Using deprecated patchesStrategicMerge**: flag `patchesStrategicMerge` or `patchesJson6902` fields -- these are deprecated in favor of the unified `patches` field; deprecated fields will be removed in future Kustomize versions

### Namespace and Label Management
<!-- activation: keywords=["namespace", "commonLabels", "commonAnnotations", "namePrefix", "nameSuffix", "labels", "selector"] -->

- [ ] **Missing namespace in overlay**: flag production or environment-specific overlays without a `namespace` field in kustomization.yaml -- resources deploy to the `default` namespace, which is a shared dumping ground with no isolation guarantees
- [ ] **Missing commonLabels**: flag kustomization.yaml without `commonLabels` or `labels` transformer -- resources lack consistent selection labels, making it impossible to query, monitor, or garbage-collect resources belonging to a specific overlay
- [ ] **commonLabels on mutable selectors**: flag `commonLabels` applied to resources with immutable label selectors (Deployments, StatefulSets) after initial creation -- Kustomize injects labels into selectors, which cannot be changed on existing resources, breaking upgrades

### Remote Bases and Supply Chain
<!-- activation: keywords=["resources", "bases", "github.com", "ref=", "https://", "ssh://", "tag", "commit"] -->

- [ ] **Unpinned remote base**: flag `resources` entries referencing remote URLs (github.com, gitlab.com) without `?ref=<tag>` or `?ref=<sha>` -- the base can change upstream at any time, introducing breaking changes or malicious modifications without any diff in your repository
- [ ] **Remote base pinned to branch**: flag remote references using `?ref=main` or `?ref=master` -- branches are mutable; pin to a specific tag or commit SHA for reproducibility
- [ ] **Deprecated bases field**: flag kustomization.yaml using the `bases` field instead of `resources` -- `bases` is deprecated since Kustomize v2.1.0; use `resources` for both local and remote references

### ConfigMap and Secret Generators
<!-- activation: keywords=["configMapGenerator", "secretGenerator", "generatorOptions", "behavior", "literals", "files", "envs", "hash"] -->

- [ ] **configMapGenerator without hash suffix**: flag `generatorOptions.disableNameSuffixHash: true` without a rollout strategy -- disabling hash suffixes means pod specs do not change when ConfigMap contents change, so Deployments do not roll out updated configuration; pods continue using the stale ConfigMap
- [ ] **Hardcoded secrets in kustomization**: flag `secretGenerator` with `literals` containing actual secret values -- these are committed to version control in plaintext; use external secret sources (files, envs) or a secrets management tool (Sealed Secrets, External Secrets Operator)
- [ ] **Missing secretGenerator**: flag kustomization.yaml that includes Secret manifests directly in `resources` instead of using `secretGenerator` -- generator-managed secrets get hash suffixes for rollout and are easier to audit than raw Secret manifests

### Overlay Complexity and CI Integration
<!-- activation: keywords=["overlays", "components", "transformers", "kustomize build", "CI", "pipeline", "render"] -->

- [ ] **Deep overlay chains**: flag overlay structures deeper than three levels (base -> overlay -> overlay -> overlay) -- each level of indirection makes it harder to predict the final rendered output; flatten or use components for shared cross-cutting modifications
- [ ] **No CI build validation**: flag repositories using Kustomize without a CI step that runs `kustomize build` on every overlay -- invalid patches, missing resources, and broken references are only caught at deploy time without build validation
- [ ] **Duplicate resource declarations**: flag the same resource (kind + name) appearing in both `resources` and `bases` or across multiple included bases -- Kustomize may fail or produce duplicate resources in the rendered output

## Common False Positives

- **Intentionally complete patches**: some teams prefer complete resource definitions in overlays for readability, treating bases as shared defaults rather than templates. Verify team convention before flagging.
- **Namespace omission in cluster-scoped resources**: ClusterRole, ClusterRoleBinding, and other cluster-scoped resources do not have a namespace. Only flag namespace-scoped resources.
- **Hash suffix disabled for external references**: some resources (referenced by external systems by exact name) legitimately disable hash suffixes. Verify the resource is not referenced by name from outside the cluster.
- **Shallow overlay chains**: simple base + single overlay is the expected structure for most projects. Only flag chains beyond three levels.
- **ArgoCD and Flux managed overlays**: GitOps tools may render kustomize output themselves. The CI build step may be in the GitOps tool configuration rather than the repository pipeline.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded secrets in secretGenerator literals | Critical |
| Unpinned remote base (supply chain risk) | Critical |
| Patch targeting missing resource (silent no-op) | Important |
| Missing namespace in production overlay | Important |
| configMapGenerator without hash suffix (stale rollouts) | Important |
| Overlapping patches on same field (silent override) | Important |
| Full-manifest patches negating overlay benefit | Minor |
| Missing commonLabels for resource grouping | Minor |
| Deep overlay chain (>3 levels) | Minor |
| Deprecated bases field usage | Minor |
| No kustomize build step in CI | Minor |

## See Also

- `k8s-manifest-correctness` -- manifest-level checks applied to kustomize-rendered output
- `k8s-helm-chart-quality` -- alternative templating approach with complementary pitfalls
- `sec-supply-chain-sbom-slsa-sigstore` -- remote base pinning as supply chain control
- `sec-owasp-a05-misconfiguration` -- overlay misconfigurations as security misconfiguration class
- `principle-fail-fast` -- missing CI build validation violates fail-fast

## Authoritative References

- [Kubernetes Documentation: Kustomize](https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/)
- [Kustomize GitHub: Best Practices](https://kubectl.docs.kubernetes.io/guides/)
- [Kustomize Documentation: Generators](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/configmapgenerator/)
- [Kustomize Documentation: Patches](https://kubectl.docs.kubernetes.io/references/kustomize/kustomization/patches/)
