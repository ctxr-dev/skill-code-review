---
id: fw-django
type: primary
depth_role: leaf
focus: Detect Django framework-level pitfalls in security settings, middleware configuration, admin exposure, view permissions, file upload handling, and production hardening that cause vulnerabilities or deployment failures beyond ORM-specific issues.
parents:
  - index.md
covers:
  - DEBUG=True in production settings files
  - SECRET_KEY hardcoded or committed to version control
  - "Missing CSRF middleware or @csrf_exempt on state-changing views"
  - "Raw SQL via .extra()/.raw() with string interpolation in views"
  - Missing ALLOWED_HOSTS allowing host header injection
  - Admin site exposed without IP restriction or 2FA
  - Missing Content-Security-Policy header
  - "N+1 queries from missing select_related/prefetch_related in views"
  - "Model save() without full_clean() skipping validation"
  - Missing permissions on views or DRF viewsets
  - Unsafe file upload handling with MEDIA_ROOT inside web root
  - Missing SecurityMiddleware or SECURE_SSL_REDIRECT
  - "Settings not split by environment (dev/staging/prod)"
  - Missing SECURE_HSTS_SECONDS for HTTPS enforcement
tags:
  - django
  - python
  - security
  - middleware
  - admin
  - settings
  - csrf
  - permissions
  - file-upload
  - production-hardening
activation:
  file_globs:
    - "**/*.py"
    - "**/settings.py"
    - "**/urls.py"
    - "**/views.py"
    - "**/models.py"
    - "**/admin.py"
    - "**/manage.py"
  keyword_matches:
    - django
    - Django
    - from django
    - models.Model
    - views
    - urls
    - settings
    - INSTALLED_APPS
    - MIDDLEWARE
    - TEMPLATES
    - DATABASES
    - AUTH_USER_MODEL
  structural_signals:
    - Django settings module with INSTALLED_APPS
    - URL configuration with urlpatterns
    - Django admin site registration
source:
  origin: file
  path: fw-django.md
  hash: "sha256:a5c9ca9fd1b0b488b0678fa2154883b9aed9961442255bc1c1e8e3ec6ac008a7"
---
# Django Framework Reviewer

## When This Activates

Activates when diffs touch Django settings, URL configuration, views, models, admin, or management files. Django provides strong security defaults, but those defaults are routinely disabled during development and not re-enabled for production. `DEBUG=True` leaks stack traces, `ALLOWED_HOSTS = ['*']` enables host header injection, and the admin site at `/admin/` is a constant brute-force target. This reviewer focuses on framework-level configuration and view-layer pitfalls -- for ORM-specific query performance and raw SQL injection patterns, see `orm-django`.

## Audit Surface

- [ ] DEBUG = True in any settings file not clearly scoped to local development
- [ ] SECRET_KEY defined as a string literal in settings.py rather than read from environment
- [ ] MIDDLEWARE list missing django.middleware.csrf.CsrfViewMiddleware
- [ ] @csrf_exempt decorator on a view that modifies state (POST/PUT/DELETE)
- [ ] .raw() or .extra() in a view or serializer with f-string/format/% interpolation
- [ ] ALLOWED_HOSTS = [] or ALLOWED_HOSTS = ['*'] in production settings
- [ ] Admin site URL using default /admin/ path with no IP restriction or custom auth
- [ ] Missing django.middleware.security.SecurityMiddleware in MIDDLEWARE
- [ ] SECURE_SSL_REDIRECT = False or absent in production settings
- [ ] SECURE_HSTS_SECONDS = 0 or absent in production settings
- [ ] Views or DRF viewsets without permission_classes or @permission_required
- [ ] MEDIA_ROOT path inside the project directory served by the web server
- [ ] FileField or ImageField without file type and size validation
- [ ] Model.save() called in view/form logic without prior full_clean()
- [ ] Settings.py with no environment-based split (no django-environ, no separate files)
- [ ] SESSION_COOKIE_SECURE or CSRF_COOKIE_SECURE set to False in production
- [ ] TEMPLATES with string-based template rendering with user input

## Detailed Checks

### Production Settings Hardening
<!-- activation: keywords=["DEBUG", "SECRET_KEY", "ALLOWED_HOSTS", "SECURE_SSL_REDIRECT", "SECURE_HSTS_SECONDS", "SESSION_COOKIE_SECURE", "CSRF_COOKIE_SECURE", "settings", "environ", "os.getenv", "env("] -->

