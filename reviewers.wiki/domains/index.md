---
id: domains
type: index
depth_role: subcategory
depth: 1
focus: "domains: Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts; Detect inventory race conditions, stale cart prices at checkout, client-side tax calcul..."
parents:
  - "../index.md"
shared_covers: []
tags:
  - "a/b-test"
  - abr
  - access-control
  - accounting
  - aimbot
  - als
  - aml
  - anti-cheat
  - audio
  - automerge
  - blockchain
  - cart
  - cheat
  - checkout
  - coap
  - codec
  - cold-start
  - collaborative
  - collaborative-filtering
  - compliance
generator: "skill-llm-wiki/v1"
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
  - id: domain-fintech-fraud-kyc-aml
    file: domain-fintech-fraud-kyc-aml.md
    type: primary
    focus: Detect fraud checks ordered after transactions, hardcoded risk thresholds, missing velocity checks, KYC gaps before high-risk operations, excessive PII retention, and absent AML screening
    tags:
      - fraud
      - kyc
      - aml
      - risk
      - sanctions
      - pep
      - velocity
      - identity-verification
      - fintech
      - compliance
  - id: domain-fintech-ledger-double-entry
    file: domain-fintech-ledger-double-entry.md
    type: primary
    focus: Detect single-entry bookkeeping, non-idempotent payment processing, floating-point monetary math, missing audit trails, and broken ledger invariants in double-entry accounting systems
    tags:
      - ledger
      - double-entry
      - accounting
      - payment
      - fintech
      - reconciliation
      - money
      - idempotency
  - id: domain-gaming-anti-cheat
    file: domain-gaming-anti-cheat.md
    type: primary
    focus: Detect client-trusted game state, missing server-side validation of player actions, speed and teleport hack vectors, exploitable game economies, replay attacks, and leaderboard manipulation in game systems
    tags:
      - anti-cheat
      - cheat
      - exploit
      - server-authority
      - validation
      - game-security
      - speed-hack
      - wallhack
      - aimbot
      - economy
      - leaderboard
  - id: domain-gaming-game-loops-networking
    file: domain-gaming-game-loops-networking.md
    type: primary
    focus: Detect frame-rate-dependent physics, client-authoritative state, missing server reconciliation, broken network prediction, ECS archetype fragmentation, and tick rate mismatches in game loops and networking
    tags:
      - game-loop
      - fixed-timestep
      - netcode
      - prediction
      - rollback
      - ecs
      - tick-rate
      - lag-compensation
      - interpolation
      - delta-time
  - id: domain-iot-mqtt-coap-ota-fleet
    file: domain-iot-mqtt-coap-ota-fleet.md
    type: primary
    focus: "Detect insecure MQTT/CoAP transport, overly broad topic ACLs, unsigned OTA updates, hardcoded device credentials, missing firmware rollback, telemetry flooding, and absent device attestation in IoT fleet systems"
    tags:
      - iot
      - mqtt
      - coap
      - ota
      - firmware
      - fleet
      - telemetry
      - device
      - dtls
      - shadow
      - twin
      - edge
      - embedded
      - security
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
  - id: domain-media-codecs-drm-transcoding-ffmpeg
    file: domain-media-codecs-drm-transcoding-ffmpeg.md
    type: primary
    focus: Detect ffmpeg injection, DRM key exposure, missing output validation, and synchronous transcoding bottlenecks in media processing pipelines
    tags:
      - ffmpeg
      - media
      - transcode
      - HLS
      - DASH
      - DRM
      - Widevine
      - FairPlay
      - PlayReady
      - codec
      - ABR
      - video
      - audio
      - streaming
  - id: domain-real-time-crdt-ot-presence-websocket
    file: domain-real-time-crdt-ot-presence-websocket.md
    type: primary
    focus: Detect broken conflict resolution, presence leaks, unbounded document growth, and missing reconnection sync in real-time collaborative systems
    tags:
      - crdt
      - ot
      - operational-transform
      - presence
      - collaborative
      - real-time
      - websocket
      - Yjs
      - Automerge
      - ShareDB
      - conflict-resolution
      - cursor
  - id: domain-recommendations-cf-content-hybrid
    file: domain-recommendations-cf-content-hybrid.md
    type: primary
    focus: Detect cold-start gaps, popularity bias, recommendation loops, sparse matrix mishandling, and missing evaluation in recommendation systems
    tags:
      - recommendation
      - collaborative-filtering
      - content-based
      - matrix-factorization
      - ALS
      - embedding
      - cold-start
      - diversity
      - popularity-bias
      - "A/B-test"
      - implicit-feedback
  - id: domain-streaming-kafka-pulsar-kinesis-watermarks
    file: domain-streaming-kafka-pulsar-kinesis-watermarks.md
    type: primary
    focus: Detect offset mismanagement, missing DLQ, producer misconfiguration, watermark gaps, and partition skew in streaming pipelines
    tags:
      - kafka
      - pulsar
      - kinesis
      - streaming
      - watermark
      - window
      - offset
      - consumer-group
      - partition
      - flink
      - spark-streaming
      - DLQ
      - exactly-once
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Domains

