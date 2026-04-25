---
id: jupyter-notebook-reproducibility
type: primary
depth_role: leaf
focus: Detect Jupyter notebook reproducibility hazards -- out-of-order execution, missing kernel spec, unset seeds, hardcoded paths, committed outputs, leaked secrets, and absent environment pinning
parents:
  - index.md
covers:
  - "Out-of-order execution counts (cells ran non-linearly, not reproducible)"
  - "Missing kernel spec / language metadata in notebook JSON"
  - "Random seeds not set (numpy, torch, tf, random)"
  - Hardcoded absolute file paths not parametrized
  - "Large output blobs committed (CSV dumps, base64 images inflating file)"
  - "Secrets / API keys visible in cell outputs or source"
  - "%env or !export setting credentials in cell source"
  - "Missing requirements.txt / environment.yml / poetry lock"
  - "!pip install inside cells (non-reproducible, order-sensitive)"
  - Unused imports and dead cells accumulating
  - "Cell dependencies on hidden state (variables defined elsewhere) not documented"
  - "Missing papermill 'parameters' tag for batch / scheduled runs"
tags:
  - jupyter
  - notebook
  - ipynb
  - reproducibility
  - data-science
  - papermill
  - nbdev
  - mlops
activation:
  file_globs:
    - "**/*.ipynb"
  keyword_matches:
    - jupyter
    - notebook
    - nbformat
    - ipykernel
    - papermill
    - nbdev
    - nbdime
    - cell
    - execution_count
    - outputs
    - metadata
    - kernel
    - kernelspec
  structural_signals:
    - out_of_order_execution
    - missing_seed
    - committed_outputs
    - hardcoded_path
source:
  origin: file
  path: jupyter-notebook-reproducibility.md
  hash: "sha256:88162b205611908bfd38ed42cd935af4beee8d3adbbe914271e0e25af5181021"
---
# Jupyter Notebook Reproducibility

## When This Activates

Activates on diffs adding or modifying `.ipynb` files. Jupyter notebooks are powerful but hostile to reproducibility -- cells can be run in any order, outputs drift from source, state lives in kernel memory, and secrets leak through cell outputs. This reviewer flags the patterns that break "clone, `Run All`, get the same result" and the ones that break security (credentials in outputs).

## Audit Surface

- [ ] execution_count values not monotonic from 1 (out-of-order run)
- [ ] Some cells have null execution_count between executed ones
- [ ] metadata.kernelspec missing or empty
- [ ] Random seed not set in training / sampling cells
- [ ] Hardcoded absolute paths (/Users, /home, C:\)
- [ ] Large output blob (>1 MB) committed
- [ ] API key / token visible in cell source or output
- [ ] %env / !export setting secrets in cell source
- [ ] No requirements.txt / environment.yml / pyproject.toml
- [ ] !pip install in cells with no pinned version file
- [ ] Unused imports and dead cells accumulated
- [ ] Variables used but defined outside the notebook
- [ ] Missing papermill 'parameters' tag for scheduled runs
- [ ] ipywidget state serialized inline (bloat)
- [ ] %run / %load pulls external code without version pin
- [ ] Long-running cell with no checkpoint / cache
- [ ] print() used for metrics instead of tracker
- [ ] Data path without documented data version
- [ ] device='cuda:0' hardcoded without CPU fallback
- [ ] Scheduled job runs .ipynb directly without papermill / nbconvert

## Detailed Checks

### Execution Order and Kernel State
<!-- activation: keywords=["execution_count", "cell", "metadata", "kernelspec", "language_info"] -->

- [ ] **Non-monotonic execution counts**: flag notebooks whose `execution_count` sequence is not 1, 2, 3, ... in document order -- indicates the author ran cells out of order and the notebook is not reproducible by `Run All`
- [ ] **Mixed executed / un-executed cells**: flag notebooks where some code cells have `execution_count: null` between cells with populated counts -- the author skipped cells; anyone running the notebook linearly will hit errors
- [ ] **Missing kernel spec**: flag notebooks with empty / missing `metadata.kernelspec` or `metadata.language_info` -- consumers do not know which Python / R / Julia version produced it
- [ ] **Kernel name points to personal environment**: flag `kernelspec.name` values like `python-dmitri` / `my-env` that will not exist on another machine; prefer `python3` / documented project kernel

