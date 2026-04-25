---
id: fw-angular
type: primary
depth_role: leaf
focus: Detect Angular-specific pitfalls in change detection, RxJS subscription management, template security, and module architecture.
parents:
  - index.md
covers:
  - RxJS subscriptions without unsubscribe causing memory leaks
  - Missing OnPush change detection strategy on presentational components
  - innerHTML binding without proper DomSanitizer handling
  - Large NgModules that should be split into feature modules
  - "Services provided at wrong scope (root vs component vs module)"
  - Nested subscribe calls instead of RxJS operator composition
  - Missing takeUntil or takeUntilDestroyed for subscription lifecycle
  - Components performing HTTP calls directly instead of delegating to services
  - Missing trackBy function on ngFor directives
  - Unnecessary change detection cycles from zone.js overhead
  - Inconsistent mixing of standalone components and NgModule declarations
  - Async pipe not used where it could replace manual subscriptions
tags:
  - angular
  - rxjs
  - change-detection
  - zonejs
  - typescript
  - frontend
  - spa
  - memory-leak
activation:
  file_globs:
    - "**/*.component.ts"
    - "**/*.module.ts"
    - "**/*.service.ts"
    - "**/angular.json"
  keyword_matches:
    - "@Component"
    - "@Injectable"
    - "@NgModule"
    - OnInit
    - OnDestroy
    - Observable
    - subscribe
    - pipe
    - async pipe
    - ChangeDetectionStrategy
    - ngOnInit
    - ngOnDestroy
    - RxJS
    - HttpClient
  structural_signals:
    - Angular component lifecycle hooks
    - RxJS operator chains with subscribe
    - NgModule declarations array
source:
  origin: file
  path: fw-angular.md
  hash: "sha256:3f5d5e67e344ba1cfdc0065e1b8edfae61d0971aa0f616bfa32825b52ac3277b"
---
# Angular Framework Reviewer

## When This Activates

Activates when diffs touch Angular component, module, or service files, or when Angular-specific decorators and lifecycle hooks appear in changed code. Angular's change detection system, RxJS-based reactivity model, and dependency injection hierarchy create unique categories of bugs -- memory leaks from unmanaged subscriptions, performance degradation from excessive change detection, and security vulnerabilities from template injection. This reviewer targets detection heuristics specific to Angular's architecture.

## Audit Surface

- [ ] subscribe() call without corresponding unsubscribe, takeUntil, or takeUntilDestroyed
- [ ] Component missing ChangeDetectionStrategy.OnPush when it only depends on @Input values
- [ ] [innerHTML] binding with bypassSecurityTrustHtml on unsanitized user input
- [ ] NgModule with more than 15 declarations indicating need for feature module split
- [ ] Service decorated with @Injectable but missing providedIn or provided at inconsistent scope
- [ ] Nested .subscribe() inside another .subscribe() callback
- [ ] Component class injecting HttpClient directly instead of a domain service
- [ ] ngFor without trackBy on lists that update frequently
- [ ] Event handler triggering synchronous state changes that cause redundant change detection
- [ ] Standalone component importing another standalone component that also declares in an NgModule
- [ ] Observable stored in component field but not piped through async pipe in template
- [ ] OnInit performing side effects that belong in a resolver or guard
- [ ] Manual DOM manipulation via ElementRef.nativeElement instead of Renderer2
- [ ] Barrel file re-exporting entire feature module defeating tree-shaking
- [ ] Route lazy loading using direct import instead of loadChildren with import()

## Detailed Checks

### Subscription Lifecycle and Memory Leaks
<!-- activation: keywords=["subscribe", "unsubscribe", "takeUntil", "takeUntilDestroyed", "Subscription", "add(", "ngOnDestroy", "DestroyRef"] -->

