---
id: antipattern-magic-numbers-strings
type: primary
depth_role: leaf
focus: Detect unexplained literal values embedded in logic with no named constant, enum, or documentation
parents:
  - index.md
covers:
  - "Numeric literals in conditionals (if status == 3) with no named constant or comment"
  - String literals used as identifiers or keys repeated across multiple files
  - Hardcoded timeout, retry, and buffer size values buried in business logic
  - HTTP status codes written as bare numbers instead of named constants
  - "Hardcoded array or collection indices (items[2]) with no explanation"
  - "Magic boolean parameters at call sites (doThing(true, false, true))"
  - Regex patterns embedded inline without a comment or named constant explaining their purpose
  - Hardcoded file paths or URLs in business logic instead of configuration
  - Numeric thresholds in business rules with no domain explanation
  - Repeated string keys for map lookups or event names with no single source of truth
  - Bit masks and flag values written as raw hex or decimal literals
  - "Date and time constants (86400, 3600, 1440) without named durations"
tags:
  - magic-number
  - magic-string
  - literal
  - constant
  - readability
  - correctness
  - naming
  - anti-pattern
activation:
  file_globs:
    - "*"
  keyword_matches:
    - if
    - else
    - switch
    - case
    - match
    - ==
    - "!="
    - ">="
    - <=
    - ">"
    - <
    - return
    - const
    - final
    - static
  structural_signals:
    - numeric_literal_in_conditional
    - string_literal_in_comparison
    - repeated_literal
    - boolean_argument
source:
  origin: file
  path: antipattern-magic-numbers-strings.md
  hash: "sha256:7f9ae85d7ca0cb1c2ac273edf5b0dcf1b4659bb0bd5d4db51f5edec5793f3b98"
---
# Magic Numbers and Strings

## When This Activates

Always active. Magic numbers and strings are unexplained literal values embedded directly in logic -- a `3` in a conditional, a `"pending"` repeated across five files, a `30000` timeout buried in a retry loop. The problem is not the literal itself but the missing *why*: when a reader encounters `if (retries > 3)`, they cannot tell whether 3 is a business requirement, a performance tuning, a protocol constraint, or an arbitrary choice. This reviewer detects literals that should be extracted into named constants, enums, or configuration -- not to enforce mechanical extraction of every `0` and `1`, but to catch values whose meaning is invisible without context.

## Audit Surface

- [ ] Numeric literal other than 0, 1, -1 used in a conditional expression or comparison
- [ ] String literal used as a map key, event name, or identifier in 2+ locations
- [ ] Hardcoded timeout, sleep, delay, or retry count value in non-configuration code
- [ ] HTTP status code written as a bare number (200, 404, 500) outside a constants file
- [ ] Array or collection access by hardcoded index other than 0 (items[2], row[7])
- [ ] Boolean literal passed as a positional argument at a call site (fn(true, false))
- [ ] Regex pattern longer than 10 characters with no accompanying comment or named constant
- [ ] Hardcoded file path, URL, or URI in business logic
- [ ] Numeric threshold in a business rule with no constant name or comment explaining the value
- [ ] Bit mask, flag, or permission value as a raw hex or decimal literal
- [ ] Date/time duration as raw seconds or milliseconds (86400, 3600000) without a named constant
- [ ] Hardcoded port number, IP address, or hostname in non-configuration code
- [ ] Repeated identical numeric or string literal appearing 3+ times in the same file
- [ ] Conversion factor or mathematical constant embedded inline without naming
- [ ] Error code or status enum value written as a raw integer in a switch/match/if chain

## Detailed Checks

### Numeric Literals in Conditionals and Business Rules
<!-- activation: keywords=["if", "else", "switch", "case", "match", "when", "==", "!=", ">=", "<=", ">", "<", "return"] -->

