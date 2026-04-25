---
id: cache-edge
type: index
depth_role: subcategory
depth: 1
focus: "Accumulation drift: summing many float prices diverges from exact total; Build output cached across PRs (security risk from malicious PR); Cache bypass via arbitrary query string parameters; Cache invalidation missing or inconsistent across replicas"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: cicd-caching-strategy
    file: cicd-caching-strategy.md
    type: primary
    focus: "Detect CI/CD caching issues including overly broad cache keys, cache poisoning risks, missing lockfile-based invalidation, cross-PR cache security, and missing compression"
    tags:
      - caching
      - ci-cd
      - performance
      - security
      - cache-poisoning
      - dependencies
      - CWE-345
      - cache
      - TTL
      - eviction
      - stampede
      - invalidation
      - stale-data
      - correctness
      - cdn
      - cloudflare
      - fastly
      - cloudfront
      - akamai
      - edge
      - ttl
      - vary
      - purge
      - origin-shield
      - vcl
      - workers
      - edge-computing
      - CDN
      - edge-function
      - stale
      - fallback
      - architecture
  - id: domain-ecommerce-cart-inventory-tax-shipping
    file: domain-ecommerce-cart-inventory-tax-shipping.md
    type: primary
    focus: Detect inventory race conditions, stale cart prices at checkout, client-side tax calculations, negative quantity exploits, unbounded discount stacking, and missing order idempotency in e-commerce systems
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
  - id: footgun-money-decimals-precision
    file: footgun-money-decimals-precision.md
    type: primary
    focus: Detect use of binary floating-point for monetary values, currency precision mismatches, unspecified rounding modes, and unit confusion in financial arithmetic
    tags:
      - money
      - currency
      - precision
      - floating-point
      - decimal
      - rounding
      - financial
      - CWE-682
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Cache Edge

**Focus:** Accumulation drift: summing many float prices diverges from exact total; Build output cached across PRs (security risk from malicious PR); Cache bypass via arbitrary query string parameters; Cache invalidation missing or inconsistent across replicas

## Children

| File | Type | Focus |
|------|------|-------|
| [cicd-caching-strategy.md](cicd-caching-strategy.md) | 📄 primary | Detect CI/CD caching issues including overly broad cache keys, cache poisoning risks, missing lockfile-based invalidation, cross-PR cache security, and missing compression |
| [domain-ecommerce-cart-inventory-tax-shipping.md](domain-ecommerce-cart-inventory-tax-shipping.md) | 📄 primary | Detect inventory race conditions, stale cart prices at checkout, client-side tax calculations, negative quantity exploits, unbounded discount stacking, and missing order idempotency in e-commerce systems |
| [footgun-money-decimals-precision.md](footgun-money-decimals-precision.md) | 📄 primary | Detect use of binary floating-point for monetary values, currency precision mismatches, unspecified rounding modes, and unit confusion in financial arithmetic |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
