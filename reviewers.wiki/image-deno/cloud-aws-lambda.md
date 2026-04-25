---
id: cloud-aws-lambda
type: primary
depth_role: leaf
focus: "Detect Lambda configuration pitfalls including cold start risk, timeout/memory misconfiguration, missing dead-letter queues, secrets in environment variables, and VPC networking traps"
parents:
  - index.md
covers:
  - Cold start not mitigated for latency-sensitive function
  - Timeout too short or excessively long for workload
  - Memory undersized causing CPU throttling
  - "/tmp storage assumptions without cleanup"
  - VPC Lambda without NAT gateway losing internet access
  - Missing DLQ or on-failure destination on async invoke
  - Secrets stored in environment variables instead of Secrets Manager
  - Handler doing too much initialization outside the handler function
  - No X-Ray tracing enabled
  - Reserved concurrency set to zero or missing concurrency controls
  - Lambda function with heavy initialization and no cold start mitigation
  - Single function doing too much -- monolith-in-a-lambda or mini-monolith
  - Missing timeout configuration on function or downstream calls
  - "Local state (in-memory variable, file system) reused across invocations"
  - "Function package exceeding recommended size limits (250 MB unzipped)"
  - Synchronous chaining of functions without async orchestration
  - Missing idempotency for event-triggered functions
  - "Hard-coded secrets or configuration instead of parameter store/env injection"
  - No concurrency limit or throttling -- unbounded scaling causes downstream overload
  - Long-running operation executed within a function timeout constraint
tags:
  - aws
  - lambda
  - serverless
  - cold-start
  - timeout
  - memory
  - dlq
  - vpc
  - secrets
  - tracing
  - function
  - stateless
  - architecture
aliases:
  - arch-serverless
activation:
  file_globs:
    - "**/*.tf"
    - "**/serverless.yml"
    - "**/template.yaml"
    - "**/cdk.*"
  keyword_matches:
    - Lambda
    - lambda
    - handler
    - FunctionName
    - Runtime
    - Timeout
    - MemorySize
    - Layers
    - Concurrency
    - Provisioned
  structural_signals:
    - lambda_function
    - serverless_function
    - async_invoke_without_dlq
source:
  origin: file
  path: cloud-aws-lambda.md
  hash: "sha256:41eb81eca7118de8a2fe0a8b03050d8b93bca2055dabf81ea45b525840eb724a"
---
# AWS Lambda

## When This Activates

Activates when diffs contain Lambda function definitions, serverless framework configurations, SAM templates with Lambda resources, or CDK Lambda constructs. Lambda's pay-per-invocation model and ephemeral execution environment create unique pitfalls -- undersized memory throttles CPU (they scale together), VPC attachment without NAT silently breaks outbound calls, and missing DLQs cause silent data loss on async invocations. This reviewer catches configuration-level mistakes that cause production incidents.

## Audit Surface

- [ ] Latency-sensitive Lambda with no provisioned concurrency
- [ ] Timeout set to default 3s for complex workloads or above 60s without justification
- [ ] MemorySize below 256 MB for CPU-intensive function
- [ ] Code writing to /tmp without size checks or cleanup
- [ ] Lambda in VPC without NAT gateway or VPC endpoint
- [ ] Async invocation with no DLQ or on-failure destination
- [ ] Environment variables containing secrets, keys, or tokens
- [ ] Heavy initialization (DB connections, SDK clients) inside handler function
- [ ] TracingConfig missing or set to PassThrough
- [ ] No reserved or provisioned concurrency configured
- [ ] Lambda layer not pinned to version
- [ ] Function URL without auth type IAM
- [ ] Runtime set to deprecated version

## Detailed Checks

### Cold Start and Concurrency
<!-- activation: keywords=["ProvisionedConcurrency", "provisioned_concurrency", "ReservedConcurrency", "reserved_concurrent", "cold_start", "warmup", "snap_start"] -->

- [ ] **No provisioned concurrency for latency-sensitive paths**: flag Lambda functions behind synchronous API Gateway routes or in request-response chains that do not configure provisioned concurrency -- cold starts add 500ms-10s of latency depending on runtime and VPC attachment
- [ ] **Reserved concurrency set to zero**: flag reserved concurrency explicitly set to 0, which effectively disables the function -- this is sometimes done accidentally during incident response and never reverted
- [ ] **No concurrency controls**: flag functions with no reserved or provisioned concurrency in high-throughput paths -- without reservation, one function can starve others of the account-level concurrency pool (default 1,000)

### Timeout and Memory Sizing
<!-- activation: keywords=["Timeout", "timeout", "MemorySize", "memory_size", "memory", "Duration"] -->

