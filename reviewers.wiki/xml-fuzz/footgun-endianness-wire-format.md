---
id: footgun-endianness-wire-format
type: primary
depth_role: leaf
focus: "Detect host byte order in network protocols, missing htonl/ntohl, struct packing assumptions, and serialization without endianness specification"
parents:
  - index.md
covers:
  - Host byte order used in network protocol or file format without conversion
  - "Missing htonl/ntohl or equivalent byte-order conversion on wire data"
  - Struct cast to byte buffer assuming specific padding and alignment
  - Serialization format without endianness specification
  - "Mixed-endian fields in a single message (partially converted)"
  - "Bit-field layout assumption across compilers (implementation-defined)"
tags:
  - endianness
  - byte-order
  - wire-format
  - serialization
  - network
  - CWE-188
  - CWE-198
activation:
  file_globs:
    - "**/*.{c,h,cpp,hpp,go,rs,java,kt,cs,swift,zig,py}"
  keyword_matches:
    - htonl
    - htons
    - ntohl
    - ntohs
    - ByteOrder
    - BIG_ENDIAN
    - LITTLE_ENDIAN
    - byteorder
    - endian
    - Endian
    - to_be_bytes
    - to_le_bytes
    - from_be_bytes
    - from_le_bytes
    - pack
    - unpack
    - struct.pack
    - struct.unpack
    - ByteBuffer
    - DataView
    - getUint16
    - getUint32
    - setUint16
    - setUint32
    - socket
    - send
    - recv
    - write
    - read
    - serialize
    - deserialize
    - wire
    - protocol
    - binary
    - packed
  structural_signals:
    - Binary data serialization or deserialization
    - Network protocol implementation
    - Struct to bytes conversion
source:
  origin: file
  path: footgun-endianness-wire-format.md
  hash: "sha256:e79f389ddeeefe5110b884acab2c1e3b2e83fe17fbdfb042e64ff244a90826a6"
---
# Endianness and Wire Format Footguns

## When This Activates

Activates when diffs read or write binary data over the network, serialize structs to bytes, implement binary file formats, or parse wire protocols. The core danger: x86/x64 (little-endian) and network byte order (big-endian) differ. A 32-bit integer `0x01020304` is stored as `[01, 02, 03, 04]` in big-endian but `[04, 03, 02, 01]` in little-endian. Code that works on x86 by coincidence (both sides are x86) breaks silently when one side runs on ARM big-endian, when a file is shared across platforms, or when a third-party parser expects network byte order. The resulting corruption is often subtle -- values are wrong but not obviously so, and may only affect large values where the byte reordering is significant.

## Audit Surface

- [ ] Integer written to socket without htonl/htons
- [ ] Integer read from socket without ntohl/ntohs
- [ ] Struct cast to/from byte array via memcpy or pointer cast
- [ ] Binary format without documented byte order
- [ ] Protocol mixing big-endian and little-endian fields
- [ ] Bit-field struct for wire format (compiler-dependent layout)
- [ ] Manual integer decode from byte array with hardcoded shift
- [ ] Protobuf/msgpack integer decoded manually instead of via library
- [ ] Network protocol working only on one endianness
- [ ] Checksum computed on raw struct bytes without byte-order normalization
- [ ] Shared memory assuming same endianness

## Detailed Checks

### Missing Byte-Order Conversion (CWE-198)
<!-- activation: keywords=["htonl", "htons", "ntohl", "ntohs", "send", "recv", "write", "read", "socket", "connect", "accept", "port", "address"] -->

- [ ] **Write to socket without conversion**: flag `write(socket, &integer, sizeof(integer))` or `socket.send(struct.pack("I", value))` where `"I"` uses native byte order. Use `"!I"` (Python: network/big-endian) or call `htonl()` before writing. TCP/IP protocols define network byte order as big-endian
- [ ] **Read from socket without conversion**: flag `read(socket, &integer, sizeof(integer))` without `ntohl()` on the result. Even if both peers are x86 today, a future ARM deployment breaks silently
- [ ] **Port and address in host order**: flag `sockaddr_in.sin_port = 8080` without `htons(8080)`. Port and IP address fields in socket structures must be in network byte order
- [ ] **Partially converted message**: flag messages where some fields are converted (htonl) but others are not. Inconsistent conversion is worse than no conversion because it is harder to diagnose

### Struct Packing and Alignment (CWE-188)
<!-- activation: keywords=["struct", "pack", "packed", "pragma pack", "__attribute__((packed))", "repr(C)", "repr(packed)", "sizeof", "offsetof", "memcpy", "cast", "reinterpret_cast"] -->

