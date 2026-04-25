---
id: footgun-name-address-phone-format-assumptions
type: primary
depth_role: leaf
focus: Detect overly strict validation of personal names, addresses, and phone numbers that rejects valid real-world data
parents:
  - index.md
covers:
  - "Name validation too strict: no spaces, length limits, ASCII-only rejecting valid names"
  - "Single name field instead of given/family or unstructured full name"
  - "First/last name assumed to exist (mononyms, patronymics, multiple family names)"
  - "Address format assumed US: no province, rigid postal code format, required state"
  - Phone validation regex rejecting valid international formats
  - "Email validation too strict: rejecting plus addressing, long TLDs, IDN domains"
  - "Name length minimum (2 chars) rejecting real single-character names"
  - Alphabetic-only name validation rejecting hyphens, apostrophes, spaces, diacritics
tags:
  - validation
  - i18n
  - names
  - addresses
  - phone
  - email
  - format-assumptions
  - inclusivity
activation:
  file_globs:
    - "**/*name*"
    - "**/*address*"
    - "**/*phone*"
    - "**/*contact*"
    - "**/*profile*"
    - "**/*register*"
    - "**/*signup*"
    - "**/*user*"
    - "**/*customer*"
    - "**/*form*"
  keyword_matches:
    - firstName
    - lastName
    - first_name
    - last_name
    - given_name
    - family_name
    - fullName
    - full_name
    - address
    - street
    - city
    - state
    - zip
    - zipCode
    - postal
    - postalCode
    - phone
    - telephone
    - mobile
    - email
    - name
    - validation
    - regex
    - pattern
    - required
    - minLength
    - maxLength
  structural_signals:
    - User registration or profile form
    - Contact information collection
    - Address validation logic
source:
  origin: file
  path: footgun-name-address-phone-format-assumptions.md
  hash: "sha256:31d3464d026a6fc7b9f53b5a86129f6944cbc994e1cc1c02dd254c1bcaaa0105"
---
# Name, Address, and Phone Format Assumption Footguns

## When This Activates

