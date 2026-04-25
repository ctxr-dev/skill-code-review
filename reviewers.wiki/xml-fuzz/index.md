---
id: xml-fuzz
type: index
depth_role: subcategory
depth: 1
focus: ".NET BinaryFormatter or NetDataContractSerializer on untrusted input; .NET BinaryFormatter, SoapFormatter, NetDataContractSerializer, and ObjectStateFormatter on untrusted streams; ABR ladder not optimized for target audience; Architecture-specific assumptions (pointer size, integer width, alignment)"
parents:
  - "../index.md"
shared_covers: []
entries:
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
  - id: footgun-endianness-wire-format
    file: footgun-endianness-wire-format.md
    type: primary
    focus: "Detect host byte order in network protocols, missing htonl/ntohl, struct packing assumptions, and serialization without endianness specification"
    tags:
      - endianness
      - byte-order
      - wire-format
      - serialization
      - network
      - CWE-188
      - CWE-198
  - id: footgun-regex-redos
    file: footgun-regex-redos.md
    type: primary
    focus: Detect catastrophic backtracking in regex patterns, user-controlled regex input, and missing regex execution timeouts
    tags:
      - regex
      - ReDoS
      - backtracking
      - denial-of-service
      - performance
      - CWE-1333
      - CWE-400
  - id: qa-portability-interoperability
    file: qa-portability-interoperability.md
    type: primary
    focus: "Detect OS-specific code without abstraction, hardcoded paths, platform-specific APIs without fallback, missing charset/encoding handling, and byte-order assumptions that hinder portability and interoperability"
    tags:
      - portability
      - interoperability
      - cross-platform
      - encoding
      - charset
      - endianness
      - paths
      - locale
      - os-specific
  - id: sec-deserialization
    file: sec-deserialization.md
    type: primary
    focus: Detect insecure deserialization patterns across all major languages where untrusted data is deserialized into executable object graphs
    tags:
      - deserialization
      - insecure-deserialization
      - RCE
      - gadget-chain
      - pickle
      - ObjectInputStream
      - BinaryFormatter
      - marshal
      - serialize
      - CWE-502
      - owasp
      - a08
      - integrity
      - SRI
      - CDN
      - "CI/CD"
      - artifact
      - signing
      - supply-chain
      - security
  - id: sec-path-traversal-and-file-uploads
    file: sec-path-traversal-and-file-uploads.md
    type: primary
    focus: Detect path traversal vulnerabilities and insecure file upload handling that enable unauthorized file access, code execution, or denial of service
    tags:
      - path-traversal
      - directory-traversal
      - file-upload
      - zip-slip
      - symlink
      - LFI
      - RFI
      - CWE-22
      - CWE-434
      - CWE-73
  - id: sec-xxe-and-xml-parsers
    file: sec-xxe-and-xml-parsers.md
    type: primary
    focus: Detect XML External Entity injection and XML parser misconfigurations that enable file disclosure, SSRF, or denial of service
    tags:
      - XXE
      - XML
      - external-entity
      - DTD
      - billion-laughs
      - XSLT
      - XInclude
      - SOAP
      - SVG
      - CWE-611
      - CWE-776
      - CWE-827
      - saml
      - sso
      - authentication
      - xml
      - signature
      - CWE-347
      - CWE-290
  - id: test-fuzzing
    file: test-fuzzing.md
    type: primary
    focus: Detect missing fuzz targets for parsers and deserializers, verify corpus management, and ensure coverage-guided fuzzing is properly configured
    tags:
      - fuzzing
      - fuzz-testing
      - libfuzzer
      - afl
      - go-fuzz
      - jazzer
      - oss-fuzz
      - corpus
      - crash-triage
      - security-testing
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Xml Fuzz

**Focus:** .NET BinaryFormatter or NetDataContractSerializer on untrusted input; .NET BinaryFormatter, SoapFormatter, NetDataContractSerializer, and ObjectStateFormatter on untrusted streams; ABR ladder not optimized for target audience; Architecture-specific assumptions (pointer size, integer width, alignment)

## Children

| File | Type | Focus |
|------|------|-------|
| [domain-media-codecs-drm-transcoding-ffmpeg.md](domain-media-codecs-drm-transcoding-ffmpeg.md) | 📄 primary | Detect ffmpeg injection, DRM key exposure, missing output validation, and synchronous transcoding bottlenecks in media processing pipelines |
| [footgun-endianness-wire-format.md](footgun-endianness-wire-format.md) | 📄 primary | Detect host byte order in network protocols, missing htonl/ntohl, struct packing assumptions, and serialization without endianness specification |
| [footgun-regex-redos.md](footgun-regex-redos.md) | 📄 primary | Detect catastrophic backtracking in regex patterns, user-controlled regex input, and missing regex execution timeouts |
| [qa-portability-interoperability.md](qa-portability-interoperability.md) | 📄 primary | Detect OS-specific code without abstraction, hardcoded paths, platform-specific APIs without fallback, missing charset/encoding handling, and byte-order assumptions that hinder portability and interoperability |
| [sec-deserialization.md](sec-deserialization.md) | 📄 primary | Detect insecure deserialization patterns across all major languages where untrusted data is deserialized into executable object graphs |
| [sec-path-traversal-and-file-uploads.md](sec-path-traversal-and-file-uploads.md) | 📄 primary | Detect path traversal vulnerabilities and insecure file upload handling that enable unauthorized file access, code execution, or denial of service |
| [sec-xxe-and-xml-parsers.md](sec-xxe-and-xml-parsers.md) | 📄 primary | Detect XML External Entity injection and XML parser misconfigurations that enable file disclosure, SSRF, or denial of service |
| [test-fuzzing.md](test-fuzzing.md) | 📄 primary | Detect missing fuzz targets for parsers and deserializers, verify corpus management, and ensure coverage-guided fuzzing is properly configured |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
