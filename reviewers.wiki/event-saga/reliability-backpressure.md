---
id: reliability-backpressure
type: primary
depth_role: leaf
focus: Detect unbounded queues, missing flow control between producer and consumer, and message loss under load
parents:
  - index.md
covers:
  - Unbounded in-memory queue growing without limit under load
  - Producer faster than consumer with no throttling or feedback mechanism
  - Missing flow control causing OOM or disk exhaustion
  - Dropped messages under load with no dead-letter or overflow strategy
  - Reactive stream with no backpressure signal propagation
  - Thread pool task queue growing unbounded when all threads are busy
  - Event emitter with no subscriber capacity check
  - Database write buffer growing unbounded on slow flush
  - HTTP request queue with no depth limit behind a reverse proxy
tags:
  - backpressure
  - flow-control
  - queue
  - bounded
  - producer-consumer
  - reactive
  - throttle
  - overflow
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs}"
  keyword_matches:
    - queue
    - Queue
    - channel
    - Channel
    - buffer
    - Buffer
    - backpressure
    - flow control
    - producer
    - consumer
    - prefetch
    - unbounded
    - LinkedBlockingQueue
    - ConcurrentLinkedQueue
    - BlockingQueue
    - Observable
    - Flux
    - Flow
    - Subject
    - EventEmitter
    - throttle
    - rate limit
  structural_signals:
    - unbounded_queue_creation
    - producer_without_capacity_check
    - reactive_stream_without_backpressure
source:
  origin: file
  path: reliability-backpressure.md
  hash: "sha256:79a38e85e4df8593c419e318f7c54304f61e136ad37942a243fed9be26a1d834"
---
# Backpressure

## When This Activates

Activates when diffs introduce queues, channels, buffers, reactive streams, event emitters, or producer-consumer patterns. Backpressure is the mechanism by which a slow consumer signals the producer to slow down. Without it, a fast producer overwhelms a slow consumer, causing unbounded memory growth (OOM), message loss, or cascading latency spikes.

## Audit Surface

- [ ] In-memory queue created with no capacity bound
- [ ] Producer pushes without checking capacity or awaiting space
- [ ] Consumer falls behind with no rate feedback or throttle
- [ ] Thread pool uses unbounded task queue
- [ ] Reactive stream with no backpressure strategy configured
- [ ] Event emitter fires regardless of subscriber speed
- [ ] Broker consumer prefetch too high -- messages buffer in memory
- [ ] No dead-letter queue for rejected messages
- [ ] HTTP server has no concurrency or queue depth limit
- [ ] Write buffer grows in memory with no flush threshold
- [ ] No metric on queue depth or consumer lag
- [ ] Async generator yields faster than consumer awaits

## Detailed Checks

### Unbounded Queues and Buffers
<!-- activation: keywords=["queue", "Queue", "buffer", "Buffer", "list", "List", "channel", "Channel", "LinkedList", "ArrayList", "deque", "ring"] -->

- [ ] **Unbounded in-memory queue**: `new LinkedBlockingQueue()` (no capacity), `Channel.UNLIMITED`, `asyncio.Queue()` with no maxsize, or `make(chan T)` with no buffer size -- under sustained producer-faster-than-consumer, this grows until OOM
- [ ] **Unbounded thread pool queue**: `ThreadPoolExecutor` or equivalent uses an unbounded task queue -- when all threads are busy, tasks queue indefinitely; use a bounded queue with a rejection policy
- [ ] **Unbounded write buffer**: batch insert buffer, log buffer, or serialization buffer accumulates in memory with no size cap or periodic flush -- a slow downstream causes memory exhaustion
- [ ] **No eviction or overflow policy**: when the queue is full, there is no defined behavior (drop oldest, drop newest, block producer, raise error) -- the code does not handle the full-queue case

### Producer-Consumer Flow Control
<!-- activation: keywords=["producer", "consumer", "publish", "subscribe", "push", "pull", "send", "receive", "enqueue", "dequeue", "put", "take", "offer", "poll"] -->

