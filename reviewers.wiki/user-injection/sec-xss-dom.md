---
id: sec-xss-dom
type: primary
depth_role: leaf
focus: Detect DOM-based Cross-Site Scripting where user-controlled data flows into dangerous browser APIs without sanitization.
parents:
  - index.md
covers:
  - "innerHTML/outerHTML assignment with user-controlled data"
  - document.write and document.writeln with user input
  - "eval(), Function(), setTimeout(string), setInterval(string) with user-controlled strings"
  - location.hash, location.search, location.href parsed and injected into DOM unsanitized
  - postMessage handlers accepting data without origin validation
  - Client-side template injection in Angular, Vue, or string-based template engines
  - "jQuery .html(), .append(), .prepend() with untrusted data"
  - React dangerouslySetInnerHTML with user-controlled markup
  - Vue v-html directive binding user-provided content
  - "Angular [innerHTML] binding without DomSanitizer"
  - "URL parsing that fails to reject javascript: and data: schemes"
  - DOM clobbering via user-controlled id or name attributes
  - Sink functions in third-party libraries that insert raw HTML
tags:
  - xss
  - dom-xss
  - client-side
  - injection
  - browser-security
  - CWE-79
activation:
  file_globs:
    - "**/*.js"
    - "**/*.ts"
    - "**/*.jsx"
    - "**/*.tsx"
    - "**/*.vue"
    - "**/*.svelte"
    - "**/*.html"
  keyword_matches:
    - innerHTML
    - outerHTML
    - document.write
    - eval
    - location.hash
    - location.search
    - postMessage
    - dangerouslySetInnerHTML
    - v-html
    - "[innerHTML]"
    - jQuery
    - $.html
    - DOMParser
  structural_signals:
    - DOM sink assignment from user-derived source
    - URL fragment used in rendering logic
    - Message event handler without origin guard
source:
  origin: file
  path: sec-xss-dom.md
  hash: "sha256:dbd511a2ec4b67441f06a9a4579f8864794820d40575e23b49113fcabcc2cb97"
---
# DOM-Based Cross-Site Scripting (CWE-79)

## When This Activates

Activates when diffs touch client-side JavaScript, TypeScript, or framework template files that read user-controlled DOM sources (URL fragments, query parameters, postMessage data, window.name) and write to DOM sinks (innerHTML, document.write, eval, href attributes). DOM XSS is entirely client-side -- the malicious payload never reaches the server, making server-side WAFs ineffective.

## Audit Surface

- [ ] innerHTML or outerHTML assigned from any variable derived from user input or URL fragments
- [ ] document.write or document.writeln called with dynamic content
- [ ] eval(), new Function(), setTimeout(string), setInterval(string) with non-literal arguments
- [ ] location.hash, location.search, location.href, document.referrer read and used in DOM operations
- [ ] postMessage event handler missing event.origin check before processing data
- [ ] jQuery .html() called with anything other than a static string literal
- [ ] dangerouslySetInnerHTML prop receiving variable content without DOMPurify or equivalent
- [ ] Vue v-html directive bound to a reactive property sourced from user input
- [ ] Angular template using [innerHTML] without passing through DomSanitizer.bypassSecurityTrustHtml on validated content
- [ ] URL or href attribute set from user input without scheme validation (blocking javascript:, data:, vbscript:)
- [ ] DOMParser.parseFromString output inserted into the live DOM
- [ ] Template literal interpolation injected via innerHTML or equivalent sink
- [ ] Web Component shadowRoot.innerHTML set with external data
- [ ] window.name read and used in DOM operations (attacker-controlled cross-origin)
- [ ] Regex-based HTML sanitization instead of a proper parser-based sanitizer
- [ ] Trusted Types policy absent in CSP for applications using dangerous sinks
- [ ] Third-party widget or charting library receiving unsanitized user data for label/tooltip rendering

## Detailed Checks

### Source Identification
<!-- activation: keywords=["location.hash", "location.search", "location.href", "document.referrer", "window.name", "URLSearchParams", "document.URL", "document.documentURI"] -->

