---
id: footgun-encoding-unicode-normalization
type: primary
depth_role: leaf
focus: Detect string comparison without Unicode normalization, mixed encoding assumptions, BOM handling issues, surrogate pair breakage, and homoglyph attack surfaces
parents:
  - index.md
covers:
  - "String equality comparison without NFC/NFD normalization (e accent vs e + combining accent)"
  - "Mixed encoding assumptions: UTF-8 data processed as Latin-1 or vice versa"
  - "BOM (byte order mark) not stripped, causing invisible leading characters"
  - Surrogate pair split by substring or truncation, producing invalid UTF-16
  - "Grapheme cluster vs code point confusion: flag emoji is 2+ code points"
  - "Homoglyph attack: Cyrillic 'а' (U+0430) vs Latin 'a' (U+0061) in identifiers or URLs"
  - Length validation on code units instead of grapheme clusters
  - "Encoding mismatch at system boundary (DB, file, HTTP, message queue)"
  - "Double encoding: UTF-8 bytes re-encoded as UTF-8"
  - Null byte in string causing C-style truncation in non-C languages
tags:
  - unicode
  - encoding
  - normalization
  - UTF-8
  - homoglyph
  - surrogate
  - BOM
  - CWE-176
  - CWE-838
activation:
  file_globs:
    - "**/*encoding*"
    - "**/*unicode*"
    - "**/*charset*"
    - "**/*i18n*"
    - "**/*l10n*"
    - "**/*locale*"
  keyword_matches:
    - encoding
    - charset
    - UTF-8
    - UTF8
    - utf8
    - latin1
    - ASCII
    - unicode
    - Unicode
    - normalize
    - NFC
    - NFD
    - NFKC
    - NFKD
    - BOM
    - surrogate
    - grapheme
    - codepoint
    - decode
    - encode
    - UnicodeDecodeError
    - MalformedInputException
    - TextDecoder
    - TextEncoder
  structural_signals:
    - String comparison on user-supplied or externally-sourced text
    - "File or network I/O without explicit encoding specification"
    - Username, email, or URL validation
source:
  origin: file
  path: footgun-encoding-unicode-normalization.md
  hash: "sha256:9cf448fc12f007a5d34c850cfef87da2f0e5814ac43a26b73484ea9fb10da0e5"
---
# Encoding, Unicode, and Normalization Footguns

## When This Activates

Activates when diffs compare, validate, truncate, or persist user-supplied text, read files without explicit encoding, or process identifiers (usernames, emails, URLs) that may contain non-ASCII characters. Unicode has multiple ways to represent the same visible character: "e" (U+00E9) vs "e" + combining acute (U+0065 U+0301) are visually identical but byte-different. Without normalization, equality checks, uniqueness constraints, and deduplication silently fail. Encoding mismatches corrupt data at every system boundary. Homoglyphs enable phishing and impersonation attacks that bypass naive string checks.

## Audit Surface

- [ ] String comparison (==, equals, ===) on user-supplied text without normalization
- [ ] File read without specifying encoding, relying on platform default
- [ ] HTTP response without Content-Type charset, assuming client matches server
- [ ] Substring or truncation at byte offset instead of character or grapheme boundary
- [ ] String length used for validation checking code units instead of grapheme clusters
- [ ] Database column charset mismatch (latin1 table storing UTF-8 bytes)
- [ ] BOM not handled when reading CSV, JSON, or config files
- [ ] User input displayed or stored without homoglyph detection
- [ ] URL or domain name with mixed-script characters not flagged
- [ ] Encoding conversion without error handling (replace vs strict vs ignore)
- [ ] Base64 decode output assumed to be UTF-8 without validation
- [ ] Regex . or \w not matching multi-code-point graphemes
- [ ] Double-encoded sequences (%25C3%25A9 instead of %C3%A9)

## Detailed Checks

### Normalization-Blind Comparison (CWE-176)
<!-- activation: keywords=["compare", "equals", "==", "===", "normalize", "NFC", "NFD", "NFKC", "NFKD", "canonical", "equivalent", "unicodedata"] -->

- [ ] **Equality without normalization**: flag `==` or `.equals()` on user-supplied strings (usernames, search queries, file names) without first applying Unicode normalization (NFC recommended). "cafe\u0301" != "caf\u00e9" at the byte level despite being visually identical
- [ ] **Unique constraint without normalization**: flag database UNIQUE constraints or application-level deduplication on text columns without normalizing before storage. Two users named "Rene\u0301" and "Ren\u00e9" would both be allowed, creating duplicates
- [ ] **NFKC vs NFC choice**: NFC preserves visual form; NFKC maps compatibility characters (e.g., "fi" ligature to "fi"). Use NFC for display-preserving comparison, NFKC for security-sensitive canonicalization (usernames, identifiers). Flag missing rationale for the chosen form

### Encoding Mismatch at Boundaries (CWE-838)
<!-- activation: keywords=["encoding", "charset", "decode", "encode", "UTF-8", "latin1", "ISO-8859", "cp1252", "ascii", "open(", "read", "write", "Content-Type"] -->

