---
id: experimentation-ab-testing-discipline
type: primary
depth_role: leaf
focus: "Detect A/B test and experimentation gaps including missing primary metric, peeking before sample size reached, multiple-comparisons without correction, unmonitored SRM, broken stratified assignment, missing guardrail metrics, no power analysis, and no post-rollout holdout validation"
parents:
  - index.md
covers:
  - Experiment launched without a pre-registered primary metric or hypothesis
  - Results checked and decisions made before the pre-agreed sample size is reached
  - "Many metrics compared without Bonferroni / Benjamini-Hochberg correction"
  - "Sample ratio mismatch (SRM) not monitored during or after the run"
  - "Guardrail metrics (latency, errors, revenue) not tracked alongside treatment metric"
  - Assignment not consistent across sessions or devices, breaking stratification
  - No post-rollout holdout to validate the measured lift persists in production
  - Novelty or primacy effects ignored in short-run experiments
  - "No power analysis or minimum detectable effect (MDE) calculated before launch"
  - Bucketing hash skewed or collides with other concurrent experiments
tags:
  - experimentation
  - ab-testing
  - statistics
  - growth
  - product-analytics
  - feature-flags
  - statsig
  - optimizely
  - growthbook
  - split-io
activation:
  file_globs:
    - "**/*experiment*"
    - "**/*ab_test*"
    - "**/*abtest*"
    - "**/*variation*"
    - "**/*treatment*"
    - "**/*bucket*"
    - "**/*assignment*"
    - "**/*statsig*"
    - "**/*optimizely*"
    - "**/*growthbook*"
    - "**/*split*"
  keyword_matches:
    - experiment
    - ab_test
    - "a/b"
    - variation
    - treatment
    - control
    - bucketing
    - assignment
    - p-value
    - confidence interval
    - sample size
    - Statsig
    - Optimizely
    - GrowthBook
    - split.io
    - SRM
    - guardrail
    - MDE
    - primary_metric
  structural_signals:
    - Experiment configuration or flag definition
    - Analysis notebook or SQL over experiment exposures
    - Assignment function or bucketing layer
    - Statistical readout or decision document
source:
  origin: file
  path: experimentation-ab-testing-discipline.md
  hash: "sha256:016b87a0899196b9366b8155cb513af278b243a3594685cefeebd7195b29ed5f"
---
# Experimentation and A/B Testing Discipline

## When This Activates

Activates when diffs touch experiment configuration, assignment or bucketing logic, analysis notebooks, readout dashboards, or decision documents that compare a treatment arm against a control. A/B tests drive product decisions at scale, so statistical rigor is load-bearing -- bad experiments cause the wrong feature to ship and the right one to be rejected. The most common failures are organizational (peeking, no pre-registration, metric drift) rather than mathematical. Reviewers should treat an experiment like a scientific protocol: if the hypothesis, primary metric, sample size, and stopping rule were not fixed before exposure started, the result is advisory at best.

**Key Requirements**: pre-registered hypothesis and primary metric, power analysis before launch, SRM monitoring during the run, multiple-comparisons correction for secondary metrics, post-rollout holdout validation.

## Audit Surface

- [ ] Experiment config or flag defined without a primary_metric field
- [ ] Analysis notebook querying results before the scheduled end date
- [ ] Multiple metric comparisons in one dashboard without alpha correction
- [ ] Assignment function using random() instead of deterministic hash(user_id)
- [ ] Bucketing keyed on session/cookie instead of stable user identifier
- [ ] Experiment readout with no SRM chi-square or assignment ratio check
- [ ] No guardrail metric set (latency, error rate, crash rate, revenue)
- [ ] Experiment spec with no minimum sample size or MDE documented
- [ ] Experiment spec with no pre-registered hypothesis or success criteria
- [ ] Rollout to 100% with no holdout cohort preserved for validation
- [ ] Short-duration experiment (< 1 week) on a retention or habit metric
- [ ] Interaction with overlapping experiment not considered in assignment layer
- [ ] p-value reported without confidence interval or effect size
- [ ] Metric definition changed mid-experiment without restart
- [ ] Stop-early logic with no sequential testing correction (mSPRT, always-valid)

## Detailed Checks

