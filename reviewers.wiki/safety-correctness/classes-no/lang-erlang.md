---
id: lang-erlang
type: primary
depth_role: leaf
focus: "Erlang/OTP correctness, supervision design, message passing discipline, and BEAM runtime safety"
parents:
  - index.md
covers:
  - Let-it-crash philosophy and proper supervisor design
  - OTP behaviour compliance — gen_server, gen_statem, supervisor
  - Message passing discipline — selective receive, mailbox overflow
  - Hot code loading compatibility and state migration
  - "ETS/DETS usage patterns and concurrency semantics"
  - Binary handling efficiency and reference-counted binaries
  - Distribution and clustering safety
  - Error handling — tagged tuples vs exits vs exceptions
  - Process dictionary avoidance
  - Application and release structure
  - OTP supervision tree structure and restart strategies
  - GenServer discipline — call vs cast, state shape, handle_info
  - Ecto changeset validation and query composition
  - Pattern matching completeness and guard usage
  - Pipe operator hygiene and readability
  - Process architecture — when to spawn, when not to
  - ETS table usage and concurrency semantics
  - Phoenix-specific patterns — contexts, plugs, live views
  - "Binary and string handling (UTF-8, iolists)"
  - Testing conventions — ExUnit, Mox, async safety
tags:
  - erlang
  - beam
  - otp
  - gen_server
  - supervision
  - distributed
  - message-passing
  - elixir
  - phoenix
  - ecto
  - genserver
  - functional
aliases:
  - lang-elixir
activation:
  file_globs:
    - "**/*.erl"
    - "**/*.hrl"
    - "**/rebar.config"
    - "**/sys.config"
    - "**/*.app.src"
  structural_signals:
    - "Erlang source files, header files, or rebar/OTP config files in diff"
source:
  origin: file
  path: lang-erlang.md
  hash: "sha256:920197cdee0ed05ff8b99386ec419b30f08a8f74b3609eb429c1ab3d81db70ac"
---
# Erlang Quality Reviewer

## When This Activates

Activates when the diff contains `.erl`, `.hrl` files, or OTP configuration files (`rebar.config`, `sys.config`, `*.app.src`). Applies OTP design principles, BEAM runtime considerations, and Erlang-specific idioms.

## Audit Surface

- [ ] Every long-lived process under a supervisor with documented restart strategy
- [ ] OTP behaviours used instead of raw `spawn`/`receive` loops
- [ ] Selective receive does not accumulate unmatched messages — catch-all clause or bounded mailbox
- [ ] `gen_server:call` for synchronous, `cast` only for fire-and-forget with backpressure
- [ ] Tagged tuples (`{ok, _}`/`{error, _}`) for return values — consistent convention
- [ ] No process dictionary for passing state — use function arguments or gen_server state
- [ ] ETS table heir set or table owned by a supervisor-managed process
- [ ] Binary handling avoids large reference-counted binary leaks
- [ ] Hot code upgrade: state migration handled in `code_change/3`
- [ ] No unbounded message queue growth — backpressure on producers
- [ ] Application env read at runtime — `application:get_env/2,3`
- [ ] Guards use only allowed BIFs — no user-defined function calls
- [ ] Dialyzer specs (`-spec`) on all exported functions

## Detailed Checks

### Supervision and Let-It-Crash
<!-- activation: keywords=["supervisor", "init", "child_spec", "start_link", "restart", "one_for_one"] -->

- [ ] Supervisor `init/1` returns child specs with correct restart type: `permanent` (always restart), `transient` (restart on abnormal), `temporary` (never restart)
- [ ] Restart intensity (`intensity`/`period`) tuned — too high causes rapid restart loops, too low gives up prematurely
- [ ] Supervisor child start order reflects dependency order — `rest_for_one` if sequential dependency
- [ ] `start_link` propagates failure to supervisor — no `start` (unlinked) for supervised children
- [ ] No `catch`/`try` around operations that should crash and be restarted by supervisor
- [ ] Supervisor flags documented — why this strategy, why this intensity
- [ ] Dynamic children via `simple_one_for_one` (OTP < 24) or `DynamicSupervisor`-style pattern
- [ ] Application has a top-level supervisor — `application` behaviour's `start/2` returns `{ok, Pid}`

