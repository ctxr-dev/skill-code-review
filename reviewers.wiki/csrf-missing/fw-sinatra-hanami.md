---
id: fw-sinatra-hanami
type: primary
depth_role: leaf
focus: Detect Sinatra and Hanami pitfalls including missing CSRF protection, unescaped template rendering, hardcoded session secrets, missing security headers, monolith growth in Sinatra, and bypassed validation in Hanami that cause vulnerabilities or architectural decay.
parents:
  - index.md
covers:
  - "Missing CSRF protection in Sinatra (no built-in CSRF by default)"
  - "ERB or Haml rendering with unescaped user input via raw or != syntax"
  - Missing input validation on route params and form data
  - Session secret hardcoded as a string literal in application code
  - "Missing security headers (X-Frame-Options, CSP, HSTS)"
  - Sinatra app exceeding single-responsibility and needing extraction
  - Hanami action without params validation block
  - "Hanami repository bypassed for direct Sequel/ROM dataset access"
  - Missing error handling and custom error pages for production
  - "enable :sessions without configuring secret or secure flags"
  - Sinatra route with inline SQL or shell commands using user input
  - Missing authentication check in before filter
tags:
  - sinatra
  - hanami
  - ruby
  - security
  - csrf
  - xss
  - validation
  - session
  - microframework
  - architecture
activation:
  file_globs:
    - "**/*.rb"
    - "**/Gemfile"
  keyword_matches:
    - Sinatra
    - sinatra
    - Hanami
    - hanami
    - get
    - post
    - put
    - delete
    - helpers
    - before
    - after
    - set
    - enable
    - configure
  structural_signals:
    - Sinatra application class or modular app
    - Hanami action or application configuration
    - Rack middleware stack configuration
source:
  origin: file
  path: fw-sinatra-hanami.md
  hash: "sha256:7a37251775e52db1c514f928ecdd59bdd9230cabf421516c6927209aed640f67"
---
# Sinatra / Hanami Framework Reviewer

## When This Activates

Activates when diffs touch Sinatra application files, Hanami actions, repositories, or configuration. Sinatra is deliberately minimal -- it provides no CSRF protection, no input validation, no security headers, and no structured error handling by default. Every protection must be explicitly added via middleware or gems. Hanami provides more structure with its action/repository/entity pattern but its validations and repository boundaries can be bypassed. Both frameworks require more discipline than Rails because fewer guard rails exist. This reviewer focuses on detecting missing protections and architectural drift.

## Audit Surface

- [ ] Sinatra app with POST/PUT/DELETE routes but no rack_csrf or Rack::Protection middleware
- [ ] ERB template using <%== %> or raw() on user-controlled variables
- [ ] Haml template using != instead of = for user-controlled output
- [ ] Route handler accessing params[:key] without type checking or validation
- [ ] set :session_secret, 'hardcoded-string' or enable :sessions without explicit secret
- [ ] Sinatra app without Rack::Protection middleware enabled
- [ ] Sinatra application file exceeding 300 lines with mixed concerns
- [ ] Hanami action class without params block defining validations
- [ ] Direct ROM/Sequel dataset access outside of a Hanami repository
- [ ] Missing error handler (error 404/500 blocks or Hanami exception handling)
- [ ] configure :production block missing security settings
- [ ] before filter without authentication check on protected routes
- [ ] set :show_exceptions, true in production configuration
- [ ] Missing Content-Type response headers on API endpoints

## Detailed Checks

### CSRF and Session Security
<!-- activation: keywords=["csrf", "Rack::Protection", "rack_csrf", "session", "session_secret", "enable :sessions", "set :session_secret", "protect_from_forgery", "cookie"] -->

- [ ] **Missing CSRF protection**: flag Sinatra apps with POST/PUT/DELETE routes that do not include `Rack::Csrf`, `rack_csrf`, or `Rack::Protection::AuthenticityToken` middleware -- Sinatra has zero CSRF protection by default; every state-changing endpoint is vulnerable; see `sec-csrf`
- [ ] **Hardcoded session secret**: flag `set :session_secret, 'any-string-literal'` or `enable :sessions` without an explicit `:secret` option read from an environment variable -- the secret signs session cookies; hardcoded values allow session forgery on any deployment sharing the source code
- [ ] **Insecure session cookie flags**: flag session configuration without `secure: true` and `httponly: true` in production -- sessions without Secure flag are sent over HTTP; without HttpOnly, JavaScript can steal session cookies via XSS
- [ ] **Missing Rack::Protection**: flag Sinatra classic-style apps (not `Sinatra::Base` subclasses) where `Rack::Protection` is explicitly disabled, and `Sinatra::Base` subclasses where it is not explicitly enabled -- classic Sinatra enables it by default; modular apps do not

