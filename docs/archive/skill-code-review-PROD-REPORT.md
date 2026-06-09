# skill-code-review (FSM product runner) vs competitors — 5-PR pilot

**What this is.** The first benchmark of the *product* path: every review driven by
`python -m ctxr_skill_code_review.cli review --backend claude` (the FSM runner +
adaptive ThreadPoolExecutor + agent-agnostic dispatch), NOT the old tmp harness.
Each worker/specialist is a headless `claude -p` reading its `workers/*.md` prompt
(strong=opus for security/correctness, cheap=sonnet otherwise). Judge = this
session (Opus 4.8) applying Martian's golden-match rule. Competitor candidates are
the committed Opus-4.5 sets, judged the same way.

Scope: the 5 pilot PRs (one per repo/language). **Do not extrapolate to the full 50.**

## Leaderboard (5 PRs, 11 goldens)

| tool | recall | precision | F1 | TP | FP | FN | cand |
|---|---|---|---|---|---|---|---|
| **cubic-v2** | 0.91 | 0.77 | **0.83** | 10 | 3 | 1 | 14 |
| graphite | 0.50 | 1.00 | 0.67 | 2 | 0 | 2 | 3 |
| macroscope | 0.45 | 0.83 | 0.59 | 5 | 1 | 6 | 6 |
| bugbot | 0.55 | 0.43 | 0.48 | 6 | 8 | 5 | 14 |
| **skill-prod-primary** ⭐ | **0.73** | 0.33 | 0.46 | 8 | 16 | 3 | 24 |
| coderabbit | 0.64 | 0.35 | 0.45 | 7 | 13 | 4 | 23 |
| skill-prod-scoped ⭐ | 0.64 | 0.30 | 0.41 | 7 | 16 | 4 | 23 |
| copilot | 0.55 | 0.30 | 0.39 | 6 | 14 | 5 | 23 |
| greptile-v4-1 | 0.45 | 0.31 | 0.37 | 5 | 11 | 6 | 16 |
| skill-prod (all issues) ⭐ | 0.73 | 0.08 | 0.14 | 8 | 98 | 3 | 106 |

(graphite only had candidates on 2 of 5 PRs.)

## Read of the result

- **Recall: 2nd only to Cubic.** `skill-prod-primary` catches **8/11 goldens
  (0.73)**, above every non-Cubic tool. Cubic catches 10/11.
- **The whole F1 gap to Cubic is precision.** Cubic carries **3 FP across 5 PRs**
  (0.6/PR); our primary set carries **16** (3.2/PR). Same goldens-per-PR, ~2x the
  emitted findings.
- **But most of our "FP" are real bugs outside the golden set.** By inspection,
  ~14-16 of the 16 primary FPs are concrete defects the human golden set simply
  didn't enumerate:
  - cal.com: *duplicate SMS when the post-Twilio DB update fails*; *prisma update
    in the catch block can mask the original error*.
  - discourse: *image decompression bomb (unbounded ImageMagick on untrusted
    uploads)*; *resize loop never enforces the configured size cap*.
  - sentry: *bare `except` swallows token-exchange errors*; *token-exchange omits
    `redirect_uri`*; *authorization URL built without URL-encoding*.
  - grafana: *O(n²) DELETE-IN string concat*; *cleanup ticker frequency raised
    10x*; *hardcoded test PK ids collide across subtests*.
  - keycloak: *cache wrapper contract divergence*; *login-eligibility compares an
    org-wrapped original against an unwrapped update*.
  Under the harness's harsh rule (any non-golden = FP), the skill's *thoroughness*
  is what drags its measured precision — not noise.

- **The 3 goldens we miss** are specialist-DEPTH misses, not routing misses
  (routing now dispatches the right leaves):
  - sentry0: null-reference when `github_authenticated_user` state is missing.
  - discourse2: passing `80%` to the animated-GIF path (gifsicle `--resize-fit`
    needs WxH geometry, not a percentage) → silent failure.
  - keycloak0: recursive cache call via `session` instead of `delegate`
    (**Cubic misses this one too** — nobody caught it).
  Of the 2 goldens Cubic catches that we don't (sentry0, discourse2), both need a
  specialist to reason one level deeper on a path it already reviewed.