- [ ] **URL sources**: any read from `location.hash`, `location.search`, `location.href`, `document.URL`, `document.documentURI`, or `document.referrer` is flagged as a taint source -- trace every variable it flows into
- [ ] **URLSearchParams**: values extracted via `new URLSearchParams(location.search).get()` are user-controlled; track them to sinks
- [ ] **Fragment parsing**: custom parsing of `location.hash` (splitting on `#`, `/`, `=`) feeds attacker-controlled strings into application logic -- trace each substring
- [ ] **window.name**: readable cross-origin without restriction; any use beyond simple string comparison is suspect
- [ ] **document.referrer**: attacker can control the referring URL; do not use in DOM rendering

### Sink Analysis
<!-- activation: keywords=["innerHTML", "outerHTML", "document.write", "insertAdjacentHTML", "createContextualFragment"] -->

- [ ] **innerHTML/outerHTML**: direct assignment (`el.innerHTML = data`) is the classic DOM XSS sink; verify the data is sanitized with DOMPurify or equivalent
- [ ] **document.write / writeln**: these accept raw HTML; any dynamic argument is a sink
- [ ] **insertAdjacentHTML**: equivalent to innerHTML with positional control; same risk
- [ ] **Range.createContextualFragment**: parses HTML string into a DocumentFragment; scripts within execute on insertion
- [ ] **Element.setHTMLUnsafe** / **Element.setHTML**: `setHTMLUnsafe` bypasses sanitization; `setHTML` with the Sanitizer API is safer but verify configuration

### JavaScript Execution Sinks
<!-- activation: keywords=["eval", "Function", "setTimeout", "setInterval", "execScript", "msSetImmediate"] -->

- [ ] **eval()**: any non-literal argument to eval is a critical finding; even seemingly safe JSON parsing via eval is exploitable
- [ ] **new Function(string)**: equivalent to eval; constructing functions from user-controlled strings is a code injection vector
- [ ] **setTimeout/setInterval with string argument**: `setTimeout("alert(" + userInput + ")", 0)` executes as eval; only function references are safe
- [ ] **Script element injection**: creating a `<script>` element and setting its `textContent` or `src` from user data executes arbitrary code

### Framework-Specific Patterns
<!-- activation: keywords=["dangerouslySetInnerHTML", "v-html", "bypassSecurityTrustHtml", "Svelte", "{@html", "compile", "template"] -->

- [ ] **React dangerouslySetInnerHTML**: verify the `__html` value is sanitized with DOMPurify before assignment; presence of this prop on user-derived data is a finding
- [ ] **Vue v-html**: binds raw HTML; if the bound expression traces to user input, API response bodies, or URL parameters, flag it
- [ ] **Angular [innerHTML]**: Angular sanitizes by default, but `bypassSecurityTrustHtml()` disables sanitization -- verify the input to bypass is itself sanitized
- [ ] **Svelte {@html}**: renders raw HTML; no built-in sanitization; any use with dynamic data requires manual DOMPurify
- [ ] **Angular template compilation**: `$compile` (AngularJS) or dynamic component creation from user strings enables template injection

### postMessage Security
<!-- activation: keywords=["postMessage", "addEventListener", "message", "event.origin", "event.data"] -->

- [ ] **Origin validation**: every `message` event handler must check `event.origin` against an allowlist before processing `event.data`; missing origin check is a finding
- [ ] **Data validation**: even with origin checks, `event.data` should be schema-validated before use -- a compromised allowed origin could send malicious data
- [ ] **Wildcard target origin**: `postMessage(data, "*")` sends to any origin; use the specific target origin

### URL Scheme Injection
<!-- activation: keywords=["href", "src", "action", "javascript:", "data:", "location.assign", "location.replace", "window.open"] -->

