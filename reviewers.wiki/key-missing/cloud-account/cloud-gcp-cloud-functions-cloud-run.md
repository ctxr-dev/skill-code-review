---
id: cloud-gcp-cloud-functions-cloud-run
type: primary
depth_role: leaf
focus: Detect cold start neglect, missing IAM invoker restrictions, secret leaks in env vars, and misconfigured concurrency in Cloud Functions and Cloud Run
parents:
  - index.md
covers:
  - Cold start not mitigated -- no minimum instances configured
  - Missing timeout configuration on Cloud Function or Cloud Run service
  - Concurrency misconfigured on Cloud Run -- 1 for CPU-bound, higher for IO-bound
  - Missing IAM invoker restriction allowing unauthenticated access
  - Secrets stored in environment variables instead of Secret Manager
  - Missing VPC connector for access to private resources
  - Cloud Function Gen1 used instead of Gen2 without justification
  - Missing error reporting integration
  - Cloud Run CPU always-allocated without justification
  - Missing request timeout distinct from instance timeout
tags:
  - gcp
  - cloud-functions
  - cloud-run
  - serverless
  - cold-start
  - concurrency
  - iam
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/*.py"
    - "**/*.go"
    - "**/*.ts"
    - "**/*.js"
    - "**/Dockerfile"
    - "**/cloudbuild.yaml"
  keyword_matches:
    - CloudFunction
    - cloud_function
    - CloudRun
    - cloud_run
    - gcf
    - gcloud functions
    - gcloud run
    - GOOGLE_CLOUD_PROJECT
    - Functions Framework
  structural_signals:
    - google_cloud_run_service
    - google_cloudfunctions_function
    - functions_framework
source:
  origin: file
  path: cloud-gcp-cloud-functions-cloud-run.md
  hash: "sha256:4126ed64b1e0797683bc223459c1a1dbe019767fcdb56581618ef9758a71fce5"
---
# GCP Cloud Functions and Cloud Run

## When This Activates

Activates on diffs involving Cloud Functions handlers, Cloud Run service definitions, Dockerfiles targeting Cloud Run, or Terraform/YAML configurations for either service. Cloud Functions and Cloud Run share serverless scaling semantics but differ in concurrency model -- Functions process one request per instance (Gen1) or configurable (Gen2), while Cloud Run handles multiple concurrent requests per container. Misconfiguring concurrency, neglecting cold starts, exposing secrets in environment variables, or leaving services publicly invocable without authentication are the most common production incidents. This reviewer detects diff-visible signals of these GCP compute misconfigurations.

## Audit Surface

- [ ] Cloud Function or Cloud Run with min-instances set to 0 on latency-sensitive path
- [ ] No timeout configuration in function or service definition
- [ ] Cloud Run concurrency set to 1 for IO-bound workload
- [ ] Cloud Run concurrency set above 1 for CPU-bound workload
- [ ] allUsers granted roles/run.invoker or roles/cloudfunctions.invoker
- [ ] Secret value in environment variable instead of Secret Manager reference
- [ ] Private resource accessed without VPC connector
- [ ] Cloud Function Gen1 deployed when Gen2 is available
- [ ] No structured error reporting (Cloud Error Reporting, structured logging)
- [ ] Cloud Run service without CPU throttling for request-driven workload
- [ ] Missing startup or liveness probe on Cloud Run container
- [ ] No ingress restriction on Cloud Run service

## Detailed Checks

### Cold Start Mitigation
<!-- activation: keywords=["min-instances", "min_instances", "minInstances", "cold", "warm", "startup", "latency"] -->

- [ ] **Min instances zero on critical path**: flag Cloud Run services or Cloud Functions on user-facing request paths with min_instances=0 or no min_instances set -- cold starts add 1-10 seconds of latency
- [ ] **Heavy initialization in request handler**: flag handler functions that initialize database connections, load models, or parse large configs per-request instead of at startup -- Cloud Run keeps containers warm between requests
- [ ] **Gen1 function for latency-sensitive workload**: flag Cloud Functions Gen1 deployments -- Gen2 (based on Cloud Run) supports concurrency, faster cold starts, and longer timeouts

### Concurrency Configuration
<!-- activation: keywords=["concurrency", "max_concurrent", "containerConcurrency", "CPU", "cpu-bound", "io-bound"] -->

