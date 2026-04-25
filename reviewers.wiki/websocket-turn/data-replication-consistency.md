---
id: data-replication-consistency
type: primary
depth_role: leaf
focus: Detect missing read-after-write guarantees, stale read risks, split-brain configurations, and quorum misconfiguration in replicated data systems
parents:
  - index.md
covers:
  - Write to primary followed by immediate read from replica without consistency guarantee
  - Stale read from replica served to user who just performed a write
  - Split-brain scenario possible due to missing fencing or leader election
  - "Quorum configuration that does not satisfy R + W > N for strong consistency"
  - Replication lag not monitored or not accounted for in application logic
  - Failover configuration that can lose acknowledged writes
  - Read replica used for write operations
  - "Eventual consistency used where strong consistency is required (financial, inventory)"
  - Missing conflict resolution strategy for multi-leader replication
tags:
  - replication
  - consistency
  - read-after-write
  - stale-read
  - split-brain
  - quorum
  - eventual-consistency
  - data-architecture
activation:
  file_globs:
    - "**/*replica*"
    - "**/*replication*"
    - "**/*cluster*"
    - "**/*failover*"
    - "**/*primary*"
    - "**/*secondary*"
    - "**/*leader*"
    - "**/*follower*"
    - "**/*config*"
    - "**/*database*"
    - "**/*datasource*"
    - "**/*connection*"
  keyword_matches:
    - replica
    - replication
    - primary
    - secondary
    - leader
    - follower
    - quorum
    - consistency
    - eventual
    - strong
    - read-after-write
    - stale
    - lag
    - failover
    - split brain
    - fencing
    - master
    - slave
    - read_preference
    - readPreference
    - READONLY
    - sync
    - async
  structural_signals:
    - replica_configuration
    - read_write_split
    - quorum_settings
    - failover_configuration
source:
  origin: file
  path: data-replication-consistency.md
  hash: "sha256:278425c248d30e22f7e58f2daa4feb5db7ec3a57e9ef76f69be6894d85288594"
---
# Replication and Consistency

## When This Activates

Activates on diffs involving database replication configuration, read/write splitting, connection routing, failover setup, or consistency level settings for replicated databases (PostgreSQL streaming replication, MySQL replication, MongoDB replica sets, Cassandra, DynamoDB Global Tables, Redis Sentinel/Cluster). Replication improves availability and read throughput but introduces consistency trade-offs that application code must account for. The most insidious bugs occur when code assumes strong consistency but the infrastructure provides only eventual consistency -- the user writes data and immediately reads stale results. This reviewer detects these replication-consistency mismatches.

## Audit Surface

- [ ] Write to primary database followed by read from replica in the same request
- [ ] Application routing reads to replica without session or causal consistency
- [ ] Cluster configuration allowing two nodes to both accept writes (split brain)
- [ ] Quorum settings where R + W <= N allowing inconsistent reads
- [ ] No replication lag monitoring or alerting configured
- [ ] Async replication with no documentation of acceptable data loss window
- [ ] Failover configured with async replication and no acknowledgment of potential write loss
- [ ] Write operation routed to a read replica
- [ ] Eventual consistency used for balance, inventory, or idempotency-key lookups
- [ ] Multi-leader or multi-region replication with no conflict resolution strategy
- [ ] Connection string pointing to replica for a write-heavy service
- [ ] Missing retry-on-stale logic for read-after-write patterns

## Detailed Checks

### Read-After-Write Consistency
<!-- activation: keywords=["read", "write", "primary", "replica", "secondary", "stale", "consistent", "session", "causal", "sticky", "route", "split", "read_preference", "readPreference"] -->

- [ ] **Write-then-read-from-replica**: flag code paths where a write to the primary is immediately followed by a read from a replica in the same user request -- replication lag means the replica may not yet have the write; route the read to the primary or use session consistency
- [ ] **No session affinity after write**: flag read/write splitting configurations with no mechanism to route post-write reads to the primary (sticky sessions, causal consistency tokens, read-your-writes guarantee) -- users will see stale data after their own writes
- [ ] **Eventual consistency for critical reads**: flag eventual consistency read preferences for operations where stale data causes correctness issues (account balance, inventory count, idempotency key check, authentication state) -- these require strong or session-level consistency
- [ ] **Missing stale-read handling**: flag application code that reads from replicas without any staleness detection or retry mechanism -- provide a fallback to primary when stale data is detected

### Stale Read Risks
<!-- activation: keywords=["lag", "delay", "stale", "outdated", "behind", "replication", "monitor", "alert", "seconds_behind", "optime", "LSN"] -->

- [ ] **No replication lag monitoring**: flag replicated database deployments with no monitoring of replication lag (seconds_behind_master, replica lag in seconds, LSN delta) -- undetected lag spikes cause silent stale reads
- [ ] **No lag threshold alerting**: flag replication monitoring without alerting when lag exceeds a threshold -- monitoring without alerting means the data is visible but not actionable
- [ ] **Replica read without lag awareness**: flag application code routing reads to replicas without checking the replica's replication lag -- during lag spikes, all replica reads return stale data
- [ ] **Cache populated from replica**: flag caches populated by reading from a replica -- if the replica is lagging, the cache stores and serves stale data, amplifying the staleness window