### gen_server and gen_statem Discipline
<!-- activation: keywords=["gen_server", "gen_statem", "handle_call", "handle_cast", "handle_info", "init"] -->

- [ ] `init/1` returns quickly — no blocking calls; use `{ok, State, {continue, init_data}}` or self-message for deferred init
- [ ] `handle_call` returns `{reply, Reply, NewState}` — never silently ignores the caller (timeout risk)
- [ ] `handle_cast` used only for truly fire-and-forget — most operations should be `call` for backpressure
- [ ] `handle_info` has a catch-all clause logging unexpected messages — prevents mailbox accumulation
- [ ] `terminate/2` performs only fast, non-failing cleanup — it is not reliably called on brutal_kill
- [ ] `code_change/3` transforms state between module versions — tested if hot code loading is used
- [ ] `gen_statem` used for stateful protocols instead of `gen_server` with manual state tracking
- [ ] State is a record or map with documented fields — not a growing unstructured tuple

### Message Passing and Mailbox Management
<!-- activation: keywords=["receive", "send", "!", "after", "mailbox", "message_queue_len"] -->

- [ ] Every `receive` block has a timeout (`after`) or processes messages known to arrive
- [ ] Selective receive does not skip messages indefinitely — catch-all clause discards or logs unknowns
- [ ] No unbounded send rate without corresponding receive rate — backpressure via `gen_server:call`
- [ ] `process_info(Pid, message_queue_len)` monitored in production for mailbox growth
- [ ] Messages are tagged tuples (`{my_tag, Data}`) — bare atoms or untagged values risk collision
- [ ] `!` (send) not used for inter-module communication — OTP behaviours provide proper contracts
- [ ] Flush patterns correct — `receive _ -> ok after 0 -> ok end` drains mailbox only when intended
- [ ] Large binaries not sent between processes — send references or use ETS for shared data

### ETS and DETS
<!-- activation: keywords=["ets", "dets", "new", "insert", "lookup", "match", "select"] -->

- [ ] ETS table created with `{heir, Pid, HeirData}` so table survives owner crash
- [ ] Table access mode appropriate: `protected` (owner writes, all read), `public` only with documented justification
- [ ] `ets:insert` and `ets:lookup` atomic per-row — no multi-row transaction assumptions
- [ ] `ets:select`/`ets:match` with continuation for large tables — no full table scans in request paths
- [ ] `ets:tab2list` never used in production — returns entire table into process memory
- [ ] DETS tables opened and closed explicitly — not left open indefinitely (2 GB limit, no concurrent writers)
- [ ] ETS `ordered_set` chosen when range queries needed; `set` for pure key-value lookup
- [ ] Counter operations use `ets:update_counter` for atomicity — not read-modify-write

### Binary and String Handling
<!-- activation: keywords=["binary", "<<", ">>", "iolist", "unicode", "list_to_binary", "binary_to_list"] -->

- [ ] Iolists used for building output (network, file) — no repeated `binary:append` or `<<A/binary, B/binary>>`
- [ ] Sub-binaries of large reference-counted binaries copied with `binary:copy/1` to release original
- [ ] Binary pattern matching uses typed segments: `<<Size:16/big-unsigned-integer, Payload:Size/binary>>`
- [ ] UTF-8 encoding explicit: `<<Str/utf8>>` for Unicode code points, `/binary` for raw bytes
- [ ] No `list_to_binary`/`binary_to_list` in hot paths — conversion is O(n)
- [ ] Large binary construction uses iolist accumulation, not string concatenation
- [ ] Binaries > 64 bytes are reference-counted — understand GC implications for long-lived processes
- [ ] `binary:match` / `binary:split` preferred over regex for simple pattern extraction

### Error Handling Patterns
<!-- activation: keywords=["error", "throw", "exit", "catch", "try", "{ok", "{error"] -->

