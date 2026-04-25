---
id: fw-aspnetcore-blazor
type: primary
depth_role: leaf
focus: Detect ASP.NET Core and Blazor pitfalls including missing authorization attributes, input validation gaps, Blazor Server circuit state leaks, IJSRuntime XSS, anti-forgery token omissions, CORS misconfiguration, connection string exposure, and missing exception handling middleware that cause vulnerabilities or production failures.
parents:
  - index.md
covers:
  - "Missing [Authorize] attribute on controllers or minimal API endpoints"
  - "[AllowAnonymous] applied too broadly on controllers with sensitive actions"
  - Missing input validation via ModelState, FluentValidation, or data annotations
  - Blazor Server circuit state shared or leaked between user sessions
  - IJSRuntime.InvokeAsync passing user data to JavaScript without sanitization
  - Missing anti-forgery token validation on form POST endpoints
  - CORS policy with AllowAnyOrigin combined with AllowCredentials
  - Missing rate limiting middleware on authentication endpoints
  - Connection string with credentials in appsettings.json committed to VCS
  - Blazor WASM assembly exposing secrets, API keys, or internal logic
  - Missing UseExceptionHandler or exception-handling middleware in pipeline
  - Kestrel exposed directly to the internet without a reverse proxy
  - Missing HTTPS redirection middleware in production
  - Over-injection in controllers or Blazor components via constructor bloat
tags:
  - aspnetcore
  - blazor
  - csharp
  - dotnet
  - security
  - authorization
  - validation
  - cors
  - middleware
  - xss
  - anti-forgery
  - kestrel
activation:
  file_globs:
    - "**/*.cs"
    - "**/*.cshtml"
    - "**/*.razor"
    - "**/*.csproj"
  keyword_matches:
    - ASP.NET
    - aspnetcore
    - WebApplication
    - IServiceCollection
    - AddControllers
    - MapGet
    - MapPost
    - Authorize
    - "[ApiController]"
    - Blazor
    - "@page"
    - "@inject"
    - IJSRuntime
    - NavigationManager
  structural_signals:
    - ASP.NET Core Program.cs with middleware pipeline
    - "Blazor component with @page directive"
    - Controller class with action methods
source:
  origin: file
  path: fw-aspnetcore-blazor.md
  hash: "sha256:33ca4958f2debdcd5621bc34445e6dc4f449dbd692d3274e61b180c169027b90"
---
# ASP.NET Core / Blazor Framework Reviewer

## When This Activates

Activates when diffs touch ASP.NET Core controllers, minimal API endpoints, Blazor components, middleware pipeline configuration, or application settings. ASP.NET Core provides strong defaults -- the `[ApiController]` attribute enables automatic model validation, Razor views auto-encode output, and the DI container manages service lifetimes. However, the framework does not force authorization: controllers without `[Authorize]` are publicly accessible, and Blazor Server's stateful circuit model creates unique pitfalls where user-specific state can leak between sessions through shared services. This reviewer detects authorization gaps, validation misses, Blazor-specific state issues, and production hardening failures.

## Audit Surface

- [ ] Controller class or minimal API endpoint group without [Authorize] attribute
- [ ] [AllowAnonymous] on a controller class where individual actions handle sensitive data
- [ ] Controller action accepting model without ModelState.IsValid check or [ApiController] attribute
- [ ] Blazor Server component storing user-specific state in a static field or singleton service
- [ ] IJSRuntime.InvokeAsync passing unsanitized user input as a JavaScript argument
- [ ] Form POST handler without [ValidateAntiForgeryToken] and no global filter
- [ ] CORS policy calling AllowAnyOrigin().AllowCredentials()
- [ ] No AddRateLimiter() or UseRateLimiter() in the middleware pipeline
- [ ] appsettings.json with connection string containing Password= tracked in git
- [ ] Blazor WASM project referencing secrets in client-side code
- [ ] Middleware pipeline without app.UseExceptionHandler() before routing
- [ ] Kestrel binding to 0.0.0.0 without documented reverse proxy
- [ ] Missing app.UseHttpsRedirection() in the middleware pipeline
- [ ] Constructor with more than 5 injected dependencies
- [ ] Blazor component using @inject for services holding mutable cross-user state
- [ ] Missing AddAuthentication/AddAuthorization in service registration

