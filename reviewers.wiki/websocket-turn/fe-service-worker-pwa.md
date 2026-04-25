---
id: fe-service-worker-pwa
type: primary
depth_role: leaf
focus: Detect service worker and PWA pitfalls including stale caches, missing update prompts, offline fallback gaps, and background sync without retry limits.
parents:
  - index.md
covers:
  - Stale cache not invalidated after deployment
  - No cache versioning strategy causing users to see old content indefinitely
  - Offline fallback page missing for navigation requests
  - Service worker update available but not prompted to user
  - Background sync without retry limits causing infinite retries
  - Push notification permission requested too early
  - Service worker intercepting requests it should not cache
  - Missing cache-first vs network-first strategy per resource type
  - Precache list not updated on build
  - Service worker registration without scope limitation
tags:
  - service-worker
  - pwa
  - cache
  - offline
  - push-notifications
  - background-sync
  - frontend
activation:
  file_globs:
    - "**/service-worker.*"
    - "**/sw.*"
    - "**/workbox-config.*"
    - "**/manifest.json"
    - "**/manifest.webmanifest"
  keyword_matches:
    - serviceWorker
    - ServiceWorker
    - workbox
    - caches
    - CacheStorage
    - BackgroundSync
    - PushManager
    - skipWaiting
    - clients.claim
    - precache
  structural_signals:
    - cache without versioning
    - missing offline fallback
    - push permission on load
source:
  origin: file
  path: fe-service-worker-pwa.md
  hash: "sha256:27337f794d02bb65583ce2a4a8f5852ad66e75c8fccdbd084aae24548accfd49"
---
# Service Worker and PWA Pitfalls

## When This Activates

Activates when diffs touch service worker files, Workbox configuration, web app manifests, or code using CacheStorage, BackgroundSync, or Push APIs. Service workers are powerful but dangerous -- a misconfigured cache strategy can permanently serve stale content with no way for users to get updates, a missing offline fallback breaks the app when connectivity drops, and eager push notification permission requests train users to click "Block." This reviewer catches the service worker mistakes that degrade user experience or create update-impossible states.

## Audit Surface

- [ ] Service worker with no cache versioning
- [ ] Cache.put or cache.addAll without corresponding cache.delete for old versions
- [ ] No offline fallback page returned for failed navigation requests
- [ ] Service worker update detected without user notification
- [ ] Background sync handler with no retry count limit or exponential backoff
- [ ] Notification.requestPermission() called on page load without user interaction
- [ ] Service worker fetch handler caching API responses with cache-first strategy
- [ ] Service worker caching third-party CDN responses without cache expiration
- [ ] Workbox precache manifest not regenerated during build
- [ ] Service worker scope set to root when it should be limited
- [ ] No skipWaiting/clients.claim strategy defined for update activation
- [ ] Missing web app manifest for PWA installability
- [ ] Cache storage growing unbounded without size limits

## Detailed Checks

### Cache Versioning and Staleness
<!-- activation: keywords=["CACHE_VERSION", "cacheName", "caches.open", "cache.addAll", "precache", "cleanupOutdatedCaches"] -->

- [ ] **No cache versioning**: flag service workers that open caches without a version identifier (e.g., `caches.open('app-cache')` with no version suffix) -- when the app is updated, the old cache persists and serves stale content; use versioned cache names (`app-cache-v2`) or Workbox's automatic versioning
- [ ] **No old cache cleanup**: flag service worker activate handlers that do not delete old cache versions -- old caches accumulate and may be served by stale fetch handlers; delete caches not matching the current version in the activate event
- [ ] **Stale precache manifest**: flag Workbox configurations where the precache manifest (workbox-precaching) is not regenerated during the build step -- the service worker precaches outdated file hashes, serving old content even after deployment
- [ ] **Unbounded cache growth**: flag cache strategies (especially runtime caching) without maxEntries or maxAgeSeconds limits -- cache storage grows indefinitely, consuming user disk space

### Update Strategy
<!-- activation: keywords=["skipWaiting", "clients.claim", "registration.waiting", "update", "onupdatefound", "controllerchange"] -->