- [ ] **DEBUG=True in production**: flag `DEBUG = True` in any settings file that is not clearly named `local`, `dev`, or `development` -- DEBUG exposes full stack traces, SQL queries, and template context to any visitor; see `sec-owasp-a05-misconfiguration`
- [ ] **Hardcoded SECRET_KEY**: flag `SECRET_KEY = 'string-literal'` in any committed settings file -- the secret key signs sessions, CSRF tokens, and password reset links; read it from `os.environ` or `django-environ`
- [ ] **Empty ALLOWED_HOSTS**: flag `ALLOWED_HOSTS = []` or `ALLOWED_HOSTS = ['*']` -- empty ALLOWED_HOSTS only works when DEBUG=True; `['*']` allows host header injection attacks that poison cache keys and password reset emails
- [ ] **Missing SSL settings**: flag production settings without `SECURE_SSL_REDIRECT = True` and `SECURE_HSTS_SECONDS` set to at least 31536000 (one year) -- without these, HTTPS is not enforced and downgrade attacks succeed
- [ ] **Insecure cookies**: flag `SESSION_COOKIE_SECURE = False` or `CSRF_COOKIE_SECURE = False` in production -- cookies without the Secure flag are sent over plaintext HTTP
- [ ] **Settings not split**: flag a single `settings.py` serving all environments without any conditional logic or environment variable gating -- use separate files (base/dev/prod), `django-environ`, or `django-configurations` to prevent dev settings from reaching production

### CSRF Protection
<!-- activation: keywords=["csrf", "CsrfViewMiddleware", "csrf_exempt", "@csrf_exempt", "CSRF_COOKIE", "CSRF_TRUSTED_ORIGINS", "csrfmiddlewaretoken"] -->

- [ ] **Missing CSRF middleware**: flag MIDDLEWARE lists that do not include `django.middleware.csrf.CsrfViewMiddleware` -- CSRF protection is opt-out in Django; removing the middleware disables it globally; see `sec-csrf`
- [ ] **Blanket csrf_exempt**: flag `@csrf_exempt` on views that handle POST/PUT/DELETE from browser forms -- legitimate uses are limited to webhook receivers and API endpoints using token auth; browser-facing views need CSRF
- [ ] **Missing CSRF_TRUSTED_ORIGINS**: flag production settings without `CSRF_TRUSTED_ORIGINS` when using HTTPS -- Django 4.0+ requires this for CSRF validation with HTTPS origins
- [ ] **CSRF token not in AJAX setup**: flag JavaScript making POST requests to Django without including the CSRF token from the cookie or a meta tag -- Django rejects these requests with 403

### Admin Site Security
<!-- activation: keywords=["admin", "admin.site", "AdminSite", "admin.py", "register", "ModelAdmin", "/admin/", "admin.autodiscover"] -->

- [ ] **Default admin URL**: flag `path('admin/', admin.site.urls)` without any IP restriction, VPN requirement, or custom authentication (2FA, SSO) -- the default admin URL is the first target for brute-force attacks
- [ ] **Admin without 2FA**: flag admin configurations without `django-otp`, `django-two-factor-auth`, or equivalent 2FA package in INSTALLED_APPS -- admin accounts with only password auth are high-value targets
- [ ] **Unrestricted ModelAdmin**: flag `ModelAdmin` registrations without `readonly_fields` on sensitive fields or without overriding `has_delete_permission` on critical models -- admin users should follow least-privilege
- [ ] **Admin in production INSTALLED_APPS**: if the admin site is not used in production, flag `django.contrib.admin` still present in INSTALLED_APPS -- removing it eliminates the attack surface entirely

### View Permissions and Authorization
<!-- activation: keywords=["permission_required", "login_required", "permission_classes", "IsAuthenticated", "IsAdminUser", "DjangoModelPermissions", "AllowAny", "viewsets", "APIView", "View", "def get(", "def post("] -->

- [ ] **View without permissions**: flag class-based views or DRF viewsets without `permission_classes` and function-based views without `@login_required` or `@permission_required` -- unauthenticated access to data-modifying views is broken access control; see `sec-owasp-a01-broken-access-control`
- [ ] **AllowAny on sensitive endpoint**: flag `permission_classes = [AllowAny]` on viewsets that handle user data, payments, or admin actions -- AllowAny is appropriate only for public-read or authentication endpoints
- [ ] **Object-level permission missing**: flag DRF views that filter querysets by user but do not implement `get_object()` permission checks -- ID enumeration bypasses queryset filtering when `get_object()` fetches by PK directly
- [ ] **Missing @login_required on form views**: flag Django `FormView` or `CreateView` subclasses without `LoginRequiredMixin` or `@login_required` -- unauthenticated users can submit forms

### File Upload Safety
<!-- activation: keywords=["FileField", "ImageField", "MEDIA_ROOT", "MEDIA_URL", "upload_to", "InMemoryUploadedFile", "TemporaryUploadedFile", "ContentType", "request.FILES"] -->

- [ ] **MEDIA_ROOT in web root**: flag `MEDIA_ROOT` pointing to a directory inside the project tree that is served directly by nginx/Apache -- uploaded files become executable if the web server processes them; serve media from a separate domain or storage backend (S3, GCS)
- [ ] **No file type validation**: flag `FileField` or `ImageField` without `validators` restricting content type -- users can upload HTML, SVG (XSS vector), or executable files; validate using `FileExtensionValidator` and content-type sniffing
- [ ] **No file size limit**: flag file upload handling without `DATA_UPLOAD_MAX_MEMORY_SIZE` or custom size validation -- unlimited uploads enable denial-of-service
- [ ] **upload_to with user input**: flag `upload_to` callables that incorporate user-supplied filenames without sanitization -- path traversal attacks can overwrite arbitrary files; use UUID-based filenames

