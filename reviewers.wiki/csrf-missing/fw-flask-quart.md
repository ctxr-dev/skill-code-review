---
id: fw-flask-quart
type: primary
depth_role: leaf
focus: "Detect Flask and Quart pitfalls in template injection, secret management, session security, CSRF protection, input validation, and async/sync boundary misuse that cause security vulnerabilities or production failures."
parents:
  - index.md
covers:
  - "render_template_string with user input enabling server-side template injection (SSTI)"
  - "app.run(debug=True) in production code paths"
  - SECRET_KEY hardcoded or committed to version control
  - Missing CSRF protection without Flask-WTF or manual tokens
  - SQL injection via raw queries without parameterization
  - "Session cookie without secure/httponly/samesite flags"
  - Missing input validation on request.args, request.form, request.json
  - g object misuse storing data that should be request-scoped or app-scoped
  - teardown_appcontext not cleaning up database connections or file handles
  - "Quart async handlers calling blocking I/O without run_in_executor"
  - Missing error handlers for 404, 500, and common exceptions
  - Blueprint organization issues with circular imports
  - Missing rate limiting on authentication and public endpoints
tags:
  - flask
  - quart
  - python
  - ssti
  - jinja2
  - session
  - csrf
  - async
  - blueprint
  - web-framework
  - security
activation:
  file_globs:
    - "**/*.py"
  keyword_matches:
    - flask
    - Flask
    - Quart
    - quart
    - app.route
    - Blueprint
    - request
    - jsonify
    - render_template
    - render_template_string
    - g
    - session
    - current_app
    - before_request
    - after_request
    - teardown_appcontext
  structural_signals:
    - Flask or Quart app instantiation
    - "Route decorators with @app.route or @blueprint.route"
    - Jinja2 template rendering calls
source:
  origin: file
  path: fw-flask-quart.md
  hash: "sha256:971e66855c49c049fee8eafb6d96565b9c73f0fe65c27524e0e7fe1f113f5395"
---
# Flask / Quart Framework Reviewer

## When This Activates

Activates when diffs touch Python files importing Flask, Quart, or their extensions (Blueprints, request, session, render_template). Flask's "micro" philosophy means security features that are built-in to Django (CSRF, session security, input validation) must be explicitly added via extensions or manual implementation. Quart extends this risk into async territory, where calling blocking I/O from async handlers silently degrades performance. This reviewer targets the gaps that Flask's minimalism leaves open and the async pitfalls specific to Quart.

## Audit Surface

- [ ] render_template_string() called with user-supplied input in the template string
- [ ] app.run(debug=True) or app.run() with debug parameter not gated by environment
- [ ] SECRET_KEY = 'string-literal' in application code or config file committed to VCS
- [ ] Flask app without Flask-WTF, Flask-SeaSurf, or manual CSRF token implementation
- [ ] db.engine.execute(), db.session.execute(), or cursor.execute() with string formatting
- [ ] SESSION_COOKIE_SECURE, SESSION_COOKIE_HTTPONLY, or SESSION_COOKIE_SAMESITE not set
- [ ] request.args.get(), request.form.get(), or request.json used without validation
- [ ] flask.g used to store data that persists beyond the request context
- [ ] teardown_appcontext or teardown_request handler missing for database session cleanup
- [ ] Quart async route handler calling synchronous library directly
- [ ] No @app.errorhandler(404) or @app.errorhandler(500) registered
- [ ] Blueprint importing from app module creating circular import at registration time
- [ ] No rate limiting middleware on login or registration routes
- [ ] Jinja2 autoescaping disabled via Markup() or |safe filter on user-controlled data
- [ ] Response object created without Content-Type or security headers

## Detailed Checks

### Server-Side Template Injection (SSTI)
<!-- activation: keywords=["render_template_string", "render_template", "Jinja2", "Template", "Markup", "|safe", "autoescape", "Environment", "from_string"] -->

