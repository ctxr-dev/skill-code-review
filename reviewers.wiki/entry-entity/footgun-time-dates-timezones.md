---
id: footgun-time-dates-timezones
type: primary
depth_role: leaf
focus: Detect temporal logic bugs -- storing local time without timezone, unsafe cross-timezone comparisons, DST transition gaps, and wrong date arithmetic
parents:
  - index.md
covers:
  - Timestamp stored without timezone or offset, creating ambiguous instants
  - Date comparison across different timezones without normalizing to UTC first
  - "DST transition gap: 2 AM local time does not exist during spring-forward"
  - "DST fold: 1 AM local time occurs twice during fall-back"
  - Leap second not handled or assumed away in time-critical code
  - Date vs Instant vs LocalDateTime confusion in API or persistence boundaries
  - "Month arithmetic overflow: Jan 31 + 1 month silently becomes Feb 28 or March"
  - Year arithmetic on Feb 29 in leap year silently becomes Feb 28 in non-leap year
  - "Hardcoded UTC offset instead of IANA timezone (UTC+5:30 drifts with DST regions)"
  - Calendar system assumption -- Gregorian assumed when Hijri, Hebrew, or Buddhist calendar applies
  - "now() called multiple times in a transaction assuming identical values"
  - "Midnight does not exist in some timezones on some days (Brazil, etc.)"
tags:
  - datetime
  - timezone
  - DST
  - temporal
  - date-arithmetic
  - CWE-682
  - CWE-187
activation:
  file_globs:
    - "**/*date*"
    - "**/*time*"
    - "**/*calendar*"
    - "**/*schedule*"
    - "**/*cron*"
    - "**/*booking*"
  keyword_matches:
    - datetime
    - DateTime
    - Date
    - time
    - timezone
    - TimeZone
    - ZonedDateTime
    - Instant
    - LocalDate
    - LocalDateTime
    - OffsetDateTime
    - ZoneId
    - "now()"
    - utcnow
    - timedelta
    - Duration
    - Period
    - strftime
    - strptime
    - moment
    - dayjs
    - luxon
    - chrono
    - NaiveDateTime
    - DateTimeOffset
  structural_signals:
    - Datetime value stored or transmitted without timezone
    - Arithmetic on month or year component of a date
    - Scheduling logic referencing local wall-clock times
source:
  origin: file
  path: footgun-time-dates-timezones.md
  hash: "sha256:37e3564b2415237ce82cf0bdca0810af03676166e1bba35e2d7413d025fd6abe"
---
# Time, Dates, and Timezone Footguns

## When This Activates

Activates when diffs manipulate dates, times, or timestamps -- scheduling, persistence, duration calculation, or cross-timezone comparison. The core danger: temporal values are context-dependent. A "datetime" without a timezone is like a number without a unit. DST transitions create time values that do not exist (spring-forward gap) or exist twice (fall-back fold). Month arithmetic has no mathematically consistent answer. These bugs pass all tests in a single-timezone dev environment and break in production across timezone boundaries, on DST days, or at month/year edges.

## Audit Surface

- [ ] Datetime column or field with no timezone/offset annotation in schema or type
- [ ] new Date() / Date.now() / datetime.now() stored without explicit UTC conversion
- [ ] Datetime comparison using < > == across values that may have different timezones
- [ ] Scheduling logic that creates times during DST spring-forward gap
- [ ] Duration calculation crossing a DST boundary using wall-clock subtraction
- [ ] Month or year addition using naive arithmetic (+1 month on day 31)
- [ ] Hardcoded offset string instead of IANA zone identifier
- [ ] strftime/strptime without %z or %Z, silently losing timezone info
- [ ] Cron job or scheduler set to run at 2:00 AM local time
- [ ] Midnight constant (00:00) used as day boundary in timezone where midnight is skipped
- [ ] Date.parse() or new Date(string) relying on browser-specific parsing
- [ ] Multiple calls to now() within a single logical operation assuming same value
- [ ] Epoch milliseconds stored as 32-bit integer (Y2038 overflow)
- [ ] Day-of-week calculation assuming Monday=1 across locales and libraries
- [ ] Calendar system not parameterized when serving multi-cultural users

