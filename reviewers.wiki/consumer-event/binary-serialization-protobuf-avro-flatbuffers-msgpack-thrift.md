---
id: binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift
type: primary
depth_role: leaf
focus: Detect schema-evolution hazards in binary serialization formats -- reused field numbers, missing reserved markers, enum reordering, required fields added, and schema-registry integration gaps
parents:
  - index.md
covers:
  - "Protobuf/Thrift field numbers reused after removal (breaks backward compat)"
  - Required fields added to an existing Avro record or proto2 message
  - "Removed fields/tags not marked reserved (future collision risk)"
  - Enum value inserted in the middle, shifting downstream ordinals
  - "oneof/union variant type changed (breaking change)"
  - Schema not versioned or not registered with a schema registry
  - "Breaking schema change without rolling a new major message/topic"
  - FlatBuffers file_identifier collisions between distinct schemas
  - MessagePack extension type ID collisions
  - Thrift struct with duplicate field numbers
  - "Cap'n Proto unordered fields / missing @ids"
  - Avro default values missing, blocking reader-side evolution
tags:
  - protobuf
  - thrift
  - avro
  - flatbuffers
  - capnproto
  - msgpack
  - serialization
  - schema-evolution
  - schema-registry
  - reserved
activation:
  file_globs:
    - "**/*.proto"
    - "**/*.fbs"
    - "**/*.thrift"
    - "**/*.avsc"
    - "**/*.capnp"
    - "**/schemas/**"
  keyword_matches:
    - protobuf
    - protoc
    - Avro
    - FlatBuffers
    - MessagePack
    - msgpack
    - Thrift
    - "Cap'n Proto"
    - capnp
    - Bincode
    - reserved
    - required
    - optional
    - oneof
    - field_number
    - schema evolution
    - schema registry
    - buf
  structural_signals:
    - reused_field_number
    - missing_reserved_tag
    - enum_value_inserted_mid
source:
  origin: file
  path: binary-serialization-protobuf-avro-flatbuffers-msgpack-thrift.md
  hash: "sha256:a7cc57dc77ab8f9450928e368b134dd4618aab1e4ca485370837715b2b9dbf51"
---
# Binary Serialization (Protobuf, Avro, FlatBuffers, MessagePack, Thrift)

## When This Activates

Activates when diffs touch schema files (`.proto`, `.avsc`, `.fbs`, `.thrift`, `.capnp`) or register new binary extension type codes. Binary serialization formats pack data by ordinal (field number, enum index, or type code) rather than by name, so schema evolution is treacherous: reusing a removed field number silently corrupts data on older readers, inserting an enum value mid-list reassigns every subsequent value, and removing a required field breaks every consumer that cannot tolerate its absence. This reviewer enforces the evolution rules for each format so wire-compatibility is preserved across rolling deployments.

## Audit Surface

- [ ] Field numbers/tags reused after removal
- [ ] Removed fields/tags not listed in `reserved` / equivalent
- [ ] Required fields added to existing proto2 message or Avro record without default
- [ ] Enum value inserted mid-list (protobuf, Avro, Thrift)
- [ ] oneof / union member type changed in place
- [ ] Schema not versioned or not registered with a schema registry
- [ ] Breaking change shipped without a new major message / topic
- [ ] FlatBuffers file_identifier collision between distinct schemas
- [ ] MessagePack extension type code collision
- [ ] Thrift struct with duplicate field numbers
- [ ] Cap'n Proto fields missing explicit @N ordinals
- [ ] Avro field missing default value (blocks forward/backward compat)
- [ ] CI lacking `buf breaking` / avro compatibility check

## Detailed Checks

### Field Numbers, Tags, and Reserved Entries
<!-- activation: keywords=["field_number", "tag", "reserved", "removed", "reused", "deprecated"] -->

- [ ] **Reused field number**: flag protobuf / Thrift fields whose tag number matches a previously-used (and since-removed) field -- old clients will deserialize the new bytes into the wrong field and corrupt data. Field numbers are permanent.
- [ ] **Missing reserved marker**: flag `.proto` messages that had fields removed in the diff without adding `reserved N;` and `reserved "name";` -- the reserved entry is what prevents future reuse. Thrift requires the same discipline by convention.
- [ ] **Field renumbering**: flag any change to an existing field's tag number -- this is a wire-breaking change even when the name stays the same.
- [ ] **Tag gaps filled incorrectly**: flag new fields assigned low numbers (1-15 in protobuf) when those were previously used -- prefer numbers above the deleted range.

### Required, Optional, and Defaults
<!-- activation: keywords=["required", "optional", "default", "singular", "repeated", "presence"] -->

- [ ] **Required field added (proto2)**: flag new `required` fields in proto2 messages used by existing consumers -- old senders will emit messages rejected by new readers. Use `optional` with a sensible default or explicit presence.
- [ ] **Avro field without default**: flag new fields in `.avsc` records that lack a `default` -- readers using an older schema cannot interpret messages written with the new schema (forward compatibility breaks).
- [ ] **Avro type narrowing**: flag Avro field type changes from nullable (`["null", "string"]`) to non-null -- historical records with nulls fail to parse.
- [ ] **FlatBuffers default change**: flag default-value changes on FlatBuffers fields -- defaults are embedded in readers; changing them causes silent divergence between old and new consumers.

