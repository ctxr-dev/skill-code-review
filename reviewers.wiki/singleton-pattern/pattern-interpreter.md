---
id: pattern-interpreter
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Interpreter pattern in grammar and expression-evaluation code.
parents:
  - index.md
covers:
  - Interpreter pattern applied to complex grammars where a parser generator would be more appropriate
  - "interpret() methods with no shared context management, causing ambient state bugs"
  - Expression tree without validation, producing runtime errors on malformed input
  - Missing interpreter where string-based DSLs are parsed with regex
  - "Interpreter with security vulnerabilities: code injection via user-supplied expressions"
  - Interpreter with no recursion depth limit, enabling stack overflow via crafted input
  - Expression classes that mix parsing and evaluation responsibilities
  - Context object that leaks mutable state between expression evaluations
  - Terminal and nonterminal expressions with inconsistent error handling
  - Interpreter with no performance consideration for repeated evaluation of the same expression
tags:
  - interpreter
  - behavioural-pattern
  - design-patterns
  - grammar
  - DSL
  - expression
  - parse
  - evaluate
  - AST
  - security
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Interpreter
    - interpret
    - expression
    - parse
    - evaluate
    - eval
    - grammar
    - AST
    - DSL
    - rule
    - context
    - terminal
    - nonterminal
    - language
  structural_signals:
    - class_hierarchy_with_interpret_method
    - expression_tree_structure
    - recursive_evaluate_method
    - eval_on_user_string
source:
  origin: file
  path: pattern-interpreter.md
  hash: "sha256:ccf5ddc245fbe290f6136c9677d9aa39ae1095262e2eb919b2b7e5c2f54577a4"
---
# Interpreter Pattern

## When This Activates

Activates when diffs introduce classes representing grammar rules with an `interpret()` or `evaluate()` method, build expression trees from parsed input, implement DSL evaluation, or use `eval()`/`exec()` on structured or user-supplied strings. The Interpreter pattern provides a clean way to evaluate sentences in a simple language, but it becomes a maintenance and security hazard when applied to complex grammars, when user input flows into expression evaluation without sanitization, or when the expression tree lacks validation and depth limits.

## Audit Surface

- [ ] Grammar complexity is appropriate for the interpreter pattern -- under 15-20 production rules; complex grammars use a parser generator
- [ ] Shared context is isolated between evaluations -- one evaluation's side effects do not affect the next
- [ ] Expression tree is validated after parsing and before evaluation -- malformed trees produce clear errors, not runtime crashes
- [ ] User-supplied input that flows into expression evaluation is sanitized and constrained
- [ ] Recursive evaluation has a depth limit to prevent stack overflow from crafted input
- [ ] Expression classes have a single responsibility: evaluation; parsing is a separate concern
- [ ] Context object is either immutable, scoped per evaluation, or explicitly documented as shared-mutable
- [ ] Error handling is consistent across terminal and nonterminal expressions
- [ ] Repeated evaluation of the same expression uses caching or compilation for performance
- [ ] DSL input is parsed into an expression tree, not processed with regex chains
- [ ] Expression tree has a debug representation (toString, pretty-print) for diagnostics
- [ ] No raw `eval()` or `exec()` is used on user-supplied strings
- [ ] Expression evaluation has timeout or resource limits for computationally expensive expressions
- [ ] Grammar rules are formally defined, not embedded in scattered string constants
- [ ] The interpreter is not applied where a simple lookup table, map, or configuration file would suffice

## Detailed Checks

### Grammar Complexity Mismatch
<!-- activation: keywords=["grammar", "rule", "production", "parse", "parser", "ANTLR", "PEG", "BNF", "EBNF", "yacc", "lex"] -->

- [ ] **Complex grammar via interpreter**: grammar has 20+ production rules implemented as expression classes -- the class hierarchy is large, hard to maintain, and hard to extend. Use a parser generator (ANTLR, PEG.js, Yacc) for complex grammars
- [ ] **Ambiguous grammar**: the grammar has ambiguities (operator precedence, associativity) resolved by ad-hoc code in expression classes instead of formal grammar disambiguation -- a parser generator handles this correctly
- [ ] **Performance cliff**: interpreter evaluates expressions by walking the AST recursively for every evaluation -- for frequently evaluated expressions, compile to bytecode, transpile to the host language, or use a tree-walking interpreter with memoization
- [ ] **Grammar evolution friction**: adding a new language construct requires adding a new expression class, modifying the parser, updating the visitor (if used), and updating error handling -- formal grammar tools generate this infrastructure
- [ ] **No formal grammar definition**: the language's grammar exists only as scattered class implementations with no BNF, EBNF, or PEG specification -- document the grammar formally for maintainability

