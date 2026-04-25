---
id: fw-phoenix-elixir
type: primary
depth_role: leaf
focus: "Detect Phoenix/Elixir pitfalls in CSRF protection, HEEx template escaping, LiveView input validation, authorization plugs, Ecto raw SQL injection, channel authentication, PubSub authorization, and GenServer error handling that cause security vulnerabilities or runtime failures."
parents:
  - index.md
covers:
  - Missing Plug.CSRFProtection in router pipeline
  - Raw HTML in HEEx templates bypassing Phoenix auto-escaping
  - LiveView handle_event without input validation
  - Missing authorization plugs in router pipelines
  - Ecto raw SQL with string interpolation enabling injection
  - Channel join without authentication or authorization
  - PubSub messages broadcast to unauthorized subscribers
  - LiveView assigns growing unbounded across events
  - Missing rate limiting on public-facing endpoints
  - Missing error handling in GenServer callbacks
  - "Blocking calls in LiveView mount/1 or handle_params/3"
  - Secrets hardcoded in config files instead of runtime config
tags:
  - phoenix
  - elixir
  - liveview
  - ecto
  - plug
  - csrf
  - channels
  - pubsub
  - genserver
  - security
  - web-framework
activation:
  file_globs:
    - "**/*.ex"
    - "**/*.exs"
    - "**/*.heex"
    - "**/mix.exs"
  keyword_matches:
    - Phoenix
    - Phoenix.Router
    - Phoenix.Controller
    - Phoenix.LiveView
    - Phoenix.Channel
    - Plug
    - Ecto
    - conn
    - socket
    - assign
    - live_view
    - handle_event
    - mount
  structural_signals:
    - Phoenix router with pipeline and scope definitions
    - "LiveView module with mount/handle_event callbacks"
    - "Channel module with join/handle_in callbacks"
source:
  origin: file
  path: fw-phoenix-elixir.md
  hash: "sha256:9c467fe00867db5f7438a12a49698011c3eb6299bdb9c07774836fba1f5782dc"
---
# Phoenix/Elixir Framework Reviewer

## When This Activates

Activates when diffs touch Elixir files using Phoenix, LiveView, Channels, Ecto, or Plug. Phoenix provides strong defaults -- HEEx templates auto-escape by default, Ecto uses parameterized queries, and Plug pipelines enforce middleware ordering. However, these protections are routinely bypassed: `raw/1` disables HEEx escaping, `Ecto.Adapters.SQL.query()` with interpolation enables injection, LiveView's stateful model introduces unbounded memory growth, and channel joins without token verification expose real-time features to unauthenticated users. This reviewer targets framework-specific pitfalls that Sobelow may not fully catch, especially in LiveView and Channel code.

## Audit Surface