- [ ] **Status/state comparisons**: flag `if (status == 3)` or `case 7:` where an integer represents a domain state -- extract to an enum or named constant (`ORDER_SHIPPED = 3`)
- [ ] **Threshold values**: flag numeric comparisons in business rules (`if (amount > 10000)`, `if (age >= 18)`, `if (score < 0.75)`) where the threshold has domain meaning -- extract to a named constant with documentation of the rule's origin
- [ ] **Error code checks**: flag raw integer comparisons against error codes or exit codes (`if (exitCode == 137)`, `if (err.code == 11000)`) -- these are opaque without a constant name
- [ ] **Retry and loop bounds**: flag hardcoded loop limits in retry logic (`for i in range(5)`, `while attempts < 3`) -- extract to a configurable constant so the value can be tuned without editing logic
- [ ] **Off-by-one magnets**: flag comparisons using non-obvious bounds (`if (index >= 7)`, `buffer[:256]`) where the boundary value has no explanation -- these are especially dangerous because a reader cannot verify correctness without knowing the intent

### Hardcoded Infrastructure Values
<!-- activation: keywords=["timeout", "sleep", "delay", "retry", "port", "host", "url", "http", "https", "path", "file", "socket", "connect"] -->

- [ ] **Timeout and delay values**: flag hardcoded milliseconds or seconds in timeout, sleep, or delay calls (`setTimeout(fn, 30000)`, `time.sleep(5)`, `ctx.WithTimeout(10 * time.Second)`) -- extract to a named constant or configuration entry
- [ ] **Port numbers and addresses**: flag hardcoded port numbers (`listen(8080)`), IP addresses (`"10.0.0.1"`), or hostnames in business logic -- these belong in configuration
- [ ] **File paths and URLs**: flag hardcoded file paths (`"/tmp/cache/data.json"`) or URLs (`"https://api.example.com/v2/"`) in business logic -- these should come from configuration or environment variables
- [ ] **Buffer and capacity sizes**: flag hardcoded buffer sizes (`new byte[4096]`), capacity hints (`make(chan int, 100)`), or page sizes (`limit=50`) embedded in logic -- extract to named constants with justification comments
- [ ] **HTTP status codes**: flag bare numeric HTTP status codes in handler logic (`res.status(200)`, `if resp.StatusCode == 404`) -- use framework constants or define named constants (`HTTP_NOT_FOUND = 404`)

### Repeated String Literals
<!-- activation: keywords=["\"", "'", "key", "name", "type", "status", "event", "role", "action", "header"] -->

- [ ] **Map keys and dictionary lookups**: flag string literals used as map keys in 2+ places (`data["user_type"]`, `config["user_type"]`) -- extract to a constant so typos become compile-time or static-analysis errors
- [ ] **Event names and action types**: flag string literals used as event identifiers, Redux action types, or message topics repeated across files -- a single typo creates a silent failure
- [ ] **Role and permission strings**: flag hardcoded role names (`"admin"`, `"moderator"`) or permission strings scattered through authorization checks -- extract to an enum or constants module
- [ ] **Header names and content types**: flag repeated header strings (`"Content-Type"`, `"Authorization"`) in HTTP handling code -- use framework constants or a shared header constants object
- [ ] **Status and state strings**: flag string-based status values (`"pending"`, `"completed"`, `"failed"`) used in comparisons across files -- these should be enums or named constants to prevent drift between producers and consumers

### Boolean and Positional Argument Opacity
<!-- activation: keywords=["true", "false", "True", "False", "null", "nil", "None", "(", ","] -->

- [ ] **Boolean arguments at call sites**: flag calls like `createUser(name, email, true, false)` where boolean positional arguments are opaque -- the reader cannot determine what `true` and `false` control without reading the function signature. Prefer named parameters, enums, or builder patterns
- [ ] **Multiple boolean parameters**: flag function definitions accepting 2+ boolean parameters -- callers will produce unreadable call sites. Consider introducing an options object or enum flags
- [ ] **Null/nil as sentinel**: flag `null`, `nil`, or `None` passed as a positional argument to indicate "use default" -- prefer an overload, optional parameter, or builder method
- [ ] **Hardcoded index access**: flag array access by hardcoded index beyond 0 (`row[3]`, `parts[2]`, `argv[4]`) -- if the index has meaning, destructure into named variables or use a typed structure

### Regex and Encoding Patterns
<!-- activation: keywords=["regex", "regexp", "re.", "match", "test", "pattern", "replace", "sub(", "gsub", "encode", "decode"] -->

