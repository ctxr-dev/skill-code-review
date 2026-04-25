---
id: smell-data-clumps
type: primary
depth_role: leaf
focus: Detect groups of data items that repeatedly appear together across function signatures, class fields, and data structures
parents:
  - index.md
covers:
  - Groups of 3+ parameters that appear together in multiple function signatures
  - "Repeated (x, y, z) coordinate triples across functions and classes"
  - "Repeated (host, port, protocol) connection tuples across the codebase"
  - "Repeated (street, city, state, zip) address fields in multiple classes"
  - Parallel arrays instead of array-of-structs
  - Same group of fields duplicated across multiple classes or structs
  - Configuration values that always travel together but lack a shared type
  - Function chains passing the same 3+ parameters through every call
  - Destructured groups reassembled at every usage site
  - Database columns that form a logical group but have no domain type representation
tags:
  - data-clumps
  - bloater
  - parameter-object
  - value-object
  - readability
  - architecture
  - clean-code
activation:
  file_globs:
    - "*"
  keyword_matches:
    - "def "
    - "function "
    - "func "
    - "fn "
    - "fun "
    - "class "
    - "struct "
    - "interface "
  structural_signals:
    - function_definition
    - class_definition
    - struct_definition
    - parameter_list
source:
  origin: file
  path: smell-data-clumps.md
  hash: "sha256:8289282e876f5fd1d340dbf5828ccdb5c71499f994301b51cbb2dfa75e8249dd"
---
# Data Clumps

## When This Activates

Activates on any diff that introduces or modifies function signatures, class/struct fields, or data structures where the same group of values appears together in multiple locations. Data Clumps are groups of data that are always used together but have no formal type binding them -- they represent a missing abstraction. The litmus test: if you deleted one member of the group, would the others become meaningless? If yes, the group should be a single object.

## Audit Surface

- [ ] Three or more parameters appearing together in 2+ function signatures
- [ ] Same field group (e.g., startDate/endDate, latitude/longitude, width/height) duplicated across 2+ classes
- [ ] Function that accepts 3+ parameters and immediately groups them into a local struct or dictionary
- [ ] Parallel arrays (names[], ages[], emails[]) maintained in lockstep by index
- [ ] Repeated destructuring of the same object to extract the same subset of fields
- [ ] Multiple functions in the same module sharing the same 3+ parameter prefix
- [ ] Configuration values (host, port, timeout, retries) passed individually instead of as a config object
- [ ] Coordinate or measurement triples (x, y, z or r, g, b or width, height, depth) passed as separate arguments
- [ ] Diff introduces a new function with the same parameter group already present in neighboring functions
- [ ] Function returns multiple values that callers always use together
- [ ] Database query constructing the same WHERE clause fields from individual variables at multiple call sites
- [ ] String interpolation or formatting that assembles the same group of variables in multiple places

## Detailed Checks

### Repeated Parameter Groups
<!-- activation: keywords=["def ", "function ", "func ", "fn ", "fun ", "method ", "("] -->

- [ ] Scan function signatures in the diff and surrounding file for 3+ parameters that appear together in more than one function -- the group is a missing parameter object
- [ ] Check whether the parameter names follow the same pattern across functions (e.g., `host, port, protocol` in `connect`, `validate`, and `ping`) -- identical names confirm a clump
- [ ] Flag parameter groups where the order varies between functions -- inconsistent ordering increases the risk of caller bugs and confirms the group needs a type
- [ ] Identify functions that accept a clump and immediately pass all members to another function unchanged -- the receiving function should accept the parameter object directly
- [ ] Check whether any function adds one more parameter to an established clump -- this is the clump growing without being formalized

### Duplicated Field Groups Across Classes
<!-- activation: keywords=["class ", "struct ", "type ", "interface ", "model ", "entity "] -->

- [ ] Identify 3+ fields that appear in the same combination across 2+ class or struct definitions (e.g., `street`, `city`, `state`, `zipCode` in both `Customer` and `Warehouse`)
- [ ] Check whether the duplicated field group has identical validation rules in each class -- this is duplicated logic that belongs in a shared value object
- [ ] Flag data transfer objects (DTOs) and database entities that both contain the same field group inline rather than referencing a shared embedded type
- [ ] Identify classes where a subset of fields forms a coherent concept (date range, money amount, geographic point) that has a natural name -- this is a value object waiting to be extracted
- [ ] Check for fields with a common name prefix (e.g., `billing_street`, `billing_city`, `billing_zip` and `shipping_street`, `shipping_city`, `shipping_zip`) -- the prefix indicates an extractable type

### Parallel Arrays
<!-- activation: keywords=["array", "list", "[]", "List", "Array", "vector", "Vec", "slice"] -->

