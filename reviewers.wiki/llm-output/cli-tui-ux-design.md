---
id: cli-tui-ux-design
type: primary
depth_role: leaf
focus: "Detect CLI/TUI ergonomics failures -- missing --help/--version, inconsistent flag naming, broken piping, interactive prompts without non-interactive fallback, missing signal handling, and disregard for NO_COLOR and tty detection"
parents:
  - index.md
covers:
  - "CLI missing --help/-h or --version/-V"
  - "Inconsistent flag naming (--foo_bar vs --foo-bar)"
  - Commands always exit 0 regardless of success or failure
  - "Progress output sent to stdout instead of stderr (breaks pipes)"
  - "No --quiet/--verbose controls"
  - "No JSON/machine-readable output mode for scripting"
  - "Missing shell completion generation (bash/zsh/fish)"
  - "Interactive prompt with no non-interactive fallback (--yes, --assume-yes)"
  - No NO_COLOR env honoured; ANSI escapes forced even when piped
  - Destructive commands without --confirm or dry-run
  - "TUI without terminal resize (SIGWINCH) handling"
  - "Missing SIGINT/SIGTERM cleanup of temp files and subprocesses"
  - No tty detection; prompts issued on non-tty stdin
tags:
  - cli
  - tui
  - ux
  - flags
  - exit-codes
  - signals
  - tty
  - no-color
  - completion
  - piping
activation:
  file_globs:
    - "**/bin/*"
    - "**/cmd/**"
    - "**/cli/**"
    - "**/*cli*"
    - "**/*cmd*"
    - "**/main.go"
    - "**/main.py"
    - "**/main.rs"
    - "**/main.ts"
  keyword_matches:
    - flag
    - clap
    - argparse
    - commander
    - yargs
    - click
    - cobra
    - typer
    - oclif
    - bubbletea
    - textual
    - ink
    - crossterm
    - termui
    - blessed
    - isatty
    - NO_COLOR
    - SIGINT
    - SIGWINCH
  structural_signals:
    - missing_help_flag
    - stdout_progress_on_piped_output
    - no_sigint_handler
source:
  origin: file
  path: cli-tui-ux-design.md
  hash: "sha256:fc63f38196bba0cf4f321bf5268943c7588346bb2072765e421d9bf58e7b1c72"
---
# CLI/TUI UX Design

## When This Activates

Activates when diffs touch CLI entrypoints, command definitions, flag parsing, or TUI rendering code. A CLI is a contract with humans and scripts at once: humans expect `--help`, colour, and prompts; scripts expect stable exit codes, machine-readable output, and no interactive stalls. Breaking either side is cheap to cause and expensive to unwind once users build pipelines around the behaviour. This reviewer enforces the Unix-style conventions codified in clap, cobra, click, and the CLI Guidelines.

## Audit Surface

- [ ] Missing --help/-h or --version/-V flag
- [ ] Inconsistent flag naming (mixing --foo_bar and --foo-bar)
- [ ] Exit codes always 0 or only 0/1 (no usage-error vs runtime-error distinction)
- [ ] Progress, spinners, or logs on stdout instead of stderr
- [ ] No --quiet/--verbose controls
- [ ] No JSON/machine-readable output mode for structured commands
- [ ] No shell completion generation (bash/zsh/fish/pwsh)
- [ ] Interactive prompt without --yes or --non-interactive fallback
- [ ] ANSI colour forced even when NO_COLOR is set or stdout is piped
- [ ] Destructive command without --confirm, --force, or --dry-run
- [ ] TUI without SIGWINCH (terminal resize) handling
- [ ] No SIGINT/SIGTERM cleanup of temp files or subprocesses
- [ ] Spinner/progress bar rendered on non-tty stdout
- [ ] No isatty detection guarding interactive features

## Detailed Checks

### Flags, Help, and Version
<!-- activation: keywords=["flag", "parse", "help", "version", "--help", "-h", "--version", "-V", "arg", "subcommand"] -->

- [ ] **Missing --help/-h**: flag CLI entrypoints that do not register a help flag or rely on raising an error when arguments are malformed. Use the framework's built-in (clap, cobra, click all generate it) rather than hand-rolling.
- [ ] **Missing --version/-V**: flag binaries with no version flag -- users and bug reports need a way to identify the running build, including commit SHA for dev builds.
- [ ] **Inconsistent flag naming**: flag binaries that mix `--foo_bar` and `--foo-bar` styles. Pick one (kebab-case is conventional) and apply across every subcommand; aliases are fine, but the canonical form must be uniform.
- [ ] **Positional vs flag confusion**: flag subcommands that accept the same concept as both a positional and a flag -- pick one to avoid ambiguous invocations.

### Exit Codes and Output Streams
<!-- activation: keywords=["exit", "os.Exit", "sys.exit", "process.exit", "return_code", "stdout", "stderr", "fmt.Print", "println", "print", "log"] -->

- [ ] **Always-zero exit**: flag commands whose error paths fall through to exit 0 -- scripts calling the CLI will treat failures as success. Use distinct codes (e.g., 0 success, 1 runtime error, 2 usage error, 64-78 sysexits).
- [ ] **Progress on stdout**: flag spinners, progress bars, or informational logs written to stdout when the command also emits data -- consumers using `cli | jq` get corrupted input. Route progress and diagnostics to stderr.
- [ ] **Logs interleaved with data**: flag structured output commands (list, get, describe) that also write log lines to stdout -- machine consumers cannot parse the mix.
- [ ] **No distinct exit codes for usage errors**: flag CLIs that return 1 for both "wrong flag" and "remote call failed" -- scripts cannot tell a retryable error from a user mistake.

### Verbosity, Quiet Mode, and Machine Output
<!-- activation: keywords=["quiet", "verbose", "-q", "-v", "silent", "json", "output", "format", "machine"] -->

