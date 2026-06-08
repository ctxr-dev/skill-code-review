---
id: ai-ml
type: index
depth_role: subcategory
depth: 1
focus: "ai-ml: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems; Detect PII in training data or..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - agent
  - airflow
  - alerting
  - ann
  - anthropic
  - api-key
  - authorization
  - benchmark
  - bias
  - buffering
  - callback
  - chain
  - checkpoint
  - chromadb
  - chunking
  - ci
  - citation
  - cohere
  - confidence
  - content-filtering
generator: "skill-llm-wiki/v1"
entries:
  - id: ai-llm-agent-design
    file: ai-llm-agent-design.md
    type: primary
    focus: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems
    tags:
      - agent
      - loop
      - iteration-limit
      - human-in-the-loop
      - state-persistence
      - multi-agent
      - reflection
  - id: ai-llm-bias-and-privacy-leakage
    file: ai-llm-bias-and-privacy-leakage.md
    type: primary
    focus: Detect PII in training data or prompts, model output containing PII from context, missing content filtering, bias in prompt design, and absent fairness evaluation
    tags:
      - privacy
      - PII
      - bias
      - fairness
      - content-filtering
      - GDPR
      - data-protection
      - ethics
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
  - id: ai-llm-eval-harness
    file: ai-llm-eval-harness.md
    type: primary
    focus: Detect missing evaluation before deployment, unversioned eval datasets, uncalibrated LLM-as-judge, untracked metrics over time, and evaluation not integrated into CI
    tags:
      - evaluation
      - eval
      - benchmark
      - LLM-as-judge
      - CI
      - regression
      - metrics
      - dataset
  - id: ai-llm-frameworks-langchain-llamaindex-haystack-dspy
    file: ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md
    type: primary
    focus: "Detect framework abstraction hiding errors, deprecated API usage, unhandled chain/pipeline errors, unbounded conversation memory, and callback handlers with side effects"
    tags:
      - LangChain
      - LlamaIndex
      - Haystack
      - DSPy
      - framework
      - chain
      - pipeline
      - memory
      - callback
      - deprecation
  - id: ai-llm-hallucination-handling
    file: ai-llm-hallucination-handling.md
    type: primary
    focus: Detect missing grounding or citation mechanisms, output not cross-checked against source, absent user warnings about potential inaccuracy, missing confidence scores, and hallucinated URLs or references
    tags:
      - hallucination
      - grounding
      - citation
      - confidence
      - factual-accuracy
      - disclaimer
      - RAG
  - id: ai-llm-mcp-server-discipline
    file: ai-llm-mcp-server-discipline.md
    type: primary
    focus: Detect MCP tools without input schema validation, missing tool descriptions, overly broad tool capabilities, missing error responses, transport security issues, and absent rate limiting on tool calls
    tags:
      - MCP
      - model-context-protocol
      - tool-server
      - schema-validation
      - transport-security
      - rate-limiting
  - id: ai-llm-output-validation-structured
    file: ai-llm-output-validation-structured.md
    type: primary
    focus: "Detect LLM output parsed without schema validation, JSON mode not used when available, missing retry on malformed output, lack of Pydantic/Zod validation, and raw LLM text rendered as HTML"
    tags:
      - LLM-output
      - validation
      - structured-output
      - JSON-mode
      - XSS
      - Pydantic
      - Zod
      - parsing
  - id: ai-llm-prompt-injection-defense
    file: ai-llm-prompt-injection-defense.md
    type: primary
    focus: "Detect user input concatenated into prompts without sanitization, missing input/output guardrails, extractable system prompts, tool-use without authorization, and indirect injection via retrieved documents"
    tags:
      - prompt-injection
      - LLM-security
      - guardrails
      - tool-use
      - RAG-injection
      - OWASP-LLM
      - prompt-engineering
      - LLM
      - system-prompt
      - few-shot
      - prompt-template
      - output-format
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
  - id: ai-llm-sdk-anthropic-openai-cohere
    file: ai-llm-sdk-anthropic-openai-cohere.md
    type: primary
    focus: Detect missing API key rotation, hardcoded model names, absent retry with backoff on rate limits, missing streaming error handling, unvalidated responses, absent usage tracking, and max_tokens not set
    tags:
      - SDK
      - API-key
      - Anthropic
      - OpenAI
      - Cohere
      - retry
      - rate-limit
      - streaming
      - token-usage
      - max-tokens
  - id: ai-llm-streaming-latency
    file: ai-llm-streaming-latency.md
    type: primary
    focus: Detect streaming not used for user-facing responses, TTFT not measured, missing partial response handling, unhandled streaming errors, and buffering that defeats the purpose of streaming
    tags:
      - streaming
      - latency
      - TTFT
      - SSE
      - WebSocket
      - buffering
      - user-experience
      - real-time
  - id: ai-llm-tool-use-safety
    file: ai-llm-tool-use-safety.md
    type: primary
    focus: Detect tools executing arbitrary code from LLM output, tools without authorization checks, unvalidated tool output returned to the LLM, missing tool timeouts, and non-idempotent tool side effects
    tags:
      - tool-use
      - function-calling
      - LLM-safety
      - authorization
      - idempotency
      - sandbox
      - agent
  - id: ai-ml-data-pipelines-pandas-polars-dask-spark
    file: ai-ml-data-pipelines-pandas-polars-dask-spark.md
    type: primary
    focus: Detect pandas on data too large for memory, missing dtypes with object columns, chained indexing, Spark shuffle too wide, missing schema validation on input, and Polars lazy not collected
    tags:
      - pandas
      - Polars
      - Dask
      - Spark
      - DataFrame
      - data-pipeline
      - memory
      - dtype
      - schema
      - shuffle
  - id: ai-ml-distributed-training-ddp-fsdp-deepspeed
    file: ai-ml-distributed-training-ddp-fsdp-deepspeed.md
    type: primary
    focus: Detect gradient synchronization bugs, uneven data distribution, missing checkpoint saving, FSDP shard configuration mismatches, NCCL timeouts, and DeepSpeed ZeRO stage mischoice
    tags:
      - distributed-training
      - DDP
      - FSDP
      - DeepSpeed
      - ZeRO
      - NCCL
      - gradient-sync
      - checkpoint
      - multi-GPU
  - id: ai-ml-experiment-tracking-mlflow-wandb
    file: ai-ml-experiment-tracking-mlflow-wandb.md
    type: primary
    focus: Detect experiments not logged, hyperparameters not tracked, model artifacts not versioned, missing comparison between runs, and absent model registry usage
    tags:
      - experiment-tracking
      - MLflow
      - "W&B"
      - Weights-and-Biases
      - TensorBoard
      - model-registry
      - reproducibility
      - MLOps
  - id: ai-ml-gpu-cuda-pitfalls
    file: ai-ml-gpu-cuda-pitfalls.md
    type: primary
    focus: Detect CPU-GPU transfer in hot loops, missing CUDA stream synchronization, OOM without gradient checkpointing, kernel launch overhead, and pinned memory not used for data transfer
    tags:
      - GPU
      - CUDA
      - memory-transfer
      - stream
      - kernel-launch
      - gradient-checkpointing
      - pinned-memory
      - OOM
  - id: ai-ml-orchestration-airflow-prefect-dagster-kubeflow
    file: ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md
    type: primary
    focus: Detect DAG import side effects, oversized tasks, missing retries on transient failures, hardcoded connections, and absent failure alerting in ML pipeline orchestrators
    tags:
      - orchestration
      - Airflow
      - Prefect
      - Dagster
      - Kubeflow
      - DAG
      - pipeline
      - retry
      - idempotency
      - alerting
  - id: ai-ml-training-pytorch-tensorflow-jax-sklearn
    file: ai-ml-training-pytorch-tensorflow-jax-sklearn.md
    type: primary
    focus: Detect GPU training without mixed precision, data loading bottlenecks, missing gradient clipping, absent learning rate schedules, overfitting from no validation split, and reproducibility issues from unseeded randomness
    tags:
      - training
      - PyTorch
      - TensorFlow
      - JAX
      - sklearn
      - mixed-precision
      - gradient-clipping
      - learning-rate
      - reproducibility
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Ai Ml

