---
id: domain-iot-mqtt-coap-ota-fleet
type: primary
depth_role: leaf
focus: "Detect insecure MQTT/CoAP transport, overly broad topic ACLs, unsigned OTA updates, hardcoded device credentials, missing firmware rollback, telemetry flooding, and absent device attestation in IoT fleet systems"
parents:
  - index.md
covers:
  - MQTT connection without TLS encryption
  - MQTT topic ACL too broad -- device can subscribe to all topics
  - OTA firmware update without signature verification
  - Device credentials hardcoded in firmware or source
  - No firmware rollback mechanism after failed OTA update
  - "Telemetry ingestion without rate limiting (device flood)"
  - Missing device shadow or twin for offline state synchronization
  - CoAP communication without DTLS
  - Fleet management without device identity attestation
  - "OTA update channel not authenticated (man-in-the-middle)"
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
activation:
  file_globs:
    - "**/*mqtt*"
    - "**/*coap*"
    - "**/*ota*"
    - "**/*firmware*"
    - "**/*device*"
    - "**/*fleet*"
    - "**/*telemetry*"
    - "**/*sensor*"
    - "**/*actuator*"
    - "**/*shadow*"
    - "**/*twin*"
    - "**/*edge*"
  keyword_matches:
    - MQTT
    - CoAP
    - OTA
    - firmware
    - IoT
    - device
    - fleet
    - telemetry
    - sensor
    - actuator
    - DTLS
    - LwM2M
    - shadow
    - twin
    - edge
    - mqtt_connect
    - mqtts
    - broker
    - publish
    - subscribe
  structural_signals:
    - MQTT client connection or broker configuration
    - OTA update handler or firmware download function
    - Device provisioning or fleet enrollment logic
source:
  origin: file
  path: domain-iot-mqtt-coap-ota-fleet.md
  hash: "sha256:f8a2e07eb4fe5abbdd7593abaf840be57d8619b1184955de444c68afcf4eb8a7"
---
# IoT Protocols, OTA Updates, and Fleet Management

## When This Activates

Activates when diffs touch MQTT client/broker configuration, CoAP endpoints, OTA firmware update logic, device provisioning, telemetry ingestion, device shadow/twin management, or fleet enrollment. IoT systems have unique attack surfaces: constrained devices with long lifespans, insecure transport protocols, unsigned firmware, and fleet-wide credential reuse. A single vulnerability can compromise thousands of deployed devices.

## Audit Surface

