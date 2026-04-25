---
id: search-tantivy-meili-typesense-algolia
type: primary
depth_role: leaf
focus: "Detect exposed admin keys, missing schema configuration (synonyms, facets, ranking), reindex and hybrid-search pitfalls across Tantivy, Meilisearch, Typesense, and Algolia"
parents:
  - index.md
covers:
  - "Search admin / write API keys exposed in frontend or public config"
  - "Missing synonyms / stopwords / stemming configuration -- poor recall"
  - "Filterable / facetable attributes not declared -- facets fail or scan all docs"
  - Ranking rules left at default -- business relevance signals ignored
  - No search analytics wired -- no feedback loop for tuning
  - "Typo tolerance too loose (false positives) or too strict (low recall)"
  - "Hybrid search (keyword + vector) without score normalization"
  - Breaking schema changes without reindex or alias swap
  - "Rate limiting / per-key quotas not configured for public search endpoints"
  - Indexing pipeline writes partial documents without atomic swap
  - Search using default BM25 parameters without relevance tuning
  - Missing language-specific analyzers for tokenization
  - Hybrid search without score normalization between keyword and vector
  - Search index not updated on data change
  - Facet counts computed without dedicated aggregation index
  - Autocomplete without debounce or rate limit
  - Missing search analytics and click tracking
  - Full-text search on fields that should be keyword type
  - Relevance tested only by eyeballing, no offline evaluation
  - Missing synonyms and stemming for user queries
tags:
  - search
  - tantivy
  - meilisearch
  - typesense
  - algolia
  - instantsearch
  - index
  - synonyms
  - facets
  - ranking
  - hybrid
  - reindex
  - BM25
  - TF-IDF
  - vector-search
  - hybrid-search
  - relevance
  - elasticsearch
  - opensearch
  - solr
  - analyzer
  - tokenizer
aliases:
  - domain-search-ranking-bm25-vector-hybrid
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
    - "**/*.tsx"
    - "**/*.jsx"
    - "**/*.py"
    - "**/*.rb"
    - "**/*.go"
    - "**/*.rs"
    - "**/*.java"
    - "**/*.kt"
    - "**/*.php"
    - "**/algolia*.json"
    - "**/meilisearch*.{json,toml,yaml,yml}"
    - "**/typesense*.{json,yaml,yml}"
    - "**/next.config.*"
    - "**/.env*"
  keyword_matches:
    - Tantivy
    - Meilisearch
    - meili
    - Typesense
    - Algolia
    - algoliasearch
    - InstantSearch
    - react-instantsearch
    - searchkit
    - index
    - searchable_attributes
    - filterable_attributes
    - facet_fields
    - ranking
    - synonyms
    - typo_tolerance
    - addDocuments
    - saveObjects
    - api_key
    - ADMIN_API_KEY
  structural_signals:
    - search_client_initialization
    - index_settings_update
    - frontend_search_key_exposure
    - hybrid_search_score_combination
    - reindex_without_alias_swap
source:
  origin: file
  path: search-tantivy-meili-typesense-algolia.md
  hash: "sha256:9067d40fed7202f680c75532aaf924c36ceb83c2b0e5fb5b718c33c176dad152"
---
# Search Engines: Tantivy, Meilisearch, Typesense, Algolia

## When This Activates

Activates on diffs that integrate with a search engine (Tantivy embedded, Meilisearch, Typesense, Algolia) or an InstantSearch-style frontend. The four share a common vocabulary (index, searchable/filterable attributes, synonyms, typo tolerance, ranking) but differ in defaults and failure modes. The most common review-time issues are: exposing an admin key in the frontend, shipping an index without synonyms or facet configuration, leaving ranking rules at defaults, and combining keyword + vector scores naively. This reviewer focuses on code-visible misconfigurations and dangerous patterns.

## Audit Surface

