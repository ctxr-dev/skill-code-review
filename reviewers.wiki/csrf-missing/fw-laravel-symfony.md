---
id: fw-laravel-symfony
type: primary
depth_role: leaf
focus: "Detect Laravel and Symfony pitfalls including Blade/Twig XSS via unescaped output, mass assignment without fillable/guarded, missing CSRF tokens, raw SQL injection, missing middleware, debug mode exposure, Eloquent N+1 queries, and missing authorization that cause vulnerabilities or production failures."
parents:
  - index.md
covers:
  - "Blade {!! !!} unescaped output with user-controlled data enabling XSS"
  - Eloquent model without $fillable or $guarded allowing mass assignment
  - "Missing @csrf directive on Blade forms or CSRF token on Symfony forms"
  - Raw DB queries with string interpolation or concatenation
  - Routes without middleware for authentication or authorization
  - APP_DEBUG=true in production .env exposing stack traces
  - Missing validation on controller request input
  - "Eloquent N+1 queries from missing with() or load()"
  - "Symfony Twig |raw filter on user-controlled data"
  - "Missing Gate/Policy/Voter authorization checks"
  - Missing rate limiting on authentication routes
  - .env file committed to version control
  - "Mass assignment via Request::all() passed to create/update"
  - "Sensitive data in config files without env() wrapper"
tags:
  - laravel
  - symfony
  - php
  - blade
  - twig
  - eloquent
  - doctrine
  - security
  - xss
  - mass-assignment
  - csrf
  - sql-injection
  - middleware
  - authorization
activation:
  file_globs:
    - "**/*.php"
    - "**/composer.json"
    - "**/routes/**"
    - "**/app/Http/**"
  keyword_matches:
    - Laravel
    - Symfony
    - Route
    - Controller
    - Middleware
    - Eloquent
    - Doctrine
    - Request
    - Response
    - Blade
    - Twig
    - Auth
    - Gate
    - Policy
  structural_signals:
    - Laravel controller with resource methods
    - Symfony controller with route attributes
    - Eloquent model with relationships
source:
  origin: file
  path: fw-laravel-symfony.md
  hash: "sha256:ebc19b0b8b870d821d23d0d1bf6a87f3f38c8bc92d15edf703ebbc74700b1b33"
---
# Laravel / Symfony Framework Reviewer

## When This Activates

Activates when diffs touch Laravel or Symfony controllers, models, routes, views, middleware, or configuration files. Laravel provides strong defaults -- Blade escapes output with `{{ }}`, Eloquent uses parameterized queries, and CSRF middleware is enabled globally. The most dangerous Laravel bugs come from bypassing these defaults: using `{!! !!}` with user data, passing `$request->all()` to mass assignment, or writing raw SQL with interpolation. Symfony similarly escapes Twig output by default but provides the `|raw` filter to bypass it. This reviewer detects patterns that override safe defaults and common gaps in middleware, authorization, and production hardening.

## Audit Surface

- [ ] Blade template using {!! $variable !!} where $variable contains user input
- [ ] Eloquent model class without $fillable or $guarded property
- [ ] Blade form without @csrf directive or Symfony form without csrf_token()
- [ ] DB::raw(), DB::select(), or DB::statement() with variable interpolation
- [ ] Route definition without ->middleware('auth') or equivalent
- [ ] APP_DEBUG=true in .env or .env.production file
- [ ] Controller action accepting Request without $request->validate() or FormRequest
- [ ] Eloquent query accessing relationship without ->with() eager loading
- [ ] Twig template using |raw filter on a variable from user input or database
- [ ] Controller action without Gate::authorize(), $this->authorize(), or Policy check
- [ ] Auth routes without throttle middleware
- [ ] .env file tracked in git
- [ ] $request->all() passed directly to Model::create() or ->update()
- [ ] Config value hardcoded instead of using env() helper
- [ ] Symfony controller without @IsGranted or denyAccessUnlessGranted()
- [ ] Missing APP_KEY or APP_KEY set to a known default value

## Detailed Checks

### XSS via Unescaped Output
<!-- activation: keywords=["{!!", "!!}", "|raw", "html_entity_decode", "Blade", "Twig", "e()", "htmlspecialchars", "@php", "render", "Response"] -->

- [ ] **Blade {!! !!} with user data**: flag `{!! $variable !!}` in Blade templates where `$variable` originates from user input, request parameters, or unsanitized database fields -- Blade's `{!! !!}` syntax bypasses HTML escaping; use `{{ $variable }}` which calls `htmlspecialchars()` automatically; see `sec-xss-dom`
- [ ] **Twig |raw with user data**: flag `{{ variable|raw }}` in Twig templates where the variable is user-controlled -- the `|raw` filter disables Twig's automatic escaping; use `{{ variable }}` (auto-escaped) or `{{ variable|e('html') }}`
- [ ] **html_entity_decode on escaped output**: flag `html_entity_decode()` called on variables that were auto-escaped -- this reverses the escaping and reintroduces XSS vectors
- [ ] **Response with raw HTML**: flag controller actions returning `response($userInput)` or `new Response($userInput)` with content-type text/html -- responses built outside the template engine bypass all auto-escaping

