---
id: orm-django
type: primary
depth_role: leaf
focus: "Detect Django ORM pitfalls including N+1 from missing select_related/prefetch_related, raw SQL injection, migration squashing risks, queryset evaluation timing, F/Q expression misuse, and signal side effects"
parents:
  - index.md
covers:
  - "N+1 from accessing ForeignKey or reverse relations without select_related/prefetch_related"
  - "SQL injection via raw(), extra(), or RawSQL with string formatting"
  - Migration squashing that drops data migrations or reorders dependencies
  - Queryset evaluated multiple times instead of being cached in a variable
  - "F() expressions not used for race-condition-prone field updates"
  - "Q() expressions with user input constructing dynamic filters unsafely"
  - "Signal handlers (post_save, pre_delete) with heavy side effects blocking request"
  - "Missing .only()/.defer() fetching all fields when subset suffices"
  - "Queryset .count() or .exists() misuse on already-evaluated querysets"
tags:
  - django
  - orm
  - python
  - n-plus-1
  - select-related
  - raw-sql
  - migration
  - queryset
  - signals
  - data-architecture
activation:
  file_globs:
    - "**/*.py"
    - "**/migrations/**"
  keyword_matches:
    - django
    - models.Model
    - objects.filter
    - objects.all
    - select_related
    - prefetch_related
    - ForeignKey
    - "raw("
    - RawSQL
    - "extra("
    - "F("
    - "Q("
    - post_save
    - pre_save
    - RunPython
    - migration
source:
  origin: file
  path: orm-django.md
  hash: "sha256:8c20989c29017b85dfe256126263db5e115c36c42974c991f768a02ce2f37f14"
---
# Django ORM

## When This Activates

Activates on Python diffs importing Django models, querysets, signals, or migration files. Django's ORM is deceptively simple -- accessing `book.author` looks like a property access but fires a SQL query. This invisibility makes N+1 the default behavior unless developers explicitly add `select_related` or `prefetch_related`. This reviewer catches Django-specific performance traps, injection vectors in `raw()`/`extra()`, and migration pitfalls.

## Audit Surface

- [ ] ForeignKey or related manager access inside a loop without select_related/prefetch_related
- [ ] .raw() or RawSQL() called with f-string, .format(), or % string formatting
- [ ] extra() with user-supplied parameters in where or select clauses
- [ ] Migration squash that removes RunPython data migration steps
- [ ] Queryset assigned to variable, then iterated and counted separately (double evaluation)
- [ ] Field update via obj.field = obj.field + 1; obj.save() instead of F() expression
- [ ] post_save or post_delete signal handler performing HTTP calls or heavy computation
- [ ] Model.objects.all() without .only(), .defer(), or .values() in API serializer
- [ ] .count() called on queryset that was already fully evaluated
- [ ] Dynamic filter built from user input dictionary passed to .filter(**kwargs) without validation
- [ ] Missing db_index=True on ForeignKey or fields used in frequent filter/order_by

## Detailed Checks

### N+1 Detection
<!-- activation: keywords=["select_related", "prefetch_related", "ForeignKey", "related_name", "for", "loop", "all()", "filter", "author", "category", "objects"] -->

- [ ] **ForeignKey in loop**: flag `obj.foreign_key_field` access inside a loop over a queryset without `select_related('foreign_key_field')` -- each access fires a SELECT; chain `select_related()` on the original queryset
- [ ] **Reverse relation in loop**: flag `obj.related_set.all()` or `obj.children.all()` inside a loop without `prefetch_related('related_set')` -- each access fires a query; use `prefetch_related()` which batches into 1-2 queries
- [ ] **Missing Prefetch object**: flag `prefetch_related` used on relations that need filtering -- plain `prefetch_related('comments')` cannot filter; use `Prefetch('comments', queryset=Comment.objects.filter(active=True))`
- [ ] **Serializer N+1**: flag Django REST Framework serializers with nested serializers where the view queryset lacks `select_related`/`prefetch_related` -- serialization triggers lazy loading per object

### Raw SQL Injection
<!-- activation: keywords=["raw(", "RawSQL", "extra(", "cursor", "execute", "sql", "format", "f\"", "%s"] -->

- [ ] **raw() with formatting**: flag `Model.objects.raw(f"SELECT ... WHERE id = {user_id}")` or `.raw("... %s" % value)` -- use `raw("SELECT ... WHERE id = %s", [user_id])` with parameter list
- [ ] **extra() with user input**: flag `.extra(where=["name = '%s'" % name])` -- `extra()` is deprecated and prone to injection; rewrite with `annotate()` and `F()`/`Value()` expressions or use `.raw()` with params
- [ ] **cursor.execute() with concatenation**: flag `cursor.execute("SELECT ... " + user_input)` -- use `cursor.execute("SELECT ... WHERE id = %s", [user_id])` with parameter tuple
- [ ] **filter(**kwargs) from user dict**: flag `.filter(**request.data)` or `.filter(**user_dict)` -- users can inject lookups like `{"is_admin": True}` or `{"password__startswith": "a"}`; whitelist allowed filter keys