- [ ] **render_template_string with user input**: flag `render_template_string(user_input)` or `render_template_string(f"...{user_data}...")` -- this is the canonical SSTI vector in Flask; attackers inject `{{ config.items() }}` or `{{ ''.__class__.__mro__[1].__subclasses__() }}` to achieve remote code execution; see `sec-ssti`
- [ ] **Template from user-controlled path**: flag `render_template(request.args.get('template'))` -- path traversal enables loading arbitrary templates; use a whitelist of allowed template names
- [ ] **Markup() on user input**: flag `Markup(user_data)` -- this marks the string as safe HTML, bypassing Jinja2's autoescaping; only use on content that has been sanitized with bleach or equivalent
- [ ] **|safe filter on user data**: flag `{{ user_input|safe }}` in Jinja2 templates where `user_input` traces to request data or database content containing user submissions -- `|safe` disables autoescaping for that expression; see `sec-xss-dom`
- [ ] **Autoescaping disabled**: flag `Jinja2.Environment(autoescape=False)` or `app.jinja_env.autoescape = False` -- Flask enables autoescaping by default for `.html` templates; disabling it re-enables XSS on all template expressions

### Debug Mode and Secret Management
<!-- activation: keywords=["debug", "DEBUG", "app.run", "SECRET_KEY", "secret", "config", "os.environ", "dotenv", "load_dotenv"] -->

- [ ] **Debug in production**: flag `app.run(debug=True)` without an environment guard (e.g., `if __name__ == '__main__'` is insufficient for production WSGI deployments) -- the Werkzeug debugger provides an interactive console that executes arbitrary Python code; this is a remote code execution vulnerability
- [ ] **Hardcoded SECRET_KEY**: flag `app.secret_key = 'literal'` or `app.config['SECRET_KEY'] = 'literal'` in committed code -- the secret key signs session cookies; if compromised, attackers can forge sessions; read from environment variables
- [ ] **Default or weak SECRET_KEY**: flag SECRET_KEY values that are short (< 24 characters), common strings ('secret', 'changeme', 'dev'), or appear in multiple projects -- use `python -c "import secrets; print(secrets.token_hex(32))"` to generate
- [ ] **Config from unvalidated source**: flag `app.config.from_envvar()` or `app.config.from_pyfile()` loading from user-controllable paths -- malicious config files can override security settings

### CSRF Protection
<!-- activation: keywords=["csrf", "CSRFProtect", "Flask-WTF", "WTF", "FlaskForm", "SeaSurf", "csrf_token", "POST", "PUT", "DELETE", "PATCH"] -->

- [ ] **No CSRF protection**: flag Flask apps with POST/PUT/DELETE routes and no `CSRFProtect(app)` from Flask-WTF, no Flask-SeaSurf, and no manual CSRF token implementation -- Flask has no built-in CSRF protection; any form submission or AJAX POST is vulnerable; see `sec-csrf`
- [ ] **CSRF exempt on browser-facing routes**: flag `@csrf.exempt` on views that render HTML forms or accept browser submissions -- exempt should be limited to API endpoints using token auth or webhook receivers with signature verification
- [ ] **Missing csrf_token() in forms**: flag HTML forms in templates that POST to the app but do not include `{{ csrf_token() }}` or `{{ form.hidden_tag() }}` -- even with CSRFProtect enabled, the token must be present in each form

### SQL Injection
<!-- activation: keywords=["execute", "text(", "raw", "cursor", "db.session", "db.engine", "sqlalchemy", "format", "f\"", "%s"] -->

- [ ] **String formatting in queries**: flag `db.session.execute(f"SELECT ... WHERE id = {user_id}")` or `cursor.execute("... %s" % value)` -- use parameterized queries: `db.session.execute(text("SELECT ... WHERE id = :id"), {"id": user_id})`; see `sec-owasp-a03-injection`
- [ ] **text() without bind params**: flag `db.session.execute(text("SELECT * FROM users WHERE name = '" + name + "'"))` -- SQLAlchemy's `text()` supports `:param` bind parameters; string concatenation bypasses them
- [ ] **ORM filter with user dict**: flag `.filter_by(**request.json)` or `.filter(**request.args)` -- users can inject arbitrary column filters; whitelist allowed filter keys; see `orm-sqlalchemy`