### Mass Assignment Protection
<!-- activation: keywords=["$fillable", "$guarded", "create(", "update(", "fill(", "forceFill", "$request->all()", "Request::all", "mass assign", "Model"] -->

- [ ] **Missing $fillable/$guarded**: flag Eloquent model classes that define no `$fillable` or `$guarded` property -- without either, all attributes are mass-assignable; `$guarded = ['*']` blocks all, `$fillable` explicitly allowlists fields; see `sec-owasp-a01-broken-access-control`
- [ ] **$request->all() to create/update**: flag `Model::create($request->all())` or `$model->update($request->all())` -- even with `$fillable` set, `$request->all()` passes every field including unexpected ones; use `$request->validated()` (after validation) or `$request->only(['field1', 'field2'])`
- [ ] **forceFill() with user input**: flag `$model->forceFill($request->input())` -- `forceFill` bypasses `$fillable`/`$guarded` protection entirely; it should only be used with trusted, developer-controlled data
- [ ] **$guarded = []**: flag `protected $guarded = []` on models with sensitive fields (role, is_admin, balance) -- empty guarded is equivalent to no protection

### CSRF Protection
<!-- activation: keywords=["@csrf", "csrf_token", "csrf_field", "VerifyCsrfToken", "csrf_protection", "withoutMiddleware", "except", "_token"] -->

- [ ] **Missing @csrf on forms**: flag Blade `<form>` elements with method POST/PUT/PATCH/DELETE that do not include `@csrf` -- Laravel's CSRF middleware rejects requests without the token; missing it causes 419 errors and breaks forms; see `sec-csrf`
- [ ] **CSRF exclusion in middleware**: flag routes added to `$except` array in `VerifyCsrfToken` middleware or `->withoutMiddleware('csrf')` on browser-facing routes -- legitimate exceptions are limited to webhook receivers with signature verification
- [ ] **Symfony form without CSRF**: flag Symfony form types with `'csrf_protection' => false` -- Symfony enables CSRF by default; disabling it should require explicit justification
- [ ] **Missing CSRF on AJAX**: flag JavaScript POST requests to Laravel routes without the X-CSRF-TOKEN header or the XSRF-TOKEN cookie mechanism -- Laravel provides both patterns; neither is automatic in custom JavaScript

### SQL Injection via Raw Queries
<!-- activation: keywords=["DB::raw", "DB::select", "DB::statement", "DB::insert", "DB::update", "whereRaw", "selectRaw", "orderByRaw", "havingRaw", "DQL", "createQuery", "createNativeQuery", "query("] -->

- [ ] **Raw SQL with interpolation**: flag `DB::raw("SELECT * FROM users WHERE id = $id")`, `DB::select("... WHERE name = '{$name}'")`, or `->whereRaw("status = " . $input)` -- use parameter binding: `DB::raw("SELECT * FROM users WHERE id = ?", [$id])` or `->whereRaw("status = ?", [$input])`; see `sec-owasp-a03-injection`
- [ ] **Doctrine DQL with concatenation**: flag `$em->createQuery("SELECT u FROM User u WHERE u.name = '" . $name . "'")` -- use parameter binding: `->setParameter('name', $name)`
- [ ] **orderByRaw with user input**: flag `->orderByRaw($request->input('sort'))` -- column names and sort directions cannot be parameterized; allowlist valid column names explicitly
- [ ] **Raw expressions in Eloquent scopes**: flag model scopes that use `DB::raw()` with closures capturing controller input -- the injection is hidden in the model layer, far from where input validation should occur

### Middleware, Authorization, and Route Protection
<!-- activation: keywords=["middleware", "auth", "Gate", "Policy", "authorize", "can(", "cannot(", "IsGranted", "denyAccessUnlessGranted", "Voter", "guard", "Route::"] -->

- [ ] **Route without auth middleware**: flag route groups or individual routes handling user data without `->middleware('auth')`, `->middleware('auth:sanctum')`, or equivalent -- unauthenticated access to user-specific data is broken access control; see `sec-owasp-a01-broken-access-control`
- [ ] **Missing authorization check**: flag controller actions that query or modify resources without `$this->authorize('action', $model)`, `Gate::authorize()`, or Policy checks -- authentication confirms identity but authorization confirms permission
- [ ] **Symfony missing access control**: flag Symfony controller actions without `#[IsGranted]` attribute, `$this->denyAccessUnlessGranted()`, or Voter-based checks on protected operations
- [ ] **Missing rate limiting on auth routes**: flag login, registration, and password reset routes without `throttle` middleware -- Laravel provides `throttle:login` and `RateLimiter` facade; without them, brute-force attacks are unchecked

### Production Hardening and Configuration
<!-- activation: keywords=["APP_DEBUG", "APP_KEY", ".env", "config(", "env(", "debug", "log_level", "APP_ENV", "storage", "public"] -->