- [ ] **Concurrency 1 for IO-bound work**: flag Cloud Run services with concurrency set to 1 when the workload is IO-bound (HTTP calls, database queries) -- IO-bound services should use concurrency 80-250 for efficient resource usage
- [ ] **High concurrency for CPU-bound work**: flag Cloud Run services with concurrency above 1 when the workload is CPU-intensive (image processing, ML inference) -- CPU-bound work should use concurrency 1 to avoid resource contention
- [ ] **CPU always-allocated without justification**: flag Cloud Run services with cpu-always-allocated (no CPU throttling) for standard request-driven workloads -- this incurs costs during idle time and is only needed for background processing

### IAM and Ingress Restrictions
<!-- activation: keywords=["invoker", "allUsers", "ingress", "authenticated", "unauthenticated", "public"] -->

- [ ] **Public invoker on internal service**: flag allUsers or allAuthenticatedUsers granted roles/run.invoker or roles/cloudfunctions.invoker on services that are not public APIs -- use IAM authentication between services
- [ ] **Missing ingress restriction**: flag Cloud Run services with ingress set to "all" when the service only receives traffic from other GCP services -- restrict to "internal" or "internal-and-cloud-load-balancing"
- [ ] **No IAM between services**: flag Cloud Run-to-Cloud Run calls using public URLs without identity tokens -- use the metadata server to obtain ID tokens for authenticated service-to-service calls

### Secrets and VPC Configuration
<!-- activation: keywords=["SECRET", "secret", "env", "environment", "VPC", "vpc-connector", "private", "Cloud SQL", "Memorystore"] -->

- [ ] **Secret in plain env var**: flag environment variables containing API keys, database passwords, or tokens as literal values -- use secretKeyRef with Secret Manager instead
- [ ] **Missing VPC connector**: flag services accessing Cloud SQL (private IP), Memorystore, or other VPC-only resources without a Serverless VPC Access connector configured
- [ ] **VPC connector without egress setting**: flag VPC connectors with default egress (all traffic) when only private resource traffic needs the connector -- use PRIVATE_RANGES_ONLY to reduce NAT costs

### Observability and Error Handling
<!-- activation: keywords=["error", "logging", "monitoring", "trace", "report", "crash", "panic"] -->

- [ ] **No structured logging**: flag services using print/console.log instead of structured JSON logging -- Cloud Logging requires structured logs for filtering and alerting
- [ ] **Missing error reporting**: flag unhandled exceptions without integration to Cloud Error Reporting -- uncaught errors in Cloud Run silently return 500 without alerting
- [ ] **No timeout on downstream calls**: flag HTTP or gRPC calls from the function/service without explicit timeout -- a hung downstream will consume the entire function timeout

## Common False Positives

- **Intentionally public APIs**: Cloud Run services behind a load balancer with allUsers invoker are legitimate for public APIs. Verify the service has its own application-level authentication if needed.
- **Batch processing with CPU always-allocated**: background job processors and queue consumers legitimately need CPU always-allocated to process between requests.
- **Concurrency 1 for legacy code**: some codebases use thread-unsafe libraries that require concurrency 1. Flag but acknowledge if there is a comment explaining the constraint.
- **Gen1 for event-driven functions**: some event triggers (direct GCS, Pub/Sub) have better Gen1 integration. Gen2 is preferred but Gen1 is not always wrong.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secret value stored as plain environment variable | Critical |
| allUsers invoker on internal-only service | Critical |
| Missing VPC connector for private resource access | Important |
| No timeout configuration on function or service | Important |
| Min instances 0 on latency-sensitive user-facing path | Important |
| Concurrency misconfigured for workload type | Important |
| Missing ingress restriction on internal service | Important |
| Gen1 function when Gen2 is available and suitable | Minor |
| CPU always-allocated without justification comment | Minor |
| Missing structured logging | Minor |

## See Also

- `cloud-gcp-iam-and-workload-identity` -- IAM and service identity for GCP workloads
- `arch-serverless` -- general serverless architecture patterns and anti-patterns
- `sec-secrets-management-and-rotation` -- secret hygiene across platforms
- `reliability-timeout-deadline-propagation` -- timeout propagation in distributed systems

## Authoritative References

- [Google Cloud, "Cloud Run Best Practices"](https://cloud.google.com/run/docs/tips/general)
- [Google Cloud, "Cloud Functions Best Practices"](https://cloud.google.com/functions/docs/bestpractices/tips)
- [Google Cloud, "Using Secret Manager with Cloud Run"](https://cloud.google.com/run/docs/configuring/secrets)
- [Google Cloud, "Serverless VPC Access"](https://cloud.google.com/vpc/docs/configure-serverless-vpc-access)
- [Google Cloud, "Cloud Run Concurrency"](https://cloud.google.com/run/docs/about-concurrency)
