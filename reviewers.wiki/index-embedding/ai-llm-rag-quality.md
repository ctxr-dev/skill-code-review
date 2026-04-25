---
id: ai-llm-rag-quality
type: primary
depth_role: leaf
focus: Detect RAG pipeline issues including improper chunk sizing, missing overlap, retrieval without reranking, absent relevance thresholds, context window overflow, and missing evaluation metrics
parents:
  - index.md
covers:
  - Chunks too large to fit multiple in context or too small to carry meaning
  - No overlap between adjacent chunks causing information loss at boundaries
  - Retrieval results used without reranking for relevance
  - "Missing relevance/similarity threshold allowing irrelevant chunks into context"
  - Context window overflow from too many retrieved chunks
  - "No evaluation metrics for retrieval quality (recall, precision, MRR)"
  - "Metadata not stored with chunks (source, page, timestamp)"
  - Chunking strategy not aligned with document structure
tags:
  - RAG
  - retrieval
  - chunking
  - reranking
  - vector-search
  - context-window
  - evaluation
activation:
  file_globs:
    - "**/*rag*"
    - "**/*retriev*"
    - "**/*chunk*"
    - "**/*embed*"
    - "**/*vector*"
    - "**/*index*"
    - "**/*ingest*"
  keyword_matches:
    - chunk
    - split
    - overlap
    - retriever
    - retrieve
    - rerank
    - similarity
    - top_k
    - k=
    - context_window
    - RecursiveCharacterTextSplitter
    - TextSplitter
    - VectorStore
    - as_retriever
    - similarity_search
  structural_signals:
    - chunking_without_overlap
    - retrieval_without_reranking
    - no_relevance_threshold
source:
  origin: file
  path: ai-llm-rag-quality.md
  hash: "sha256:19669759d1aba908ccd0362941b9b64f064fce47fbfa04fc3845498e92a0abd8"
---
# RAG Pipeline Quality

## When This Activates

Activates when diffs contain document chunking, embedding, vector store ingestion, retrieval logic, or context assembly for LLM calls. Retrieval-Augmented Generation quality depends on every pipeline stage: chunking granularity, embedding consistency, retrieval relevance, and context assembly. A single weak link -- oversized chunks, missing reranking, or no relevance threshold -- degrades answer quality for every query.

## Audit Surface

- [ ] Chunk size configured too large (>2000 tokens) or too small (<100 tokens)
- [ ] Text splitter with no overlap parameter or overlap set to zero
- [ ] Retrieved chunks passed directly to LLM without reranking step
- [ ] No similarity score threshold on retrieval results
- [ ] Total retrieved context exceeds model context window
- [ ] No evaluation harness for retrieval quality
- [ ] Chunks stored without source metadata
- [ ] Splitting ignoring document structure
- [ ] Query not preprocessed before retrieval
- [ ] Embedding model different between indexing and query time

## Detailed Checks

### Chunking Strategy
<!-- activation: keywords=["chunk", "split", "overlap", "TextSplitter", "RecursiveCharacterTextSplitter", "SentenceSplitter", "token", "character", "size"] -->

- [ ] **Chunks too large**: flag chunk_size > 2000 tokens -- oversized chunks dilute relevance (the embedding represents a mixture of topics) and waste context window space when only a sentence is relevant
- [ ] **Chunks too small**: flag chunk_size < 100 tokens -- undersized chunks lose context needed to understand the content, producing incoherent retrieval results
- [ ] **No chunk overlap**: flag text splitters with `chunk_overlap=0` or no overlap parameter -- zero overlap causes information loss at chunk boundaries where sentences span two chunks
- [ ] **Structure-unaware splitting**: flag character-count or token-count splitting applied to structured documents (Markdown, HTML, PDF) without using heading-aware or paragraph-aware splitters -- splitting mid-sentence or mid-heading degrades retrieval quality
- [ ] **No metadata stored**: flag chunk ingestion that does not store source metadata (filename, URL, page number, timestamp) alongside the embedding -- without metadata, citations and source filtering are impossible

### Retrieval Quality
<!-- activation: keywords=["retrieve", "search", "query", "top_k", "k=", "similarity", "score", "threshold", "rerank", "filter"] -->