- [ ] **File opened without encoding**: Python 2/3 `open()` without `encoding=` uses the platform default (varies by OS). Java `FileReader` without charset uses JVM default. Flag file I/O without explicit encoding specification
- [ ] **Latin-1 data treated as UTF-8**: Latin-1 (ISO-8859-1) encodes every byte as a valid character; UTF-8 multi-byte sequences misinterpreted as Latin-1 produce mojibake (e.g., "caf\u00c3\u00a9" instead of "cafe"). Flag charset detection by assumption
- [ ] **Database charset mismatch**: MySQL `latin1` default column receiving UTF-8 application data stores raw bytes that corrupt on retrieval. Flag `CHARACTER SET latin1` on columns storing user text
- [ ] **HTTP response missing charset**: HTTP `Content-Type: text/html` without `; charset=utf-8` lets browsers guess, producing garbled text for non-ASCII content

### Surrogate Pairs and Truncation
<!-- activation: keywords=["substring", "substr", "slice", "truncat", "charAt", "charCodeAt", "codePointAt", "length", "surrogate", "emoji", "grapheme"] -->

- [ ] **Splitting surrogate pairs**: JavaScript strings are UTF-16. Characters outside BMP (emoji, CJK extensions) are two code units (surrogate pair). `str.substring(0, str.length - 1)` on a string ending with an emoji can produce an unpaired surrogate -- invalid UTF-16. Use `Array.from(str)` or `Intl.Segmenter` for grapheme-safe slicing
- [ ] **String length vs display length**: `"👨‍👩‍👧‍👦".length` is 11 in JavaScript (surrogate pairs + ZWJ). Flag length validation using `.length` for user-facing limits -- use grapheme cluster count (`Intl.Segmenter` or ICU `BreakIterator`)
- [ ] **Truncation corrupting multi-byte UTF-8**: cutting a UTF-8 byte array at an arbitrary offset can split a multi-byte sequence, producing invalid UTF-8. Flag byte-level truncation of UTF-8 data

### BOM and Invisible Characters
<!-- activation: keywords=["BOM", "byte order mark", "FEFF", "zero-width", "ZWNJ", "ZWJ", "invisible", "whitespace", "trim", "strip"] -->

- [ ] **BOM not stripped from file input**: UTF-8 BOM (EF BB BF) at the start of CSV, JSON, or config files causes parsing failures or invisible leading characters. JSON parsers reject BOM. Flag file readers that do not strip BOM
- [ ] **Zero-width characters in user input**: zero-width space (U+200B), zero-width non-joiner (U+200C), and other invisible characters can bypass input validation, create visually identical but distinct usernames, or break tokenization. Flag user-input paths that do not filter or normalize invisible characters

### Homoglyph and Confusable Detection (CWE-176)
<!-- activation: keywords=["username", "domain", "URL", "phishing", "spoof", "impersonat", "confusable", "IDN", "punycode", "homoglyph"] -->

- [ ] **Mixed-script identifiers**: Cyrillic "а" (U+0430) is visually identical to Latin "a" (U+0061). Flag user-facing identifiers (usernames, display names, URLs) that permit mixed scripts without confusable detection. Use Unicode TR39 confusable detection or restrict to single-script identifiers
- [ ] **IDN homograph in URLs**: internationalized domain names can use visually similar characters (xn-- punycode). Flag URL validation that does not apply IDN homograph checks or display punycode for mixed-script domains

## Common False Positives

- **Internal identifiers**: machine-generated IDs (UUIDs, hash hex strings) are ASCII-only by construction and do not need normalization.
- **Binary data handling**: code processing binary payloads (images, protobuf, compressed data) is not text and does not need encoding specification.
- **English-only systems**: systems explicitly documented as ASCII-only (internal tools with no i18n requirement) have lower risk, but flag if they accept external user input.
- **Explicit encoding already set**: if the encoding is specified at a higher layer (HTTP server config, database connection string), per-file specification may be redundant.

## Severity Guidance

| Finding | Severity |
|---|---|
| Homoglyph attack surface in usernames or URLs without confusable detection | Critical |
| Username uniqueness constraint without Unicode normalization | Important |
| File read without encoding in code processing user-uploaded files | Important |
| Surrogate pair split in user-facing string truncation | Important |
| Database column charset mismatch (latin1 storing UTF-8) | Important |
| String comparison without normalization on user-supplied text | Important |
| BOM not stripped from parsed config/data files | Minor |
| Length validation using code units instead of grapheme clusters | Minor |
| Missing charset in HTTP Content-Type header | Minor |

## See Also

- `sec-owasp-a03-injection` -- encoding mismatches can enable injection bypasses
- `footgun-bidi-rtl-locale-collation` -- bidirectional text and locale-dependent collation
- `sec-rate-limit-and-dos` -- homoglyph attacks for account impersonation

## Authoritative References

- [Unicode Standard Annex #15: Unicode Normalization Forms](https://unicode.org/reports/tr15/)
- [Unicode Technical Report #36: Unicode Security Considerations](https://unicode.org/reports/tr36/)
- [Unicode Technical Standard #39: Unicode Security Mechanisms](https://unicode.org/reports/tr39/)
- [CWE-176: Improper Handling of Unicode Encoding](https://cwe.mitre.org/data/definitions/176.html)
- [OWASP: Unicode Encoding](https://owasp.org/www-community/attacks/Unicode_Encoding)