### Enums and Unions
<!-- activation: keywords=["enum", "oneof", "union", "variant", "UNKNOWN", "UNSPECIFIED"] -->

- [ ] **Enum value inserted mid-list**: flag new enum members placed anywhere but the end -- protobuf and Thrift encode by numeric value, and Avro encodes by ordinal position; shifting ordinals reassigns every later value on the wire.
- [ ] **Protobuf enum missing zero default**: flag protobuf enums without a `UNKNOWN`/`UNSPECIFIED = 0` entry -- proto3 requires a zero default, and its absence hides "never set" from "explicitly set to first value".
- [ ] **oneof member type changed**: flag oneof / union members whose type was swapped (e.g., `string foo` replaced with `bytes foo`) -- this is a silent wire break. Add a new member instead and deprecate the old.
- [ ] **Enum removed without deprecation**: flag removal of enum values without a deprecation window -- old writers still emit the removed value and new readers see an invalid enum.

### Schema Registry and Compatibility Checks
<!-- activation: keywords=["schema registry", "confluent", "apicurio", "buf", "avro-tools", "compatibility", "BACKWARD", "FORWARD", "FULL"] -->

- [ ] **Schema not published**: flag new or modified `.avsc` / `.proto` files with no corresponding registry publish step in CI -- consumers cannot look the schema up by ID, and messages carrying new IDs fail to decode.
- [ ] **Compatibility mode unset or NONE**: flag schema registry subjects with `compatibility: NONE` or unset -- the registry will accept any breaking change. Use `BACKWARD` (default for event streams) or `FULL` deliberately.
- [ ] **CI missing breaking-change check**: flag repos that modify `.proto` without running `buf breaking` against the base branch, or `.avsc` without running the registry's compatibility test.
- [ ] **Schema versioning**: flag schema files lacking a version comment, package/namespace version, or directory structure indicating the major version -- consumers need a way to pin.

### Format-Specific Hazards
<!-- activation: keywords=["file_identifier", "root_type", "extension type", "ext_type", "@", "struct id", "capnp id", "msgpack ext"] -->

- [ ] **FlatBuffers file_identifier collision**: flag `.fbs` schemas sharing a `file_identifier` with another schema in the same service or repo -- identifiers are 4 ASCII bytes at the start of a buffer and collisions misroute data.
- [ ] **MessagePack extension type collision**: flag extension type codes (`-128..127`) registered for a new type when already in use -- the ranges `-128..-1` are reserved; collisions in `0..127` are silent deserialization corruption.
- [ ] **Thrift duplicate field numbers**: flag Thrift structs with two fields declared at the same ordinal -- compilers may accept this; the wire format corrupts.
- [ ] **Cap'n Proto missing @N**: flag Cap'n Proto fields declared without an explicit `@N` ordinal, or ordinals that are not monotonically assigned -- silent renumbering breaks every compiled client.

## Common False Positives

- **Greenfield schemas not yet deployed**: first-pass `.proto`/`.avsc` without consumers may legitimately renumber or reorder. Flag only when the schema has shipped (look for tags or registry history).
- **Internal binary formats with single writer/reader**: self-contained tools that ship writer and reader together can absorb breaking changes. Still prefer the conventions for hygiene.
- **Removing `reserved` entries**: valid only when the number range was never assigned; treat as suspicious but not automatic.

## Severity Guidance

| Finding | Severity |
|---|---|
| Reused field number / tag after removal | Critical |
| Enum value inserted mid-list (Avro or Thrift ordinal) | Critical |
| oneof / union member type changed in place | Critical |
| Required field added to existing proto2 message | Critical |
| Avro field added with no default | Critical |
| Missing `reserved` after field removal | Important |
| Compatibility mode NONE or unset on registry subject | Important |
| CI missing buf breaking / avro compatibility check | Important |
| FlatBuffers file_identifier collision | Important |
| MessagePack extension type collision | Important |
| Thrift struct duplicate field numbers | Important |
| Protobuf enum missing UNKNOWN = 0 | Minor |

## See Also

- `api-openapi-asyncapi-schema` -- the same evolution rules apply to event schemas described in AsyncAPI
- `api-versioning-deprecation` -- breaking binary changes require a coordinated version bump and deprecation window
- `sec-owasp-a05-misconfiguration` -- schema-registry compatibility mode is a security-relevant configuration

## Authoritative References

- [Protocol Buffers, "Updating a message type"](https://protobuf.dev/programming-guides/proto3/#updating)
- [buf, "Breaking change detection"](https://buf.build/docs/breaking/overview/)
- [Apache Avro, "Schema Resolution"](https://avro.apache.org/docs/1.11.1/specification/#schema-resolution)
- [Confluent Schema Registry, "Compatibility Types"](https://docs.confluent.io/platform/current/schema-registry/fundamentals/avro.html#compatibility-types)
- [FlatBuffers, "Schema Evolution"](https://flatbuffers.dev/flatbuffers_guide_writing_schema.html)
- [Cap'n Proto, "Evolving your protocol"](https://capnproto.org/language.html#evolving-your-protocol)
- [MessagePack, "Extension types"](https://github.com/msgpack/msgpack/blob/master/spec.md#extension-types)
