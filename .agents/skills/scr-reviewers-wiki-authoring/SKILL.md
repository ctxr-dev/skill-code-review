---
name: scr-reviewers-wiki-authoring
version: 1.0.0
description: >
  How to extend skill-code-review's reviewer corpus (reviewers.wiki) without
  degrading it: when a new leaf is warranted, the v2 frontmatter contract and what
  every field does to ROUTING / the SPECIALIST / the RANKER, how to write
  activation and a leaf body that maximise recall AND precision, the deterministic
  build/validate/promote flow via skill-llm-wiki, the id/severity/dimensions
  conventions, and the hard-won lessons (sharp focus, no broad globs, distinct
  findings, general bug-hunting heuristics) that the benchmark proved. Every change
  is human-gated and benchmark-verified — never hand-edit the generated wiki.
audience: ai-agents
when_to_use: >
  Use whenever you add, edit, split, or retire a reviewer leaf in reviewers.wiki —
  a new language/framework/security-class/footgun/pattern reviewer, or sharpening an
  existing one — and whenever you need the authoritative frontmatter/activation/body
  contract or the build pipeline.
---

# scr-reviewers-wiki-authoring

The discipline for growing `skill-code-review`'s reviewer corpus so it gets
*sharper*, never noisier or slower, with every leaf. A leaf is a domain expert; the
corpus is how the skill knows what to look for. This skill is the contract for
adding one well.

> **Read [`scr-benchmark-optimizer`](../scr-benchmark-optimizer/SKILL.md) first.**
> The corpus exists to win the precision-recall frontier on the open benchmark.
> Recall comes from leaf COVERAGE + sharp specialist BODIES; precision comes from
> the ranker + accurate leaf metadata. Any corpus change is verified against the
> benchmark before it is kept, and a change to the SET or STRUCTURE of reviewers is
> **human-gated**.

## The two layers (never edit the generated one)

- `reviewers.src/` is the **hand-authored source.** The ONLY layer you edit. It is
  TRACKED in this repo (the canonical authoring layer); edit it directly and never
  author against the generated tree. It is **sharded**: each leaf lives at
  `reviewers.src/<prefix>/<id>.md`, where `<prefix>` is the first token of the id
  (before the first hyphen). A new `sec-ssrf` leaf goes at `reviewers.src/sec/sec-ssrf.md`;
  a new prefix means a new folder. `scripts/shard_src.py` enforces/repairs this shape
  (dry-run by default, `--apply` to move via `git mv`). The source folder does not
  affect the wiki: id comes from the filename, placement from the layout pins. Decide
  ALL metadata (frontmatter + tags + body) here.
