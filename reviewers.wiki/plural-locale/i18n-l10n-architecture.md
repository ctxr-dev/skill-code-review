---
id: i18n-l10n-architecture
type: primary
depth_role: leaf
focus: "Detect i18n/l10n architecture gaps -- hardcoded strings, concatenated messages, missing ICU plural rules, absent fallback chains, RTL/locale oversights, and unsynchronised translation catalogues"
parents:
  - index.md
covers:
  - "Hardcoded English strings in UI without t()/trans()/__() wrapping"
  - "String concatenation to build messages (word-order hostile)"
  - "if/else branching on count instead of ICU plural rules"
  - "Date/number/currency formatting with hardcoded locale"
  - "RTL layout not considered (dir attribute, logical CSS properties)"
  - Missing fallback locale chain
  - "Per-user runtime locale loading (should be code-split/static)"
  - "Translation catalogues lacking translator context / descriptions"
  - "Plural categories missing for target locales (ar, ru, pl, cs)"
  - "Gendered strings not handled (grammatical gender selectors)"
  - Untranslated keys shipped to production
  - Locale switcher without URL or cookie persistence
  - No locale detection from Accept-Language or navigator.language
  - "Hardcoded English pluralization (item/items) that fails for other languages"
  - "Missing CLDR plural categories: zero, one, two, few, many, other"
  - Count interpolated into string without selecting appropriate plural form
  - "Ordinal pluralization ignored (1st, 2nd, 3rd, 4th -- rules vary by language)"
  - "RTL number placement: number position relative to noun differs by locale"
  - "Plural rule assumed binary (singular/plural) when language has more forms"
  - "Gender agreement interacting with plural form (Romance languages)"
tags:
  - i18n
  - l10n
  - gettext
  - icu
  - messageformat
  - plural
  - rtl
  - locale
  - fallback
  - translation
  - accept-language
  - pluralization
  - CLDR
  - ICU
  - MessageFormat
  - plural-rules
aliases:
  - footgun-pluralization-cldr
activation:
  file_globs:
    - "**/locales/**"
    - "**/translations/**"
    - "**/i18n/**"
    - "**/*.po"
    - "**/*.pot"
    - "**/*.xliff"
    - "**/*.xlf"
    - "**/messages/**"
    - "**/lang/**"
  keyword_matches:
    - i18n
    - l10n
    - gettext
    - ICU MessageFormat
    - formatMessage
    - FormattedMessage
    - "trans("
    - "t("
    - "__("
    - NGettext
    - Intl.
    - react-intl
    - vue-i18n
    - next-intl
    - formatjs
    - lingui
    - i18next
    - Accept-Language
  structural_signals:
    - hardcoded_ui_string
    - string_concat_message
    - plural_via_if_else
source:
  origin: file
  path: i18n-l10n-architecture.md
  hash: "sha256:8481a2c6dd3feed65aeb2f7f26d0c450905d88f3890b862aa41e0b07ddc2d79a"
---
# i18n / l10n Architecture

## When This Activates

Activates when diffs touch translation catalogues, locale configuration, message-formatting code, or UI strings in routes/templates. Internationalization decisions compound: a concatenated greeting works in English and breaks in Japanese; a two-branch plural works in French and fails in Arabic; a hardcoded `en-US` date on a server log leaks locale assumptions to every downstream dashboard. Most of the damage happens at the architecture level -- message shape, catalogue contract, fallback chain -- so this reviewer targets those rather than individual translations.

## Audit Surface

- [ ] Hardcoded UI strings not wrapped in a translation function
- [ ] Message built via concatenation or template literals with embedded data
- [ ] Plural handled via if/else instead of ICU `plural` / gettext ngettext
- [ ] Date / number / currency formatted with a hardcoded locale
- [ ] RTL not supported (no dir switch, no logical CSS properties)
- [ ] Missing fallback locale chain (fallbackLng / fallbackLocale)
- [ ] Locale bundles loaded per user at runtime (not code-split)
- [ ] Translation catalogue without translator context / descriptions
- [ ] Plural categories missing for target locales
- [ ] Gendered strings handled with hardcoded he/she branches
- [ ] Untranslated keys shipped to production
- [ ] Locale switcher without URL / cookie / localStorage persistence
- [ ] No locale negotiation from Accept-Language / navigator.language

