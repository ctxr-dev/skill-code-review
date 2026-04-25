---
id: footgun-resource-exhaustion-via-input
type: primary
depth_role: leaf
focus: Detect unbounded allocation from user input -- array sizes, string lengths, zip bombs, XML bombs, deeply nested JSON, and large file uploads without limits
parents:
  - index.md
covers:
  - Unbounded array or buffer allocation sized by user input
  - "Zip bomb: small compressed file decompressing to gigabytes"
  - "XML bomb (Billion Laughs): entity expansion consuming exponential memory"
  - Deeply nested JSON or data structure causing stack overflow on parse
  - "Regex bomb via catastrophic backtracking (cross-ref: footgun-regex-redos)"
  - Large file upload without server-side size limit
  - Unbounded string read or concatenation from network input
  - Recursive data structure traversal without depth limit
  - Quadratic algorithm on user-controlled collection size
  - Authentication endpoints without rate limiting or brute-force protection
  - API endpoints without request throttling or quota enforcement
  - List endpoints returning unbounded result sets without pagination
  - ReDoS-vulnerable regex patterns with catastrophic backtracking
  - Hash-collision DoS via user-controlled hash keys without randomization
  - "XML bomb (billion laughs) and zip bomb vectors not mitigated"
  - Unbounded file upload sizes allowing disk exhaustion
  - Unbounded request body sizes allowing memory exhaustion
  - Missing connection and request timeouts on outbound calls
  - Recursive data structures processed without depth limits
  - GraphQL queries without depth or complexity limits
  - Missing slowloris and connection-level DoS protections
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
aliases:
  - sec-rate-limit-and-dos
activation:
  file_globs:
    - "**/*.{java,kt,py,rb,go,rs,js,ts,cs,swift,scala,php,c,cpp}"
  keyword_matches:
    - malloc
    - alloc
    - new Array
    - "Array("
    - buffer
    - Buffer.alloc
    - read
    - readAll
    - ReadAll
    - ioutil.ReadAll
    - io.ReadAll
    - decompress
    - inflate
    - gunzip
    - unzip
    - ZipFile
    - ZipInputStream
    - XML
    - parse
    - JSON.parse
    - json.load
    - upload
    - multipart
    - stream
    - recursive
    - depth
    - nested
    - GraphQL
  structural_signals:
    - Allocation sized by external input
    - Decompression of untrusted data
    - "Parsing untrusted structured data (JSON, XML, protobuf)"
    - File upload handling
source:
  origin: file
  path: footgun-resource-exhaustion-via-input.md
  hash: "sha256:6fd04d4f7b209ac03abcb76e00c34c2a44ab9860392635652ea8343bdab1f30c"
---
# Resource Exhaustion via Input Footguns

## When This Activates

Activates when diffs parse, decompress, or allocate resources based on untrusted input -- file uploads, API request bodies, message queue payloads, or any external data source. The core danger: an attacker can send a small request that causes the server to allocate gigabytes of memory, burn CPU for hours, or overflow the stack. A 42-byte zip bomb decompresses to 4.5 PB. A 1 KB XML Billion Laughs payload expands to 3 GB. A 100-byte nested JSON causes stack overflow. These attacks bypass rate limiting because a single request is enough to crash or degrade the service.

## Audit Surface

- [ ] Array, list, or buffer created with size from user input without upper bound
- [ ] String read from network until delimiter without max length
- [ ] Zip/gzip/brotli decompression without output size limit
- [ ] XML parser without entity expansion limit or DTD disabled
- [ ] JSON parser without depth or size limit on untrusted input
- [ ] File upload endpoint without max file size enforced server-side
- [ ] Image/video processing without dimension or resolution limit
- [ ] Recursive function processing nested structure without depth counter
- [ ] Quadratic or exponential algorithm on user-controlled input size
- [ ] Streaming response read into memory without bounded buffer
- [ ] Database query with user-controlled LIMIT or no LIMIT
- [ ] Protobuf/MessagePack deserialization without max message size
- [ ] GraphQL query without depth, complexity, or cost limit
- [ ] Collection growing in loop based on user input without cap

## Detailed Checks

### Unbounded Allocation from Input (CWE-770)
<!-- activation: keywords=["malloc", "alloc", "Array", "buffer", "Buffer", "new", "size", "length", "count", "capacity", "reserve", "resize"] -->

