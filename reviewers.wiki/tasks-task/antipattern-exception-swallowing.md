---
id: antipattern-exception-swallowing
type: primary
depth_role: leaf
focus: "Detect catch/except/rescue blocks that silently discard exceptions, hiding failures from callers and masking bugs"
parents:
  - index.md
covers:
  - "Empty catch/except/rescue blocks that silently discard exceptions"
  - Catch blocks that only log and return null, default, or empty value
  - "Catch blocks that catch Exception, Throwable, or BaseException (overly broad)"
  - Catch blocks that return a success indicator despite the failure
  - "Promise .catch() handlers that return undefined or swallow the rejection"
  - "Python try/except: pass pattern"
  - "Ruby rescue => nil pattern"
  - Blanket error handlers in middleware that mask all errors uniformly
  - "Catch blocks that lose the original exception (no chaining or wrapping)"
  - Async error handlers that silently ignore rejected promises or failed tasks
  - "Go code that assigns error return to _ (blank identifier)"
  - "finally/ensure blocks that throw, masking the original exception"
  - Catch blocks that retry silently with no limit or backoff
tags:
  - exception-swallowing
  - error-handling
  - silent-failure
  - catch
  - except
  - rescue
  - error
  - anti-pattern
  - correctness
  - security
activation:
  file_globs:
    - "*"
  keyword_matches:
    - try
    - catch
    - except
    - rescue
    - finally
    - ensure
    - throw
    - raise
    - Error
    - Exception
    - error
    - err
    - .catch
    - on_error
    - on_failure
    - errback
    - recover
  structural_signals:
    - try_catch_block
    - empty_catch
    - catch_all
    - error_handler
    - promise_catch
source:
  origin: file
  path: antipattern-exception-swallowing.md
  hash: "sha256:63d9105b69627c2b83272ccc47b743914f6c4fdb13f15124d992b62b58809867"
---
# Exception Swallowing

## When This Activates

Activates on any diff containing error handling constructs: try/catch, try/except, begin/rescue, Promise .catch(), Go error returns, or global error middleware. Exception swallowing is the practice of catching an exception and silently discarding it -- the program continues as if the failure never happened. This is one of the most dangerous anti-patterns in production code because it violates the fundamental contract of error handling: if something fails, *someone* must know. Swallowed exceptions turn deterministic failures into silent data corruption, phantom bugs that appear hours later in unrelated code, and security vulnerabilities where authentication or authorization failures are quietly ignored.

## Audit Surface

- [ ] Empty catch, except, or rescue block with no statement inside
- [ ] Catch block whose only action is logging the exception (log-and-swallow)
- [ ] Catch block that returns null, None, nil, undefined, 0, empty string, or empty collection
- [ ] Catch block that returns a success status code or truthy value after catching an error
- [ ] Catch clause specifying Exception, Throwable, BaseException, or bare except/catch
- [ ] Python `except: pass` or `except Exception: pass`
- [ ] Ruby `rescue => nil` or `rescue; end`
- [ ] JavaScript `.catch(() => {})` or `.catch(() => undefined)`
- [ ] Go `err` assigned to blank identifier `_` or checked then ignored
- [ ] New exception thrown in catch block without chaining the original as cause
- [ ] Catch block that sets a flag or default without logging the exception or context
- [ ] finally/ensure/defer block that can throw, masking the original exception
- [ ] Middleware or global error handler that returns 200 OK or generic response for all errors
- [ ] Async/await try-catch that catches all errors and returns a default value
- [ ] Catch block with a TODO or FIXME comment and no actual handling logic
- [ ] On-error callback in reactive/stream code that completes without propagating

## Detailed Checks

### Empty Catch Blocks
<!-- activation: keywords=["catch", "except", "rescue", "pass", "nil", "{}", "// ignore", "# ignore"] -->

- [ ] **Completely empty catch**: flag catch/except/rescue blocks with zero statements -- this is the purest form of exception swallowing. The exception is caught, destroyed, and execution continues on the happy path
- [ ] **Comment-only catch**: flag catch blocks containing only a comment (`// TODO: handle this`, `# intentionally ignored`) with no code -- a comment does not handle an error
- [ ] **Python `except: pass`**: flag the bare `except: pass` and `except Exception: pass` patterns -- these catch *everything* including KeyboardInterrupt, SystemExit, and MemoryError in Python 2, and suppress all meaningful exceptions in Python 3
- [ ] **Ruby `rescue; end`**: flag `rescue => nil`, `rescue; end`, and `rescue StandardError; end` with no body -- silent failure in Ruby
- [ ] **JavaScript empty `.catch()`**: flag `.catch(() => {})`, `.catch(() => undefined)`, `.catch(e => console.log(e))` on promises -- the rejection is consumed and the caller receives undefined instead of an error
- [ ] **Go blank identifier discard**: flag `result, _ = riskyOperation()` and `if err != nil { }` patterns -- Go's explicit error returns make swallowing a deliberate choice, but no less dangerous

