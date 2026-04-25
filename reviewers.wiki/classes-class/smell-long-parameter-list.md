---
id: smell-long-parameter-list
type: primary
depth_role: leaf
focus: Detect functions with too many parameters, boolean flag arguments, and parameter patterns that signal missing abstractions
parents:
  - index.md
covers:
  - Functions with 4+ parameters
  - Boolean flag parameters that switch function behavior
  - "Parameters that always travel together across multiple functions (data clumps)"
  - Output parameters that mutate caller state by reference
  - Parameter ordering that callers frequently get wrong
  - Null or sentinel parameters used to select behavior or skip optional steps
  - Functions where half the parameters are passed through to another function unchanged
  - Parameter lists that grow with each new feature added to the function
  - Adjacent parameters of the same type that are easy to swap by accident
  - "Configuration passed as individual parameters instead of a config/options object"
tags:
  - long-parameter-list
  - bloater
  - readability
  - function-signature
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
    - "sub "
    - "method "
    - "proc "
  structural_signals:
    - function_definition
    - method_definition
    - function_call
source:
  origin: file
  path: smell-long-parameter-list.md
  hash: "sha256:0de9b088f57a91304c8026ea57618129f1647b54ebcb5f56541b7d34fce9b321"
---
# Long Parameter List

## When This Activates

Activates on any diff that introduces or modifies a function signature, method declaration, or call site with multiple arguments. Long parameter lists make functions hard to call correctly, hard to read at the call site, and hard to evolve without breaking callers. Every parameter added to a signature increases the cognitive load on every caller.

## Audit Surface

- [ ] Function signature with 4+ parameters
- [ ] Boolean parameter whose meaning is opaque at the call site
- [ ] Two or more adjacent parameters of the same type (easy to swap accidentally)
- [ ] Parameter group that appears identically in 2+ function signatures (data clump)
- [ ] Output parameter (mutated reference passed in, result read back by caller)
- [ ] Parameter with default value of null/None/nil used to skip optional behavior
- [ ] Call site passing 3+ literal values where meaning requires reading the signature
- [ ] Function where half the parameters are immediately forwarded to a collaborator
- [ ] Optional parameters added to an existing signature to support a new feature
- [ ] Parameter named 'options', 'config', 'params', 'args', 'kwargs' acting as a grab-bag
- [ ] Diff adds a new parameter to a function that already has 3+ parameters

## Detailed Checks

### Parameter Count
<!-- activation: keywords=["def ", "function ", "func ", "fn ", "fun ", "method ", "("] -->

- [ ] Count parameters in the function signature -- 4+ parameters warrants scrutiny, 6+ is a strong smell
- [ ] Check whether the diff adds a new parameter to an already-long signature -- this growth pattern indicates the function is accumulating responsibilities
- [ ] Identify functions where the parameter count has grown over multiple commits (visible in git blame) -- each addition was "just one more" but the cumulative effect is a usability problem
- [ ] Flag constructors with 5+ parameters -- consider the Builder pattern or parameter object
- [ ] Check whether some parameters are only used in one branch of the function body -- the function may be doing two different things selected by parameters

### Boolean and Flag Parameters
<!-- activation: keywords=["boolean", "bool", "flag", "true", "false", "Boolean"] -->

- [ ] Flag boolean parameters that cause the function to take a fundamentally different code path -- the two paths should be two separate functions with descriptive names
- [ ] Identify call sites where boolean literals are passed: `createReport(data, true, false, true)` -- the meaning is impossible to determine without reading the signature
- [ ] Check for functions with 2+ boolean parameters -- the combinatorial explosion of behavior modes makes the function untestable and unpredictable
- [ ] Flag enums used as mode selectors that cause the function to switch between unrelated behaviors -- this is a boolean flag smell in disguise
- [ ] In languages with named arguments, verify that boolean arguments are passed with explicit names at call sites -- `verbose: true` is clear, `true` alone is not

### Adjacent Same-Type Parameters
<!-- activation: keywords=["string", "int", "float", "str", "String", "number"] -->

- [ ] Flag functions with 2+ adjacent parameters of the same type where swapping them would compile but change behavior: `transfer(fromAccount: string, toAccount: string, amount: float, fee: float)` -- the caller can silently swap from/to or amount/fee
- [ ] Check call sites for these functions -- are there comments like `/* from */ accountA, /* to */ accountB` compensating for the ambiguous signature?
- [ ] Identify patterns where parameter order conventions differ between similar functions in the same codebase -- inconsistency increases swap-bug risk
- [ ] Flag date-range functions with two adjacent date/datetime parameters (`startDate`, `endDate`) -- a DateRange value object eliminates ordering bugs