Activates when diffs define or validate personal names, mailing addresses, phone numbers, or email addresses. The core danger: developers encode assumptions from their own cultural context into validation rules. "Everyone has a first and last name" (mononyms exist: Sukarno, Pelé). "Names contain only letters" (O'Brien, Al-Rashid, Mary-Jane, 小林). "Addresses have a street number" (many countries use building names, not numbers). "Phone numbers are 10 digits" (international numbers range from 5 to 15 digits). These false assumptions silently reject real people from using the system.

## Audit Surface

- [ ] Name regex restricting to [A-Za-z] or ASCII only
- [ ] Name minimum length > 1 character
- [ ] Required first/last name fields without alternative
- [ ] Address form requiring US-style fields for international use
- [ ] Postal code validation with hardcoded format
- [ ] Phone regex rejecting valid international formats
- [ ] Email validation more restrictive than RFC 5321
- [ ] Name field rejecting Unicode characters
- [ ] Address requiring street number as numeric field
- [ ] Country-specific validation applied globally
- [ ] Title field with limited options (Mr/Mrs/Ms)
- [ ] Required middle name field
- [ ] Name sort assuming family-name-last

## Detailed Checks

### Name Validation (Falsehoods About Names)
<!-- activation: keywords=["name", "Name", "firstName", "lastName", "first_name", "last_name", "given", "family", "fullName", "display_name", "regex", "pattern", "validate"] -->

- [ ] **ASCII-only name validation**: flag regex like `^[A-Za-z]+$` or `^[a-zA-Z\s]+$` on name fields. This rejects: José, Müller, O'Brien, Bjørk, 田中, Абрамов, and billions of people with non-ASCII names. At minimum, allow Unicode letters (`\p{L}`) plus hyphens, apostrophes, spaces, and periods
- [ ] **Minimum length too restrictive**: flag `minLength: 2` or higher on name fields. Real single-character names exist: Chinese given names (佳), Korean names, and legal mononyms. If a minimum is needed, use 1
- [ ] **Maximum length too restrictive**: flag `maxLength` under 50 characters on name fields. Some legal names are very long (Wolfeschlegelsteinhausenbergerdorff is a real German surname). Use 100+ or the database column width
- [ ] **Required first + last name**: flag forms that mandate both given name and family name with no alternative. Mononymous individuals (Sukarno, Madonna), people with single legal names, and many Indonesian and Icelandic naming conventions do not fit this model. Provide a single "full name" field or make last name optional
- [ ] **Name order assumed Western**: flag systems that sort or display names as "first last" without locale awareness. Chinese, Japanese, Korean, and Hungarian conventions place family name first. Store names in a locale-neutral way and format for display based on locale
- [ ] **Restricted characters in names**: flag rejection of hyphens (Mary-Jane), apostrophes (O'Brien), spaces (van der Berg), periods (St. John), or diacritics (Renée). All of these appear in legal names

### Address Validation
<!-- activation: keywords=["address", "street", "city", "state", "zip", "zipCode", "postal", "postalCode", "country", "province", "region", "line1", "line2"] -->

- [ ] **US-format address assumed**: flag address forms with required "State" dropdown (instead of province/region), "ZIP Code" with 5-digit validation, or "Street address" requiring a street number. International addresses use province, prefecture, county, or no subdivision at all. UK has counties, Japan has prefectures, many countries have no equivalent
- [ ] **Hardcoded postal code format**: flag postal code validation like `^\d{5}$` (US) or `^[A-Z]\d[A-Z] \d[A-Z]\d$` (Canada). UK uses "SW1A 1AA" format, India uses 6 digits, Ireland uses Eircode (7 chars), and some countries have no postal codes at all. Validate only after determining the country
- [ ] **Required street number**: flag separate required numeric field for street number. Many addresses worldwide use building names, lot numbers, or descriptive locations (e.g., "next to the blue mosque"). Use a free-text address line
- [ ] **Country-specific validation applied globally**: flag validation rules (required state, numeric postal code) applied before or without checking the country field. Validate per-country or use a permissive free-text address with optional structured fields

### Phone Number Validation
<!-- activation: keywords=["phone", "telephone", "mobile", "cell", "tel", "phoneNumber", "phone_number", "dial", "call", "sms"] -->

- [ ] **Restrictive phone regex**: flag `^\d{10}$`, `^\(\d{3}\) \d{3}-\d{4}$`, or similar US-centric phone validation. International phone numbers range from 5 digits (some Pacific islands) to 15 digits (ITU E.164 maximum). They may include country codes (+1, +44, +91), extensions (ext. 123), and spaces or hyphens as formatting. Use a phone parsing library (libphonenumber) with E.164 normalization
- [ ] **Country code not accepted**: flag phone validation that rejects leading + or country codes. Users with international numbers cannot register. Accept and normalize to E.164 format
- [ ] **10-digit assumption**: flag code that strips formatting then validates length === 10. Indian mobile numbers are 10 digits but landlines are 8-11. UK numbers are 10-11 digits. Chinese numbers are 11 digits

### Email Validation
<!-- activation: keywords=["email", "e-mail", "mail", "Email", "validate", "regex", "pattern", "@"] -->

- [ ] **Overly strict email regex**: flag email validation that rejects: plus addressing (user+tag@example.com), long TLDs (.museum, .photography), internationalized domain names (user@例え.jp), quoted local parts ("user name"@example.com), or dots in local parts. The full email spec (RFC 5321/5322) allows far more than most regexes handle. Use a library or validate only basic structure (contains @, domain part has dots)
- [ ] **TLD validation against hardcoded list**: flag validation that checks TLD against a hardcoded list. New TLDs are created regularly. The only reliable check is that the domain resolves (and even that can be deferred)
- [ ] **Case-sensitive local part comparison**: the local part of an email address (before @) is technically case-sensitive per RFC 5321, but in practice, almost all mail servers treat it as case-insensitive. Flag code that rejects "User@example.com" when "user@example.com" is on file, but also flag code that assumes case sensitivity for deduplication

### Title/Salutation and Gender
<!-- activation: keywords=["title", "salutation", "prefix", "Mr", "Mrs", "Ms", "Dr", "gender", "sex", "honorific"] -->

- [ ] **Binary title/gender options**: flag title fields limited to Mr/Mrs/Ms or gender fields limited to Male/Female. Include at minimum: Mx, Dr, and a free-text/other option. Some jurisdictions legally recognize non-binary gender
- [ ] **Required title or gender**: flag mandatory title or gender fields when they are not legally required for the operation. Most e-commerce, SaaS, and social applications do not need this information

## Common False Positives

- **Internal systems with known user base**: internal employee systems where all users are in one country with known name formats have lower risk. Still flag if the company is multinational.
- **Regulatory requirements**: KYC (Know Your Customer), tax forms, and legal documents may require specific name fields mandated by law. Flag as advisory with suggestion to document the legal requirement.
- **Legacy database constraints**: if an existing database column is VARCHAR(50) and cannot be migrated, the validation matches the storage constraint. Flag as technical debt with migration suggestion.
- **Bot/spam prevention**: some name restrictions (minimum length, character restrictions) are intended to prevent spam accounts. Suggest alternative spam prevention that does not exclude real people.

## Severity Guidance

| Finding | Severity |
|---|---|
| ASCII-only name validation on international-facing application | Important |
| Required first + last name with no alternative in registration | Important |
| Phone validation rejecting valid international numbers | Important |
| US-format address assumed for international users | Important |
| Email regex rejecting valid RFC 5321 addresses | Important |
| Hardcoded postal code format without country check | Minor |
| Name minimum length > 1 | Minor |
| Title/salutation limited to Mr/Mrs/Ms | Minor |
| Name order assumed Western in display logic | Minor |

## See Also

- `footgun-encoding-unicode-normalization` -- name validation must handle Unicode correctly
- `footgun-bidi-rtl-locale-collation` -- name display in RTL locales
- `footgun-pluralization-cldr` -- locale-aware formatting of user-facing messages containing names
- `sec-owasp-a03-injection` -- name and address fields are injection surfaces; validation should sanitize, not restrict charset

## Authoritative References

- [Patrick McKenzie: Falsehoods Programmers Believe About Names](https://www.kalzumeus.com/2010/06/17/falsehoods-programmers-believe-about-names/)
- [Google libphonenumber: Phone number parsing and validation](https://github.com/google/libphonenumber)
- [Frank's Compulsive Guide to Postal Addresses](http://www.columbia.edu/~fdc/postal/)
- [W3C: Personal Names Around the World](https://www.w3.org/International/questions/qa-personal-names)
- [ITU-T E.164: International Telephone Numbering Plan](https://www.itu.int/rec/T-REC-E.164)
- [RFC 5321: Simple Mail Transfer Protocol](https://www.rfc-editor.org/rfc/rfc5321)