### Pre-registration and Primary Metric
<!-- activation: keywords=["primary_metric", "hypothesis", "success_criteria", "experiment_spec", "readme", "config"] -->

- [ ] **No primary metric in experiment config**: flag experiments defined in Statsig / Optimizely / GrowthBook / Split / LaunchDarkly configs without an explicit `primary_metric` or equivalent. Without a pre-registered primary metric, every post-hoc metric comparison inflates the false-positive rate
- [ ] **No pre-registered hypothesis**: flag experiment specs (READMEs, design docs, ticket bodies) missing a one-sentence hypothesis of the form "changing X will move primary metric Y by at least Z in direction D". Absent this, the team has no falsifiable prediction
- [ ] **Success criteria defined after readout**: flag commits where the acceptance threshold (ship/no-ship bar) is edited after the analysis query has been run. This is HARKing (hypothesizing after results known)

### Power Analysis and Sample Size
<!-- activation: keywords=["sample_size", "power", "MDE", "minimum_detectable_effect", "alpha", "beta", "duration"] -->

- [ ] **No MDE calculation**: flag experiment launches without a documented minimum detectable effect and required sample size. Underpowered tests waste traffic and produce noisy nulls
- [ ] **Sample size set by calendar, not power**: flag experiments scheduled for "one sprint" or "two weeks" without a calculation tying duration to traffic volume, baseline variance, and MDE
- [ ] **Ignoring weekly seasonality**: flag experiments running for non-multiples of 7 days when the metric has weekly seasonality (retail, B2B SaaS). At minimum, run one full week
- [ ] **Novelty/primacy window ignored**: flag short (< 1 week) experiments on retention, habit, or learning-curve metrics without acknowledging that the first days of exposure are dominated by novelty or primacy effects

### Peeking and Sequential Testing
<!-- activation: keywords=["peek", "interim", "early_stop", "sequential", "mSPRT", "always_valid", "continuous_monitoring"] -->

- [ ] **Decisions made before sample size reached**: flag readouts or rollout commits that occur before the pre-registered stop condition. Each interim peek inflates type-I error; naive alpha=0.05 after N peeks has true alpha well above 0.05
- [ ] **Stop-early logic without correction**: flag code that stops the experiment on a fixed-horizon p-value threshold. If early stopping is desired, use sequential testing (mSPRT, group-sequential designs, always-valid p-values / confidence sequences)
- [ ] **Continuous dashboard without always-valid bounds**: flag live dashboards that display a nominal p-value updating in real time without a sequential correction -- this invites peek-driven decisions

### Multiple Comparisons and Secondary Metrics
<!-- activation: keywords=["secondary_metric", "multiple_comparison", "bonferroni", "fdr", "benjamini", "holm"] -->

- [ ] **No alpha correction on secondary metrics**: flag readouts listing 10+ metrics with per-metric p-values and no Bonferroni, Holm, or Benjamini-Hochberg (FDR) correction. At alpha=0.05 with 20 independent metrics, expected false positives = 1 even under the null
- [ ] **Subgroup-slicing without correction**: flag dashboards that slice by country, device, plan tier, or cohort and declare significance in any slice without adjusting for the number of slices
- [ ] **Cherry-picked secondary metric promoted to headline**: flag decision docs that ignore a null primary and promote a p<0.05 secondary metric as the reason to ship

### Assignment Integrity and SRM
<!-- activation: keywords=["assignment", "bucketing", "hash", "SRM", "sample_ratio", "chi_square", "split"] -->

- [ ] **Non-deterministic assignment**: flag assignment using `random()` instead of a stable hash (e.g., `hash(user_id + experiment_salt) % 100`). Non-deterministic assignment re-buckets users on every request and destroys stratification
- [ ] **Session-scoped key on a user-scoped experiment**: flag bucketing keyed on session ID, cookie, or IP when the experiment measures a user-level metric. A single user landing in both arms contaminates the comparison
- [ ] **No SRM check in readout**: flag analysis notebooks and readout dashboards that do not include a sample ratio mismatch test (chi-square on assignment counts). SRM is the canary for broken assignment, broken filters, or exposure leaks
- [ ] **Overlapping experiments without isolation**: flag new experiments launched on the same surface as an existing one without declaring mutual exclusion or a shared assignment layer. Cross-reference with `principle-feature-flags-and-config`

