---
id: db-elasticsearch-opensearch
type: primary
depth_role: leaf
focus: Detect Elasticsearch and OpenSearch pitfalls around mapping explosion, shard sizing, refresh interval, query vs filter context, deep pagination, and analyzer misconfiguration
parents:
  - index.md
covers:
  - Mapping explosion from dynamic fields creating thousands of field mappings
  - "Shard sizing too small (<10 GB) or too large (>50 GB)"
  - Refresh interval not tuned for write-heavy workloads
  - Query context used where filter context would avoid scoring overhead
  - Deep pagination with from+size exceeding 10000 results
  - Analyzer mismatch between index-time and search-time analysis
  - Missing index templates or aliases for time-based indices
  - Nested or parent-child documents creating cross-shard joins
tags:
  - elasticsearch
  - opensearch
  - mapping
  - shard
  - refresh
  - query
  - filter
  - pagination
  - analyzer
  - index-template
  - ilm
  - nested
activation:
  file_globs:
    - "**/*elastic*"
    - "**/*opensearch*"
    - "**/*search*"
    - "**/*index*"
    - "**/*mapping*"
  keyword_matches:
    - elasticsearch
    - opensearch
    - Elasticsearch
    - OpenSearch
    - index
    - mapping
    - shard
    - refresh_interval
    - analyzer
    - tokenizer
    - bool
    - must
    - filter
    - should
    - must_not
    - nested
    - search_after
    - scroll
    - from
    - size
    - bulk
    - _search
    - _mapping
    - _settings
    - ILM
    - ISM
source:
  origin: file
  path: db-elasticsearch-opensearch.md
  hash: "sha256:207681953bc74f4df13e23b97f8002fa906d4739f11938d0fe069f79b2b4e706"
---
# Elasticsearch / OpenSearch Pitfalls

## When This Activates

Activates on diffs involving Elasticsearch or OpenSearch index definitions, mappings, queries, or cluster configuration. Elasticsearch's inverted index architecture creates unique pitfalls: dynamic mapping silently creates thousands of fields, causing mapping explosion. Wrong shard sizing degrades both indexing and search. The query/filter context distinction determines whether scoring overhead is incurred. Deep pagination (from+size > 10000) is a hard default limit. This reviewer targets detection heuristics for search engine-specific operational and performance pitfalls.

## Audit Surface

- [ ] Dynamic mapping enabled on index receiving unpredictable document shapes
- [ ] Shard count producing shards <10 GB or >50 GB
- [ ] refresh_interval left at 1s default on bulk-load indices
- [ ] bool query with must clause on non-scoring filter conditions
- [ ] from + size > 10000 without search_after or scroll API
- [ ] Text field without explicit analyzer or using default standard analyzer for non-English content
- [ ] No index template for time-based index patterns (logs, metrics)
- [ ] Nested type used for >100 nested documents per parent
- [ ] Mapping with >1000 fields on a single index
- [ ] Index without explicit number_of_replicas setting
- [ ] Keyword field on free-text content (no full-text search capability)
- [ ] Aggregation on text field without fielddata enabled or keyword sub-field
- [ ] Cluster with >1000 shards per node
- [ ] No ILM/ISM policy for index lifecycle management

## Detailed Checks

### Mapping Design
<!-- activation: keywords=["mapping", "dynamic", "properties", "type", "text", "keyword", "nested", "object", "flattened", "field", "strict", "runtime"] -->

- [ ] **Dynamic mapping on unpredictable data**: flag indices with `dynamic: true` (default) that receive documents with variable field names (e.g., user-defined attributes, arbitrary JSON) -- each new field creates a new mapping entry; thousands of fields exhaust heap and slow queries
- [ ] **Mapping explosion**: flag indices with >1000 mapped fields -- high field counts increase cluster state size, slow mapping updates, and waste heap memory. Use flattened type or runtime fields for variable data
- [ ] **Nested type overuse**: flag nested mappings where documents contain >100 nested objects -- each nested document is indexed as a separate Lucene document; large nested arrays multiply storage and query cost
- [ ] **Keyword on free text**: flag keyword-type fields containing natural language text intended for full-text search -- keyword fields are indexed verbatim without analysis; use text type with an appropriate analyzer

### Shard Sizing and Cluster Health
<!-- activation: keywords=["shard", "number_of_shards", "number_of_replicas", "index.routing", "allocation", "rebalance", "split", "shrink", "rollover"] -->

- [ ] **Shards too small**: flag indices with primary shards averaging <10 GB -- small shards add coordination overhead; each shard consumes heap for segment metadata. Aim for 10-50 GB per shard
- [ ] **Shards too large**: flag primary shards exceeding 50 GB -- large shards slow recovery, relocation, and force-merge operations. Use rollover or time-based indices to keep shard sizes bounded
- [ ] **Too many shards per node**: flag clusters with >1000 shards per data node -- each shard has a fixed overhead of ~10 MB heap; excessive shards cause garbage collection pressure
- [ ] **Missing ILM/ISM policy**: flag time-based indices without an Index Lifecycle Management (ILM) or Index State Management (ISM) policy -- without lifecycle management, old indices accumulate indefinitely