- [ ] Router pipeline missing Plug.CSRFProtection for browser-facing routes
- [ ] HEEx template using raw/1 or {:safe, ...} with user-supplied content
- [ ] LiveView handle_event/3 using params directly without validation or casting
- [ ] Controller actions without authorization plug or policy check
- [ ] Ecto.Adapters.SQL.query() or fragment() with string interpolation
- [ ] Channel join/3 callback returning {:ok, socket} without verifying user token
- [ ] PubSub.broadcast to topic that unauthenticated users can subscribe to
- [ ] LiveView assigns accumulating list data without pagination or limit
- [ ] Endpoint or router with no rate limiting plug for public routes
- [ ] GenServer handle_call/handle_cast without rescue/catch or terminate/2
- [ ] LiveView mount/3 performing synchronous database queries or HTTP calls
- [ ] Secrets in config/*.exs files instead of runtime.exs or environment variables
- [ ] Missing Content-Security-Policy header in endpoint or plug pipeline
- [ ] Phoenix.Token or Guardian token without expiration
- [ ] LiveView uploads without file type or size validation

## Detailed Checks

### CSRF and Plug Pipeline
<!-- activation: keywords=["Plug.CSRFProtection", "csrf", "protect_from_forgery", "pipeline", "plug", ":browser", "delete_csrf_token", "csrf_meta_tag"] -->

- [ ] **Missing CSRF plug**: flag `:browser` pipeline without `plug Plug.CSRFProtection` -- browser-facing routes need CSRF protection; Phoenix generates the pipeline with it, but it can be removed or overridden; see `sec-csrf`
- [ ] **CSRF disabled on state-changing route**: flag routes using `delete_csrf_token/0` or a custom pipeline bypassing CSRF on POST/PUT/DELETE from browser forms -- legitimate only for webhook endpoints verifying signatures
- [ ] **API pipeline with CSRF**: flag `:api` pipeline that includes `Plug.CSRFProtection` -- APIs using token-based auth do not need CSRF and the plug will reject valid API requests missing the token
- [ ] **Missing auth plug in pipeline**: flag router scopes for authenticated areas without an authorization plug (e.g., `ensure_authenticated`, `require_role`) -- Phoenix pipelines enforce middleware ordering, so missing plugs mean unauthenticated access; see `sec-owasp-a01-broken-access-control`

### HEEx Template Escaping and XSS
<!-- activation: keywords=["raw", "{:safe", "heex", "Phoenix.HTML.raw", "inner_content", "render_slot", "Phoenix.HTML.Safe"] -->

- [ ] **raw/1 with user data**: flag `raw(user_input)` or `Phoenix.HTML.raw(variable)` in HEEx templates where the variable originates from user input, database content, or URL params -- `raw/1` bypasses auto-escaping and is a direct XSS vector; see `sec-xss-dom`
- [ ] **{:safe, ...} tuple with dynamic content**: flag `{:safe, dynamic_string}` in view functions or components -- this tuple bypasses the `Phoenix.HTML.Safe` protocol; only use with pre-sanitized static HTML
- [ ] **Unescaped slot content**: flag `render_slot(@inner_block)` inside raw HTML context without ensuring slot content is escaped -- components receiving arbitrary slot content must not assume it is safe
- [ ] **Missing CSP header**: flag Phoenix endpoint without `put_resp_header("content-security-policy", ...)` or a CSP plug -- CSP is the primary defense-in-depth against XSS even with auto-escaping

### LiveView State and Events
<!-- activation: keywords=["handle_event", "handle_info", "handle_params", "mount", "assign", "assigns", "socket", "push_event", "live_view", "LiveView", "temporary_assigns"] -->

- [ ] **handle_event without validation**: flag `handle_event/3` callbacks that use the `params` map directly in Ecto changesets, queries, or business logic without casting or validating -- LiveView params come from the client and can be tampered with; use `Ecto.Changeset.cast/4` or explicit validation
- [ ] **Unbounded assigns growth**: flag LiveView assigns that append to lists (e.g., `assign(socket, :items, socket.assigns.items ++ new_items)`) without using `temporary_assigns` or pagination -- each connected client holds assigns in memory; unbounded growth causes BEAM memory exhaustion
- [ ] **Blocking mount**: flag `mount/3` or `handle_params/3` performing synchronous HTTP calls, long database queries, or `GenServer.call` with long timeouts -- LiveView mount blocks the socket connection; use `send(self(), :load_data)` and handle in `handle_info/2` for async loading
- [ ] **push_event with sensitive data**: flag `push_event(socket, "event", %{secret: ...})` sending secrets or tokens to the client -- push_event data is visible in browser dev tools

### Ecto SQL Injection
<!-- activation: keywords=["Ecto.Adapters.SQL.query", "fragment", "Repo.query", "execute", "raw", "sql", "Ecto.Query"] -->

- [ ] **String interpolation in fragment**: flag `fragment("... #{variable} ...")` or `fragment("... " <> variable <> " ...")` -- use `fragment("... ?", ^variable)` for parameterized queries; string interpolation in fragment enables SQL injection; see `sec-owasp-a03-injection`
- [ ] **SQL.query with interpolation**: flag `Ecto.Adapters.SQL.query(repo, "SELECT ... #{param}")` -- use the params list: `SQL.query(repo, "SELECT ... WHERE id = $1", [param])`
- [ ] **Dynamic table/column names**: flag `from(r in ^table_name, ...)` where `table_name` comes from user input -- Ecto does not parameterize table or column names; validate against an allowlist

### Channel Authentication
<!-- activation: keywords=["join", "handle_in", "Channel", "channel", "socket", "Phoenix.Token", "token", "UserSocket", "connect"] -->

- [ ] **join without auth**: flag `join/3` callbacks that return `{:ok, socket}` unconditionally without verifying a token or checking `socket.assigns.current_user` -- channels bypass the Plug pipeline; authentication must happen in `UserSocket.connect/3` and authorization in `join/3`
- [ ] **UserSocket.connect without token verification**: flag `connect/3` that assigns a user without calling `Phoenix.Token.verify/4` or equivalent -- unverified tokens allow impersonation
- [ ] **Token without max_age**: flag `Phoenix.Token.verify/4` without `max_age` option -- tokens without expiration are valid indefinitely; set `max_age` to a reasonable value (e.g., 86400 for 24 hours)
- [ ] **handle_in broadcasting unfiltered**: flag `handle_in` callbacks that broadcast user-supplied payloads without validation -- malicious clients can inject arbitrary data into channels

### PubSub and Authorization
<!-- activation: keywords=["PubSub", "broadcast", "subscribe", "topic", "Endpoint.broadcast", "Phoenix.PubSub"] -->

- [ ] **Broadcast to open topic**: flag `Phoenix.PubSub.broadcast` or `Endpoint.broadcast` to topics that any connected socket can subscribe to (e.g., `"updates"`) when the payload contains user-specific or sensitive data -- use user-scoped topics like `"user:#{user_id}"`
- [ ] **Subscribe without authorization**: flag `Phoenix.PubSub.subscribe` calls in LiveView `mount/3` without verifying the current user has access to the topic -- unauthenticated LiveView connections can subscribe to sensitive topics
- [ ] **Topic name from user input**: flag topic strings constructed from user-supplied params without validation -- malicious users can subscribe to arbitrary topics

### GenServer and Process Safety
<!-- activation: keywords=["GenServer", "handle_call", "handle_cast", "handle_info", "init", "terminate", "Agent", "Task", "Supervisor"] -->

- [ ] **Missing error handling in callbacks**: flag `handle_call/3` or `handle_cast/2` without rescue/catch when calling fallible external code -- unhandled exceptions crash the GenServer; if it is not supervised with a restart strategy, the process is lost permanently
- [ ] **Unsupervised GenServer**: flag `GenServer.start_link` called outside a supervisor -- unsupervised processes are not restarted on crash; use a `DynamicSupervisor` or add to the application supervision tree
- [ ] **Blocking in handle_info**: flag `handle_info/2` performing long-running work synchronously -- this blocks all other messages to the process; delegate to `Task.async` under a `Task.Supervisor`
- [ ] **Large state in GenServer**: flag GenServer state that accumulates unbounded data (growing lists, maps with no eviction) -- BEAM processes hold state in memory; use ETS tables or external storage for large datasets

## Common False Positives

- **raw/1 on pre-sanitized HTML**: content processed through `HtmlSanitizeEx` or a similar library before `raw/1` is safe. Verify the sanitization step exists in the call chain.
- **CSRF excluded on API routes**: the `:api` pipeline correctly excludes CSRF when using token-based authentication (Bearer, API key). Only flag if the route serves browser forms.
- **Channel join with upstream auth**: if `UserSocket.connect/3` fully authenticates the user and assigns `current_user`, a simple `{:ok, socket}` in `join/3` may be acceptable for non-sensitive channels.
- **Blocking mount for SSR**: server-rendered LiveView (non-connected mount) may perform synchronous queries for SEO. Verify the blocking call is guarded by `connected?(socket)`.
- **GenServer without rescue in OTP app**: if the GenServer is supervised with `restart: :permanent` and crash recovery is the intended strategy (let it crash), missing rescue is idiomatic Elixir.

## Severity Guidance

| Finding | Severity |
|---|---|
| Ecto fragment/SQL.query with string interpolation (SQL injection) | Critical |
| raw/1 or {:safe, ...} with user-supplied content in HEEx (XSS) | Critical |
| Channel join without any authentication check | Critical |
| Missing Plug.CSRFProtection in browser pipeline | Critical |
| Controller actions without authorization plug on sensitive routes | Critical |
| handle_event using unvalidated params in database operations | Important |
| PubSub broadcast leaking sensitive data to open topics | Important |
| LiveView assigns growing unbounded (memory exhaustion) | Important |
| Blocking calls in LiveView mount (degraded UX) | Important |
| Secrets hardcoded in config/*.exs instead of runtime.exs | Important |
| Phoenix.Token without max_age expiration | Minor |
| Missing Content-Security-Policy header | Minor |
| Unsupervised GenServer process | Minor |

## See Also

- `lang-elixir` -- Elixir language-level pitfalls: pattern matching, process lifecycle, OTP conventions
- `sec-owasp-a03-injection` -- Ecto fragment with interpolation is SQL injection
- `sec-xss-dom` -- raw/1 and {:safe, ...} are server-side rendering XSS sinks
- `sec-csrf` -- Phoenix CSRF plug configuration and token mechanics
- `sec-owasp-a01-broken-access-control` -- missing authorization plugs on routes
- `sec-owasp-a05-misconfiguration` -- hardcoded secrets, missing CSP, missing TLS config
- `conc-actor-model` -- GenServer and process supervision patterns
- `principle-fail-fast` -- input validation in handle_event and channel callbacks

## Authoritative References

- [Phoenix Framework Documentation](https://hexdocs.pm/phoenix/)
- [Phoenix LiveView Documentation](https://hexdocs.pm/phoenix_live_view/)
- [Phoenix Security -- Sobelow](https://github.com/nccgroup/sobelow)
- [Ecto Documentation -- Query Security](https://hexdocs.pm/ecto/Ecto.Query.html)
- [Phoenix Channels Documentation](https://hexdocs.pm/phoenix/channels.html)
- [OWASP -- Server-Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