### Model Validation and save()
<!-- activation: keywords=["save(", "full_clean(", "clean(", "validate", "ModelForm", "serializer", "is_valid", "ValidationError"] -->

- [ ] **save() without full_clean()**: flag `model.save()` called outside of `ModelForm.is_valid()` or DRF `serializer.is_valid()` without a preceding `model.full_clean()` -- Django's `save()` does not run model validators by default; data bypassing form/serializer flows skips all validation
- [ ] **Overridden save() without super()**: flag `Model.save()` overrides that do not call `super().save(*args, **kwargs)` -- this silently prevents persistence or breaks update_fields optimization
- [ ] **Clean method with side effects**: flag `Model.clean()` methods that send emails, create related objects, or perform external API calls -- clean() can be called multiple times during validation; side effects belong in post-save signals or service layers

### Security Middleware and Headers
<!-- activation: keywords=["SecurityMiddleware", "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "SECURE_BROWSER_XSS_FILTER", "django-csp"] -->

- [ ] **Missing SecurityMiddleware**: flag MIDDLEWARE lists without `django.middleware.security.SecurityMiddleware` -- this middleware enables HSTS, SSL redirect, and other transport-layer protections
- [ ] **Missing CSP**: flag Django apps without `django-csp` or manual Content-Security-Policy header configuration -- CSP is the primary defense against XSS; Django does not set it by default
- [ ] **X_FRAME_OPTIONS not set**: flag settings without `X_FRAME_OPTIONS = 'DENY'` or `'SAMEORIGIN'` -- without this, the app is vulnerable to clickjacking; see `sec-clickjacking-and-headers`
- [ ] **Missing Referrer-Policy**: flag production settings without `SECURE_REFERRER_POLICY` -- the default leaks full URLs in the Referer header to third-party sites

## Common False Positives

- **DEBUG=True in local/dev settings**: `settings/local.py` or `settings/dev.py` with `DEBUG = True` is expected. Only flag when the file is named `settings.py`, `production.py`, `prod.py`, or is the sole settings file.
- **csrf_exempt on webhook views**: views receiving callbacks from Stripe, GitHub, or other external services legitimately use `@csrf_exempt` because they verify via HMAC signatures, not CSRF tokens.
- **AllowAny on auth endpoints**: login, registration, and password reset views correctly use `AllowAny`.
- **Admin in internal tools**: if the deployment is an internal admin tool, the admin site at `/admin/` with basic auth may be acceptable. Check for VPN or IP restriction in nginx/load balancer config.
- **MEDIA_ROOT with external storage**: when `DEFAULT_FILE_STORAGE` points to S3 or GCS, `MEDIA_ROOT` is unused for serving; do not flag.
- **save() in migrations**: `RunPython` data migrations calling `save()` without `full_clean()` is common and acceptable since the migration controls the data.

## Severity Guidance

| Finding | Severity |
|---|---|
| SECRET_KEY hardcoded in committed settings file | Critical |
| DEBUG = True in production settings | Critical |
| ALLOWED_HOSTS = [] or ['*'] in production | Critical |
| Missing CsrfViewMiddleware in MIDDLEWARE | Critical |
| .raw()/.extra() with string interpolation and user input | Critical |
| View/viewset without any permission check handling sensitive data | Critical |
| Admin site at /admin/ with no IP restriction or 2FA | Important |
| Missing SECURE_SSL_REDIRECT in production | Important |
| MEDIA_ROOT inside web-served project directory | Important |
| FileField without content-type validation | Important |
| save() without full_clean() outside form/serializer flow | Important |
| Missing Content-Security-Policy | Important |
| Settings not split by environment | Minor |
| Missing SECURE_HSTS_SECONDS | Minor |
| Missing SECURE_REFERRER_POLICY | Minor |

## See Also

- `orm-django` -- Django ORM-specific pitfalls: N+1, raw SQL injection, migration safety, queryset evaluation, signals
- `sec-owasp-a05-misconfiguration` -- DEBUG=True, ALLOWED_HOSTS, missing security headers are security misconfiguration
- `sec-owasp-a01-broken-access-control` -- missing view permissions and object-level authorization
- `sec-csrf` -- Django's CSRF middleware and token patterns
- `sec-xss-dom` -- template injection and Content-Security-Policy gaps
- `sec-owasp-a03-injection` -- raw SQL in views overlaps with ORM reviewer
- `principle-separation-of-concerns` -- settings split by environment is a configuration SoC discipline

## Authoritative References

- [Django Documentation -- Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
- [Django Documentation -- Security](https://docs.djangoproject.com/en/stable/topics/security/)
- [Django Documentation -- Settings](https://docs.djangoproject.com/en/stable/ref/settings/)
- [Django Documentation -- CSRF Protection](https://docs.djangoproject.com/en/stable/ref/csrf/)
- [Django Documentation -- File Uploads](https://docs.djangoproject.com/en/stable/topics/http/file-uploads/)
- [OWASP Django Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Django_Security_Cheat_Sheet.html)
