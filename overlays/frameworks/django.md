---
tools:
  - name: django-check
    command: "python manage.py check --deploy"
    purpose: "Django deployment readiness check"
---

# Django — Review Overlay

Load this overlay for the **security**, **api-design**, **performance**, and **data-validation** specialists when `django` is detected in project dependencies.

---

## Security

- [ ] `CsrfViewMiddleware` is present in `MIDDLEWARE` and not disabled for API endpoints unless they use token-based authentication (DRF SessionAuthentication requires CSRF; TokenAuthentication / JWT does not)
- [ ] `QuerySet.raw()`, `Manager.extra()`, and `connection.execute()` with string formatting or `%` interpolation are absent — parameterized queries use `params=[...]` argument, not f-strings or `.format()`
- [ ] `SECRET_KEY` is not committed to version control; it is loaded from an environment variable or secrets manager
- [ ] `DEBUG = False` in production settings; `ALLOWED_HOSTS` is set to explicit domain names, not `['*']`
- [ ] The Django admin (`/admin/`) is either mounted at a non-default URL, protected behind additional authentication, or disabled if not needed
- [ ] `SECURE_HSTS_SECONDS`, `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, and `CSRF_COOKIE_SECURE` are set in production settings
- [ ] File upload views validate file type server-side (using `python-magic` or equivalent, not just the extension or `Content-Type` header) and store uploads outside `MEDIA_ROOT` served directly

## Templates

- [ ] Template autoescape is not disabled globally or per-block (`{% autoescape off %}`, `|safe` filter) for user-supplied content
- [ ] The `|safe` filter and `mark_safe()` are only applied to values that are definitively HTML-safe (e.g., pre-sanitized rich text), not to any user-supplied string

## Performance

- [ ] QuerySets that traverse foreign keys or M2M relations in loops use `select_related()` (for FK/OneToOne) or `prefetch_related()` (for M2M/reverse FK) to eliminate N+1 queries
- [ ] `QuerySet.values()` or `values_list()` is used when only specific fields are needed, rather than loading full model instances
- [ ] `QuerySet.count()` is used instead of `len(queryset)` for counting rows; `QuerySet.exists()` is used instead of `bool(queryset)` for existence checks
- [ ] Database indexes exist for all fields used in `filter()`, `order_by()`, and `exclude()` on high-traffic querysets — check `Meta.indexes` and field `db_index=True`
- [ ] Celery or a task queue is used for work that should not block the request/response cycle (emails, webhooks, heavy computation)

## Django REST Framework

- [ ] Every DRF `APIView` and `ViewSet` has explicit `permission_classes` set — do not rely on the global `DEFAULT_PERMISSION_CLASSES` for endpoints that require specific permissions
- [ ] Serializer `validate_<field>` and `validate()` methods raise `serializers.ValidationError`, not Python built-in exceptions
- [ ] `serializer.is_valid(raise_exception=True)` is used rather than manually checking `is_valid()` and returning 400 responses to reduce boilerplate and ensure consistent error format
- [ ] Write serializers (for POST/PUT/PATCH) are separate from read serializers when the shape differs significantly — avoid a single serializer that uses `read_only`/`write_only` on many fields

## Signals and Middleware

- [ ] Django signals (`post_save`, `pre_delete`, etc.) are not used for critical business logic that must be transactional — use explicit service calls inside `transaction.atomic()` instead
- [ ] Custom middleware is ordered correctly: authentication/session middleware before any middleware that reads `request.user`; exception middleware after all others
- [ ] Migrations do not conflict (two migration files with the same parent) — the CI pipeline runs `python manage.py migrate --check` or equivalent
