---
id: fw-rails
type: primary
depth_role: leaf
focus: Detect Ruby on Rails pitfalls in mass assignment, CSRF bypass, controller authorization, SQL injection via string interpolation, open redirects, path traversal, callback coupling, and N+1 queries that cause vulnerabilities or production failures.
parents:
  - index.md
covers:
  - "Mass assignment without strong parameters (permit) allowing attribute injection"
  - "skip_before_action :verify_authenticity_token disabling CSRF protection"
  - render with user-controlled input enabling XSS or template injection
  - "SQL injection via string interpolation in where(), order(), pluck()"
  - Missing before_action authentication on controllers handling sensitive data
  - redirect_to with user-controlled URL enabling open redirect attacks
  - send_file or send_data with user-supplied path enabling path traversal
  - Missing rate limiting on authentication endpoints
  - "Callbacks (before_save, after_create) creating implicit coupling chains"
  - N+1 queries from missing includes, eager_load, or preload
  - Secrets or credentials committed in credentials.yml.enc or database.yml
  - "Unscoped find() allowing IDOR on resources belonging to other users"
  - N+1 queries from missing includes, eager_load, or preload on associations
  - "SQL injection via string interpolation in where(), order(), pluck(), or find_by_sql"
  - Counter cache inconsistency from manual updates bypassing the cache
  - "Unsafe migrations -- adding index without algorithm: :concurrently, removing column without ignore"
  - "Callback hell -- after_save/before_destroy chains causing hidden side effects"
  - Missing scopes causing unfiltered queries returning all records
  - Enum collision -- integer-based enum reordering causing silent data corruption
  - "Missing dependent: option on has_many causing orphaned records"
tags:
  - rails
  - ruby
  - security
  - mass-assignment
  - csrf
  - sql-injection
  - authorization
  - n-plus-one
  - callbacks
  - strong-parameters
  - activerecord
  - n-plus-1
  - includes
  - migration
  - strong-migrations
  - data-architecture
aliases:
  - orm-activerecord-rails
activation:
  file_globs:
    - "**/*.rb"
    - "**/Gemfile"
    - "**/config/routes.rb"
    - "**/app/controllers/**"
    - "**/app/models/**"
  keyword_matches:
    - Rails
    - ApplicationController
    - ApplicationRecord
    - before_action
    - render
    - redirect_to
    - params
    - strong_parameters
    - permit
  structural_signals:
    - Rails controller with action methods
    - ActiveRecord model with associations
    - Rails routes configuration
source:
  origin: file
  path: fw-rails.md
  hash: "sha256:0a8a65f63889f3b4cc03aa079809428881d1b789651d1066fd5a8a8093bf5653"
---
# Ruby on Rails Framework Reviewer

## When This Activates

Activates when diffs touch Rails controllers, models, routes, views, or configuration files. Rails provides strong security defaults -- CSRF protection, parameterized queries, and HTML escaping are all on by default. The most dangerous Rails bugs come from explicitly disabling these defaults: calling `skip_before_action :verify_authenticity_token`, using string interpolation in `where()`, or bypassing strong parameters with `permit!`. This reviewer focuses on detecting patterns that override Rails' safe defaults and on architectural pitfalls like callback coupling and N+1 queries. For ActiveRecord ORM-specific patterns, see `orm-activerecord-rails`.

## Audit Surface

- [ ] params.permit() call missing or overly permissive (permit!) in controller actions
- [ ] skip_before_action :verify_authenticity_token without API-token-based auth replacement
- [ ] render inline:, render html:, or render plain: with user input without sanitization
- [ ] where() with string interpolation or concatenation instead of parameterized syntax
- [ ] Controller without before_action :authenticate_user! or equivalent auth filter
- [ ] redirect_to params[:url] or params[:return_to] without allowlist validation
- [ ] send_file(params[:path]) or send_data without path canonicalization and allowlist
- [ ] Model with more than 3 callbacks creating hidden side effects
- [ ] Controller action querying an association without .includes() on a collection
- [ ] credentials.yml.enc master key or database.yml with plaintext passwords committed
- [ ] Model.find(params[:id]) without scoping to current_user's association
- [ ] protect_from_forgery with: :null_session on browser-facing controller
- [ ] config.force_ssl = false or absent in production.rb
- [ ] raw() or exec_query() with string interpolation
- [ ] Serializer or jbuilder template exposing internal attributes

## Detailed Checks

### Mass Assignment and Strong Parameters
<!-- activation: keywords=["params", "permit", "permit!", "strong_parameters", "require", "attributes=", "update", "create", "new", "assign_attributes"] -->