### Migration Safety
<!-- activation: keywords=["migration", "squash", "RunPython", "RunSQL", "dependencies", "operations", "makemigrations", "migrate"] -->

- [ ] **Squash drops data migration**: flag `squashmigrations` output that omits `RunPython` or `RunSQL` data migration operations -- data migrations must be preserved or manually replayed; the squashed migration only preserves schema operations by default
- [ ] **RunPython without reverse**: flag `RunPython(forward_func)` without a `reverse_func` argument -- set `reverse_func` or `migrations.RunPython.noop` for rollback capability
- [ ] **Model import in migration**: flag migrations that import models directly (`from myapp.models import User`) instead of using `apps.get_model('myapp', 'User')` -- direct imports use the current model definition which may differ from the schema at migration time

### Queryset Evaluation
<!-- activation: keywords=["queryset", "count", "exists", "len(", "list(", "bool(", "evaluate", "cache", "iterator", "values", "only", "defer"] -->

- [ ] **Double evaluation**: flag queryset stored in a variable that is both iterated and separately counted/checked -- each operation re-evaluates the queryset; evaluate once and use Python `len()` on the result, or use `.exists()` before iteration
- [ ] **Missing .only()/.defer()**: flag `Model.objects.all()` in API views or serializers that access only a subset of fields -- use `.only('field1', 'field2')` or `.values()` to avoid fetching unused columns
- [ ] **Large queryset without .iterator()**: flag iteration over unbounded querysets without `.iterator()` -- Django caches the entire result set in memory; `.iterator()` uses server-side cursors for constant memory

### F/Q Expressions and Race Conditions
<!-- activation: keywords=["F(", "Q(", "update", "save", "increment", "counter", "balance", "race", "atomic"] -->

- [ ] **Read-modify-write without F()**: flag `obj.counter = obj.counter + 1; obj.save()` -- this is a race condition under concurrent access; use `Model.objects.filter(pk=obj.pk).update(counter=F('counter') + 1)` for atomic updates
- [ ] **Missing select_for_update**: flag concurrent update patterns without `.select_for_update()` in a transaction -- SELECT FOR UPDATE prevents concurrent modification; combine with `@transaction.atomic`

### Signal Side Effects
<!-- activation: keywords=["post_save", "pre_save", "post_delete", "pre_delete", "signal", "receiver", "dispatch"] -->

- [ ] **Heavy signal handler**: flag `post_save` or `post_delete` handlers that make HTTP requests, send emails, or perform expensive computation -- signals run synchronously in the save path; move heavy work to Celery tasks or async handlers
- [ ] **Signal creating more signals**: flag signal handlers that call `.save()` on other models, potentially triggering cascading signals -- this can cause infinite loops or unpredictable ordering; use `update()` or set `signal.disconnect` during handler

## Common False Positives

- **Small fixed querysets**: N+1 on bounded collections (e.g., 3 categories) in admin views is negligible.
- **Management commands**: raw SQL in management commands for one-time operations is acceptable with proper parameterization.
- **Already-prefetched querysets**: if the view correctly prefetches but the signal fires on a different code path, the signal path may still need separate prefetching.
- **F() not needed for single-user contexts**: read-modify-write is safe in management commands or single-threaded contexts.

## Severity Guidance

| Finding | Severity |
|---|---|
| .raw() or cursor.execute() with string formatting and user input | Critical |
| .filter(**user_dict) without whitelist | Critical |
| N+1 from missing select_related in unbounded loop | Critical |
| Race condition from read-modify-write without F() on high-concurrency field | Important |
| Signal handler with synchronous HTTP call | Important |
| Migration squash dropping data migration | Important |
| Double queryset evaluation on large dataset | Important |
| Missing .only()/.defer() on large model in API view | Minor |
| RunPython without reverse_func | Minor |
| Model import in migration instead of apps.get_model | Minor |

## See Also

- `data-n-plus-1-and-query-perf` -- Django's lazy loading is a primary source of N+1 in Python web applications
- `sec-owasp-a03-injection` -- raw()/extra() injection is a specific SQL injection vector
- `data-schema-migrations` -- Django migration safety follows the general migration patterns
- `orm-sqlalchemy` -- alternative Python ORM with different session/loading model

## Authoritative References

- [Django Documentation, "Database Access Optimization"](https://docs.djangoproject.com/en/stable/topics/db/optimization/)
- [Django Documentation, "Making Queries -- select_related and prefetch_related"](https://docs.djangoproject.com/en/stable/ref/models/querysets/#select-related)
- [Django Documentation, "Performing Raw SQL Queries"](https://docs.djangoproject.com/en/stable/topics/db/sql/)
- [Django Documentation, "Signals"](https://docs.djangoproject.com/en/stable/topics/signals/)
