---
id: mob-swiftui
type: primary
depth_role: leaf
focus: "Detect SwiftUI lifecycle mismanagement with @State/@Binding, overly complex view bodies, missing onDisappear cleanup, NavigationStack misuse, environment object propagation failures, and unbuildable previews."
parents:
  - index.md
covers:
  - "@State used for reference types instead of @StateObject or @Observable"
  - "@Binding passed to child but parent does not own the state"
  - View body computing heavy logic instead of extracting into subviews or computed properties
  - Missing onDisappear for timer, subscription, or resource cleanup
  - NavigationStack path binding not hoisted to a coordinator or model
  - EnvironmentObject not injected at the correct ancestor level
  - Preview crashing due to missing environment objects or required dependencies
  - "@ObservedObject recreated on parent re-render (should be @StateObject)"
  - "Large body with multiple if/else branches defeating SwiftUI diffing"
  - "Task {} not cancelled on view disappear"
tags:
  - swiftui
  - ios
  - apple
  - state-management
  - lifecycle
  - navigation
  - preview
  - environment
  - declarative-ui
activation:
  file_globs:
    - "**/*.swift"
  keyword_matches:
    - SwiftUI
    - import SwiftUI
    - "@State"
    - "@Binding"
    - "@StateObject"
    - "@ObservedObject"
    - "@EnvironmentObject"
    - "@Observable"
    - NavigationStack
    - NavigationLink
    - NavigationPath
    - .task
    - onAppear
    - onDisappear
    - "#Preview"
    - "body:"
    - some View
  structural_signals:
    - swiftui_state_misuse
    - complex_view_body
    - missing_on_disappear
    - preview_not_buildable
source:
  origin: file
  path: mob-swiftui.md
  hash: "sha256:2e8ef0f4a74a8fd6a26306274a06d2b8563e9c9f44e8d5e129532110dd4c7eed"
---
# SwiftUI

## When This Activates

Activates on diffs modifying Swift files that import SwiftUI, use SwiftUI property wrappers (@State, @Binding, @StateObject, @ObservedObject, @EnvironmentObject, @Observable), or define SwiftUI views. SwiftUI's declarative model has sharp edges around state ownership, view identity, and lifecycle -- misuse causes views to reset unexpectedly, state to be lost on navigation, and previews to crash. This reviewer targets the most common SwiftUI mistakes that survive compilation but break at runtime.

## Audit Surface

- [ ] @State var wrapping a class or reference type instead of @StateObject
- [ ] @ObservedObject initialized inline in the view (recreated every render)
- [ ] View body exceeding ~30 lines with embedded conditional logic
- [ ] onDisappear missing for Timer, NotificationCenter observer, or Combine subscription
- [ ] NavigationStack path managed as local @State instead of external model
- [ ] .environmentObject() not provided at the root or navigation container level
- [ ] #Preview block missing .environmentObject() injection
- [ ] Task { } in .task modifier without cancellation on disappear
- [ ] GeometryReader used inside ScrollView causing layout thrashing
- [ ] @AppStorage used for large or complex data instead of lightweight preferences
- [ ] sheet/fullScreenCover using optional item binding without nil reset
- [ ] ForEach without explicit id parameter on non-Identifiable data

## Detailed Checks

### State and Binding Lifecycle
<!-- activation: keywords=["@State", "@Binding", "@StateObject", "@ObservedObject", "@Observable", "@Observed", "ObservableObject", "Published", "Bindable", "init("] -->

- [ ] **@State wrapping reference type**: flag `@State var model = SomeClass()` where SomeClass is a reference type -- @State is designed for value types; use @StateObject (pre-iOS 17) or @State with @Observable (iOS 17+)
- [ ] **@ObservedObject created inline**: flag `@ObservedObject var vm = ViewModel()` -- the object is recreated on every parent re-render, losing state; use `@StateObject` for ownership
- [ ] **@Binding without source of truth**: flag @Binding passed to a child where the parent does not hold the state in @State or @StateObject -- the binding dangles
- [ ] **@StateObject in child view**: flag @StateObject in views that receive the object from a parent -- the child should use @ObservedObject; @StateObject implies ownership and initializes once

### View Body Complexity
<!-- activation: keywords=["body", "some View", "VStack", "HStack", "ZStack", "List", "ForEach", "if ", "switch", "Group", "AnyView"] -->

- [ ] **Body too complex**: flag view bodies exceeding approximately 30 lines with embedded conditionals, ForEach loops, and nested stacks -- extract into smaller subviews for readability and SwiftUI diffing performance
- [ ] **AnyView type erasure**: flag `AnyView()` wrapping in the view body -- AnyView defeats SwiftUI's structural identity and forces full re-render; use @ViewBuilder or Group instead
- [ ] **Multiple conditional branches**: flag bodies with 3+ if/else branches that could be refactored into separate views or a switch with extracted subviews