### Determinism and Seeding
<!-- activation: keywords=["random", "seed", "np.random", "torch.manual_seed", "tf.random.set_seed", "set_seed", "RandomState"] -->

- [ ] **Seed not set in ML / sampling notebook**: flag training / inference / Monte-Carlo notebooks that use `numpy.random`, `torch`, `tensorflow`, `random` without a visible `seed(...)` call near the top -- results drift between runs for no reason
- [ ] **Seed set but framework missed**: flag notebooks that seed Python's `random` but not `numpy` (or vice versa) while using both -- partial determinism is worse than none because it masks the remaining nondeterminism
- [ ] **CUDA nondeterminism not disabled**: flag notebooks importing torch and running on GPU without `torch.backends.cudnn.deterministic = True` / `torch.use_deterministic_algorithms(True)` when determinism is claimed

### Path, Data, and Environment Portability
<!-- activation: keywords=["open", "read_csv", "path", "Path", "os.path", "!ls", "!cp", "s3://", "/Users/", "/home/", "C:\\"] -->

- [ ] **Hardcoded absolute path**: flag string literals like `"/Users/alice/data/train.csv"` or `"C:\\Data\\..."` -- break on any other machine; use a config cell with an env-var / papermill parameter
- [ ] **Data loaded without documented version**: flag `pd.read_csv("/mnt/shared/data.csv")` with no accompanying markdown cell stating the data snapshot / hash / date -- the notebook cannot be re-executed meaningfully six months later
- [ ] **Device hardcoded**: flag `device = "cuda:0"` / `torch.cuda.set_device(0)` with no CPU fallback -- breaks on CPU-only reviewer machines; prefer `device = "cuda" if torch.cuda.is_available() else "cpu"`
- [ ] **External script via %run / %load without pin**: flag `%run ../utils.py` with no mention of which repo revision -- effectively an unpinned dependency

### Outputs, Size, and Git Hygiene
<!-- activation: keywords=["outputs", "display_data", "image/png", "base64", "text/plain"] -->

- [ ] **Large output committed**: flag cell outputs totaling > 1 MB (base64 images, giant dataframes, raw arrays) -- bloats repo, makes diffs unreadable; use `nbstripout` or Papermill outputs in a separate artifact store
- [ ] **Stale outputs don't match source**: flag cells whose output visibly references variables / functions no longer in the source -- indicates the notebook was edited after execution; re-run before commit
- [ ] **ipywidgets state inline**: flag `widgets.interact` / `ipywidgets` with serialized state in `metadata.widgets` -- nondeterministic blob that churns every save

### Secrets and Environment Variables
<!-- activation: keywords=["API_KEY", "TOKEN", "SECRET", "password", "%env", "!export", "os.environ", "sk-", "AKIA", "ghp_", "xox"] -->

- [ ] **API key / token literal in source**: flag `openai.api_key = "sk-..."`, AWS / GitHub / Slack token patterns in cell source -- leaks into git history; load from env with a clear error message
- [ ] **Secret in cell output**: flag cell outputs that echo `os.environ` or the result of a credential-loading call -- as bad as committing the secret directly
- [ ] **%env / !export setting secret visibly**: flag `%env OPENAI_API_KEY=sk-...` or `!export TOKEN=...` -- the secret is saved as cell source; use `.env` + `python-dotenv` or a vault

### Dependency Pinning and Install Cells
<!-- activation: keywords=["pip install", "conda install", "!pip", "!conda", "requirements.txt", "environment.yml", "poetry"] -->

