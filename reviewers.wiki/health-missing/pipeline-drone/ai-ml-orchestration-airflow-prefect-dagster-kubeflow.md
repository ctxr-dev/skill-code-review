---
id: ai-ml-orchestration-airflow-prefect-dagster-kubeflow
type: primary
depth_role: leaf
focus: Detect DAG import side effects, oversized tasks, missing retries on transient failures, hardcoded connections, and absent failure alerting in ML pipeline orchestrators
parents:
  - index.md
covers:
  - "DAG file with import-time side effects (network calls, heavy computation)"
  - Task too large -- should be broken into smaller units
  - "Missing retries on transient failures (network, API rate limit)"
  - "Hardcoded connection strings, credentials, or URLs in DAG/flow code"
  - No alerting on task or pipeline failure
  - No idempotency in task execution
  - Pipeline without data quality checks between stages
tags:
  - orchestration
  - Airflow
  - Prefect
  - Dagster
  - Kubeflow
  - DAG
  - pipeline
  - retry
  - idempotency
  - alerting
activation:
  file_globs:
    - "**/*dag*"
    - "**/*pipeline*"
    - "**/*flow*"
    - "**/*workflow*"
    - "**/*airflow*"
    - "**/*prefect*"
    - "**/*dagster*"
    - "**/*kubeflow*"
  keyword_matches:
    - DAG
    - dag
    - airflow
    - prefect
    - dagster
    - kubeflow
    - task
    - flow
    - pipeline
    - schedule
    - retry
    - retries
    - on_failure_callback
    - sensor
    - operator
    - PythonOperator
    - "@task"
    - "@flow"
    - "@op"
    - "@asset"
  structural_signals:
    - dag_import_side_effect
    - task_too_large
    - hardcoded_connection
source:
  origin: file
  path: ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md
  hash: "sha256:62e483ada93364506f54bf8cb893e9f5fc44cbd9bf2ac5266018eded4a5df4d6"
---
# ML Pipeline Orchestration (Airflow, Prefect, Dagster, Kubeflow)

## When This Activates

Activates when diffs contain DAG definitions, task/flow/op implementations, pipeline scheduling, or orchestrator configuration. ML pipelines orchestrated by Airflow, Prefect, Dagster, or Kubeflow run unsupervised -- a missing retry silently drops data, a hardcoded credential blocks deployment, and an import-time side effect slows every DAG parse. This reviewer catches orchestration-specific pitfalls that general code review misses.

## Audit Surface

- [ ] DAG file with import-time side effects
- [ ] Single task performing too many operations
- [ ] Task with no retry configuration
- [ ] Hardcoded connections or credentials
- [ ] No alerting on failure
- [ ] Non-idempotent task execution
- [ ] No data validation between stages
- [ ] Task with no timeout
- [ ] Dependency on specific file paths
- [ ] No unit tests for task logic

## Detailed Checks

### DAG/Flow Definition Hygiene
<!-- activation: keywords=["DAG", "dag", "with DAG", "@dag", "schedule", "schedule_interval", "catchup", "start_date", "default_args"] -->

- [ ] **Import-time side effects**: flag DAG files that execute database queries, API calls, file reads, or heavy computations at module import time -- Airflow's scheduler parses DAG files every 30 seconds; import-time side effects execute on every parse cycle, wasting resources and causing intermittent failures
- [ ] **Catchup not explicitly set**: flag Airflow DAGs without `catchup=False` (or explicitly `True` with intent) -- default catchup=True backfills all missed intervals on DAG creation, potentially launching hundreds of task instances
- [ ] **No schedule documentation**: flag DAGs or flows with complex scheduling but no comments explaining the business reason for the schedule

### Task Granularity and Design
<!-- activation: keywords=["task", "operator", "PythonOperator", "@task", "@op", "@asset", "execute", "run", "callable"] -->