### Pass-Through and Forwarding Parameters
<!-- activation: keywords=["import", "require", "call", "invoke", "delegate", "forward"] -->

- [ ] Identify parameters that the function receives only to forward to another function -- this parameter is not part of this function's responsibility
- [ ] Count how many parameters are used only in a single delegation call -- if more than half, the function may be a thin wrapper whose parameter list mirrors the callee unnecessarily
- [ ] Check for chains of functions passing the same parameters down 3+ levels -- the parameter should be provided via dependency injection, context object, or closure instead of threading through every call
- [ ] Flag "tramp data" -- parameters passed through intermediate functions that neither read nor modify them, solely to deliver the value to a deeply nested callee

### Output Parameters and Mutation
<!-- activation: keywords=["out ", "ref ", "&", "mut ", "inout", "byref", "pointer"] -->

- [ ] Flag output parameters: mutable references passed in, modified by the function, and read back by the caller -- prefer returning a value or a result tuple
- [ ] Identify functions that modify their input parameters as a side channel for returning additional data -- callers do not expect their arguments to change
- [ ] Check for patterns where a function populates fields on a mutable object passed as a parameter instead of returning a new object -- this hides the function's true output
- [ ] In languages with pass-by-reference (C++, C#, PHP), verify that `out`/`ref` parameters are documented and necessary, not just a convenience to avoid defining a return type

### Null and Sentinel Parameters
<!-- activation: keywords=["null", "None", "nil", "undefined", "Optional", "default"] -->

- [ ] Flag parameters with default value null/None/nil that cause the function to skip or change behavior: `sendNotification(user, channel=None)` where None means "use default channel" -- replace with overloaded methods or an explicit strategy
- [ ] Identify call sites passing explicit null to opt out of a feature -- this is a "flag parameter in disguise" where null means "don't do this thing"
- [ ] Check for functions where half the parameters are optional with null defaults -- the function is likely doing multiple things and the optionality controls which subset runs
- [ ] Flag sentinel values (-1 for "not found", empty string for "not set") used as parameters where a proper Option/Maybe type or separate function would be clearer

## Common False Positives

- **Language and framework conventions**: Middleware signatures (`req, res, next`), event handlers (`event, context, callback`), and lifecycle hooks often have framework-mandated parameter shapes. These are not actionable.
- **Mathematical and algorithmic functions**: Functions like `clamp(value, min, max)` or `lerp(a, b, t)` have natural parameter lists that are well-understood in context. Academic convention makes them clear.
- **Builder/DSL terminal methods**: A builder's `.build(a, b, c)` is acceptable if the builder itself configures most options -- the parameters are the essential, irreducible inputs.
- **Dependency injection constructors**: Constructor parameter lists in DI frameworks reflect explicit dependencies. Judge by whether the dependencies are all used (SRP), not by count alone.
- **Named/keyword arguments**: Languages with mandatory named arguments (Swift, Kotlin, Python with keyword-only params) significantly mitigate readability concerns. Adjust thresholds upward.
- **Test factory methods**: Test helper functions that construct complex objects often accept many parameters for flexibility. Prefer a builder, but don't flag every test helper.

## Severity Guidance

| Finding | Severity |
|---|---|
| Function with 7+ parameters in production code | Critical |
| Adjacent same-type parameters with documented swap bugs or compensating comments | Critical |
| Boolean parameter causing fundamentally different behavior per branch | Important |
| Function with 4-6 parameters where 3+ are forwarded unchanged to a callee | Important |
| New parameter added to an already-long signature without introducing a parameter object | Important |
| Output parameter used where a return value would suffice | Minor |
| Null default parameter in a private function with one call site | Minor |
| Constructor with 5 parameters in a DI-managed class | Minor |

## See Also

- `smell-data-clumps` -- parameter groups that travel together across multiple functions are Data Clumps and should be extracted into a parameter object
- `smell-primitive-obsession` -- many long parameter lists consist of primitives that should be value objects, which would consolidate the list
- `smell-long-method` -- long parameter lists often indicate the function is doing too much
- `principle-encapsulation` -- parameter objects encapsulate related data and reduce the exposed surface area of function signatures

## Authoritative References

- [Martin Fowler, "Refactoring" (2018), Long Parameter List smell](https://refactoring.com/catalog/)
- [Robert C. Martin, "Clean Code" (2008), Chapter 3: Functions -- Function Arguments](https://www.oreilly.com/library/view/clean-code-a/9780136083238/)
- [Steve McConnell, "Code Complete" (2004), Chapter 7: High-Quality Routines -- Parameter Management](https://www.microsoftpressstore.com/store/code-complete-9780735619678)
