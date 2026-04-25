---
id: browser-extensions-mv3
type: primary
depth_role: leaf
focus: Detect browser-extension pitfalls in Manifest V3 -- MV2 leftovers, over-broad host permissions, unsafe CSP, service-worker lifecycle assumptions, deprecated executeScript APIs, and missing declarativeNetRequest validation
parents:
  - index.md
covers:
  - manifest_version 2 shipped when V3 is required
  - "host_permissions set to <all_urls> without justification"
  - web_accessible_resources exposing sensitive files or wildcards
  - content_security_policy containing unsafe-inline or unsafe-eval
  - "Content scripts using eval / innerHTML / new Function"
  - Persistent background page pattern ported to MV3 service worker
  - "Service worker assumes long-lived state (globals, timers) across suspensions"
  - chrome.tabs.executeScript used instead of chrome.scripting.executeScript
  - declarativeNetRequest rules not validated or exceeding rule quota
  - externally_connectable missing or allowing any origin
  - "chrome.storage.sync quota violations (8KB item, 100KB total)"
  - chrome.runtime.sendMessage without response handler or error handling
tags:
  - browser-extension
  - manifest-v3
  - chrome
  - firefox
  - edge
  - service-worker
  - csp
  - declarativeNetRequest
  - host-permissions
activation:
  file_globs:
    - "**/manifest.json"
    - "**/background.js"
    - "**/background.ts"
    - "**/service_worker.js"
    - "**/content_script.js"
    - "**/content_scripts/**"
    - "**/extension/**"
  keyword_matches:
    - chrome.runtime
    - chrome.tabs
    - chrome.storage
    - chrome.scripting
    - chrome.declarativeNetRequest
    - browser.runtime
    - manifest_version
    - service_worker
    - host_permissions
    - web_accessible_resources
    - content_security_policy
    - externally_connectable
  structural_signals:
    - manifest_v2_in_new_extension
    - unsafe_inline_csp
    - host_permissions_all_urls
source:
  origin: file
  path: browser-extensions-mv3.md
  hash: "sha256:2abcd017b3e878460d389c18aff7dc0dd90680ffe174ca2cf475b3bd469d8879"
---
# Browser Extensions (Manifest V3)

## When This Activates

Activates when diffs touch extension manifests, background/service-worker scripts, content scripts, or declarativeNetRequest rule files. Manifest V3 changed the security model: persistent background pages became event-driven service workers, blocking webRequest gave way to declarativeNetRequest, and remote code execution was banned. Extensions written for V2 fail subtly when ported, and over-broad permissions or CSP relaxations turn extensions into supply-chain vulnerabilities for every site the user visits. This reviewer enforces MV3 discipline on Chrome, Edge, and Firefox (browser.* alias).

## Audit Surface

- [ ] manifest_version is 2 (deprecated; Chrome Web Store no longer accepts V2)
- [ ] host_permissions includes <all_urls> or similarly broad patterns without narrower alternative
- [ ] web_accessible_resources exposes sensitive files or uses wildcard paths
- [ ] content_security_policy contains unsafe-inline or unsafe-eval
- [ ] Content script or background uses eval, new Function, or setTimeout(string)
- [ ] innerHTML assignment from page-controlled data
- [ ] Persistent background page pattern (background.persistent: true)
- [ ] Service worker assumes long-lived globals or timers
- [ ] chrome.tabs.executeScript or chrome.tabs.insertCSS (MV2 APIs)
- [ ] declarativeNetRequest rule count or dynamic rule quota not checked
- [ ] externally_connectable missing or permits arbitrary origins
- [ ] chrome.storage.sync writes exceed QUOTA_BYTES_PER_ITEM
- [ ] chrome.runtime.sendMessage without response / error handling

## Detailed Checks

### Manifest Version and Permissions
<!-- activation: keywords=["manifest_version", "manifest", "permissions", "host_permissions", "optional_permissions", "<all_urls>"] -->

- [ ] **manifest_version: 2**: flag any new or modified extension still on V2 -- Chrome Web Store stopped accepting V2 submissions and is removing V2 extensions. Plan migration; minor patches to V2 extensions should be called out.
- [ ] **Broad host_permissions**: flag `<all_urls>`, `*://*/*`, or `http://*/*` in host_permissions when the extension's documented functionality can be narrowed to specific origins. Use `optional_host_permissions` with runtime request where feasible.
- [ ] **Permission inflation**: flag `tabs`, `cookies`, `history`, `webNavigation`, `debugger`, or `management` declared in manifest without matching usage in code -- each unused permission expands attack surface and can block store review.
- [ ] **activeTab not preferred**: flag host_permissions granted when `activeTab` would suffice (user-initiated invocation only) -- activeTab narrows exposure dramatically.

### Content Security Policy and Remote Code
<!-- activation: keywords=["content_security_policy", "unsafe-inline", "unsafe-eval", "eval", "new Function", "setTimeout", "innerHTML", "outerHTML"] -->

- [ ] **unsafe-inline / unsafe-eval in extension CSP**: flag any CSP relaxation in `content_security_policy.extension_pages` -- MV3 forbids remote code execution and inline handlers. Rework the code to avoid inline scripts and eval.
- [ ] **eval / new Function in any extension script**: flag direct eval, `new Function()`, or `setTimeout(stringArg, ...)` in background, content, or popup scripts -- these are blocked by default MV3 CSP and indicate a design that will not pass review.
- [ ] **innerHTML from external data**: flag `element.innerHTML = page.someString` or `insertAdjacentHTML` with values derived from the DOM of the host page or from network responses -- DOM XSS inside the extension context is privileged access. Use `textContent`, `document.createElement`, or a sanitiser (see `sec-xss-dom`).
- [ ] **Remotely hosted code**: flag imports, fetches, or evals of JavaScript from URLs not bundled with the extension -- MV3 explicitly prohibits executing remote code.

