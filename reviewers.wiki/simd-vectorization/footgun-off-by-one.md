---
id: footgun-off-by-one
type: primary
depth_role: leaf
focus: "Detect fencepost errors, inclusive/exclusive range confusion, 0-based vs 1-based indexing mistakes, and boundary condition bugs"
parents:
  - index.md
covers:
  - "Fencepost error: N items need N-1 separators or N+1 fenceposts"
  - "Inclusive vs exclusive range end: array[0..n] vs array[0..n)"
  - 0-based vs 1-based indexing confusion across language or API boundaries
  - "Substring/slice end index off by one (Python slice vs Java substring)"
  - "Loop boundary: < vs <= on array length"
  - "Array length vs last valid index (length is last_index + 1)"
  - "Pagination: skip/offset calculation missing first or last page"
  - "Date range inclusive end: 'through Friday' includes or excludes Friday"
  - String index vs character count mismatch
tags:
  - off-by-one
  - fencepost
  - boundary
  - indexing
  - range
  - CWE-193
  - CWE-131
activation:
  file_globs:
    - "**/*.{c,h,cpp,hpp,java,kt,py,rb,go,rs,js,ts,cs,swift,scala}"
  keyword_matches:
    - length
    - size
    - count
    - index
    - offset
    - slice
    - substring
    - substr
    - subList
    - range
    - limit
    - skip
    - page
    - pagination
    - boundary
    - bounds
    - fence
  structural_signals:
    - For loop with array index boundary condition
    - Substring or slice operation
    - Pagination offset calculation
source:
  origin: file
  path: footgun-off-by-one.md
  hash: "sha256:07ec7af8b171e4f48d3a19d9a77e36540adec4ff201d46e92cea3692dbc606a0"
---
# Off-by-One Footguns

## When This Activates

Activates when diffs contain loops with boundary conditions on arrays or collections, substring/slice operations, pagination logic, range queries, buffer allocation, or binary search implementations. Off-by-one errors are the most common class of programming bugs because human intuition about counting and boundaries is consistently wrong in edge cases. "Process items 1 through 10" is inclusive; `range(1, 10)` in Python excludes 10. Every language and API makes different choices about inclusivity, and mixing conventions silently processes one too many or one too few items.

## Audit Surface

- [ ] Loop condition using <= array.length instead of < array.length
- [ ] Loop condition using < when the range should be inclusive of the end
- [ ] Array access at index equal to length (one past the end)
- [ ] Substring/slice with end index that may be off by one
- [ ] Pagination offset calculated as page *size instead of (page - 1)* size
- [ ] Range boundary mixed inclusive/exclusive without documentation
- [ ] Fence counting: N items producing N separators instead of N-1
- [ ] Binary search bounds: lo <= hi vs lo < hi off by one
- [ ] Buffer size allocation: strlen without +1 for null terminator
- [ ] Modular arithmetic wrapping skipping or repeating an element
- [ ] Date range query with >= start AND <= end vs < end
- [ ] SQL LIMIT/OFFSET mismatch with application page number

## Detailed Checks

### Loop Boundary Conditions (CWE-193)
<!-- activation: keywords=["for", "while", "loop", "<=", "<", "length", "size", "count", "index", "i++", "i--"] -->

- [ ] **<= length instead of < length**: `for (int i = 0; i <= arr.length; i++)` accesses `arr[arr.length]` -- one past the end. In C/C++ this is a buffer overflow. In Java/Python/JS it throws an exception. Flag `<=` with `.length`, `.size()`, or `.count` in loop bounds
- [ ] **< instead of <= for inclusive range**: `for (int i = start; i < end; i++)` excludes `end`. If the business requirement is "process days from Monday through Friday inclusive," the condition should be `<= end` or the range should be `[start, end + 1)`
- [ ] **Loop starting at 1 instead of 0**: flag `for (int i = 1; ...)` on 0-based collections without a clear reason (e.g., skipping header row). The first element is silently skipped
- [ ] **Empty collection not handled**: `for (int i = 0; i < list.size() - 1; i++)` on an empty list: `list.size() - 1` is `-1` (signed) or wraps to `SIZE_MAX` (unsigned), iterating far too many times. Check for empty collection before subtracting from size

### Substring and Slice Boundaries
<!-- activation: keywords=["substring", "substr", "slice", "subList", "splice", "subarray", "mid", "left", "right", "trim", "truncat"] -->

- [ ] **Language-specific end index**: Java's `substring(start, end)` excludes `end`. JavaScript's `substring(start, end)` also excludes `end`. But JavaScript's `substr(start, length)` takes a length, not end index. Flag mixed usage and verify the end index is correct for the language
- [ ] **Python slice off by one**: `s[0:n]` returns `n` characters (indices 0 through n-1). Code that expects `n+1` characters or expects to include index `n` has an off-by-one
- [ ] **subList/slice creating shared view**: Java's `List.subList()` returns a view, not a copy. Modifying the original list invalidates the sublist. Not strictly off-by-one but commonly confused with it