## Detailed Checks

### Authorization and Access Control
<!-- activation: keywords=["[Authorize]", "[AllowAnonymous]", "AddAuthorization", "AddAuthentication", "UseAuthentication", "UseAuthorization", "Policy", "RequireAuthorization", "AuthorizeAttribute", "ClaimsPrincipal", "User.Identity"] -->

- [ ] **Missing [Authorize]**: flag controller classes and minimal API endpoint groups that handle user data without `[Authorize]`, `[Authorize(Policy = "...")]`, or `RequireAuthorization()` -- ASP.NET Core endpoints are anonymous by default; every endpoint serving user-specific data needs explicit authorization; see `sec-owasp-a01-broken-access-control`
- [ ] **[AllowAnonymous] on controller class**: flag `[AllowAnonymous]` applied at the controller level when individual actions within that controller handle sensitive operations (edit, delete, payment) -- [AllowAnonymous] on the class overrides [Authorize] on individual actions in some configurations; apply it only to specific actions
- [ ] **Missing authorization service registration**: flag `Program.cs` that calls `UseAuthorization()` without a preceding `AddAuthorization()` in service configuration -- the middleware runs but no policies are registered, so all checks pass trivially
- [ ] **Policy-based auth with empty requirements**: flag authorization policies registered with `AddPolicy("Admin", policy => { })` that add no requirements -- the policy always succeeds; add `.RequireRole("Admin")` or `.RequireClaim()`

### Input Validation
<!-- activation: keywords=["ModelState", "[ApiController]", "FluentValidation", "DataAnnotations", "[Required]", "[StringLength]", "[Range]", "IsValid", "TryValidateModel", "BindProperty", "FromBody", "FromQuery"] -->

- [ ] **Missing ModelState validation**: flag controller actions that accept model parameters but do not check `ModelState.IsValid` and do not have the `[ApiController]` attribute (which auto-validates) -- invalid models are processed with default values, causing data corruption or logic errors; see `principle-fail-fast`
- [ ] **[ApiController] missing on API controllers**: flag API controllers returning JSON without the `[ApiController]` attribute -- this attribute enables automatic 400 responses for invalid models, source parameter binding inference, and `ProblemDetails` responses; without it, validation must be manual
- [ ] **Missing validation attributes on models**: flag request/command model classes used in `[FromBody]` or `[FromQuery]` parameters that have no `[Required]`, `[StringLength]`, `[Range]`, or FluentValidation validators -- unbounded string inputs enable denial-of-service; missing [Required] admits null/empty values
- [ ] **Blazor form without EditForm validation**: flag Blazor forms using `<EditForm>` without `DataAnnotationsValidator` or a FluentValidation equivalent -- form submissions skip all validation on the server side

### Blazor Server State and Security
<!-- activation: keywords=["@page", "@inject", "IJSRuntime", "InvokeAsync", "InvokeVoidAsync", "NavigationManager", "CascadingParameter", "AuthenticationStateProvider", "CircuitHandler", "static", "Singleton"] -->

- [ ] **Circuit state leaking between users**: flag Blazor Server components that store user-specific data in `static` fields, singleton-registered services, or `ConcurrentDictionary` keyed by something other than circuit/user ID -- Blazor Server runs on the server; singleton state is shared across all user circuits; use scoped services which are per-circuit
- [ ] **IJSRuntime XSS**: flag `IJSRuntime.InvokeAsync("eval", userInput)` or `InvokeVoidAsync("document.getElementById('x').innerHTML", userInput)` -- passing unsanitized user data to JavaScript execution functions enables XSS; sanitize or use Blazor's built-in rendering which auto-encodes; see `sec-xss-dom`
- [ ] **Blazor WASM exposing secrets**: flag Blazor WebAssembly projects that reference API keys, connection strings, or signing keys in `appsettings.json`, `wwwroot`, or C# code compiled to WASM -- the entire assembly is downloaded to the client's browser and can be decompiled; all secrets must live on the server behind API endpoints
- [ ] **Missing AuthenticationStateProvider check**: flag Blazor components that access user-specific data without checking `AuthenticationState` or using `[CascadingParameter] Task<AuthenticationState>` -- the component renders before auth state is available, potentially showing data for the wrong user

