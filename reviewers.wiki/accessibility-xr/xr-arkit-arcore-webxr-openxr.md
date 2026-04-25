---
id: xr-arkit-arcore-webxr-openxr
type: primary
depth_role: leaf
focus: "Detect XR hazards -- missing user gesture for session, absent device fallback, anchor leaks, untracked-quality placement, and comfort / privacy omissions in ARKit, ARCore, WebXR, and OpenXR code"
parents:
  - index.md
covers:
  - "XR session requested without user gesture (permission denied)"
  - No fallback for devices that do not support requested XR features
  - Anchors created but never removed when subject leaves frame
  - "Content placed without checking tracking quality / state"
  - "Missing comfort mitigations in VR (motion sickness, teleport)"
  - "Hit-test run every frame without debounce / caching"
  - OpenXR action bindings not defined for all supported controllers
  - Eye-tracking data retained beyond session lifetime
  - "Passthrough / camera permission not explicitly requested"
  - Render target resolution not matched to device foveation settings
  - "Guardian / room-scale boundary not respected"
tags:
  - xr
  - ar
  - vr
  - mr
  - arkit
  - arcore
  - webxr
  - openxr
  - realitykit
  - scenekit
  - spatial-computing
activation:
  file_globs:
    - "**/*.swift"
    - "**/*.kt"
    - "**/*.java"
    - "**/*.cs"
    - "**/*.js"
    - "**/*.ts"
    - "**/*.cpp"
  keyword_matches:
    - ARKit
    - ARCore
    - WebXR
    - OpenXR
    - XRSession
    - ARSession
    - ARWorldTrackingConfiguration
    - Pose
    - Anchor
    - HitTest
    - XRFrame
    - XRReferenceSpace
    - AR
    - VR
    - XR
    - Reality Composer
    - SceneKit
    - RealityKit
    - Sceneform
    - xrCreateSession
    - xrSuggestInteractionProfileBindings
  structural_signals:
    - session_without_gesture
    - anchor_leak
    - hit_test_per_frame
    - no_device_fallback
source:
  origin: file
  path: xr-arkit-arcore-webxr-openxr.md
  hash: "sha256:c4c806526b0df8a06dd5cdd35e2f3d685d34cb02a713e4042b969ffce18ce7e9"
---
# XR (ARKit, ARCore, WebXR, OpenXR)

## When This Activates

Activates on diffs introducing or modifying XR session setup, anchors, hit-tests, input action bindings, or stereo rendering. XR bugs damage trust in hard-to-reverse ways -- a session that fails silently on non-Quest devices, an anchor that drifts into the floor, or a motion-sickness-inducing locomotion scheme all erode user confidence. This reviewer enforces session hygiene, tracking-state gating, comfort, and privacy discipline specific to spatial computing.

## Audit Surface

- [ ] requestSession / ARSession.run outside a user-gesture handler
- [ ] requiredFeatures with no optionalFeatures fallback or capability check
- [ ] Anchors added with no cleanup when subject leaves frame
- [ ] Content placed without checking tracking quality / state
- [ ] VR locomotion without teleport / comfort vignette option
- [ ] Hit-test run on every XRFrame without debounce
- [ ] OpenXR action bindings missing for some controller profiles
- [ ] Eye-tracking data retained beyond session
- [ ] Passthrough / camera permission not explicitly requested
- [ ] Render target resolution not foveated / matched to device
- [ ] Guardian / boundary read but not enforced
- [ ] AR object falls back to camera origin when tracking lost
- [ ] Hand-tracking streamed without consent UI
- [ ] Session ended without cleanup of anchors, listeners, render loop
- [ ] No handler for XRSession 'end' / ARSessionInterruption events
- [ ] Hit-test against reflective / transparent surface
- [ ] Depth / mesh retained across sessions
- [ ] Spatial audio listener not updated to HMD pose each frame
- [ ] Controller / hand input sampled below refresh rate
- [ ] Custom stereo render ignoring IPD / eye offset

## Detailed Checks

### Session Initialization and User Gesture
<!-- activation: keywords=["requestSession", "ARSession.run", "xrCreateSession", "navigator.xr", "startARCoreApk"] -->