- [ ] **Unexplained regex**: flag regex patterns longer than 10 characters used inline without a comment or named constant (`if re.match(r'^[A-Z]{2}\d{6}[A-Z]$', code)`) -- extract to a named pattern with a comment describing what it matches and why
- [ ] **Encoding magic numbers**: flag character encoding constants as raw numbers (`0xFEFF` BOM, `0x0A` newline) without named constants -- these are invisible to anyone unfamiliar with the encoding
- [ ] **Format strings with embedded structure**: flag format strings containing hardcoded field widths, precision, or structure (`"%08d-%04d"`) without documentation of the format's purpose or origin

## Common False Positives

- **Mathematical identities and idioms**: `0`, `1`, `-1`, `2` in arithmetic expressions (`i + 1`, `n / 2`, `index - 1`) are universally understood. Do not flag simple increment/decrement, halving, or zero-initialization.
- **Language-required literals**: array initialization (`new int[0]`), default returns (`return 0`), and loop starts (`for i := 0`) are idiomatic. Flag only when the literal has domain meaning beyond its syntactic role.
- **Test data and fixtures**: test files legitimately use literal values as test inputs and expected outputs. Flag only when test literals represent magic values that are also magic in production code (e.g., the test asserts `status == 3` without explaining what 3 means).
- **Enum definitions and constant declarations**: the file that *defines* the named constant (`const MAX_RETRIES = 3`) is not a magic number -- it is the fix. Flag only when the literal appears in logic without such a declaration nearby.
- **Standard protocol values**: well-known constants like HTTP methods (`"GET"`, `"POST"`), MIME types (`"application/json"`), or SQL keywords are effectively named by convention. Flag only when they appear in a context where extraction would improve clarity or reduce repetition.
- **Configuration files**: YAML, JSON, TOML, and other configuration files are *where* literal values belong. Do not flag literals in configuration files unless they are duplicated without a single source of truth.

## Severity Guidance

| Finding | Severity |
|---|---|
| Hardcoded credential, secret, or API key in source code | Critical |
| Business rule threshold with no named constant and no comment explaining the value | Critical |
| Status/error code as raw integer in a conditional with no constant or enum | Important |
| String literal used as identifier/key repeated across 3+ files with no shared constant | Important |
| Hardcoded timeout/retry value in production logic with no configuration path | Important |
| Boolean positional arguments making call site unreadable (2+ booleans) | Important |
| Hardcoded file path or URL in business logic | Important |
| HTTP status code as bare number in handler logic | Minor |
| Regex pattern without explanatory comment or name | Minor |
| Hardcoded array index beyond 0 without destructuring | Minor |
| Date/time duration as raw number with an adjacent comment explaining it | Minor |
| Repeated literal appearing 2 times in the same file (3+ is Important) | Minor |

## See Also

- `principle-naming-and-intent` -- magic values violate naming-and-intent by hiding the purpose of a value behind its representation
- `smell-primitive-obsession` -- magic strings often indicate that a domain concept (status, role, event type) is represented as a raw primitive instead of a proper type
- `principle-feature-flags-and-config` -- hardcoded infrastructure values (timeouts, URLs, thresholds) should be externalized into configuration
- `principle-fail-fast` -- magic string comparisons fail silently on typos; enums and constants enable compile-time or startup-time validation
- `antipattern-copy-paste` -- magic values are frequently copy-pasted, leading to divergence when one copy is updated but others are not
- `principle-encapsulation` -- extracting magic values into named constants is a form of encapsulating the "what" behind the "why"

## Authoritative References

- [Robert C. Martin, *Clean Code* (2008), Chapter 17: Smells and Heuristics -- G25: Replace Magic Numbers with Named Constants](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, *Refactoring* (2nd ed., 2018), "Replace Magic Literal"](https://refactoring.com/catalog/replaceMagicLiteral.html)
- [Steve McConnell, *Code Complete* (2nd ed., 2004), Chapter 12.1: Numbers in General -- avoiding magic numbers](https://www.oreilly.com/library/view/code-complete-2nd/0735619670/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 36: Use EnumSet Instead of Bit Fields](https://www.oreilly.com/library/view/effective-java/9780134686097/)
