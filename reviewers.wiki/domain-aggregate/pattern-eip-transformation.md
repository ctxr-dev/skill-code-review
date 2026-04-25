---
id: pattern-eip-transformation
type: primary
depth_role: leaf
focus: Detect misuse, absence, and over-engineering of Enterprise Integration message transformation patterns -- mapping, enrichment, normalization, and canonical data models.
parents:
  - index.md
covers:
  - Transformations that silently lose data by dropping fields without explicit intent
  - Transformers coupled to both source and target schemas instead of knowing only one
  - Enrichers that call external services synchronously in a message pipeline, blocking throughput
  - Normalizers that fail on unknown message formats instead of routing them to an error channel
  - Missing canonical data model causing point-to-point mappings to grow combinatorially
  - Transformers that mutate the input message in place instead of producing a new output
  - Mapping logic scattered across multiple layers instead of centralized in a transformer
  - Enrichment data fetched per message with no caching, causing redundant external calls
  - Transformation errors swallowed silently, producing corrupt output messages
  - Hardcoded field mappings that break when source or target schema evolves
tags:
  - eip
  - transformation
  - mapping
  - enricher
  - normalizer
  - canonical
  - translator
  - converter
  - enterprise-integration
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,ex,exs,erl,cpp,hpp,php}"
  keyword_matches:
    - transform
    - Transform
    - map
    - mapper
    - Mapper
    - enrich
    - Enricher
    - normalize
    - Normalizer
    - canonical
    - translate
    - convert
    - adapter
    - DTO
    - serialize
    - deserialize
    - marshal
    - unmarshal
    - schema
  structural_signals:
    - function_mapping_fields_between_two_types
    - class_calling_external_service_to_add_fields
    - multiple_format_handlers_with_shared_output_type
source:
  origin: file
  path: pattern-eip-transformation.md
  hash: "sha256:2a9478d53cb257274286a5b9e4f657ae5c4f58061bfd377b4f36fe4ce91678f3"
---
# EIP Message Transformation

## When This Activates

Activates when diffs introduce message mapping functions (converting between types or schemas), content enrichers (augmenting messages with external data), normalizers (converting multiple input formats to a common format), canonical data model definitions, serialization/deserialization logic, DTO conversion, or marshal/unmarshal operations. Message transformation is where integration architectures are most prone to silent data loss, tight coupling, and performance bottlenecks. A transformer that drops fields, an enricher that blocks the pipeline, or a missing canonical model turns a clean architecture into a maintenance nightmare. This reviewer detects where transformation patterns are misapplied, incomplete, or absent.

## Audit Surface

- [ ] Transformations that drop source fields do so explicitly (an exclusion list or mapping spec), not by omission
- [ ] Transformer depends on at most one side's schema (source or target), not both -- it maps from what it knows to a neutral or target representation
- [ ] Enrichers in message pipelines call external services asynchronously or use cached data, not synchronous blocking calls
- [ ] Normalizer handles all known input formats and routes unknown formats to an error channel or DLQ, not an unhandled exception
- [ ] Systems with 3+ integration partners use a canonical data model, not N*(N-1)/2 point-to-point mappings
- [ ] Transformers produce new output messages, not in-place mutations of the input
- [ ] Mapping logic is centralized in dedicated transformer classes/functions, not scattered across controllers, services, and handlers
- [ ] Enrichment data is cached when the same reference data is needed for multiple messages in a batch or time window
- [ ] Transformation errors produce an explicit error (exception, error message, DLQ routing), not a silently corrupt output
- [ ] Field mappings use typed accessors or generated code, not hardcoded string keys susceptible to silent breakage on schema changes
- [ ] Transformers perform structural mapping only -- business logic (validation, calculation, branching) belongs in separate pipeline stages
- [ ] Content enrichers have a fallback strategy (default value, cached stale data, skip enrichment) when the external source is unavailable
- [ ] Normalizer produces a single canonical output schema regardless of input format
- [ ] Transformations are applied lazily or only to consumers that need the transformed format, not eagerly to all messages
- [ ] Transformation logic has unit tests covering field mapping, edge cases (nulls, missing fields), and schema evolution scenarios

## Detailed Checks

### Lossy Transformation
<!-- activation: keywords=["map", "mapping", "transform", "convert", "field", "drop", "lose", "missing", "ignore", "omit", "skip", "null", "default", "truncate"] -->

