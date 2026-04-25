---
id: lang-objective-c
type: primary
depth_role: leaf
focus: Objective-C correctness, ARC memory management, Apple framework idioms, and modern syntax adoption
parents:
  - index.md
covers:
  - ARC ownership qualifiers and retain cycle prevention
  - "Property attributes — atomic/nonatomic, strong/weak/copy semantics"
  - Block capture semantics and retain cycle breaking patterns
  - "KVO/KVC correctness and observation lifecycle"
  - Category method collision avoidance
  - "Modern Objective-C syntax adoption (literals, subscripting, generics)"
  - Nullability annotations on public API boundaries
  - Lightweight generics for collection type safety
  - Toll-free bridging and Core Foundation memory rules
  - NSError out-parameter conventions
tags:
  - objective-c
  - objc
  - ios
  - macos
  - apple
  - arc
  - memory-management
  - cocoa
activation:
  file_globs:
    - "**/*.m"
    - "**/*.mm"
    - "**/*.h"
  structural_signals:
    - "Objective-C source files, mixed Obj-C/C++ files, or headers with @interface"
source:
  origin: file
  path: lang-objective-c.md
  hash: "sha256:51ffb2bd46ba216810e5874f7bae08ab9c89450a026d94f7fc66f23f89733d27"
---
# Objective-C Quality Reviewer

## When This Activates

Activates when the diff contains `.m`, `.mm`, or `.h` files with Objective-C constructs (`@interface`, `@implementation`, `@protocol`). Applies ARC memory management rules by default. Covers both iOS and macOS Cocoa/Cocoa Touch patterns.

## Audit Surface

- [ ] No strong reference cycles — verify `weak`/`unsafe_unretained` on delegate properties, block captures, timers
- [ ] Block capture list uses weakSelf/strongSelf dance correctly
- [ ] Properties use correct attribute: `copy` for value-semantic types (NSString, NSArray, blocks), `weak` for delegates
- [ ] Nullability annotations (`nullable`/`nonnull`/`NS_ASSUME_NONNULL_BEGIN`) on all public headers
- [ ] Lightweight generics on collection properties and return types (`NSArray<NSString *> *`)
- [ ] KVO observers removed in `dealloc` or `invalidate` — no dangling observations
- [ ] NSError checked via return value, not error pointer being non-nil
- [ ] Category methods prefixed to avoid collision with Apple or third-party additions
- [ ] No C-string functions on NSString — use NSString API for Unicode correctness
- [ ] Designated initializer chain correct — `NS_DESIGNATED_INITIALIZER` marked
- [ ] Thread-safe property access — `atomic` only where needed, dispatch queues for compound state
- [ ] Toll-free bridged CF objects use `__bridge`/`__bridge_transfer` correctly under ARC
- [ ] Modern literal syntax (`@[]`, `@{}`, `@YES`) used instead of factory methods
- [ ] No exceptions for flow control — NSError for recoverable errors

## Detailed Checks

### ARC and Ownership
<!-- activation: keywords=["strong", "weak", "retain", "release", "autorelease", "dealloc", "__bridge"] -->

- [ ] No manual `retain`/`release`/`autorelease` calls under ARC
- [ ] `__strong` is implicit default — only annotate when clarifying intent in ambiguous contexts
- [ ] `__weak` used for back-references (delegates, parent pointers) to break cycles
- [ ] `__unsafe_unretained` only where `__weak` is unavailable (C struct members) — documented
- [ ] No `assign` on object properties under ARC — use `weak` for non-owning, `strong` for owning
- [ ] `IBOutlet` properties are `weak` (subviews owned by superview) unless top-level nib objects
- [ ] Toll-free bridging: `__bridge` for no ownership change, `__bridge_transfer` to take ARC ownership, `__bridge_retained` to give CF ownership
- [ ] CF objects obtained via Create/Copy Rule freed with `CFRelease` or transferred to ARC
- [ ] `dealloc` only used for removing observers, invalidating timers, releasing CF objects — no `[super dealloc]` under ARC
- [ ] Autorelease pool blocks (`@autoreleasepool`) used in tight loops creating many temporary objects

### Block Capture and Retain Cycles
<!-- activation: keywords=["block", "^", "weakSelf", "strongSelf", "copy", "completion"] -->

