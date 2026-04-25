---
id: a11y-native-platform-ios-android
type: primary
depth_role: leaf
focus: "Detect missing accessibilityLabel (iOS), missing contentDescription (Android), custom views without accessibility traits, undersized touch targets, unsupported Dynamic Type, and untested VoiceOver/TalkBack paths."
parents:
  - index.md
covers:
  - "UIKit/SwiftUI view missing accessibilityLabel"
  - Android View missing contentDescription
  - "Custom view or widget without accessibility traits (isButton, isHeader)"
  - "Touch target smaller than 44x44pt (iOS) or 48x48dp (Android)"
  - Dynamic Type not supported -- fixed font sizes in iOS
  - Android importantForAccessibility set to no on informative content
  - "Custom drawing (Canvas, drawRect) without accessibility representation"
  - VoiceOver or TalkBack traversal order incorrect
  - Missing accessibilityHint for non-obvious interactions
  - Accessibility announcements not posted for dynamic content changes
  - Images in native views without accessibility descriptions
tags:
  - accessibility
  - a11y
  - ios
  - android
  - voiceover
  - talkback
  - dynamic-type
  - accessibilityLabel
  - contentDescription
  - touch-target
  - native
activation:
  file_globs:
    - "**/*.swift"
    - "**/*.kt"
    - "**/*.java"
    - "**/*.m"
    - "**/*.mm"
    - "**/*.xib"
    - "**/*.storyboard"
    - "**/*.xml"
  keyword_matches:
    - accessibilityLabel
    - accessibilityTraits
    - accessibilityHint
    - accessibilityValue
    - accessibilityElement
    - isAccessibilityElement
    - contentDescription
    - importantForAccessibility
    - AccessibilityNodeInfo
    - semantics
    - VoiceOver
    - TalkBack
    - UIAccessibility
    - Dynamic Type
    - preferredFont
    - textStyle
  structural_signals:
    - image_without_a11y_label
    - custom_view_without_traits
    - small_touch_target
    - fixed_font_size
source:
  origin: file
  path: a11y-native-platform-ios-android.md
  hash: "sha256:2d60fccc8785f874cc09d681d3b15012697d88553acb6b9c060a187771868855"
---
# Native Platform Accessibility (iOS and Android)

## When This Activates

Activates on diffs modifying iOS (Swift, SwiftUI, UIKit, Objective-C) or Android (Kotlin, Java, Jetpack Compose, XML layouts) view code. Native mobile accessibility relies on platform APIs (UIAccessibility on iOS, AccessibilityNodeInfo on Android) that screen readers (VoiceOver, TalkBack) consume. Unlike web accessibility where HTML semantics provide a baseline, native custom views start with zero accessibility and must explicitly opt in. Missing labels and traits mean the screen reader either skips the element entirely or announces it without context.

## Audit Surface

- [ ] UIImageView or Image without accessibilityLabel
- [ ] Android ImageView without contentDescription or importantForAccessibility=no
- [ ] Custom UIView/View subclass without accessibilityTraits or AccessibilityNodeInfo
- [ ] Touch target with frame/bounds smaller than 44x44pt (iOS) or 48x48dp (Android)
- [ ] Fixed font size (UIFont.systemFont(ofSize:)) instead of UIFont.preferredFont(forTextStyle:)
- [ ] Android sp font sizes not used (using dp for text)
- [ ] Custom Canvas or drawRect rendering without UIAccessibilityElement overlay
- [ ] accessibilityElements ordering not matching visual layout
- [ ] Dynamic content change without UIAccessibility.post or announceForAccessibility
- [ ] importantForAccessibility=no on element that conveys information
- [ ] SwiftUI view missing .accessibilityLabel() modifier
- [ ] Jetpack Compose element missing semantics { contentDescription }
- [ ] Grouped elements not using accessibilityElement(children: .combine) or ViewGroup merging

## Detailed Checks

### Missing Accessibility Labels
<!-- activation: keywords=["accessibilityLabel", "contentDescription", "semantics", "label", "ImageView", "UIImageView", "Image(", "Icon(", "UIButton", "Button("] -->

