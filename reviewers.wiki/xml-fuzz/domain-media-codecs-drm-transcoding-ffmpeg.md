---
id: domain-media-codecs-drm-transcoding-ffmpeg
type: primary
depth_role: leaf
focus: Detect ffmpeg injection, DRM key exposure, missing output validation, and synchronous transcoding bottlenecks in media processing pipelines
parents:
  - index.md
covers:
  - ffmpeg command injection via user-controlled input
  - Transcoding output not validated for corruption or truncation
  - DRM key material stored in client-side code or config
  - "HLS/DASH manifest served without encryption"
  - ABR ladder not optimized for target audience
  - Missing content validation before processing untrusted media
  - Large media processed synchronously blocking request threads
  - Missing CDN cache headers on media segments
  - Codec mismatch between container and stream
  - No resource limits on transcoding processes
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
activation:
  file_globs:
    - "**/*ffmpeg*"
    - "**/*transcode*"
    - "**/*media*"
    - "**/*video*"
    - "**/*audio*"
    - "**/*hls*"
    - "**/*dash*"
    - "**/*drm*"
    - "**/*widevine*"
    - "**/*manifest*"
    - "**/*.m3u8"
  keyword_matches:
    - ffmpeg
    - codec
    - transcode
    - HLS
    - DASH
    - DRM
    - Widevine
    - FairPlay
    - PlayReady
    - media
    - video
    - audio
    - bitrate
    - resolution
    - ABR
    - manifest
    - segment
    - mux
    - demux
    - libx264
    - libx265
    - aac
    - opus
  structural_signals:
    - ffmpeg_command_construction
    - media_upload_handler
    - drm_key_configuration
    - hls_manifest_generation
source:
  origin: file
  path: domain-media-codecs-drm-transcoding-ffmpeg.md
  hash: "sha256:d405fcf1f69f2bd9207132d9ab6cada7638711c9fb8afd720e226d59d56ff1bb"
---
# Media: Codecs / DRM / Transcoding / FFmpeg

## When This Activates

Activates on diffs involving ffmpeg commands, media transcoding pipelines, HLS/DASH manifest generation, DRM configuration, ABR ladder setup, or media upload processing. Media pipelines are attack surfaces (ffmpeg processes untrusted input), performance bottlenecks (transcoding is CPU-intensive), and correctness hazards (codec mismatches produce silent corruption). DRM misconfigurations leak content keys, and missing output validation lets corrupted media reach end users.

## Audit Surface

- [ ] User input concatenated into ffmpeg command without sanitization
- [ ] Transcoding output not validated for duration, resolution, or codec
- [ ] DRM content key in client-side code or config
- [ ] HLS/DASH manifest without encryption signaling
- [ ] ABR ladder too many or too few renditions
- [ ] Untrusted media processed without format/codec probe
- [ ] Transcoding runs synchronously in request handler
- [ ] Media segments missing CDN cache headers
- [ ] ffmpeg process with no timeout, memory, or CPU limit
- [ ] Container/stream codec mismatch
- [ ] No error handling for ffmpeg non-zero exit
- [ ] Temp transcoding files not cleaned up on failure

## Detailed Checks

### FFmpeg Command Injection and Input Validation
<!-- activation: keywords=["ffmpeg", "command", "exec", "spawn", "shell", "input", "upload", "probe", "ffprobe", "format", "sanitize", "validate"] -->

- [ ] **Command injection via user input**: flag ffmpeg invocations where user-supplied values (filename, resolution, codec, filter) are concatenated into a shell command string -- use array-based exec and whitelist allowed values instead of string interpolation
- [ ] **No input validation before processing**: flag media processing pipelines that pass uploaded files directly to ffmpeg without first probing format and codec with ffprobe -- maliciously crafted files can exploit ffmpeg vulnerabilities or cause infinite processing
- [ ] **No resource limits on ffmpeg process**: flag ffmpeg spawned without a timeout (`-timelimit`), output size limit (`-fs`), or OS-level resource constraint (cgroup, ulimit) -- a malicious or corrupt input can consume unbounded CPU/memory
- [ ] **Missing ffprobe before transcode**: flag transcoding that assumes input properties (duration, resolution, codec) without probing -- incorrect assumptions produce silent output corruption

### DRM Key and License Security
<!-- activation: keywords=["DRM", "Widevine", "FairPlay", "PlayReady", "key", "license", "CPIX", "CENC", "encryption", "decrypt", "pssh", "content_key"] -->

