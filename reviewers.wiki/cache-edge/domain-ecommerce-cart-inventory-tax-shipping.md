---
id: domain-ecommerce-cart-inventory-tax-shipping
type: primary
depth_role: leaf
focus: Detect inventory race conditions, stale cart prices at checkout, client-side tax calculations, negative quantity exploits, unbounded discount stacking, and missing order idempotency in e-commerce systems
parents:
  - index.md
covers:
  - Race condition on inventory allowing overselling
  - "Price not re-validated at checkout (stale cart)"
  - Tax calculation performed client-side instead of server-side
  - Negative quantity or price not rejected
  - Discount stacking without limit
  - Cart never expires leading to abandoned cart bloat
  - Shipping cost calculated without weight or dimensions
  - Order placement endpoint missing idempotency key
  - Coupon code validated client-side only
  - Stock reservation not released on cart abandonment
tags:
  - ecommerce
  - cart
  - inventory
  - checkout
  - tax
  - shipping
  - discount
  - coupon
  - order
  - sku
  - stock
  - fulfillment
activation:
  file_globs:
    - "**/*cart*"
    - "**/*inventory*"
    - "**/*checkout*"
    - "**/*order*"
    - "**/*product*"
    - "**/*sku*"
    - "**/*shipping*"
    - "**/*tax*"
    - "**/*discount*"
    - "**/*coupon*"
    - "**/*stock*"
    - "**/*fulfillment*"
  keyword_matches:
    - cart
    - inventory
    - SKU
    - order
    - checkout
    - price
    - tax
    - shipping
    - discount
    - coupon
    - stock
    - fulfillment
    - payment
    - add_to_cart
    - line_item
    - quantity
  structural_signals:
    - Cart or order creation handler
    - Inventory decrement or stock check function
    - Checkout or payment processing flow
source:
  origin: file
  path: domain-ecommerce-cart-inventory-tax-shipping.md
  hash: "sha256:63af99ba57ec05878953dd9c302a7498c3d0106452ebc69d9ca2a12ce4ba9279"
---
# E-Commerce Cart, Inventory, Tax, and Shipping

## When This Activates

Activates when diffs touch shopping cart logic, inventory management, checkout flows, tax calculation, shipping cost estimation, discount/coupon processing, or order placement. E-commerce systems face unique correctness threats: concurrent inventory races cause overselling, stale cart prices enable price manipulation, client-side tax calculation violates tax law, and missing idempotency on orders creates duplicates.

## Audit Surface

- [ ] Inventory decremented without atomic check-and-decrement (oversell risk)
- [ ] Cart total sent to server from client instead of recalculated server-side
- [ ] Price at checkout not compared to current catalog price
- [ ] Tax amount computed in frontend JavaScript
- [ ] Quantity or price field accepts negative or zero values without rejection
- [ ] Multiple discount codes applied with no stacking limit or mutual exclusion
- [ ] Cart has no TTL or expiration -- abandoned carts accumulate indefinitely
- [ ] Shipping cost uses flat rate without considering weight, dimensions, or zone
- [ ] Order creation endpoint accepts no idempotency key
- [ ] Coupon validation logic exists only in client code
- [ ] Stock reservation held indefinitely with no release on timeout
- [ ] Price stored as float instead of integer-cents or decimal
- [ ] Inventory count allows negative values (phantom stock)
- [ ] Order total not re-verified before payment charge

## Detailed Checks

### Inventory Concurrency
<!-- activation: keywords=["inventory", "stock", "quantity", "decrement", "reserve", "available", "oversell", "race", "concurrent", "atomic"] -->

- [ ] **Non-atomic inventory decrement**: code reads current stock, checks availability, then decrements in a separate step -- concurrent requests both read the same value and both succeed, overselling the item. Use `UPDATE ... SET qty = qty - 1 WHERE qty >= 1` or equivalent atomic operation
- [ ] **Stock reservation without timeout**: inventory reserved when added to cart but no mechanism releases the reservation on cart abandonment -- popular items show as unavailable while reserved in ghost carts
- [ ] **Inventory allows negative**: no check constraint or application guard prevents inventory count from going below zero -- negative stock creates phantom availability and fulfillment failures
- [ ] **Optimistic lock without retry**: inventory uses optimistic concurrency (version column) but the application does not retry on conflict -- the request fails instead of retrying with fresh state

### Price and Cart Integrity
<!-- activation: keywords=["price", "cart", "total", "checkout", "stale", "validate", "recalculate", "manipulate", "client"] -->

- [ ] **Stale cart price at checkout**: price captured when item was added to cart is used at checkout without re-checking the current catalog price -- price changes between add-to-cart and checkout are missed, and attackers can exploit time-of-check/time-of-use gaps
- [ ] **Client-supplied total**: cart total or line item subtotal sent from the client and trusted by the server -- attackers modify the request to pay less. Always recalculate server-side. Cross-reference with `footgun-toctou-race`
- [ ] **Price stored as float**: product price or cart total stored as IEEE 754 float/double -- rounding errors accumulate across line items. Cross-reference with `footgun-money-decimals-precision`
- [ ] **Order total not re-verified before charge**: the amount sent to the payment gateway differs from the recalculated server-side total -- either underpay (revenue loss) or overpay (customer dispute)

