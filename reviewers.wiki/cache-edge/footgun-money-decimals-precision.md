---
id: footgun-money-decimals-precision
type: primary
depth_role: leaf
focus: Detect use of binary floating-point for monetary values, currency precision mismatches, unspecified rounding modes, and unit confusion in financial arithmetic
parents:
  - index.md
covers:
  - float or double used for monetary amounts, causing representational error
  - "Currency precision mismatch: JPY has 0 decimals, USD has 2, BHD has 3"
  - Rounding mode not specified, defaulting to language-specific behavior
  - "Integer cents/minor units stored without documenting the unit"
  - Mixing currencies in arithmetic without explicit conversion
  - "Accumulation drift: summing many float prices diverges from exact total"
  - "Division producing repeating decimals truncated silently (1/3 of $10)"
  - Equality comparison of monetary amounts after floating-point arithmetic
  - Currency conversion with insufficient intermediate precision
  - Tax or discount calculation rounding at wrong step
tags:
  - money
  - currency
  - precision
  - floating-point
  - decimal
  - rounding
  - financial
  - CWE-682
activation:
  file_globs:
    - "**/*price*"
    - "**/*money*"
    - "**/*payment*"
    - "**/*invoice*"
    - "**/*billing*"
    - "**/*currency*"
    - "**/*order*"
    - "**/*cart*"
    - "**/*tax*"
    - "**/*discount*"
  keyword_matches:
    - price
    - amount
    - total
    - subtotal
    - currency
    - USD
    - EUR
    - GBP
    - JPY
    - money
    - cents
    - pence
    - BigDecimal
    - Decimal
    - decimal
    - NUMERIC
    - rounding
    - RoundingMode
    - HALF_UP
    - HALF_EVEN
    - toFixed
    - pennies
    - minor_unit
  structural_signals:
    - Monetary arithmetic in checkout, billing, or payment code
    - Currency field or column definition
    - Price calculation or tax computation
source:
  origin: file
  path: footgun-money-decimals-precision.md
  hash: "sha256:59c38aca9924ca7cde4bb4154f45bbb0f1ca0e9426a3d7cb744c838f2e7f4a43"
---
# Money, Decimals, and Precision Footguns

## When This Activates

Activates when diffs touch monetary arithmetic, currency handling, price calculations, billing, or financial computations. The core danger: IEEE 754 binary floating-point cannot exactly represent most decimal fractions. `0.1 + 0.2 != 0.3` in every language using float/double. In financial code, these tiny errors compound through summation, multiply through tax calculations, and produce audit failures, reconciliation mismatches, and real monetary losses. Currency itself adds complexity: JPY has zero decimal places, USD has two, BHD has three -- applying the wrong precision silently truncates or inflates amounts.

## Audit Surface

- [ ] Money amount stored as float, double, FLOAT, DOUBLE, or REAL in DB schema
- [ ] Arithmetic on money values using float/double types in application code
- [ ] BigDecimal or Decimal division without specifying scale and rounding mode
- [ ] Currency code not stored alongside monetary amount
- [ ] Integer amount field without comment or constant indicating cents/pence/minor unit
- [ ] Two monetary values of potentially different currencies added or compared
- [ ] Rounding applied after summation instead of on each line item
- [ ] Tax percentage multiplied by float price producing sub-cent error
- [ ] Currency conversion using a single float multiply without intermediate precision
- [ ] Money amount formatted for display using default toString/str without currency format
- [ ] Monetary comparison using == on computed float results
- [ ] Discount or proration splitting a total across line items without remainder handling
- [ ] Database SUM() on a float money column accumulating representational error

## Detailed Checks

### Binary Float for Money (CWE-682)
<!-- activation: keywords=["float", "double", "Float", "Double", "FLOAT", "DOUBLE", "REAL", "Number", "number", "f64", "f32"] -->

- [ ] **float/double for monetary storage**: flag `float`, `double`, `FLOAT`, `DOUBLE`, `REAL` columns or variables holding money. `0.1` is `0.1000000000000000055511151231257827021181583404541015625` in IEEE 754. Use `DECIMAL`/`NUMERIC` in SQL, `BigDecimal` in Java, `Decimal` in Python/C#, or integer minor units
- [ ] **JavaScript Number for money**: all JavaScript numbers are IEEE 754 double. Flag arithmetic on money without a library (dinero.js, currency.js) or integer-cents pattern. `0.1 + 0.2 === 0.30000000000000004`
- [ ] **Database SUM on float column**: `SELECT SUM(price) FROM orders` on a FLOAT column accumulates representational error across thousands of rows. Migrate to DECIMAL or compute in application with exact arithmetic
- [ ] **JSON serialization of money as number**: JSON has no decimal type. A `"price": 19.99` parsed by any JSON library becomes a float. Transmit as string (`"19.99"`) or integer minor units (`1999`) with explicit currency

### Rounding Mode and Scale
<!-- activation: keywords=["round", "Round", "ROUND", "scale", "setScale", "toFixed", "HALF_UP", "HALF_EVEN", "CEILING", "FLOOR", "truncat", "precision"] -->

