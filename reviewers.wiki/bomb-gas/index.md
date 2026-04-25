---
id: bomb-gas
type: index
depth_role: subcategory
depth: 1
focus: API endpoints without request throttling or quota enforcement; Access control — Ownable, AccessControl, custom modifiers; Authentication endpoints without rate limiting or brute-force protection; Cloud storage buckets or services configured with public access
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: domain-blockchain-smart-contracts
    file: domain-blockchain-smart-contracts.md
    type: primary
    focus: Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts
    tags:
      - solidity
      - smart-contract
      - blockchain
      - web3
      - reentrancy
      - gas
      - oracle
      - ERC20
      - ERC721
      - ERC1155
      - proxy
      - front-running
      - access-control
      - DeFi
      - ethereum
      - smart-contracts
      - defi
      - security
      - evm
  - id: footgun-resource-exhaustion-via-input
    file: footgun-resource-exhaustion-via-input.md
    type: primary
    focus: Detect unbounded allocation from user input -- array sizes, string lengths, zip bombs, XML bombs, deeply nested JSON, and large file uploads without limits
    tags:
      - resource-exhaustion
      - denial-of-service
      - zip-bomb
      - xml-bomb
      - memory
      - CWE-400
      - CWE-770
      - CWE-776
      - rate-limiting
      - dos
      - redos
      - pagination
      - throttling
      - timeout
      - graphql
      - CWE-1333
  - id: sec-owasp-a05-misconfiguration
    file: sec-owasp-a05-misconfiguration.md
    type: primary
    focus: Detect security misconfigurations including debug mode in production, missing security headers, default credentials, verbose error exposure, and unnecessary features enabled
    tags:
      - owasp
      - misconfiguration
      - security-headers
      - debug-mode
      - default-credentials
      - error-handling
      - hardening
      - CWE-16
      - CWE-209
      - CWE-1004
      - CWE-614
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Bomb Gas

**Focus:** API endpoints without request throttling or quota enforcement; Access control — Ownable, AccessControl, custom modifiers; Authentication endpoints without rate limiting or brute-force protection; Cloud storage buckets or services configured with public access

## Children

| File | Type | Focus |
|------|------|-------|
| [domain-blockchain-smart-contracts.md](domain-blockchain-smart-contracts.md) | 📄 primary | Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts |
| [footgun-resource-exhaustion-via-input.md](footgun-resource-exhaustion-via-input.md) | 📄 primary | Detect unbounded allocation from user input -- array sizes, string lengths, zip bombs, XML bombs, deeply nested JSON, and large file uploads without limits |
| [sec-owasp-a05-misconfiguration.md](sec-owasp-a05-misconfiguration.md) | 📄 primary | Detect security misconfigurations including debug mode in production, missing security headers, default credentials, verbose error exposure, and unnecessary features enabled |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
