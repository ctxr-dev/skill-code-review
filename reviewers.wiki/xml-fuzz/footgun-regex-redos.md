---
id: footgun-regex-redos
type: primary
depth_role: leaf
focus: Detect catastrophic backtracking in regex patterns, user-controlled regex input, and missing regex execution timeouts
parents:
  - index.md
covers:
  - "Nested quantifiers causing exponential backtracking (e.g., (a+)+, (a|a)+)"
  - "Overlapping alternations with quantifiers (e.g., (a|ab)* on 'aaa...b')"
  - User-controlled regex pattern compiled and executed without sanitization
  - Exponential time on crafted input causing denial of service
  - Missing regex execution timeout or match limit
  - Possessive quantifiers or atomic groups not used where backtracking is unnecessary
  - "Star-height > 1 patterns in server-side input validation"
tags:
  - regex
  - ReDoS
  - backtracking
  - denial-of-service
  - performance
  - CWE-1333
  - CWE-400
activation:
  file_globs:
    - "**/*.{js,ts,py,rb,java,kt,go,rs,cs,php,scala,perl}"
  keyword_matches:
    - regex
    - regexp
    - RegExp
    - re.compile
    - Pattern.compile
    - match
    - search
    - test
    - replace
    - Regex
    - "/.*"
    - "/(.+)+"
    - "/(.*)+"
    - Pattern
    - preg_match
    - Regexp
  structural_signals:
    - Regex pattern applied to user-supplied input
    - Input validation using regex
    - User-supplied pattern compiled as regex
source:
  origin: file
  path: footgun-regex-redos.md
  hash: "sha256:0daca066566718038515576ff859873ceaf55e05e59148a8e53b72a26a4c9e22"
---
# Regex ReDoS Footguns

## When This Activates