- [ ] MQTT broker connection URL uses mqtt:// instead of mqtts:// (no TLS)
- [ ] MQTT subscribe uses wildcard topic (#) without per-device scoping
- [ ] OTA firmware payload not verified against a cryptographic signature
- [ ] Device secret, key, or certificate hardcoded in source or firmware image
- [ ] No rollback partition or recovery mechanism for failed firmware update
- [ ] Telemetry endpoint accepts unbounded messages per device per time window
- [ ] Device has no shadow, twin, or desired-state document for offline sync
- [ ] CoAP endpoint configured without DTLS binding
- [ ] Device enrolled in fleet without hardware attestation or secure boot chain
- [ ] OTA update downloaded over HTTP without certificate pinning
- [ ] MQTT last will and testament (LWT) not configured for disconnect detection
- [ ] Device provisioning uses shared static credential instead of per-device identity
- [ ] Firmware version not reported in telemetry (fleet visibility gap)
- [ ] Command-and-control channel has no message authentication (replay risk)
- [ ] Sensor data accepted without range or sanity validation

## Detailed Checks

### MQTT Security
<!-- activation: keywords=["MQTT", "mqtt", "broker", "connect", "subscribe", "publish", "topic", "TLS", "mqtts", "ACL", "wildcard"] -->

- [ ] **MQTT without TLS**: connection string uses `mqtt://` (port 1883) instead of `mqtts://` (port 8883) -- all messages including credentials transit in cleartext. Every MQTT connection must use TLS 1.2+
- [ ] **Wildcard topic subscription**: device subscribes to `#` or `+/+/+` without scoping to its own device ID -- it receives messages intended for all devices, exposing other devices' telemetry and commands
- [ ] **No per-device topic ACL**: broker allows any authenticated device to publish or subscribe to any topic -- a compromised device can inject commands to other devices or eavesdrop on the fleet
- [ ] **Missing MQTT LWT**: client does not configure a Last Will and Testament message -- the broker and fleet manager cannot detect ungraceful disconnections, leaving stale device state
- [ ] **QoS 0 for critical commands**: command-and-control messages use QoS 0 (fire-and-forget) -- critical commands like emergency shutoff may be silently lost

### CoAP and DTLS
<!-- activation: keywords=["CoAP", "coap", "DTLS", "dtls", "UDP", "constrained", "observe", "block", "LwM2M"] -->

- [ ] **CoAP without DTLS**: CoAP endpoint configured over plain UDP without DTLS encryption -- telemetry and commands transit in cleartext on potentially hostile networks
- [ ] **DTLS session resumption disabled**: each CoAP exchange performs a full DTLS handshake -- constrained devices waste battery and bandwidth on repeated handshakes. Enable session resumption or connection ID
- [ ] **No CoAP request authentication**: CoAP server accepts requests without verifying a token, PSK, or certificate -- any network participant can send commands to the device

### OTA Firmware Updates
<!-- activation: keywords=["OTA", "ota", "firmware", "update", "download", "flash", "image", "sign", "verify", "rollback", "partition"] -->

- [ ] **Unsigned firmware**: OTA update payload is not cryptographically signed or the device does not verify the signature before flashing -- an attacker who compromises the update channel can install arbitrary firmware on the fleet
- [ ] **No rollback mechanism**: device has no A/B partition scheme, recovery partition, or rollback capability -- a corrupted or buggy OTA update bricks the device permanently with no remote recovery
- [ ] **OTA over HTTP**: firmware image downloaded over HTTP without TLS or certificate pinning -- man-in-the-middle can substitute a malicious firmware image
- [ ] **No version anti-rollback**: device accepts any firmware version including older ones -- an attacker can downgrade to a version with known vulnerabilities. Enforce monotonically increasing version numbers
- [ ] **OTA update not atomic**: firmware write to flash is interruptible (power loss, network drop) -- partial writes leave the device in an unbootable state without a recovery partition

### Device Credentials and Provisioning
<!-- activation: keywords=["credential", "secret", "key", "certificate", "provision", "enroll", "identity", "hardcode", "static", "shared"] -->

- [ ] **Hardcoded device credentials**: device secret key, certificate, or API key embedded in source code or firmware binary -- all devices in the fleet share the same credential; compromising one compromises all
- [ ] **Shared static credential**: all devices in the fleet use the same provisioning secret -- no per-device identity, no ability to revoke a single device
- [ ] **No device attestation**: device enrolled in fleet without hardware attestation (TPM, secure element) or secure boot chain verification -- a cloned or tampered device is indistinguishable from a legitimate one
- [ ] **Credentials not rotatable**: device credentials have no rotation mechanism -- a compromised credential requires physical device access to remediate

### Telemetry and Fleet Visibility
<!-- activation: keywords=["telemetry", "sensor", "data", "rate", "limit", "flood", "shadow", "twin", "desired", "reported", "version"] -->

- [ ] **No telemetry rate limiting**: backend accepts unbounded telemetry messages per device per time window -- a malfunctioning or compromised device can flood the ingestion pipeline, causing cost spikes and DoS for the fleet
- [ ] **Sensor data not range-validated**: telemetry values accepted without sanity checking against physically possible ranges -- a sensor reporting -500C or 99999 RPM should be flagged, not stored
- [ ] **Missing device shadow/twin**: no desired-state/reported-state document for offline devices -- commands sent while the device is offline are lost instead of queued for delivery on reconnect
- [ ] **Firmware version not in telemetry**: device does not report its firmware version in periodic telemetry -- the fleet manager cannot track which devices have been updated or identify vulnerable firmware versions
- [ ] **No heartbeat or liveness check**: fleet manager has no mechanism to detect that a device has stopped reporting -- silent failures go unnoticed until physical inspection

### Command Channel Security
<!-- activation: keywords=["command", "control", "actuator", "action", "message", "authenticate", "replay", "nonce", "sequence"] -->

- [ ] **Commands without message authentication**: commands sent to devices have no HMAC, signature, or authentication tag -- an attacker on the network can forge commands to actuators (open valves, disable alarms)
- [ ] **No replay protection on commands**: command messages have no nonce, sequence number, or timestamp -- a captured "open door" command can be replayed indefinitely
- [ ] **No command authorization model**: any authenticated entity can send any command to any device -- there is no role-based or capability-based access control on the command channel

## Common False Positives

- **Development/test broker**: MQTT connections to `localhost` or test brokers in development environments are acceptable without TLS if clearly gated by environment configuration.
- **Simulator devices**: simulated device clients in test harnesses may use shared credentials or skip attestation.
- **Wildcard subscriptions in fleet manager**: the backend fleet manager service may legitimately subscribe to wildcard topics to aggregate telemetry -- the concern is devices subscribing to wildcards.
- **CoAP over loopback**: CoAP communication between processes on the same device over localhost does not require DTLS.

## Severity Guidance

| Finding | Severity |
|---|---|
| OTA firmware update without signature verification | Critical |
| MQTT connection without TLS (credentials in cleartext) | Critical |
| Device credentials hardcoded in source or firmware | Critical |
| Commands to actuators without message authentication | Critical |
| No firmware rollback mechanism | Important |
| MQTT wildcard subscription without per-device scoping | Important |
| CoAP without DTLS on external network | Important |
| Telemetry ingestion without rate limiting | Important |
| No device attestation at fleet enrollment | Important |
| Sensor data accepted without range validation | Minor |
| Missing device shadow/twin for offline sync | Minor |
| MQTT LWT not configured | Minor |
| Firmware version not reported in telemetry | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- topic ACLs and command authorization as access control
- `principle-fail-fast` -- reject malformed telemetry and commands at the edge
- `reliability-idempotency` -- command delivery to devices must handle at-least-once delivery
- `footgun-time-dates-timezones` -- device timestamps must use UTC and handle clock drift

## Authoritative References

- [OWASP IoT Top 10](https://owasp.org/www-project-internet-of-things-top-10/)
- [MQTT v5.0 Specification (OASIS)](https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html)
- [RFC 7252: The Constrained Application Protocol (CoAP)](https://www.rfc-editor.org/rfc/rfc7252)
- [RFC 6347: Datagram Transport Layer Security (DTLS)](https://www.rfc-editor.org/rfc/rfc6347)
- [NIST SP 800-183: Networks of Things](https://csrc.nist.gov/publications/detail/sp/800-183/final)
- [AWS IoT Device Shadow Service](https://docs.aws.amazon.com/iot/latest/developerguide/iot-device-shadows.html)
- [Azure IoT Hub Device Twins](https://learn.microsoft.com/en-us/azure/iot-hub/iot-hub-devguide-device-twins)