- [ ] **Unmanaged subscriptions**: flag every `.subscribe()` call in a component where there is no corresponding teardown -- acceptable teardown patterns are: `takeUntil(destroy$)` with a `Subject` completed in `ngOnDestroy`, `takeUntilDestroyed()` (Angular 16+), storing the `Subscription` and calling `.unsubscribe()` in `ngOnDestroy`, or using the `async` pipe in the template instead
- [ ] **Missing ngOnDestroy**: flag components with `.subscribe()` calls that do not implement `OnDestroy` -- even if the component is short-lived, navigation away leaks the subscription
- [ ] **Subscription.add() chains**: flag `Subscription.add()` used to compose teardown when `takeUntil` or `takeUntilDestroyed` is cleaner and less error-prone
- [ ] **Async pipe preference**: flag cases where an Observable is subscribed in the component class and the result stored in a field for template binding -- the `async` pipe handles subscription and unsubscription automatically and triggers OnPush change detection correctly
- [ ] **Infinite Observables**: flag subscriptions to `interval()`, `timer()`, `fromEvent()`, or WebSocket streams without any completion or teardown mechanism

### Change Detection Performance
<!-- activation: keywords=["ChangeDetectionStrategy", "OnPush", "markForCheck", "detectChanges", "ChangeDetectorRef", "NgZone", "runOutsideAngular", "zone.js"] -->

- [ ] **Missing OnPush**: flag components whose template binds only to `@Input` properties and local state derived from inputs but uses the default change detection strategy -- OnPush avoids unnecessary re-renders
- [ ] **detectChanges() abuse**: flag manual `ChangeDetectorRef.detectChanges()` calls used to work around stale views -- this usually indicates a broken data flow; the fix is OnPush + async pipe or proper immutable inputs
- [ ] **Zone.js overhead**: flag event handlers (scroll, mousemove, resize, WebSocket messages) that trigger change detection on every event -- use `NgZone.runOutsideAngular()` for high-frequency events and manually call `markForCheck()` only when the view needs updating
- [ ] **Function calls in templates**: flag template expressions that call methods (e.g., `{{ getTotal() }}`) -- these re-execute on every change detection cycle; use a pure pipe or precomputed property instead

### Template Security
<!-- activation: keywords=["innerHTML", "bypassSecurityTrustHtml", "bypassSecurityTrustScript", "bypassSecurityTrustUrl", "bypassSecurityTrustResourceUrl", "DomSanitizer", "SafeHtml"] -->

- [ ] **bypassSecurityTrustHtml on user input**: flag calls to `DomSanitizer.bypassSecurityTrustHtml()` where the input traces to user-controlled data (form values, URL params, API responses containing user content) without prior sanitization via DOMPurify or equivalent
- [ ] **Multiple bypass calls**: flag components using more than one `bypassSecurityTrust*` method -- this suggests systematic sanitization is needed at a service layer rather than ad-hoc bypasses
- [ ] **[innerHTML] without bypass**: Angular sanitizes `[innerHTML]` by default, but if a developer sees stripped content and adds a bypass to "fix" it, verify the content source is trusted
- [ ] **bypassSecurityTrustUrl with user-provided URLs**: flag trust bypass on URLs without scheme validation -- `javascript:` and `data:` schemes remain dangerous

### Module Architecture and Lazy Loading
<!-- activation: keywords=["@NgModule", "declarations", "imports", "loadChildren", "standalone", "importProvidersFrom", "bootstrapApplication"] -->

- [ ] **Oversized NgModules**: flag NgModule `declarations` arrays with more than 15 components/directives/pipes -- split into cohesive feature modules for better lazy-load boundaries and developer navigation
- [ ] **Eager route loading**: flag route configurations using direct component references instead of `loadChildren: () => import('./feature/feature.module')` for feature routes -- eager loading increases initial bundle size
- [ ] **Standalone/NgModule inconsistency**: flag components marked `standalone: true` that are also listed in an NgModule's `declarations` -- this is a compile error in Angular 15+ and a migration smell
- [ ] **Barrel re-exports defeating tree-shaking**: flag `index.ts` files that re-export everything from a feature module when only a subset is used by consumers -- bundlers may retain the full module

### Dependency Injection Scope
<!-- activation: keywords=["@Injectable", "providedIn", "providers", "useClass", "useFactory", "useValue", "useExisting", "forRoot", "forChild"] -->