- [ ] Functions return `{ok, Value}` / `{error, Reason}` — caller pattern-matches both
- [ ] `throw` used only for non-local returns within a known call stack — not for error reporting
- [ ] `exit(Reason)` used for process termination — not for returning errors to callers
- [ ] `try ... catch` used sparingly — most error handling via tagged tuples and supervision
- [ ] Error reasons are descriptive atoms or tagged tuples (`{invalid_input, Details}`) — not bare strings
- [ ] `erlang:error(badarg)` for precondition violations — crashes the process, caught by supervisor
- [ ] No `catch` expression (legacy) in new code — use `try ... catch Class:Reason:Stacktrace`
- [ ] Stack traces captured with third element in `catch` clause — `catch error:Reason:Stack`

### Hot Code Loading and Releases
<!-- activation: keywords=["code_change", "appup", "relup", "release", "sys.config", "vm.args"] -->

- [ ] `code_change/3` implemented when gen_server state format changes between versions
- [ ] `.appup` file describes upgrade/downgrade path if hot upgrade is used
- [ ] No anonymous functions stored in process state or ETS — they reference specific module versions
- [ ] Module-level constants not relied upon across code reload — recomputed or stored in state
- [ ] `sys.config` / `vm.args` changes documented — they require node restart, not hot reload
- [ ] Release structure includes `sys.config` for environment configuration, `vm.args` for BEAM flags
- [ ] Application version bumped in `.app.src` when behaviour-visible changes made

### Distribution and Clustering
<!-- activation: keywords=["node", "rpc", "global", "pg", "net_kernel", "distributed", "cookie"] -->

- [ ] Erlang distribution cookie not hardcoded — set via environment or config file
- [ ] `rpc:call` has explicit timeout — default infinity hangs on netsplit
- [ ] No `global` name registration for frequently changing processes — use `pg` or local registry
- [ ] Network partitions handled — processes detect node-down via monitors, not assumed connectivity
- [ ] Large messages not sent across distribution — data locality preferred, references passed instead
- [ ] `:connect_all` disabled if full mesh not needed — large clusters use partial connectivity
- [ ] Hidden nodes used for admin/monitoring connections — no accidental cluster topology changes

## Common False Positives

- **Bare `receive` without timeout in gen_server internals** — OTP behaviours manage receive loops; hand-written `receive` inside a callback is the concern, not the behaviour's own loop
- **Process dictionary in `logger` metadata** — Logger legitimately uses the process dictionary for metadata propagation; custom use is the anti-pattern
- **`public` ETS table for read-heavy caches** — `public` is valid for concurrent reads when writes are infrequent and atomic per-row consistency suffices
- **Missing `code_change/3` when hot loading not used** — projects deploying via rolling restarts (not hot upgrade) may skip `code_change` — flag only if `.appup` files exist
- **`spawn_link` in escript or one-off tools** — scripts that run and exit do not need full OTP supervision

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Process outside supervision tree in production | Critical |
| Unbounded mailbox growth — no backpressure | Critical |
| ETS table without heir — lost on owner crash | Critical |
| Cookie or secret hardcoded in source | Critical |
| Selective receive accumulates unmatched messages | Important |
| Missing `-spec` on exported function | Important |
| `gen_server:cast` where `call` needed for backpressure | Important |
| Process dictionary used for application state | Important |
| Missing catch-all in `handle_info` | Important |
| `ets:tab2list` in production code path | Important |
| Legacy `catch` expression instead of `try...catch` | Minor |
| `list_to_binary` in non-hot path | Minor |
| Missing `after` clause in `receive` (known bounded wait) | Minor |
| Untagged message atoms (e.g., bare `ok` instead of `{ok, result}`) | Minor |

## See Also

- `lang-elixir` — Elixir-specific patterns built on the same BEAM/OTP foundation
- `language-quality` — universal type-system and resource checks
- `concurrency-async` — cross-language concurrency patterns
- `security` — secrets and injection concerns

## Authoritative References

- [Erlang/OTP Design Principles](https://www.erlang.org/doc/design_principles/des_princ)
- [Erlang Reference Manual](https://www.erlang.org/doc/reference_manual/users_guide)
- [Erlang Efficiency Guide](https://www.erlang.org/doc/efficiency_guide/users_guide)
- [Learn You Some Erlang — Supervisors](https://learnyousomeerlang.com/supervisors)
- [Erlang Binary Handling](https://www.erlang.org/doc/efficiency_guide/binaryhandling)
- [Dialyzer User Guide](https://www.erlang.org/doc/man/dialyzer)
