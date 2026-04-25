---
id: ai-llm-hallucination-handling
type: primary
depth_role: leaf
focus: Detect missing grounding or citation mechanisms, output not cross-checked against source, absent user warnings about potential inaccuracy, missing confidence scores, and hallucinated URLs or references
parents:
  - index.md
covers:
  - "No grounding mechanism (citations, source attribution) for factual claims"
  - LLM output not cross-checked against source documents
  - User not warned about potential inaccuracy in LLM-generated content
  - Missing confidence scores or uncertainty indicators
  - Hallucinated URLs, references, or identifiers presented as real
  - LLM output used for critical decisions without human verification
  - No distinction between retrieved facts and generated inferences
tags:
  - hallucination
  - grounding
  - citation
  - confidence
  - factual-accuracy
  - disclaimer
  - RAG
activation:
  file_globs:
    - "**/*llm*"
    - "**/*chat*"
    - "**/*rag*"
    - "**/*answer*"
    - "**/*response*"
    - "**/*generate*"
  keyword_matches:
    - citation
    - source
    - reference
    - ground
    - grounding
    - hallucinate
    - hallucination
    - confidence
    - score
    - disclaimer
    - verify
    - fact_check
    - provenance
  structural_signals:
    - llm_output_without_citation
    - no_disclaimer
    - unverified_url
source:
  origin: file
  path: ai-llm-hallucination-handling.md
  hash: "sha256:3f29b2f4589c47ccf6dbe90618a439358ecb632a6f0e564df126d77ce970c49f"
---
# Hallucination Handling

## When This Activates

Activates when diffs render LLM-generated content to users, use LLM output for decision-making, display citations or references from LLM responses, or implement RAG answer generation. LLMs hallucinate -- they generate plausible-sounding but factually incorrect content, including fake URLs, non-existent references, and fabricated statistics. Every system using LLM output must account for this with grounding, verification, and user awareness.

## Audit Surface

- [ ] LLM-generated factual claims without citations
- [ ] RAG response not indicating supporting documents
- [ ] No disclaimer about potential inaccuracy
- [ ] LLM-generated URLs or references not validated
- [ ] LLM output for critical decisions without human review
- [ ] No confidence score or abstention mechanism
- [ ] LLM-generated code executed without review
- [ ] No provenance tracking from output to sources
- [ ] Summaries not checked against originals
- [ ] Numeric values from LLM used without verification

## Detailed Checks

### Grounding and Citation
<!-- activation: keywords=["citation", "cite", "source", "reference", "document", "chunk", "context", "ground", "provenance", "attribute"] -->

- [ ] **No citation mechanism**: flag LLM-generated answers that present factual claims without linking to source documents, URLs, or retrieval results -- citations allow users to verify claims and build trust
- [ ] **RAG without source attribution**: flag RAG pipelines where the answer is generated from retrieved chunks but the response does not indicate which chunks support which claims -- the user cannot distinguish retrieved facts from generated inferences
- [ ] **No provenance tracking**: flag systems where it is impossible to trace an LLM output back to the source documents that informed it -- provenance is essential for debugging, auditing, and user trust
- [ ] **Hallucinated citations not validated**: flag LLM-generated citations (URLs, DOIs, paper titles, book references) that are not validated against a real source -- LLMs frequently generate plausible-looking but non-existent references

### User Awareness and Disclaimers
<!-- activation: keywords=["disclaimer", "warning", "notice", "accuracy", "verify", "AI-generated", "may contain errors", "not verified"] -->

- [ ] **No inaccuracy disclaimer**: flag user-facing LLM output displayed without a disclaimer that the content is AI-generated and may contain errors -- users should know to verify critical information
- [ ] **Critical decisions without human gate**: flag LLM output used for medical, legal, financial, hiring, or safety-critical decisions without a mandatory human review step -- hallucinated advice in these domains causes real harm
- [ ] **Generated content indistinguishable from verified content**: flag UIs where LLM-generated text appears alongside human-written or verified content with no visual distinction -- users must be able to identify AI-generated content

