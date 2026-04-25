---
id: lang-shell-bash
type: primary
depth_role: leaf
focus: Catch correctness, portability, and security bugs in shell and Bash scripts
parents:
  - index.md
covers:
  - "Missing or incorrect set options (set -euo pipefail) and their interaction"
  - Quoting discipline — unquoted variables causing word splitting and glob expansion
  - "Command substitution style ($() vs backticks) and nesting correctness"
  - Array handling vs string-splitting pitfalls
  - Trap handlers for cleanup on ERR, EXIT, SIGTERM
  - "Portable POSIX vs bash-specific features (bashisms in /bin/sh scripts)"
  - "Injection via unsanitized input in eval, command strings, and SQL/curl interpolation"
  - Race conditions in temp file creation and PID file handling
  - Exit code propagation through pipes, subshells, and command substitution
  - ShellCheck baseline compliance
  - Heredoc and process substitution correctness
tags:
  - shell
  - scripting
  - posix
  - devops
  - ci-cd
  - automation
activation:
  file_globs:
    - "**/*.sh"
    - "**/*.bash"
    - "**/*.zsh"
    - "**/Makefile"
    - "**/.bashrc"
    - "**/.zshrc"
    - "**/.profile"
    - "**/Dockerfile"
  structural_signals:
    - Shell script files or shebang lines in diff
    - Makefile recipe changes
    - Dockerfile RUN commands with shell logic
source:
  origin: file
  path: lang-shell-bash.md
  hash: "sha256:504c5954569f82af07b034d42a4b45b287d905f09fe16b5e3616fbef548084ce"
---
# Shell/Bash Quality Reviewer

## When This Activates

Activated when the diff contains `.sh`, `.bash`, or `.zsh` files, Makefiles, Dockerfiles with shell logic, or dotfiles (`.bashrc`, `.zshrc`, `.profile`). Also activates on files with `#!/bin/bash` or `#!/bin/sh` shebangs.

## Audit Surface

- [ ] Unquoted `$variable` in command arguments, paths, or `[ ]` conditionals — causes word splitting and glob expansion
- [ ] Script lacks `set -euo pipefail` or equivalent — errors silently ignored
- [ ] `eval` or `bash -c` interpolates user-controlled strings — command injection vector
- [ ] Temp files use predictable names (`/tmp/myapp.tmp`) — use `mktemp` for safe creation
- [ ] No `trap cleanup EXIT` — resources (temp files, lock files, background jobs) leak on failure
- [ ] Pipe failure hidden: `cmd1 | cmd2` only checks `cmd2` exit code without `pipefail`
- [ ] `[ $var = "value" ]` instead of `[[ $var = "value" ]]` — word splitting breaks the test
- [ ] Script uses `#!/bin/sh` but contains bash-specific syntax (`[[ ]]`, arrays, `{a..z}`)
- [ ] Glob pattern in variable not quoted where literal path intended
- [ ] `cd somedir` without `|| exit 1` — if cd fails, subsequent commands run in wrong directory
- [ ] `while read` loop missing `-r` flag — backslash escapes silently consumed
- [ ] `$(( $user_input + 1 ))` — arithmetic context evaluates expressions, enabling injection
- [ ] Test-then-act race: `if [ -f "$file" ]; then rm "$file"` — file may change between test and action
- [ ] Variable assigned in subshell (`echo | while read x`) invisible to parent shell

## Detailed Checks

### Strict Mode and Error Handling
<!-- activation: keywords=["set -e", "set -u", "set -o", "pipefail", "trap", "ERR", "EXIT"] -->

- [ ] `set -e` (errexit): present at script top; understood that it does NOT trigger inside `if` conditions, `||`/`&&` chains, negated commands (`!`), or arithmetic tests
- [ ] `set -u` (nounset): present; `${var:-default}` used for intentionally-optional variables; `${var:+value}` for conditional expansion
- [ ] `set -o pipefail`: present when pipes are used; understood that it reports the first (leftmost) non-zero exit in the pipe, not the last
- [ ] `trap` handler registered for EXIT (cleanup) and optionally ERR/SIGTERM/SIGINT — trap on EXIT fires on both normal exit and errexit
- [ ] Trap handler does not rely on variables set after the trap registration — bash evaluates the trap string at trigger time, not registration time, but variables may be unset if error occurred early
- [ ] Functions return explicit exit codes; `return` without a code returns the last command's status, which may be surprising
- [ ] `|| true` used intentionally (not as a blanket to silence `set -e`) and documented with a comment explaining why failure is acceptable
- [ ] Error messages go to stderr: `echo "error: description" >&2` — stdout reserved for program output
- [ ] `set -e` interaction with command substitution understood: `local var=$(failing_cmd)` always succeeds because `local` masks the exit code — split into two lines: `local var; var=$(failing_cmd)`
- [ ] ERR trap with `set -e`: if using `trap 'handler' ERR`, also set `set -o errtrace` (or `set -E`) to propagate ERR trap into functions and subshells
- [ ] Exit code 0-255 range: exit codes above 125 have special meaning (126=not executable, 127=not found, 128+N=signal N) — do not use these for application errors