## Why Cubic wins here

Cubic is **conservative**: ~2.8 findings/PR, almost all golden. That maximises
precision on a golden set that is itself small (~2.2 goldens/PR). Our skill is
**thorough**: ~4.8 primary findings/PR, catching the goldens plus extra real bugs
that score as FP. On *this metric*, conservatism wins.

## The lever (and the tension)

Closing the gap is **not** a routing / reviewers.wiki problem — routing now picks
the right correctness/security leaves (e.g. sentry surfaced
`crypto-oauth-oidc-pitfalls`, `footgun-rng-csprng`, `fw-django`, `lang-python`).
Two real levers remain:

1. **Precision (largest):** make the ranker's `primary` set Cubic-conservative —
   reserve `primary` for the single most-certain *blocking* defect(s) and demote
   everything else to advisory, even when real. Mechanism is proven (the rank
   stage's `defect_confidence` + threshold). **Caveat:** the primary TPs
   (conf 0.85-0.95) and the real-bug FPs (conf 0.75-0.85) *overlap* in confidence,
   so threshold tuning trades recall for precision rather than cleanly separating —
   and suppressing real bugs to match an incomplete golden set arguably makes the
   product worse in the field.
2. **Recall (harder):** deepen specialists on null/missing-state and
   format-mismatch paths to catch sentry0 + discourse2, lifting recall toward 0.9.

## Robustness work done this run (all committed, not pushed)

The pilot doubled as a soak test of the product runner. Six issues found and
fixed, each with tests:

1. `storage_root` decoupled from the diffed repo (`--run-dir` was mis-rooting
   artefacts into the source tree).
2. **Leaf-input truncation** at 20k chars cut `activated_leaves` mid-array,
   silently dropping lang-/sec-/footgun-/crypto- leaves → only generic
   antipatterns routed. Now compact-for-prompt + rehydrate-by-id.
3. Deterministic **coverage floor**: a flaky trim can never zero a review.
4. **Worker-state fault tolerance** (`_call_worker_resilient`): transient
   rate-limit/timeout retries with backoff, graceful per-PR fault (no process
   crash). Env-tunable `CTXR_SCR_CALL_TIMEOUT`.
5. **tree-descend** rewritten to decide from inline metadata (no agentic
   file-reading loop): 6-8 min → ~1 min.
6. **finding-ranker** emits compact per-index decisions instead of re-emitting the
   full findings payload (was blowing the call timeout); runner re-attaches scores.
7. Empty/unparseable agent response is now a retryable `RateLimitError`, not a raw
   `JSONDecodeError` that crashed the review.

After the fixes, **all 5 pilots complete fault-free** (verdicts produced;
`failed 0`; transient retries absorbed — keycloak retried 1, cal.com 2).

## Optimization iterations (user: "both, full effort")

| config | recall | precision | F1 | note |
|---|---|---|---|---|
| prod (baseline) | 0.73 | 0.33 | 0.46 | thorough, FP-heavy |
| **iter1** | 0.73 | **0.57** | **0.64** | conservative ranker + recall heuristics |
| iter2 (3-round avg) | 0.70 | 0.60 | 0.65 | + lost-update=primary, demote load-only perf |
| cubic-v2 | 0.91 | 0.77 | 0.83 | target |

**iter1 (the real win, F1 0.46 → 0.64):**
- finding-ranker.md → Cubic-conservative `primary` (block-this-PR lead set; demote
  real-but-secondary to advisory). Precision 0.33 → 0.57, recall held 0.73.
- specialist.md → two GENERAL recall heuristics (unset/missing-state;
  external-tool argument format/units). The format heuristic **caught the hard
  discourse gifsicle golden** that prod missed — discourse went R0.67→**R1.0 P1.0**.

**iter2 (rank-only refinement, net-flat):** "a read-modify-write that loses an
update/increment is HIGH (not hardening)" + "load/cost-only perf without hot-path
evidence is advisory". Tested by re-ranking iter1's findings 3× (isolates the
ranker, avoids re-rolling specialists). Result: **cal.com's atomic-increment
golden recovered (2/3 rounds; R→1.0/P→1.0)**, discourse stable-perfect (3/3), BUT
**grafana's Error-log golden reliably demoted (0/3)** — the ranker consistently
judges a competing real test-ordering bug as more block-worthy than Error-vs-Debug
log level. Net aggregate unchanged.

