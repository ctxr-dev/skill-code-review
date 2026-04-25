---
id: mob-uikit
type: primary
depth_role: leaf
focus: "Detect retain cycles in closures, missing dealloc/deinit cleanup, Auto Layout ambiguity, massive view controllers, and non-weak delegate references in UIKit code."
parents:
  - index.md
covers:
  - Retain cycle from strong self capture in closure passed to long-lived object
  - Missing deinit cleanup for NotificationCenter observers, KVO, or timers
  - Auto Layout constraint ambiguity or unsatisfiable constraints
  - "View controller exceeding 300+ lines with mixed concerns (Massive VC)"
  - "Delegate property not declared as weak (retain cycle)"
  - Main thread blocked by synchronous work in viewDidLoad or viewWillAppear
  - "Force unwrapping IBOutlets after view lifecycle (outlet may be nil)"
  - Storyboard segue with hardcoded string identifiers
  - "UITableView/UICollectionView cell reuse issues (state leaking between cells)"
  - Missing prepareForReuse in custom cells
tags:
  - uikit
  - ios
  - retain-cycle
  - memory-leak
  - autolayout
  - massive-view-controller
  - delegate
  - lifecycle
  - apple
activation:
  file_globs:
    - "**/*.swift"
    - "**/*.m"
    - "**/*.mm"
    - "**/*.h"
    - "**/*.xib"
    - "**/*.storyboard"
  keyword_matches:
    - UIKit
    - import UIKit
    - UIViewController
    - UIView
    - UITableView
    - UICollectionView
    - viewDidLoad
    - viewWillAppear
    - deinit
    - dealloc
    - delegate
    - IBOutlet
    - IBAction
    - addObserver
    - NSNotification
    - Timer
    - AutoLayout
    - NSLayoutConstraint
  structural_signals:
    - strong_self_in_closure
    - missing_deinit_cleanup
    - massive_view_controller
    - non_weak_delegate
source:
  origin: file
  path: mob-uikit.md
  hash: "sha256:83b4c53125ae9de3409c3faa6e124aac36a01843e040bc8704c7400dbddbb84a"
---
# UIKit

## When This Activates

Activates on diffs modifying Swift or Objective-C files that import UIKit, define UIViewController subclasses, work with UITableView/UICollectionView, or configure Auto Layout constraints. UIKit is a manual-retention-aware framework where the developer manages object lifecycles, observer registration, and memory ownership. Retain cycles are the most common UIKit bug -- they silently leak memory, and the app appears to work correctly until it runs out of memory under sustained use.

## Audit Surface

- [ ] Closure capturing self strongly in DispatchQueue, URLSession, or animation block
- [ ] NotificationCenter.addObserver without corresponding removeObserver in deinit
- [ ] KVO observe() without invalidation in deinit
- [ ] Timer.scheduledTimer with target: self without weak reference or invalidation
- [ ] Delegate or datasource property without weak keyword
- [ ] Ambiguous Auto Layout (missing constraints or conflicting priorities)
- [ ] View controller with >300 lines mixing networking, data, and UI logic
- [ ] Synchronous network call or heavy computation in viewDidLoad/viewWillAppear
- [ ] Force unwrap of IBOutlet (!) after loadView lifecycle
- [ ] UITableViewCell/UICollectionViewCell without prepareForReuse override
- [ ] Hardcoded storyboard/segue/cell identifier strings without constants
- [ ] UIView.animate completion block capturing self without [weak self]

## Detailed Checks

### Retain Cycles in Closures
<!-- activation: keywords=["self", "[weak self]", "[unowned self]", "capture", "closure", "block", "DispatchQueue", "URLSession", "completion", "animate", "sink", "store"] -->

- [ ] **Strong self in long-lived closure**: flag closures passed to `DispatchQueue.main.asyncAfter`, `URLSession.dataTask`, `Timer`, or stored completion handlers that capture `self` without `[weak self]` -- if the closure outlives the view controller, the VC is retained
- [ ] **Missing guard let self**: flag `[weak self]` closures that use `self?` throughout instead of `guard let self = self else { return }` at the top -- scattered optionals are error-prone and hide logic errors
- [ ] **Unowned self on optional reference**: flag `[unowned self]` where the closure may execute after the object is deallocated -- unlike weak, unowned crashes on access after dealloc
- [ ] **Animation completion retain**: flag `UIView.animate(withDuration:completion:)` where the completion block captures self strongly and the animation is long-running or repeating

### Deinit/Dealloc Cleanup
<!-- activation: keywords=["deinit", "dealloc", "NotificationCenter", "removeObserver", "invalidate", "KVO", "removeObserver", "cancel", "timer"] -->

- [ ] **Missing observer removal**: flag `NotificationCenter.default.addObserver` without corresponding `removeObserver` in `deinit` -- on iOS <9 or with block-based observers, the observer leaks
- [ ] **Timer not invalidated**: flag `Timer.scheduledTimer` without `timer.invalidate()` in `deinit` -- the timer retains its target, preventing dealloc entirely
- [ ] **KVO not removed**: flag `addObserver(forKeyPath:)` without `removeObserver(forKeyPath:)` in `deinit` -- KVO retains the observer and crashes if the observed object outlives it
- [ ] **Missing deinit entirely**: flag view controllers with observers, timers, or subscriptions that have no `deinit` method at all -- the cleanup code has nowhere to live