**Focus:** domains: Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts; Detect inventory race conditions, stale cart prices at checkout, client-side tax calcul...

## Children

| File | Type | Focus |
|------|------|-------|
| [domain-blockchain-smart-contracts.md](domain-blockchain-smart-contracts.md) | 📄 primary | Detect reentrancy, access control gaps, oracle manipulation, gas pitfalls, front-running, and upgrade storage collisions in smart contracts |
| [domain-ecommerce-cart-inventory-tax-shipping.md](domain-ecommerce-cart-inventory-tax-shipping.md) | 📄 primary | Detect inventory race conditions, stale cart prices at checkout, client-side tax calculations, negative quantity exploits, unbounded discount stacking, and missing order idempotency in e-commerce systems |
| [domain-fintech-fraud-kyc-aml.md](domain-fintech-fraud-kyc-aml.md) | 📄 primary | Detect fraud checks ordered after transactions, hardcoded risk thresholds, missing velocity checks, KYC gaps before high-risk operations, excessive PII retention, and absent AML screening |
| [domain-fintech-ledger-double-entry.md](domain-fintech-ledger-double-entry.md) | 📄 primary | Detect single-entry bookkeeping, non-idempotent payment processing, floating-point monetary math, missing audit trails, and broken ledger invariants in double-entry accounting systems |
| [domain-gaming-anti-cheat.md](domain-gaming-anti-cheat.md) | 📄 primary | Detect client-trusted game state, missing server-side validation of player actions, speed and teleport hack vectors, exploitable game economies, replay attacks, and leaderboard manipulation in game systems |
| [domain-gaming-game-loops-networking.md](domain-gaming-game-loops-networking.md) | 📄 primary | Detect frame-rate-dependent physics, client-authoritative state, missing server reconciliation, broken network prediction, ECS archetype fragmentation, and tick rate mismatches in game loops and networking |
| [domain-iot-mqtt-coap-ota-fleet.md](domain-iot-mqtt-coap-ota-fleet.md) | 📄 primary | Detect insecure MQTT/CoAP transport, overly broad topic ACLs, unsigned OTA updates, hardcoded device credentials, missing firmware rollback, telemetry flooding, and absent device attestation in IoT fleet systems |
| [domain-maps-geo-postgis-h3-geohash.md](domain-maps-geo-postgis-h3-geohash.md) | 📄 primary | Detect coordinate swaps, SRID mismatches, missing spatial indexes, and incorrect distance calculations in geospatial code |
| [domain-media-codecs-drm-transcoding-ffmpeg.md](domain-media-codecs-drm-transcoding-ffmpeg.md) | 📄 primary | Detect ffmpeg injection, DRM key exposure, missing output validation, and synchronous transcoding bottlenecks in media processing pipelines |
| [domain-real-time-crdt-ot-presence-websocket.md](domain-real-time-crdt-ot-presence-websocket.md) | 📄 primary | Detect broken conflict resolution, presence leaks, unbounded document growth, and missing reconnection sync in real-time collaborative systems |
| [domain-recommendations-cf-content-hybrid.md](domain-recommendations-cf-content-hybrid.md) | 📄 primary | Detect cold-start gaps, popularity bias, recommendation loops, sparse matrix mishandling, and missing evaluation in recommendation systems |
| [domain-streaming-kafka-pulsar-kinesis-watermarks.md](domain-streaming-kafka-pulsar-kinesis-watermarks.md) | 📄 primary | Detect offset mismanagement, missing DLQ, producer misconfiguration, watermark gaps, and partition skew in streaming pipelines |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