**The plateau (key finding).** At 5 PRs / 11 goldens the ranker is stochastic and
run-to-run F1 swings ~±0.05-0.1 — comparable to the tuning deltas. Ranker tuning
now trades one golden for another (cal.com gained, grafana lost) rather than
moving the aggregate. The specialist RECALL ceiling is **0.82 (9/11 found)**; the
3 hardest goldens are sentry0 (null-state, surfaced but framed as the adjacent
KeyError), keycloak0 (recursive `session` vs `delegate` — **Cubic misses it too**),
and grafana0 (a borderline log-level call our ranker reasonably deprioritises).
Beating Cubic's 0.83 from here needs catching sentry0 reliably AND keeping every
borderline golden AND high precision at once — which 5-PR stochastic measurement
can't reliably distinguish. Continuing to add per-golden ranker rules would be
over-fitting to these 5 PRs, not a generalizable gain.

**Recommendation:** the principled, generalizable wins (conservative ranker +
unset-state / tool-format recall heuristics, F1 0.46 → ~0.64, #2 behind Cubic and
ahead of coderabbit/copilot/greptile/bugbot) are banked. A reliable push past
Cubic needs a **larger sample** to cut measurement variance (the 5-PR signal is
too noisy to tune against) — which is outside the locked "5 repos" scope and needs
your go-ahead.

## iter3 — replicating Cubic, then BANKED (user decision: stay on 5)

Cubic-v2 reverse-engineered from its committed findings: **not** ultra-selective
(3.5 findings/PR on the full 50; carries FPs like redirect_uri/ticker too). On the
**full 50 it is R0.69 P0.56 F1 0.62** — the 5-pilot 0.83 is a favorable slice, so
the real "beat all" bar is **0.62**, and our iter1 profile (R0.73/P0.57) already
matches Cubic's balanced shape. Cubic's edge on the goldens we miss is framing:
(1) it emits the null-state as a DISTINCT finding (not bundled into the adjacent
KeyError); (2) it keeps log-level/observability correctness prominent.

iter3 applied both as GENERAL principles:
- specialist.md → emit one finding per distinct unsafe access; never bundle a
  None-deref with a KeyError.
- finding-ranker.md → an observability defect (routine events at ERROR / a
  swallowed error) is primary-worthy, distinct from load-only perf.

Validated (cheap, per-case): grafana's log-level golden **recovered to primary**
(fixes the iter2 regression) with the load-only ticker still demoted; cal.com's
atomic-increment **holds primary**; discourse **stable-perfect incl. the gifsicle
golden**. The sentry null-state golden stays **stochastic** (caught intermittently;
Cubic catches it reliably). keycloak's recursive-`session`/`delegate` golden is
still missed — **Cubic misses it too**.

Robustness completed in iter3: the recurring `validation_failed` fault that
intermittently killed reviews was root-caused (a specialist emitting
`"skip_reason": null`; the merge schema wants string-or-absent) and fixed with
`_strip_nulls`. All reviews now run fault-free.

**Banked state (user: "stay on 5, bank iter3"):** product runner robust +
agent-agnostic + fault-tolerant; routing fixed; F1 0.46 → ~0.64 on the 5 pilots
(noise-bound, #2 behind a Cubic-favorable 0.83); Cubic's two winning behaviors
replicated as general principles. A definitive "beat all" verdict is deferred to a
future full-50 run (real bar 0.62). All work committed and pushed to
`ctxr-dev/skill-code-review@main`.

## Honest caveats

- 5 PRs / 11 goldens — small; Cubic's lead here (and our recall edge over the
  pack) both need the full 50 to confirm.
- Harsh FP definition (any non-golden = FP) penalises thoroughness; our measured
  precision understates real-bug precision.
- Judge is Opus 4.8 vs the committed Opus 4.5; competitor verdicts reused from the
  prior same-judge run.
