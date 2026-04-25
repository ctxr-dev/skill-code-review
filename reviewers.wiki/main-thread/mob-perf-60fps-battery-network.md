---
id: mob-perf-60fps-battery-network
type: primary
depth_role: leaf
focus: Detect main thread work causing frame drops, unreleased wake locks, background polling without constraints, image decoding on the main thread, and missing offline caching strategies in mobile apps.
parents:
  - index.md
covers:
  - "Heavy computation on main/UI thread causing dropped frames (below 60fps)"
  - "Wake lock acquired but not released in finally/defer/onDestroy"
  - "Background polling with fixed interval without respecting Doze/App Standby/BGTaskScheduler"
  - Image decoding or bitmap manipulation on the main thread
  - "No offline caching strategy (app unusable without network)"
  - Location updates at high frequency without accuracy justification
  - "Large layout pass (nested LinearLayout/ConstraintLayout) causing jank"
  - Unnecessary network request on every screen appearance
  - Missing HTTP caching headers or client-side cache
  - Sensor listener registered without unregistration on pause
tags:
  - mobile-performance
  - 60fps
  - battery
  - network
  - caching
  - wake-lock
  - jank
  - frame-rate
  - image-decoding
  - offline
  - ios
  - android
activation:
  file_globs:
    - "**/*.swift"
    - "**/*.kt"
    - "**/*.java"
    - "**/*.dart"
    - "**/*.tsx"
    - "**/*.jsx"
    - "**/*.m"
    - "**/*.xml"
  keyword_matches:
    - main thread
    - MainThread
    - DispatchQueue.main
    - Dispatchers.Main
    - runOnUiThread
    - WakeLock
    - PowerManager
    - AlarmManager
    - BGTaskScheduler
    - requestLocationUpdates
    - BitmapFactory
    - UIImage
    - decodeResource
    - ImageDecoder
    - URLCache
    - OkHttpClient
    - Cache
    - SensorManager
    - registerListener
  structural_signals:
    - heavy_main_thread_work
    - wake_lock_not_released
    - background_polling
    - image_decode_main_thread
source:
  origin: file
  path: mob-perf-60fps-battery-network.md
  hash: "sha256:dd05550af0cca2825e6d30c9148d931a54e6837f697829613ba72a26001c0c48"
---
# Mobile Performance: 60fps, Battery, and Network

## When This Activates

Activates on diffs that modify main-thread code, background task scheduling, image loading, network request patterns, sensor management, or layout hierarchies in mobile apps (iOS, Android, Flutter, React Native). Mobile devices have constrained CPU, memory, battery, and network budgets. The user notices when frames drop below 60fps (16.67ms per frame budget), when the battery drains faster than expected, or when the app is unusable offline. This reviewer targets the most impactful performance and resource management patterns across mobile platforms.

## Audit Surface

- [ ] Synchronous I/O, JSON parsing, or sorting on the main thread
- [ ] BitmapFactory.decodeStream or UIImage(data:) on the main thread
- [ ] PowerManager.WakeLock.acquire() without release() in finally or onDestroy
- [ ] Timer or AlarmManager polling at fixed interval in background
- [ ] BackgroundTasks (iOS) scheduled without setTaskCompleted
- [ ] Network request in onResume/viewWillAppear without caching or debounce
- [ ] No disk cache for API responses (NSURLCache, OkHttp cache, Hive)
- [ ] requestLocationUpdates with distanceFilter=0 or minInterval<1s
- [ ] SensorManager.registerListener without unregisterListener in onPause
- [ ] Nested weight-based layouts (LinearLayout with weight inside ScrollView)
- [ ] RecyclerView/UITableView not recycling cells (creating new views each time)
- [ ] Overdraw from overlapping opaque backgrounds on Android
- [ ] Missing image resizing before display (full-resolution bitmap in thumbnail)

## Detailed Checks

