---
id: api-hateoas-jsonapi-jsonld
type: primary
depth_role: leaf
focus: "Detect hypermedia API issues including missing links in responses, hardcoded URLs in clients, non-standard media types, missing self links, and incorrect JSON:API or JSON-LD structure"
parents:
  - index.md
covers:
  - API response missing hypermedia links for navigation and discoverability
  - Client hardcoding URLs instead of following links from responses
  - "Non-standard media type used where application/vnd.api+json or application/ld+json is expected"
  - Missing self link on resource representations
  - "JSON:API response with incorrect top-level structure (missing data, errors, meta)"
  - "JSON-LD context missing or incorrect @type/@id annotations"
  - "Relationship links missing in JSON:API compound documents"
  - "Pagination links (first, last, next, prev) missing on collection responses"
tags:
  - hateoas
  - hypermedia
  - json-api
  - jsonapi
  - json-ld
  - hal
  - links
  - rest
  - media-type
  - self-link
activation:
  file_globs:
    - "**/*hateoas*"
    - "**/*hypermedia*"
    - "**/*jsonapi*"
    - "**/*json-api*"
    - "**/*jsonld*"
    - "**/*json-ld*"
    - "**/*hal*"
    - "**/*link*"
    - "**/*serializer*"
    - "**/*resource*"
  keyword_matches:
    - HATEOAS
    - hateoas
    - hypermedia
    - jsonapi
    - "JSON:API"
    - json-ld
    - JSON-LD
    - HAL
    - _links
    - links
    - self
    - "@context"
    - "@type"
    - "@id"
    - rel
    - href
    - vnd.api+json
    - ld+json
  structural_signals:
    - Response object with _links or links property
    - "JSON:API top-level data/errors/meta structure"
    - "JSON-LD @context annotation"
source:
  origin: file
  path: api-hateoas-jsonapi-jsonld.md
  hash: "sha256:cc30b571793678482276bb8510e798e4f54a080ad4d1cee5ce0c23bb93c46ff4"
---
# Hypermedia API Design (HATEOAS / JSON:API / JSON-LD)

## When This Activates

Activates when diffs touch API response serializers, link generation, JSON:API or JSON-LD document construction, HAL resource building, or client code that constructs API URLs. HATEOAS (Hypermedia as the Engine of Application State) means clients navigate the API by following links in responses rather than hardcoding URL patterns. JSON:API and JSON-LD are standardized formats for hypermedia APIs with specific structural requirements. This reviewer detects missing links, hardcoded client URLs, format violations, and inconsistencies that break hypermedia navigation.

## Audit Surface

- [ ] API response returning resource data with no _links, links, or @context property
- [ ] Client code constructing API URLs by string concatenation instead of following response links
- [ ] Response Content-Type not set to application/vnd.api+json for JSON:API or application/ld+json for JSON-LD
- [ ] Resource representation missing self link (URL to itself)
- [ ] JSON:API response missing required top-level member (data, errors, or meta)
- [ ] JSON:API resource object missing type or id field
- [ ] JSON-LD document missing @context, @type, or @id
- [ ] Collection response missing pagination links (next, prev, first, last)
- [ ] JSON:API relationship object missing links or data member
- [ ] Embedded resource with no link to its canonical URL
- [ ] Link relation type not using IANA-registered or documented custom relation
- [ ] API response mixing hypermedia formats (HAL and JSON:API in same API)

## Detailed Checks

### Missing Hypermedia Links
<!-- activation: keywords=["link", "links", "_links", "self", "href", "rel", "next", "prev", "first", "last", "related", "canonical", "url", "uri"] -->

- [ ] **No self link**: flag resource representations that do not include a self link (the canonical URL of the resource) -- self links enable clients to refresh, update, or delete the resource without URL construction
- [ ] **No pagination links**: flag collection responses with pagination that do not include next, prev, first, and last links -- clients must construct pagination URLs manually, breaking the HATEOAS constraint
- [ ] **No relationship links**: flag resources with relationships (e.g., order -> customer) that provide only IDs without links to the related resource -- clients need a link to fetch the related resource without knowing the URL pattern
- [ ] **No action links**: flag resources with available state transitions (e.g., order can be cancelled, invoice can be paid) that do not advertise these actions as links -- clients must hardcode knowledge of available actions

### Hardcoded URLs in Clients
<!-- activation: keywords=["fetch", "axios", "http", "request", "url", "URL", "href", "endpoint", "path", "concat", "template", "interpolate", "base"] -->

- [ ] **URL construction in client**: flag client code that builds API URLs by string concatenation or template literals (`/api/v1/users/${id}/orders`) instead of following links from a previous response -- hardcoded URLs couple the client to the server's URL structure
- [ ] **Hardcoded API paths**: flag client code with API paths stored as constants (`const ORDERS_URL = '/api/v1/orders'`) rather than extracted from response links or a discoverable entry point -- changing the URL structure requires client changes
- [ ] **Missing entry point**: flag client code that jumps directly to resource URLs without first fetching an API root/entry point that provides initial navigation links -- the API root is the single hardcoded URL in a HATEOAS client

