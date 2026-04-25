---
id: sec-idor-and-mass-assignment
type: primary
depth_role: leaf
focus: Detect Insecure Direct Object Reference and Mass Assignment vulnerabilities where user-supplied identifiers access resources without ownership checks or request bodies bind directly to data models without field allowlists.
parents:
  - index.md
covers:
  - User-supplied IDs used to query resources without verifying caller ownership
  - Sequential or predictable IDs exposed in API responses enabling enumeration
  - Mass assignment accepting all request body fields into ORM model updates
  - Rails strong parameters missing or overly permissive permit calls
  - Django form or serializer accepting unintended fields from request data
  - Express request body parsed directly into database update operations
  - GraphQL mutations accepting arbitrary input fields mapped to model attributes
  - "BOLA — accessing /api/resource/{id} with another user's identifier"
  - "Nested object IDs not validated for ownership (e.g., /users/{uid}/orders/{oid})"
  - Batch or bulk endpoints applying operations across IDs without per-item authorization
  - "Admin-only fields (role, is_admin, verified) settable through regular user endpoints"
  - ORM update_all or upsert with unfiltered user-supplied attributes
tags:
  - idor
  - bola
  - mass-assignment
  - access-control
  - authorization
  - CWE-639
  - CWE-915
  - CWE-284
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
    - "**/*.py"
    - "**/*.rb"
    - "**/*.php"
    - "**/*.java"
    - "**/*.go"
    - "**/*.cs"
    - "**/*.graphql"
    - "**/*.gql"
    - "**/controllers/**"
    - "**/routes/**"
    - "**/handlers/**"
    - "**/serializers/**"
    - "**/views/**"
  keyword_matches:
    - id
    - ID
    - userId
    - user_id
    - findById
    - findOne
    - params
    - permit
    - attr_accessible
    - mass_assign
    - fill
    - update
    - body
    - req.body
    - request.data
    - from_dict
    - "**kwargs"
    - setattr
  structural_signals:
    - Database query with user-supplied ID in route handler
    - "ORM create/update with request body as input"
    - API endpoint with path parameter ID
source:
  origin: file
  path: sec-idor-and-mass-assignment.md
  hash: "sha256:8fb0ae8d4b5492edb3a063897ab584c9eaf0c48fd364f5c926feb58dc26afedd"
---
# Insecure Direct Object Reference and Mass Assignment (CWE-639, CWE-915, CWE-284)

## When This Activates

Activates when diffs modify API endpoint handlers, database query logic, ORM model operations, request body parsing, or authorization middleware. IDOR allows attackers to access or modify resources belonging to other users by manipulating object identifiers. Mass assignment allows attackers to set privileged fields (role, balance, permissions) by including extra attributes in request payloads that the server blindly applies to data models.

## Audit Surface

- [ ] Database query using user-supplied ID without ownership or tenant scoping
- [ ] findById, findOne, get_object_or_404, or equivalent with ID from URL path or query param
- [ ] API endpoint pattern /resource/{id} without authorization middleware checking ownership
- [ ] Sequential integer IDs exposed in API responses or URLs
- [ ] ORM create or update call receiving request body without explicit field allowlist
- [ ] Rails controller missing strong params (require/permit) or permit with overly broad fields
- [ ] Django ModelForm or ModelSerializer without explicit fields list (fields = '__all__')
- [ ] Express/Fastify handler passing req.body directly to Model.create() or Model.update()
- [ ] Python **kwargs or setattr used to apply user-supplied dictionary to model
- [ ] GraphQL input type mapping directly to database model columns
- [ ] Batch endpoint accepting array of IDs without per-ID authorization check
- [ ] Nested resource endpoint not validating parent-child relationship
- [ ] Admin-only attributes (role, is_admin, balance, verified) present in writable input schema
- [ ] ORM update query with user-supplied column-value pairs (e.g., Model.update(req.body))
- [ ] PATCH endpoint applying partial update from request body without field filtering
- [ ] File or resource download endpoint accepting path or key from user without scoping

## Detailed Checks

### Object Reference Authorization (IDOR/BOLA)
<!-- activation: keywords=["findById", "findOne", "get_object_or_404", "findByPk", "Model.find", "getOne", "params.id", "req.params", "path_param", "@PathVariable", "ctx.params"] -->