**Focus:** ai-ml: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems; Detect PII in training data or...

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-agent-design.md](ai-llm-agent-design.md) | 📄 primary | Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems |
| [ai-llm-bias-and-privacy-leakage.md](ai-llm-bias-and-privacy-leakage.md) | 📄 primary | Detect PII in training data or prompts, model output containing PII from context, missing content filtering, bias in prompt design, and absent fairness evaluation |
| [ai-llm-embeddings-hygiene.md](ai-llm-embeddings-hygiene.md) | 📄 primary | Detect embedding model version not pinned, dimension mismatches between index and query, stale embeddings not recomputed on model change, and inconsistent text preprocessing between index and query time |
| [ai-llm-eval-harness.md](ai-llm-eval-harness.md) | 📄 primary | Detect missing evaluation before deployment, unversioned eval datasets, uncalibrated LLM-as-judge, untracked metrics over time, and evaluation not integrated into CI |
| [ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md](ai-llm-frameworks-langchain-llamaindex-haystack-dspy.md) | 📄 primary | Detect framework abstraction hiding errors, deprecated API usage, unhandled chain/pipeline errors, unbounded conversation memory, and callback handlers with side effects |
| [ai-llm-hallucination-handling.md](ai-llm-hallucination-handling.md) | 📄 primary | Detect missing grounding or citation mechanisms, output not cross-checked against source, absent user warnings about potential inaccuracy, missing confidence scores, and hallucinated URLs or references |
| [ai-llm-mcp-server-discipline.md](ai-llm-mcp-server-discipline.md) | 📄 primary | Detect MCP tools without input schema validation, missing tool descriptions, overly broad tool capabilities, missing error responses, transport security issues, and absent rate limiting on tool calls |
| [ai-llm-output-validation-structured.md](ai-llm-output-validation-structured.md) | 📄 primary | Detect LLM output parsed without schema validation, JSON mode not used when available, missing retry on malformed output, lack of Pydantic/Zod validation, and raw LLM text rendered as HTML |
| [ai-llm-prompt-injection-defense.md](ai-llm-prompt-injection-defense.md) | 📄 primary | Detect user input concatenated into prompts without sanitization, missing input/output guardrails, extractable system prompts, tool-use without authorization, and indirect injection via retrieved documents |
| [ai-llm-rag-quality.md](ai-llm-rag-quality.md) | 📄 primary | Detect RAG pipeline issues including improper chunk sizing, missing overlap, retrieval without reranking, absent relevance thresholds, context window overflow, and missing evaluation metrics |
| [ai-llm-sdk-anthropic-openai-cohere.md](ai-llm-sdk-anthropic-openai-cohere.md) | 📄 primary | Detect missing API key rotation, hardcoded model names, absent retry with backoff on rate limits, missing streaming error handling, unvalidated responses, absent usage tracking, and max_tokens not set |
| [ai-llm-streaming-latency.md](ai-llm-streaming-latency.md) | 📄 primary | Detect streaming not used for user-facing responses, TTFT not measured, missing partial response handling, unhandled streaming errors, and buffering that defeats the purpose of streaming |
| [ai-llm-tool-use-safety.md](ai-llm-tool-use-safety.md) | 📄 primary | Detect tools executing arbitrary code from LLM output, tools without authorization checks, unvalidated tool output returned to the LLM, missing tool timeouts, and non-idempotent tool side effects |
| [ai-ml-data-pipelines-pandas-polars-dask-spark.md](ai-ml-data-pipelines-pandas-polars-dask-spark.md) | 📄 primary | Detect pandas on data too large for memory, missing dtypes with object columns, chained indexing, Spark shuffle too wide, missing schema validation on input, and Polars lazy not collected |
| [ai-ml-distributed-training-ddp-fsdp-deepspeed.md](ai-ml-distributed-training-ddp-fsdp-deepspeed.md) | 📄 primary | Detect gradient synchronization bugs, uneven data distribution, missing checkpoint saving, FSDP shard configuration mismatches, NCCL timeouts, and DeepSpeed ZeRO stage mischoice |
| [ai-ml-experiment-tracking-mlflow-wandb.md](ai-ml-experiment-tracking-mlflow-wandb.md) | 📄 primary | Detect experiments not logged, hyperparameters not tracked, model artifacts not versioned, missing comparison between runs, and absent model registry usage |
| [ai-ml-gpu-cuda-pitfalls.md](ai-ml-gpu-cuda-pitfalls.md) | 📄 primary | Detect CPU-GPU transfer in hot loops, missing CUDA stream synchronization, OOM without gradient checkpointing, kernel launch overhead, and pinned memory not used for data transfer |
| [ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md](ai-ml-orchestration-airflow-prefect-dagster-kubeflow.md) | 📄 primary | Detect DAG import side effects, oversized tasks, missing retries on transient failures, hardcoded connections, and absent failure alerting in ML pipeline orchestrators |
| [ai-ml-training-pytorch-tensorflow-jax-sklearn.md](ai-ml-training-pytorch-tensorflow-jax-sklearn.md) | 📄 primary | Detect GPU training without mixed precision, data loading bottlenecks, missing gradient clipping, absent learning rate schedules, overfitting from no validation split, and reproducibility issues from unseeded randomness |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