- [ ] **Session outside user gesture**: flag `navigator.xr.requestSession(...)` or `ARSession.run()` called from page load / timer / network callback rather than inside a click / tap handler -- WebXR rejects immersive sessions without a gesture, and ARKit / ARCore prompt UX is bound to user action
- [ ] **No capability check before request**: flag `requiredFeatures: ['hit-test', 'hand-tracking']` without a prior `navigator.xr.isSessionSupported` check or ARCore `ArCoreApk.checkAvailability` -- session request fails with a cryptic error instead of a graceful fallback
- [ ] **Session errors swallowed**: flag `.catch(() => {})` on requestSession or missing `try/catch` around `ARSession.run` -- the user sees nothing when permissions are denied

### Device Fallback and Feature Detection
<!-- activation: keywords=["requiredFeatures", "optionalFeatures", "isSessionSupported", "checkAvailability", "XR_EXT_"] -->

- [ ] **No fallback for unsupported device**: flag XR entry code with no 2D / non-XR path when the device lacks the runtime -- the feature becomes invisible on iPhone Safari without WebXR, older Androids without ARCore, etc.
- [ ] **Required feature used as optional**: flag feature named in `requiredFeatures` that the UX can actually tolerate being absent (e.g., 'hand-tracking' for an app that also supports controllers) -- move to `optionalFeatures` to widen device support
- [ ] **OpenXR extension used without enablement check**: flag `xr*` call depending on `XR_EXT_*` without checking `xrEnumerateInstanceExtensionProperties` -- runtime crashes on runtimes lacking the extension

### Anchor Lifecycle and Tracking Quality
<!-- activation: keywords=["Anchor", "addAnchor", "createAnchor", "removeAnchor", "TrackingState", "TrackingQuality", "ARTrackingState"] -->

- [ ] **Anchor leak**: flag `session.addAnchor` / `ARAnchor(...)` with no corresponding `removeAnchor` on content dismissal, session pause, or tracking loss -- anchors accumulate, consuming memory and drifting as the map updates
- [ ] **Content placed without tracking-state check**: flag content placement using `hitTest.worldTransform` without first checking `ARTrackingState == .normal` / `XRFrame.getViewerPose` non-null -- objects snap to incorrect positions when tracking is degraded
- [ ] **Anchor confidence / mapping state ignored**: flag use of plane / mesh anchors without gating on `classification` / `alignment` / confidence -- objects get placed on shadows, posters, or ceiling-sky planes

### Hit-Test and Per-Frame Cost
<!-- activation: keywords=["hitTest", "requestHitTestSource", "getHitTestResults", "raycast", "XRFrame"] -->

- [ ] **Hit-test every frame without debounce**: flag `frame.getHitTestResults(source)` called on every `XRFrame` and used for a reticle that updates at 90+ Hz -- wastes CPU and produces jitter; debounce or temporally smooth
- [ ] **Hit-test against reflective / transparent plane**: flag placement on any detected plane without filtering by classification or size -- mirrors and windows produce anchors that drift wildly
- [ ] **Hit-test not disposed**: flag `requestHitTestSource` without a cancellation when the UI mode changes -- the runtime keeps computing results you no longer consume

### Comfort, Locomotion, and Safety
<!-- activation: keywords=["locomotion", "teleport", "snap", "smoothTurn", "vignette", "guardian", "boundary", "stageParameters"] -->

- [ ] **Smooth locomotion with no teleport option**: flag VR movement implemented only via thumbstick / smooth translation -- triggers motion sickness in a large fraction of users; always offer teleport + comfort vignette
- [ ] **Smooth turn without snap option**: flag continuous yaw turning with no snap-turn alternative -- same comfort concern
- [ ] **Boundary data read but not enforced**: flag code that reads `XRBoundedReferenceSpace` / guardian but does not fade / warn as the user approaches the edge -- physical safety issue
- [ ] **Teleport target unrestricted**: flag teleport that lets the user land outside the play area / on invalid geometry

### Input, Action Bindings, and Controller Coverage
<!-- activation: keywords=["xrSuggestInteractionProfileBindings", "getInputSources", "XRInputSource", "profiles", "controller"] -->