- [ ] Blocks capturing `self` use the weak-strong dance: `__weak typeof(self) weakSelf = self;` outside, `__strong typeof(weakSelf) strongSelf = weakSelf;` inside
- [ ] Completion handler blocks not retained by the object that calls them — set to nil after invocation
- [ ] Block-typed properties declared with `copy` attribute (blocks start on stack, must be copied to heap)
- [ ] No capturing `self->_ivar` in blocks without `self` — this is an implicit strong capture of `self`
- [ ] `NSTimer` targets broken via proxy or invalidation — timers retain their target
- [ ] `NSNotificationCenter` block-based observation stores the returned token and removes on dealloc
- [ ] No strong reference to `self` inside block stored as instance variable on `self`
- [ ] Dispatch blocks dispatched to `self`'s queue do not cause deadlock on synchronous dispatch

### Properties and Accessors
<!-- activation: keywords=["@property", "nonatomic", "atomic", "copy", "strong", "weak", "readonly"] -->

- [ ] `NSString`, `NSArray`, `NSDictionary`, block properties use `copy` to prevent mutation by caller
- [ ] Delegate properties are `weak` to avoid retain cycles
- [ ] `nonatomic` used by default — `atomic` only where thread safety of individual property access needed
- [ ] `readonly` in public header, `readwrite` in class extension for implementation-private mutability
- [ ] `class` properties (`@property (class)`) backed by explicit getter (no auto-synthesis)
- [ ] No property name collisions with NSObject methods (`description`, `hash`, `class`)
- [ ] Direct property access (`_ivar`) used in `init` and `dealloc`, synthesized accessors elsewhere
- [ ] `NS_ASSUME_NONNULL_BEGIN`/`END` wrapping headers with individual `nullable` annotations on optional params

### KVO, KVC, and Notification Patterns
<!-- activation: keywords=["addObserver", "observeValueForKeyPath", "KVO", "KVC", "NSNotification", "willChange", "didChange"] -->

- [ ] Every `addObserver:forKeyPath:` paired with `removeObserver:forKeyPath:` before dealloc
- [ ] KVO observation uses `context` pointer (unique static variable) to avoid superclass collision
- [ ] Manual KVO notifications (`willChangeValueForKey:`/`didChangeValueForKey:`) bracket actual mutation
- [ ] `+automaticallyNotifiesObserversForKey:` returns NO only when manual notification implemented
- [ ] `NSNotificationCenter` observers removed — block-based API returns token to remove
- [ ] KVC-compliant accessors follow naming conventions (`setFoo:`, `foo`, `countOfFoo`, `objectInFooAtIndex:`)
- [ ] No KVC access to private properties of framework classes — API contract can change

### Categories and Extensions
<!-- activation: keywords=["@interface.*\\(", "category", "extension"] -->

- [ ] Category method names prefixed with project prefix (`xyz_methodName`) to avoid collision
- [ ] No property storage in categories — use associated objects if needed, with documented memory policy
- [ ] Associated objects use correct policy: `OBJC_ASSOCIATION_RETAIN_NONATOMIC` for strong, `OBJC_ASSOCIATION_COPY` for value types
- [ ] Class extensions (anonymous categories) used for private interface, not categories on own class
- [ ] Category on framework class does not override existing methods — undefined which implementation wins
- [ ] `+load` and `+initialize` methods used carefully — `+load` for swizzling only, `+initialize` with dispatch_once guard

### Modern Syntax and API Adoption
<!-- activation: keywords=["@[]", "@{}", "@(", "NS_ENUM", "NS_OPTIONS", "instancetype", "generics"] -->

- [ ] Container literals used: `@[]`, `@{}`, `@()` instead of `arrayWithObjects:`, `dictionaryWithObjectsAndKeys:`
- [ ] Subscript notation: `array[0]`, `dict[@"key"]` instead of `objectAtIndex:`, `objectForKey:`
- [ ] `NS_ENUM`/`NS_OPTIONS` macros for enumerations — not bare `enum`
- [ ] `instancetype` on init and factory methods — not `id`
- [ ] Lightweight generics: `NSArray<NSString *> *`, `NSDictionary<NSString *, id> *`
- [ ] `NS_DESIGNATED_INITIALIZER` on the primary init method
- [ ] `NS_UNAVAILABLE` on inherited initializers that should not be called
- [ ] `API_AVAILABLE`/`API_UNAVAILABLE` annotations for platform version checks