- [ ] Algolia/Meilisearch admin/master key embedded in frontend bundle or env sent to browser
- [ ] Search-only key scoped wider than necessary (all indexes / no filters)
- [ ] Typesense API key with `documents:write` in a mobile or browser app
- [ ] Missing synonyms configuration where language morphology matters
- [ ] No stopwords configured for the indexed language
- [ ] No stemming / lemmatization for the target language
- [ ] Attributes used in filter/facet but not in `filterableAttributes`/`facet_fields`
- [ ] Ranking rules left at library defaults
- [ ] No click/conversion analytics wired
- [ ] Typo tolerance left at defaults for an exact-match-sensitive domain
- [ ] Hybrid keyword + vector search combining scores without normalization
- [ ] Schema change applied without reindex or alias swap
- [ ] Index updated with partial docs (`updateObject`) without merge logic
- [ ] No rate limit / per-IP cap on public search endpoint
- [ ] No backup / snapshot job for the search index
- [ ] Search request from server without timeout
- [ ] Indexing job swallows per-doc errors silently
- [ ] InstantSearch `searchClient` configured with admin key

## Detailed Checks

### API Key Scoping and Exposure
<!-- activation: keywords=["ALGOLIA_ADMIN_API_KEY", "MEILI_MASTER_KEY", "TYPESENSE_API_KEY", "searchClient", "admin", "master", "NEXT_PUBLIC_", "VITE_", "REACT_APP_", "generateSecuredApiKey", "scoped_api_key"] -->

- [ ] **Admin key in frontend**: flag any admin/master key referenced by an identifier with `NEXT_PUBLIC_`, `VITE_`, `REACT_APP_`, `PUBLIC_` prefix or inlined in `public/`/`dist/` assets -- admin keys grant index write/delete. Use search-only keys (Algolia) or scoped API keys (Meilisearch `tenant-tokens`, Typesense `scoped_api_key`).
- [ ] **Search-only key too broad**: flag a search-only key that indexes across all indexes or with no `filters` attribute pinning it to a tenant -- Algolia secured API keys support `filters: "tenantId:42"`; Meilisearch tenant tokens support search rules per-index; Typesense scoped keys support `filter_by`.
- [ ] **Typesense documents:write in client app**: flag `documents:write`/`*` actions in client-side API keys -- clients should get `documents:search` only.
- [ ] **Key checked into repo**: flag hard-coded API keys in source -- use secret management. Cross-reference `sec-secrets-management-and-rotation`.
- [ ] **InstantSearch `searchClient` with admin key**: flag `algoliasearch(appId, adminKey)` feeding `InstantSearch` -- the admin key reaches the browser.

### Schema: Synonyms, Stopwords, Stemming
<!-- activation: keywords=["synonyms", "stopwords", "stop_words", "stemming", "lemmatization", "token_separators", "symbols_to_index", "normalizer", "analyzer", "language"] -->

- [ ] **No synonyms configured**: flag index settings without a synonyms list or API call when the domain has known aliases (NYC/New York, tshirt/t-shirt) -- recall suffers silently.
- [ ] **No stopwords for the language**: flag text indexes where the indexed language is non-English (or mixed) without an appropriate stopwords list -- common words inflate match counts and waste ranking signal.
- [ ] **No stemming / analyzer choice**: flag index creation that does not configure a language-appropriate tokenizer/analyzer -- Meilisearch detects automatically but allows overrides; Tantivy requires explicit token stream; Typesense uses `locale`; Algolia has `queryLanguages`.
- [ ] **Custom tokens not indexed**: flag domain-specific symbols (`#`, `@`, `+`, `-`) in user content without adjusting `symbols_to_index` / `token_separators` / `separatorsToIndex` -- `C++` / `@username` / `.NET` won't match.

### Facets, Filters, and Ranking
<!-- activation: keywords=["filterableAttributes", "filterable_attributes", "facet_fields", "attributesForFaceting", "ranking", "ranking_rules", "customRanking", "sort_by", "default_sorting_field"] -->

- [ ] **Filter/facet attribute not declared**: flag code that filters/facets on an attribute missing from `filterableAttributes` / `filterable_attributes` / `attributesForFaceting` / `facet_fields` -- Meilisearch errors, Typesense refuses, Algolia silently scans (slow).
- [ ] **Ranking rules at defaults**: flag index settings without `ranking` / `customRanking` / `ranking_rules` tuning for a business-critical index -- default ranking does not know your product signals (popularity, recency, margin).
- [ ] **Custom ranking without data**: flag `customRanking: ["desc(popularity)"]` where the document field is populated only for some records -- the null-skewed ranking is worse than default.
- [ ] **Sorting without replica/sort index (Algolia)**: flag use of `indexName.search({ replica: ... })` without configured replicas -- user-facing sort options require replica indexes on Algolia.