### Context Management
<!-- activation: keywords=["context", "environment", "scope", "variable", "binding", "state", "lookup", "assign", "store", "global"] -->

- [ ] **Global mutable context**: all expressions share a single mutable context (variable bindings, function registry) -- concurrent evaluations interfere with each other
- [ ] **Context leaks between evaluations**: variables assigned during one evaluation persist into the next -- create a fresh context per evaluation or use scoped contexts
- [ ] **No scope isolation**: nested expressions (blocks, functions, let-bindings) modify the same flat context without scope push/pop -- variable shadowing and lifetime bugs result
- [ ] **Ambient state**: expressions read from global or static state instead of an explicit context parameter -- testing and concurrent execution become unreliable
- [ ] **Context as god object**: the context accumulates capabilities (variable storage, function registry, type system, I/O channels) into a single class -- split into focused responsibilities
- [ ] **Immutable context with no threading**: context is immutable but nested expressions need to pass bindings upward -- use a context-returning evaluation or a scoped mutable context with explicit push/pop

### Expression Validation
<!-- activation: keywords=["validate", "check", "error", "malformed", "invalid", "null", "missing", "type", "operand", "arity"] -->

- [ ] **No validation pass**: expression tree is evaluated immediately after parsing with no validation -- malformed trees (missing operands, type mismatches) produce cryptic runtime errors deep in evaluation
- [ ] **Type errors at runtime**: expressions have no type checking -- adding a string and an integer produces a runtime exception instead of a clear validation error before evaluation
- [ ] **Null operands**: nonterminal expressions accept null children (e.g., binary operator with one operand null) -- evaluation NPEs instead of rejecting malformed trees
- [ ] **Arity mismatches**: function-call expressions accept any number of arguments -- incorrect arity produces confusing errors during evaluation instead of clear messages during validation
- [ ] **Missing error recovery**: the first validation error aborts parsing/validation -- users receive one error at a time instead of a batch of all issues

### Security Vulnerabilities
<!-- activation: keywords=["eval", "exec", "user", "input", "inject", "sanitize", "escape", "trust", "execute", "run", "script", "expression"] -->

- [ ] **Code injection via eval()**: user-supplied strings are passed to `eval()`, `exec()`, `Function()`, `ScriptEngine.eval()`, or equivalent -- arbitrary code execution vulnerability
- [ ] **Expression injection**: user input is interpolated into expression strings before parsing -- crafted input can alter the expression's semantics (SQL injection analog for DSLs)
- [ ] **No input length limit**: user-supplied expression strings have no maximum length -- crafted long expressions can cause parser OOM or exponential parsing time
- [ ] **Resource exhaustion via expressions**: expressions can trigger unbounded computation (infinite loops, exponential recursion, large memory allocation) with no timeout or resource limit
- [ ] **File system / network access via expressions**: the expression language provides built-in functions that access the file system, network, or other sensitive resources -- user-supplied expressions can exfiltrate data or cause damage
- [ ] **No allowlist for functions**: expression language allows calling arbitrary functions from the host language instead of a curated safe subset

### Recursion and Performance
<!-- activation: keywords=["recursive", "depth", "stack", "overflow", "loop", "performance", "cache", "compile", "optimize", "evaluate", "interpret"] -->

- [ ] **No recursion depth limit**: deeply nested expressions (e.g., `(((((((...)))))))`) cause stack overflow -- add a depth counter that throws when a limit is exceeded
- [ ] **Exponential evaluation**: expression tree has shared subexpressions that are evaluated redundantly -- memoize subexpression results or flatten the DAG
- [ ] **Re-parsing on every evaluation**: the same expression string is parsed into an AST on every evaluation instead of being parsed once and cached
- [ ] **No compilation path**: expressions evaluated millions of times per second are interpreted by tree walking -- compile to bytecode or JIT for performance-critical paths
- [ ] **Interpreter in hot loop**: expression evaluation is called inside a tight loop with no consideration for allocation, recursion, or cache behavior

### Missing Interpreter (Regex DSL Parsing)
<!-- activation: keywords=["regex", "regexp", "pattern", "split", "replace", "match", "parse", "string", "format", "template", "DSL", "rule"] -->