### Tax Calculation
<!-- activation: keywords=["tax", "VAT", "GST", "sales_tax", "nexus", "jurisdiction", "rate", "calculate"] -->

- [ ] **Tax calculated client-side**: tax amount computed in browser JavaScript and sent to the server -- this is trivially manipulable and may violate tax nexus regulations that require server-of-record calculation
- [ ] **Hardcoded tax rate**: tax rate embedded as a constant instead of derived from jurisdiction, product category, and customer location -- rates change frequently and vary by locality
- [ ] **Tax not recalculated on address change**: user changes shipping address but tax is not recomputed for the new jurisdiction -- the order records incorrect tax liability
- [ ] **No tax exemption handling**: business-to-business (B2B) or exempt organization purchases have no mechanism to apply tax exemption certificates

### Discount and Coupon Integrity
<!-- activation: keywords=["discount", "coupon", "promo", "code", "stack", "combine", "limit", "validate", "redeem"] -->

- [ ] **Unlimited discount stacking**: multiple coupon codes applied to the same order with no mutual exclusion or stacking limit -- attackers combine discounts to pay near-zero
- [ ] **Coupon validated client-side only**: coupon code acceptance logic in frontend without server-side re-validation -- attackers submit arbitrary coupon codes directly to the API
- [ ] **Negative price after discount**: discount applied without checking that the resulting price remains non-negative -- negative totals cause payment gateway errors or credit the customer
- [ ] **Coupon reuse not prevented**: single-use coupon code has no redemption tracking -- the same code is used repeatedly by sharing or replaying requests

### Shipping and Fulfillment
<!-- activation: keywords=["shipping", "fulfillment", "weight", "dimensions", "carrier", "rate", "zone", "delivery", "tracking"] -->

- [ ] **Flat-rate shipping ignoring weight**: shipping cost is a single flat rate regardless of item weight, dimensions, or destination zone -- heavy or bulky items ship at a loss
- [ ] **Shipping address not validated**: address accepted without postal validation -- invalid addresses cause delivery failures and carrier surcharges
- [ ] **No split-shipment handling**: multi-item order with items from different warehouses has no logic for split shipments -- the entire order waits for the slowest item

### Order Idempotency
<!-- activation: keywords=["order", "place", "create", "submit", "idempotency", "duplicate", "retry"] -->

- [ ] **No idempotency key on order placement**: POST endpoint creating orders accepts no idempotency key -- double-click, browser retry, or network retry creates duplicate orders. Cross-reference with `reliability-idempotency`
- [ ] **Duplicate order detection by amount only**: deduplication matches on total amount and timestamp instead of a unique idempotency key -- legitimate repeat orders are incorrectly blocked
- [ ] **Cart-to-order transition not atomic**: cart converted to order in multiple steps without a transaction -- partial failure leaves orphaned state

## Common False Positives

- **Display-only price formatting**: frontend code formatting prices with toFixed(2) for display is not a computation error if the authoritative value is integer-cents server-side.
- **Admin inventory adjustment**: admin tools that allow manual stock adjustments with negative values are intentional and should not be flagged if audit-logged.
- **Estimated shipping on product page**: approximate shipping displayed before checkout does not need the precision of the final checkout calculation.
- **Test coupon codes**: test files using unlimited or stacking coupons for integration tests are acceptable.

## Severity Guidance

| Finding | Severity |
|---|---|
| Non-atomic inventory decrement (oversell risk) | Critical |
| Client-supplied price or total trusted by server | Critical |
| Tax calculated client-side only | Critical |
| Order placement endpoint missing idempotency key | Critical |
| Negative quantity or price accepted without rejection | Important |
| Discount stacking without limit | Important |
| Price not re-validated at checkout (stale cart) | Important |
| Coupon validation client-side only | Important |
| Price stored as float instead of decimal/integer-cents | Important |
| Cart with no TTL (abandoned cart bloat) | Minor |
| Shipping cost ignores weight and dimensions | Minor |
| Stock reservation with no timeout release | Minor |

## See Also

- `footgun-money-decimals-precision` -- monetary type safety for prices and totals
- `reliability-idempotency` -- idempotency key handling for order placement
- `footgun-toctou-race` -- time-of-check/time-of-use in cart-to-checkout flow
- `principle-fail-fast` -- reject invalid quantities and prices at input boundary
- `sec-owasp-a01-broken-access-control` -- client-supplied values bypassing server authority

## Authoritative References

- [OWASP E-Commerce Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/E-Commerce_Cheat_Sheet.html)
- [Stripe Idempotent Requests](https://stripe.com/docs/api/idempotent_requests)
- [Martin Fowler, "Patterns of Enterprise Application Architecture" -- Unit of Work](https://martinfowler.com/eaaCatalog/unitOfWork.html)
- [Tax Foundation: State Sales Tax Rates](https://taxfoundation.org/publications/state-sales-tax-rates/)