- [ ] **APP_DEBUG=true in production**: flag `.env` or `.env.production` with `APP_DEBUG=true` -- debug mode exposes full stack traces, SQL queries, environment variables, and loaded config to any visitor via Ignition/Whoops; see `sec-owasp-a05-misconfiguration`
- [ ] **.env committed to VCS**: flag `.env` present in the git index (not just `.env.example`) -- .env contains APP_KEY, database credentials, API keys, and mail passwords; it must be in `.gitignore`
- [ ] **Hardcoded config values**: flag config files using hardcoded credentials or API keys instead of `env('KEY_NAME')` -- config files are committed; secrets must come from environment variables
- [ ] **Missing APP_KEY**: flag `.env` without `APP_KEY` or with `APP_KEY=base64:` followed by a known default -- APP_KEY encrypts sessions, cookies, and passwords; it must be unique per installation
- [ ] **Storage link exposing sensitive files**: flag `php artisan storage:link` creating symlinks when storage contains user uploads without access control -- public storage should not expose private files

### Query Performance and Eloquent Pitfalls
<!-- activation: keywords=["with(", "load(", "eager", "lazy", "whereHas", "has(", "->each", "->get()", "->all()", "chunk(", "cursor(", "paginate"] -->

- [ ] **N+1 queries**: flag controller actions or Blade templates that iterate over a collection and access a relationship (e.g., `$post->author->name`) without the controller calling `->with('author')` -- each iteration fires a separate query; use `->with()` for eager loading; see `orm-hibernate-jpa` for the general pattern
- [ ] **Unbounded ->get() or ->all()**: flag `Model::all()` or `->get()` without `->paginate()`, `->limit()`, or `->chunk()` in controllers returning collections -- unbounded queries load all rows into memory
- [ ] **Lazy loading in production**: flag Eloquent queries that trigger lazy loading in a loop without `Model::preventLazyLoading()` enabled -- Laravel 9+ supports `preventLazyLoading()` which throws exceptions on N+1; enable it in non-production environments for detection

## Common False Positives

- **{!! !!} with sanitized HTML**: `{!! $purifiedHtml !!}` where the value was processed by HTMLPurifier or similar is intentionally unescaped. Verify the sanitization chain.
- **CSRF exceptions for webhooks**: routes receiving Stripe, GitHub, or payment provider callbacks legitimately skip CSRF and verify via HMAC signatures instead.
- **$guarded = [] on read-only models**: models representing database views or read-only tables may use empty guarded safely since they are never mass-assigned.
- **API routes without CSRF**: `routes/api.php` uses the `api` middleware group which excludes CSRF by design; API endpoints use token-based auth instead.
- **APP_DEBUG in .env.example**: `.env.example` with `APP_DEBUG=true` is a template; only flag if the actual `.env` or `.env.production` has it.
- **DB::raw for aggregations**: `DB::raw('COUNT(*) as count')` without user input is safe; flag only when the raw expression includes variables.

## Severity Guidance

| Finding | Severity |
|---|---|
| SQL injection via raw query with string interpolation | Critical |
| `{!! !!}` or `\|raw` with user-controlled data (XSS) | Critical |
| .env with credentials committed to VCS | Critical |
| APP_DEBUG=true in production | Critical |
| Missing $fillable/$guarded on Eloquent model | Critical |
| $request->all() passed to create/update | Critical |
| forceFill() with user input | Critical |
| Route without auth middleware on user data endpoints | Important |
| Missing authorization (Gate/Policy/Voter) on protected actions | Important |
| Missing @csrf on browser forms | Important |
| Missing rate limiting on auth routes | Important |
| Hardcoded credentials in config files | Important |
| N+1 Eloquent queries in controllers | Important |
| Missing APP_KEY or known default APP_KEY | Important |
| Unbounded ->get() or ->all() without pagination | Minor |
| Lazy loading without preventLazyLoading() | Minor |

## See Also

- `sec-owasp-a03-injection` -- SQL injection via raw queries and string interpolation
- `sec-xss-dom` -- Blade {!! !!} and Twig |raw bypass auto-escaping
- `sec-owasp-a01-broken-access-control` -- mass assignment, missing auth middleware, missing authorization
- `sec-owasp-a05-misconfiguration` -- APP_DEBUG=true, .env committed, missing security headers
- `sec-csrf` -- CSRF token requirements for Laravel/Symfony forms
- `orm-hibernate-jpa` -- N+1 query patterns applicable to Eloquent/Doctrine
- `principle-fail-fast` -- validate input at the controller boundary with FormRequest or Symfony constraints

## Authoritative References

- [Laravel Documentation -- Security](https://laravel.com/docs/master/security)
- [Laravel Documentation -- Validation](https://laravel.com/docs/master/validation)
- [Laravel Documentation -- Authorization](https://laravel.com/docs/master/authorization)
- [Laravel Documentation -- Eloquent Mass Assignment](https://laravel.com/docs/master/eloquent#mass-assignment)
- [Symfony Documentation -- Security](https://symfony.com/doc/current/security.html)
- [Symfony Documentation -- Forms and CSRF](https://symfony.com/doc/current/security/csrf.html)
- [OWASP -- PHP Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/PHP_Configuration_Cheat_Sheet.html)