- [ ] **No --quiet / --verbose**: flag CLIs with fixed output verbosity -- pipelines want `--quiet`, debugging wants `-v`/`-vv` with escalating detail.
- [ ] **No JSON output mode**: flag commands that emit structured data (lists, objects, status) with only a human-formatted table -- scripting consumers need `--output=json` or `--json`. YAML is acceptable alongside JSON; plain text tables alone are not.
- [ ] **JSON output with ANSI colour**: flag JSON output paths that still inject colour codes -- strip colour when `--output=json` or when stdout is not a tty.

### Destructive Actions and Confirmation
<!-- activation: keywords=["delete", "remove", "drop", "destroy", "purge", "force", "confirm", "yes", "dry-run", "dry_run"] -->

- [ ] **Destructive command without --confirm or --dry-run**: flag delete/drop/destroy/purge subcommands that execute immediately with no confirmation prompt and no `--dry-run` to preview -- users lose data to typos.
- [ ] **Interactive confirm with no --yes**: flag confirmation prompts with no `--yes`, `--assume-yes`, or `--non-interactive` bypass -- automation hangs forever waiting for stdin. The non-interactive bypass must be explicit per-invocation, not a global suppression.
- [ ] **Prompt on non-tty stdin**: flag code that calls `input()` / `readline` / `prompt` without first checking `isatty(stdin)` -- piped or redirected input leads to unexpected reads or hangs.

### Colour, NO_COLOR, and tty Detection
<!-- activation: keywords=["color", "colour", "ansi", "escape", "chalk", "colorama", "tput", "NO_COLOR", "isatty", "tty"] -->

- [ ] **NO_COLOR ignored**: flag code that emits ANSI escapes without checking the `NO_COLOR` environment variable (per no-color.org) -- respect user preference across the ecosystem.
- [ ] **Colour forced when piped**: flag colour output that does not check `isatty(stdout)` before emitting escapes -- piped output accumulates garbage bytes. Offer `--color=always|auto|never`.
- [ ] **Spinner on non-tty**: flag spinners and progress bars that render when stdout is redirected or piped -- they produce garbled log files. Fall back to static progress lines or none.

### Shell Completion
<!-- activation: keywords=["completion", "complete", "bash_completion", "zsh", "fish", "pwsh", "GenBashCompletion", "clap_complete"] -->

- [ ] **No completion generator**: flag CLIs with more than a handful of subcommands or flags and no `completion` subcommand generating bash/zsh/fish/pwsh scripts -- discoverability suffers sharply. Most frameworks emit this for free.
- [ ] **Completion out of sync with flags**: flag hand-maintained completion scripts that live separately from flag definitions -- they drift on every change. Prefer generated completions.

### Signals, Resize, and Cleanup
<!-- activation: keywords=["SIGINT", "SIGTERM", "SIGWINCH", "signal", "Ctrl-C", "resize", "cleanup", "defer", "atexit", "tempfile"] -->

- [ ] **No SIGINT handler with cleanup**: flag long-running commands that spawn subprocesses, create temp files, or acquire locks without a SIGINT/SIGTERM handler that performs cleanup -- Ctrl-C leaves orphaned state.
- [ ] **No SIGWINCH handling in TUI**: flag bubbletea / textual / ink / blessed programs that do not handle terminal resize -- the rendered UI becomes corrupted after the user resizes the window.
- [ ] **Subprocess not reparented or killed on exit**: flag commands that spawn children without forwarding signals or killing them on shutdown -- subprocess leaks accumulate in CI runners.

## Common False Positives

- **Internal scripts not shipped as tools**: one-off scripts under `scripts/` without help, exit codes, or completion are fine; these rules apply to user-facing CLIs.
- **TUIs that take over the terminal**: full-screen TUIs need not obey every piping rule since output is rendered to an alternate screen; still require SIGWINCH and SIGINT handling.
- **Single-purpose binaries**: a binary with no subcommands and a single obvious behaviour may not need `--json` or `--quiet`; judge by whether scripting use is plausible.

## Severity Guidance

| Finding | Severity |
|---|---|
| Always-zero exit code hiding failures | Critical |
| Destructive command without confirm or dry-run | Critical |
| Interactive prompt with no non-interactive fallback | Important |
| Progress or logs on stdout mixed with data | Important |
| Missing --help or --version | Important |
| Inconsistent flag naming (snake vs kebab) | Important |
| No JSON output mode on structured commands | Important |
| NO_COLOR ignored / colour forced on pipes | Important |
| No SIGINT cleanup for long-running commands | Important |
| TUI without SIGWINCH handling | Important |
| No shell completion generation | Minor |
| No --quiet or --verbose control | Minor |

## See Also

- `obs-alerting-discipline` -- CLI exit codes feed CI and alerting; ambiguous codes corrupt downstream signals
- `reliability-health-checks` -- CLIs used as liveness probes depend on exit-code discipline
- `footgun-encoding-unicode-normalization` -- CLI arg parsing must handle non-ASCII filenames and locale encodings

## Authoritative References

- [Command Line Interface Guidelines (clig.dev)](https://clig.dev/)
- [NO_COLOR specification](https://no-color.org/)
- [sysexits.h exit code conventions](https://man.freebsd.org/cgi/man.cgi?query=sysexits)
- [POSIX Utility Conventions (IEEE Std 1003.1)](https://pubs.opengroup.org/onlinepubs/9699919799/basedefs/V1_chap12.html)
- [clap (Rust) -- argument parsing conventions](https://docs.rs/clap/latest/clap/)
- [Cobra (Go) -- commands and completion](https://cobra.dev/)
- [Click (Python) -- CLI design](https://click.palletsprojects.com/)