- [ ] **iOS image without label**: flag `UIImageView` or SwiftUI `Image` displaying informative content without `.accessibilityLabel()` -- VoiceOver announces the image filename or nothing
- [ ] **Android image without description**: flag `ImageView` without `android:contentDescription` -- TalkBack announces "unlabeled" or the resource name
- [ ] **Decorative image not hidden**: flag decorative images that are not marked with `isAccessibilityElement = false` (iOS) or `importantForAccessibility="no"` (Android) -- screen reader wastes time announcing irrelevant content
- [ ] **SwiftUI missing label**: flag SwiftUI custom views that render visual information without `.accessibilityLabel()` modifier
- [ ] **Compose missing semantics**: flag Jetpack Compose elements (Icon, Image, custom Canvas) without `Modifier.semantics { contentDescription = ... }` or `contentDescription` parameter

### Accessibility Traits and Roles
<!-- activation: keywords=["accessibilityTraits", "accessibilityAddTraits", ".isButton", ".isHeader", ".isSelected", "AccessibilityNodeInfo", "className", "roleDescription", "Role.", "accessibilityRole"] -->

- [ ] **Custom button without button trait**: flag custom tap-handling views that do not set `.accessibilityTraits = .button` (UIKit), `.accessibilityAddTraits(.isButton)` (SwiftUI), or `AccessibilityNodeInfo.className = Button` (Android) -- screen reader does not announce "button" or "double-tap to activate"
- [ ] **Custom header without header trait**: flag visual section headers implemented as plain labels without `.isHeader` trait -- screen reader heading navigation skips them
- [ ] **Missing adjustable trait for sliders**: flag custom slider or stepper views without `.adjustable` trait and without implementing `accessibilityIncrement()`/`accessibilityDecrement()` -- VoiceOver cannot adjust the value
- [ ] **Compose missing role**: flag Compose clickable elements without `Role.Button` in `Modifier.semantics { role = Role.Button }` -- TalkBack announces "double tap to activate" only when the role is set

### Touch Target Size
<!-- activation: keywords=["frame", "bounds", "CGRect", "CGSize", "width", "height", "44", "48", "minWidth", "minHeight", "padding", "hitTest", "contentPadding", "Modifier.size"] -->

- [ ] **iOS target below 44pt**: flag interactive elements (buttons, controls) with a frame smaller than 44x44 points -- Apple HIG recommends 44pt minimum; smaller targets are difficult for motor-impaired users
- [ ] **Android target below 48dp**: flag clickable views with dimensions below 48x48dp -- Material Design and Android accessibility guidelines require this minimum
- [ ] **Visual size vs hit area**: flag cases where the visible element is small but no expanded hit area (`hitTest`, `contentEdgeInsets`, or padding) is applied -- the touch target can exceed the visual bounds

### Dynamic Type and Font Scaling
<!-- activation: keywords=["UIFont", "systemFont", "preferredFont", "textStyle", "adjustsFontForContentSizeCategory", "scaledFont", "sp", "dp", "TextStyle", "font(", ".font("] -->

- [ ] **Fixed font size on iOS**: flag `UIFont.systemFont(ofSize: N)` or `UIFont(name:size:)` without `UIFontMetrics.scaledFont` -- the text does not respond to Dynamic Type settings
- [ ] **Missing adjustsFontForContentSizeCategory**: flag UILabel and UITextField without `adjustsFontForContentSizeCategory = true` -- even with preferredFont, the label does not update when the user changes the text size
- [ ] **SwiftUI fixed font**: flag SwiftUI `.font(.system(size: N))` instead of `.font(.body)` or other semantic text styles -- semantic styles scale with Dynamic Type
- [ ] **Android dp for text**: flag text sizes specified in `dp` instead of `sp` in XML layouts -- dp does not scale with the user's font size preference

### Dynamic Content Announcements
<!-- activation: keywords=["UIAccessibility.post", "announcement", "screenChanged", "layoutChanged", "announceForAccessibility", "AccessibilityEvent", "TYPE_ANNOUNCEMENT", "liveRegion", "accessibilityLiveRegion"] -->