### Typo Tolerance
<!-- activation: keywords=["typo_tolerance", "typoTolerance", "minWordSizefor1Typo", "minWordSizefor2Typos", "num_typos", "disableTypoToleranceOnAttributes"] -->

- [ ] **Defaults on exact-match domain**: flag typo tolerance left at defaults for an identifier-heavy index (SKUs, serial numbers, licence plates) -- a typo-tolerant match to `ABC-123` returns irrelevant results. Disable on identifier attributes.
- [ ] **Typo tolerance disabled entirely on user text**: flag disabling typo tolerance on a free-text search -- users will miss results due to trivial misspellings. Prefer per-attribute disable.
- [ ] **Too-short min word for typos**: flag `minWordSizefor1Typo=3` (default) for short tokens like codes -- allowing typos on 3-character tokens is noisy.

### Hybrid Search: Keyword + Vector
<!-- activation: keywords=["hybrid", "vector", "embedding", "cosine", "bm25", "score", "weighted", "combine", "rrf", "reciprocal rank", "semantic"] -->

- [ ] **Adding BM25 + cosine scores**: flag hybrid search that sums `bm25_score + cosine_similarity` directly -- the two are on different scales (BM25 unbounded, cosine in [-1,1]). Normalize per retriever or use Reciprocal Rank Fusion (RRF).
- [ ] **No score fusion strategy declared**: flag hybrid retrieval with ad-hoc weighting (`0.7 * keyword + 0.3 * vector`) without justification or tuning set -- pick RRF or learned re-ranking and document the rationale.
- [ ] **Vector search without filter pushdown**: flag hybrid queries that perform vector search across the whole corpus and then filter client-side -- push the filter to the vector store (pgvector `WHERE`, pinecone `filter`, Typesense vector field filter) to avoid scanning the entire index.
- [ ] **Embedding model change without reindex**: flag updating the embedding model without a full reindex -- old vectors are in the previous model's space; similarity becomes meaningless.

### Indexing, Reindex, and Alias Swap
<!-- activation: keywords=["addDocuments", "saveObjects", "updateObject", "collections.create", "moveIndex", "swap_indexes", "alias", "snapshot", "dumps", "reindex"] -->

- [ ] **Breaking schema change without reindex**: flag adding a new filterable attribute, changing analyzer, or changing ranking rules without a reindex -- existing docs won't have the new index data.
- [ ] **In-place reindex instead of alias swap**: flag reindexing into the live index -- users see inconsistent results during the rebuild. Use the alias / move / swap pattern (Algolia `moveIndex`, Meilisearch swap, Typesense collection alias).
- [ ] **Partial updates overriding full docs (or vice versa)**: flag `saveObjects` (replace) used where `partialUpdateObjects` (merge) is needed -- any omitted field is cleared. Algolia, Meilisearch, and Typesense all distinguish these operations; use the right one.
- [ ] **Indexing job swallows errors**: flag batch indexing loops that `try/except pass` per document -- silent partial indexes. Fail loud or aggregate errors.

### Operational: Rate Limiting, Timeouts, Backups
<!-- activation: keywords=["rateLimit", "quota", "timeout", "timeoutSearch", "backup", "snapshot", "replica", "dump"] -->