### Session Security
<!-- activation: keywords=["session", "SESSION_COOKIE", "PERMANENT_SESSION_LIFETIME", "secret_key", "cookie", "secure", "httponly", "samesite"] -->

- [ ] **Missing cookie flags**: flag apps without `SESSION_COOKIE_SECURE = True`, `SESSION_COOKIE_HTTPONLY = True`, and `SESSION_COOKIE_SAMESITE = 'Lax'` (or 'Strict') -- without these, session cookies are sent over HTTP, accessible to JavaScript, and vulnerable to CSRF
- [ ] **Session data without signing**: flag custom session implementations that do not use Flask's built-in signed cookies or a server-side session store (Flask-Session with Redis/database) -- unsigned cookies can be tampered with
- [ ] **Sensitive data in session**: flag patterns storing passwords, full credit card numbers, or API keys in `session['key']` -- Flask's default cookie-based sessions are signed but not encrypted; the client can decode them with base64
- [ ] **Missing session lifetime**: flag apps without `PERMANENT_SESSION_LIFETIME` configuration -- default sessions never expire, increasing the window for session fixation attacks

### Quart Async Pitfalls
<!-- activation: keywords=["async def", "await", "Quart", "quart", "run_in_executor", "asyncio", "aiohttp", "httpx", "asyncpg", "motor"] -->

- [ ] **Blocking call in async handler**: flag Quart `async def` route handlers calling synchronous blocking libraries (`requests.get()`, `time.sleep()`, `open()`, `sqlite3`, `psycopg2`) -- these block the event loop and serialize all concurrent requests; use `await asyncio.to_thread()` or async alternatives (httpx, aiofiles, asyncpg)
- [ ] **Sync ORM in async handler**: flag async handlers using synchronous SQLAlchemy sessions or Django ORM -- use async-compatible ORMs (SQLAlchemy async, Tortoise ORM) or wrap in `run_in_executor`
- [ ] **Missing await on coroutine**: flag `async def` functions where a coroutine call lacks `await` -- the coroutine is created but never executed; Python emits a RuntimeWarning but the operation silently fails
- [ ] **CPU-bound work in async handler**: flag async handlers performing heavy computation (image processing, cryptographic hashing, data transformation) without offloading to a thread pool -- use `await asyncio.to_thread(cpu_bound_func)`

### Error Handling and Application Structure
<!-- activation: keywords=["errorhandler", "abort", "HTTPException", "404", "500", "register_blueprint", "Blueprint", "factory", "create_app"] -->

- [ ] **Missing error handlers**: flag apps without `@app.errorhandler(404)` and `@app.errorhandler(500)` -- Flask's default error pages reveal framework information and provide poor user experience
- [ ] **Error handler leaking internals**: flag error handlers that return `str(exception)` or `traceback.format_exc()` in production -- error details enable attacker reconnaissance; log internally, return generic messages
- [ ] **Circular blueprint imports**: flag `from app import db` at the top of blueprint files when `app` imports from the blueprint module -- use the application factory pattern with `current_app` and deferred initialization to break the cycle
- [ ] **Missing application factory**: flag Flask apps that instantiate `app = Flask(__name__)` at module scope and configure it inline -- this prevents testing with different configs and causes import-time side effects; use `create_app()` factory pattern

### Input Validation and Request Handling
<!-- activation: keywords=["request.args", "request.form", "request.json", "request.data", "request.files", "get_json", "marshmallow", "pydantic", "wtforms", "validate"] -->