## Detailed Checks

### Timezone-Naive Storage and Transmission
<!-- activation: keywords=["datetime", "timestamp", "TIMESTAMP", "Date", "now()", "created_at", "updated_at", "strftime", "strptime", "NaiveDateTime", "LocalDateTime"] -->

- [ ] **Datetime without timezone stored in DB**: flag `TIMESTAMP WITHOUT TIME ZONE`, `DATETIME` (MySQL), or application code that strips timezone before INSERT. Two records created in different timezones become incomparable. Use `TIMESTAMP WITH TIME ZONE` (Postgres) or store UTC explicitly
- [ ] **datetime.now() instead of datetime.now(tz=UTC)**: Python's `datetime.now()` returns a naive datetime in local time -- it carries no timezone info. Use `datetime.now(timezone.utc)` or `datetime.now(tz=ZoneInfo("UTC"))`
- [ ] **new Date() serialized without offset**: JavaScript's `Date.toISOString()` is safe (always UTC), but `Date.toString()` or custom formatting without offset creates ambiguous strings. Flag `.toLocaleDateString()` or manual formatting stored in a database
- [ ] **NaiveDateTime at persistence boundary**: Rust's `chrono::NaiveDateTime`, Java's `LocalDateTime`, or C#'s `DateTime` with `Kind=Unspecified` crossing a serialization boundary (JSON, DB, message queue) silently discards timezone context

### DST Transition Hazards
<!-- activation: keywords=["DST", "daylight", "spring", "fall", "gap", "fold", "2:00", "2:30", "ambiguous", "nonexistent", "transition"] -->

- [ ] **Creating a time in the DST gap**: constructing `2:30 AM` on a spring-forward day in US timezones produces a time that does not exist. Libraries either throw, silently shift to 3:30, or create an invalid value. Flag hardcoded local times near 2 AM in scheduling code
- [ ] **Ambiguous time in DST fold**: `1:30 AM` on a fall-back day occurs twice. Without specifying `fold=0` or `fold=1` (Python 3.6+), or `ZonedDateTime.withEarlierOffsetAtOverlap()` (Java), the wrong instant is selected silently
- [ ] **Wall-clock duration across DST**: `end_wall - start_wall` gives wrong elapsed time when a DST transition occurs between them. A 1-hour meeting from 1:00 AM to 3:00 AM on spring-forward night is actually 1 hour, not 2. Use UTC or Instant for duration math
- [ ] **Cron at 2 AM local**: a cron job scheduled at `0 2 * * *` in a US timezone will skip on spring-forward (2 AM does not exist) and may fire twice on fall-back. Schedule in UTC or use a DST-aware scheduler

### Date Arithmetic Edge Cases
<!-- activation: keywords=["addMonths", "plusMonths", "add_months", "timedelta", "DateAdd", "relativedelta", "Period", "plus", "month", "year", "day"] -->

- [ ] **Jan 31 + 1 month**: most libraries clamp to Feb 28 (or 29). This means `date + 1 month - 1 month != date`. Flag month arithmetic where day-of-month exceeds 28 is possible, especially in billing or subscription logic
- [ ] **Leap year day arithmetic**: Feb 29 + 1 year = Feb 28 in most libraries. A birthday on Feb 29 processed with `add_years(1)` silently shifts. Document the clamping behavior or validate explicitly
- [ ] **30/360 vs actual day count**: financial code using 30/360 day count convention vs actual/365 gives different accrual. Flag duration calculations in financial contexts that do not specify the convention