- [ ] **Public search endpoint without rate limiting**: flag a server endpoint that proxies Meilisearch/Typesense queries without per-IP or per-key rate limiting -- amplification and cost abuse risk (especially for Algolia's per-query pricing).
- [ ] **Search request without timeout**: flag server-side search calls without a client timeout -- a slow search engine stalls the calling request. Set short timeouts (e.g. 500-2000 ms).
- [ ] **No snapshot / dump schedule**: flag self-hosted Meili/Typesense deployments without a backup/snapshot plan -- index rebuild from source can be hours.
- [ ] **No click / conversion analytics**: flag production search integrations without Algolia Insights, Meilisearch analytics, or a custom click-through tracker -- without a feedback signal, ranking tuning is guesswork.

### Tantivy-Specific Embedded Concerns
<!-- activation: keywords=["tantivy", "IndexWriter", "commit", "segment", "schema::", "heap_size", "Searcher", "reload_policy"] -->

- [ ] **IndexWriter `commit()` not called or called per-doc**: flag Tantivy writers that commit per document (hurts throughput) or never commit (data lost on crash). Batch commits with a size or time threshold.
- [ ] **Heap size too small for corpus**: flag `IndexWriter::new_with_heap_size` with a value below ~50 MB for non-trivial indexes -- causes frequent segment flushes and merges.
- [ ] **Searcher not reloaded after commit**: flag long-lived `Searcher` instances not reloaded via the `IndexReader` -- queries see stale data until reload.

## Common False Positives

- **Frontend using search-only key with strict filters**: a frontend-embedded search-only key pinned to a tenant filter is the intended pattern for Algolia/Meili/Typesense. Flag only admin-level or unscoped keys.
- **Defaults acceptable for small indexes**: for a prototype with <1k docs, default ranking and no synonyms are acceptable. Flag when the index is production-scale.
- **Typo tolerance deliberately off on identifier fields**: this is the correct pattern. Flag only when it's disabled across text-searchable attributes.
- **Partial updates used intentionally**: `partialUpdateObjects` is correct for incremental field updates; flag only when the data model requires full replacement.
- **Hybrid search with documented, tuned weights**: if there's a justification (tuning harness, A/B tests) for the combination, it's not naive. Flag unjustified ad-hoc weighting.

## Severity Guidance

| Finding | Severity |
|---|---|
| Admin/master API key exposed in frontend bundle or public env | Critical |
| Typesense `documents:write` key in client app | Critical |
| Hybrid search combining BM25 + cosine additively (wrong scores) | Important |
| Embedding model changed without reindex (hybrid search) | Critical |
| Filter/facet attribute used but not declared in index settings | Important |
| Ranking rules at defaults for a business-critical index | Important |
| Search-only key too broad (no tenant filter where required) | Important |
| Breaking schema change without reindex or alias swap | Important |
| Indexing pipeline swallows per-doc errors silently | Important |
| Public search endpoint without rate limiting | Important |
| `saveObjects` used where partial update is required (or vice versa) | Important |
| No click/conversion analytics in production search | Minor |
| No snapshot / backup for self-hosted Meili / Typesense | Minor |
| Typo tolerance at defaults on identifier-only index | Minor |
| Synonyms / stopwords unconfigured for non-English content | Minor |
| InstantSearch without server-side proxy for rate control | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- API key scope, rotation, and storage
- `sec-owasp-a05-misconfiguration` -- default ACLs and open search endpoints
- `sec-owasp-a10-ssrf` -- server-side search proxies should not fetch arbitrary URLs
- `data-vector-modeling` -- embedding models, vector fields, hybrid retrieval contracts
- `perf-network-io` -- timeouts and batching on search calls
- `ai-llm-rag-quality` -- hybrid retrieval in RAG pipelines

## Authoritative References

- [Algolia Secured API Keys](https://www.algolia.com/doc/guides/security/api-keys/how-to/generate-a-secured-api-key/)
- [Meilisearch Tenant Tokens](https://www.meilisearch.com/docs/learn/security/tenant_tokens)
- [Typesense Scoped API Keys](https://typesense.org/docs/latest/api/api-keys.html#generate-scoped-search-key)
- [Meilisearch Synonyms, Stop Words, Ranking Rules](https://www.meilisearch.com/docs/learn/configuration/settings)
- [Typesense Schema and Ranking](https://typesense.org/docs/latest/api/collections.html)
- [Tantivy Indexing Guide](https://docs.rs/tantivy/latest/tantivy/)
- [Reciprocal Rank Fusion (RRF)](https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf)
- [Algolia Ranking and Relevance](https://www.algolia.com/doc/guides/managing-results/relevance-overview/)
