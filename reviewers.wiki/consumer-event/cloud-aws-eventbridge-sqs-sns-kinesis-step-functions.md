---
id: cloud-aws-eventbridge-sqs-sns-kinesis-step-functions
type: primary
depth_role: leaf
focus: Detect messaging and orchestration pitfalls including missing DLQs, absent retry configuration, incorrect visibility timeouts, Kinesis shard sizing, and Step Functions error handling gaps
parents:
  - index.md
covers:
  - SQS queue without dead-letter queue
  - Missing visibility timeout tuning
  - SNS subscription without delivery retry policy
  - Kinesis shard count wrong for throughput
  - "Step Functions missing error/retry/catch"
  - EventBridge rule without DLQ on target
  - Missing encryption on SQS or SNS
  - FIFO queue without deduplication ID strategy
  - Kinesis consumer not checkpointing
  - Step Functions task timeout missing
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
activation:
  file_globs:
    - "**/*.tf"
    - "**/*.json"
    - "**/*.yaml"
    - "**/*.yml"
    - "**/cdk.*"
    - "**/*.py"
    - "**/*.ts"
    - "**/*.js"
    - "**/*.java"
    - "**/*.go"
  keyword_matches:
    - EventBridge
    - SQS
    - SNS
    - Kinesis
    - StepFunctions
    - Queue
    - Topic
    - Stream
    - StateMachine
    - EventBus
    - Rule
    - Target
    - Subscription
  structural_signals:
    - sqs_no_dlq
    - step_function_no_catch
    - kinesis_shard_mismatch
source:
  origin: file
  path: cloud-aws-eventbridge-sqs-sns-kinesis-step-functions.md
  hash: "sha256:67c9ec380a6bc34baefd7c4ac89cd6577ac9e4e2aa8869b9b00ce7394cce96b4"
---
# AWS EventBridge, SQS, SNS, Kinesis, and Step Functions

## When This Activates

Activates when diffs contain SQS queues, SNS topics, Kinesis streams, EventBridge rules, or Step Functions state machines. Messaging and orchestration services are the backbone of event-driven architectures -- a missing DLQ means failed messages vanish silently, an incorrect visibility timeout causes duplicate processing, and a Step Functions state without Catch means a single task failure kills the entire workflow. This reviewer catches the configuration gaps that cause data loss and reliability incidents.

## Audit Surface

- [ ] SQS queue with no RedrivePolicy (dead-letter queue)
- [ ] SQS VisibilityTimeout shorter than consumer processing time
- [ ] SNS subscription with no delivery retry policy
- [ ] Kinesis shard count not matching throughput needs
- [ ] Step Functions state with no Retry or Catch block
- [ ] EventBridge target with no DeadLetterConfig
- [ ] SQS queue without encryption (KMS or SSE)
- [ ] SNS topic without KMS encryption
- [ ] FIFO queue without deduplication strategy
- [ ] Kinesis consumer without checkpoint tracking
- [ ] Step Functions Task state with no TimeoutSeconds
- [ ] SQS consumer deleting message before processing completes
- [ ] EventBridge rule matching too broadly
- [ ] Step Functions Express workflow for long-running process

## Detailed Checks

### SQS Queue Configuration
<!-- activation: keywords=["SQS", "sqs", "Queue", "RedrivePolicy", "VisibilityTimeout", "MessageRetentionPeriod", "FIFO", "DeduplicationId", "deadLetterTargetArn"] -->

- [ ] **Missing DLQ**: flag SQS queues with no `RedrivePolicy` -- messages that fail processing are retried indefinitely and then silently dropped after the retention period (default 4 days); configure a DLQ with `maxReceiveCount` to capture poison messages
- [ ] **VisibilityTimeout too short**: flag queues where `VisibilityTimeout` is shorter than the expected consumer processing time -- when the timeout expires before processing completes, the message becomes visible again and another consumer picks it up, causing duplicate processing
- [ ] **Missing encryption**: flag SQS queues without `KmsMasterKeyId` or `SqsManagedSseEnabled` -- messages may contain sensitive data and should be encrypted at rest
- [ ] **FIFO without deduplication**: flag FIFO queues with `ContentBasedDeduplication: false` and no explicit `MessageDeduplicationId` in the send code -- without deduplication, FIFO ordering guarantees are undermined by duplicate sends during retries
- [ ] **Consumer deletes before processing**: flag code that calls `DeleteMessage` before the processing logic completes -- if processing fails after deletion, the message is permanently lost

### SNS Topic and Subscription
<!-- activation: keywords=["SNS", "sns", "Topic", "Subscription", "DeliveryPolicy", "FilterPolicy", "subscribe", "publish"] -->

- [ ] **Missing delivery retry policy**: flag SNS subscriptions (especially HTTP/HTTPS) without a `DeliveryPolicy` specifying retry backoff -- the default retry policy may not match the subscriber's availability pattern, leading to lost notifications
- [ ] **Missing encryption**: flag SNS topics without `KmsMasterKeyId` -- sensitive event data should be encrypted at rest
- [ ] **Missing filter policy**: flag SNS subscriptions without a `FilterPolicy` when the subscriber only needs a subset of messages -- without filtering, the subscriber receives and discards irrelevant messages, wasting compute
- [ ] **Fanout without DLQ**: flag SNS-to-SQS fanout patterns where the destination SQS queues lack DLQs -- a failure in any consumer leg loses that message silently

