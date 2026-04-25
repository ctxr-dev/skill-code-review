---
id: footgun-bidi-rtl-locale-collation
type: primary
depth_role: leaf
focus: Detect bidirectional text rendering hazards, locale-dependent sorting and case-folding bugs, and collation-unaware uniqueness constraints
parents:
  - index.md
covers:
  - RTL text mixed with LTR without directional markers, causing garbled display or spoofing
  - "Bidi override characters (U+202E) used to disguise file extensions or URLs"
  - Locale-dependent sorting producing inconsistent ordering across servers
  - "Turkish İ/i case-folding bug: toLowerCase in Turkish locale maps I to ı, not i"
  - "Number formatting locale mismatch: 1.000 means 1000 in Germany but 1.0 in US"
  - Collation-unaware UNIQUE constraints allowing duplicates or rejecting valid entries
  - "String.compareTo() vs Collator.compare() producing different sort orders"
  - Case-insensitive comparison using toLowerCase instead of locale-aware fold
tags:
  - bidi
  - RTL
  - locale
  - collation
  - i18n
  - l10n
  - case-folding
  - Turkish-I
  - CWE-838
activation:
  file_globs:
    - "**/*locale*"
    - "**/*i18n*"
    - "**/*l10n*"
    - "**/*collat*"
    - "**/*sort*"
    - "**/*intl*"
  keyword_matches:
    - locale
    - Locale
    - collation
    - collate
    - COLLATE
    - toLowerCase
    - toUpperCase
    - toLower
    - toUpper
    - casefold
    - Collator
    - Intl
    - bidi
    - rtl
    - ltr
    - direction
    - NumberFormat
    - DecimalFormat
    - NumberFormatter
    - Locale.ROOT
    - Locale.ENGLISH
    - tr_TR
    - Turkish
  structural_signals:
    - Text comparison or sorting on user-supplied multilingual data
    - UI rendering text with mixed scripts or directionality
    - Number parsing from locale-dependent formatted strings
source:
  origin: file
  path: footgun-bidi-rtl-locale-collation.md
  hash: "sha256:c643dc15dc5738872a531f43dd330ef365da0d932e58fbcf2f56e447d3c6858f"
---
# Bidi/RTL Text, Locale, and Collation Footguns

## When This Activates

Activates when diffs render user-supplied text in UI, sort or compare strings in a locale-sensitive context, parse numbers or dates from formatted strings, or apply case transformations without explicit locale. Bidirectional text (Arabic, Hebrew mixed with Latin) renders in counterintuitive orders without proper isolation, enabling spoofing of filenames and URLs. Locale-dependent operations (sorting, case folding, number formatting) produce silently different results on servers configured with different locales. The Turkish "I" problem alone has caused production outages in systems as large as .NET Framework itself.

## Audit Surface

- [ ] User-supplied text rendered without dir="auto" or explicit bidi isolation
- [ ] Filename or URL displayed without stripping bidi override characters
- [ ] String sort using default compareTo or < operator on locale-sensitive data
- [ ] toLowerCase() or toUpperCase() called without explicit locale parameter
- [ ] Number parsed from string without specifying locale (comma vs dot decimal)
- [ ] Database UNIQUE constraint on text column without specifying collation
- [ ] Case-insensitive search using LOWER() instead of ILIKE or collation
- [ ] Locale set from user preference but not validated against supported set
- [ ] Alphabetical ordering assumed for non-Latin scripts
- [ ] Currency or date formatted without explicit locale
- [ ] Collation mismatch between application sort and database sort
- [ ] Bidi control characters not stripped from security-critical strings

## Detailed Checks

### Bidirectional Text Spoofing
<!-- activation: keywords=["bidi", "rtl", "ltr", "direction", "dir=", "U+202E", "U+202D", "U+2066", "U+2069", "override", "isolate", "RLO", "LRO"] -->

- [ ] **Bidi override in filenames or URLs**: the Right-to-Left Override character (U+202E) reverses display order. A file named `invoice\u202Efdp.exe` displays as `invoiceexe.pdf` -- appearing safe while being executable. Flag user-supplied filenames, URLs, or display strings without stripping bidi override characters (U+202A-202E, U+2066-2069)
- [ ] **Missing bidi isolation in HTML**: flag user text inserted into HTML without `dir="auto"` or `<bdi>` element. An RTL username next to LTR text can reorder adjacent punctuation and numbers, changing meaning (e.g., a price appearing negative)
- [ ] **Bidi in source code**: bidi override characters in source code comments or string literals can make code appear to do the opposite of what it actually does (Trojan Source attack, CVE-2021-42574). Flag bidi control characters in source files

### Case Folding and the Turkish I Problem
<!-- activation: keywords=["toLowerCase", "toUpperCase", "toLower", "toUpper", "lower()", "upper()", "casefold", "equalsIgnoreCase", "ILIKE", "ci", "case_insensitive"] -->