- [ ] **Fire-and-forget producer**: producer pushes items to a queue and never checks whether the queue accepted them -- `offer()` returning false or `trySend()` failing is not handled
- [ ] **No pause/resume mechanism**: when the consumer is slow, there is no way to signal the producer to pause -- the producer runs at full speed regardless of consumer capacity
- [ ] **Consumer prefetch too high**: message broker consumer sets prefetch/QoS to a large value (1000+), pulling messages into memory faster than they can be processed -- use a low prefetch (1-10) for flow control
- [ ] **Fan-out with no per-subscriber backpressure**: an event is broadcast to N subscribers; a slow subscriber has no way to signal the publisher, and its internal buffer grows unbounded

### Reactive Stream Backpressure
<!-- activation: keywords=["Flux", "Mono", "Observable", "Flowable", "Flow", "Subject", "backpressure", "onBackpressure", "request", "demand", "subscription", "Subscriber"] -->

- [ ] **No backpressure strategy**: reactive stream (Flux, Observable, Flow) has no `onBackpressureBuffer`, `onBackpressureDrop`, or `onBackpressureLatest` -- default behavior may throw MissingBackpressureException or buffer unbounded
- [ ] **Hot source with no overflow handling**: a hot observable or Subject emits regardless of subscriber demand -- slow subscribers lose events with no error
- [ ] **Buffer strategy without bound**: `onBackpressureBuffer()` is used but with no capacity limit -- this is just an unbounded queue hiding behind a reactive operator
- [ ] **Request(Long.MAX_VALUE)**: subscriber requests unlimited elements, disabling backpressure entirely -- the publisher pushes at full speed

### Load Shedding Under Overload
<!-- activation: keywords=["drop", "reject", "shed", "overflow", "dead letter", "DLQ", "discard", "throttle", "rate", "limit", "admission"] -->

- [ ] **No dead-letter queue**: messages rejected due to queue full or processing failure have no dead-letter destination -- they are silently lost with no recovery path
- [ ] **Drop with no metric**: messages are dropped under load but no counter or metric tracks the drop rate -- the data loss is invisible to operations
- [ ] **No priority shedding**: under overload, all messages are treated equally -- high-priority messages should be preserved while low-priority messages are shed first
- [ ] **HTTP server accepts all requests**: web server has no concurrency limit or request queue bound -- under spike load, all requests slow down instead of rejecting excess cleanly

## Common False Positives

- **Bounded queues with appropriate capacity**: a queue with a reasonable capacity limit and a defined rejection/blocking policy already provides backpressure. Do not flag queues that have explicit bounds.
- **Pull-based consumers**: Kafka consumers, SQS polling consumers, and similar pull-based models have natural backpressure -- the consumer fetches at its own pace. Flag only if prefetch configuration is excessive.
- **In-memory caches with eviction**: caches (LRU, TTL-based) are bounded by design. A cache is not a queue; do not flag cache data structures as unbounded buffers.
- **Short-lived batch operations**: a batch job that loads a known-size dataset into memory is not an unbounded queue. Flag only if the dataset size is dynamic and unbounded.

## Severity Guidance

| Finding | Severity |
|---|---|
| Unbounded in-memory queue on a high-throughput path (OOM risk) | Critical |
| Producer faster than consumer with no flow control on request path | Critical |
| Reactive stream with no backpressure strategy (MissingBackpressureException) | Important |
| Thread pool with unbounded task queue | Important |
| Message broker prefetch set to 1000+ without matching processing capacity | Important |
| No dead-letter queue for rejected or failed messages | Important |
| Messages dropped under load with no metric tracking | Minor |
| Write buffer with no flush threshold (only flushes on shutdown) | Minor |
| No queue depth metric for capacity planning | Minor |

## See Also

- `reliability-bulkhead-isolation` -- bulkhead limits outbound concurrency; backpressure limits inbound flow
- `reliability-load-shedding` -- load shedding rejects at the front door; backpressure signals between internal components
- `reliability-graceful-degradation` -- backpressure is a mechanism for graceful degradation under load
- `pattern-producer-consumer` -- producer-consumer pattern must include backpressure; this reviewer enforces that discipline
- `sec-rate-limit-and-dos` -- rate limiting at the API layer is a form of external backpressure

## Authoritative References

- [Reactive Streams Specification](https://www.reactive-streams.org/)
- [Martin Thompson, "Applying Back Pressure When Overloaded" (Mechanical Sympathy, 2012)](https://mechanical-sympathy.blogspot.com/2012/05/apply-back-pressure-when-overloaded.html)
- [Jay Kreps, "The Log: What every software engineer should know" (2013)](https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying)
- [Google SRE Book, Chapter 22: "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/)
