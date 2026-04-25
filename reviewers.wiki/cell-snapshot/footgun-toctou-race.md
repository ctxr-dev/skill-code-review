---
id: footgun-toctou-race
type: primary
depth_role: leaf
focus: Detect check-then-act patterns without atomicity -- file existence checks before open, permission checks before access, balance checks before debit
parents:
  - index.md
covers:
  - "File exists check followed by open without atomic O_CREAT|O_EXCL"
  - Permission or capability check followed by privileged action in separate step
  - "Balance or inventory check followed by debit/reserve without atomic transaction"
  - mkdir followed by write without handling concurrent creation
  - stat followed by open allowing symlink race between the two calls
  - Database read-check-write without row-level lock or CAS
  - "isFile/isDirectory check before file operation without atomic alternative"
  - Temp file name generated then created non-atomically
tags:
  - toctou
  - race-condition
  - atomicity
  - check-then-act
  - CWE-367
  - CWE-377
  - CWE-362
activation:
  file_globs:
    - "**/*.{c,h,cpp,hpp,java,kt,py,rb,go,rs,js,ts,cs,swift,scala}"
  keyword_matches:
    - exists
    - isFile
    - isDirectory
    - access
    - stat
    - lstat
    - mkdir
    - mkdirs
    - createDirectory
    - hasPermission
    - canRead
    - canWrite
    - balance
    - inventory
    - available
    - containsKey
    - contains
    - putIfAbsent
    - compareAndSet
    - O_EXCL
    - O_CREAT
    - CREATE_NEW
    - tryLock
    - check
  structural_signals:
    - Conditional check on state followed by action on same state
    - File existence or permission check before file operation
    - Read-then-write on shared resource without atomicity
source:
  origin: file
  path: footgun-toctou-race.md
  hash: "sha256:465f73e70182cba31533c49f4d6cd96d3c9d2db2c48fe127896f1778ee99ba6a"
---
# TOCTOU Race Footguns

## When This Activates

Activates when diffs perform a check on some state (file exists, permission granted, balance sufficient, key absent) and then act on that state in a separate, non-atomic step. Between the check and the act, another thread, process, or user can change the state, invalidating the check. TOCTOU (Time-of-Check-to-Time-of-Use) races are a specific category of race condition that occurs even in single-threaded code when external actors (other processes, the OS, concurrent requests) can modify shared state. The canonical example -- checking file existence then opening -- has enabled privilege escalation vulnerabilities for decades (symlink attacks in setuid programs).

## Audit Surface

- [ ] if (file.exists()) followed by file.open() or file.create()
- [ ] if (hasPermission(user, resource)) followed by performAction(resource)
- [ ] if (balance >= amount) followed by balance -= amount without lock/CAS
- [ ] os.mkdir() followed by file write in new directory
- [ ] os.stat() followed by os.open() allowing symlink replacement
- [ ] SELECT check then UPDATE without row lock or CAS
- [ ] if (!map.containsKey(k)) map.put(k, v) without atomic alternative
- [ ] Temp filename generated then opened without O_EXCL
- [ ] tryLock() checked then lock-dependent operation without holding lock
- [ ] Access token validated then used without re-validation
- [ ] Configuration read then acted upon without read lock
- [ ] DNS resolution cached then used without TTL awareness

## Detailed Checks

### Filesystem TOCTOU (CWE-367)
<!-- activation: keywords=["exists", "isFile", "isDirectory", "stat", "lstat", "access", "open", "create", "mkdir", "fopen", "readFile", "writeFile", "unlink", "rename"] -->

- [ ] **exists-then-open**: flag `if (file.exists()) { read(file) }` or `if (!file.exists()) { create(file) }`. Between the check and the open, another process can delete, replace, or symlink the file. Use `O_CREAT | O_EXCL` for atomic create-if-not-exists, or `open()` and handle ENOENT
- [ ] **stat-then-open symlink race**: flag `stat(path)` or `lstat(path)` followed by `open(path)`. Between the stat and open, the file can be replaced with a symlink pointing elsewhere. Open the file first, then `fstat()` on the file descriptor
- [ ] **mkdir-then-write**: flag `mkdir(dir)` followed by `open(dir + "/file")`. Another process could replace `dir` with a symlink between the mkdir and the open. Use `mkdirat()` + `openat()` relative to a directory file descriptor, or verify with realpath after open
- [ ] **Temp file without O_EXCL (CWE-377)**: flag temp file creation using predictable names without `O_EXCL`. `tmpnam()`/`tempnam()` return a name but do not create the file -- another process can create a symlink with that name before your `open()`. Use `mkstemp()`, `tmpfile()`, or language-specific secure temp file APIs

### Database TOCTOU
<!-- activation: keywords=["SELECT", "UPDATE", "INSERT", "balance", "inventory", "count", "available", "reserve", "debit", "withdraw", "transaction", "lock", "FOR UPDATE"] -->