- [ ] __Ownership verification__: every database lookup by user-supplied ID must include an ownership or tenant-scoping predicate -- `Model.findById(req.params.id)` without `WHERE user_id = current_user.id` is IDOR
- [ ] __Framework-specific patterns__: Rails `Model.find(params[:id])` vs `current_user.models.find(params[:id])`; Django `Model.objects.get(id=id)` vs `Model.objects.get(id=id, user=request.user)`; Express with Mongoose `Model.findById(id)` vs `Model.findOne({_id: id, user: req.user._id})`
- [ ] __Nested resource validation__: `/users/{uid}/orders/{oid}` must verify that `oid` belongs to `uid` AND that `uid` matches the authenticated user -- skipping the parent-child relationship check allows accessing any order by ID
- [ ] __Authorization middleware vs inline check__: prefer middleware or decorators (`@permission_required`, `authorize!`) that enforce ownership before the handler executes; inline checks inside handlers are easy to forget on new endpoints
- [ ] __Horizontal vs vertical escalation__: horizontal IDOR accesses another user's resources of the same type; vertical IDOR accesses resources of a higher privilege level (admin panels, internal APIs) -- both require detection

### Predictable and Enumerable Identifiers
<!-- activation: keywords=["id", "uuid", "sequential", "auto_increment", "serial", "SERIAL", "INTEGER", "int", "slug"] -->

- [ ] __Sequential integer IDs__: auto-incrementing integer primary keys exposed in URLs (`/api/invoices/1042`) allow trivial enumeration; verify that endpoints either use UUIDs or enforce authorization so enumeration yields only the caller's resources
- [ ] __ID exposure in responses__: API responses that include IDs of related resources (e.g., `"assigned_to": 42`) may leak identifiers that enable IDOR on other endpoints
- [ ] __Timing side-channels__: endpoints that return 403 for existing resources and 404 for non-existent ones leak resource existence; consider returning uniform 404 for both unauthorized and missing resources
- [ ] __UUIDs are not authorization__: using UUIDv4 for identifiers adds obscurity but is not a substitute for authorization checks -- leaked or logged UUIDs still enable IDOR

### Mass Assignment — ORM and Framework Patterns
<!-- activation: keywords=["create", "update", "save", "build", "new", "assign", "fill", "from_dict", "from_json", "merge", "permit", "attr_accessible", "fields", "exclude", "req.body", "request.data", "**kwargs", "setattr"] -->

- [ ] __Direct body-to-model binding__: `Model.create(req.body)` (Sequelize/Mongoose), `Model.objects.create(**request.data)` (Django), `Model.new(params)` (Rails without strong params), `model.fill(request()->all())` (Laravel) accept every field the client sends -- an attacker can include `role: "admin"` or `is_verified: true`
- [ ] __Rails strong parameters__: verify every controller action uses `params.require(:model).permit(:field1, :field2)` with an explicit allowlist; `params.permit!` or `.permit(:all)` disables protection
- [ ] __Django ModelSerializer fields__: `fields = '__all__'` or missing `fields` / `read_only_fields` on a ModelSerializer exposes every model column to write; use explicit field lists and `read_only_fields` for computed/privileged attributes
- [ ] __Express/Node patterns__: Mongoose `Model.findByIdAndUpdate(id, req.body)` or Sequelize `instance.update(req.body)` without selecting allowed keys first
- [ ] **Python __kwargs and setattr__: `for k, v in data.items(): setattr(model, k, v)` applies arbitrary attributes; verify `data` is filtered against an allowlist before the loop
- [ ] __GraphQL input types__: GraphQL mutations that map input types directly to database columns without excluding privileged fields (role, permissions, internal_status) are mass-assignment vectors

### Privileged Field Protection
<!-- activation: keywords=["role", "admin", "is_admin", "permissions", "verified", "balance", "credit", "status", "approved", "active", "deleted", "tenant_id", "org_id"] -->

- [ ] __Admin-only fields__: fields like `role`, `is_admin`, `permissions`, `verified`, `balance`, `credit`, `approved`, `tenant_id` must never be writable through regular user-facing endpoints -- verify they are excluded from input schemas or marked read-only
- [ ] __Separate admin endpoints__: operations that modify privileged fields should use distinct endpoints with admin authorization middleware, not share the same update endpoint as regular users
- [ ] __Hidden field mutation__: even if the UI does not display a field, an attacker can add it to the request body; server-side allowlisting is the only reliable defense
- [ ] __Nested object privilege escalation__: mass assignment on nested objects (`user.address.verified = true`) can bypass top-level field filtering if the ORM supports nested attribute assignment