- [ ] **User-controlled allocation size**: flag `new byte[userSize]`, `malloc(userCount * sizeof(item))`, `Buffer.alloc(requestedSize)` where the size comes from request parameters, headers, or deserialized payloads without an upper bound check. A request for `size=2147483647` allocates 2 GB
- [ ] **ReadAll on unbounded input**: flag `ioutil.ReadAll(req.Body)` (Go), `request.body.read()` (Ruby), `StreamReader.ReadToEnd()` (C#) on request bodies without prior size limit. The client controls how much data is sent. Use `io.LimitReader()` (Go) or framework-level body size limits
- [ ] **String concatenation in loop**: flag `result += chunk` in a loop reading from network or file. Each concatenation in naive implementations copies the entire string, producing O(n^2) time and O(n) memory. Use StringBuilder/ByteArrayOutputStream/list-then-join pattern with size cap

### Compression Bombs (CWE-400)
<!-- activation: keywords=["zip", "gzip", "brotli", "decompress", "inflate", "ZipFile", "ZipInputStream", "GZIPInputStream", "gunzip", "untar", "archive"] -->

- [ ] **Zip bomb**: flag extraction of user-uploaded zip/tar/gzip archives without: (1) output size limit, (2) entry count limit, (3) compression ratio check. A zip bomb can decompress to 10^15 bytes. Check decompressed size incrementally and abort when threshold exceeded
- [ ] **Nested zip bomb**: recursive zip files (zip within zip) bypass single-layer size checks. Limit extraction recursion depth
- [ ] **Gzip bomb in HTTP**: HTTP `Content-Encoding: gzip` on request bodies can be a gzip bomb. Flag servers that decompress request bodies without size limits. Set `express.json({ limit: '1mb' })` or equivalent

### XML Bombs (CWE-776)
<!-- activation: keywords=["XML", "SAX", "DOM", "parse", "DocumentBuilder", "XMLReader", "etree", "lxml", "expat", "entity", "DTD", "DOCTYPE", "ENTITY"] -->

- [ ] **Billion Laughs (entity expansion)**: flag XML parsing without disabling DTD processing or limiting entity expansion. The classic Billion Laughs defines nested entities that expand exponentially: 10 levels of 10x expansion = 10^10 copies. Disable DTDs: `factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)` (Java), `defusedxml` (Python)
- [ ] **External entity expansion (XXE)**: flag XML parser with external entity processing enabled. An attacker can reference `file:///etc/passwd` or a slow URL causing SSRF and DoS. This also overlaps with `sec-owasp-a03-injection` for data exfiltration

### Deep Nesting and Recursion (CWE-400)
<!-- activation: keywords=["JSON", "parse", "nested", "recursive", "depth", "stack", "overflow", "maxDepth", "tree", "traverse"] -->

- [ ] **Deeply nested JSON**: `{"a":{"a":{"a":...}}}` with thousands of nesting levels causes stack overflow in recursive JSON parsers. Flag JSON parsing of untrusted input without depth limit. Use `Jackson` with `StreamReadConstraints.maxNestingDepth()` (Java), `json.decoder` with custom depth check (Python), or streaming parsers
- [ ] **Recursive traversal without depth limit**: flag recursive functions processing user-supplied tree structures (JSON, XML, filesystem, GraphQL) without a depth counter. Pass `maxDepth` parameter and decrement on each recursive call
- [ ] **GraphQL depth/complexity**: flag GraphQL schemas without query depth limits, field complexity weights, or query cost analysis. A query like `{ user { friends { friends { friends { ... } } } } }` can trigger exponential database queries

### Quadratic and Exponential Algorithms
<!-- activation: keywords=["O(n^2)", "quadratic", "nested loop", "cartesian", "cross join", "product", "n*n", "sort", "dedup"] -->

- [ ] **Quadratic algorithm on user-controlled size**: flag nested loops where both bounds come from user input: `for each item in userList: for each other in userList`. 10,000 items = 100 million iterations. Add size limits or use more efficient algorithms
- [ ] **Array.includes/indexOf in loop**: `for (x of bigArray) { if (otherArray.includes(x)) ... }` is O(n*m). Use a Set for O(n+m)
- [ ] **Regex on large input**: flag regex applied to unbounded input. Even non-backtracking regex engines have linear cost -- 1 GB of input takes measurable time. Limit input size before regex

## Common False Positives

- **Internal data processing**: code processing trusted internal data (compiler, build tool, data pipeline) has lower risk. Flag only when the data source is external.
- **Streaming with backpressure**: code using proper streaming with backpressure (Node.js streams, Go io.Pipe) does not buffer the entire input in memory. Verify backpressure is correctly implemented.
- **Client-side code**: browser JavaScript already runs in a sandboxed environment with resource limits. Server-side is the primary concern.
- **Bounded input by design**: if the input is inherently bounded (e.g., a 140-character tweet, a single IP address), the risk is minimal.

## Severity Guidance

| Finding | Severity |
|---|---|
| XML parsing without DTD disabled on untrusted input (Billion Laughs) | Critical |
| Zip/archive extraction without output size limit on untrusted files | Critical |
| User-controlled allocation size without upper bound in server code | Critical |
| ReadAll on request body without size limit | Important |
| GraphQL without query depth or complexity limits | Important |
| Deeply nested JSON parsing without depth limit | Important |
| Quadratic algorithm on user-controlled collection size | Important |
| Image processing without dimension/resolution limit | Minor |
| String concatenation in loop (performance, not crash) | Minor |

## See Also

- `sec-rate-limit-and-dos` -- rate limiting provides defense-in-depth but does not prevent single-request bombs
- `footgun-regex-redos` -- regex CPU exhaustion is a specific form of resource exhaustion
- `footgun-hash-collision-dos` -- hash collision is a specific form of CPU exhaustion
- `footgun-integer-overflow-sign-extension` -- overflow in allocation size calculation
- `sec-owasp-a03-injection` -- XXE is both injection and resource exhaustion

## Authoritative References

- [CWE-400: Uncontrolled Resource Consumption](https://cwe.mitre.org/data/definitions/400.html)
- [CWE-770: Allocation of Resources Without Limits or Throttling](https://cwe.mitre.org/data/definitions/770.html)
- [CWE-776: Improper Restriction of Recursive Entity References in DTDs](https://cwe.mitre.org/data/definitions/776.html)
- [OWASP: Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [David Fifield: A Better Zip Bomb (2019)](https://www.bamsoftware.com/hacks/zipbomb/)