- `reviewers.wiki/` — **generated tree**, produced from `reviewers.src/` by
  [`skill-llm-wiki`](https://github.com/ctxr-dev/skill-llm-wiki). It handles
  clustering, slug/subcategory placement, soft-DAG parents, balance, depth, and the
  nested/sharded layout. It is a **verification surface**: build it, inspect placement,
  neighbours, and index focus, and if anything is wrong fix the SOURCE (or
  `reviewers.layout.yaml` for placement) and rebuild. **Never hand-edit the wiki**,
  which is regenerated and would overwrite hand-edits. Decide in src, verify in the
  wiki, correct in src. The wiki is committed alongside the source as a verified
  projection.

The generated leaf carries extra read-only fields the build adds (`depth_role`,
`parents`, `depth`, `source.hash`) — you never write those.

## When a new leaf is warranted (and when it is not)

Add a leaf only for a **recurring bug class no existing leaf covers** — a genuine
COVERAGE gap surfaced by the benchmark loop (a golden no specialist found because no
leaf owns that concern). First check whether an existing leaf SHOULD cover it and
just needs a sharper body/activation — prefer sharpening over proliferating. Do NOT
add a leaf for a one-off, for style/taste, or to chase a single benchmark golden
(over-fitting). Adding/removing/restructuring the SET needs a written, statistically
justified proposal and human confirmation.

When the benchmark shows a missed golden, first ask **"does any leaf own this
concern?"** before adjusting routing or ranking. If the honest answer is no, that is a
genuine gap and warrants a new GENERALIZED leaf (a reusable heuristic), not a tuning
tweak.

## Authored v2 frontmatter — every field and WHY it matters

```yaml
id: sec-ssrf                 # kebab-case, MUST equal the filename; prefix = category
type: primary                # primary | overlay | universal
focus: >                     # ONE sharp line naming the bug class — the routing currency
  Detect server-side request forgery: user-controlled URLs reaching fetch/HTTP
  clients without allow-listing, and metadata-endpoint / internal-network access.
covers:                      # 3-15 granular bullets (clustering + a hint to the specialist)
  - Unvalidated URL from request reaching an HTTP client
  - Allow-list vs deny-list host validation
dimensions:                  # >=1 of: architecture correctness documentation
  - security                 #          performance readability security tests
  - correctness              # drives release-gate aggregation AND strong-model routing
audit_surface:               # what this leaf audits (feeds the specialist body)
  - Every outbound request whose URL derives from untrusted input
languages: [all]             # "all" or a list; scopes applicability
tags: [ssrf, owasp-a10, url-validation, http-client]   # topical; clustering + filters
activation:                  # the dispatch gate — see "Activation" below
  file_globs: ["**/*.py", "**/*.ts"]      # SPECIFIC, never "**/*"
  keyword_matches: [requests.get, fetch(, urlopen, httpClient]
  structural_signals: [HTTP client library in dependencies]
  escalation_from: [sec-owasp-a01-broken-access-control]   # optional chain-activation
tools:                       # optional external linters/SAST (no install commands)
  - {name: semgrep, command: "semgrep --config p/ssrf", purpose: SSRF rule pack}
```

| field | required | what it drives — why it matters |
|---|---|---|
| `id` | yes | Identity + routing prefix; must match filename. Fabricated ids are a hard fail downstream. |
| `type` | yes | `primary` (routed by activation), `overlay` (extends a related primary), `universal` (always considered). |
| `focus` | yes | **The single most important field for routing.** The metadata-only tree-descender and trim decide relevance from `focus` (+ dimensions/tags). Write one sharp sentence that NAMES the bug class and its trigger — not a vague theme. Vague focus → mis-routing. |
| `covers` | yes | Granular bullets for similarity clustering and as a thin hint to the specialist. **Heavy: it is STRIPPED from routing prompts (compacted) — do NOT rely on `covers` for activation.** |
| `dimensions` | yes (>=1) | Binds findings to the 8 release gates AND signals tier: `security`/`correctness` route the specialist to the strong model. Declare accurately. |
| `audit_surface` | yes | The concrete checks; flows into the leaf body the specialist executes. |
| `languages` | yes | `all` or a list; keeps a leaf from firing on irrelevant stacks. |
| `tags` | yes | Topical tags for clustering (Tier-0 TF-IDF) and gate/filter predicates. Be specific and consistent. |
| `activation` | yes | The deterministic dispatch gate (next section). |
| `tools` | no | External linters as evidence; `{name, command?, purpose}`. No install commands — the agent resolves availability at runtime; missing tools are skipped. |

## Activation — the deterministic gate (get this right)

The runner evaluates `activation` over every leaf BEFORE any LLM routing. A leaf
activates if **any** signal fires:

- `file_globs` — fires if any glob matches any changed path (minimatch, POSIX).
  **NEVER use `**/*` or other catch-all globs.** Broad globs were the single worst
  routing bug: they over-activate, flood the candidate set, and bias routing toward
  generic leaves so the correctness/security leaves get crowded out. Scope globs to
  the languages/paths the concern actually lives in (`**/*.py`, `**/*.controller.ts`,
  `**/*migration*`, `**/Dockerfile*`).
- `keyword_matches` — fires if any keyword appears (case-insensitive) in the diff
  text. Use the API/symbol names that signal the concern (`subprocess`, `@Injectable`,
  `dangerouslySetInnerHTML`, `pickle.load`). This is how a leaf fires on a relevant
  diff in an otherwise broadly-globbed file type.
- `structural_signals` — fires when a signal matches the project profile
  (languages/frameworks/ci/container/iac/build/lint or `monorepo`). Use for
  framework/infra-level concerns.
- `escalation_from` — second-pass, fixed-point: activates this leaf when any listed
  parent leaf already activated. Use to chain a sub-concern onto a triggered family.

Prefer `file_globs` (specific) + `keyword_matches` together: globs scope the file
type, keywords confirm the concern is actually present. The gate is a recall floor;
over-firing is paid for downstream in tokens and routing precision, so be precise.

## The leaf body — what the specialist actually executes

After routing, the specialist reads the leaf **body** and applies it to its file
slice. Rich, concrete bodies are where recall AND precision are won. Use these
sections (the build expects this shape):

1. `# <Title>` — matches the focus.
2. `## When This Activates` — the context; when to engage vs defer to a sibling leaf.
3. `## Audit Surface` — a checklist of concrete checks (10-20 items).
4. `## Detailed Checks` — themed subsections with the **bug-hunting heuristics** to
   apply. Make them concrete and trace-oriented, e.g.:
   - data-flow / provenance: trace every consumed value to where it is set; flag
     missing keys, None/null, wrong type, stale/aliased values, off-by-one, unit/sign.
   - **unset/missing-state**: a value read from session/cache/optional-config/prior-step
     that is not populated on every path, used WITHOUT a guard → null-deref / KeyError.
   - **external-tool/API argument format**: a value passed to a CLI/library/service
     whose FORMAT/UNITS must match (geometry vs percentage, seconds vs ms, 0- vs
     1-based; a branch that uses a different primitive).
   - error/edge paths; contract/behaviour change (removed option, changed default,
     a definition shadowed by a later one, a cache recursing through self/session
     instead of the wrapped delegate); **lost-update / check-then-act races**;
     security sinks; test validity (does the test assert what it claims; cleanup).
5. `## Common False Positives` — the legitimate patterns NOT to flag. This is the
   precision half — be explicit, it directly cuts noise.
6. `## Severity Guidance` — a table mapping findings to critical/important/minor.
7. `## See Also` / `## Authoritative References` — sibling leaves; MDN/RFC/OWASP/CWE.

Two cross-cutting rules every body should reinforce (proven on the benchmark):
**(a) emit ONE finding per distinct root cause — never bundle a None-deref on value A
with a KeyError on value B;** **(b) report concrete defects, not style opinions —
silence is precision; the neutral ranker decides what blocks.**

## Conventions

- **id prefixes** (the category signal, also a routing/tier fallback):
  `lang-` language · `fw-` framework · `sec-`/`cwe-` security · `crypto-` crypto ·
  `footgun-` dangerous mistake · `antipattern-` misuse · `pattern-` design pattern ·
  `smell-` code smell · `principle-` SOLID/DDD · `arch-` architecture · `data-` data
  modelling · `reliability-` resilience · `obs-` observability · `fe-`/`mob-`
  frontend/mobile · `domain-` vertical. Use the real prefix; `lang-*`, `fw-*`, `sec-*`,
  `footgun-*`, `orm-*`, `reliability-*`, `data-*`, `crypto-*` route to the strong model.
- **severity**: Critical/Important block merge; Minor is advisory. The aggregator
  keeps the originating severity; the ranker separately scores defect-confidence.
- **dimensions**: ≥1 from the closed set; they bind to the 8 gates — pick the ones a
  finding from this leaf truly belongs to.
- **clickable links** in reports: `[file:line](file#Lline)`.

## Build → validate → promote (deterministic; never skip)

Author the leaf at `reviewers.src/<prefix>/<id>.md` (sharded; `scripts/shard_src.py`
enforces the shape, run it with `--apply` if a leaf landed in the wrong folder), then
regenerate the wiki (sibling `../skill-llm-wiki/`):

```bash
# 1. Validate the source corpus shape against the layout contract
#    (pins + frontmatter contract; standalone, zero new deps).
uv run python scripts/validate_layout.py
#    plus the skill-llm-wiki corpus checks:
node ../skill-llm-wiki/scripts/cli.mjs validate ./reviewers.src

# 2. Rebuild the wiki LAYOUT-DRIVEN + DETERMINISTIC (byte-stable, pinned placement).
#    reviewers.layout.yaml DRIVES placement: each leaf id projects to its pinned
#    category, so the policy (max_depth, fanout) comes from the layout, not flags.
node ../skill-llm-wiki/scripts/cli.mjs build "$(pwd)/reviewers.src" \
  --layout-config "$(pwd)/reviewers.layout.yaml" \
  --quality-mode deterministic --soft-dag-parents --accept-dirty   # writes reviewers.src.wiki/

# 3. Validate the rebuilt wiki (must be 0 errors), shape AND build invariants.
node ../skill-llm-wiki/scripts/cli.mjs validate "$(pwd)/reviewers.src.wiki"
uv run python scripts/validate_layout.py --wiki reviewers.src.wiki

# 4. Promote (atomic).
mv reviewers.wiki /tmp/reviewers.wiki.bak
mv reviewers.src.wiki reviewers.wiki

# 5. Drift check: rebuild + byte-compare the committed wiki against the source
#    (this also runs in CI). It must pass before you commit.
python scripts/check_wiki_drift.py

# 6. Commit BOTH layers together.
git add reviewers.src/ reviewers.wiki/ reviewers.layout.yaml
```

The build owns clustering only WITHIN the pinned categories, plus depth/fanout
balance and the nested layout, which is why you never hand-place or hand-edit the
wiki. With `unpinned: reject` and full pin coverage the tree IS the layout: a rebuild
is byte-identical and adding a leaf is a one-file diff. If you add a framework the
orchestrator does not detect from manifests, also update the framework table in
`docs/code-reviewer-design.md` so the Project Profile carries the signal. If you add
a new id prefix, add a pin for it in `reviewers.layout.yaml` first (otherwise the
build/validator reject the unpinned leaf).

## Verify the change did not degrade (the gate)

A corpus change is not done until it is benchmark-checked:

1. Code gate: `uv run ruff check code_review/ tests/ && uv run mypy
   code_review/ && uv run pytest`.
2. Shape gate: `uv run python scripts/validate_layout.py` and, after a rebuild,
   `--wiki reviewers.src.wiki`, both 0 errors, plus skill-llm-wiki `validate`, plus
   `python scripts/check_wiki_drift.py` (rebuilds and byte-compares the committed wiki
   against the source; also runs in CI).
3. Routing check: run a review (via the product, see scr-benchmark-optimizer) on a
   diff the new leaf should cover; confirm the leaf is picked and its specialist
   fires, and confirm you did NOT inflate the candidate set on unrelated diffs
   (broad-glob regression) or inflate the strong-routed fraction.
4. No-regression gate (HARD, applies to ANY wiki regeneration): re-run the PRODUCT
   reviewer on the SAME five benchmark codebases (cal.com-14943, discourse-1,
   grafana-80329, keycloak-32918, sentry-67876) and confirm BOTH axes are better or
   at least no worse than the recorded baseline: recall/coverage up-or-equal AND
   false-positives-per-PR down-or-equal. If either axis regresses, do NOT promote.
   Record the versioned result. See [scr-benchmark-optimizer](../scr-benchmark-optimizer/SKILL.md).
5. Human gate: SET/STRUCTURE changes (and any full corpus regeneration) ship only
   with the confirmed proposal and human sign-off.

## Lessons baked in (do not regress — proven across 16 commits)

- **Specific globs only.** `**/*` activation crowds out the right leaves. Scope to
  language/path + add `keyword_matches`.
- **Sharp `focus`.** Routing is metadata-only; a vague focus mis-routes. Name the
  bug class and its trigger in one line.
- **`covers` is not for routing** (it is stripped/compacted); routing reads
  focus/dimensions/tags. Keep those accurate.
- **Rich bodies win recall**; explicit "Common False Positives" win precision.
- **Distinct findings, not bundles.** One root cause per finding.
- **General heuristics generalise; per-golden rules over-fit.** Encode reusable
  patterns (unset-state, tool-format, lost-update, shadowed-definition, observability
  defect), not benchmark-specific answers.
- **Close coverage gaps with generalized leaves, not noise-tuning (proven).** The
  benchmark loop surfaced goldens that NO leaf owned. Rather than tune noise, three
  generalized correctness leaves were authored to close the gaps:
  `footgun-null-and-missing-state` (unguarded null/missing state),
  `footgun-unintended-recursion` (recursion and re-entrancy, including a cache/wrapper
  calling its own public API instead of the inner delegate), and
  `footgun-destructive-query-scope` (DELETE/UPDATE with a missing or too-broad
  predicate, data loss). They are generalized footgun reviewers (reusable heuristics),
  not benchmark-specific rules, and they recovered recall while keeping noise low.
- **Never hand-edit `reviewers.wiki/`**; decide in src, verify in the wiki, correct in
  src, rebuild, and let `scripts/check_wiki_drift.py` confirm the committed wiki is
  exactly a rebuild of the source.