### Confidence and Abstention
<!-- activation: keywords=["confidence", "score", "probability", "uncertain", "abstain", "refuse", "I don't know", "cannot answer", "not sure"] -->

- [ ] **No abstention mechanism**: flag LLM systems that always produce an answer regardless of confidence -- the system should be able to say "I don't have enough information to answer" rather than hallucinating
- [ ] **No confidence scoring**: flag systems where the LLM's output is treated as equally reliable regardless of the query -- implement confidence estimation (self-evaluation, retrieval score thresholding) and surface uncertainty to users
- [ ] **Overconfident presentation**: flag LLM output presented with absolute certainty language ("The answer is...") when the model has no mechanism to assess its own confidence -- use hedging language or confidence indicators

### Verification of Generated Artifacts
<!-- activation: keywords=["URL", "link", "http", "code", "command", "execute", "run", "statistic", "number", "percentage", "date", "name"] -->

- [ ] **Unverified URLs**: flag LLM-generated URLs displayed to users or used in HTTP requests without validating that the URLs resolve to real pages -- hallucinated URLs may point to attacker-controlled domains
- [ ] **Unverified statistics or numbers**: flag LLM-generated numeric claims (statistics, dates, measurements) used in calculations or displayed as facts without cross-checking against a reliable source
- [ ] **Generated code executed without review**: flag LLM-generated code or shell commands that are executed automatically without human review or sandboxing -- the code may contain bugs, security vulnerabilities, or destructive operations

### Monitoring and Detection
<!-- activation: keywords=["monitor", "detect", "measure", "rate", "metric", "faithfulness", "groundedness", "consistency"] -->

- [ ] **No hallucination monitoring in production**: flag production LLM systems with no runtime hallucination detection (semantic similarity to source documents, factual consistency checks, HHEM model) -- hallucination rates can increase due to prompt changes, model updates, or input distribution shifts
- [ ] **No feedback loop**: flag user-facing LLM systems with no mechanism for users to report inaccurate responses -- user feedback is the most reliable hallucination signal at scale
- [ ] **Summaries not checked for faithfulness**: flag summarization pipelines that do not verify the summary against the source document for factual consistency -- summaries commonly introduce facts not present in the source (intrinsic hallucination)

## Common False Positives

- **Creative writing and brainstorming**: factual accuracy and citations are not relevant for creative tasks (writing fiction, generating ideas, brainstorming). Do not flag hallucination handling for creative use cases.
- **Internal developer tools**: tools where the developer reviews all LLM output before acting on it have a built-in human gate. Note the context.
- **Chatbot disclaimers in terms of service**: some products address the disclaimer requirement in their terms of service rather than inline. Verify before flagging.

## Severity Guidance

| Finding | Severity |
|---|---|
| LLM output for medical/legal/financial decisions without human review | Critical |
| LLM-generated URLs used in HTTP requests without validation | Important |
| No citation mechanism for factual LLM output | Important |
| No inaccuracy disclaimer on user-facing LLM content | Important |
| RAG answer without source attribution | Minor |
| No confidence scoring or abstention mechanism | Minor |
| LLM-generated statistics used without verification | Minor |

## See Also

- `ai-llm-rag-quality` -- RAG is the primary grounding mechanism to reduce hallucination
- `ai-llm-eval-harness` -- hallucination rate should be a key evaluation metric
- `ai-llm-output-validation-structured` -- structural validation catches some hallucinated content
- `ai-llm-prompt-engineering-quality` -- well-structured prompts with citations reduce hallucination

## Authoritative References

- [Anthropic, "Reducing Hallucinations"](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/reduce-hallucinations)
- [OWASP Top 10 for LLM Applications -- LLM09: Misinformation](https://genai.owasp.org/)
- [Vectara, "HHEM: Hughes Hallucination Evaluation Model"](https://huggingface.co/vectara/hallucination_evaluation_model)
- [Google, "Grounding with Google Search"](https://cloud.google.com/vertex-ai/generative-ai/docs/grounding/overview)