### Guardrail Metrics
<!-- activation: keywords=["guardrail", "latency", "error_rate", "crash", "revenue", "regression"] -->

- [ ] **No guardrails tracked**: flag experiments without guardrail metrics (p95/p99 latency, error rate, crash rate, revenue per user, support ticket rate). A treatment that moves the primary metric while degrading latency is usually a loss
- [ ] **Guardrail thresholds not defined**: flag guardrail lists without stop conditions ("halt experiment if error rate rises by >10% in treatment"). Guardrails without thresholds are decoration
- [ ] **No automated kill switch on guardrail breach**: flag experiment platforms integrated without a ramp-down or kill-switch hook tied to guardrail regressions. Cross-reference with `principle-feature-flags-and-config`

### Post-rollout Validation and Holdout
<!-- activation: keywords=["holdout", "rollout", "validation", "ship", "graduate"] -->

- [ ] **100% rollout with no holdout**: flag ship decisions that remove the control arm entirely. Keeping a small (1-5%) long-term holdout lets the team detect lift decay, novelty effects, and downstream regressions
- [ ] **No post-rollout readout scheduled**: flag rollouts that do not schedule a 30/60/90-day validation against the holdout. Many "winning" experiments lose most of their lift after the novelty period
- [ ] **Metric definition changed during rollout**: flag commits that modify the metric SQL or event definition during or immediately after rollout. This breaks the pre/post comparison and hides regressions

## Common False Positives

- **Feature flags that are not experiments**: operational rollouts (kill switches, gradual releases) do not require primary metrics or power analysis -- these are governed by `principle-feature-flags-and-config`.
- **Bandit and personalization systems**: multi-armed bandits legitimately adapt assignment over time; flat-assignment A/B rules do not apply.
- **Quasi-experiments and switchback tests**: marketplaces and two-sided platforms often cannot run user-level A/B tests and use switchback, geo-split, or diff-in-diff designs.
- **Exploratory pre-experiments**: A/A tests, instrumentation validation, and power-estimation pilots are expected to be "underpowered" -- they are not ship-decision experiments.
- **Qualitative usability tests**: small-N user studies do not need alpha correction.

## Severity Guidance

| Finding | Severity |
|---|---|
| Non-deterministic or session-keyed assignment | Critical |
| Ship decision made before sample size reached (peeking) | Critical |
| No SRM monitoring on an experiment being used to ship | Critical |
| No primary metric or pre-registered hypothesis | Important |
| No power analysis or MDE documented | Important |
| No guardrail metrics or guardrail thresholds | Important |
| Multiple comparisons without alpha correction | Important |
| Metric definition changed mid-experiment | Important |
| No post-rollout holdout on a 100% rollout | Minor |
| p-value reported without confidence interval | Minor |

## See Also

- `principle-feature-flags-and-config` -- experiment flags share infrastructure with operational flags; mutual-exclusion and kill-switch controls live there
- `ai-ml-experiment-tracking-mlflow-wandb` -- ML experiment tracking covers a different axis (model runs, not user A/B tests), but shares discipline around pre-registered metrics
- `analytics-event-schema-discipline` -- experiment readouts depend on clean, versioned event schemas
- `compliance-gdpr-data-subject-rights` -- experiments touching EU users must respect consent and erasure

## Authoritative References

- [Kohavi, Tang, Xu - Trustworthy Online Controlled Experiments (2020)](https://experimentguide.com/)
- [Microsoft ExP - Sample Ratio Mismatch](https://www.microsoft.com/en-us/research/group/experimentation-platform-exp/articles/diagnosing-sample-ratio-mismatch-in-online-controlled-experiments/)
- [Johari et al. - Always-Valid Inference (mSPRT)](https://arxiv.org/abs/1512.04922)
- [Benjamini & Hochberg - Controlling the False Discovery Rate](https://www.jstor.org/stable/2346101)
- [Statsig - Experimentation Best Practices](https://docs.statsig.com/experiments-plus/best-practices)
- [Optimizely - Stats Engine (sequential testing)](https://www.optimizely.com/optimization-glossary/stats-engine/)
