---
id: plural-locale
type: index
depth_role: subcategory
depth: 1
focus: "Address format assumed US: no province, rigid postal code format, required state; Alphabetic-only name validation rejecting hyphens, apostrophes, spaces, diacritics; Antimeridian crossing not handled; BOM (byte order mark) not stripped, causing invisible leading characters"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: domain-maps-geo-postgis-h3-geohash
    file: domain-maps-geo-postgis-h3-geohash.md
    type: primary
    focus: Detect coordinate swaps, SRID mismatches, missing spatial indexes, and incorrect distance calculations in geospatial code
    tags:
      - PostGIS
      - H3
      - geohash
      - geo
      - spatial
      - GeoJSON
      - SRID
      - WGS84
      - coordinate
      - distance
      - polygon
      - latitude
      - longitude
      - maps
  - id: footgun-encoding-unicode-normalization
    file: footgun-encoding-unicode-normalization.md
    type: primary
    focus: Detect string comparison without Unicode normalization, mixed encoding assumptions, BOM handling issues, surrogate pair breakage, and homoglyph attack surfaces
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
  - id: footgun-name-address-phone-format-assumptions
    file: footgun-name-address-phone-format-assumptions.md
    type: primary
    focus: Detect overly strict validation of personal names, addresses, and phone numbers that rejects valid real-world data
    tags:
      - validation
      - i18n
      - names
      - addresses
      - phone
      - email
      - format-assumptions
      - inclusivity
  - id: i18n-l10n-architecture
    file: i18n-l10n-architecture.md
    type: primary
    focus: "Detect i18n/l10n architecture gaps -- hardcoded strings, concatenated messages, missing ICU plural rules, absent fallback chains, RTL/locale oversights, and unsynchronised translation catalogues"
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
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Plural Locale

**Focus:** Address format assumed US: no province, rigid postal code format, required state; Alphabetic-only name validation rejecting hyphens, apostrophes, spaces, diacritics; Antimeridian crossing not handled; BOM (byte order mark) not stripped, causing invisible leading characters

## Children

| File | Type | Focus |
|------|------|-------|
| [domain-maps-geo-postgis-h3-geohash.md](domain-maps-geo-postgis-h3-geohash.md) | 📄 primary | Detect coordinate swaps, SRID mismatches, missing spatial indexes, and incorrect distance calculations in geospatial code |
| [footgun-encoding-unicode-normalization.md](footgun-encoding-unicode-normalization.md) | 📄 primary | Detect string comparison without Unicode normalization, mixed encoding assumptions, BOM handling issues, surrogate pair breakage, and homoglyph attack surfaces |
| [footgun-name-address-phone-format-assumptions.md](footgun-name-address-phone-format-assumptions.md) | 📄 primary | Detect overly strict validation of personal names, addresses, and phone numbers that rejects valid real-world data |
| [i18n-l10n-architecture.md](i18n-l10n-architecture.md) | 📄 primary | Detect i18n/l10n architecture gaps -- hardcoded strings, concatenated messages, missing ICU plural rules, absent fallback chains, RTL/locale oversights, and unsynchronised translation catalogues |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