### Template Injection and XSS
<!-- activation: keywords=["erb", "haml", "slim", "render", "raw", "html_safe", "<%==", "!=", "template", "content_for", "yield"] -->

- [ ] **Unescaped ERB output**: flag `<%== user_input %>` or `<%= raw(user_input) %>` where the variable originates from params, database fields, or external input -- ERB's `<%== %>` disables HTML escaping; see `sec-xss-dom`
- [ ] **Unescaped Haml output**: flag `!= user_input` in Haml templates where the source is user-controlled -- the `!=` operator bypasses Haml's automatic HTML escaping
- [ ] **Inline HTML in route handler**: flag route handlers that build HTML strings with `"<div>#{params[:name]}</div>"` and return them -- there is no automatic escaping outside templates; use `Rack::Utils.escape_html()` or a template engine
- [ ] **Server-side template injection**: flag patterns where user input is passed as a template string (e.g., `erb user_supplied_string`) rather than as a variable within a template -- this allows arbitrary code execution; see `sec-ssti`

### Input Validation
<!-- activation: keywords=["params", "request.body", "JSON.parse", "validate", "dry-validation", "dry-types", "contract", "schema", "coerce"] -->

- [ ] **No input validation**: flag route handlers that access `params[:key]` and pass values directly to database queries, file operations, or external service calls without any type checking, length limits, or format validation -- Sinatra provides no validation layer; use `dry-validation`, `dry-types`, or manual checks; see `principle-fail-fast`
- [ ] **Hanami action without params validation**: flag Hanami action classes that do not define a `params` block with validation rules -- the params block is Hanami's primary input validation mechanism; skipping it admits arbitrary data
- [ ] **JSON body not validated**: flag API endpoints that call `JSON.parse(request.body.read)` and access fields without schema validation -- malformed or oversized JSON causes crashes or logic errors; validate with `dry-schema` or `json-schema`
- [ ] **Missing type coercion**: flag params used in numeric comparisons or array indexing without `.to_i`, `.to_f`, or type validation -- string params used as integers cause unexpected behavior

### Security Headers and Production Hardening
<!-- activation: keywords=["configure", "production", "show_exceptions", "dump_errors", "raise_errors", "logging", "set :environment", "Content-Security-Policy", "X-Frame-Options", "Strict-Transport-Security"] -->