- [ ] **Regex chain parsing**: a DSL or rule language is parsed by chaining regex matches, splits, and replacements -- the code is fragile, hard to extend, and cannot produce meaningful error messages. Build an expression tree.
- [ ] **String manipulation as evaluation**: rules or expressions are evaluated by string concatenation and substitution instead of being parsed into a structured AST -- the result is brittle and insecure
- [ ] **Ad-hoc recursive descent**: a mini-parser is hand-written with nested string operations but has no formal grammar, no error reporting, and no tests for edge cases -- either formalize as an interpreter or use a parser library
- [ ] **Configuration as code**: configuration values contain embedded expressions (`${env.NAME}`, `#{calc(a + b)}`) evaluated with regex and string replacement -- use a proper expression evaluator for safety and correctness
- [ ] **Template language via string ops**: an ad-hoc template language is implemented with indexOf/substring operations -- use an established template engine or build a proper interpreter

### Over-Applied Interpreter
<!-- activation: keywords=["Interpreter", "interpreter", "simple", "lookup", "map", "table", "config", "static", "enum"] -->

- [ ] **Lookup table suffices**: the "language" is a finite set of named values (status codes, error messages, feature flags) -- a map or enum lookup is simpler than an interpreter
- [ ] **Static configuration**: the "expressions" are configuration entries that do not need runtime evaluation -- a YAML/JSON/TOML config file is simpler
- [ ] **Single expression type**: the "grammar" has exactly one production rule (e.g., key-value pairs) -- a simple parser function is clearer than an interpreter class hierarchy
- [ ] **No user-facing language**: the expression tree is only constructed programmatically, never from user input -- the builder pattern or fluent API is simpler than a parse-and-interpret pipeline

## Common False Positives

- **Template engines (Jinja, Handlebars, Thymeleaf)**: established template engines have their own expression languages. These are not custom interpreters -- do not flag the engine itself. Flag only if application code wraps the engine with an ad-hoc interpreter layer.
- **SQL query builders**: ORM query builders (LINQ, SQLAlchemy, JOOQ) construct expression trees for SQL generation. These are DSL builders, not interpreters. Flag only if raw SQL strings are eval'd.
- **Regular expressions**: regex usage is not an interpreter pattern instance. Flag only if complex parsing logic uses chained regexes where a proper parser would be more appropriate.
- **Math expression libraries (exp4j, mathjs)**: purpose-built expression evaluators are established tools. Do not flag their usage; flag only if security (user input) or performance concerns apply.
- **Rule engines (Drools, Easy Rules)**: dedicated rule engines implement interpreter-like patterns internally. The engine choice is an architecture decision, not a misuse.

## Severity Guidance

| Finding | Severity |
|---|---|
| User-supplied strings passed to eval()/exec() -- arbitrary code execution | critical |
| Expression injection: user input interpolated into expression strings before parsing | critical |
| No recursion depth limit on user-supplied expressions -- stack overflow DoS | high |
| Expression language provides file system or network access to untrusted input | high |
| No timeout or resource limit on expression evaluation -- computation DoS | high |
| Global mutable context shared across concurrent evaluations | high |
| Expression tree evaluated without validation, producing runtime errors on malformed input | medium |
| Complex grammar (20+ rules) implemented as interpreter classes instead of using a parser generator | medium |
| DSL parsed with fragile regex chains instead of a proper expression tree | medium |
| Context leaks variable bindings between evaluations | medium |
| Same expression re-parsed on every evaluation with no caching | low |
| No formal grammar definition for the interpreted language | low |
| Interpreter pattern for a simple lookup table or static config | low |

## See Also

- `pattern-composite` -- expression trees are composite structures; interpreter uses the composite pattern for nonterminal expressions containing child expressions
- `pattern-visitor` -- visitors can traverse expression trees to implement operations (evaluation, pretty-printing, optimization) as an alternative to interpret() methods on each expression class
- `principle-separation-of-concerns` -- parsing and evaluation should be separate; expression classes that parse strings violate this
- `principle-encapsulation` -- context objects that expose mutable state to all expressions weaken encapsulation
- `principle-solid` -- expression classes that handle both parsing and evaluation violate SRP; interpreter applied to unstable grammars violates OCP

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Interpreter](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Martin Fowler, *Domain-Specific Languages* (2010)](https://martinfowler.com/books/dsl.html)
- [Terence Parr, *The Definitive ANTLR 4 Reference* (2013)](https://pragprog.com/titles/tpantlr2/the-definitive-antlr-4-reference/)
- [OWASP, Code Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Injection_Prevention_Cheat_Sheet.html)
