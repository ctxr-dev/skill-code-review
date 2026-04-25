---
id: index-embedding
type: index
depth_role: subcategory
depth: 1
focus: ANN index type mismatch for dataset size and recall requirements; Aggregation pipeline stages in wrong order causing full collection scans; Analyzer mismatch between index-time and search-time analysis; Chunking strategy not aligned with document structure
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-embeddings-hygiene
    file: ai-llm-embeddings-hygiene.md
    type: primary
    focus: Detect embedding model version not pinned, dimension mismatches between index and query, stale embeddings not recomputed on model change, and inconsistent text preprocessing between index and query time
    tags:
      - embeddings
      - vector
      - dimension
      - preprocessing
      - model-version
      - normalization
      - RAG
      - vector-db
      - ANN
      - HNSW
      - IVF
      - similarity-search
      - distance-metric
      - pinecone
      - weaviate
      - milvus
      - pgvector
      - data-architecture
      - vector-store
      - metadata-filter
      - pagination
      - Pinecone
      - Weaviate
      - Qdrant
      - Milvus
      - ChromaDB
      - vector-database
      - qdrant
      - ann
      - hnsw
      - ivfflat
      - embedding
      - similarity
      - cosine
      - euclidean
      - recall
  - id: ai-llm-rag-quality
    file: ai-llm-rag-quality.md
    type: primary
    focus: Detect RAG pipeline issues including improper chunk sizing, missing overlap, retrieval without reranking, absent relevance thresholds, context window overflow, and missing evaluation metrics
    tags:
      - RAG
      - retrieval
      - chunking
      - reranking
      - vector-search
      - context-window
      - evaluation
  - id: db-elasticsearch-opensearch
    file: db-elasticsearch-opensearch.md
    type: primary
    focus: Detect Elasticsearch and OpenSearch pitfalls around mapping explosion, shard sizing, refresh interval, query vs filter context, deep pagination, and analyzer misconfiguration
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
  - id: db-mongodb
    file: db-mongodb.md
    type: primary
    focus: Detect MongoDB pitfalls around schema validation gaps, index strategy, aggregation pipeline misuse, sharding key selection, ObjectId assumptions, and WiredTiger cache pressure
    tags:
      - mongodb
      - mongo
      - schema-validation
      - index
      - aggregation
      - sharding
      - wiredtiger
      - oplog
      - objectid
      - replica-set
  - id: obs-cardinality-budgeting
    file: obs-cardinality-budgeting.md
    type: primary
    focus: Detect unbounded metric labels, high-cardinality trace attributes, and log fields that cause storage cost explosion and backend instability
    tags:
      - cardinality
      - metrics
      - labels
      - dimensions
      - TSDB
      - cost
      - explosion
      - observability
      - prometheus
      - datadog
      - high-cardinality
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Index Embedding

**Focus:** ANN index type mismatch for dataset size and recall requirements; Aggregation pipeline stages in wrong order causing full collection scans; Analyzer mismatch between index-time and search-time analysis; Chunking strategy not aligned with document structure

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-embeddings-hygiene.md](ai-llm-embeddings-hygiene.md) | 📄 primary | Detect embedding model version not pinned, dimension mismatches between index and query, stale embeddings not recomputed on model change, and inconsistent text preprocessing between index and query time |
| [ai-llm-rag-quality.md](ai-llm-rag-quality.md) | 📄 primary | Detect RAG pipeline issues including improper chunk sizing, missing overlap, retrieval without reranking, absent relevance thresholds, context window overflow, and missing evaluation metrics |
| [db-elasticsearch-opensearch.md](db-elasticsearch-opensearch.md) | 📄 primary | Detect Elasticsearch and OpenSearch pitfalls around mapping explosion, shard sizing, refresh interval, query vs filter context, deep pagination, and analyzer misconfiguration |
| [db-mongodb.md](db-mongodb.md) | 📄 primary | Detect MongoDB pitfalls around schema validation gaps, index strategy, aggregation pipeline misuse, sharding key selection, ObjectId assumptions, and WiredTiger cache pressure |
| [obs-cardinality-budgeting.md](obs-cardinality-budgeting.md) | 📄 primary | Detect unbounded metric labels, high-cardinality trace attributes, and log fields that cause storage cost explosion and backend instability |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
