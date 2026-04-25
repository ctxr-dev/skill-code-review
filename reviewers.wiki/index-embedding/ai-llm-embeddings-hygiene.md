---
id: ai-llm-embeddings-hygiene
type: primary
depth_role: leaf
focus: Detect embedding model version not pinned, dimension mismatches between index and query, stale embeddings not recomputed on model change, and inconsistent text preprocessing between index and query time
parents:
  - index.md
covers:
  - "Embedding model version not pinned (defaults to latest, breaking on upgrade)"
  - Dimension mismatch between stored vectors and query vectors
  - Stale embeddings not recomputed when embedding model is changed
  - Text preprocessing inconsistent between indexing and query time
  - "Embedding model used beyond its max token limit (silent truncation)"
  - No normalization of embeddings when using cosine similarity
  - Mixing embeddings from different models in the same index
  - "Distance metric does not match the embedding model's training metric"
  - Query vector dimension does not match stored vector dimension
  - Missing ANN index causing brute-force search on large collections
  - Embedding model version not tracked, breaking search quality on model upgrade
  - Pre-filter vs. post-filter applied incorrectly reducing recall or performance
  - Vectors stored without metadata for filtering
  - HNSW or IVF parameters not tuned for the dataset size
  - Embedding normalization mismatch between index and query time
  - No reindexing strategy when embedding model changes
  - Missing ANN index causing brute-force scan on large collections
  - Wrong distance metric for the embedding model
  - Filter applied after ANN search truncating relevant results
  - No pagination on vector search results
  - Missing metadata filtering allowing irrelevant results
  - No index maintenance or compaction strategy
  - Hardcoded collection names without environment separation
  - ANN index type mismatch for dataset size and recall requirements
  - Dimension mismatch between embedding model output and vector index
  - Distance metric mismatch between embedding training and index configuration
  - Metadata filtering interacting poorly with ANN approximation
  - Upsert semantics differences across vector databases
  - "Missing index on vector column (brute-force scan)"
  - Index build parameters not tuned for recall vs latency trade-off
  - Embedding model change without re-indexing existing vectors
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
aliases:
  - data-vector-modeling
  - ai-llm-vector-store-query
  - db-pgvector-pinecone-weaviate-qdrant-milvus
activation:
  file_globs:
    - "**/*embed*"
    - "**/*vector*"
    - "**/*index*"
    - "**/*ingest*"
    - "**/*rag*"
  keyword_matches:
    - embedding
    - embed
    - encode
    - vector
    - dimension
    - ada-002
    - text-embedding
    - sentence-transformers
    - SentenceTransformer
    - OpenAIEmbeddings
    - HuggingFaceEmbeddings
    - cosine
    - normalize
  structural_signals:
    - embedding_model_not_pinned
    - dimension_mismatch
    - preprocessing_inconsistency
source:
  origin: file
  path: ai-llm-embeddings-hygiene.md
  hash: "sha256:8c20aeca125ba250a10245003558559d907ab0944167eb5deb5809abc63fac9a"
---
# Embeddings Hygiene

## When This Activates

Activates when diffs contain embedding model configuration, vector store index creation, text preprocessing for embeddings, or embedding API calls. Embeddings are the foundation of semantic search and RAG -- a dimension mismatch, model version drift, or preprocessing inconsistency silently degrades retrieval quality without raising errors. These bugs are invisible in unit tests and only manifest as declining answer quality in production.

## Audit Surface

- [ ] Embedding model referenced by alias without version pin
- [ ] Vector store index dimension does not match embedding model output dimension
- [ ] Embedding model changed without triggering reindexing
- [ ] Different text preprocessing between ingestion and query paths
- [ ] Input text exceeding embedding model max token limit
- [ ] Cosine similarity used but embeddings not L2-normalized
- [ ] Multiple embedding models writing to the same index
- [ ] No integration test for dimension consistency
- [ ] Embedding API call without error handling
- [ ] Batch embedding without retry on partial failure

## Detailed Checks

### Model Version Pinning
<!-- activation: keywords=["model", "version", "ada-002", "text-embedding", "embedding-3", "sentence-transformers", "all-MiniLM", "pin", "latest"] -->

- [ ] **Model not version-pinned**: flag embedding model references using aliases like `"text-embedding-ada-002"` that could be silently updated by the provider, or HuggingFace model names without a specific revision hash -- a model update changes the embedding space, making all existing vectors incompatible
- [ ] **Model change without reindex**: flag configuration changes to the embedding model name or version without a corresponding migration to recompute all existing embeddings -- old and new embeddings live in incompatible vector spaces, and cosine similarity between them is meaningless
- [ ] **No model metadata stored**: flag vector stores that do not record which embedding model and version produced the stored vectors -- without this metadata, it is impossible to detect staleness