### Log-and-Swallow Pattern
<!-- activation: keywords=["log", "logger", "console", "print", "warn", "error", "debug", "info", "return null", "return None", "return nil", "return undefined", "return false", "return 0"] -->

- [ ] **Log then return default**: flag catch blocks that log the exception and then return null, None, nil, undefined, an empty collection, or a zero value -- the caller receives a value indistinguishable from a legitimate result and has no way to know a failure occurred
- [ ] **Log then continue**: flag catch blocks inside loops or middleware that log and continue to the next iteration -- if the error affects subsequent iterations (corrupted state, skipped validation), silent continuation creates cascading failures
- [ ] **Log at wrong level**: flag catch blocks that log a serious failure at DEBUG or INFO level -- the log exists but will not be seen in production log configurations
- [ ] **Log without exception details**: flag catch blocks that log a generic message (`"An error occurred"`) without the exception type, message, or stack trace -- the log entry is useless for diagnosis
- [ ] **Return success after failure**: flag catch blocks that return HTTP 200, `true`, `{ success: true }`, or `Result.ok()` after catching an error -- the caller is actively deceived about the outcome

### Overly Broad Catch Clauses
<!-- activation: keywords=["Exception", "Throwable", "BaseException", "Error", "except:", "catch (", "rescue", "catch(e)", "catch(err)", "catch(error)"] -->