### Main Thread and Frame Budget
<!-- activation: keywords=["main", "Main", "UI thread", "DispatchQueue.main", "Dispatchers.Main", "runOnUiThread", "Handler(Looper.getMainLooper())", "performSelector", "synchronous", "blocking", "decode", "parse", "sort", "filter"] -->

- [ ] **Heavy work on main thread**: flag JSON parsing, XML parsing, large collection sorting/filtering, cryptographic operations, or regular expression compilation on the main/UI thread -- these easily exceed the 16ms frame budget
- [ ] **Synchronous I/O on main thread**: flag file reads, database queries, or network calls executed synchronously on the main thread -- I/O latency is unpredictable and can cause multi-second freezes
- [ ] **Image decoding on main thread**: flag `BitmapFactory.decodeStream()`, `BitmapFactory.decodeResource()`, `UIImage(data:)`, or `UIImage(contentsOfFile:)` on the main thread -- decoding a large image can take 50-200ms
- [ ] **Layout complexity causing jank**: flag deeply nested layout hierarchies (Android: nested LinearLayout with weights, iOS: nested manual layout calculations) that trigger expensive measure/layout passes exceeding the frame budget

### Battery and Wake Locks
<!-- activation: keywords=["WakeLock", "PowerManager", "acquire", "release", "AlarmManager", "setRepeating", "setExactAndAllowWhileIdle", "JobScheduler", "BGTaskScheduler", "BGAppRefreshTask", "BGProcessingTask", "Doze", "App Standby", "battery", "background"] -->

- [ ] **Wake lock not released**: flag `PowerManager.WakeLock.acquire()` without `release()` in a `finally` block, `onDestroy`, or equivalent cleanup -- an unreleased wake lock keeps the CPU running and drains the battery
- [ ] **Timed wake lock without justification**: flag `acquire(timeout)` with long timeouts (>60s) -- prefer exact work completion and immediate release
- [ ] **Fixed-interval background polling**: flag `AlarmManager.setRepeating()`, `Timer` in background, or `setInterval` for periodic data sync -- use JobScheduler (Android), BGTaskScheduler (iOS), or WorkManager with constraints that respect Doze mode and App Standby
- [ ] **iOS background task not completed**: flag `BGTask` handlers that do not call `setTaskCompleted(success:)` on all code paths -- the system penalizes apps that do not signal completion
- [ ] **Sensor listener not unregistered**: flag `SensorManager.registerListener()` or `CLLocationManager.startUpdatingLocation()` without corresponding unregistration in `onPause`/`viewWillDisappear` -- sensors drain the battery even when the app is in the background

### Network Efficiency
<!-- activation: keywords=["fetch", "request", "URLSession", "OkHttp", "Retrofit", "dio", "axios", "cache", "Cache-Control", "ETag", "If-None-Match", "offline", "Reachability", "ConnectivityManager", "onResume", "viewWillAppear", "onAppear"] -->

- [ ] **Request on every screen appearance**: flag network requests in `onResume`, `viewWillAppear`, or `onAppear` without cache-first strategy or debounce -- navigating back and forth triggers redundant requests
- [ ] **No HTTP caching**: flag HTTP client configuration without cache setup (`OkHttp.Cache`, `NSURLCache` with capacity, `dio` interceptor with cache) -- every request hits the server, wasting battery and bandwidth
- [ ] **No offline fallback**: flag screens that show an error or blank state when offline instead of cached content -- mobile users frequently lose connectivity
- [ ] **Large payload without pagination**: flag API responses returning entire collections without pagination, cursor-based loading, or delta sync -- mobile networks have limited bandwidth; large payloads delay rendering and consume user data

### Image Loading and Sizing
<!-- activation: keywords=["image", "bitmap", "thumbnail", "resize", "scale", "compress", "Glide", "Picasso", "Kingfisher", "SDWebImage", "cached_network_image", "FastImage", "inSampleSize", "targetSize", "downsample"] -->