- [ ] **Missing providedIn**: flag `@Injectable()` without `providedIn: 'root'` and no explicit module/component provider -- the service is not injectable anywhere and will throw at runtime
- [ ] **Singleton in component providers**: flag stateful services listed in a component's `providers` array -- each component instance gets a separate service instance, which may cause state divergence when a singleton is expected
- [ ] **forRoot/forChild misuse**: flag `forRoot()` called in a lazy-loaded feature module -- this creates a second instance of the service, breaking the singleton contract; use `forChild()` in feature modules
- [ ] **Service with side effects in constructor**: flag services that perform HTTP calls or start subscriptions in their constructor -- construction order is not guaranteed in DI; use initialization methods or APP_INITIALIZER

### RxJS Anti-Patterns
<!-- activation: keywords=["switchMap", "mergeMap", "concatMap", "exhaustMap", "combineLatest", "forkJoin", "tap", "map", "filter", "pipe("] -->

- [ ] **Nested subscribes**: flag `.subscribe()` callbacks that call `.subscribe()` on another Observable -- use `switchMap`, `mergeMap`, `concatMap`, or `exhaustMap` to flatten the chain
- [ ] **Wrong flattening operator**: flag `mergeMap` used for search/autocomplete (should be `switchMap` to cancel stale requests) or `switchMap` used for write operations (should be `concatMap` or `exhaustMap` to avoid dropped writes)
- [ ] **combineLatest with single source**: flag `combineLatest([single$])` -- this adds complexity with no benefit; use the Observable directly
- [ ] **Missing error handling**: flag Observable chains with no `catchError` operator and no error callback in `.subscribe()` -- unhandled errors terminate the Observable and silently break the feature

## Common False Positives

- **Router or ActivatedRoute subscriptions in routed components**: Angular automatically cleans up `ActivatedRoute` observables when the routed component is destroyed. Manual unsubscription is unnecessary for `params`, `queryParams`, and `data` observables on routed components.
- **HTTP observables**: `HttpClient` methods (`get`, `post`, etc.) emit once and complete -- they do not leak. However, if the component is destroyed before the response arrives, the callback still executes; `takeUntil` is still recommended to prevent stale side effects.
- **OnPush on container components**: Components that orchestrate child components and pass Observables via async pipe may legitimately use default change detection if they manage complex internal state. OnPush is a recommendation, not a hard rule.
- **Function calls in templates with OnPush**: under OnPush, template functions only re-execute when inputs change or an Observable emits -- the performance impact is smaller than with default change detection.

## Severity Guidance

| Finding | Severity |
|---|---|
| bypassSecurityTrustHtml on user-controlled input without DOMPurify | Critical |
| subscribe() in component with no unsubscribe path (memory leak) | Critical |
| Nested subscribe() calls (correctness risk from race conditions) | Important |
| Missing OnPush on pure presentational component in performance-sensitive view | Important |
| HttpClient injected directly in component instead of service | Important |
| NgModule with 20+ declarations, no feature module split | Important |
| forRoot() called in lazy-loaded module (duplicate singleton) | Important |
| ngFor without trackBy on frequently updating list | Minor |
| Function call in template expression under default change detection | Minor |
| Barrel re-export of entire feature module | Minor |

## See Also

- `fw-react` -- React counterpart; compare subscription cleanup (useEffect return) with Angular's OnDestroy pattern
- `fw-nextjs` -- Next.js covers SSR hydration pitfalls that parallel Angular Universal concerns
- `sec-xss-dom` -- Angular's [innerHTML] and DomSanitizer bypass patterns are a subset of DOM XSS sinks
- `perf-startup-cold-start` -- large NgModules and eager loading inflate Angular application startup time
- `principle-separation-of-concerns` -- components doing HTTP calls directly violate SoC; delegate to services

## Authoritative References

- [Angular Documentation -- Change Detection](https://angular.dev/guide/change-detection)
- [Angular Documentation -- Security (Sanitization)](https://angular.dev/guide/security)
- [Angular Documentation -- Dependency Injection](https://angular.dev/guide/di)
- [RxJS Documentation -- Operators](https://rxjs.dev/guide/operators)
- [Angular University -- RxJS Anti-Patterns](https://blog.angular-university.io/rxjs-error-handling/)
- [Netanel Basal -- takeUntilDestroyed in Angular 16](https://netbasal.com/getting-to-know-the-takeuntildestroyed-operator-in-angular-bf175af0e6b4)
