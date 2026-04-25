---
id: k8s-operator-and-crd-design
type: primary
depth_role: leaf
focus: Detect Kubernetes operator and CRD design flaws including non-idempotent reconcilers, missing finalizers, absent status updates, overly broad watches, and CRD validation gaps
parents:
  - index.md
covers:
  - Reconciler not idempotent -- repeated reconciliation produces different results
  - Missing status subresource updates -- controller does not report observed state
  - Missing finalizers for external resource cleanup
  - No rate limiting on reconcile loop -- hot loop on transient errors
  - Watch scope too broad -- watching all namespaces without label filter
  - CRD without OpenAPI validation schema
  - Missing printer columns for kubectl get output
  - CRD versioning without conversion webhook
  - Reconciler modifying spec instead of only status
  - Missing RBAC markers for controller-gen
  - Error not requeued -- failure silently dropped
  - "Reconciler performing blocking I/O without timeout"
tags:
  - kubernetes
  - operator
  - crd
  - controller
  - reconciler
  - kubebuilder
  - controller-runtime
  - finalizer
  - status
activation:
  file_globs:
    - "**/*_controller.go"
    - "**/*_reconciler.*"
    - "**/api/v1*/"
    - "**/*_types.go"
  keyword_matches:
    - Reconcile
    - reconcile
    - CRD
    - CustomResourceDefinition
    - operator
    - controller-runtime
    - kubebuilder
    - Status
    - Spec
    - controller
    - Watch
    - Owns
    - For
source:
  origin: file
  path: k8s-operator-and-crd-design.md
  hash: "sha256:44849a3a2657a514a86e749568a86330bc26e275a1e0c322d30b2db7176d35bb"
---
# Kubernetes Operator and CRD Design

## When This Activates

Activates on diffs touching Kubernetes operator source code (controller, reconciler, types files) or CRD definitions. Operators extend the Kubernetes API with custom resources and controllers that reconcile desired state to actual state, but operator bugs are uniquely dangerous: a non-idempotent reconciler creates duplicate resources on every loop iteration, a missing finalizer leaks external resources when the CR is deleted, a missing status update leaves users blind to reconciliation failures, and an overly broad watch floods the controller with irrelevant events. This reviewer detects operator design flaws that cause resource leaks, data loss, control plane overload, and silent failures.

## Audit Surface

- [ ] Reconcile function that creates resources without checking existence first
- [ ] Reconcile function with no Status().Update() call
- [ ] Controller with no finalizer registration for owned external resources
- [ ] Controller without MaxConcurrentReconciles or RateLimiter option
- [ ] Manager watching all namespaces without predicates
- [ ] CRD types.go without kubebuilder:validation markers
- [ ] CRD types.go without kubebuilder:printcolumn markers
- [ ] Multiple CRD versions without conversion webhook setup
- [ ] Reconcile function writing to spec fields of the observed resource
- [ ] Controller Go file missing kubebuilder:rbac markers
- [ ] Reconcile returning ctrl.Result{} on error without Requeue
- [ ] Reconcile function calling external APIs without context timeout
- [ ] Reconcile function not using controllerutil.CreateOrUpdate/Patch
- [ ] Status conditions not following metav1.Condition convention

## Detailed Checks

### Reconciler Idempotency and Error Handling
<!-- activation: keywords=["Reconcile", "reconcile", "ctrl.Result", "Requeue", "RequeueAfter", "CreateOrUpdate", "CreateOrPatch", "controllerutil", "Get", "Create", "Update"] -->

- [ ] **Non-idempotent reconciler**: flag Reconcile functions that call `Create()` without first checking if the resource exists via `Get()` -- the reconciler runs on every event, requeueing, and resync; creating without existence check produces duplicate resources on each iteration
- [ ] **Error silently dropped**: flag Reconcile functions that return `ctrl.Result{}, nil` on error paths -- returning nil error with no Requeue means the controller never retries the failed reconciliation; the resource stays in a broken state permanently
- [ ] **Missing requeue on transient failure**: flag error handling that returns the error without setting `RequeueAfter` for rate-limited retry -- immediate requeue on transient errors (API throttling, network timeout) creates a hot loop that overwhelms the API server
- [ ] **Not using CreateOrUpdate/Patch**: flag reconcilers that manually implement get-then-create-or-update logic instead of using `controllerutil.CreateOrUpdate` or `controllerutil.CreateOrPatch` -- the utility function handles the create-or-update pattern correctly including resource version conflicts

### Status Management
<!-- activation: keywords=["Status", "StatusClient", "Status().Update", "Status().Patch", "Conditions", "metav1.Condition", "ObservedGeneration", "Phase"] -->

- [ ] **Missing status updates**: flag Reconcile functions that never call `Status().Update()` or `Status().Patch()` -- without status updates, `kubectl get <resource>` shows no information about reconciliation state, and users cannot determine whether the resource is healthy, progressing, or failed
- [ ] **Spec mutation in reconciler**: flag Reconcile functions that modify and update the `.Spec` of the resource being reconciled -- the controller should only modify `.Status`; spec changes trigger another reconciliation event, creating an infinite loop
- [ ] **Non-standard status conditions**: flag status condition types that do not follow the `metav1.Condition` struct convention (Type, Status, Reason, Message, LastTransitionTime, ObservedGeneration) -- non-standard conditions break tooling that expects the Kubernetes condition contract
- [ ] **Missing ObservedGeneration**: flag status updates that do not set `ObservedGeneration` to the resource's current `Generation` -- without this, consumers cannot determine if the status reflects the latest spec change or a stale version