- [ ] **Catching Throwable/BaseException**: flag `catch (Throwable t)` in Java or `except BaseException` in Python -- these catch JVM errors (OutOfMemoryError, StackOverflowError) or Python system exits that should never be suppressed
- [ ] **Catching Exception without specificity**: flag `catch (Exception e)` or bare `except:` when the try block contains a narrow operation -- catching all exceptions prevents the caller from distinguishing expected failures (file not found) from unexpected bugs (null pointer)
- [ ] **Catching Error in JavaScript**: flag `catch (e)` in JavaScript/TypeScript when the try block could throw both application errors and programming bugs (TypeError, ReferenceError) -- the catch swallows bugs that should crash and produce a stack trace
- [ ] **Pokemon exception handling (gotta catch 'em all)**: flag catch blocks at the top of a call stack that catch all exceptions to "prevent crashes" -- this converts deterministic bugs into silent data corruption
- [ ] **Broad catch with narrow handling**: flag catch blocks that catch a broad type but handle only one specific case and silently ignore all others -- use specific catch clauses instead

### Exception Chain and Context Loss
<!-- activation: keywords=["throw", "raise", "new Error", "new Exception", "RuntimeException", "cause", "from", "initCause", "wraps", "wrap"] -->

- [ ] **Rethrow without cause chaining**: flag `catch (FooException e) { throw new BarException(msg); }` that discards the original exception -- use `throw new BarException(msg, e)` or equivalent to preserve the cause chain
- [ ] **Python raise without `from`**: flag `except FooError: raise BarError()` without `raise BarError() from original` -- the original traceback is lost
- [ ] **Generic rewrap hiding specifics**: flag catch blocks that wrap a specific exception into a generic one (`catch (SQLException e) { throw new RuntimeException("error"); }`) without preserving the original type or message -- this destroys diagnostic information
- [ ] **Catch and rethrow identical exception**: flag `catch (FooException e) { throw e; }` which is a no-op catch block that adds overhead and obscures the call stack in some languages -- remove the catch entirely
- [ ] **Error message without context**: flag new exceptions whose message contains no information about what operation failed, what input caused the failure, or what the caller should do -- `"error"` or `"something went wrong"` is not a message

### Finally/Ensure Blocks That Mask Exceptions
<!-- activation: keywords=["finally", "ensure", "defer", "cleanup", "close", "dispose", "release", "shutdown"] -->

- [ ] **Throwing in finally**: flag finally/ensure blocks that can throw an exception -- if the try block also threw, the finally exception masks the original, and the root cause is lost forever
- [ ] **Return in finally**: flag `return` statements inside finally blocks -- in Java and JavaScript, a return in finally silently replaces the return value (or exception) from the try block
- [ ] **Cleanup that can fail without protection**: flag finally blocks calling `.close()`, `.dispose()`, or `.release()` on a resource that may itself throw -- wrap the cleanup in its own try/catch to prevent masking the primary exception
- [ ] **Go defer with unchecked error**: flag Go `defer file.Close()` where `Close()` returns an error that is discarded -- if the write is buffered, close failures mean data loss

### Async and Reactive Error Swallowing
<!-- activation: keywords=["async", "await", "Promise", ".then", ".catch", "Observable", "subscribe", "onError", "on_error", "CompletableFuture", "Future", "Task", "coroutine", "goroutine", "channel"] -->

- [ ] **Unhandled promise rejection**: flag promise chains or async/await blocks where errors are neither caught nor propagated -- unhandled rejections cause silent failures or process crashes depending on the runtime
- [ ] **`.catch()` returning undefined**: flag `.catch(() => defaultValue)` where the default value is indistinguishable from success -- the consumer chain cannot detect the failure
- [ ] **Observable onError that completes**: flag reactive stream error handlers (`onError`, `doOnError`) that log and complete without propagating the error downstream -- subscribers believe the stream ended normally
- [ ] **Fire-and-forget async calls**: flag `async` functions called without `await` or `.catch()` -- errors thrown inside are silently dropped
- [ ] **Go goroutine with no error channel**: flag `go func() { ... }()` that performs fallible operations with no mechanism to report errors back to the caller -- panics in goroutines crash the entire process; errors vanish silently

## Common False Positives

- **Intentional suppression with documentation**: some exceptions are genuinely expected and ignorable (e.g., `FileNotFoundException` when checking if an optional config file exists). These are valid only when the catch block contains a comment explaining *why* the exception is safe to ignore and what the fallback behavior is.
- **Resource cleanup best-effort**: closing a resource in a finally block with a try/catch around the close call is a standard pattern to prevent masking the primary exception. The inner catch that logs and continues is intentional defensive programming, not swallowing.
- **Retry frameworks**: exception handling inside retry loops managed by a framework (Resilience4j, Polly, tenacity) is expected to catch and retry. Flag only when the retry exhaustion path itself swallows the final exception.
- **Thread/process isolation**: top-level exception handlers in thread pools, task runners, or request handlers that log and continue to the next request are preventing one request from killing the process. Flag only when error context is lost or when the response to the caller is misleading (200 OK).
- **Test assertions**: test code may intentionally trigger exceptions and catch them to assert that the exception was thrown. `assertThrows` and equivalent patterns are not swallowing.
- **Stream processing skip-on-error**: some data pipelines intentionally skip malformed records. This is valid only with per-record error logging, a dead-letter queue, and a metric tracking skip rate.

## Severity Guidance

| Finding | Severity |
|---|---|
| Empty catch block in code handling authentication, authorization, or payment | Critical |
| Catch block returning success indicator (HTTP 200, true) after failure | Critical |
| Catching Throwable/BaseException and suppressing all errors | Critical |
| Empty catch block with no comment or logging | Critical |
| Log-and-return-null in non-optional operation (data write, state mutation) | Important |
| Overly broad catch (Exception) when a specific exception type is appropriate | Important |
| New exception thrown without chaining original as cause | Important |
| Finally block that can throw, masking the original exception | Important |
| Fire-and-forget async call with no error handling | Important |
| Go error assigned to blank identifier `_` | Important |
| Log-and-return-default with documented justification for optional operation | Minor |
| Catch block with TODO/FIXME comment indicating planned handling | Minor |
| Catch-and-rethrow identical exception (no-op catch) | Minor |
| Cleanup close() wrapped in try/catch to prevent masking primary exception | Minor |

## See Also

- `principle-fail-fast` -- exception swallowing is the direct opposite of fail-fast: it hides failures instead of surfacing them immediately
- `principle-encapsulation` -- catch blocks that return defaults break the caller's ability to reason about the operation's contract
- `principle-naming-and-intent` -- generic exception messages and log-and-swallow patterns hide the intent of error handling
- `smell-primitive-obsession` -- returning null/0/empty-string instead of a Result or Optional type to represent failure is primitive obsession in error handling
- `antipattern-copy-paste` -- catch blocks are frequently copy-pasted, propagating swallowed exceptions across the codebase

## Authoritative References

- [Robert C. Martin, *Clean Code* (2008), Chapter 7: Error Handling -- "Don't Return Null", "Don't Pass Null", "Use Unchecked Exceptions"](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 77: Don't Ignore Exceptions](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Michael Feathers, *Working Effectively with Legacy Code* (2004), Chapter 11: "Preserve Signatures" -- exception handling during refactoring](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
- [Microsoft, ".NET Exception Handling Best Practices" -- Do not catch general exception types](https://learn.microsoft.com/en-us/dotnet/standard/exceptions/best-practices)
- [Go Blog, "Error Handling and Go" (2011)](https://go.dev/blog/error-handling-and-go)
- [Python Documentation, "Errors and Exceptions" -- bare except and BaseException warnings](https://docs.python.org/3/tutorial/errors.html)