### Batch and Bulk Operation Authorization
<!-- activation: keywords=["batch", "bulk", "many", "all", "ids", "array", "list", "forEach", "map", "Promise.all", "in_bulk", "whereIn"] -->

- [ ] __Per-item authorization__: batch endpoints like `POST /api/orders/batch-cancel` accepting `{ ids: [1, 2, 3] }` must verify ownership of EVERY ID, not just that the user is authenticated
- [ ] __Bulk update operations__: `Model.update({status: 'cancelled'}, {where: {id: req.body.ids}})` without adding `AND user_id = current_user.id` allows cancelling other users' orders
- [ ] __Export and reporting endpoints__: bulk data export (`GET /api/users/export?ids=1,2,3`) must scope to the caller's authorized resources
- [ ] __Pagination and listing endpoints__: `GET /api/orders?user_id=42` must verify that `user_id` matches the authenticated user or that the caller has admin privileges

### File and Resource Access by Reference
<!-- activation: keywords=["file", "download", "upload", "key", "path", "s3", "blob", "attachment", "document", "asset"] -->

- [ ] __File download by ID or key__: `GET /api/files/{fileId}` or `GET /api/files?key=uploads/user42/doc.pdf` must verify the caller has access to the referenced file
- [ ] __S3 pre-signed URL generation__: generating pre-signed URLs for user-supplied S3 keys without verifying the key belongs to the requesting user exposes any file in the bucket
- [ ] __Path traversal in file references__: user-supplied file paths or keys must be validated against traversal attacks (`../`, `..%2F`) in addition to ownership checks

## Common False Positives

- __Admin-only endpoints with proper authorization middleware__: endpoints behind admin authentication that query by arbitrary ID are expected behavior -- admin users legitimately access all resources.
- __Service-to-service calls with machine credentials__: internal APIs called by other services (not user-facing) may legitimately query by ID without per-user ownership checks, provided the calling service enforces authorization.
- __Public read-only resources__: endpoints serving public content (blog posts, product listings) queried by ID do not require ownership checks if the data is intentionally public.
- __UUIDs used as identifiers__: while UUIDs reduce enumeration risk, they are not a false positive for missing authorization -- flag them at lower severity but still note the missing ownership check.
- __Strong params with all necessary fields permitted__: `params.permit(:name, :email, :bio)` that explicitly lists only user-editable fields is correct usage, not mass assignment.

## Severity Guidance

| Finding | Severity |
|---|---|
| Database query by user-supplied ID without any ownership check on sensitive resource | Critical |
| ORM create/update with entire request body and no field allowlist, including privileged fields | Critical |
| Batch endpoint processing array of IDs without per-item authorization | Critical |
| Rails controller using params.permit! or missing strong params on state-changing action | Critical |
| Django ModelSerializer with fields = '__all__' including privileged model columns | Important |
| Sequential integer IDs exposed in API without authorization (enables enumeration) | Important |
| Nested resource endpoint not validating parent-child relationship | Important |
| PATCH endpoint applying partial update without field filtering | Important |
| GraphQL mutation input type mapped directly to model without excluding admin fields | Important |
| S3 pre-signed URL generated for user-supplied key without access validation | Important |
| UUIDs used as sole protection without ownership check (obscurity, not security) | Minor |
| Timing difference between 403 and 404 leaking resource existence | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- IDOR is the most common manifestation of broken access control
- `sec-owasp-a04-insecure-design` -- missing ownership checks reflect insecure design patterns
- `sec-owasp-a03-injection` -- mass assignment is a form of parameter injection into data models
- `sec-csrf` -- CSRF on IDOR-vulnerable endpoints compounds the impact
- `principle-fail-fast` -- reject unauthorized access at the earliest point in the request pipeline

## Authoritative References

- [CWE-639: Authorization Bypass Through User-Controlled Key](https://cwe.mitre.org/data/definitions/639.html)
- [CWE-915: Improperly Controlled Modification of Dynamically-Determined Object Attributes](https://cwe.mitre.org/data/definitions/915.html)
- [CWE-284: Improper Access Control](https://cwe.mitre.org/data/definitions/284.html)
- [OWASP API Security Top 10 - API1:2023 Broken Object Level Authorization](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
- [OWASP Mass Assignment Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Mass_Assignment_Cheat_Sheet.html)
- [OWASP Testing Guide - IDOR](https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/05-Authorization_Testing/04-Testing_for_Insecure_Direct_Object_References)
- [PortSwigger - Access Control Vulnerabilities](https://portswigger.net/web-security/access-control/idor)