- [ ] **No reranking**: flag pipelines that return raw vector similarity results directly to the LLM without a reranking step (cross-encoder, Cohere Rerank, or similar) -- bi-encoder similarity is a coarse filter; reranking dramatically improves precision
- [ ] **No relevance threshold**: flag retrieval that returns top-k results regardless of similarity score -- irrelevant chunks (low cosine similarity) injected into context confuse the model and degrade answer quality
- [ ] **Fixed top-k without adaptation**: flag hardcoded `k=5` or similar without considering query complexity -- some queries need 1 chunk, others need 15; consider dynamic k or relevance-based cutoff
- [ ] **No query preprocessing**: flag raw user queries sent directly as embedding input without query expansion, HyDE (Hypothetical Document Embeddings), or query rewriting -- raw queries often underperform transformed queries

### Context Assembly
<!-- activation: keywords=["context", "prompt", "window", "tokens", "max_tokens", "assemble", "stuff", "map_reduce", "refine"] -->

- [ ] **Context window overflow**: flag context assembly that does not count tokens and may exceed the model's context window -- oversized context causes API errors or silent truncation
- [ ] **No context deduplication**: flag retrieval pipelines that do not deduplicate overlapping chunks -- the same passage retrieved twice wastes context tokens
- [ ] **Chunks not ordered**: flag context assembly that does not order retrieved chunks by their original document position -- shuffled chunks produce incoherent narratives

### Evaluation and Monitoring
<!-- activation: keywords=["eval", "evaluate", "metric", "recall", "precision", "MRR", "NDCG", "faithfulness", "relevance", "ragas", "deepeval"] -->

- [ ] **No retrieval evaluation**: flag RAG pipelines deployed without evaluation metrics (retrieval recall, precision, MRR, NDCG) on a representative query set -- without measurement, quality regressions go undetected
- [ ] **No end-to-end eval**: flag RAG systems without answer-level evaluation (faithfulness, answer relevance, hallucination rate) -- retrieval quality alone does not guarantee answer quality

### Index Maintenance
<!-- activation: keywords=["update", "refresh", "stale", "reindex", "delete", "sync", "incremental", "schedule"] -->

- [ ] **No index refresh strategy**: flag RAG systems with no mechanism to update the vector index when source documents change -- stale embeddings return outdated information
- [ ] **No document deletion handling**: flag RAG pipelines that ingest new documents but never remove deleted or superseded documents from the index -- removed documents continue appearing in retrieval results
- [ ] **No freshness metadata**: flag indexed documents without timestamp metadata -- without freshness data, the system cannot prefer recent documents or warn users about outdated content

## Common False Positives

- **Prototyping with default settings**: early RAG prototypes using default chunk sizes and no reranking are expected. Flag with a note but reduce severity for code clearly in experimentation phase.
- **Small corpora**: for very small document sets (<50 documents), reranking and complex chunking strategies provide marginal benefit. Note the caveat.
- **Summarization pipelines**: map-reduce or refine chains intentionally process entire documents, not retrieval results. Do not flag chunk size for these.

## Severity Guidance

| Finding | Severity |
|---|---|
| Embedding model mismatch between index and query time | Critical |
| Context window overflow from unchecked retrieved content | Important |
| No relevance threshold on retrieval results | Important |
| Chunks stored without source metadata | Important |
| No chunk overlap causing boundary information loss | Minor |
| No reranking on retrieval results | Minor |
| No retrieval evaluation metrics | Minor |

## See Also

- `ai-llm-embeddings-hygiene` -- embedding model consistency and preprocessing alignment
- `ai-llm-vector-store-query` -- vector store configuration affecting retrieval quality
- `ai-llm-hallucination-handling` -- RAG is a grounding mechanism; poor RAG increases hallucination
- `ai-llm-cost-token-spend-monitoring` -- oversized or redundant context wastes tokens
- `ai-llm-eval-harness` -- RAG evaluation as part of the broader eval strategy

## Authoritative References

- [LangChain, "RAG" documentation](https://python.langchain.com/docs/concepts/rag/)
- [LlamaIndex, "Building a RAG Pipeline"](https://docs.llamaindex.ai/en/stable/)
- [Pinecone, "Retrieval Augmented Generation"](https://www.pinecone.io/learn/retrieval-augmented-generation/)
- [RAGAS -- Evaluation framework for RAG pipelines](https://docs.ragas.io/)
