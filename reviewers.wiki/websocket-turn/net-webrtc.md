---
id: net-webrtc
type: primary
depth_role: leaf
focus: Detect WebRTC configuration issues including hardcoded TURN credentials, missing TURN fallback, SDP manipulation vulnerabilities, and missing encryption validation
parents:
  - index.md
covers:
  - TURN server credentials hardcoded in client-side code
  - Missing TURN fallback causing ICE failure behind restrictive NATs and firewalls
  - "SDP offer/answer manipulation vulnerability allowing codec or encryption downgrade"
  - Missing SRTP encryption verification on media streams
  - ICE candidate trickling not handled causing incomplete connectivity checks
  - Media permissions requested too early before user intent is established
  - DataChannel without reliability or ordering configuration
  - Missing bandwidth estimation and adaptation
  - No connection quality monitoring or stats collection
  - STUN and TURN hosted on same server creating single point of failure
tags:
  - webrtc
  - ice
  - stun
  - turn
  - sdp
  - srtp
  - data-channel
  - media
  - signaling
  - peer-connection
activation:
  file_globs:
    - "**/*webrtc*"
    - "**/*rtc*"
    - "**/*peer*"
    - "**/*signaling*"
    - "**/*signal*"
    - "**/*media*"
  keyword_matches:
    - WebRTC
    - RTCPeerConnection
    - ICE
    - STUN
    - TURN
    - SDP
    - signaling
    - MediaStream
    - DataChannel
    - getUserMedia
    - RTCSessionDescription
  structural_signals:
    - RTCPeerConnection construction or configuration
    - ICE server configuration
    - "SDP offer/answer handling"
source:
  origin: file
  path: net-webrtc.md
  hash: "sha256:fb9d948261e84dbf6ce46867f112b785d8847f8de4a41437c2a22ac42cd1267f"
---
# WebRTC

## When This Activates

Activates when diffs touch RTCPeerConnection configuration, ICE/STUN/TURN server setup, SDP offer/answer handling, media stream acquisition, or DataChannel usage. WebRTC enables peer-to-peer communication but involves a complex setup: ICE negotiation must traverse NATs and firewalls (requiring TURN fallback), SDP describes the session and must not be tampered with, media must be encrypted via DTLS-SRTP, and connection quality must be monitored for adaptation. Misconfigurations cause calls to fail silently behind corporate firewalls, leak credentials, or expose media streams to interception.

## Audit Surface

- [ ] TURN credentials (username, credential) hardcoded in client JavaScript or mobile code
- [ ] RTCPeerConnection configured with only STUN servers and no TURN fallback
- [ ] SDP received from remote peer applied without sanitization or validation
- [ ] Media stream started without verifying DTLS-SRTP encryption is active
- [ ] ICE candidate handler that does not process trickled candidates after initial offer
- [ ] getUserMedia called on page load before user has clicked a call button
- [ ] RTCDataChannel created without specifying ordered or maxRetransmits
- [ ] No adaptation to bandwidth changes (no ontrack bitrate adjustment)
- [ ] getStats() not called for connection quality monitoring
- [ ] Single STUN/TURN server with no redundancy
- [ ] ICE restart not implemented for mid-session network changes
- [ ] Missing onicecandidateerror handler

## Detailed Checks

### ICE and TURN Configuration
<!-- activation: keywords=["ICE", "STUN", "TURN", "iceServers", "icecandidate", "candidate", "relay", "srflx", "host", "nat", "firewall", "coturn"] -->

- [ ] **No TURN server**: flag `RTCPeerConnection` configurations with only STUN servers (`stun:`) and no TURN servers (`turn:`, `turns:`) -- STUN alone cannot traverse symmetric NATs or restrictive corporate firewalls. Approximately 10-15% of connections require TURN relay. Without it, these users experience silent call failure
- [ ] **Hardcoded TURN credentials**: flag TURN `username` and `credential` values hardcoded in client-side JavaScript, mobile code, or committed configuration files -- TURN credentials should be short-lived (generated via TURN REST API with TTL) and fetched from the server at call time. Hardcoded credentials can be extracted and used to abuse the TURN server for traffic relaying
- [ ] **STUN/TURN single point of failure**: flag ICE configurations with only one STUN or TURN server endpoint -- if that server is unreachable, all new connections fail. Provide at least two geographically distributed TURN servers
- [ ] **Missing ICE restart**: flag peer connection handlers that do not implement ICE restart (`iceRestart: true` in `createOffer`) for mid-session network changes -- when a user switches from WiFi to cellular, the existing ICE candidates become invalid and the call drops without ICE restart

### SDP Security and Handling
<!-- activation: keywords=["SDP", "sdp", "offer", "answer", "setLocalDescription", "setRemoteDescription", "RTCSessionDescription", "createOffer", "createAnswer", "munging"] -->