- [ ] **Missing permit()**: flag controller actions that pass `params` or `params[:model]` directly to `Model.new()`, `Model.create()`, `.update()`, or `.assign_attributes()` without calling `.permit(:field1, :field2)` -- mass assignment allows attackers to set `is_admin`, `role`, or `price` fields; see `sec-owasp-a01-broken-access-control`
- [ ] **permit! (permit-all)**: flag `params.require(:model).permit!` -- this whitelists every attribute, equivalent to no strong parameters; use explicit field lists
- [ ] **Over-permissive permit**: flag `.permit(:role, :is_admin, :admin)` on user-facing forms where admin attributes should only be settable by admins -- strong params should vary by user role; use separate param methods for admin vs. regular users
- [ ] **Nested attributes without restriction**: flag `accepts_nested_attributes_for` without `reject_if` or `limit` -- attackers can create unlimited nested records or modify associations they should not access

### CSRF Protection
<!-- activation: keywords=["verify_authenticity_token", "protect_from_forgery", "csrf", "skip_before_action", "forgery_protection", "null_session"] -->

- [ ] **Blanket CSRF skip**: flag `skip_before_action :verify_authenticity_token` on controllers serving browser-rendered forms -- legitimate uses are limited to API controllers using token-based auth; browser-facing controllers need CSRF; see `sec-csrf`
- [ ] **protect_from_forgery with: :null_session**: flag this on browser-facing controllers -- `:null_session` silently nullifies the session on CSRF failure instead of raising, masking attacks and causing confusing behavior
- [ ] **Missing CSRF meta tag**: flag layouts without `<%= csrf_meta_tags %>` when JavaScript makes POST/PUT/DELETE requests -- Rails UJS and Turbo need the CSRF token from the meta tag
- [ ] **API controller inheriting ApplicationController CSRF**: flag API-only controllers that inherit from `ApplicationController` instead of `ActionController::API` -- they inherit CSRF protection which then fails on every request, leading developers to skip it entirely

### Injection and XSS
<!-- activation: keywords=["where(", "order(", "pluck(", "select(", "group(", "having(", "raw(", "exec_query", "find_by_sql", "render", "html_safe", "raw", "sanitize", "strip_tags", "interpolation"] -->

- [ ] **SQL injection via interpolation**: flag `where("name = '#{params[:name]}'")`, `where("status = " + params[:status])`, or `order(params[:sort])` -- use parameterized forms: `where(name: params[:name])`, `where("name = ?", params[:name])`, or `.order(Arel.sql(...))` with allowlisting; see `sec-owasp-a03-injection`
- [ ] **Unsafe render with user input**: flag `render html: params[:content]`, `render inline: user_string`, or `.html_safe` called on user-controlled strings -- these bypass Rails' automatic HTML escaping; see `sec-xss-dom`
- [ ] **raw() in views**: flag `<%= raw(user_input) %>` or `<%== user_input %>` in ERB templates where the source is user-controlled -- both disable HTML escaping
- [ ] **find_by_sql with interpolation**: flag `Model.find_by_sql("SELECT * FROM users WHERE id = #{params[:id]}")` -- use `find_by_sql(["SELECT * FROM users WHERE id = ?", params[:id]])`

### Authorization and Access Control
<!-- activation: keywords=["before_action", "authenticate", "authorize", "current_user", "pundit", "cancancan", "Ability", "policy", "find(params", "find_by(", "scope"] -->

- [ ] **Missing authentication filter**: flag controllers without `before_action :authenticate_user!` (Devise), `before_action :require_login`, or equivalent -- all controller actions are publicly accessible by default unless a filter is applied; see `sec-owasp-a01-broken-access-control`
- [ ] **Unscoped find()**: flag `Model.find(params[:id])` or `Model.find_by(id: params[:id])` without scoping to `current_user` -- this allows any authenticated user to access any record by guessing IDs (IDOR); use `current_user.models.find(params[:id])` or Pundit/CanCanCan authorization
- [ ] **Open redirect**: flag `redirect_to params[:url]`, `redirect_to params[:return_to]`, or `redirect_to request.referer` without validating the URL starts with `/` or belongs to an allowlisted domain -- attackers use this for phishing; see `sec-owasp-a01-broken-access-control`
- [ ] **Path traversal via send_file**: flag `send_file(params[:path])` or `send_file("#{Rails.root}/uploads/#{params[:filename]}")` without `File.expand_path` canonicalization and directory allowlisting -- `../../etc/passwd` traverses out of the intended directory

### Callback Coupling and Model Complexity
<!-- activation: keywords=["before_save", "after_save", "before_create", "after_create", "before_update", "after_update", "before_destroy", "after_destroy", "before_validation", "after_commit"] -->