- [ ] **Struct cast to bytes**: flag `memcpy(buffer, &struct, sizeof(struct))` for wire transmission. The struct layout (padding, alignment) is compiler and platform dependent. A struct with `{char a; int b;}` may have 3 bytes of padding on one compiler and 0 on another (packed)
- [ ] **Packed struct still endian-dependent**: `__attribute__((packed))` or `#pragma pack(1)` eliminates padding but does not fix endianness. Multi-byte fields within a packed struct still have host byte order
- [ ] **Bit-field layout**: C/C++ bit-fields have implementation-defined layout (MSB-first vs LSB-first, allocation unit, padding). Flag bit-field structs used as wire format. Use explicit byte/bit manipulation instead

### Manual Byte Extraction
<!-- activation: keywords=["shift", "<<", ">>", "& 0xFF", "| (", "[0]", "[1]", "[2]", "[3]", "getUint", "setUint", "ByteBuffer", "DataView"] -->

- [ ] **Hardcoded shift direction**: flag `value = buf[0] | (buf[1] << 8) | (buf[2] << 16) | (buf[3] << 24)` without documenting whether this is little-endian or big-endian decode. Big-endian would be `buf[0] << 24 | buf[1] << 16 | ...`. The shift direction defines the assumed byte order -- document it
- [ ] **JavaScript DataView without endian parameter**: `dataView.getUint32(offset)` defaults to big-endian. `dataView.getUint32(offset, true)` is little-endian. Flag calls without explicit endianness parameter when the data format's byte order is known
- [ ] **Java ByteBuffer order**: `ByteBuffer.order()` defaults to `BIG_ENDIAN`. Flag code that assumes little-endian without calling `buffer.order(ByteOrder.LITTLE_ENDIAN)` when parsing x86-origin data

### Binary File Formats
<!-- activation: keywords=["file", "format", "header", "magic", "version", "binary", "serialize", "deserialize", "save", "load", "write", "read"] -->

- [ ] **Undocumented byte order in file format**: flag binary file formats that store multi-byte integers without specifying endianness in the format documentation or file header. Well-designed formats use a magic number or header field to indicate byte order (e.g., BOM in Unicode, byte-order mark in TIFF)
- [ ] **Format portable but code not**: flag code that reads a big-endian file format (most standard formats) using native byte order operations on a little-endian host. The code works on x86 only if the format happens to be little-endian

### Cross-Language Serialization
<!-- activation: keywords=["protobuf", "msgpack", "CBOR", "Avro", "Thrift", "FlatBuffers", "Cap'n Proto", "json", "bson", "pickle"] -->

- [ ] **Manual protobuf/msgpack decoding**: flag hand-rolled varint decoding or field extraction instead of using the official library. Official serialization libraries handle endianness, varint encoding, and alignment correctly. Manual parsing often introduces byte-order bugs
- [ ] **Shared memory between languages**: flag shared memory segments accessed by programs in different languages (e.g., C and Java) without documented endianness agreement. Java is big-endian conceptually but can use `ByteBuffer` with either order

## Common False Positives

- **Text-based protocols**: JSON, XML, HTTP headers, and other text protocols do not have endianness issues. Flag only binary data.
- **Single-platform internal storage**: memory-mapped files or shared memory on a single platform with a single architecture have known, fixed endianness. Flag only if portability is required.
- **Serialization library used correctly**: protobuf, msgpack, CBOR, Avro, and similar libraries handle endianness internally. Do not flag code that uses these libraries as designed.
- **x86-only deployment**: if the deployment is permanently x86-only and all interacting systems are also x86, endianness bugs do not manifest. But flag if the code is a library or the deployment may change.

## Severity Guidance

| Finding | Severity |
|---|---|
| Integer sent over network without byte-order conversion in protocol code | Important |
| Struct cast to bytes for network transmission without conversion | Important |
| Bit-field struct used as wire format | Important |
| Partially converted message (some fields swapped, some not) | Important |
| Binary file format without documented byte order | Minor |
| JavaScript DataView without explicit endianness parameter | Minor |
| Manual byte extraction without documenting assumed byte order | Minor |

## See Also

- `footgun-integer-overflow-sign-extension` -- byte-order conversion can interact with sign extension
- `sec-owasp-a03-injection` -- malformed wire data from endianness bugs can trigger parsing vulnerabilities
- `principle-fail-fast` -- protocol parsers should validate byte order early

## Authoritative References

- [CWE-198: Use of Incorrect Byte Ordering](https://cwe.mitre.org/data/definitions/198.html)
- [CWE-188: Reliance on Data/Memory Layout](https://cwe.mitre.org/data/definitions/188.html)
- [RFC 1700: Assigned Numbers (Network Byte Order definition)](https://www.rfc-editor.org/rfc/rfc1700)
- [Rob Pike: The Byte Order Fallacy](https://commandcenter.blogspot.com/2012/04/byte-order-fallacy.html)
- [Ulrich Drepper: What Every Programmer Should Know About Memory (2007)](https://people.freebsd.org/~lstewart/articles/cpumemory.pdf)