### Pagination and Offset (CWE-193)
<!-- activation: keywords=["page", "offset", "skip", "limit", "LIMIT", "OFFSET", "pageSize", "pageNumber", "cursor", "next"] -->

- [ ] **0-based vs 1-based page number**: if the UI sends page=1 for the first page but the backend calculates `offset = page * pageSize`, it skips the first page of results. Correct: `offset = (page - 1) * pageSize` for 1-based page numbers
- [ ] **Last page calculation**: `totalPages = totalItems / pageSize` truncates. If `totalItems = 11` and `pageSize = 10`, this gives 1 page instead of 2. Correct: `totalPages = (totalItems + pageSize - 1) / pageSize` or `Math.ceil(totalItems / pageSize)`
- [ ] **OFFSET drift on concurrent inserts**: using `OFFSET` with `LIMIT` for pagination in a changing dataset can skip or duplicate items as rows are inserted between page fetches. Prefer cursor-based pagination for mutable datasets

### Buffer and Allocation Size (CWE-131)
<!-- activation: keywords=["malloc", "alloc", "buffer", "strlen", "sizeof", "null", "terminator", "capacity", "reserve"] -->

- [ ] **strlen without +1 for null terminator**: `malloc(strlen(s))` allocates one byte too few for the null terminator. `strcpy` writes one byte past the allocation. Correct: `malloc(strlen(s) + 1)`
- [ ] **Buffer size for formatted output**: `snprintf(buf, sizeof(buf), ...)` is correct, but allocating `buf` based on an estimate of output length without +1 for the null terminator is a common off-by-one overflow
- [ ] **Array allocation for count + sentinel**: data structures needing a sentinel or terminator element (null-terminated arrays, ring buffers with gap) need capacity = count + 1

### Binary Search and Midpoint
<!-- activation: keywords=["binary", "search", "bsearch", "bisect", "lo", "hi", "mid", "left", "right", "bound", "lower_bound", "upper_bound"] -->

- [ ] **lo <= hi vs lo < hi**: binary search variants differ on whether the loop condition is `<=` or `<` and whether `hi` starts at `length` or `length - 1`. Mixing conventions produces infinite loops or missed elements. Verify consistency: if `hi = length - 1`, use `<=`; if `hi = length`, use `<`
- [ ] **Midpoint overflow**: `mid = (lo + hi) / 2` overflows for large `lo` and `hi`. Use `mid = lo + (hi - lo) / 2`. This classic bug was in Java's `Arrays.binarySearch` for 9 years
- [ ] **Return value off by one**: some binary search implementations return the insertion point, others return the index of the found element, others return -(insertion_point) - 1. Flag callers that do not account for the specific return convention

## Common False Positives

- **Intentional skip of first/last element**: algorithms that intentionally skip index 0 (header row) or stop before the last element (comparison with next element) are not off-by-one. Look for a documenting comment.
- **Sentinel-based loops**: loops using a sentinel value rather than an index bound (e.g., null-terminated strings) use different boundary logic that is correct for their pattern.
- **Language-idiomatic ranges**: Python `range(n)` producing 0..n-1 is correct idiom. Flag only when the intent appears to include `n`.
- **Exclusive end date by convention**: many date range APIs use exclusive end dates by convention (e.g., `[2024-01-01, 2024-02-01)` for January). This is correct when documented.

## Severity Guidance

| Finding | Severity |
|---|---|
| Buffer allocation off by one (missing null terminator) in C/C++ | Critical |
| Array access at index == length in C/C++ (buffer overflow) | Critical |
| Pagination skipping first or last page of results | Important |
| Loop processing one extra or one fewer item than intended | Important |
| Binary search infinite loop or missed element | Important |
| Date range query including/excluding boundary day incorrectly | Minor |
| Fencepost error in display formatting (extra separator) | Minor |
| Substring end index off by one in non-critical display code | Minor |

## See Also

- `footgun-integer-overflow-sign-extension` -- size - 1 on unsigned zero wraps to MAX
- `footgun-time-dates-timezones` -- date range inclusivity confusion
- `principle-fail-fast` -- bounds checks should fail immediately, not corrupt memory
- `sec-owasp-a03-injection` -- buffer overflow from off-by-one enables injection in C/C++

## Authoritative References

- [CWE-193: Off-by-one Error](https://cwe.mitre.org/data/definitions/193.html)
- [CWE-131: Incorrect Calculation of Buffer Size](https://cwe.mitre.org/data/definitions/131.html)
- [Joshua Bloch: Extra, Extra -- Nearly All Binary Searches Are Broken](https://research.google/blog/extra-extra-read-all-about-it-nearly-all-binary-searches-and-mergesorts-are-broken/)
- [CERT C: ARR30-C. Do not form or use out-of-bounds pointers or array subscripts](https://wiki.sei.cmu.edu/confluence/display/c/ARR30-C)