### Quoting and Word Splitting
<!-- activation: keywords=["$", "\"", "'", "IFS", "glob", "noglob"] -->

- [ ] All variable expansions are double-quoted: `"$var"`, `"${array[@]}"`, `"$(command)"` — this is the single most important shell correctness rule
- [ ] Exceptions are documented: unquoted expansion is intentional for word splitting (rare, with `IFS` explicitly set and reset after)
- [ ] `$@` is quoted as `"$@"` to preserve argument boundaries; `$*` joins all args with first char of IFS — almost never what you want
- [ ] Filenames with spaces, newlines, or glob characters (`*`, `?`, `[`) handled correctly in loops: `for f in ./*` with quotes on usage
- [ ] `find` output piped to `while read -r` with `-print0` and `IFS=` for safe filename handling: `find . -print0 | while IFS= read -r -d '' file`
- [ ] Glob expansion disabled (`set -f` / `set -o noglob`) when processing user input that may contain `*`, `?`, or `[`
- [ ] Single quotes used for literal strings; double quotes when variable expansion is intended — mixing them correctly in complex commands
- [ ] Here-doc delimiter is quoted (`<<'EOF'`) when expansion should not occur inside the heredoc body
- [ ] Parameter expansion operators are correctly quoted: `"${var%suffix}"`, `"${var#prefix}"`, `"${var//pattern/replacement}"`
- [ ] `$()` used instead of backticks for command substitution — backticks have confusing escaping rules and cannot nest
- [ ] Word splitting on `$(cat file)` understood: newlines become spaces unless quoted

### Arrays and Data Handling
<!-- activation: keywords=["declare -a", "array", "[@]", "[*]", "mapfile", "readarray", "IFS"] -->

- [ ] Arrays used instead of space-delimited strings for lists of items — especially filenames that may contain spaces
- [ ] Array iteration uses `"${arr[@]}"` (preserves elements with spaces) not `${arr[*]}` (joins into one string using IFS)
- [ ] `mapfile` / `readarray` preferred over IFS splitting for reading lines into an array: `mapfile -t lines < file`
- [ ] Associative arrays (`declare -A`) only used in bash 4+ — verify target platform supports this version
- [ ] Array index is validated before access — `${arr[$i]}` with unchecked `$i` enables arithmetic injection if `$i` contains expressions
- [ ] `local` keyword used for function-scoped arrays — bare `declare -a` in a function is also local (bash-specific behavior)
- [ ] Empty array expansion `"${arr[@]}"` with `set -u` requires bash 4.4+ or guard pattern: `${arr[@]+"${arr[@]}"}`
- [ ] Array length: `${#arr[@]}` gives element count; `${#arr[0]}` gives length of first element — do not confuse
- [ ] Sparse arrays handled: unsetting `unset arr[2]` does not reindex — `${!arr[@]}` gives existing indices
- [ ] `printf '%s\n' "${arr[@]}"` preferred over `echo` for printing array elements — handles elements starting with `-`

### Security and Injection Prevention
<!-- activation: keywords=["eval", "bash -c", "curl", "wget", "xargs", "su", "sudo", "ssh", "scp", "password", "secret", "token", "credential"] -->

- [ ] `eval "$user_input"` is never used — if dynamic dispatch is needed, use case statements or associative arrays for command lookup
- [ ] `bash -c` does not interpolate untrusted data — use positional argument passing: `bash -c 'echo "$1"' _ "$user_input"`
- [ ] `curl | bash` patterns include checksum verification (SHA-256) of downloaded content before execution
- [ ] Secrets are not passed as command-line arguments (visible in `/proc/*/cmdline` and `ps`) — use env vars, files with 0600 permissions, or stdin
- [ ] `xargs` input is sanitized or uses `-0` (null-delimited) to prevent injection via crafted filenames containing quotes, spaces, or semicolons
- [ ] `ssh` commands with remote shell expansion properly escape or single-quote the remote command: `ssh host 'echo "$REMOTE_VAR"'` — double quotes expand locally
- [ ] Sudo/su usage does not pass through tainted environment variables — `sudo -E` is dangerous; rely on `env_reset` in sudoers
- [ ] Script does not write secrets to log files, temp files, or stdout — use `set +x` around sections that handle secrets to prevent trace logging
- [ ] `PATH` manipulation is safe: `export PATH="/safe/path:$PATH"` prepends known directories; never `PATH="$user_input:$PATH"`
- [ ] Regex in `[[ $var =~ pattern ]]` with user input: user can inject regex metacharacters; validate or use `==` for literal matching
- [ ] `source` / `.` on files from untrusted locations: sourced files execute in the current shell with full access to all variables and functions