## Detailed Checks

### Message Extraction and Wrapping
<!-- activation: keywords=["t(", "trans(", "__(", "formatMessage", "FormattedMessage", "i18n.t", "useTranslation", "$t"] -->

- [ ] **Hardcoded UI literal**: flag visible English strings in components, templates, email templates, notifications, or error messages not wrapped in a translation call (`t()`, `trans()`, `__()`, `<FormattedMessage>`). Include attributes like `aria-label`, `alt`, `title`, and `placeholder`.
- [ ] **String concatenation for messages**: flag `"Hello " + name` or `` `Hello ${name}` `` as message construction -- word order differs across languages. Use a single parameterised message: `t("hello_name", { name })`.
- [ ] **Interpolation in non-ICU libraries**: flag interpolation patterns that do not cover selectors and plurals (e.g., raw `sprintf` with no plural support) when the target locale set includes languages with 3+ plural forms.
- [ ] **Translation key collisions / reuse**: flag reusing a generic key (`"yes"`, `"submit"`) across contexts -- translators see no context and pick a default translation that is wrong in one of the callers. Either namespace keys or add `msgctxt`/description.

### Plurals, Gender, and Selectors
<!-- activation: keywords=["plural", "ngettext", "one", "other", "few", "many", "zero", "select", "gender", "CLDR"] -->

- [ ] **Plural via if/else**: flag UI code branching on `count === 1` / `count > 1` -- English-only split. Use ICU `plural` (`{count, plural, one {# item} other {# items}}`) or gettext `ngettext` (see `footgun-pluralization-cldr` for CLDR categories).
- [ ] **Missing plural categories**: flag ICU plural / gettext messages that define only `one` and `other` when target locales include `ru`, `ar`, `pl`, `cs`, or similar -- messages fall through to the `other` form with grammatical errors. Consult the CLDR plural rules per target locale.
- [ ] **Gendered strings with hardcoded branches**: flag `gender === 'female' ? ... : ...` in UI code -- use ICU `select` (`{gender, select, female {...} male {...} other {...}}`) and let translators map categories to their locale's grammatical gender system.

### Formatting and Locale Propagation
<!-- activation: keywords=["Intl.", "DateTimeFormat", "NumberFormat", "toLocaleString", "moment.locale", "dayjs.locale", "currency", "format"] -->

- [ ] **Hardcoded locale in formatting**: flag `new Intl.DateTimeFormat('en-US', ...)`, `toLocaleString('en-US')`, `dayjs.locale('en')` -- derive the locale from the user's current locale state.
- [ ] **Currency without locale**: flag currency formatting that fixes both locale and symbol (e.g., `$` prefix in the message) -- currency symbol placement and decimal/thousands separators are locale-dependent; use `Intl.NumberFormat(locale, { style: 'currency', currency })`.
- [ ] **Server-side formatting skips request locale**: flag server rendering or PDF/email generation that uses the process default locale rather than the request's negotiated locale -- user-specific rendering breaks.

### Fallback Chains and Missing Keys
<!-- activation: keywords=["fallbackLng", "fallbackLocale", "defaultLocale", "missingKeyHandler", "missing_translation", "saveMissing"] -->

- [ ] **No fallback locale chain**: flag i18n config without `fallbackLng` / `fallbackLocale` -- a missing key in the user's locale shows the raw key in production. Prefer chains (`['fr-CA', 'fr', 'en']`) over a single fallback.
- [ ] **Missing-key handler silent**: flag production builds that do not log or count missing-translation events -- you cannot triage catalogue gaps you do not see.
- [ ] **Untranslated keys shipped**: flag CI not running a "no untranslated strings in target locale" gate for at least the default-release locales -- shipping English in a French build is the most common complaint.

### RTL, Bidi, and Locale-aware Layout
<!-- activation: keywords=["dir=", "rtl", "ltr", "direction", "inline-start", "inline-end", "margin-inline", "padding-inline", "bidi"] -->