### Refresh and Indexing Performance
<!-- activation: keywords=["refresh_interval", "refresh", "bulk", "_bulk", "index", "translog", "flush", "merge", "segment"] -->

- [ ] **Default refresh_interval on bulk load**: flag bulk indexing operations where refresh_interval is left at 1s -- during bulk loads, set `refresh_interval: -1` and refresh once after completion; per-second refreshes create many small segments that require expensive merges
- [ ] **Missing bulk API for batch indexing**: flag individual document indexing (index API per document) instead of the _bulk API -- single-document indexing incurs network round-trip and refresh overhead per document

### Query Optimization
<!-- activation: keywords=["bool", "must", "filter", "should", "must_not", "query", "match", "term", "range", "score", "from", "size", "search_after", "scroll", "pit", "aggregation", "aggs"] -->

- [ ] **Filter conditions in query context**: flag bool query `must` clauses containing term, range, or exists conditions that do not need relevance scoring -- move these to the `filter` clause to skip scoring, enable caching, and reduce CPU usage
- [ ] **Deep pagination with from+size**: flag queries with `from + size > 10000` -- Elasticsearch's default `index.max_result_window` is 10000; exceeding it throws an error. Use `search_after` with a point-in-time (PIT) for deep pagination
- [ ] **Scroll API for user-facing pagination**: flag scroll API usage in user-facing search interfaces -- scroll creates a server-side cursor that consumes resources; use search_after for stateless user pagination
- [ ] **Aggregation on text field**: flag aggregation (terms, cardinality) on text fields without a keyword sub-field -- text fields are analyzed and cannot be aggregated without expensive fielddata loading

### Analyzer Configuration
<!-- activation: keywords=["analyzer", "tokenizer", "filter", "standard", "custom", "synonym", "stemmer", "stop", "ngram", "edge_ngram", "icu", "analysis"] -->

- [ ] **Default analyzer on non-English text**: flag text fields using the default `standard` analyzer on content in languages requiring special analysis (CJK, Arabic, Thai) -- the standard analyzer tokenizes by whitespace and punctuation, which fails for languages without word boundaries
- [ ] **Index-time vs search-time analyzer mismatch**: flag fields with different index and search analyzers that are not intentionally using asymmetric analysis (e.g., edge_ngram at index, standard at search) -- mismatched analyzers cause search terms to not match indexed tokens

## Common False Positives

- **Dynamic mapping on structured log indices**: log indices with a known, bounded set of fields using dynamic mapping are low-risk. Flag only when the field set is unbounded.
- **Small shards on low-volume indices**: indices with <10 GB total data may have small shards by necessity. Flag shard sizing only when consolidation is possible.
- **refresh_interval=1s on search-focused indices**: indices with real-time search requirements correctly use 1s refresh. Flag only during bulk indexing operations.
- **Scroll for export/ETL**: scroll API for full-index export or ETL is the correct choice. Flag only for user-facing interactive pagination.

## Severity Guidance

| Finding | Severity |
|---|---|
| Dynamic mapping on index receiving arbitrary user-defined fields (mapping explosion risk) | Critical |
| >1000 shards per data node causing heap pressure | Critical |
| Deep pagination with from+size > 10000 in production code | Important |
| Filter conditions in must clause instead of filter clause | Important |
| No ILM/ISM policy on time-based indices | Important |
| Aggregation on text field without keyword sub-field | Important |
| Default standard analyzer on non-English text content | Minor |
| refresh_interval=1s during bulk load | Minor |
| Index without explicit number_of_replicas setting | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- N+1 patterns in search manifest as per-result lookups that should be multi-get or enrichment queries
- `db-pgvector-pinecone-weaviate-qdrant-milvus` -- vector search integration with Elasticsearch kNN capabilities
- `sec-owasp-a03-injection` -- Elasticsearch query injection via unsanitized user input in query DSL construction

## Authoritative References

- [Elasticsearch Documentation: Mapping](https://www.elastic.co/guide/en/elasticsearch/reference/current/mapping.html)
- [Elasticsearch Documentation: Size Your Shards](https://www.elastic.co/guide/en/elasticsearch/reference/current/size-your-shards.html)
- [Elasticsearch Documentation: Tune for Indexing Speed](https://www.elastic.co/guide/en/elasticsearch/reference/current/tune-for-indexing-speed.html)
- [OpenSearch Documentation: Index State Management](https://opensearch.org/docs/latest/im-plugin/ism/)
- [Elasticsearch Documentation: Paginate Search Results](https://www.elastic.co/guide/en/elasticsearch/reference/current/paginate-search-results.html)