- [ ] **No update notification**: flag service worker registration that detects a waiting worker (`registration.waiting`) without prompting the user to update -- users are stuck on the old version until they close all tabs; show a "New version available" prompt
- [ ] **skipWaiting without user consent**: flag `self.skipWaiting()` called unconditionally in the install event -- this activates the new service worker immediately, potentially breaking in-flight requests from the old version; prompt the user first, then send a message to trigger skipWaiting
- [ ] **Missing controller change handling**: flag pages that do not listen for `controllerchange` events to reload after a service worker update -- the page continues using the old service worker's cached resources

### Offline Fallback
<!-- activation: keywords=["offline", "fallback", "fetch", "NavigationPreloadManager", "respondWith", "navigation"] -->

- [ ] **No offline fallback**: flag service worker fetch handlers for navigation requests that do not provide a fallback response when the network is unavailable -- users see the browser's default offline page instead of a branded offline experience
- [ ] **Cache-first for API data**: flag fetch handlers that use cache-first strategy for API responses (JSON data) -- API data should typically use network-first or stale-while-revalidate to avoid serving outdated data; cache-first is for static assets only
- [ ] **Missing navigation preload**: flag service workers handling navigation requests without NavigationPreloadManager -- without preload, the browser waits for the service worker to boot before making the network request, adding latency to navigation

### Push Notifications and Permissions
<!-- activation: keywords=["Notification", "requestPermission", "PushManager", "subscribe", "pushManager", "push"] -->

- [ ] **Permission on page load**: flag `Notification.requestPermission()` called during page load or component mount without prior user interaction -- browsers may auto-deny permission requests not triggered by user gestures; show an in-app prompt explaining the value first, then request permission on user opt-in
- [ ] **No permission state check**: flag push subscription code that does not check `Notification.permission` before requesting -- requesting permission when already denied triggers no browser prompt and silently fails
- [ ] **Missing push event error handling**: flag push event handlers that do not show a notification within the event lifetime -- browsers require showing a notification for every push event; failing to do so may cause the subscription to be revoked

### Background Sync
<!-- activation: keywords=["BackgroundSync", "sync", "SyncManager", "retry", "register", "tag"] -->

- [ ] **No retry limit**: flag background sync handlers that retry indefinitely without a counter or exponential backoff -- failed syncs retry on every connectivity change, potentially hammering the server or draining battery
- [ ] **No sync tag uniqueness**: flag sync registrations using generic tags (e.g., `sync`) instead of unique, descriptive tags per operation -- tag collisions coalesce syncs, causing operations to be lost
- [ ] **Missing fallback for unsupported browsers**: flag background sync usage without checking `'SyncManager' in window` -- background sync is not supported in all browsers; provide a fallback retry mechanism

## Common False Positives

- **skipWaiting in development**: unconditional skipWaiting during development for faster iteration is acceptable.
- **Cache-first for immutable assets**: static assets with content hashes in filenames (main.abc123.js) correctly use cache-first since the filename changes on update.
- **Push permission after onboarding**: requesting permission after a multi-step onboarding flow counts as user-initiated timing.
- **Simple offline page**: a basic offline.html without interactivity is acceptable for non-PWA sites that just need graceful degradation.

## Severity Guidance

| Finding | Severity |
|---|---|
| No cache versioning causing permanently stale content | Critical |
| No old cache cleanup causing unbounded storage growth | Critical |
| No offline fallback for navigation requests | Important |
| Cache-first strategy for API data | Important |
| No update prompt when new service worker is waiting | Important |
| Push permission requested on page load | Important |
| Background sync without retry limits | Minor |
| Missing navigation preload | Minor |
| No sync tag uniqueness | Minor |

## See Also

- `fe-csp-sri` -- service worker scripts must comply with Content-Security-Policy
- `fe-core-web-vitals-lighthouse` -- service worker caching affects LCP and navigation performance
- `sec-clickjacking-and-headers` -- service worker responses should include security headers
- `perf-startup-cold-start` -- service worker boot time affects navigation latency

## Authoritative References

- [web.dev -- "Service Worker Lifecycle"](https://web.dev/articles/service-worker-lifecycle)
- [web.dev -- "Workbox"](https://developer.chrome.com/docs/workbox/)
- [web.dev -- "Offline Fallback Page"](https://web.dev/articles/offline-fallback-page)
- [web.dev -- "Push Notifications"](https://web.dev/articles/push-notifications-overview)
- [MDN -- "Background Sync API"](https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API)