### JSON:API Compliance
<!-- activation: keywords=["jsonapi", "JSON:API", "vnd.api+json", "data", "attributes", "relationships", "included", "type", "id", "errors", "meta"] -->

- [ ] **Missing top-level member**: flag JSON:API responses missing the required top-level `data`, `errors`, or `meta` member -- the specification requires at least one of these
- [ ] **Missing type or id**: flag JSON:API resource objects without `type` and `id` fields -- these are required by the specification for resource identification
- [ ] **Attributes containing relationships**: flag JSON:API resource objects with related resource IDs in `attributes` instead of in `relationships` -- relationships belong in the `relationships` member with proper linkage
- [ ] **Wrong Content-Type**: flag JSON:API responses served with `application/json` instead of `application/vnd.api+json` -- the specification requires the custom media type for proper content negotiation

### JSON-LD Structure
<!-- activation: keywords=["@context", "@type", "@id", "@graph", "json-ld", "JSON-LD", "ld+json", "schema.org", "linked data", "RDF"] -->

- [ ] **Missing @context**: flag JSON-LD documents without a `@context` property -- the context defines how terms in the document map to IRIs, enabling linked data interoperability
- [ ] **Missing @type**: flag JSON-LD nodes without a `@type` declaration -- without type information, consumers cannot determine the kind of resource they are processing
- [ ] **Missing @id**: flag JSON-LD nodes representing identifiable resources without an `@id` property -- the @id provides the canonical identifier (IRI) for the resource
- [ ] **Invalid context URL**: flag JSON-LD documents referencing custom @context URLs that do not resolve or are not versioned -- broken context URLs prevent consumers from dereferencing the vocabulary

### Format Consistency
<!-- activation: keywords=["format", "media", "content-type", "accept", "hal", "HAL", "json", "response", "serialize", "builder"] -->

- [ ] **Mixed formats**: flag APIs that use HAL for some endpoints and JSON:API for others -- inconsistent formats force clients to implement multiple parsers and understand multiple conventions
- [ ] **Non-standard link format**: flag APIs that invent custom link formats instead of using HAL (`_links`), JSON:API (`links`), or JSON-LD (`@id`) -- non-standard formats prevent use of standard client libraries
- [ ] **Non-IANA relation types**: flag link relations using custom names without documentation when an IANA-registered relation type exists (e.g., using `items` instead of the registered `item`, or `related-orders` instead of `related`) -- standard relation types improve interoperability

## Common False Positives

- **Non-hypermedia REST APIs**: most REST APIs do not implement HATEOAS. This reviewer applies only when the project explicitly adopts a hypermedia format (JSON:API, HAL, JSON-LD) or HATEOAS principles. Do not flag standard REST APIs for missing links.
- **Internal APIs with stable contracts**: internal APIs where client and server are developed together may legitimately skip hypermedia navigation. HATEOAS primarily benefits public APIs with many independent consumers.
- **GraphQL APIs**: GraphQL has its own type system and navigation model. Do not apply hypermedia link requirements to GraphQL responses.
- **Partial adoption**: some APIs add self links and pagination links without full HATEOAS. This is pragmatic and should not be flagged as inconsistent -- flag only if the project's stated goal is full hypermedia.

## Severity Guidance

| Finding | Severity |
|---|---|
| JSON:API response missing required top-level data/errors/meta member | Important |
| JSON:API resource object missing type or id field | Important |
| JSON-LD document missing @context | Important |
| Collection response with pagination but no next/prev links | Important |
| Client constructing URLs by string concatenation in HATEOAS API | Important |
| Resource representation missing self link | Minor |
| Wrong Content-Type for JSON:API (application/json instead of vnd.api+json) | Minor |
| Custom link relation type where IANA-registered type exists | Minor |
| Mixed hypermedia formats across API endpoints | Minor |

## See Also

- `api-rest` -- foundational REST conventions that hypermedia extends with links and media types
- `principle-coupling-cohesion` -- HATEOAS reduces client-server coupling by eliminating hardcoded URL dependencies
- `principle-solid` -- Dependency Inversion: clients depend on link contracts, not URL implementation
- `api-versioning-deprecation` -- hypermedia links can advertise available API versions and deprecation status
- `api-openapi-asyncapi-schema` -- OpenAPI can describe link objects and media types for hypermedia APIs

## Authoritative References

- [JSON:API Specification v1.1](https://jsonapi.org/format/)
- [JSON-LD 1.1 Specification (W3C)](https://www.w3.org/TR/json-ld11/)
- [HAL -- Hypertext Application Language (Internet Draft)](https://datatracker.ietf.org/doc/html/draft-kelly-json-hal)
- [IANA Link Relations Registry](https://www.iana.org/assignments/link-relations/link-relations.xhtml)
- [RFC 8288: Web Linking](https://datatracker.ietf.org/doc/html/rfc8288)
- [Roy Fielding, "REST APIs must be hypertext-driven" (2008)](https://roy.gbiv.com/untangled/2008/rest-apis-must-be-hypertext-driven)