### Portability and Shebang Discipline
<!-- activation: keywords=["#!/bin/sh", "#!/bin/bash", "#!/usr/bin/env", "POSIX", "dash", "ash"] -->

- [ ] Shebang matches actual syntax used: `#!/bin/sh` scripts contain only POSIX shell — Debian/Ubuntu link `/bin/sh` to `dash`, not bash
- [ ] Common bashisms caught in `#!/bin/sh` scripts: `[[ ]]`, `source` (use `.`), `function` keyword, arrays, `{1..10}` brace expansion, `<<<` here-string, `&>` redirection, `$(< file)`, `${var,,}` case conversion
- [ ] `#!/usr/bin/env bash` preferred over `#!/bin/bash` for portability — bash may be in `/usr/local/bin` on BSD/macOS
- [ ] GNU vs BSD tool differences handled: `sed -i` (GNU) vs `sed -i ''` (BSD/macOS), `readlink -f` (GNU-only, use `realpath` or `cd/pwd`), `grep -P` (GNU PCRE, not on macOS)
- [ ] `local` keyword in functions: POSIX-undefined but widely supported — avoid in strict `#!/bin/sh` scripts or accept the non-portability
- [ ] `echo` behavior varies across shells (handling of `-e`, `-n`, backslash) — use `printf '%s\n' "text"` for portable formatted output
- [ ] Alpine/BusyBox compatibility: `ash` lacks many bash features; Dockerfiles with complex logic should `apk add bash` and use `#!/bin/bash`
- [ ] macOS ships an ancient bash (3.2) due to GPL v3 licensing — bash 4+ features (associative arrays, `**` globstar, `${var,,}`) unavailable without Homebrew bash

### Process Management and Subshells
<!-- activation: keywords=["&", "wait", "$$", "$!", "kill", "nohup", "exec", "pipe", "|", "xargs", "coproc"] -->

- [ ] Background process PID captured: `cmd & pid=$!` followed by `wait "$pid"` for exit status — `$!` only stores PID of the most recent background command
- [ ] Pipe-to-while creates a subshell — variables set inside are lost in the parent; use process substitution `while read line; do ...; done < <(cmd)` or `shopt -s lastpipe`
- [ ] `exec` used correctly: `exec >logfile` redirects stdout permanently for the rest of the script; `exec cmd` replaces the shell process entirely
- [ ] Subshell `( )` vs brace group `{ }` chosen intentionally — subshells isolate variable changes and `cd`; brace groups share the environment
- [ ] Zombie processes prevented: background children are `wait`-ed on, or the script uses `wait` without args to wait for all children before exit
- [ ] `kill` sends correct signal and checks if process exists first: `kill -0 "$pid" 2>/dev/null && kill "$pid"`
- [ ] `nohup` / `disown` used when background process must survive terminal close or SSH disconnect
- [ ] Process substitution `<(cmd)` and `>(cmd)` is bash-specific — not available in POSIX sh or dash
- [ ] `BASHPID` vs `$$`: in a subshell `$$` is the parent's PID, `$BASHPID` is the subshell's PID — use the correct one for lock files
- [ ] `coproc` (bash 4+) descriptors are read before the coprocess closes — otherwise data is lost

### File Operations and Temporary Files
<!-- activation: keywords=["mktemp", "tmp", "lock", "flock", "rm", "mv", "cp", "chmod", "mkdir", "umask"] -->

- [ ] `mktemp` used for all temporary files and directories — never hardcoded paths in `/tmp` (predictable name enables symlink attacks)
- [ ] Temp files cleaned up via `trap 'rm -rf "$tmpdir"' EXIT` registered immediately after `mktemp` — before any command that could fail
- [ ] `flock` or similar used for lock files — PID-file-based locking has inherent TOCTOU races; `flock -n` for non-blocking with check
- [ ] `mkdir -p` used for directory creation — no `test -d || mkdir` race condition where two processes both see "not exists"
- [ ] File writes use atomic pattern: write to temp file in same directory, then `mv` to final path — `mv` is atomic on the same filesystem
- [ ] `chmod`/`chown` on newly created files considers umask — or uses `install -m 0600 /dev/null "$file"` for atomic create+permission
- [ ] Symlink attacks prevented: `mktemp` creates files with random names in directories with restricted permissions
- [ ] `rm -rf` with variable arguments: ensure variable is set and non-empty — `rm -rf "/$unset_var"` expands to `rm -rf /`; use `${var:?}` guard
- [ ] `> file` truncates file — use `>> file` for append; ensure truncation is intentional when redirecting output