- [ ] **Content change not announced on iOS**: flag dynamic updates (loading complete, error appeared, counter changed) without `UIAccessibility.post(notification: .announcement, argument:)` or `.screenChanged` / `.layoutChanged` notifications
- [ ] **Content change not announced on Android**: flag dynamic updates without `View.announceForAccessibility()` or `android:accessibilityLiveRegion` on the updating container
- [ ] **Incorrect notification type**: flag `.screenChanged` used for minor updates (should be `.layoutChanged` or `.announcement`) -- screenChanged resets VoiceOver focus to the first element

### Custom Drawing and Grouped Elements
<!-- activation: keywords=["drawRect", "draw(", "Canvas(", "onDraw", "UIAccessibilityElement", "accessibilityElements", "accessibilityElement(children:", "shouldGroupAccessibilityChildren", "mergeDescendants"] -->

- [ ] **Custom draw without accessibility layer**: flag `drawRect:` (UIKit), `draw(in:)` (Core Graphics), or `Canvas { }` (Compose) rendering informative content without overlaying `UIAccessibilityElement` objects or Compose `semantics` -- the content is invisible to assistive technology
- [ ] **Missing element grouping**: flag related UI elements (icon + label + action) that should be announced as a single unit but are not grouped via `accessibilityElement(children: .combine)` (SwiftUI) or `android:importantForAccessibility="yes"` with `mergeDescendants` (Compose) -- VoiceOver announces each piece separately, which is verbose and confusing
- [ ] **Custom traversal order**: flag custom `accessibilityElements` ordering that does not match the visual layout -- users expect reading order to follow visual order

## Common False Positives

- **Decorative elements correctly hidden**: elements with `isAccessibilityElement = false` or `importantForAccessibility="no"` are intentionally hidden from screen readers. Do not flag unless they convey information.
- **Container views**: parent container views may not need accessibility labels if their children provide individual labels. Verify the children before flagging the container.
- **System controls**: UIButton, UISwitch, and standard Android widgets have built-in accessibility. Do not flag unless the developer has overridden the default behavior.
- **Fixed-size design elements**: purely decorative fixed-size elements (dividers, spacers) do not need to meet touch target minimums.

## Severity Guidance

| Finding | Severity |
|---|---|
| Interactive element with no accessible name (label/description) | Critical |
| Custom view with no accessibility traits or role | Critical |
| Custom Canvas drawing without accessibility representation | Critical |
| Touch target below platform minimum (44pt iOS / 48dp Android) | Important |
| Fixed font size not supporting Dynamic Type / font scaling | Important |
| Dynamic content change not announced to assistive technology | Important |
| Decorative image not hidden from assistive technology | Minor |
| Missing accessibilityHint for non-obvious interactions | Minor |
| Related elements not grouped for efficient traversal | Minor |

## See Also

- `a11y-wcag-2-2-aa` -- WCAG criteria applicable to native platforms (1.1.1, 2.5.8, 1.4.4)
- `mob-swiftui` -- SwiftUI-specific lifecycle and view composition where accessibility modifiers apply
- `mob-jetpack-compose` -- Compose semantics and Modifier patterns for accessibility
- `mob-flutter` -- Flutter Semantics widget for accessibility in cross-platform context

## Authoritative References

- [Apple, "Accessibility for UIKit" -- UIAccessibility API reference](https://developer.apple.com/documentation/uikit/accessibility_for_uikit)
- [Apple, "Accessibility in SwiftUI" -- SwiftUI accessibility modifiers](https://developer.apple.com/documentation/swiftui/accessibility)
- [Android, "Make apps more accessible" -- Android accessibility developer guide](https://developer.android.com/guide/topics/ui/accessibility)
- [Android, "Accessibility in Jetpack Compose" -- Compose semantics API](https://developer.android.com/jetpack/compose/accessibility)
- [Apple, "Human Interface Guidelines: Accessibility"](https://developer.apple.com/design/human-interface-guidelines/accessibility)
