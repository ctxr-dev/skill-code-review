---
id: ai-llm-eval-harness
type: primary
depth_role: leaf
focus: Detect missing evaluation before deployment, unversioned eval datasets, uncalibrated LLM-as-judge, untracked metrics over time, and evaluation not integrated into CI
parents:
  - index.md
covers:
  - No evaluation suite before LLM feature deployment
  - Eval dataset not versioned alongside code
  - LLM-as-judge without calibration or inter-annotator agreement
  - "Metrics not tracked over time (no regression detection)"
  - "Evaluation not integrated into CI/CD pipeline"
  - "Eval covering only happy path (no adversarial or edge cases)"
  - No baseline comparison for new prompts or models
tags:
  - evaluation
  - eval
  - benchmark
  - LLM-as-judge
  - CI
  - regression
  - metrics
  - dataset
activation:
  file_globs:
    - "**/*eval*"
    - "**/*bench*"
    - "**/*test*llm*"
    - "**/*metric*"
    - "**/*judge*"
  keyword_matches:
    - eval
    - evaluate
    - benchmark
    - metric
    - accuracy
    - f1
    - precision
    - recall
    - judge
    - grader
    - score
    - dataset
    - test_set
    - golden
    - baseline
    - ragas
    - deepeval
    - promptfoo
  structural_signals:
    - no_eval_before_deploy
    - eval_dataset_unversioned
    - metrics_not_tracked
source:
  origin: file
  path: ai-llm-eval-harness.md
  hash: "sha256:9b2a58ee312e57dec0e4db229bf48b44ea84360fb21ffbc1d76bce81dc9e05eb"
---
# LLM Evaluation Harness

## When This Activates

Activates when diffs add or modify LLM prompts, model configurations, RAG pipelines, or agent behaviors without corresponding evaluation updates. LLM features without evaluation are untestable -- prompt changes, model upgrades, and RAG modifications can silently degrade quality. Evaluation must be versioned, automated, calibrated, and integrated into the deployment pipeline.

## Audit Surface

- [ ] LLM feature with no eval script or benchmark
- [ ] Eval dataset as unversioned local file
- [ ] LLM-as-judge without calibration
- [ ] Eval metrics not stored across runs
- [ ] CI pipeline without LLM evaluation step
- [ ] Eval dataset with fewer than 20 examples
- [ ] No adversarial examples in eval dataset
- [ ] Exact match only (no semantic evaluation)
- [ ] Model/prompt change without re-running eval
- [ ] No statistical significance on eval results

## Detailed Checks

### Evaluation Existence and Coverage
<!-- activation: keywords=["eval", "test", "benchmark", "suite", "golden", "dataset", "examples"] -->

- [ ] **No evaluation for LLM feature**: flag new LLM-powered features (prompt, chain, agent, RAG pipeline) with no corresponding evaluation script, test file, or benchmark -- deploying without evaluation is deploying blind
- [ ] **Eval covers only happy path**: flag eval datasets containing only straightforward examples with no adversarial inputs, edge cases, or known failure modes -- evals must stress-test the system
- [ ] **Eval dataset too small**: flag evaluation datasets with fewer than 20 examples -- small datasets produce unreliable metrics with wide confidence intervals
- [ ] **No baseline comparison**: flag prompt or model changes evaluated in isolation without comparison to the previous version's metrics -- without a baseline, you cannot determine if the change improved or degraded quality

### Dataset Versioning and Management
<!-- activation: keywords=["dataset", "data", "version", "git", "dvc", "track", "golden", "ground_truth", "label"] -->

- [ ] **Unversioned eval dataset**: flag eval datasets stored as local files not tracked in version control (git, DVC, or artifact store) -- unversioned datasets make results unreproducible
- [ ] **Dataset not updated with feature changes**: flag changes to prompts or retrieval logic without corresponding updates to the eval dataset -- the eval should cover the new behavior
- [ ] **No data provenance**: flag eval datasets with no documentation of how examples were collected, labeled, and validated -- provenance is essential for understanding eval limitations