### Dimension Consistency
<!-- activation: keywords=["dimension", "dim", "vector_size", "index", "create_index", "create_collection", "n_dim", "768", "1536", "384", "1024", "3072"] -->

- [ ] **Dimension mismatch**: flag vector store index creation with a hardcoded dimension that does not match the configured embedding model's output dimension -- this produces runtime errors or silent zero-padding
- [ ] **Dimension hardcoded without model reference**: flag hardcoded dimension values (384, 768, 1024, 1536, 3072) without a comment or constant linking it to the specific model -- when the model changes, the dimension will be wrong

### Text Preprocessing Consistency
<!-- activation: keywords=["preprocess", "clean", "strip", "lower", "normalize", "truncate", "tokenize", "chunk", "prefix", "instruction"] -->

- [ ] **Preprocessing mismatch**: flag different text cleaning pipelines for indexing vs query time -- if documents are lowercased and stripped of HTML at index time but queries are embedded raw, the embeddings will not align
- [ ] **Missing query instruction prefix**: flag embedding models that require instruction prefixes (e.g., E5 models require "query: " and "passage: " prefixes) where the prefix is missing or inconsistent -- omitting the prefix significantly degrades retrieval quality
- [ ] **Silent truncation**: flag text inputs that may exceed the embedding model's max token limit without explicit truncation and warning -- most APIs silently truncate, losing information from the tail of long documents

### Normalization and Similarity
<!-- activation: keywords=["cosine", "normalize", "L2", "dot_product", "inner_product", "similarity", "distance"] -->

- [ ] **Unnormalized vectors with cosine similarity**: flag use of cosine similarity or cosine distance when embeddings are not L2-normalized -- some models return unnormalized vectors, and some vector stores compute dot product instead of cosine distance
- [ ] **Wrong distance metric for model**: flag vector store configured with a distance metric (L2, cosine, dot product) that does not match the embedding model's training objective -- using L2 distance with a model trained for cosine similarity degrades ranking

### Batch Processing and Error Handling
<!-- activation: keywords=["batch", "embed", "encode", "retry", "error", "rate_limit", "progress", "bulk"] -->

- [ ] **Embeddings not batched**: flag embedding API calls made one text at a time instead of batched -- batch calls are significantly faster and cheaper per embedding; use the API's batch endpoint or library batch method
- [ ] **No retry on embedding failure**: flag batch embedding operations with no retry logic for transient failures (rate limits, timeouts) -- a single failure can abort an entire reindexing job
- [ ] **No progress tracking**: flag large-scale embedding operations (>10k documents) with no progress logging or checkpoint saving -- if the job fails at 90%, all work is lost without checkpointing
- [ ] **Embedding cache not used**: flag repeated embedding of the same text (e.g., in a query-time pipeline that re-embeds static context) -- cache embeddings for texts that do not change

## Common False Positives

- **Provider-managed models with stable aliases**: OpenAI's `text-embedding-3-small` is a stable versioned name, not an auto-updating alias. Verify the provider's versioning policy before flagging.
- **Normalized-by-default models**: many popular models (OpenAI text-embedding-3-*) output L2-normalized vectors. Do not flag normalization as missing without checking the model specification.
- **Single-use embeddings**: if embeddings are computed and consumed in the same request (e.g., for real-time similarity between two texts), version pinning and reindexing concerns do not apply.
- **Embedding dimension in vector store migration**: dimension values in database migration files are expected to be hardcoded literals. The concern is about the application code referencing a mismatched value, not the migration DDL.
- **Local sentence-transformers models**: locally hosted models pinned by a downloaded snapshot do not auto-update. Version pinning concerns are lower for frozen local copies.

## Severity Guidance

| Finding | Severity |
|---|---|
| Dimension mismatch between index and embedding model | Critical |
| Embedding model changed without reindexing existing vectors | Critical |
| Different preprocessing between index and query paths | Important |
| Embedding model not version-pinned | Important |
| Silent truncation of inputs exceeding model max tokens | Minor |
| Missing instruction prefix for models that require it | Minor |

## See Also

- `ai-llm-rag-quality` -- embedding quality directly impacts RAG retrieval quality
- `ai-llm-vector-store-query` -- vector store configuration must match embedding dimensions and distance metrics
- `ai-llm-eval-harness` -- embedding quality should be measured via retrieval evaluation

## Authoritative References

- [OpenAI, "Embeddings" API documentation](https://platform.openai.com/docs/guides/embeddings)
- [Sentence-Transformers documentation](https://www.sbert.net/)
- [Pinecone, "Understanding Vector Embeddings"](https://www.pinecone.io/learn/vector-embeddings/)
- [MTEB Benchmark -- embedding model evaluation](https://huggingface.co/spaces/mteb/leaderboard)