- [ ] **Task too large**: flag single tasks that perform multiple logical operations (extract + transform + load, or train + evaluate + deploy) -- break into separate tasks for independent retry, monitoring, and parallelism
- [ ] **Non-idempotent task**: flag tasks that produce different results or side effects on re-execution (append instead of upsert, send duplicate notifications) -- orchestrators retry failed tasks; non-idempotent tasks cause data duplication or repeated side effects
- [ ] **Task with no timeout**: flag tasks without `execution_timeout` (Airflow), timeout configuration (Prefect), or equivalent -- a hung task blocks the pipeline and consumes a worker slot indefinitely (see `reliability-timeout-deadline-propagation`)

### Retry and Failure Handling
<!-- activation: keywords=["retry", "retries", "retry_delay", "on_failure", "on_failure_callback", "alert", "email", "slack", "pagerduty", "catch", "except"] -->

- [ ] **No retries on external calls**: flag tasks making network calls, API requests, or database operations with `retries=0` or no retry configuration -- transient failures (network timeout, rate limit, temporary unavailability) are common and recoverable
- [ ] **No failure alerting**: flag pipelines with no `on_failure_callback`, email notification, or alerting integration -- silent failures mean data does not arrive and nobody notices until downstream consumers complain
- [ ] **No data validation between stages**: flag pipelines where output of one stage flows to the next without schema or quality validation -- corrupt data propagates through the entire pipeline before being detected

### Configuration and Secrets
<!-- activation: keywords=["connection", "conn_id", "Variable", "Secret", "credential", "password", "host", "url", "hardcode"] -->

- [ ] **Hardcoded connections**: flag connection strings, database URLs, API endpoints, or credentials as string literals in DAG/flow code -- use Airflow Connections, Prefect Blocks, Dagster Resources, or environment variables
- [ ] **Hardcoded file paths**: flag absolute file paths instead of configurable storage abstractions -- hardcoded paths break when moving between environments (dev, staging, production)

### Testing and Observability
<!-- activation: keywords=["test", "assert", "mock", "unit_test", "integration", "log", "metric", "trace", "monitor", "observability"] -->

- [ ] **No unit tests for task logic**: flag complex task logic (data transformations, validation rules) with no unit tests -- orchestrator tasks are often tested only by running the full pipeline; extract and test the core logic independently
- [ ] **No pipeline run metadata**: flag pipeline executions that do not record execution duration, data volumes processed, or resource utilization -- without metadata, capacity planning and performance optimization are guesswork
- [ ] **No SLA monitoring**: flag production pipelines with no SLA tracking (expected completion time vs actual) -- late-arriving data impacts downstream consumers silently without SLA monitoring

## Common False Positives

- **Local development DAGs**: DAGs running only in local development may use hardcoded paths and skip alerting. Flag with a note but do not treat as Critical.
- **One-time migration DAGs**: DAGs for one-time data migrations do not need the same retry and alerting rigor as recurring production pipelines.
- **Dagster assets vs tasks**: Dagster's asset-based model has different granularity expectations than Airflow tasks. Verify the orchestrator's paradigm before flagging task size.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded credentials in DAG/flow code | Critical |
| DAG import-time side effects (API calls, DB queries) | Important |
| No failure alerting on production pipeline | Important |
| No retries on tasks with external calls | Important |
| Non-idempotent task in pipeline with retries | Important |
| Task with no timeout | Minor |
| No data validation between pipeline stages | Minor |
| Single oversized task (should be decomposed) | Minor |

## See Also

- `ai-ml-experiment-tracking-mlflow-wandb` -- training tasks in orchestrators should track experiments
- `ai-ml-data-pipelines-pandas-polars-dask-spark` -- data transformation within orchestrated tasks
- `reliability-timeout-deadline-propagation` -- task timeouts are deadline propagation
- `principle-fail-fast` -- data validation between stages is fail-fast for pipelines
- `principle-separation-of-concerns` -- monolithic tasks violate separation of concerns

## Authoritative References

- [Apache Airflow, "Best Practices"](https://airflow.apache.org/docs/apache-airflow/stable/best-practices.html)
- [Prefect Documentation](https://docs.prefect.io/)
- [Dagster Documentation, "Best Practices"](https://docs.dagster.io/)
- [Kubeflow Pipelines Documentation](https://www.kubeflow.org/docs/components/pipelines/)