- [ ] **Silent field drop**: transformer maps source to target but omits fields that exist in the source without an explicit exclusion list or `@Ignore` annotation -- consumers of the target silently lose data they may need
- [ ] **Null swallowing**: transformer maps a null source field to a default value (empty string, zero, false) without documenting the default -- downstream logic cannot distinguish "explicitly set to default" from "data was missing"
- [ ] **Truncation without warning**: string fields are truncated to fit the target schema's length constraint with no logging or error -- data loss is invisible
- [ ] **Type coercion loss**: numeric precision is lost in conversion (double to int, long to int, BigDecimal to float) without explicit rounding or overflow handling
- [ ] **Nested structure flattening**: a nested source structure is flattened into the target, discarding hierarchical relationships -- the target cannot reconstruct the original nesting
- [ ] **Collection to single value**: a list or array in the source is mapped to a single value in the target (first element, last element, or count) with no indication that data was lost

### Transformer Coupling
<!-- activation: keywords=["import", "depend", "couple", "source", "target", "both", "schema", "type", "model", "reference", "know"] -->

- [ ] **Dual schema dependency**: transformer imports both `SourceSystem.OrderDTO` and `TargetSystem.OrderEntity`, creating a compile-time dependency on two systems -- if either changes, the transformer and its tests break
- [ ] **Transformer in source module**: transformer lives in the source system's module and imports the target system's types -- the source now depends on the target, inverting the intended dependency direction
- [ ] **Shared domain model as bridge**: source and target both depend on a "shared" domain model that accumulates fields from every system -- this is a god model, not a canonical model
- [ ] **Bidirectional transformer**: a single class maps A-to-B and B-to-A, coupling it to both schemas -- split into two unidirectional transformers, each knowing one side and the canonical model
- [ ] **Inline mapping in controller/handler**: mapping logic is embedded in an HTTP controller or message handler that also handles routing, validation, and persistence -- extract a dedicated transformer

### Content Enricher
<!-- activation: keywords=["enrich", "Enricher", "augment", "lookup", "fetch", "external", "API", "service", "database", "cache", "hydrate", "decorate", "supplement"] -->

- [ ] **Synchronous enrichment in pipeline**: enricher calls an external HTTP service or database synchronously inside a message processing pipeline -- one slow or unavailable external call blocks all messages behind it
- [ ] **No cache for reference data**: enricher fetches the same reference data (country codes, product catalog, user profiles) for every message -- add a cache with TTL to avoid redundant external calls
- [ ] **No fallback on enrichment failure**: enricher calls an external service that is unavailable, and the entire message fails -- provide a fallback (cached stale data, default value, skip enrichment and flag for later retry)
- [ ] **Enricher adds fields to input message**: enricher modifies the original message object in place by adding fields -- upstream code holding a reference to the message sees unexpected mutations
- [ ] **Enrichment is mandatory but external source is best-effort**: enricher calls a non-critical external service, but failure to enrich blocks message processing -- evaluate whether enrichment is truly required or can be deferred
- [ ] **N+1 enrichment**: a batch of N messages triggers N individual external calls for enrichment -- batch the lookups into a single call where the external API supports it

### Normalizer
<!-- activation: keywords=["normalize", "Normalizer", "canonical", "format", "variant", "version", "detect", "identify", "classify", "unknown", "unrecognized"] -->

- [ ] **Unknown format unhandled**: normalizer handles formats A, B, and C with explicit branches but throws an unhandled exception on format D -- route unknown formats to an error channel or DLQ
- [ ] **Normalizer output varies by input**: normalizer produces slightly different output schemas depending on which input format it received -- the entire point of normalization is a single canonical output regardless of input
- [ ] **Format detection by trial and error**: normalizer tries to parse as format A, catches the exception, tries format B, catches, tries format C -- fragile, slow, and produces misleading error messages when all formats fail
- [ ] **Normalizer as god class**: a single normalizer class handles 10+ input formats with growing branches -- extract a strategy per format and let the normalizer dispatch
- [ ] **No format version handling**: normalizer handles format A v1 but not v2 -- when producers upgrade, messages fail silently or produce corrupt output

### Canonical Data Model
<!-- activation: keywords=["canonical", "common", "shared", "model", "contract", "standard", "universal", "intermediate", "hub", "spoke", "mapping", "point-to-point"] -->

- [ ] **Point-to-point mapping explosion**: N systems exchange messages and there are O(N^2) mapping functions (system A-to-B, A-to-C, B-to-C, ...) -- introduce a canonical model so each system maps to/from the canonical only (O(N) mappers)
- [ ] **Canonical model as god object**: the canonical data model accumulates every field from every system -- it should contain only the intersection of commonly needed fields, with system-specific extensions handled separately
- [ ] **Canonical model never versioned**: the canonical model has no version field or evolution strategy -- when it changes, all mappers break simultaneously
- [ ] **No canonical model with 4+ integration partners**: four or more systems exchange messages through point-to-point mappings without an intermediate canonical model -- the mapping count and maintenance burden grow quadratically
- [ ] **Canonical model in the wrong layer**: the canonical model is defined in a specific system's module instead of a shared library or schema registry -- the defining system becomes a dependency for all others