### Testing and CI Integration
<!-- activation: file_globs=["**/test/**/*.sh", "**/*.bats", "**/Makefile"], keywords=["bats", "test", "assert", "shunit"] -->

- [ ] Shell functions are testable: logic separated from main script execution, sourceable without triggering side effects (guard with `[[ "${BASH_SOURCE[0]}" == "${0}" ]]`)
- [ ] `bats` or `shunit2` tests exist for non-trivial shell logic — especially argument parsing and error handling paths
- [ ] CI runs `shellcheck` on all shell files — ideally as a pre-commit hook; `shellcheck -x` follows sourced files
- [ ] Test scripts also pass shellcheck — test code should follow the same standards as production code
- [ ] Makefile `.PHONY` targets declared for all non-file targets — prevents confusion when a file with the target name exists
- [ ] Makefile recipes use `$$` for shell variable expansion — Make interprets single `$` as a Make variable reference
- [ ] Makefile uses `.SHELLFLAGS := -eu -o pipefail -c` for strict mode in recipe shell commands
- [ ] Makefile multi-line recipes use backslash continuation or `.ONESHELL` — each line is a separate shell invocation by default
- [ ] CI scripts pin tool versions (shellcheck, shfmt) for reproducible lint results

## Common False Positives

- **Intentional word splitting**: Some scripts intentionally split on whitespace (e.g., iterating space-delimited CLI flags stored in an env var). If `IFS` is explicitly set and the intent is documented, unquoted expansion is fine.
- **Unquoted globs in find/ls**: `find . -name "*.txt"` needs the glob quoted from the shell but not from find — the quoting is correct even though it looks like the glob will never expand.
- **`set -e` not used in interactive dotfiles**: `.bashrc` and `.zshrc` should NOT use `set -e` — it breaks interactive shell behavior (a failing command in a prompt function would exit the shell).
- **`cat` in pipes**: `cat file | grep pattern` (useless use of cat) is sometimes intentional for readability or when the command's stdin/file-argument behavior differs. Low severity.
- **Missing quotes around integer variables in arithmetic**: `$(( count + 1 ))` is safe without quotes inside `$(())` — the arithmetic context does not word-split. But the input to `count` should be validated.
- **Heredoc without quoting delimiter**: `<<EOF` (with expansion) is correct when variable interpolation in the heredoc body is intended — only flag if the heredoc body contains `$` that should be literal.

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Command injection via `eval` / `bash -c` with user input | Critical |
| Secrets exposed in command args, logs, or temp files | Critical |
| Missing quoting on user-controlled variable in command args | Critical |
| Predictable temp file name (symlink attack / race condition) | Critical |
| `rm -rf` with potentially empty variable | Critical |
| Missing `set -e` / `set -u` / `pipefail` in production script | Important |
| Missing `trap EXIT` cleanup for temp files / lock files | Important |
| Bashism in `#!/bin/sh` script (breaks on dash/ash) | Important |
| `cd` without error check (`\|\| exit`) | Important |
| Pipe-to-while subshell variable loss | Important |
| `local var=$(cmd)` masking exit code under `set -e` | Important |
| `read` without `-r` flag (backslash consumption) | Minor |
| `$()` vs backtick style inconsistency | Minor |
| Useless use of cat | Minor |
| Missing `.PHONY` in Makefile | Minor |
| `echo` instead of `printf` for formatted output | Minor |

## See Also

- `concern-security` — General security review patterns
- `concern-ci-cd` — CI/CD pipeline review patterns
- `lang-python` — Python scripts often shell out; check subprocess calls

## Authoritative References

- [ShellCheck Wiki](https://www.shellcheck.net/wiki/) — Detailed explanations for every ShellCheck diagnostic code
- [Bash Pitfalls](https://mywiki.wooledge.org/BashPitfalls) — Comprehensive list of common shell programming mistakes
- [Google Shell Style Guide](https://google.github.io/styleguide/shellguide.html) — Industry shell scripting standard
- [POSIX Shell Specification](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) — Portable shell baseline
- [Bash Reference Manual](https://www.gnu.org/software/bash/manual/bash.html) — GNU Bash official documentation
- [Bash FAQ](https://mywiki.wooledge.org/BashFAQ) — Community answers to common shell questions