- [ ] **!pip install in cell without pinned file**: flag `!pip install somepkg` in a cell with no `requirements.txt` / `environment.yml` / `pyproject.toml` beside the notebook -- reproducibility depends on whatever PyPI currently returns
- [ ] **Install cell not idempotent / version-pinned**: flag `!pip install pandas` (no `==x.y.z`) -- next runner gets a different version silently
- [ ] **No environment file in notebook's directory tree**: flag a standalone `.ipynb` added without a corresponding env / deps file anywhere up the tree

### Code Hygiene and Dead Cells
<!-- activation: keywords=["import", "def ", "cell", "dead", "unused"] -->

- [ ] **Unused imports accumulating**: flag notebooks with imports at the top that no later cell references -- residue from iteration; run `nbqa ruff` to detect
- [ ] **Variable used without visible definition**: flag cells referring to names not defined anywhere in the notebook (and not imported) -- kernel-memory dependency that breaks on `Run All`
- [ ] **print() used for metrics**: flag `print("loss:", loss)` in training loops where `mlflow.log_metric` / `wandb.log` / structured logging should be used -- metrics are lost on kernel restart

### Parametrization for Batch Execution
<!-- activation: keywords=["papermill", "parameters", "nbformat", "tag", "batch"] -->

- [ ] **Missing papermill parameters tag**: flag notebooks executed by Papermill / nbconvert in scheduled pipelines that do not have a cell tagged `parameters` near the top -- parameter injection silently no-ops; downstream gets stale defaults
- [ ] **Scheduled job runs .ipynb directly**: flag orchestrators (Airflow, cron) invoking `jupyter nbconvert --execute ...` without Papermill or a pinned kernel -- harder to parametrize and monitor than a proper `papermill` call
- [ ] **Parameters cell contains secrets**: flag a Papermill `parameters` cell declaring `api_key = "..."` defaults -- defaults travel with the notebook; set via runtime override only

## Common False Positives

- **Exploratory notebooks clearly marked as scratch**: `scratch/`, `exploration/`, or notebooks named `*_sandbox.ipynb` may legitimately skip seed / path discipline. Flag with Minor severity.
- **Intentional nondeterminism**: some analyses explicitly want varied seeds (fairness studies, bootstrap demos). Flag resolves when the author comments the intent.
- **Teaching / demo notebooks**: educational material may show `!pip install foo` as a teaching aid; acceptable if paired with a pinned env file.
- **Widget-driven dashboards**: some notebooks are dashboards delivered as .ipynb via Voila -- large widget state is expected; warn only when committed to main.
- **Published papers / artifacts**: archival research notebooks may freeze outputs intentionally.

## Severity Guidance

| Finding | Severity |
|---|---|
| API key / token in cell source or output | Critical |
| Secret set via %env / !export in committed cell | Critical |
| Notebook executed out of order (not reproducible) | Important |
| !pip install in cell with no pinned env file | Important |
| Hardcoded absolute path breaking portability | Important |
| Missing kernel spec / language info | Minor |
| Seed not set in ML notebook | Minor |
| Unused imports / dead cells | Minor |
| Large outputs committed (>1 MB) | Minor |
| Missing papermill 'parameters' tag for scheduled run | Minor |

## See Also

- `ai-ml-experiment-tracking-mlflow-wandb` -- metrics should go to a tracker rather than print()
- `test-unit-discipline` -- notebooks should not substitute for tested modules in production
- `author-self-review-hygiene` -- "Run All from fresh kernel" as a self-review gate
- `sec-owasp-a03-injection` -- for command-injection risk in `!` shell-escape cells

## Authoritative References

- [Jupyter, "nbformat Specification"](https://nbformat.readthedocs.io/en/latest/format_description.html)
- [Papermill Documentation](https://papermill.readthedocs.io/en/latest/)
- [Jupyter, "Reproducible Computational Environments"](https://the-turing-way.netlify.app/reproducible-research/renv.html)
- [Rule, A. et al., "Ten Simple Rules for Writing and Sharing Computational Notebooks"](https://journals.plos.org/ploscompbiol/article?id=10.1371/journal.pcbi.1007007)
- [nbdev Documentation](https://nbdev.fast.ai/)
- [nbstripout](https://github.com/kynan/nbstripout)