- [ ] **No dir switch for RTL locales**: flag UIs without `<html dir="...">` or equivalent dynamic dir attribute when the locale set includes Arabic, Hebrew, Persian, or Urdu -- layout mirrors partially or not at all.
- [ ] **Physical CSS properties only**: flag `margin-left`, `padding-right`, `left:`, `right:`, `text-align: left` in components that must mirror under RTL -- use logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`).
- [ ] **Bidi-sensitive data not isolated**: flag user-generated content (names, addresses) interpolated without bidi isolation (`<bdi>`, Unicode `U+2068`/`U+2069`) in RTL UIs -- see `footgun-bidi-rtl-locale-collation`.

### Catalogue Hygiene and Tooling
<!-- activation: keywords=["po", "pot", "xliff", "msgctxt", "description", "context", "translator", "extract", "saveMissing"] -->

- [ ] **No translator context**: flag `.po` / `.xliff` / `messages.json` entries without `msgctxt`, `description`, or screenshots for UI strings whose meaning is ambiguous without context -- translators guess and ship wrong translations.
- [ ] **Extraction diff missing in CI**: flag no CI step running `formatjs extract`, `i18next-parser`, or `xgettext` and diffing against the committed `.pot` -- catalogues drift silently from source.
- [ ] **Locale bundle loaded per user at runtime**: flag architectures that fetch the entire locale catalogue for the selected locale on every page load, or include all locales in every bundle -- code-split per locale and serve with appropriate caching.

### Locale Detection and Persistence
<!-- activation: keywords=["Accept-Language", "navigator.language", "cookie", "localStorage", "URL", "?lang=", "locale switcher"] -->

- [ ] **No Accept-Language negotiation**: flag server / SSR code that does not read `Accept-Language` (or the platform equivalent) for unauthenticated first-paint locale -- users land in English despite browser preferences.
- [ ] **Locale switcher without persistence**: flag switchers that change only component state -- reload drops the choice. Persist via URL segment, search param, cookie, or localStorage (SPA), with clear precedence.
- [ ] **URL locale not indexed by search engines**: flag locale-sensitive sites that serve all locales at one URL without `hreflang` alternates or locale-prefixed paths -- SEO collapses across locales.

## Common False Positives

- **Backend-only strings in logs / metrics**: log messages and metric labels are for engineers; they do not need translation. Flag only if the string is user-visible.
- **Developer-only admin UIs**: internal tools shipping only in English can skip extraction as long as that choice is explicit (documented in the i18n config).
- **ASCII code identifiers**: strings used as keys, feature flags, or event names are not UI text; extraction will yield noise.

## Severity Guidance

| Finding | Severity |
|---|---|
| Plural via if/else in shipped UI | Critical |
| Hardcoded English strings across user-visible screens | Critical |
| String concatenation to build user messages | Critical |
| Missing plural categories for target locales (ru, ar, pl) | Critical |
| No fallback locale chain (raw keys shown on miss) | Important |
| Hardcoded locale in date / currency formatting | Important |
| RTL locales without dir switch or logical properties | Important |
| Untranslated keys shipped to production | Important |
| Locale switcher not persisted across reloads | Important |
| Catalogue entries without translator context | Important |
| Extraction diff missing from CI | Important |
| No Accept-Language negotiation for first paint | Minor |
| Gendered strings via hardcoded he/she branches | Minor |

## See Also

- `footgun-pluralization-cldr` -- detailed CLDR plural categories and edge cases per locale
- `footgun-bidi-rtl-locale-collation` -- bidi isolation, RTL collation, and sort-order hazards
- `footgun-encoding-unicode-normalization` -- string comparison and normalization across scripts

## Authoritative References

- [Unicode CLDR Plural Rules](https://www.unicode.org/cldr/charts/latest/supplemental/language_plural_rules.html)
- [ICU MessageFormat (formatjs)](https://formatjs.github.io/docs/core-concepts/icu-syntax/)
- [MDN, "Intl namespace"](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [W3C, "Internationalization Techniques: Authoring HTML/CSS"](https://www.w3.org/International/techniques/)
- [MDN, "CSS Logical Properties"](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values)
- [RFC 5646, "Tags for Identifying Languages" (BCP 47)](https://www.rfc-editor.org/rfc/rfc5646)
- [Mozilla Fluent (asymmetric localization)](https://projectfluent.org/)