### Transformation Error Handling
<!-- activation: keywords=["error", "exception", "catch", "fail", "null", "corrupt", "invalid", "fallback", "try", "catch", "throw", "log"] -->

- [ ] **Error returns null/empty**: transformation catch block returns `null`, an empty object, or a default instance -- downstream consumers process a silently corrupt message as if it were valid
- [ ] **Exception swallowed**: transformation error is caught, logged, and the message continues through the pipeline with partial or no transformation applied -- downstream stages receive malformed data
- [ ] **No transformation tests**: mapping logic has no unit tests -- correctness is verified only by manual inspection or end-to-end integration tests that may not cover edge cases (nulls, missing fields, type mismatches)
- [ ] **Partial transformation on error**: transformer maps 10 fields; field 5 fails, and the transformer returns the partially-mapped result (fields 1-4 mapped, 5-10 missing) -- either all fields succeed or the entire transformation fails
- [ ] **Error message lacks context**: transformation failure logs the exception but not which message, which field, or which mapping rule failed -- debugging requires reproducing the exact input

## Common False Positives

- **ORM entity mapping**: frameworks like Hibernate, Entity Framework, and SQLAlchemy map database rows to objects. These are persistence mappings, not integration transformations. Flag only if the ORM mapping is used as the integration contract between services.
- **View model mapping**: mapping domain objects to view models (React props, API response DTOs) in a single application is not EIP transformation. Flag only when the mapping crosses service boundaries.
- **Serialization frameworks**: Jackson, Gson, System.Text.Json, serde -- these are serialization tools, not message transformers. Flag only when custom serialization logic silently drops fields or performs lossy conversion.
- **AutoMapper / MapStruct**: code-generated mapping libraries handle field-to-field mapping. Flag only when the mapping configuration silently ignores unmapped fields (`CreateMap<A, B>().ForAllOtherMembers(opt => opt.Ignore())`).
- **Protobuf / Avro codegen**: generated serialization code is not hand-written transformation. Flag only if generated code is manually modified (which will be overwritten on regeneration).

## Severity Guidance

| Finding | Severity |
|---|---|
| Lossy transformation silently drops fields carrying business-critical data | high |
| Transformation error returns null/empty, producing corrupt downstream messages | high |
| Synchronous enricher in pipeline blocks all messages on external service latency | high |
| Normalizer throws unhandled exception on unknown format, crashing the consumer | high |
| Point-to-point mapping explosion with 4+ systems and no canonical model | medium |
| Transformer coupled to both source and target schemas | medium |
| Enricher has no fallback when external source is unavailable | medium |
| Normalizer output schema varies by input format | medium |
| Field mappings use hardcoded string keys susceptible to silent breakage | medium |
| Canonical data model accumulates fields from every system (god model) | medium |
| Mapping logic duplicated across 3+ locations | low |
| Enricher fetches same reference data per message with no caching | low |
| No unit tests for transformation logic | low |
| Transformation applied eagerly when only a subset of consumers need it | low |

## See Also

- `pattern-eip-messaging` -- transformers consume and produce messages; schemaless or god messages make transformation fragile and lossy
- `pattern-eip-routing` -- routers often precede transformers; a router that inspects message internals creates the same coupling as a transformer that knows both schemas
- `pattern-eip-endpoint` -- endpoints deserialize messages before transformation; deserialization failures interact with transformation error handling
- `pattern-adapter` -- the adapter pattern wraps one interface to conform to another, which is the structural analog of a message transformer; same coupling concerns apply
- `principle-solid` -- transformers coupled to both source and target violate SRP and DIP; point-to-point mapping explosions violate OCP
- `principle-separation-of-concerns` -- transformers should perform structural mapping only, not business logic
- `principle-coupling-cohesion` -- dual-schema transformers and god canonical models create high coupling

## Authoritative References

- [Gregor Hohpe & Bobby Woolf, *Enterprise Integration Patterns* (2003), Chapter 6: Message Transformation](https://www.enterpriseintegrationpatterns.com/)
- [Gregor Hohpe, "Message Translator"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageTranslator.html)
- [Gregor Hohpe, "Content Enricher"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/DataEnricher.html)
- [Gregor Hohpe, "Normalizer"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/Normalizer.html)
- [Gregor Hohpe, "Canonical Data Model"](https://www.enterpriseintegrationpatterns.com/patterns/messaging/CanonicalDataModel.html)
- [Martin Fowler, "Data Transfer Object"](https://martinfowler.com/eaaCatalog/dataTransferObject.html)