### Error Handling and Safety
<!-- activation: keywords=["NSError", "NSException", "@try", "@catch", "NSAssert"] -->

- [ ] Recoverable errors use `NSError` out-parameter — return value checked first (`nil`/`NO`), then inspect error
- [ ] `NSError **` parameter is `nullable` — caller may pass `NULL` if they don't want the error
- [ ] `@try`/`@catch` used only for truly exceptional conditions (framework exceptions, not business logic)
- [ ] `NSAssert` used only for programmer errors (precondition violations) — not user-facing errors
- [ ] No `@throw` for recoverable errors — Objective-C exceptions are not unwind-safe under ARC in all cases
- [ ] Error domains are reverse-DNS strings; error codes are `NS_ENUM` typed
- [ ] `NSError` `userInfo` includes `NSLocalizedDescriptionKey` for user-visible messages

### Thread Safety
<!-- activation: keywords=["dispatch_", "NSLock", "@synchronized", "atomic", "NSOperation", "GCD"] -->

- [ ] Mutable state accessed from multiple queues protected by serial queue or lock
- [ ] No `@synchronized(self)` in performance-sensitive paths — use `os_unfair_lock` or `dispatch_queue`
- [ ] `dispatch_sync` on current queue causes deadlock — verify queue identity before sync dispatch
- [ ] `NSMutableArray`/`NSMutableDictionary` never accessed concurrently without synchronization
- [ ] UI updates always dispatched to main queue — `dispatch_async(dispatch_get_main_queue(), ^{...})`
- [ ] `NSOperation` dependencies do not form cycles — check `addDependency:` graph
- [ ] Barrier blocks used with concurrent queues for read-write synchronization

## Common False Positives

- **`atomic` property without locks** — `atomic` is correct for single-property read/write consistency on non-performance-critical paths; compound operations still need external synchronization
- **`strong` IBOutlet on top-level nib objects** — top-level objects in a nib need `strong` because no superview owns them
- **Direct ivar access in `init`** — accessing `_ivar` directly in `init` and `dealloc` is correct practice to avoid triggering KVO or subclass overrides
- **`assign` on primitive properties** — `assign` is correct for non-object types (`int`, `CGFloat`, `BOOL`)
- **`id` return type on delegate methods** — delegate methods often return `id` by convention; this is not a missing type annotation

## Severity Guidance

| Finding | Severity |
|---------|----------|
| Strong reference cycle (retain cycle) | Critical |
| Missing KVO observer removal — crash on dealloc | Critical |
| `__bridge_transfer` / `__bridge_retained` used incorrectly — leak or double-free | Critical |
| Checking NSError pointer instead of return value | Important |
| Missing `copy` on NSString/block property | Important |
| Category method without prefix — collision risk | Important |
| Missing nullability annotations on public header | Important |
| Manual retain/release under ARC | Important |
| Missing `@autoreleasepool` in tight loop | Minor |
| Factory method not returning `instancetype` | Minor |
| Old literal syntax (`[NSArray arrayWithObjects:]`) | Minor |
| `atomic` where `nonatomic` would suffice | Minor |

## See Also

- `language-quality` — universal type-system and resource checks
- `lang-cpp` — for Objective-C++ (.mm) files with C++ interop
- `security` — injection and data validation concerns
- `concurrency-async` — cross-language concurrency patterns

## Authoritative References

- [Clang ARC Documentation](https://clang.llvm.org/docs/AutomaticReferenceCounting.html)
- [Apple — Advanced Memory Management](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/MemoryMgmt/Articles/MemoryMgmt.html)
- [Apple — Key-Value Observing Guide](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/KeyValueObserving/KeyValueObserving.html)
- [Apple — Adopting Modern Objective-C](https://developer.apple.com/library/archive/releasenotes/ObjectiveC/ModernizationObjC/AdoptingModernObjective-C/AdoptingModernObjective-C.html)
- [Apple — Concurrency Programming Guide](https://developer.apple.com/library/archive/documentation/General/Conceptual/ConcurrencyProgrammingGuide/Introduction/Introduction.html)
- [CERT Objective-C Coding Guidelines](https://wiki.sei.cmu.edu/confluence/display/c/SEI+CERT+C+Coding+Standard)