- [ ] **Read-check-update without lock**: flag `SELECT balance WHERE id = ?; if balance >= amount: UPDATE balance = balance - amount`. Between the SELECT and UPDATE, another transaction can debit the same balance. Use `SELECT ... FOR UPDATE` (pessimistic lock), `UPDATE ... WHERE balance >= amount` (atomic conditional), or optimistic concurrency (version column)
- [ ] **Inventory double-spend**: flag `if (inventory > 0) { inventory--; ship(); }` without atomicity. Two concurrent requests both see inventory = 1 and both ship, resulting in -1 inventory. Use `UPDATE inventory SET count = count - 1 WHERE count > 0` and check affected rows
- [ ] **Insert-if-not-exists race**: flag `SELECT COUNT(*) WHERE key = ?; if count == 0: INSERT`. Two concurrent requests both see count = 0 and both insert. Use `INSERT ... ON CONFLICT DO NOTHING`, `MERGE`, or unique constraints with upsert

### In-Memory TOCTOU
<!-- activation: keywords=["containsKey", "contains", "get", "put", "putIfAbsent", "computeIfAbsent", "getOrDefault", "synchronized", "lock", "ConcurrentHashMap", "compareAndSet", "CAS"] -->

- [ ] **containsKey-then-put**: flag `if (!map.containsKey(k)) { map.put(k, compute()); }` without synchronization or atomic alternative. Two threads both see the key absent and both compute and insert. Use `ConcurrentHashMap.computeIfAbsent()` (Java), `setdefault()` (Python with GIL caveat), or explicit lock
- [ ] **get-then-put-if-null**: flag `val = map.get(k); if (val == null) { val = create(); map.put(k, val); }`. Same race as containsKey-then-put. Use `computeIfAbsent()` or `putIfAbsent()` and check the return value
- [ ] **Check-then-set on boolean flag**: flag `if (!done) { done = true; doWork(); }` without atomicity. Two threads both read `done = false`. Use `AtomicBoolean.compareAndSet(false, true)` or equivalent

### Authorization and State TOCTOU
<!-- activation: keywords=["permission", "authorize", "hasRole", "canAccess", "isAllowed", "token", "session", "valid", "expired", "check"] -->

- [ ] **Permission check then action**: flag code that checks user permissions in one step and performs the privileged action in a separate step. Between the check and the action, permissions may be revoked, the resource may be replaced, or the user's session may change. Perform the authorization check atomically with the action, or re-verify at the point of use
- [ ] **Token validation then use**: flag code that validates an access token, extracts claims, and then uses those claims for a later API call without re-validation. The token may be revoked between validation and use. For short-lived operations this is acceptable; for long-running workflows, re-validate

## Common False Positives

- **Idempotent operations**: if the action is idempotent (creating a file that already exists is a no-op, upserting a row), the TOCTOU race has no harmful effect. Verify idempotency.
- **Advisory checks for UX**: checking balance before showing a "pay" button is a UX optimization, not a security control. The real check must happen at the transaction layer. Flag only if the advisory check is the only check.
- **Single-process, single-threaded CLI tools**: tools that run in isolation (no concurrent users or processes modifying the same files) have minimal TOCTOU risk. Flag only in server or multi-user contexts.
- **ConcurrentHashMap.get() for read-only**: reading from a ConcurrentHashMap without subsequent mutation is not a TOCTOU. Flag only get-then-put patterns.

## Severity Guidance

| Finding | Severity |
|---|---|
| File exists/stat then open in setuid or privileged context (CWE-367) | Critical |
| Balance check then debit without atomic transaction | Critical |
| Temp file created without O_EXCL in shared directory | Important |
| Inventory read-check-update without row lock or CAS | Important |
| containsKey-then-put on shared map without synchronization | Important |
| Permission check then action in separate step | Important |
| mkdir-then-write without symlink protection | Minor |
| Advisory balance check as only check (no server-side re-check) | Minor |

## See Also

- `conc-race-conditions-data-races` -- TOCTOU is a specific category of race condition; this reviewer covers the check-then-act pattern specifically
- `footgun-file-path-cross-platform` -- symlink races are a file-path-specific TOCTOU
- `principle-fail-fast` -- atomic operations fail immediately on conflict rather than silently succeeding with stale state
- `sec-rate-limit-and-dos` -- TOCTOU on rate limit counters can bypass limits

## Authoritative References

- [CWE-367: Time-of-check Time-of-use (TOCTOU) Race Condition](https://cwe.mitre.org/data/definitions/367.html)
- [CWE-377: Insecure Temporary File](https://cwe.mitre.org/data/definitions/377.html)
- [Matt Bishop and Michael Dilger: Checking for Race Conditions in File Accesses (1996)](https://doi.org/10.1109/CSFW.1996.503696)
- [CERT C: FIO45-C. Avoid TOCTOU race conditions while accessing files](https://wiki.sei.cmu.edu/confluence/display/c/FIO45-C)