- [ ] **DRM key in client-side code**: flag content encryption keys, license server signing keys, or key derivation secrets embedded in JavaScript, mobile app code, or client-accessible configuration -- keys must remain server-side
- [ ] **License server URL without auth**: flag DRM license acquisition URLs that accept requests without validating a session token or entitlement -- anyone with the URL can request a decryption license
- [ ] **Single content key for all assets**: flag DRM configurations using one content key across all media assets -- a single key compromise exposes the entire content library; use per-asset or per-session keys
- [ ] **PSSH box without key rotation**: flag long-lived content using the same encryption key indefinitely -- implement key rotation for content that stays available over extended periods

### HLS/DASH Manifest and Segment Delivery
<!-- activation: keywords=["HLS", "DASH", "manifest", "m3u8", "mpd", "segment", "playlist", "ABR", "rendition", "variant", "bitrate", "bandwidth", "Cache-Control", "CDN"] -->

- [ ] **Manifest without encryption signaling**: flag HLS playlists (.m3u8) or DASH MPDs that serve encrypted segments but do not include the `#EXT-X-KEY` tag or `ContentProtection` element -- players cannot decrypt the segments
- [ ] **ABR ladder not optimized**: flag ABR configurations with renditions clustered at similar bitrates (no perceptible quality difference) or large gaps between renditions (viewers on intermediate bandwidths get poor quality) -- follow industry guidelines (Apple HLS Authoring Spec)
- [ ] **Missing CDN cache headers**: flag media segment responses without `Cache-Control`, `Surrogate-Control`, or CDN-specific headers -- segments are re-fetched from origin on every request, increasing latency and cost
- [ ] **Manifest served over HTTP**: flag manifest or segment URLs using plain HTTP instead of HTTPS -- enables MITM attacks and content injection

### Transcoding Pipeline Correctness and Performance
<!-- activation: keywords=["transcode", "encode", "decode", "convert", "render", "async", "queue", "worker", "job", "output", "validate", "duration", "resolution", "temp", "cleanup"] -->

- [ ] **Synchronous transcoding in request handler**: flag transcoding triggered inline during an HTTP request -- transcoding is CPU-intensive and long-running; dispatch to a background worker or job queue
- [ ] **No output validation**: flag transcoding pipelines that do not verify the output file has expected duration (within tolerance of input), expected resolution, valid codec, and non-zero file size -- silent corruption passes through
- [ ] **Ignoring ffmpeg exit code**: flag code that spawns ffmpeg and does not check the exit code or stderr for errors -- a non-zero exit often indicates corrupt or truncated output
- [ ] **Temp files not cleaned on failure**: flag transcoding workflows that write to temporary files but do not clean them up when the process fails or is interrupted -- disk fills over time

## Common False Positives

- **Developer tooling and scripts**: ffmpeg commands in build scripts, local dev tools, or CI pipelines processing known-good test fixtures do not need the same input validation rigor as production upload handlers. Focus on user-facing paths.
- **Passthrough muxing**: remuxing (copying streams without re-encoding via `-c copy`) is fast and low-risk. Do not flag synchronous execution concerns for passthrough operations.
- **Static ABR configurations**: pre-defined ABR ladders from well-known providers (Apple, YouTube guidelines) should not be flagged for optimization unless the target audience differs significantly from the guideline assumptions.
- **Offline batch transcoding**: batch pipelines running on dedicated workers with monitoring are different from synchronous request-path transcoding. Focus synchronous-blocking flags on request handlers.

## Severity Guidance

| Finding | Severity |
|---|---|
| User input in ffmpeg command string (command injection) | Critical |
| DRM content key embedded in client-side code | Critical |
| Untrusted media processed without format probe or resource limits | Critical |
| Transcoding output not validated -- corrupt media delivered to users | Important |
| License server URL accessible without auth | Important |
| Synchronous transcoding blocks HTTP request thread | Important |
| Manifest without encryption signaling -- players cannot decrypt | Important |
| Missing CDN cache headers on media segments | Minor |
| ffmpeg exit code not checked | Minor |
| Temp files not cleaned up on transcoding failure | Minor |

## See Also

- `sec-owasp-a03-injection` -- ffmpeg command injection is a shell injection variant
- `principle-fail-fast` -- unchecked ffmpeg exit codes and missing output validation hide failures
- `reliability-backpressure` -- transcoding queues need backpressure to prevent unbounded job accumulation
- `principle-separation-of-concerns` -- DRM key management should be separated from media delivery logic

## Authoritative References

- [FFmpeg Documentation, "Security Considerations"](https://ffmpeg.org/security.html)
- [Apple, "HLS Authoring Specification for Apple Devices"](https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices)
- [DASH-IF, "Guidelines for Implementation: DASH-IF Interoperability Points"](https://dashif.org/guidelines/)
- [OWASP, "OS Command Injection"](https://owasp.org/www-community/attacks/Command_Injection)
- [Widevine Documentation, "Content Encryption"](https://developers.google.com/widevine)