### Split Brain and Fencing
<!-- activation: keywords=["split brain", "fencing", "leader", "election", "primary", "failover", "STONITH", "fence", "witness", "arbiter", "sentinel", "quorum", "majority"] -->

- [ ] **No fencing mechanism**: flag failover configurations with no fencing (STONITH, I/O fencing, token-based fencing) to prevent the old primary from accepting writes after failover -- two active primaries cause conflicting writes that cannot be automatically reconciled
- [ ] **Even node count without arbiter**: flag replica sets or clusters with an even number of voting nodes and no arbiter -- an even node count cannot achieve majority consensus during a network partition
- [ ] **Auto-failover without quorum**: flag automatic failover configurations that promote a replica without quorum validation -- a single node deciding to promote itself during a network partition causes split brain
- [ ] **Missing partition detection**: flag cluster configurations with no mechanism to detect and respond to network partitions -- without partition awareness, both sides of a split continue accepting writes

### Quorum Configuration
<!-- activation: keywords=["quorum", "consistency_level", "write_concern", "read_concern", "majority", "ALL", "ONE", "LOCAL", "EACH_QUORUM", "w:", "r:", "rf:"] -->

- [ ] **Weak quorum (R + W <= N)**: flag Cassandra or similar quorum configurations where read consistency + write consistency <= replication factor -- this allows reads to return data that has not been written by the latest acknowledged write
- [ ] **Write concern too low**: flag MongoDB write concern of `w:1` (primary only) in environments requiring durability -- an acknowledged write can be lost if the primary fails before replication
- [ ] **Read concern too low for use case**: flag MongoDB read concern of `local` or `available` for operations requiring committed data -- uncommitted reads can return data that is later rolled back
- [ ] **Inconsistent consistency levels**: flag application code that uses different consistency levels for the same logical operation in different code paths -- inconsistent consistency creates unpredictable behavior

### Failover and Data Loss
<!-- activation: keywords=["failover", "promotion", "switchover", "async", "sync", "semi-sync", "acknowledge", "durability", "RPO", "data loss", "write loss"] -->

- [ ] **Async replication with no RPO acknowledgment**: flag asynchronous replication configurations with no documented RPO (Recovery Point Objective) -- async replication means acknowledged writes can be lost during failover; the acceptable data loss window must be explicit
- [ ] **Failover losing acknowledged writes**: flag failover procedures that promote an async replica without checking if it has all acknowledged writes from the old primary -- this silently loses data the application considers committed
- [ ] **No conflict resolution for multi-leader**: flag multi-leader (multi-master) or multi-region replication with no documented conflict resolution strategy (last-writer-wins, merge, application-level resolution) -- conflicting writes on different leaders will corrupt data
- [ ] **Write to read replica**: flag write operations (INSERT, UPDATE, DELETE) routed to a read replica -- read replicas reject writes, causing errors, or in misconfigured setups, create divergent data

## Common False Positives

- **Intentional eventual consistency**: some read paths intentionally tolerate staleness (dashboard metrics, search indexes, recommendation feeds). Do not flag eventual consistency when the use case explicitly accepts it.
- **Caching layer providing consistency**: if a write-through cache ensures the reading client sees its own writes, the replica staleness is masked for that client. Do not flag if the caching layer provides read-after-write guarantees.
- **Single-node development**: development environments with a single database node have no replication. Do not flag single-node configurations.
- **Read replicas for analytics**: read replicas dedicated to analytics or reporting workloads are expected to have lag. Flag only when operational (user-facing) reads are routed to these replicas.

## Severity Guidance

| Finding | Severity |
|---|---|
| Split brain possible due to missing fencing or leader election gap | Critical |
| Eventual consistency used for account balance, inventory, or idempotency check | Critical |
| Failover procedure that can lose acknowledged writes | Critical |
| Write-then-read-from-replica in same user request with no consistency guarantee | Important |
| Quorum configuration where R + W <= N | Important |
| Multi-leader replication with no conflict resolution strategy | Important |
| Write operation routed to read replica | Important |
| No replication lag monitoring or alerting | Important |
| Async replication with no documented RPO | Minor |
| Cache populated from lagging replica | Minor |
| Read preference set to replica for non-critical read path | Minor |

## See Also

- `principle-fail-fast` -- reading from a replica without consistency guarantees silently returns stale data instead of failing fast
- `data-backup-restore-dr-rpo-rto` -- RPO is a shared concern; replication consistency determines how much data can be lost during failover
- `data-cdc-event-sourcing` -- CDC consumers reading from replicas must account for replication lag
- `data-sharding-partitioning` -- sharded databases with replicated shards compound consistency challenges

## Authoritative References

- [Martin Kleppmann, *Designing Data-Intensive Applications* (2017), Chapter 5: "Replication" and Chapter 9: "Consistency and Consensus"](https://dataintensive.net/)
- [Kyle Kingsbury, "Jepsen: Distributed Systems Safety Research" -- consistency testing for real databases](https://jepsen.io/)
- [Werner Vogels, "Eventually Consistent" (2008) -- foundational paper on consistency trade-offs](https://dl.acm.org/doi/10.1145/1466443.1466448)
- [MongoDB Documentation, "Read Concern" and "Write Concern"](https://www.mongodb.com/docs/manual/reference/read-concern/)
- [PostgreSQL Documentation, "High Availability, Load Balancing, and Replication"](https://www.postgresql.org/docs/current/high-availability.html)