### LLM-as-Judge Calibration
<!-- activation: keywords=["judge", "grader", "LLM_judge", "auto_eval", "score", "rubric", "criteria"] -->

- [ ] **Uncalibrated LLM judge**: flag LLM-as-judge implementations with no calibration against human labels -- LLM judges have systematic biases (verbosity preference, position bias) that must be measured
- [ ] **No judge rubric**: flag LLM judges evaluating with vague criteria ("rate the quality 1-5") instead of a specific rubric with examples for each score level -- vague criteria produce inconsistent scores
- [ ] **Single judge model**: flag evaluation relying on a single LLM as judge without cross-validation against a second judge or human annotations -- single-model evaluation inherits that model's blind spots

### CI Integration and Regression Tracking
<!-- activation: keywords=["CI", "pipeline", "github_action", "workflow", "deploy", "merge", "regression", "track", "history", "trend"] -->

- [ ] **Eval not in CI**: flag LLM evaluation that runs only manually and is not integrated into the CI/CD pipeline -- manual evaluation is skipped under deadline pressure; automate it
- [ ] **No regression detection**: flag evaluation metrics that are computed but not compared against a threshold or previous run -- without regression gates, a failing eval does not block deployment
- [ ] **No metric history**: flag eval results that are printed to stdout but not stored in a database, file, or tracking service -- without history, trends and gradual degradation are invisible

### Evaluation Robustness
<!-- activation: keywords=["variance", "confidence", "bootstrap", "significant", "A/B", "split", "cross", "stratified"] -->

- [ ] **No confidence intervals**: flag evaluation metrics reported as point estimates without confidence intervals or variance measures -- small eval sets produce unreliable point estimates; report 95% confidence intervals via bootstrapping
- [ ] **No stratified evaluation**: flag evaluations that report only aggregate metrics without breakdowns by category, difficulty, or input type -- aggregate metrics can mask poor performance on important subsets
- [ ] **Eval on training data**: flag evaluation scripts that may be running on data that overlaps with training or fine-tuning data -- contaminated evaluation produces misleadingly high metrics

## Common False Positives

- **Prototype and exploration code**: early experiments do not need CI-integrated evaluation. Flag with a note but reduce severity for code in prototype directories.
- **Evaluation in separate repository**: some teams maintain eval datasets and harnesses in a separate repo. Verify before flagging that no eval exists.
- **Human-in-the-loop evaluation**: some products rely on user feedback and human review rather than automated evaluation. This is valid but should be documented.

## Severity Guidance

| Finding | Severity |
|---|---|
| LLM feature deployed to production with no evaluation | Critical |
| Model or prompt change without re-running evaluation | Important |
| Eval dataset unversioned | Important |
| LLM-as-judge without calibration against human labels | Important |
| Eval not integrated into CI | Minor |
| Eval dataset with fewer than 20 examples | Minor |
| No metric history tracking | Minor |

## See Also

- `ai-llm-rag-quality` -- RAG-specific evaluation metrics (retrieval recall, faithfulness)
- `ai-llm-prompt-engineering-quality` -- prompt changes must be evaluated before deployment
- `ai-llm-hallucination-handling` -- hallucination detection is a key eval dimension
- `ai-llm-cost-token-spend-monitoring` -- eval runs consume tokens and should be budgeted

## Authoritative References

- [Anthropic, "Test and Evaluate"](https://docs.anthropic.com/en/docs/test-and-evaluate/overview)
- [OpenAI, "Evaluation Best Practices"](https://cookbook.openai.com/examples/evaluation/getting_started_with_openai_evals)
- [RAGAS -- RAG evaluation framework](https://docs.ragas.io/)
- [DeepEval -- LLM evaluation framework](https://docs.confident-ai.com/)
- [Promptfoo -- prompt evaluation and testing](https://www.promptfoo.dev/)
- [Braintrust -- LLM evaluation platform](https://www.braintrust.dev/)
