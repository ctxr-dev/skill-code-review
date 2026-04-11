# Flask — Review Overlay

Load this overlay for the **security**, **api-design**, and **performance** specialists when `flask` is detected in Python project dependencies.

---

## Security

- [ ] CSRF protection via `flask-wtf` (`CSRFProtect(app)`) is enabled for all state-mutating form and AJAX endpoints; APIs that authenticate exclusively with tokens (Bearer/JWT) and have no cookie session may exempt themselves explicitly with a documented reason
- [ ] Jinja2 templates do not use the `|safe` filter on user-supplied data — every use of `|safe` is reviewed to confirm the value is application-controlled and can never contain user input
- [ ] `SECRET_KEY` is sourced from an environment variable or secrets manager, not hardcoded in `config.py` or checked into source control; a missing or short key causes the signing of sessions and CSRF tokens to be predictable
- [ ] File upload endpoints validate file extension and MIME type server-side (not by trusting `Content-Type`) and enforce a maximum file size via `MAX_CONTENT_LENGTH`; uploaded files are saved outside the web root with randomized names
- [ ] `flask-cors` (`CORS(app)`) or manual `after_request` CORS headers specify an explicit origin allowlist in production; `resources={'/*': {'origins': '*'}}` is flagged for APIs that use cookies or session-based auth

## Application Factory

- [ ] The app is created via an application factory function (`create_app(config)`) rather than instantiated at module level — module-level instantiation makes testing, multiple configs, and parallel test runs difficult
- [ ] Blueprints are registered inside the factory function, not at module import time, so that the factory can receive different config objects (testing, staging, production) without side effects
- [ ] Extensions (`SQLAlchemy`, `Migrate`, `Mail`, etc.) are initialized with `ext.init_app(app)` inside the factory rather than bound to a specific app at instantiation, enabling the factory pattern and application context reuse

## Configuration Management

- [ ] Configuration classes (e.g., `DevelopmentConfig`, `ProductionConfig`, `TestingConfig`) inherit from a `BaseConfig` that defines required keys; production config raises at startup if required environment variables are missing rather than falling back to insecure defaults
- [ ] `DEBUG = True` and `TESTING = True` are never set in production config and are not derived from a user-controllable source; the production deployment explicitly sets `FLASK_ENV=production` or equivalent
- [ ] `app.config.from_object` or `app.config.from_envvar` is used for configuration loading; `app.config` is not mutated at request time, which would cause race conditions in multi-threaded deployments

## Request Context

- [ ] `flask.g` is used only for request-scoped state that needs to be shared across functions within a single request — it is not used as a general-purpose in-process cache that persists across requests
- [ ] `current_app` and `g` are not accessed outside of an active application or request context (e.g., in background threads or CLI commands); background tasks use `app.app_context()` explicitly
- [ ] Authentication decorators push authenticated user data onto `g` at the start of the request (e.g., `g.current_user`) and route handlers read from `g` rather than re-fetching from the database

## Blueprint Structure

- [ ] Each blueprint is organized in its own package (`blueprints/<name>/__init__.py`) with its routes, forms, and templates colocated — routes are not all defined in a single flat file as the application grows
- [ ] Blueprint `url_prefix` values are defined at registration time in the factory function, not hardcoded in the blueprint itself, allowing the URL structure to be reconfigured without editing blueprint source

## SQLAlchemy Session Lifecycle

- [ ] `db.session` is not shared across threads or requests; in the application factory pattern, `db.session` is scoped to the request via `flask-sqlalchemy`'s built-in teardown, and background threads create their own session
- [ ] Explicit `db.session.commit()` calls are reviewed to confirm they are in the correct location (after all mutations succeed, not inside a loop); `db.session.rollback()` is called in exception handlers that catch database errors to return the session to a clean state

## Error Handlers

- [ ] `@app.errorhandler(404)`, `@app.errorhandler(500)`, and `@app.errorhandler(Exception)` are registered to return consistent JSON or HTML error responses; unregistered error codes do not fall through to Flask's default HTML error pages in API services
- [ ] The 500 error handler logs the full exception (including traceback) server-side but returns only a generic message to the client — stack traces and internal paths are never included in production error responses
