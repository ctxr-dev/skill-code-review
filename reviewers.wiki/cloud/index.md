---
id: cloud
type: index
depth_role: subcategory
depth: 1
focus: "cloud: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps; Detect DynamoDB design pitfalls including hot partition keys, missing GS..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - acl
  - aks
  - api-gateway
  - architecture
  - aurora
  - authorizer
  - autoscaling
  - aws
  - azure
  - backup
  - bucket
  - caching
  - capacity
  - cloud-functions
  - cloud-run
  - cloud-security
  - cloudflare
  - cmk
  - cold-start
  - concurrency
generator: "skill-llm-wiki/v1"
entries:
  - id: cloud-aws-api-gateway
    file: cloud-aws-api-gateway.md
    type: primary
    focus: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps
    tags:
      - aws
      - api-gateway
      - rest-api
      - http-api
      - authorizer
      - waf
      - cors
      - throttling
      - caching
      - validation
  - id: cloud-aws-dynamodb-single-table
    file: cloud-aws-dynamodb-single-table.md
    type: primary
    focus: Detect DynamoDB design pitfalls including hot partition keys, missing GSIs for access patterns, scan-over-query usage, absent TTL on ephemeral data, and capacity mode mismatches
    tags:
      - aws
      - dynamodb
      - single-table
      - partition-key
      - gsi
      - scan
      - query
      - ttl
      - capacity
      - streams
      - lsi
      - hot-partition
      - rcu
      - wcu
      - throttling
  - id: cloud-aws-eventbridge-sqs-sns-kinesis-step-functions
    file: cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md
    type: primary
    focus: Detect messaging and orchestration pitfalls including missing DLQs, absent retry configuration, incorrect visibility timeouts, Kinesis shard sizing, and Step Functions error handling gaps
    tags:
      - aws
      - eventbridge
      - sqs
      - sns
      - kinesis
      - step-functions
      - dlq
      - retry
      - messaging
      - orchestration
  - id: cloud-aws-iam-least-privilege
    file: cloud-aws-iam-least-privilege.md
    type: primary
    focus: Detect overly permissive IAM policies, wildcard actions and resources, missing condition keys, and unsafe trust relationships in AWS IAM configurations
    tags:
      - aws
      - iam
      - least-privilege
      - policy
      - role
      - trust
      - permission-boundary
      - condition-key
  - id: cloud-aws-kms-crypto
    file: cloud-aws-kms-crypto.md
    type: primary
    focus: Detect KMS key misconfigurations including missing rotation, overly broad key policies, absent encryption context, and inefficient data key usage patterns
    tags:
      - aws
      - kms
      - encryption
      - cmk
      - data-key
      - key-rotation
      - envelope-encryption
      - encryption-context
      - cryptography
      - key-management
      - KMS
      - HSM
      - Vault
      - secrets
      - rotation
      - CWE-321
      - CWE-798
      - CWE-320
  - id: cloud-aws-lambda
    file: cloud-aws-lambda.md
    type: primary
    focus: "Detect Lambda configuration pitfalls including cold start risk, timeout/memory misconfiguration, missing dead-letter queues, secrets in environment variables, and VPC networking traps"
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
  - id: cloud-aws-rds-aurora
    file: cloud-aws-rds-aurora.md
    type: primary
    focus: Detect RDS and Aurora misconfigurations including missing Multi-AZ, public accessibility, absent encryption, missing connection pooling, and inadequate backup and monitoring settings
    tags:
      - aws
      - rds
      - aurora
      - multi-az
      - encryption
      - backup
      - proxy
      - monitoring
      - read-replica
      - deletion-protection
  - id: cloud-aws-s3
    file: cloud-aws-s3.md
    type: primary
    focus: Detect S3 bucket misconfigurations including public access exposure, missing encryption, permissive bucket policies, absent versioning, and overly broad CORS rules
    tags:
      - aws
      - s3
      - bucket
      - encryption
      - public-access
      - versioning
      - lifecycle
      - cors
      - pre-signed-url
      - acl
  - id: cloud-azure-functions-cosmos-db
    file: cloud-azure-functions-cosmos-db.md
    type: primary
    focus: Detect Azure Functions missing managed identity, Cosmos DB partition key and RU misconfigurations, cold start issues, and consistency level mismatches
    tags:
      - azure
      - functions
      - cosmos-db
      - serverless
      - partition-key
      - consistency
      - cold-start
  - id: cloud-azure-managed-identity-aks
    file: cloud-azure-managed-identity-aks.md
    type: primary
    focus: Detect ClientSecretCredential usage instead of Managed Identity, overly broad Azure RBAC, and AKS cluster misconfigurations for identity and networking
    tags:
      - azure
      - managed-identity
      - aks
      - rbac
      - workload-identity
      - key-vault
      - cloud-security
  - id: cloud-cloudflare-workers-durable-objects-r2-d1
    file: cloud-cloudflare-workers-durable-objects-r2-d1.md
    type: primary
    focus: "Detect Workers KV consistency misunderstanding, Durable Objects misuse, R2/D1 pitfalls, secrets in wrangler.toml, and CPU/subrequest limit violations"
    tags:
      - cloudflare
      - workers
      - durable-objects
      - r2
      - d1
      - kv
      - edge
      - serverless
  - id: cloud-fly-render-railway
    file: cloud-fly-render-railway.md
    type: primary
    focus: Detect missing health checks, absent autoscaling, ephemeral storage misuse, secrets in config files, and single-region deployments on Fly.io, Render, and Railway
    tags:
      - fly
      - render
      - railway
      - paas
      - health-check
      - autoscaling
      - graceful-shutdown
      - deployment
  - id: cloud-gcp-cloud-functions-cloud-run
    file: cloud-gcp-cloud-functions-cloud-run.md
    type: primary
    focus: Detect cold start neglect, missing IAM invoker restrictions, secret leaks in env vars, and misconfigured concurrency in Cloud Functions and Cloud Run
    tags:
      - gcp
      - cloud-functions
      - cloud-run
      - serverless
      - cold-start
      - concurrency
      - iam
  - id: cloud-gcp-iam-and-workload-identity
    file: cloud-gcp-iam-and-workload-identity.md
    type: primary
    focus: Detect overly permissive GCP IAM bindings, primitive role usage, service account key leaks, and missing Workload Identity federation
    tags:
      - gcp
      - iam
      - workload-identity
      - service-account
      - least-privilege
      - cloud-security
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Cloud