### Parsing and Formatting Ambiguity
<!-- activation: keywords=["parse", "Parse", "format", "Format", "strftime", "strptime", "DateTimeFormatter", "SimpleDateFormat", "Date.parse", "moment", "dayjs"] -->

- [ ] **Date.parse() browser variance**: `new Date("2024-01-02")` is UTC in ISO 8601 but `new Date("01/02/2024")` is local time and month/day order is locale-dependent. Flag `Date.parse()` or `new Date(string)` with non-ISO formats
- [ ] **SimpleDateFormat not thread-safe**: Java's `SimpleDateFormat` is mutable and not thread-safe. Concurrent use corrupts internal state. Use `DateTimeFormatter` (immutable, thread-safe)
- [ ] **Locale-dependent month/day names**: formatting or parsing with month names (`MMM`, `MMMM`) without specifying a locale uses the system default, which changes across servers. Use explicit `Locale.ENGLISH` or similar

### Multiple now() Calls and Clock Skew
<!-- activation: keywords=["now()", "Date.now", "System.currentTimeMillis", "Instant.now", "time.time", "clock", "ntp"] -->

- [ ] **now() called twice assuming same value**: two calls to `now()` in a transaction can return different values if a millisecond boundary or NTP adjustment occurs between them. Capture once and reuse, or inject a clock for testability
- [ ] **NTP step adjustment**: NTP can step the clock backward, making `end - start` negative. Use monotonic clocks (`System.nanoTime()`, `time.monotonic()`, `Instant` from monotonic source) for elapsed time measurement
- [ ] **System clock trusted for ordering**: using wall-clock timestamps to order events across distributed nodes is unreliable due to clock skew. Use logical clocks (Lamport, vector clocks) or hybrid logical clocks

## Common False Positives

- **Intentional local time display**: converting UTC to local time for UI display is correct and expected. Only flag when the local time is stored or compared without timezone context.
- **UTC-only systems**: systems that consistently store and operate in UTC throughout (all servers, all clients, all databases) have minimal timezone risk. Verify the claim before dismissing.
- **Test fixtures with hardcoded dates**: test data using specific dates without timezone is often intentional for reproducibility. Flag only if the code under test handles real user timezones.
- **Logging timestamps**: log lines with local time are a style choice, not a correctness bug, unless log timestamps are parsed for business logic.

## Severity Guidance

| Finding | Severity |
|---|---|
| Datetime stored without timezone in a multi-timezone system | Important |
| Duration calculated across DST boundary using wall-clock subtraction | Important |
| Scheduling logic creating times in the DST gap (2 AM) | Important |
| Month arithmetic on day 31 in billing/subscription code | Important |
| Date.parse() with locale-dependent format in production code | Important |
| SimpleDateFormat shared across threads | Important |
| Multiple now() calls in a transaction assuming identical values | Minor |
| Hardcoded UTC offset instead of IANA zone ID | Minor |
| 32-bit epoch timestamp (Y2038) in new code | Minor |
| Cron job at 2 AM local time without DST handling | Minor |

## See Also

- `principle-fail-fast` -- datetime parsing should fail on ambiguous input rather than guessing
- `conc-race-conditions-data-races` -- multiple now() calls create a TOCTOU-like race on the clock
- `footgun-off-by-one` -- off-by-one in date ranges (inclusive vs exclusive end dates)
- `footgun-bidi-rtl-locale-collation` -- locale-dependent date formatting

## Authoritative References

- [IANA Time Zone Database](https://www.iana.org/time-zones)
- [W3C Note: Date and Time Formats](https://www.w3.org/TR/NOTE-datetime)
- [Java Date-Time Tutorial: Time Zones and Offset Classes](https://docs.oracle.com/javase/tutorial/datetime/iso/timezones.html)
- [Python zoneinfo documentation](https://docs.python.org/3/library/zoneinfo.html)
- [Falsehoods Programmers Believe About Time](https://gist.github.com/timvisee/fcda9bbdff88d45cc9061606b4b923ca)