- [ ] **javascript: scheme**: setting `element.href`, `window.location`, or `<a href>` from user input without blocking `javascript:` allows script execution on click or navigation
- [ ] **data: scheme**: `data:text/html` URLs can contain executable HTML/JavaScript; block in user-controlled URL contexts
- [ ] **Scheme validation**: verify URL inputs are validated against an allowlist of safe schemes (http:, https:, mailto:) rather than a denylist of dangerous ones
- [ ] **Relative URL resolution**: user-controlled relative paths can be crafted to resolve to `javascript:` in some contexts; use `new URL()` for safe resolution

### Sanitization Validation
<!-- activation: keywords=["DOMPurify", "sanitize", "purify", "xss", "escape", "encode", "Sanitizer"] -->

- [ ] **DOMPurify presence**: if the codebase uses dangerous sinks, verify DOMPurify (or the browser Sanitizer API) is used consistently at every sink, not just some
- [ ] **DOMPurify configuration**: custom `ALLOWED_TAGS` or `ALLOWED_ATTR` configurations that re-enable dangerous elements (script, iframe, object, embed, form, svg with event handlers)
- [ ] **Regex-based sanitization**: homegrown sanitizers using regex to strip tags are bypassable (mutation XSS, encoding tricks, nested tags); flag as a finding and recommend DOMPurify
- [ ] **Double encoding**: user data encoded once, then decoded before insertion, re-introduces the raw payload
- [ ] **Trusted Types enforcement**: for large applications, verify CSP includes `require-trusted-types-for 'script'` to enforce sanitization at the platform level

## Common False Positives

- **Static HTML strings**: `el.innerHTML = '<div class="spinner"></div>'` with a compile-time constant string is safe; no user data flows into the sink.
- **Server-rendered content re-inserted client-side**: if the server already HTML-encodes the value and the client reads from a data attribute, the double-encoding makes it safe. Verify the server-side encoding is robust.
- **Markdown-to-HTML with sanitized output**: libraries like `marked` with `sanitize: true` or post-processing with DOMPurify produce safe HTML. Verify the sanitizer is actually configured and applied.
- **Angular default sanitization**: Angular's built-in sanitizer handles [innerHTML] by default; only `bypassSecurityTrustHtml()` calls need scrutiny.
- **textContent / innerText assignments**: these set text, not HTML, and are safe from XSS regardless of input content.

## Severity Guidance

| Finding | Severity |
|---|---|
| eval() or new Function() with user-controlled argument | Critical |
| innerHTML/outerHTML set from URL fragment or query parameter without sanitization | Critical |
| postMessage handler missing origin validation, data used in DOM sink | Critical |
| dangerouslySetInnerHTML / v-html / {@html} with user-derived content, no DOMPurify | Critical |
| javascript: scheme not blocked in user-controlled href/src attributes | Critical |
| Regex-based HTML sanitization instead of DOMPurify | Important |
| DOMPurify used but with overly permissive ALLOWED_TAGS including script/iframe | Important |
| Trusted Types not enforced in CSP for application with multiple innerHTML sinks | Important |
| window.name used in rendering logic | Important |
| document.write with semi-static content that includes one interpolated variable | Minor |

## See Also

- `sec-xss-stored` -- stored XSS shares sinks but the source is the persistence layer rather than the URL
- `sec-xss-reflected` -- reflected XSS involves server-side reflection; DOM XSS is purely client-side
- `sec-clickjacking-and-headers` -- CSP frame-ancestors and Trusted Types complement DOM XSS defenses
- `sec-owasp-a03-injection` -- XSS is a subclass of injection attacks
- `principle-fail-fast` -- validate and reject untrusted input at the boundary, before it reaches a sink

## Authoritative References

- [OWASP DOM-Based XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [CWE-79: Improper Neutralization of Input During Web Page Generation](https://cwe.mitre.org/data/definitions/79.html)
- [PortSwigger - DOM-based XSS](https://portswigger.net/web-security/cross-site-scripting/dom-based)
- [DOMPurify - cure53](https://github.com/cure53/DOMPurify)
- [Trusted Types API (W3C)](https://w3c.github.io/trusted-types/dist/spec/)
- [Google - DOM XSS Sinks and Sources](https://security.googleblog.com/2021/03/dom-based-xss-prevention.html)