**Focus:** cloud: Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps; Detect DynamoDB design pitfalls including hot partition keys, missing GS...

## Children

| File | Type | Focus |
|------|------|-------|
| [cloud-aws-api-gateway.md](cloud-aws-api-gateway.md) | 📄 primary | Detect API Gateway misconfigurations including missing authorizers, absent WAF integration, permissive CORS, missing throttling, and request validation gaps |
| [cloud-aws-dynamodb-single-table.md](cloud-aws-dynamodb-single-table.md) | 📄 primary | Detect DynamoDB design pitfalls including hot partition keys, missing GSIs for access patterns, scan-over-query usage, absent TTL on ephemeral data, and capacity mode mismatches |
| [cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md](cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md) | 📄 primary | Detect messaging and orchestration pitfalls including missing DLQs, absent retry configuration, incorrect visibility timeouts, Kinesis shard sizing, and Step Functions error handling gaps |
| [cloud-aws-iam-least-privilege.md](cloud-aws-iam-least-privilege.md) | 📄 primary | Detect overly permissive IAM policies, wildcard actions and resources, missing condition keys, and unsafe trust relationships in AWS IAM configurations |
| [cloud-aws-kms-crypto.md](cloud-aws-kms-crypto.md) | 📄 primary | Detect KMS key misconfigurations including missing rotation, overly broad key policies, absent encryption context, and inefficient data key usage patterns |
| [cloud-aws-lambda.md](cloud-aws-lambda.md) | 📄 primary | Detect Lambda configuration pitfalls including cold start risk, timeout/memory misconfiguration, missing dead-letter queues, secrets in environment variables, and VPC networking traps |
| [cloud-aws-rds-aurora.md](cloud-aws-rds-aurora.md) | 📄 primary | Detect RDS and Aurora misconfigurations including missing Multi-AZ, public accessibility, absent encryption, missing connection pooling, and inadequate backup and monitoring settings |
| [cloud-aws-s3.md](cloud-aws-s3.md) | 📄 primary | Detect S3 bucket misconfigurations including public access exposure, missing encryption, permissive bucket policies, absent versioning, and overly broad CORS rules |
| [cloud-azure-functions-cosmos-db.md](cloud-azure-functions-cosmos-db.md) | 📄 primary | Detect Azure Functions missing managed identity, Cosmos DB partition key and RU misconfigurations, cold start issues, and consistency level mismatches |
| [cloud-azure-managed-identity-aks.md](cloud-azure-managed-identity-aks.md) | 📄 primary | Detect ClientSecretCredential usage instead of Managed Identity, overly broad Azure RBAC, and AKS cluster misconfigurations for identity and networking |
| [cloud-cloudflare-workers-durable-objects-r2-d1.md](cloud-cloudflare-workers-durable-objects-r2-d1.md) | 📄 primary | Detect Workers KV consistency misunderstanding, Durable Objects misuse, R2/D1 pitfalls, secrets in wrangler.toml, and CPU/subrequest limit violations |
| [cloud-fly-render-railway.md](cloud-fly-render-railway.md) | 📄 primary | Detect missing health checks, absent autoscaling, ephemeral storage misuse, secrets in config files, and single-region deployments on Fly.io, Render, and Railway |
| [cloud-gcp-cloud-functions-cloud-run.md](cloud-gcp-cloud-functions-cloud-run.md) | 📄 primary | Detect cold start neglect, missing IAM invoker restrictions, secret leaks in env vars, and misconfigured concurrency in Cloud Functions and Cloud Run |
| [cloud-gcp-iam-and-workload-identity.md](cloud-gcp-iam-and-workload-identity.md) | 📄 primary | Detect overly permissive GCP IAM bindings, primitive role usage, service account key leaks, and missing Workload Identity federation |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