- [ ] **Default timeout on complex function**: flag Timeout left at the 3-second default for functions that call external APIs, databases, or other Lambda functions -- a single slow dependency causes timeout failures
- [ ] **Excessive timeout**: flag Timeout above 60 seconds without clear justification -- long timeouts mask hung connections and increase cost; if processing genuinely takes minutes, consider Step Functions
- [ ] **Memory too low for CPU-bound work**: flag MemorySize below 256 MB for functions doing JSON parsing, image processing, data transformation, or crypto -- Lambda allocates CPU proportional to memory; 128 MB gets a fraction of a vCPU
- [ ] **Memory not power-of-two optimized**: while not required, memory values that are not multiples of 64 MB may not optimize price-performance; flag MemorySize values like 129 or 300 as suspicious

### VPC and Networking
<!-- activation: keywords=["VpcConfig", "vpc_config", "SubnetIds", "SecurityGroupIds", "subnet", "security_group", "NAT", "VPC"] -->

- [ ] **VPC Lambda without NAT**: flag Lambda functions with VpcConfig that reference only private subnets without a NAT gateway or VPC endpoint for the services they call -- the function silently loses internet access and all external API calls timeout
- [ ] **Missing VPC endpoints**: flag VPC Lambdas calling AWS services (S3, DynamoDB, SQS, Secrets Manager) without corresponding VPC endpoints -- traffic routes through NAT at extra cost and latency; VPC endpoints are faster and cheaper
- [ ] **All subnets in one AZ**: flag VPC Lambda with all subnets in a single availability zone -- if that AZ has issues, the function cannot be invoked

### Async Invocation and Error Handling
<!-- activation: keywords=["DLQ", "DeadLetterConfig", "dead_letter", "OnFailure", "OnSuccess", "EventInvokeConfig", "MaximumRetryAttempts", "async"] -->

- [ ] **Missing DLQ or on-failure destination**: flag Lambda functions invoked asynchronously (by S3, SNS, EventBridge, or direct async invoke) with no DeadLetterConfig or EventInvokeConfig OnFailure destination -- failed events are silently dropped after retries
- [ ] **Default retry count on async**: flag async-invoked functions with MaximumRetryAttempts left at the default (2) when the function is not idempotent -- retries will cause duplicate processing; set to 0 and rely on DLQ, or make the function idempotent

### Secrets and Environment Variables
<!-- activation: keywords=["Environment", "Variables", "SECRET", "KEY", "TOKEN", "PASSWORD", "API_KEY", "DB_PASSWORD", "environment"] -->

- [ ] **Secrets in environment variables**: flag environment variable values or names containing SECRET, KEY, TOKEN, PASSWORD, API_KEY, or DB_ patterns -- use AWS Secrets Manager or SSM Parameter Store with the Lambda extension for cached retrieval
- [ ] **No encryption on environment variables**: flag Lambda functions with environment variables but no KmsKeyArn configured for at-rest encryption of those variables

### Initialization and Observability
<!-- activation: keywords=["handler", "def handler", "exports.handler", "TracingConfig", "tracing_config", "X-Ray", "xray", "Layers", "layers"] -->

- [ ] **Heavy init inside handler**: flag database connection creation, SDK client instantiation, or large file reads inside the handler function body instead of at module scope -- these run on every invocation instead of being reused across warm invocations
- [ ] **Missing X-Ray tracing**: flag TracingConfig absent or set to PassThrough -- Active tracing is essential for diagnosing cold starts, downstream latency, and error rates in production
- [ ] **Layer not version-pinned**: flag Lambda layer references without a specific version ARN -- unpinned layers can change underneath the function causing unexpected behavior

## Common False Positives

- **Scheduled/cron functions**: Lambda functions triggered by EventBridge schedules at low frequency do not need provisioned concurrency -- cold start latency is acceptable for background jobs.
- **Low-memory utility functions**: simple routing or validation functions that do minimal computation are fine at 128 MB.
- **Non-VPC functions**: functions that only call AWS APIs and public endpoints do not need VPC attachment. Do not flag the absence of VPC config as an issue.

## Severity Guidance

| Finding | Severity |
|---|---|
| Secrets in environment variables in plaintext | Critical |
| Async invocation with no DLQ or on-failure destination | Critical |
| VPC Lambda without NAT gateway or VPC endpoint | Important |
| Function URL without auth type IAM | Important |
| Timeout left at 3s default on complex function | Important |
| Memory undersized for CPU-bound workload | Important |
| Heavy initialization inside handler function | Important |
| Missing X-Ray tracing | Minor |
| Layer not version-pinned | Minor |
| Reserved concurrency not configured | Minor |

## See Also

- `arch-serverless` -- broader serverless architecture patterns and anti-patterns
- `reliability-timeout-deadline-propagation` -- Lambda timeouts must propagate through call chains
- `sec-secrets-management-and-rotation` -- secrets should use Secrets Manager, not env vars
- `cloud-aws-iam-least-privilege` -- Lambda execution role should follow least privilege
- `cloud-aws-api-gateway` -- API Gateway is the most common synchronous trigger for Lambda

## Authoritative References

- [AWS Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [AWS Lambda Power Tuning](https://github.com/alexcasalboni/aws-lambda-power-tuning)
- [AWS Lambda Operator Guide](https://docs.aws.amazon.com/lambda/latest/operatorguide/)
- [AWS Well-Architected Serverless Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/)