### Auto Layout Issues
<!-- activation: keywords=["NSLayoutConstraint", "constraint", "translatesAutoresizingMaskIntoConstraints", "priority", "activate", "anchor", "leading", "trailing", "top", "bottom", "width", "height", "SnapKit", "safeArea"] -->

- [ ] **Missing translatesAutoresizingMaskIntoConstraints = false**: flag programmatic Auto Layout where the property is not set to false -- autoresizing mask constraints conflict with custom constraints
- [ ] **Ambiguous layout**: flag views with constraints that do not fully specify horizontal position, vertical position, width, and height -- ambiguous layout produces unpredictable placement
- [ ] **Conflicting priorities**: flag multiple required (priority 1000) constraints that can conflict -- use lowered priorities for compressible constraints
- [ ] **Constraint to wrong safe area**: flag constraints anchored to `view.topAnchor` instead of `view.safeAreaLayoutGuide.topAnchor` -- content hides under the navigation bar or notch

### Massive View Controllers
<!-- activation: keywords=["UIViewController", "viewDidLoad", "viewWillAppear", "viewDidAppear", "tableView", "collectionView", "URLSession", "delegate", "dataSource", "numberOfRows"] -->

- [ ] **VC exceeds 300 lines**: flag view controllers with >300 lines that mix networking, data transformation, table/collection view data source, and presentation logic -- extract into coordinators, view models, or child VCs
- [ ] **VC as delegate and datasource**: flag view controllers that conform to both delegate and datasource for multiple table/collection views -- extract to dedicated datasource objects
- [ ] **Networking in view controller**: flag `URLSession` calls or API requests directly in a view controller instead of a service/repository layer

### Cell Reuse and Table/Collection View
<!-- activation: keywords=["dequeueReusableCell", "cellForRow", "cellForItem", "prepareForReuse", "register", "UITableViewCell", "UICollectionViewCell", "reuseIdentifier"] -->

- [ ] **Missing prepareForReuse**: flag custom cells with configuration state (images, colors, visibility) that do not override `prepareForReuse()` to reset state -- stale data appears when cells are recycled
- [ ] **Hardcoded cell identifier**: flag string literals for cell identifiers scattered across registration and dequeue calls -- use static constants or type-derived identifiers
- [ ] **Force cast dequeue**: flag `as!` on `dequeueReusableCell(withIdentifier:for:)` -- use `as?` with a guard to provide a meaningful error instead of a crash

## Common False Positives

- **Short-lived closures**: closures that execute immediately and are not stored (e.g., `Array.map`, `DispatchQueue.main.async` for a single UI update) do not cause retain cycles even without `[weak self]`.
- **iOS 9+ NotificationCenter**: since iOS 9, `NotificationCenter` does not retain observers added with the selector-based API. Block-based observers still need removal.
- **View controllers that are always in memory**: root tab bar children or the app's main view controller may intentionally retain subscriptions for their entire lifetime.
- **SnapKit/Cartography constraints**: DSL-based constraint libraries handle `translatesAutoresizingMaskIntoConstraints` internally. Do not flag.

## Severity Guidance

| Finding | Severity |
|---|---|
| Retain cycle: strong self in stored closure with VC reference | Critical |
| Timer retaining target without invalidation in deinit | Critical |
| Non-weak delegate creating retain cycle | Critical |
| NotificationCenter observer not removed (block-based API) | Important |
| Missing prepareForReuse causing stale cell data | Important |
| Synchronous work blocking main thread in viewDidLoad | Important |
| Auto Layout ambiguity or missing constraints | Important |
| View controller >300 lines with mixed concerns | Minor |
| Force unwrap on IBOutlet | Minor |
| Hardcoded storyboard/cell identifier strings | Minor |

## See Also

- `mob-swiftui` -- SwiftUI state management avoids many UIKit retain cycle issues but introduces new ones
- `mob-combine-reactive` -- Combine subscriptions in UIKit need AnyCancellable storage and cleanup
- `perf-memory-gc` -- retain cycles are reference leaks in ARC environments
- `principle-separation-of-concerns` -- massive view controllers violate SoC

## Authoritative References

- [Apple, "View Controller Programming Guide for iOS" -- lifecycle and data flow](https://developer.apple.com/library/archive/featuredarticles/ViewControllerPGforiPhoneOS/)
- [Apple, "Automatic Reference Counting" -- strong/weak/unowned reference semantics](https://docs.swift.org/swift-book/documentation/the-swift-programming-language/automaticreferencecounting/)
- [Apple, "Auto Layout Guide" -- constraint system and debugging ambiguity](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/AutolayoutPG/)
- [Apple, "Table View Programming Guide" -- cell reuse and data source patterns](https://developer.apple.com/documentation/uikit/uitableview)