Activates when diffs add or modify regular expressions, especially those applied to user input for validation, parsing, or search. ReDoS (Regular Expression Denial of Service) exploits the backtracking behavior of NFA-based regex engines (used in JavaScript, Python, Java, Ruby, C#, PHP, Perl). A carefully crafted input string can cause exponential or polynomial time complexity, freezing a single thread for minutes or hours. A single vulnerable regex in an HTTP request handler can take down an entire service. This is not theoretical: Cloudflare, Stack Overflow, and Atom editor have all suffered ReDoS incidents.

## Audit Surface

- [ ] Regex pattern with nested quantifiers: (X+)+, (X*)+, (X+)*, (X*)*
- [ ] Regex with overlapping alternation under quantifier: (a|a)+, (ab|a)+
- [ ] Regex with quantified group followed by overlapping suffix: (a+)a
- [ ] User input passed directly to RegExp constructor or re.compile
- [ ] Regex execution without timeout on untrusted input strings
- [ ] Validation regex applied to unbounded-length user input
- [ ] Regex . with * or + not anchored, applied to multi-line input
- [ ] Backreference in quantified group: (a+)\1+
- [ ] Email, URL, or HTML regex with complex alternation patterns
- [ ] Regex compiled from configuration file or database without review
- [ ] Server-side regex validation on request body without size limit

## Detailed Checks

### Nested Quantifiers (CWE-1333)
<!-- activation: keywords=["(.*)+", "(.+)+", "(.*)*", "(.+)*", "(a+)+", "(a*)+", "nested", "quantifier", "backtrack", "exponential"] -->

- [ ] **Star-height > 1**: flag any pattern where a quantified group contains a quantified element: `(a+)+`, `(a*)*`, `(a+)*`, `(.*)+`. These create exponential backtracking when the engine tries to partition the input among the inner and outer quantifiers. On input `"aaa...a!"` (N a's followed by a non-matching character), the engine tries 2^N partitions
- [ ] **Overlapping alternation with quantifier**: flag `(a|ab)*`, `(a|a)*`, `(\s+|\s)*` -- the engine cannot decide which alternative consumes each character and backtracks exponentially. Rewrite to eliminate overlap: `(ab?)*` or `\s+`
- [ ] **Quantified group with overlapping suffix**: flag `(a+)a`, `(\w+)\w`, `(.+).` -- the engine cannot determine where the group ends and the suffix begins, causing polynomial backtracking. Use atomic group `(?>a+)a` or possessive quantifier `a++a` if supported

### User-Controlled Regex (CWE-400)
<!-- activation: keywords=["RegExp", "new RegExp", "re.compile", "Pattern.compile", "Regex(", "regex", "pattern", "filter", "search", "query"] -->

- [ ] **User input as regex pattern**: flag `new RegExp(userInput)`, `re.compile(user_input)`, `Pattern.compile(userInput)`. A malicious user can submit a pathological pattern causing exponential backtracking. Escape the input (`re.escape()`, `Pattern.quote()`) or use a fixed set of allowed patterns
- [ ] **User input in regex without escaping**: flag regex constructed by concatenation: `new RegExp("^" + userInput + "$")`. Special regex characters in the input change the pattern semantics. `.` becomes wildcard, `+` becomes quantifier, `(` opens a group
- [ ] **Config/database-sourced regex**: flag regex patterns loaded from configuration files or database rows without static analysis or runtime timeout. A typo or malicious edit can introduce a pathological pattern

### Missing Timeout and Bounds (CWE-400)
<!-- activation: keywords=["timeout", "limit", "cancel", "deadline", "maxLength", "size", "length", "bound"] -->

- [ ] **No regex timeout**: Java's `Pattern.matcher()`, .NET's `Regex`, and Python's `re` module do not have built-in timeouts by default. Flag regex execution on untrusted input without: `.NET Regex(pattern, options, timeout)`, Java interruptible thread, or input length limit. Go's `regexp` package uses RE2 (linear time) and is safe
- [ ] **Unbounded input length**: flag regex applied to input with no length limit. Even mildly complex patterns become dangerous on megabyte-length strings. Enforce a maximum input length before regex evaluation
- [ ] **Regex in hot path without RE2**: flag complex regex in request-critical paths (HTTP handlers, middleware) in languages using backtracking engines. Consider RE2 (Google) or rust `regex` crate which guarantee linear time

### Safe Alternatives
<!-- activation: keywords=["possessive", "atomic", "RE2", "re2", "linear", "DFA", "non-backtracking"] -->

- [ ] **Possessive quantifier available but not used**: if the regex engine supports possessive quantifiers (`a++`, `\d++`), flag patterns where backtracking is unnecessary but the standard greedy quantifier is used. Possessive quantifiers prevent backtracking once matched, eliminating ReDoS for that subpattern
- [ ] **Atomic group available but not used**: `(?>...)` prevents backtracking into the group. Flag nested quantifier patterns in engines that support atomic groups (Java, PCRE, .NET) where converting to atomic group would eliminate the vulnerability
- [ ] **Linear-time engine available**: Go, Rust, and RE2 bindings guarantee linear time by construction. Flag use of backtracking engine (PCRE, Python re) for security-critical regex when a linear-time alternative is available

## Common False Positives

- **Go regexp package**: Go's `regexp` uses RE2 which is linear-time by construction. Nested quantifiers in Go regex are safe (though RE2 does not support backreferences).
- **Rust regex crate**: Rust's default `regex` crate is also linear-time. Safe unless `fancy_regex` (backtracking) is used.
- **Short, bounded input**: a pattern like `(a+)+` on an input guaranteed to be < 20 characters is technically vulnerable but not exploitable in practice.
- **Possessive/atomic patterns**: `(a++)b` or `(?>a+)b` with possessive or atomic groups do not backtrack and are safe despite appearing to have nested quantifiers.
- **Compiled once, matched against known-good data**: regex applied to internal/trusted data (log parsing, code analysis) has lower risk than regex on user input.

## Severity Guidance

| Finding | Severity |
|---|---|
| User-controlled regex pattern compiled without sanitization | Critical |
| Nested quantifiers in regex applied to untrusted input in HTTP handler | Critical |
| Overlapping alternation under quantifier on user input | Critical |
| Email/URL validation regex with ReDoS-vulnerable pattern | Important |
| Regex on untrusted input without timeout or length limit | Important |
| Config-sourced regex without static analysis | Minor |
| Mildly complex regex on bounded-length input (< 100 chars) | Minor |

## See Also

- `sec-rate-limit-and-dos` -- ReDoS is a denial-of-service vector; rate limiting provides defense in depth
- `footgun-resource-exhaustion-via-input` -- ReDoS is a form of CPU exhaustion via input
- `sec-owasp-a03-injection` -- user-controlled regex is a form of injection

## Authoritative References

- [CWE-1333: Inefficient Regular Expression Complexity](https://cwe.mitre.org/data/definitions/1333.html)
- [OWASP: Regular Expression Denial of Service](https://owasp.org/www-community/attacks/Regular_expression_Denial_of_Service_-_ReDoS)
- [James C. Davis et al.: The Impact of Regular Expression Denial of Service (ReDoS) in Practice](https://doi.org/10.1145/3236024.3236027)
- [Google RE2: Linear Time Regular Expression Matching](https://github.com/google/re2)
- [Cloudflare Outage Post-Mortem (2019): ReDoS in WAF Rule](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/)