### Anti-Forgery and CSRF
<!-- activation: keywords=["ValidateAntiForgeryToken", "AntiForgery", "antiforgery", "@Html.AntiForgeryToken", "AddAntiforgery", "IAntiforgery", "csrf", "POST", "form"] -->

- [ ] **Missing anti-forgery on forms**: flag Razor Pages or MVC form POST handlers without `[ValidateAntiForgeryToken]` attribute and without a global anti-forgery filter in `MvcOptions` -- ASP.NET Core does not validate anti-forgery tokens by default on MVC controllers (Razor Pages do auto-validate); see `sec-csrf`
- [ ] **Missing token in form HTML**: flag `<form method="post">` in Razor views without `@Html.AntiForgeryToken()` or the `asp-antiforgery="true"` tag helper -- the server expects the token but the form does not send it, causing 400 errors
- [ ] **Anti-forgery disabled on sensitive endpoints**: flag `[IgnoreAntiforgeryToken]` on actions that modify user data from browser-submitted forms -- legitimate uses are limited to API endpoints with bearer token auth

### CORS and Security Middleware
<!-- activation: keywords=["AddCors", "UseCors", "AllowAnyOrigin", "AllowCredentials", "WithOrigins", "UseHttpsRedirection", "UseHsts", "UseExceptionHandler", "AddRateLimiter", "UseRateLimiter", "Kestrel"] -->

- [ ] **CORS wildcard with credentials**: flag `.AllowAnyOrigin().AllowCredentials()` or `.WithOrigins("*").AllowCredentials()` -- this is rejected at runtime by ASP.NET Core (throws InvalidOperationException) but signals dangerous intent; if the origin is dynamically set from the request header, it enables cross-origin attacks; see `sec-owasp-a05-misconfiguration`
- [ ] **Missing exception handling middleware**: flag middleware pipelines without `app.UseExceptionHandler("/error")` or a custom exception-handling middleware before routing -- unhandled exceptions return the developer exception page (if enabled) or a raw 500 with no body; the developer exception page leaks source code in production
- [ ] **Missing HTTPS redirection**: flag production middleware pipelines without `app.UseHttpsRedirection()` -- HTTP traffic exposes auth tokens, cookies, and request bodies in transit
- [ ] **Missing rate limiting**: flag applications with authentication endpoints but no `AddRateLimiter()` / `UseRateLimiter()` or equivalent middleware -- ASP.NET Core 7+ provides built-in rate limiting; without it, brute-force attacks are unchecked
- [ ] **Kestrel directly exposed**: flag `Program.cs` where Kestrel binds to `0.0.0.0` or a public port without evidence of a reverse proxy (nginx, YARP, IIS) -- Kestrel is not hardened for direct internet exposure; it lacks request filtering, connection limits, and SSL termination that reverse proxies provide

### Configuration and Secrets
<!-- activation: keywords=["appsettings", "ConnectionStrings", "Password=", "IConfiguration", "GetConnectionString", "UserSecrets", "AddUserSecrets", "Azure.Identity", "KeyVault", "IOptions"] -->