- [ ] **Missing security headers**: flag Sinatra/Hanami apps without explicit `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, and `Strict-Transport-Security` headers -- neither framework sets these by default; use `Rack::Protection` or set headers manually in a before filter; see `sec-owasp-a05-misconfiguration`
- [ ] **Debug mode in production**: flag `set :show_exceptions, true`, `enable :dump_errors`, or `set :raise_errors, true` in production configuration -- these leak stack traces, file paths, and gem versions to users
- [ ] **Missing production error pages**: flag Sinatra apps without `error 404` and `error 500` blocks or Hanami apps without custom exception handling -- default error pages expose framework internals
- [ ] **Logging sensitive data**: flag `logger.info params.inspect` or similar patterns that log full request params including passwords, tokens, or PII -- filter sensitive fields before logging

### Architectural Growth and Separation of Concerns
<!-- activation: keywords=["class", "module", "helpers", "register", "use", "require", "Application", "Repository", "Entity", "Action", "routes"] -->

- [ ] **Sinatra monolith growth**: flag single Sinatra application files exceeding 300 lines or containing more than 10 route handlers -- Sinatra apps that grow beyond a few endpoints should be split into modular `Sinatra::Base` subclasses mounted via `Rack::URLMap` or `use`; see `principle-separation-of-concerns`
- [ ] **Business logic in route handlers**: flag route handlers that contain more than 15 lines of logic including database queries, conditionals, and response formatting -- extract to service objects or interactors; route handlers should orchestrate, not implement
- [ ] **Hanami repository bypass**: flag Hanami actions or interactors that access ROM relations or Sequel datasets directly instead of going through repository classes -- repositories encapsulate persistence; bypassing them breaks the architecture's data access boundary
- [ ] **Helpers as a dumping ground**: flag Sinatra `helpers` blocks exceeding 50 lines or containing unrelated methods -- extract into focused modules; helpers should contain view/template utilities, not business logic

### Error Handling
<!-- activation: keywords=["error", "rescue", "halt", "status", "begin", "not_found", "500", "StandardError", "Exception"] -->

- [ ] **Missing rescue in route handlers**: flag route handlers that call external services, parse JSON, or perform file I/O without rescue blocks -- unhandled exceptions return raw 500 responses exposing internals
- [ ] **Bare rescue**: flag `rescue => e` or `rescue Exception => e` that catches all exceptions including `SystemExit` and `Interrupt` -- rescue only specific exception classes
- [ ] **halt without status code**: flag `halt 'error message'` without an explicit status code -- the default is 200, which tells the client the request succeeded when it did not

## Common False Positives

- **API-only Sinatra apps skipping CSRF**: JSON API endpoints authenticated via tokens (JWT, API keys) do not need CSRF protection. Verify the auth mechanism before flagging.
- **Sinatra classic apps and Rack::Protection**: classic-style Sinatra apps (`require 'sinatra'` at top level) enable `Rack::Protection` automatically. Only flag if it is explicitly disabled.
- **Small Sinatra apps**: a Sinatra app with 3-5 routes in a single file is the framework's intended use case. Only flag monolith growth above 10 routes or 300 lines.
- **Hanami 2.x vs 1.x**: Hanami 2.x restructured the application architecture significantly. Verify the Hanami version before flagging repository bypass patterns that may not apply.
- **ERB <%== %> with pre-sanitized content**: if the value was sanitized with `Rack::Utils.escape_html` or `CGI.escapeHTML` before assignment, `<%== %>` is safe.

## Severity Guidance

| Finding | Severity |
|---|---|
| SQL/shell injection via params interpolation in queries or system calls | Critical |
| Missing CSRF protection on state-changing Sinatra routes | Critical |
| Server-side template injection via user-supplied template string | Critical |
| Hardcoded session secret in application code | Critical |
| Unescaped user input in ERB/Haml templates (XSS) | Critical |
| Missing authentication before filter on sensitive routes | Important |
| Missing input validation on route parameters | Important |
| Debug/show_exceptions enabled in production | Important |
| Missing security headers (CSP, HSTS, X-Frame-Options) | Important |
| Hanami action without params validation block | Important |
| Hanami repository bypassed for direct DB access | Important |
| Sinatra app monolith exceeding 300 lines / 10 routes | Minor |
| Missing custom error pages for 404/500 | Minor |
| Helpers block used as a dumping ground | Minor |
| halt without explicit status code | Minor |

## See Also

- `sec-csrf` -- CSRF protection mechanisms and why Sinatra lacks them by default
- `sec-xss-dom` -- ERB/Haml escaping and template injection patterns
- `sec-ssti` -- server-side template injection via dynamic template rendering
- `sec-owasp-a05-misconfiguration` -- missing security headers and debug mode in production
- `sec-owasp-a03-injection` -- SQL and command injection via params interpolation
- `principle-separation-of-concerns` -- extracting route handlers into services and modular apps
- `principle-fail-fast` -- validate input at the route boundary

## Authoritative References

- [Sinatra Documentation](https://sinatrarb.com/intro.html)
- [Sinatra -- Security and Protection](https://sinatrarb.com/protection.html)
- [Hanami Documentation -- Actions](https://guides.hanamirb.org/v2.1/actions/overview/)
- [Hanami Documentation -- Repositories](https://guides.hanamirb.org/v2.1/repositories/overview/)
- [Rack::Protection -- GitHub](https://github.com/sinatra/sinatra/tree/main/rack-protection)
- [OWASP -- Ruby on Rails Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Ruby_on_Rails_Cheat_Sheet.html)