- [ ] **Callback chains**: flag models with more than 3 lifecycle callbacks (before/after save/create/update/destroy/commit) -- callback chains create implicit coupling where the order of execution is non-obvious, testing requires full Rails boot, and a failure in one callback silently rolls back unrelated operations; see `principle-separation-of-concerns`
- [ ] **Side effects in callbacks**: flag `after_create` or `after_save` callbacks that send emails, enqueue jobs, or call external APIs -- these run inside the transaction; if the transaction rolls back, the email was already sent; use `after_commit` or move to a service object
- [ ] **Conditional callback complexity**: flag callbacks with complex conditional logic (`if: -> { ... }, unless: -> { ... }`) that make it unclear when the callback fires -- extract to explicit service objects for testability

### Query Performance
<!-- activation: keywords=["includes", "eager_load", "preload", "joins", "references", "each", "map", "pluck", "select", "find_each", "find_in_batches", "count", "size", "length"] -->

- [ ] **N+1 queries**: flag controller actions that load a collection (e.g., `@posts = Post.all`) and the corresponding view or serializer accesses an association (e.g., `post.author.name`) without `.includes(:author)` -- each iteration fires a separate query; use Bullet gem for runtime detection; see `orm-activerecord-rails`
- [ ] **Collection loaded with .all**: flag `Model.all` or `Model.where(...)` without `.limit()` in controller actions returning collections -- unbounded queries can return millions of rows; always paginate or limit
- [ ] **length on association**: flag `.length` on ActiveRecord relations instead of `.count` or `.size` -- `.length` loads all records into memory to count them; `.count` issues a SQL COUNT; `.size` is smart about which to use

## Common False Positives

- **API-only controllers skipping CSRF**: controllers inheriting from `ActionController::API` or using token-based authentication (JWT, API keys) correctly skip CSRF verification.
- **Admin-only permit lists**: admin controllers may legitimately permit role/admin attributes if the controller is behind admin authentication and authorization.
- **Callbacks in simple models**: a single `before_validation` for data normalization and a single `after_create` for auditing is not callback coupling -- flag only when callbacks exceed 3 or create cross-model side effects.
- **send_file with hardcoded paths**: `send_file Rails.root.join('public', 'docs', 'terms.pdf')` with no user input is safe.
- **redirect_to with only_path**: `redirect_to params[:return_to], only_path: true` prevents open redirect by stripping the host (though it was bypassed in older Rails versions -- verify Rails version).

## Severity Guidance

| Finding | Severity |
|---|---|
| SQL injection via string interpolation in where/order/pluck | Critical |
| Mass assignment without strong parameters (permit) | Critical |
| send_file/send_data with user-controlled path (path traversal) | Critical |
| render html:/inline: with user-controlled content (XSS) | Critical |
| skip_before_action :verify_authenticity_token on browser-facing controller | Critical |
| redirect_to with user-controlled URL (open redirect) | Critical |
| Unscoped find() allowing IDOR across users | Important |
| Controller without authentication before_action | Important |
| Serializer exposing password_digest or internal fields | Important |
| N+1 queries on collections without includes | Important |
| Callback chains with side effects inside transactions | Important |
| permit! whitelisting all attributes | Important |
| config.force_ssl missing in production | Important |
| credentials master key or database.yml secrets committed | Critical |
| Unbounded Model.all without pagination | Minor |
| Complex conditional callbacks reducing readability | Minor |

## See Also

- `orm-activerecord-rails` -- ActiveRecord-specific query patterns, migration safety, and association pitfalls
- `sec-owasp-a03-injection` -- SQL injection via string interpolation in Rails queries
- `sec-owasp-a01-broken-access-control` -- mass assignment, IDOR, missing authentication filters
- `sec-csrf` -- Rails CSRF protection mechanism and bypass patterns
- `sec-xss-dom` -- html_safe, raw(), and render with user input
- `principle-separation-of-concerns` -- extract callback chains into service objects

## Authoritative References

- [Rails Guides -- Security](https://guides.rubyonrails.org/security.html)
- [Rails Guides -- Action Controller Overview](https://guides.rubyonrails.org/action_controller_overview.html)
- [Rails Guides -- Active Record Validations](https://guides.rubyonrails.org/active_record_validations.html)
- [Rails Guides -- Active Record Callbacks](https://guides.rubyonrails.org/active_record_callbacks.html)
- [Brakeman -- Rails Security Scanner](https://brakemanscanner.org/)
- [OWASP -- Ruby on Rails Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Ruby_on_Rails_Cheat_Sheet.html)