### Service Worker Lifecycle
<!-- activation: keywords=["service_worker", "background", "persistent", "setInterval", "setTimeout", "global", "state", "chrome.alarms"] -->

- [ ] **background.persistent or background.scripts**: flag MV2 background definitions -- MV3 uses `background.service_worker`. Direct port without lifecycle changes leaks across reviews.
- [ ] **Top-level state expected to persist**: flag globals, caches, or `setInterval` in the service worker whose state is assumed to survive -- service workers are suspended after ~30s idle and all memory is lost. Persist in `chrome.storage`.
- [ ] **setTimeout/setInterval over 30s**: flag long timers in the service worker -- they will not fire after suspension. Use `chrome.alarms` for scheduled work.
- [ ] **Listeners registered inside async callbacks**: flag `chrome.runtime.onMessage.addListener` / `chrome.tabs.onUpdated.addListener` registered inside a `then()` or `await` callback -- MV3 requires top-level registration so the wake-up event fires the listener.

### Scripting and Messaging APIs
<!-- activation: keywords=["chrome.tabs.executeScript", "chrome.tabs.insertCSS", "chrome.scripting", "chrome.runtime.sendMessage", "sendNativeMessage", "externally_connectable"] -->

- [ ] **chrome.tabs.executeScript / insertCSS**: flag MV2 APIs still in use -- MV3 requires `chrome.scripting.executeScript` / `insertCSS` with the `scripting` permission.
- [ ] **sendMessage without response handling**: flag `chrome.runtime.sendMessage` / `tabs.sendMessage` calls with no callback or `.catch` -- service-worker suspension and receiver absence both surface as errors that must be handled.
- [ ] **externally_connectable missing or wide open**: flag extensions that message with web pages (via `chrome.runtime.connect` in a page) without `externally_connectable.matches` restricting allowed origins -- any page can send messages otherwise. `<all_urls>` here is essentially always wrong.

### declarativeNetRequest Rules
<!-- activation: keywords=["declarativeNetRequest", "updateDynamicRules", "updateSessionRules", "rule_resources", "MAX_NUMBER_OF_DYNAMIC_RULES", "webRequest"] -->

- [ ] **Rule quota not considered**: flag `updateDynamicRules` or `updateSessionRules` calls without checking against `MAX_NUMBER_OF_DYNAMIC_RULES` / `MAX_NUMBER_OF_SESSION_RULES` -- extensions silently fail when quota is exceeded.
- [ ] **Static rules not validated**: flag `rule_resources` entries without lint/schema validation in CI -- malformed JSON rules fail to load at install time with no functional fallback.
- [ ] **Blocking webRequest in MV3**: flag `webRequest.onBeforeRequest` with `{ blocking }` -- MV3 removed blocking webRequest for regular extensions; use declarativeNetRequest instead.

### Storage and web_accessible_resources
<!-- activation: keywords=["chrome.storage", "storage.sync", "storage.local", "QUOTA_BYTES", "web_accessible_resources"] -->

- [ ] **storage.sync quota violations**: flag writes to `chrome.storage.sync` over 8KB per item or 100KB total without fallback to `storage.local` -- writes silently fail when quota is hit.
- [ ] **web_accessible_resources wildcards**: flag `"resources": ["*"]` or broad globs -- exposes internal scripts to any page and enables fingerprinting. Enumerate only the files that truly need to be page-reachable.
- [ ] **web_accessible_resources without matches**: flag entries lacking a `matches` array (MV3 format) -- MV3 requires specifying which origins can load the resource; omitting it may behave as any-origin on some browsers.

## Common False Positives

- **Development builds**: local-only test extensions may legitimately use `<all_urls>` for debugging. Flag only if the manifest is shipping to the store.
- **Enterprise-managed extensions**: policies sometimes require broad host_permissions; call out, do not block, when manifest is intended for managed deployment.
- **content_security_policy for sandbox pages**: `content_security_policy.sandbox` allows unsafe-eval for true sandboxed iframes; this rule targets `extension_pages`, not `sandbox`.

## Severity Guidance

| Finding | Severity |
|---|---|
| manifest_version 2 in new extension | Critical |
| unsafe-inline or unsafe-eval in extension_pages CSP | Critical |
| Remotely hosted code (fetch and eval) | Critical |
| innerHTML assignment from page-controlled data | Critical |
| host_permissions <all_urls> without justification | Important |
| web_accessible_resources with wildcard or no matches | Important |
| externally_connectable missing or allowing any origin | Important |
| Service worker assumes long-lived globals / timers | Important |
| chrome.tabs.executeScript (MV2 API) in use | Important |
| declarativeNetRequest quota not checked | Important |
| chrome.runtime.sendMessage without error handling | Minor |
| storage.sync writes without quota check | Minor |

## See Also

- `sec-xss-dom` -- extension content scripts and popups are DOM XSS targets with elevated privilege
- `sec-owasp-a05-misconfiguration` -- over-broad permissions and CSP relaxations are classic misconfigurations
- `sec-secrets-management-and-rotation` -- extensions bundling API keys leak them to any user who unpacks the CRX

## Authoritative References

- [Chrome, "Migrating to Manifest V3"](https://developer.chrome.com/docs/extensions/develop/migrate)
- [Chrome, "Manifest V3 overview"](https://developer.chrome.com/docs/extensions/reference/manifest)
- [Chrome, "Service worker lifecycle"](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle)
- [Chrome, "declarativeNetRequest"](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [MDN, "WebExtensions manifest.json"](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json)
- [Mozilla, "Extension security best practices"](https://extensionworkshop.com/documentation/develop/build-a-secure-extension/)