- [ ] **toLowerCase without locale**: Java's `"TITLE".toLowerCase()` uses the default JVM locale. In Turkish locale (`tr_TR`), `'I'.toLowerCase()` produces `'ı'` (dotless i, U+0131), not `'i'`. This breaks protocol keywords, HTTP headers, and enum matching. Use `Locale.ROOT` or `Locale.ENGLISH` for machine-readable strings
- [ ] **Case-insensitive comparison via lowercasing**: flag `a.toLowerCase() == b.toLowerCase()` for locale-sensitive strings. German `'ß'.toUpperCase()` is `'SS'`, so `'straße' != 'STRASSE'` under naive case-insensitive comparison. Use locale-aware case folding (`str.casefold()` in Python, `Collator` in Java)
- [ ] **SQL LOWER() for case-insensitive search**: `WHERE LOWER(name) = LOWER(input)` inherits the database locale. Use `ILIKE` (PostgreSQL), `COLLATE NOCASE` (SQLite), or a case-insensitive collation on the column

### Number and Date Formatting Locale
<!-- activation: keywords=["NumberFormat", "DecimalFormat", "parseFloat", "parseInt", "parseDouble", "comma", "decimal", "separator", "thousand", "grouping", "format", "Intl.NumberFormat"] -->

- [ ] **Locale-dependent number parsing**: `Double.parseDouble("1.000")` returns `1.0` in English locale but `parseDouble` fails or returns `1000.0` in German locale where `.` is the grouping separator. Flag parsing numbers from user or external input without specifying the expected locale
- [ ] **Comma as decimal separator**: in many European locales, `1,5` means 1.5, not `15` or an error. Flag number input fields or APIs that do not specify the expected format and locale
- [ ] **Formatted numbers in logs or data exchange**: flag `String.format("%.2f", amount)` without `Locale.ROOT` in code that writes to logs, CSV, or data exchange formats. A server in Germany writes `1234,56` which breaks downstream parsing

### Collation-Unaware Uniqueness and Sorting
<!-- activation: keywords=["UNIQUE", "unique", "COLLATE", "collation", "sort", "order", "ORDER BY", "compareTo", "compare", "Collator", "localeCompare", "sorted"] -->

- [ ] **UNIQUE constraint without collation**: a UNIQUE constraint on a text column with default binary collation treats `'resume'` and `'résumé'` as different but `'A'` and `'a'` as different. With `utf8_general_ci`, accented variants may collide. Flag unique constraints without documented collation choice
- [ ] **Application sort vs database sort mismatch**: if the application sorts with `Collator.getInstance(Locale.FRENCH)` but the database uses `ORDER BY name COLLATE "C"`, paginated results have inconsistent ordering. Ensure sort order is defined in one place
- [ ] **Default string comparison for sorting**: Java's `String.compareTo()`, JavaScript's `<` operator, and Python's `<` compare by code point value, not linguistic order. `'ä'` sorts after `'z'` by code point but before `'b'` in German. Use `Collator` (Java), `localeCompare` (JS), or `locale.strxfrm` (Python)

## Common False Positives

- **Machine-readable identifiers**: lowercasing ASCII-only protocol keywords, HTTP methods, or enum names with `Locale.ROOT` is correct and does not need locale-aware folding.
- **Internal sorting for determinism**: using code point ordering (`Collator` with `IDENTICAL` strength or `COLLATE "C"`) for internal deterministic ordering (e.g., canonical JSON serialization) is intentional.
- **English-only product with no i18n plan**: if the product explicitly does not support non-English input and documents this, locale issues are lower severity. Still flag if user input is accepted.
- **Bidi characters in legitimate RTL content**: Arabic and Hebrew text naturally contains bidi formatting. Only flag bidi override/control characters, not the text directionality itself.

## Severity Guidance

| Finding | Severity |
|---|---|
| Bidi override characters not stripped from filenames or URLs (spoofing) | Critical |
| Bidi override in source code (Trojan Source) | Critical |
| toLowerCase without Locale.ROOT on protocol/keyword matching | Important |
| Number parsing from external input without locale specification | Important |
| UNIQUE constraint on text without documented collation strategy | Important |
| Missing dir="auto" or bidi isolation on user text in HTML | Minor |
| Application sort and database sort using different collation | Minor |
| Formatted numbers in data exchange using default locale | Minor |
| Alphabetical sort using default string comparison on multilingual data | Minor |

## See Also

- `footgun-encoding-unicode-normalization` -- normalization is prerequisite for correct collation
- `sec-owasp-a03-injection` -- bidi override characters can disguise injection payloads
- `footgun-name-address-phone-format-assumptions` -- locale affects name and address formatting
- `footgun-pluralization-cldr` -- locale affects plural forms and number placement

## Authoritative References

- [Unicode Standard Annex #9: Unicode Bidirectional Algorithm](https://unicode.org/reports/tr9/)
- [CVE-2021-42574: Trojan Source -- Invisible Vulnerabilities](https://trojansource.codes/)
- [Unicode Technical Standard #10: Unicode Collation Algorithm](https://unicode.org/reports/tr10/)
- [Turkey Test: Why Your toLowerCase is Broken](https://blog.codinghorror.com/whats-wrong-with-turkey/)
- [ICU Collation Documentation](https://unicode-org.github.io/icu/userguide/collation/)