- [ ] **Unvalidated request data**: flag `request.args.get('id')` or `request.json['field']` used directly in database queries, file paths, or business logic without validation -- use marshmallow, pydantic, or WTForms to validate and deserialize; Flask provides no built-in validation
- [ ] **request.json without Content-Type check**: flag `request.json` access without handling the case where Content-Type is not application/json -- `request.json` returns `None` when the content type is wrong, which can cause AttributeError or NoneType exceptions downstream
- [ ] **File upload without validation**: flag `request.files['file']` saved with `file.save()` without checking file extension, content type, and size -- use `werkzeug.utils.secure_filename()` at minimum, and validate content type independently of the extension
- [ ] **Missing request size limit**: flag apps without `MAX_CONTENT_LENGTH` configuration -- without it, clients can POST arbitrarily large payloads causing memory exhaustion

## Common False Positives

- **render_template_string in tests**: test files using `render_template_string` with hardcoded strings for template testing are safe.
- **debug=True in **main** block**: `if __name__ == '__main__': app.run(debug=True)` is acceptable for local development if production uses a WSGI server (gunicorn, uvicorn) that ignores this code path.
- **SECRET_KEY in example/template files**: `.env.example` or `config.py.template` with placeholder SECRET_KEY values are documentation, not leaked secrets.
- **No CSRF on API-only apps**: Flask apps serving only JSON API endpoints with token-based authentication (JWT, API keys) do not need CSRF protection.
- **g object for request-scoped data**: `flask.g` storing database connections or user objects within a single request lifecycle is the intended use; only flag cross-request persistence.
- **Blocking calls in sync Flask**: `requests.get()` in a standard (non-Quart) Flask route handler is fine -- Flask runs synchronously by default under a WSGI server.

## Severity Guidance

| Finding | Severity |
|---|---|
| render_template_string() with user-controlled input (SSTI/RCE) | Critical |
| app.run(debug=True) reachable in production (Werkzeug debugger RCE) | Critical |
| SECRET_KEY hardcoded in committed code | Critical |
| SQL query with string formatting and user input | Critical |
| No CSRF protection on browser-facing app with POST routes | Critical |
| Blocking I/O in Quart async handler (event loop starvation) | Important |
| Missing SESSION_COOKIE_SECURE/HTTPONLY/SAMESITE flags | Important |
| Missing error handlers exposing framework internals | Important |
| Unvalidated request input used in business logic | Important |
| File upload saved without extension/type validation | Important |
| Markup() or \|safe on user-controlled data | Important |
| Missing MAX_CONTENT_LENGTH | Minor |
| Missing application factory pattern | Minor |
| Blueprint circular import | Minor |
| Missing PERMANENT_SESSION_LIFETIME | Minor |

## See Also

- `orm-sqlalchemy` -- SQLAlchemy-specific session management, N+1, and query patterns commonly used with Flask
- `sec-ssti` -- render_template_string injection is the primary SSTI vector in Python web frameworks
- `sec-csrf` -- Flask's missing CSRF requires explicit extension installation
- `sec-owasp-a03-injection` -- SQL injection via raw queries in Flask views
- `sec-owasp-a05-misconfiguration` -- debug mode and missing security headers
- `sec-xss-dom` -- Jinja2 autoescaping bypass via Markup() and |safe
- `principle-fail-fast` -- input validation at the request boundary prevents downstream errors

## Authoritative References

- [Flask Documentation -- Security Considerations](https://flask.palletsprojects.com/en/latest/security/)
- [Flask Documentation -- Application Factories](https://flask.palletsprojects.com/en/latest/patterns/appfactories/)
- [Quart Documentation -- Flask Migration](https://quart.palletsprojects.com/en/latest/how_to_guides/flask_migration.html)
- [OWASP -- Server-Side Template Injection](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/07-Input_Validation_Testing/18-Testing_for_Server-side_Template_Injection)
- [Werkzeug Documentation -- Debug Mode](https://werkzeug.palletsprojects.com/en/latest/debug/)
- [Flask-WTF Documentation -- CSRF Protection](https://flask-wtf.readthedocs.io/en/stable/csrf.html)