- [ ] Flag sets of arrays that are maintained in lockstep by index: `names[i]`, `ages[i]`, `emails[i]` -- an index misalignment bug is one off-by-one error away
- [ ] Check for loops that iterate over multiple arrays using the same index variable -- the loop body is constructing an ad-hoc object from the parallel arrays on each iteration
- [ ] Identify insertions or deletions that must update all parallel arrays simultaneously -- a single array of structs would make this atomic
- [ ] Flag sorting operations applied to one array without corresponding reordering of the parallel arrays -- this is a correctness hazard that a struct array eliminates

### Configuration and Connection Tuples
<!-- activation: keywords=["host", "port", "url", "timeout", "retries", "config", "connection", "endpoint", "credentials", "username", "password"] -->

- [ ] Flag functions accepting (host, port, protocol) or (host, port, timeout) as separate parameters -- extract a `ConnectionConfig` or `Endpoint` type
- [ ] Identify (username, password) or (apiKey, apiSecret) pairs passed individually through multiple layers -- extract a `Credentials` type
- [ ] Check for configuration values (timeout, retries, maxConnections, bufferSize) passed as individual parameters to 2+ functions -- extract a typed config object
- [ ] Flag environment variable reads that extract the same group of related values at multiple initialization points -- read once into a config object

### Coordinate, Range, and Measurement Groups
<!-- activation: keywords=["x", "y", "z", "lat", "lon", "width", "height", "start", "end", "min", "max", "from", "to", "r", "g", "b"] -->

- [ ] Flag (x, y) or (x, y, z) coordinate values passed as separate parameters -- extract a `Point` or `Vector` type
- [ ] Flag (latitude, longitude) pairs passed separately -- extract a `GeoCoordinate` type
- [ ] Flag (startDate, endDate) or (min, max) range pairs passed separately -- extract a `DateRange` or `Range<T>` type
- [ ] Flag (width, height) or (width, height, depth) dimension groups -- extract a `Dimensions` or `Size` type
- [ ] Flag (r, g, b) or (r, g, b, a) color components passed individually -- extract a `Color` type
- [ ] Check whether arithmetic or comparison operations on these groups are duplicated across call sites (distance calculations, range overlap checks) -- these operations belong as methods on the extracted type

## Common False Positives

- **Language standard patterns**: Some standard library functions require individual parameters by convention (e.g., `Math.max(a, b)`, `String.substring(start, end)`). Do not flag calls to standard APIs.
- **Intentionally flat APIs**: REST API handlers, CLI argument parsers, and serialization boundaries may intentionally flatten structured data. The clump may exist only at the boundary and be structured internally.
- **Small private scope**: A parameter group used in only one function and one call site is not yet a clump. Flag only when the pattern repeats across 2+ functions or the function is public API.
- **Performance-critical code**: In some languages and hot paths, passing individual primitives avoids allocation overhead. Accept this trade-off when documented and profiled.
- **Callback/event signatures**: Framework-defined callback signatures (e.g., `(event, x, y, button)` for mouse events) are not actionable -- the framework dictates the shape.
- **Destructuring for clarity**: Extracting 2-3 fields from a large object at the top of a function for readability is not a data clump -- it becomes one only when the same extraction repeats across many functions.

## Severity Guidance

| Finding | Severity |
|---|---|
| Parallel arrays maintained in lockstep with no struct binding them | Critical |
| Same 4+ parameter group appearing in 3+ public function signatures | Critical |
| Same field group (address, coordinate, date range) duplicated across 3+ classes with duplicated validation | Important |
| Configuration tuple (host, port, timeout) passed individually through 3+ layers | Important |
| New function in diff repeats an existing 3-parameter group without extracting a type | Important |
| Two-element group (start/end, min/max) in 2 functions with no range type | Minor |
| Private helper accepting a 3-parameter clump used from one call site | Minor |
| Framework-mandated parameter group in a callback signature | Minor |

## See Also

- `smell-primitive-obsession` -- Data Clumps of primitives are simultaneously Primitive Obsession; extracting a value object addresses both
- `smell-long-parameter-list` -- Data Clumps are the leading cause of Long Parameter Lists; introducing parameter objects shortens signatures
- `principle-dry-kiss-yagni` -- duplicated parameter groups are a form of structural duplication that DRY targets
- `principle-encapsulation` -- the extracted type encapsulates the group's invariants and operations

## Authoritative References

- [Martin Fowler, "Refactoring" (2018), Data Clumps smell](https://refactoring.com/catalog/)
- [Robert C. Martin, "Clean Code" (2008), Chapter 3: Functions -- Argument Objects](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Martin Fowler, "Refactoring" (2018), Introduce Parameter Object](https://refactoring.com/catalog/introduceParameterObject.html)
- [Joshua Kerievsky, "Refactoring to Patterns" (2004)](https://www.industriallogic.com/xp/refactoring/)