### Finalizers and Cleanup
<!-- activation: keywords=["finalizer", "Finalizer", "controllerutil.AddFinalizer", "controllerutil.RemoveFinalizer", "DeletionTimestamp", "IsZero", "external", "cleanup"] -->

- [ ] **Missing finalizer for external resources**: flag controllers that create external resources (cloud infrastructure, DNS records, certificates) without registering a finalizer -- when the CR is deleted, Kubernetes removes it immediately without giving the controller a chance to clean up external resources, causing leaks
- [ ] **Finalizer not removed on completion**: flag finalizer logic that does not call `controllerutil.RemoveFinalizer` after successful cleanup -- the resource gets stuck in Terminating state indefinitely, requiring manual intervention
- [ ] **Cleanup without DeletionTimestamp check**: flag reconcilers that perform cleanup logic unconditionally instead of checking `DeletionTimestamp.IsZero()` -- cleanup should only run when the resource is being deleted, not on every reconciliation

### Watch Scope and Performance
<!-- activation: keywords=["Watch", "Owns", "For", "Watches", "WithEventFilter", "Predicates", "MaxConcurrentReconciles", "RateLimiter", "NamespacedName", "cache"] -->

- [ ] **Overly broad watch scope**: flag controllers that watch all namespaces without label selectors or predicates -- watching all namespaces on a large cluster generates thousands of events for irrelevant resources, causing high memory consumption and reconciliation delays
- [ ] **Missing rate limiter**: flag controller setup without explicit `MaxConcurrentReconciles` or `RateLimiter` options -- the default rate limiter may be too aggressive for controllers that perform external API calls, causing API throttling and cascading failures
- [ ] **Missing event filters**: flag `Watches` or `For` calls without `WithEventFilter` predicates -- the controller receives update events for every field change on watched resources, including status updates and metadata changes that are irrelevant to reconciliation

### CRD Validation and Versioning
<!-- activation: keywords=["kubebuilder:validation", "kubebuilder:printcolumn", "kubebuilder:rbac", "kubebuilder:subresource", "conversion", "webhook", "CRD", "types.go", "zz_generated"] -->

- [ ] **CRD without validation**: flag types.go struct fields without `kubebuilder:validation` markers (Required, Minimum, Maximum, Enum, Pattern) -- without validation, the API server accepts any value, and the reconciler must handle invalid input that should have been rejected at admission
- [ ] **Missing printer columns**: flag CRD types without `kubebuilder:printcolumn` markers -- `kubectl get <resource>` shows only Name and Age; printer columns surface status, phase, and key fields without requiring `kubectl describe`
- [ ] **Missing RBAC markers**: flag controller Go files without `kubebuilder:rbac` markers -- controller-gen generates RBAC roles from these markers; missing markers mean the controller runs with insufficient permissions and fails at runtime
- [ ] **Multi-version CRD without conversion**: flag CRDs with multiple versions (api/v1alpha1, api/v1beta1) without a conversion webhook -- without conversion, stored resources in older versions cannot be served as newer versions, breaking API compatibility

## Common False Positives

- **Simple reconcilers without external resources**: controllers that only manage in-cluster resources owned by the CR (via OwnerReference) do not need finalizers -- Kubernetes garbage collection handles cleanup automatically.
- **Status-only CRDs**: some CRDs are read-only status reporters (metrics, health) with no reconciliation loop. Missing status update calls are expected when the controller only reads.
- **Single-namespace operators**: operators deployed via OLM with `installModes: [OwnNamespace]` legitimately watch only their own namespace. Broad watch warnings do not apply.
- **Test reconcilers**: unit test scaffolding may have simplified reconcilers that intentionally omit production patterns.
- **Generated code**: files matching `zz_generated*` are auto-generated by controller-gen. Do not flag these for missing markers.

## Severity Guidance

| Finding | Severity |
|---|---|
| Non-idempotent reconciler creating duplicates | Critical |
| Missing finalizer leaking external resources | Critical |
| Reconciler modifying spec (infinite loop risk) | Critical |
| Error silently dropped (no requeue on failure) | Important |
| Missing status subresource updates | Important |
| CRD without OpenAPI validation schema | Important |
| Missing RBAC markers (runtime permission failure) | Important |
| Multi-version CRD without conversion webhook | Important |
| Overly broad watch scope on large cluster | Minor |
| Missing printer columns for kubectl output | Minor |
| Missing rate limiter on controller | Minor |
| Non-standard status condition format | Minor |

## See Also

- `k8s-manifest-correctness` -- manifest-level checks for operator-deployed resources
- `k8s-rbac` -- RBAC configuration complementing kubebuilder:rbac markers
- `k8s-pod-security-standards` -- pod security for operator workloads
- `sec-owasp-a05-misconfiguration` -- CRD validation gaps as misconfiguration
- `principle-fail-fast` -- missing validation and error handling violate fail-fast

## Authoritative References

- [Kubebuilder Documentation: Controller Best Practices](https://book.kubebuilder.io/reference/good-practices)
- [Kubernetes Documentation: Custom Resources](https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/)
- [Kubernetes Documentation: Operator Pattern](https://kubernetes.io/docs/concepts/extend-kubernetes/operator/)
- [controller-runtime Documentation: Reconciler Interface](https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/reconcile)
- [Kubernetes Documentation: Finalizers](https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/)
