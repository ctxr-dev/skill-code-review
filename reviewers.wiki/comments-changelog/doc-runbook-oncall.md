---
id: doc-runbook-oncall
type: primary
depth_role: leaf
focus: Detect missing, incomplete, or stale runbooks for services, ensuring on-call engineers have actionable operational documentation
parents:
  - index.md
covers:
  - New service deployed without a corresponding runbook
  - Runbook missing escalation path or contact information
  - Runbook containing stale commands, URLs, or hostnames
  - Runbook missing rollback procedure for deployments
  - Runbook missing links to monitoring dashboards and alerting rules
  - Runbook that has not been tested or validated against the current environment
  - Runbook missing severity classification for incidents
  - Runbook with no troubleshooting decision tree or symptom-to-action mapping
tags:
  - runbook
  - oncall
  - operations
  - incident-response
  - documentation
  - sre
  - reliability
  - rollback
  - monitoring
activation:
  file_globs:
    - "**/runbook*"
    - "**/runbooks/**"
    - "**/oncall/**"
    - "**/ops/**"
    - "**/operations/**"
    - "**/incident/**"
    - "**/playbook*"
    - "**/Dockerfile"
    - "**/docker-compose*"
    - "**/k8s/**"
    - "**/deploy/**"
  keyword_matches:
    - runbook
    - playbook
    - oncall
    - on-call
    - escalation
    - rollback
    - incident
    - pagerduty
    - PagerDuty
    - opsgenie
    - OpsGenie
    - alerting
  structural_signals:
    - New service or deployment configuration added
    - New Dockerfile or Kubernetes manifest
    - Infrastructure change affecting operational procedures
source:
  origin: file
  path: doc-runbook-oncall.md
  hash: "sha256:93d6540596f22cdd6438bfb5be39f346b3741f812eb633f5f33d30cf50cda5b5"
---
# Runbook and On-Call Documentation

## When This Activates

Activates when diffs add new services (Dockerfiles, deployment manifests, new service directories), modify runbook files, or change operational configuration (alerting rules, health checks, deployment pipelines). A runbook is the on-call engineer's lifeline during an incident. Missing runbooks mean improvisation under pressure. Stale runbooks mean following instructions that make things worse. This reviewer ensures every deployable service has a current, actionable runbook.

## Audit Surface

- [ ] New service, deployment, or Dockerfile added with no runbook in the docs
- [ ] Runbook references a hostname, URL, or IP address that is hardcoded and likely stale
- [ ] Runbook has no escalation path section (who to contact, in what order)
- [ ] Runbook has no rollback procedure for the service's deployment
- [ ] Runbook has no links to Grafana, Datadog, PagerDuty, or equivalent monitoring dashboards
- [ ] Runbook commands reference deprecated CLI tools or old API versions
- [ ] Runbook lacks a "last tested" date or has not been reviewed in 6+ months
- [ ] Runbook has no severity triage guidance (how to classify P1 vs P2 vs P3)
- [ ] Runbook contains TODO or placeholder sections indicating incomplete documentation
- [ ] Runbook does not describe the service's health check endpoint or liveness probe
- [ ] Runbook has no symptom-to-action table mapping alerts to remediation steps
- [ ] Runbook does not mention feature flags or circuit breakers available for mitigation

## Detailed Checks

### Runbook Existence for Deployable Services
<!-- activation: file_globs=["**/Dockerfile", "**/docker-compose*", "**/k8s/**", "**/deploy/**"], keywords=["service", "deployment", "deploy"] -->