- [ ] **OpenXR bindings only for Touch / Oculus**: flag `xrSuggestInteractionProfileBindings` calls that cover `oculus/touch_controller` but omit `valve/index_controller`, `htc/vive_controller`, `microsoft/motion_controller` -- app is unusable on those headsets
- [ ] **WebXR gamepad API used without profile switch**: flag `inputSource.gamepad` accessed by hardcoded button index without checking `inputSource.profiles` -- button mapping differs between controllers
- [ ] **Input sampled below refresh rate**: flag controller / hand-pose polling throttled below the display rate (e.g., every 33 ms on a 90 Hz display) -- judder and missed taps

### Privacy and Consent
<!-- activation: keywords=["eye", "gaze", "hand", "face", "passthrough", "camera", "permission", "consent"] -->

- [ ] **Eye-tracking data retained beyond session**: flag gaze samples written to durable storage or uploaded without explicit consent and purpose notice -- regulated biometric data in many jurisdictions
- [ ] **Passthrough / camera permission not requested explicitly**: flag code that assumes camera access is available via XR session without an accompanying in-app rationale / consent UI
- [ ] **Hand / face tracking streamed without notice**: flag network transmission of hand-mesh or face-blendshapes without a visible indicator / consent screen
- [ ] **Depth / mesh retained across sessions**: flag `ARMeshAnchor` / scene mesh cached to disk without consent -- reveals room geometry

### Session Teardown and Rendering
<!-- activation: keywords=["session.end", "endSession", "sessionDidInterrupt", "ARSessionInterruption", "requestAnimationFrame", "XRWebGLLayer", "fixedFoveation"] -->

- [ ] **Session ended without cleanup**: flag `session.end()` / ARSession paused with no removal of anchors, detachment of render loop, or release of GPU resources -- leaks across session restarts
- [ ] **No handling of session interruption**: flag missing listener for `session.onend` / `ARSession.wasInterrupted` / ARCore `TrackingFailureReason` -- app behaves as if tracking is still valid after the user removes the headset or a phone call interrupts
- [ ] **Render target not foveated / not matched to device**: flag render at full `XRView` resolution with `fixedFoveation = 0` on devices where higher foveation is acceptable -- burns GPU and battery
- [ ] **Custom stereo render ignoring IPD**: flag manual stereo rendering that uses a hardcoded eye offset instead of `XRView.transform` / `projectionMatrix` -- causes eye strain

## Common False Positives

- **3DOF / passive viewer modes**: `inline` WebXR sessions or Cardboard-style viewers have fewer capabilities; comfort and boundary flags do not apply.
- **Developer / debug sessions**: bypassing permission flow behind a dev flag is acceptable with clear gating.
- **Seated-only experiences**: guardian / boundary enforcement is lower priority for seated VR.
- **Single-controller demos**: OpenXR binding-coverage flag can relax when the app is a tech demo documented as Quest-only.
- **Server-side anchors**: cloud anchor services (Google Geospatial, Azure Spatial Anchors) legitimately persist data with explicit consent flow.

## Severity Guidance

| Finding | Severity |
|---|---|
| Eye / face / hand biometric data retained or uploaded without consent | Critical |
| No fallback path on unsupported device (feature unreachable) | Important |
| Anchor leak accumulating indefinitely | Important |
| VR smooth locomotion with no teleport / comfort option | Important |
| OpenXR action bindings missing for major controller profiles | Important |
| Hit-test every frame without debounce | Minor |
| Render target not foveated / oversized | Minor |
| Session not torn down cleanly on end / interruption | Minor |

## See Also

- `a11y-reduced-motion-and-prefers-color-scheme` -- motion comfort preferences extend to XR
- `author-self-review-hygiene` -- review checklist for multi-device XR coverage
- `perf-hot-path-allocations` -- per-frame allocation detection in render loop

## Authoritative References

- [W3C, "WebXR Device API"](https://www.w3.org/TR/webxr/)
- [Apple, "ARKit Documentation"](https://developer.apple.com/documentation/arkit)
- [Google, "ARCore Developer Guide"](https://developers.google.com/ar/develop)
- [Khronos, "OpenXR Specification"](https://registry.khronos.org/OpenXR/specs/1.1/html/xrspec.html)
- [Oculus, "VR Best Practices"](https://developer.oculus.com/resources/bp-locomotion/)
- [Khronos, "OpenXR Input and Haptics"](https://registry.khronos.org/OpenXR/specs/1.1/html/xrspec.html#input)