### Kinesis Stream Configuration
<!-- activation: keywords=["Kinesis", "kinesis", "Stream", "ShardCount", "StreamModeDetails", "ON_DEMAND", "PROVISIONED", "GetRecords", "PutRecord"] -->

- [ ] **Wrong shard count**: flag provisioned Kinesis streams where shard count does not match throughput -- each shard handles 1 MB/s write and 2 MB/s read; under-provisioned streams throttle producers, over-provisioned streams waste cost
- [ ] **Consumer not checkpointing**: flag Kinesis consumer code that processes records without persisting the sequence number (checkpoint) -- on restart, the consumer reprocesses all records from the trim horizon, causing duplicates and latency
- [ ] **No enhanced fan-out for multiple consumers**: flag streams with more than 2 consumers using the default shared throughput model -- shared throughput divides the 2 MB/s read among all consumers; enhanced fan-out provides 2 MB/s per consumer
- [ ] **Missing encryption**: flag Kinesis streams without `StreamEncryption` -- data in transit within the stream should be encrypted with KMS

### EventBridge Rules and Targets
<!-- activation: keywords=["EventBridge", "EventBus", "Rule", "Target", "DetailType", "detail-type", "EventPattern", "DeadLetterConfig"] -->

- [ ] **Target without DLQ**: flag EventBridge rule targets with no `DeadLetterConfig` -- if the target (Lambda, SQS, Step Functions) is unavailable or returns an error, the event is lost; a DLQ captures failed deliveries
- [ ] **Overly broad event pattern**: flag EventBridge rules that match on `detail-type` with no `detail` filter or use a catch-all pattern -- broad rules trigger on unintended events, causing unexpected invocations and cost
- [ ] **Missing retry policy on target**: flag EventBridge targets without `RetryPolicy` configuration -- the default retry policy (24 hours, 185 retries) may be too aggressive or too lenient for the workload

### Step Functions Error Handling
<!-- activation: keywords=["StepFunctions", "StateMachine", "Task", "Retry", "Catch", "TimeoutSeconds", "HeartbeatSeconds", "ResultPath", "Express", "Standard"] -->

- [ ] **Task without Catch**: flag Step Functions Task states with no `Catch` block -- an unhandled error in any task terminates the entire execution; use Catch to route errors to a fallback or cleanup state
- [ ] **Task without Retry**: flag Task states calling external services (Lambda, API, SDK) with no `Retry` block -- transient failures (throttling, timeouts, 5xx) are common and should be retried with exponential backoff
- [ ] **Missing TimeoutSeconds**: flag Task states with no `TimeoutSeconds` -- without a timeout, a hung task (e.g., Lambda that never returns) blocks the execution indefinitely, consuming Step Functions execution time
- [ ] **Express workflow for long process**: flag Express workflow (type: EXPRESS) used for processes that may run longer than 5 minutes -- Express workflows have a 5-minute maximum duration; use Standard workflows for longer processes
- [ ] **Missing HeartbeatSeconds on activity tasks**: flag Activity tasks without `HeartbeatSeconds` -- without heartbeats, a dead worker is not detected until the full timeout expires

## Common False Positives

- **Analytics event streams**: Kinesis streams used purely for analytics ingestion may acceptably use at-least-once processing without strict checkpointing.
- **Non-critical notification topics**: SNS topics for non-critical alerts (developer notifications, monitoring pings) may not need DLQs or delivery retry policies.
- **Step Functions with built-in service integrations**: some AWS SDK integrations in Step Functions have built-in retry behavior. Verify before flagging missing Retry on these.

## Severity Guidance

| Finding | Severity |
|---|---|
| SQS queue without DLQ | Critical |
| Step Functions Task without Catch | Critical |
| SQS consumer deleting message before processing | Critical |
| EventBridge target without DLQ | Important |
| VisibilityTimeout shorter than processing time | Important |
| Step Functions Task without TimeoutSeconds | Important |
| Kinesis consumer without checkpointing | Important |
| Missing encryption on SQS/SNS/Kinesis | Important |
| FIFO queue without deduplication strategy | Important |
| Missing filter policy on SNS subscription | Minor |
| Express workflow for potentially long process | Minor |

## See Also

- `cloud-aws-lambda` -- Lambda is the most common consumer of SQS, SNS, and EventBridge
- `reliability-timeout-deadline-propagation` -- Step Functions timeouts must propagate through task chains
- `cloud-aws-iam-least-privilege` -- IAM policies control which services can publish/consume
- `cloud-aws-kms-crypto` -- encryption on messaging services uses KMS
- `arch-serverless` -- event-driven patterns are core to serverless architectures

## Authoritative References

- [AWS SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)
- [AWS Step Functions Best Practices](https://docs.aws.amazon.com/step-functions/latest/dg/bp-express.html)
- [AWS EventBridge Best Practices](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-best-practices.html)
- [AWS Kinesis Best Practices](https://docs.aws.amazon.com/streams/latest/dev/kinesis-record-processor-additional-considerations.html)