- [ ] Every service with a Dockerfile, Kubernetes manifest, or deployment configuration has a corresponding runbook document -- the service cannot be supported by on-call without one
- [ ] Runbook is discoverable: located in a standard path (docs/runbooks/, ops/, or linked from the service's README) and named to match the service
- [ ] For monorepos with multiple services: each service has its own runbook, not a single monolithic document covering everything
- [ ] Shared infrastructure components (databases, message brokers, caches) referenced by services have their own runbooks or are covered in a shared operations guide

### Escalation and Contact Information
<!-- activation: keywords=["escalation", "contact", "team", "owner", "pagerduty", "opsgenie", "slack", "oncall", "on-call"] -->

- [ ] Runbook names the owning team and provides a way to reach them (Slack channel, PagerDuty service, email distribution list)
- [ ] Escalation path is explicit: who to contact first, who to escalate to if the first responder cannot resolve, and how to engage management for customer-impacting incidents
- [ ] Contact information is maintained via links to a team directory or PagerDuty schedule rather than hardcoded names that go stale when people change teams
- [ ] Cross-team dependencies are documented: if this service depends on another team's service, the runbook explains how to engage that team

### Rollback and Recovery Procedures
<!-- activation: keywords=["rollback", "revert", "recovery", "restore", "deploy", "release", "canary", "blue-green", "feature flag"] -->

- [ ] Rollback procedure describes exact steps to revert to the previous version -- not "rollback the deployment" but the specific commands or UI steps
- [ ] Rollback procedure accounts for database migrations: if the deployment includes a migration, the runbook explains whether it is backward-compatible or requires a migration rollback
- [ ] Feature flags and circuit breakers available for partial mitigation are listed with instructions on how to toggle them
- [ ] Recovery time estimates are provided so the on-call engineer can decide between rollback, hotfix, or waiting for a full fix
- [ ] Canary or staged rollout procedures are documented if the service uses progressive delivery

### Monitoring and Observability Links
<!-- activation: keywords=["grafana", "datadog", "prometheus", "cloudwatch", "alert", "dashboard", "monitor", "metric", "log", "trace"] -->

- [ ] Runbook links to the service's primary monitoring dashboard (Grafana, Datadog, CloudWatch) -- not a generic cluster dashboard but one scoped to this service
- [ ] Key metrics to check during an incident are listed: latency percentiles, error rates, throughput, saturation, and any service-specific business metrics
- [ ] Log aggregation query or link is provided so the on-call engineer can access relevant logs without constructing queries from scratch
- [ ] Alerting rules are referenced: which alerts map to this runbook, and what each alert means
- [ ] Distributed tracing entry point is documented for services in a microservices architecture

### Symptom-to-Action Mapping
<!-- activation: keywords=["symptom", "alert", "error", "timeout", "crash", "OOM", "disk", "CPU", "memory", "latency", "5xx", "4xx"] -->

- [ ] Runbook contains a table or decision tree mapping common symptoms (high latency, 5xx spike, OOM kills, disk full, connection pool exhaustion) to specific remediation steps
- [ ] Each remediation step is actionable and imperative: "Run `kubectl rollout undo deployment/order-service`" not "Consider rolling back"
- [ ] Remediation steps distinguish between temporary mitigation (restart the pod, increase replicas) and root-cause fixes (deploy a patch, fix the query)
- [ ] Known failure modes specific to this service are documented with their signatures and fixes

## Common False Positives

- **Development-only services**: Local development tools, test harnesses, and CI-only containers do not need operational runbooks. Flag only services that run in staging or production.
- **Serverless functions**: Lightweight serverless functions (Lambda, Cloud Functions) may not need full runbooks if they are covered by platform-level monitoring and auto-recovery. Flag only if the function handles critical business logic.
- **Runbook in external system**: Some teams maintain runbooks in Confluence, Notion, or PagerDuty itself rather than in the repo. If the README links to an external runbook, do not flag as missing.
- **Infra-as-code with self-healing**: Services with robust auto-scaling, auto-restart, and circuit breakers may need lighter runbooks. The runbook should still exist but can be shorter.

## Severity Guidance

| Finding | Severity |
|---|---|
| Production service with no runbook at all | Critical |
| Runbook rollback procedure references commands that no longer work | Important |
| Runbook has no escalation path | Important |
| Runbook monitoring links point to deleted or renamed dashboards | Important |
| Runbook contains TODO or placeholder sections for critical procedures | Important |
| Runbook has not been reviewed in 6+ months | Minor |
| Runbook missing feature flag or circuit breaker documentation | Minor |
| Runbook has no severity triage guidance | Minor |
| Runbook hardcodes hostnames instead of using environment-aware links | Minor |

## See Also

- `doc-readme-root` -- the service README should link to its runbook; operational information does not belong in the README itself
- `pr-description-quality` -- PRs deploying new services should mention the runbook in their description
- `doc-adr-discipline` -- architectural decisions affecting operational procedures (e.g., choosing eventual consistency) should inform runbook content
- `principle-fail-fast` -- services that fail fast surface issues earlier, and runbooks should document expected failure modes

## Authoritative References

- [Google SRE Book, Chapter 14: Managing Incidents](https://sre.google/sre-book/managing-incidents/)
- [PagerDuty Incident Response Documentation](https://response.pagerduty.com/)
- [Increment Magazine: On-Call](https://increment.com/on-call/)
- [AWS Well-Architected Framework: Operational Excellence -- Runbook](https://docs.aws.amazon.com/wellarchitected/latest/operational-excellence-pillar/welcome.html)