- [ ] **SDP applied without validation**: flag code that calls `setRemoteDescription` with SDP received from a remote peer without any validation -- a malicious peer can craft SDP to downgrade encryption, force a specific (vulnerable) codec, or inject unexpected media lines. Validate that SDP contains expected m-lines and does not remove encryption
- [ ] **SDP munging for production features**: flag production code that modifies SDP strings directly (regex replacing, string manipulation) to implement features -- SDP munging is fragile, breaks across browser versions, and can silently disable security features. Use `RTCRtpTransceiver` API for codec and direction control
- [ ] **Missing rollback on failure**: flag `setRemoteDescription` calls that do not handle failure by rolling back to the previous stable state -- a failed SDP negotiation leaves the peer connection in a broken state if not rolled back

### Media Permissions and Encryption
<!-- activation: keywords=["getUserMedia", "getDisplayMedia", "MediaStream", "track", "audio", "video", "permission", "SRTP", "DTLS", "encrypt", "secure"] -->

- [ ] **Premature media permission request**: flag `getUserMedia()` or `getDisplayMedia()` called on page load or component mount rather than in response to a user action (button click) -- requesting camera/microphone before user intent is established results in permission denials, poor UX, and wasted resources
- [ ] **No encryption verification**: flag code that starts media transmission without verifying that DTLS-SRTP is negotiated -- while WebRTC mandates encryption, implementation bugs or misconfigurations can result in unencrypted RTP. Check `RTCStatsReport` for `dtlsCipher` and `srtpCipher` to verify
- [ ] **Tracks not stopped on disconnect**: flag code that does not call `track.stop()` on all media tracks when the call ends -- camera and microphone remain active (indicator light stays on), and system resources are held

### DataChannel and Quality Monitoring
<!-- activation: keywords=["DataChannel", "createDataChannel", "ordered", "maxRetransmits", "maxPacketLifeTime", "reliable", "getStats", "stats", "bitrate", "bandwidth", "quality"] -->

- [ ] **DataChannel without reliability config**: flag `createDataChannel()` calls that do not specify `ordered`, `maxRetransmits`, or `maxPacketLifeTime` -- the default is reliable and ordered (like TCP), which may not be appropriate for real-time use cases (gaming, live cursors) where losing a packet is better than waiting for retransmission
- [ ] **No connection quality monitoring**: flag WebRTC implementations that never call `getStats()` or `RTCPeerConnection.getStats()` -- without monitoring RTT, packet loss, jitter, and available bandwidth, the application cannot adapt quality or alert users to degraded connections
- [ ] **No bandwidth adaptation**: flag video calls that do not adjust encoding bitrate based on available bandwidth -- sending at a fixed high bitrate on a constrained connection causes packet loss, buffering, and poor quality. Use `RTCRtpSender.setParameters()` to adapt

## Common False Positives

- **Server-side WebRTC (SFU/MCU)**: server-side implementations (mediasoup, Janus, LiveKit) handle ICE, DTLS, and SRTP internally. Do not flag missing client-side checks in SFU code that has its own transport management.
- **TURN credential rotation via infrastructure**: some deployments use ephemeral TURN credentials issued by a REST API with 24-hour TTL. Verify credential provisioning before flagging hardcoded values.
- **Testing with STUN only**: local network testing between machines on the same LAN does not require TURN. Flag only production or deployment configurations.
- **DataChannel for messaging**: reliable ordered DataChannel is correct for chat-like messaging. Do not flag missing `maxRetransmits` when reliable delivery is the intended behavior.

## Severity Guidance

| Finding | Severity |
|---|---|
| TURN credentials hardcoded in client-side code | Critical |
| No TURN server configured (10-15% of users cannot connect) | Critical |
| SDP applied without any validation | Important |
| getUserMedia called before user action | Important |
| No ICE restart for network changes | Important |
| Media tracks not stopped on disconnect | Important |
| Single STUN/TURN server with no redundancy | Minor |
| DataChannel reliability not explicitly configured | Minor |
| No getStats() quality monitoring | Minor |
| Missing onicecandidateerror handler | Minor |

## See Also

- `sec-owasp-a02-crypto-failures` -- DTLS-SRTP encryption verification is a crypto concern
- `sec-owasp-a05-misconfiguration` -- ICE server misconfiguration is a deployment issue
- `net-websocket-protocol` -- signaling servers often use WebSocket
- `perf-network-io` -- WebRTC data channels are a network I/O pattern
- `api-sse-and-websocket-protocol` -- real-time communication patterns

## Authoritative References

- [W3C WebRTC 1.0 Specification](https://www.w3.org/TR/webrtc/)
- [RFC 8825 -- Overview: Real-Time Protocols for Browser-Based Applications](https://datatracker.ietf.org/doc/html/rfc8825)
- [RFC 8445 -- ICE: A Protocol for NAT Traversal](https://datatracker.ietf.org/doc/html/rfc8445)
- [RFC 5764 -- DTLS-SRTP](https://datatracker.ietf.org/doc/html/rfc5764)
- [WebRTC for the Curious -- "Connecting" chapter](https://webrtcforthecurious.com/docs/03-connecting/)