### Lifecycle and Cleanup
<!-- activation: keywords=["onAppear", "onDisappear", ".task", "Timer", "NotificationCenter", "addObserver", "Cancellable", "AnyCancellable", "sink", "cancel", "invalidate"] -->

- [ ] **Missing onDisappear cleanup**: flag resources started in `onAppear` (timers, notification observers, Combine subscriptions) without corresponding cleanup in `onDisappear` -- the resource leaks when the view is removed
- [ ] **Task not cancelled**: flag `.task { }` or `.task(id:)` modifiers that start long-running work -- while SwiftUI cancels the task on disappear, verify that the async code is cooperative (checks `Task.isCancelled` or uses `try` on cancellable operations)
- [ ] **Timer without invalidation**: flag `Timer.scheduledTimer` or `Timer.publish` without `.invalidate()` in `onDisappear` -- the timer continues firing after the view is gone

### Navigation and Presentation
<!-- activation: keywords=["NavigationStack", "NavigationPath", "NavigationLink", "navigationDestination", "sheet", "fullScreenCover", "popover", "dismiss", "presentationMode", "isPresented", "item:"] -->

- [ ] **Local navigation state**: flag `NavigationStack(path:)` with the path stored as local `@State` in the view -- this prevents deep linking, programmatic navigation, and state restoration; hoist to an ObservableObject or coordinator
- [ ] **sheet item not nilled**: flag `sheet(item:)` or `fullScreenCover(item:)` where the optional binding is not set to nil when the sheet dismisses -- the sheet can re-present unexpectedly
- [ ] **NavigationLink with lazy destination**: flag `NavigationLink(destination:)` initializing the destination view eagerly -- use `navigationDestination(for:)` with value-based navigation for lazy loading

### Environment and Previews
<!-- activation: keywords=["environmentObject", "environment", "@Environment", "#Preview", "PreviewProvider", "previews", "mock", "stub"] -->

- [ ] **Missing environment injection**: flag views using `@EnvironmentObject` or `@Environment` where the required object is not injected at the NavigationStack or window group level -- runtime crash: "No ObservableObject of type X found"
- [ ] **Preview not buildable**: flag `#Preview` blocks that omit `.environmentObject()`, mock data, or navigation containers required by the view under preview -- broken previews erode developer productivity
- [ ] **EnvironmentObject injected too low**: flag `.environmentObject()` applied to a leaf view instead of a container -- child views within the container may not receive it

## Common False Positives

- **@Observable macro (iOS 17+)**: with `@Observable`, `@State` correctly wraps reference types because the macro provides the value-semantics behavior. Do not flag `@State var model: SomeObservableClass` if the class uses `@Observable`.
- **Short-lived views**: views that exist for a single frame (loading placeholders) may not need onDisappear cleanup.
- **Simple navigation**: apps with shallow navigation may correctly use local @State for NavigationStack path without needing a coordinator.
- **Preview in test target**: preview blocks in test targets may intentionally omit environment objects if they test isolated rendering.

## Severity Guidance

| Finding | Severity |
|---|---|
| @ObservedObject initialized inline (state loss on re-render) | Critical |
| @State wrapping non-Observable reference type | Critical |
| Missing environment object injection (runtime crash) | Critical |
| onDisappear missing for timer or subscription cleanup | Important |
| Task modifier without cooperative cancellation in async body | Important |
| NavigationStack path as local @State (prevents deep linking) | Important |
| View body >30 lines with complex conditionals | Minor |
| Preview not buildable due to missing dependencies | Minor |
| AnyView type erasure in view body | Minor |

## See Also

- `mob-combine-reactive` -- Combine subscriptions in SwiftUI need AnyCancellable cleanup
- `mob-swift-concurrency-actors` -- Swift concurrency and @MainActor interact with SwiftUI's main-thread requirement
- `a11y-native-platform-ios-android` -- SwiftUI accessibility modifiers (.accessibilityLabel, .accessibilityTraits)
- `principle-separation-of-concerns` -- view body complexity is a separation-of-concerns issue

## Authoritative References

- [Apple, "Managing model data in your app" -- @State, @StateObject, @Observable usage](https://developer.apple.com/documentation/swiftui/managing-model-data-in-your-app)
- [Apple, "SwiftUI State and Data Flow" -- property wrapper lifecycle](https://developer.apple.com/documentation/swiftui/state-and-data-flow)
- [Apple, "Migrating from ObservableObject to Observable" -- iOS 17+ patterns](https://developer.apple.com/documentation/swiftui/migrating-from-the-observable-object-protocol-to-the-observable-macro)
- [Apple, "NavigationStack" -- value-based programmatic navigation](https://developer.apple.com/documentation/swiftui/navigationstack)