- [ ] **Division without rounding mode**: `BigDecimal.divide(other)` in Java throws `ArithmeticException` for non-terminating decimals (1/3). `Decimal` in Python rounds to context precision. Flag division without explicit scale and `RoundingMode`
- [ ] **Default rounding mode**: many languages default to `HALF_EVEN` (banker's rounding), but most financial regulations require `HALF_UP`. Flag monetary rounding without explicit mode specification
- [ ] **toFixed in JavaScript**: `(1.255).toFixed(2)` returns `"1.25"` not `"1.26"` due to float representation. Flag `toFixed()` on monetary values -- use integer arithmetic or a money library
- [ ] **Rounding at wrong stage**: applying rounding to the final total instead of each line item (or vice versa) produces different results. Tax authorities often mandate per-line-item rounding. Document and enforce the rounding strategy

### Currency Precision and Mixing
<!-- activation: keywords=["currency", "Currency", "JPY", "BHD", "KWD", "USD", "EUR", "ISO 4217", "minor", "exponent", "convert"] -->

- [ ] **Hardcoded 2-decimal assumption**: flag code that assumes all currencies have 2 decimal places. JPY, KRW, VND have 0. BHD, KWD, OMR have 3. Use ISO 4217 exponent data or a currency library
- [ ] **Currency mixing without conversion**: flag arithmetic between amounts that may be in different currencies without an explicit conversion step. `priceUSD + shippingEUR` is meaningless without a rate
- [ ] **Conversion precision loss**: currency conversion involves a rate with many decimals (e.g., 1 USD = 0.85321 EUR). Flag single-precision float for the rate or truncation of intermediate results. Use at least 6 decimal places for rates and round only the final result

### Integer Minor Units and Documentation
<!-- activation: keywords=["cents", "pence", "pennies", "minor", "amount_cents", "unit", "smallest", "int", "integer", "long", "Int64"] -->

- [ ] **Integer money without unit documentation**: flag integer fields named `amount`, `price`, `total` without a comment or constant indicating the unit (cents, pence, basis points). A bare `amount = 1999` is ambiguous -- $19.99 or $1999?
- [ ] **Inconsistent units**: flag mixing of dollars and cents in the same codebase without clear naming convention. If `order.total` is in cents but `payment.amount` is in dollars, a direct comparison is a 100x error
- [ ] **Integer overflow on large amounts**: `Integer.MAX_VALUE` cents = ~$21.4 million. Large invoices, currency conversions, or aggregations can overflow 32-bit integer cents. Use 64-bit for monetary integers

### Proration and Remainder Distribution
<!-- activation: keywords=["split", "prorate", "allocate", "distribute", "divide", "share", "proportion", "ratio", "remainder"] -->

- [ ] **Naive split loses pennies**: splitting $10.00 three ways as `3.33 + 3.33 + 3.33 = 9.99` loses a cent. The remainder must be distributed (e.g., first share gets `3.34`). Flag division of money by a count without remainder handling
- [ ] **Percentage discount accumulation**: applying multiple percentage discounts sequentially vs. summing them first gives different results. `10% off then 20% off` != `30% off`. Document the intended semantics

## Common False Positives

- **Float for non-financial quantities**: using float for weight, distance, temperature, or other physical measurements is standard practice. Only flag float when the variable represents money.
- **Display-only rounding**: rounding a price to 2 decimals for display while storing the exact value elsewhere is not a bug. Flag only when the rounded value is used in further calculations.
- **Test fixtures with round numbers**: test code using `price = 10.0` where the float is exact (powers of 2 times powers of 5) is technically safe. Flag only in production code paths.
- **Cryptocurrency with 18 decimals**: ETH uses 18 decimal places by convention. Storing wei as a 256-bit integer is correct practice even though the numbers are large.

## Severity Guidance

| Finding | Severity |
|---|---|
| float/double column storing money in production DB schema | Critical |
| Mixing currencies in arithmetic without conversion | Critical |
| Division of BigDecimal/Decimal without rounding mode in financial code | Important |
| Hardcoded 2-decimal assumption with multi-currency support | Important |
| Proration splitting total without remainder handling | Important |
| toFixed() used for monetary rounding in JavaScript | Important |
| Integer money field without documented unit (cents vs dollars) | Minor |
| JSON money transmitted as number instead of string/integer-cents | Minor |
| 32-bit integer for monetary amounts in high-value contexts | Minor |

## See Also

- `footgun-floating-point-comparison` -- general float comparison; this reviewer focuses specifically on monetary consequences
- `principle-fail-fast` -- monetary operations should fail on currency mismatch rather than silently computing
- `footgun-integer-overflow-sign-extension` -- integer cents can overflow on large aggregations

## Authoritative References

- [IEEE 754-2019 Standard for Floating-Point Arithmetic](https://ieeexplore.ieee.org/document/8766229)
- [ISO 4217 Currency Codes and Minor Units](https://www.iso.org/iso-4217-currency-codes.html)
- [Martin Fowler: Money Pattern](https://martinfowler.com/eaaCatalog/money.html)
- [OWASP: Business Logic Vulnerabilities](https://owasp.org/www-community/vulnerabilities/Business_logic_vulnerability)
- [Java BigDecimal documentation -- Rounding Modes](https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/math/RoundingMode.html)