- [ ] **Full-resolution image in thumbnail**: flag loading a full-resolution image (camera photo, server image) into a small view without downsampling -- a 12MP photo decoded at full size consumes ~48MB of memory for a 50x50pt thumbnail
- [ ] **Missing image memory cache**: flag image loading without a library (Glide, Kingfisher, SDWebImage, cached_network_image) or manual cache -- each display decodes the image from disk or network
- [ ] **No disk cache for remote images**: flag remote image URLs loaded without disk caching -- the same image is re-downloaded on each cold start
- [ ] **Image not resized to view bounds**: flag `BitmapFactory.Options.inSampleSize` not set (Android) or `downsample` not configured (iOS) when the source image is larger than the display size

### Location and Sensors
<!-- activation: keywords=["requestLocationUpdates", "CLLocationManager", "startUpdatingLocation", "distanceFilter", "desiredAccuracy", "minTime", "minDistance", "significant", "geofence", "SensorManager", "Sensor", "registerListener", "unregisterListener"] -->

- [ ] **High-frequency location updates**: flag `requestLocationUpdates` with `minInterval < 1000ms` or `distanceFilter = 0` without justification (navigation, fitness tracking) -- continuous GPS polling is the single largest battery drain
- [ ] **Best accuracy without justification**: flag `desiredAccuracy = kCLLocationAccuracyBest` or `PRIORITY_HIGH_ACCURACY` when the use case (city-level, neighborhood) does not require GPS precision -- lower accuracy uses less power
- [ ] **Significant location not considered**: flag continuous location updates for use cases where `startMonitoringSignificantLocationChanges` (iOS) or `PASSIVE_PROVIDER` (Android) would suffice -- significant-change monitoring uses cell towers and WiFi instead of GPS

## Common False Positives

- **Image loading libraries**: Glide, Kingfisher, and SDWebImage handle off-main-thread decoding and caching internally. Do not flag image loading through these libraries as main-thread decoding.
- **Small data sets**: sorting a list of 20 items on the main thread is fast. Flag only when the data set can grow or when profiling shows >5ms.
- **User-initiated foreground work**: some main-thread work is required (UIKit layout, SwiftUI body evaluation). Flag only work that exceeds the frame budget or can be moved off-thread.
- **Debug builds**: profiling characteristics differ between debug and release. Wake lock and battery concerns are more relevant in release configuration.

## Severity Guidance

| Finding | Severity |
|---|---|
| Wake lock acquired without release (battery drain) | Critical |
| Image decoding on main thread (multi-frame jank) | Critical |
| Synchronous I/O on main thread (ANR risk) | Critical |
| Fixed-interval background polling without system scheduler | Important |
| Network request on every screen appearance without caching | Important |
| Full-resolution image loaded into thumbnail view | Important |
| High-frequency location updates without justification | Important |
| Sensor listener not unregistered on pause | Important |
| No offline caching strategy | Minor |
| Nested layout hierarchy causing measurement overhead | Minor |
| Missing HTTP cache configuration | Minor |

## See Also

- `mob-swiftui` -- SwiftUI view body runs on MainActor; heavy work there causes frame drops
- `mob-jetpack-compose` -- Compose recomposition on main thread; expensive operations in build
- `mob-react-native` -- JS thread performance and bridge overhead
- `mob-flutter` -- Flutter build method performance and image caching
- `perf-hot-path-allocations` -- allocation pressure on mobile devices causes GC pauses and frame drops
- `perf-memory-gc` -- memory leaks from unreleased resources on mobile

## Authoritative References

- [Android Developers, "Performance" -- profiling, rendering, and battery optimization](https://developer.android.com/topic/performance)
- [Apple, "Energy Efficiency Guide for iOS Apps" -- background execution and battery](https://developer.apple.com/library/archive/documentation/Performance/Conceptual/EnergyGuide-iOS/)
- [Android Developers, "Optimize network usage" -- caching, batching, and prefetching](https://developer.android.com/topic/performance/network)
- [Apple, "Improving Your App's Performance" -- Instruments and performance workflow](https://developer.apple.com/documentation/xcode/improving-your-app-s-performance)