- [ ] **Connection string with credentials in config**: flag `appsettings.json` or `appsettings.Production.json` containing `Password=`, `Pwd=`, or `User ID=` in connection strings when the file is tracked in git -- use User Secrets for development, Azure Key Vault or environment variables for production
- [ ] **Secrets in appsettings**: flag API keys, SMTP passwords, JWT signing keys, or OAuth client secrets hardcoded in `appsettings.json` -- these files are committed to VCS; use `dotnet user-secrets`, Azure Key Vault, AWS Secrets Manager, or environment variables
- [ ] **Missing secret management**: flag applications that read secrets from `IConfiguration` without any secret provider (User Secrets, Key Vault, environment variables) in the host builder -- the only config source is the committed JSON file
- [ ] **Developer exception page in production**: flag `app.UseDeveloperExceptionPage()` without an environment check (`if (app.Environment.IsDevelopment())`) -- the developer exception page renders full stack traces, source code, and environment variables

## Common False Positives

- **[AllowAnonymous] on login/register endpoints**: authentication endpoints correctly allow anonymous access. Only flag when the controller also has sensitive actions.
- **Missing [Authorize] on health check endpoints**: `/health`, `/ready`, and `/metrics` endpoints are intentionally anonymous for monitoring infrastructure.
- **Kestrel in containerized deployments**: Kestrel behind a Kubernetes ingress controller or cloud load balancer is effectively behind a reverse proxy; check for ingress/service configuration.
- **appsettings.json with placeholder values**: `"ConnectionString": "Server=localhost;Database=dev;Trusted_Connection=true"` using Windows integrated auth has no password to leak.
- **Blazor WASM calling public APIs**: WASM code that calls publicly documented APIs (weather, maps) does not need to hide those API keys -- only flag keys that grant privileged access.
- **CORS on public APIs**: APIs designed for public consumption may correctly use `AllowAnyOrigin()` without credentials.

## Severity Guidance

| Finding | Severity |
|---|---|
| Connection string with credentials committed to VCS | Critical |
| Blazor WASM exposing secret API keys or signing keys | Critical |
| IJSRuntime.InvokeAsync("eval", userInput) (XSS) | Critical |
| CORS origin reflected from request header with credentials | Critical |
| Missing [Authorize] on endpoints handling sensitive user data | Critical |
| Developer exception page enabled in production | Critical |
| Missing anti-forgery validation on browser-facing form handlers | Important |
| Blazor Server circuit state leaking between users via singleton | Important |
| Missing ModelState validation without [ApiController] | Important |
| Missing rate limiting on authentication endpoints | Important |
| [AllowAnonymous] too broadly applied on mixed controllers | Important |
| Kestrel exposed directly without reverse proxy | Important |
| Missing UseExceptionHandler in middleware pipeline | Important |
| Secrets in appsettings.json without secret provider | Important |
| Missing HTTPS redirection middleware | Minor |
| Constructor with excessive dependency injection | Minor |
| Missing AddRateLimiter on non-auth endpoints | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- missing [Authorize], [AllowAnonymous] misuse, and authorization policy gaps
- `sec-owasp-a05-misconfiguration` -- CORS misconfiguration, developer exception page in production, Kestrel exposure
- `sec-xss-dom` -- IJSRuntime XSS and Blazor rendering safety
- `sec-csrf` -- anti-forgery token patterns in ASP.NET Core MVC and Razor Pages
- `sec-owasp-a03-injection` -- SQL injection via raw ADO.NET or Dapper with string interpolation
- `principle-fail-fast` -- validate at the controller boundary with DataAnnotations or FluentValidation

## Authoritative References

- [ASP.NET Core Documentation -- Security](https://learn.microsoft.com/en-us/aspnet/core/security/)
- [ASP.NET Core Documentation -- Authorization](https://learn.microsoft.com/en-us/aspnet/core/security/authorization/)
- [ASP.NET Core Documentation -- CORS](https://learn.microsoft.com/en-us/aspnet/core/security/cors)
- [Blazor Documentation -- Security](https://learn.microsoft.com/en-us/aspnet/core/blazor/security/)
- [ASP.NET Core Documentation -- Anti-Forgery](https://learn.microsoft.com/en-us/aspnet/core/security/anti-request-forgery)
- [ASP.NET Core Documentation -- Rate Limiting](https://learn.microsoft.com/en-us/aspnet/core/performance/rate-limit)
- [OWASP -- .NET Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DotNet_Security_Cheat_Sheet.html)
