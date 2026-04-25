---
id: pattern-composite
type: primary
depth_role: leaf
focus: Detect misuse, over-application, and absence of the Composite pattern in tree-structured object code.
parents:
  - index.md
covers:
  - Composites with leaf-only or composite-only methods leaking into the component interface
  - Unsafe recursive traversals risking stack overflow or infinite loops from cycles
  - Inconsistent parent-child management causing orphans or dangling references
  - Composite used where a flat list or simple collection suffices
  - Component interface bloated with operations only meaningful for one node type
  - Missing composite where client code manually traverses nested structures with ad-hoc recursion
  - Child ordering assumptions that are not enforced or documented
  - "Composite operations with inconsistent depth semantics (shallow vs deep)"
  - Concurrent modification of the composite tree during traversal
  - "Composite with mutable shared children (diamond-shaped DAG, not a tree)"
tags:
  - composite
  - structural-pattern
  - design-patterns
  - tree
  - hierarchy
  - recursion
  - component
activation:
  file_globs:
    - "**/*.{java,kt,scala,cs,ts,js,py,rb,go,rs,swift,cpp,h,hpp,php}"
  keyword_matches:
    - Composite
    - tree
    - node
    - children
    - parent
    - add
    - remove
    - leaf
    - component
    - traverse
    - walk
    - visit
    - hierarchy
    - recursive
  structural_signals:
    - class_with_children_collection_of_same_type
    - recursive_method_on_tree_structure
    - interface_with_add_remove_and_operation_methods
source:
  origin: file
  path: pattern-composite.md
  hash: "sha256:9fcbdd064336178c09748c356a79b6a3cf83c9530c00c400e90508bb91af4bfc"
---
# Composite Pattern

## When This Activates

Activates when diffs introduce tree or hierarchy structures with a shared component interface, add classes with child collections of their own type, implement recursive traversal or aggregation over nested structures, or add `add()`/`remove()` child management methods alongside operation methods. The Composite pattern elegantly unifies leaf and composite treatment, but it breaks down when the component interface carries methods only relevant to one node type, when cycles or concurrent modifications go undetected, or when the pattern is applied to fundamentally flat data.

## Audit Surface

- [ ] Component interface methods are meaningful for both leaves and composites -- no methods throw UnsupportedOperationException in either
- [ ] Recursive traversals have cycle detection or a maximum depth guard to prevent stack overflow
- [ ] Parent-child management is consistent: adding a child sets the parent, removing clears it, re-adding moves the child
- [ ] The data structure genuinely has hierarchical nesting -- a flat collection would not be simpler and more appropriate
- [ ] Component interface is lean: methods are polymorphically meaningful for all implementations
- [ ] Client code does not use type checks (instanceof, is, typeof) to distinguish leaves from composites
- [ ] Recursive operations have a clear base case and termination guarantee
- [ ] Parent back-references (if present) are kept in sync with the children collection at all times
- [ ] Tree is not modified during traversal, or modification-safe iteration is used
- [ ] Each child belongs to exactly one parent (tree, not DAG) unless DAG semantics are explicitly documented
- [ ] Shallow vs. deep operation semantics are documented and consistent across all operations
- [ ] Children collection does not contain null entries
- [ ] Equality and hashCode are not inadvertently recursive over the entire tree
- [ ] An iteration or visitation mechanism is provided for external traversal needs

## Detailed Checks

### Interface Design Violations
<!-- activation: keywords=["interface", "component", "leaf", "composite", "abstract", "add", "remove", "getChildren", "operation"] -->

- [ ] **Leaf forced to implement composite methods**: leaf class must implement `add(child)`, `remove(child)`, `getChildren()` and either throws or returns meaningless values -- the component interface is polluted with composite concerns
- [ ] **Composite forced to implement leaf methods**: composite class must implement operations that only make sense for leaves (e.g., `getValue()`, `render()` for a data node) -- returns aggregations that may not be meaningful
- [ ] **Fat interface**: component interface has 10+ methods, half only meaningful for composites and half only for leaves -- violates Interface Segregation Principle; consider splitting into separate interfaces with safe type-checking helpers
- [ ] **Default no-op implementations**: base class provides default no-op implementations for all methods, silently swallowing calls that indicate a programming error -- fail fast instead
- [ ] **Type-check-driven dispatch**: client code uses `if (node instanceof Composite)` to decide behavior, undermining the uniform treatment the composite pattern is supposed to provide
- [ ] **Missing isLeaf/isComposite**: no mechanism for clients to query node type when they legitimately need to (e.g., UI rendering), forcing unsafe casts or exception-based probing

### Recursive Traversal Safety
<!-- activation: keywords=["recursive", "traverse", "walk", "visit", "depth", "stack", "overflow", "cycle", "loop", "infinite"] -->

- [ ] **No cycle detection**: if the data structure can form cycles (child added to its own ancestor), recursive traversal runs forever or overflows the stack -- add a visited set or parent-chain check on add
- [ ] **No depth limit**: deeply nested trees (1000+ levels, e.g., from untrusted input like file system paths or JSON) cause stack overflow -- use iterative traversal with an explicit stack for unbounded depth
- [ ] **Missing base case**: recursive method does not check for leaf nodes or empty children, relying on the collection being empty -- a null children field causes NPE
- [ ] **Traversal order undefined**: clients depend on depth-first vs. breadth-first traversal but the order is not documented or guaranteed -- different operations use different orders inconsistently
- [ ] **Exception during traversal**: if a recursive operation throws an exception on one node, is the traversal aborted entirely, or does it continue? Neither behavior is documented or tested
- [ ] **Accumulator corruption**: recursive method uses a shared mutable accumulator (list, counter) that is not reset between subtree operations, producing incorrect aggregations

### Parent-Child Consistency
<!-- activation: keywords=["parent", "child", "add", "remove", "orphan", "detach", "move", "reparent", "setParent"] -->

- [ ] **Orphaned children**: removing a child from its parent's collection does not clear the child's parent reference -- the child still thinks it belongs to the old parent
- [ ] **Dangling parent reference**: child's parent field references a composite that no longer contains it in its children collection -- traversal via parent produces incorrect results
- [ ] **Multi-parent violation**: same child instance added to two different composites without being removed from the first -- the structure is a DAG, not a tree, but the code assumes tree semantics
- [ ] **No re-parenting logic**: adding a child that already has a parent does not remove it from the old parent first -- the child appears in two composites simultaneously
- [ ] **ConcurrentModificationException**: iterating over children while an operation modifies the children list (e.g., a `prune()` operation removing children during traversal)
- [ ] **Null children**: children collection is initialized lazily but some code paths skip initialization, encountering null instead of an empty collection

### Over-Applied Composite (Patternitis)
<!-- activation: keywords=["Composite", "tree", "node", "hierarchy", "menu", "category", "folder", "group"] -->

- [ ] **Flat data forced into tree**: data has no natural hierarchy, but a composite structure is used anyway (e.g., a "category tree" where categories are never nested more than one level -- a flat list with optional parent ID suffices)
- [ ] **Single nesting level**: composite structure is used but children never have children of their own -- a simple container/items relationship is clearer
- [ ] **No polymorphic operations**: the composite exists for structural representation only; no operations traverse the tree polymorphically -- the composite pattern adds complexity without benefit
- [ ] **Performance cost**: composite structure requires recursive traversal for operations that would be O(1) on a flat collection (e.g., count, sum, max)
- [ ] **Premature generalization**: "we might need nesting later" is used to justify a composite for currently flat data -- add the composite when nesting is actually needed

### Missing Composite
<!-- activation: keywords=["recursive", "walk", "traverse", "nested", "tree", "children", "node", "if.*instanceof", "switch.*type"] -->

- [ ] **Ad-hoc recursive traversal**: client code manually recurses over a nested data structure with inline if-then-else logic to handle leaves vs. containers -- a composite would encapsulate this
- [ ] **Duplicate traversal logic**: the same tree-walking code is repeated in multiple places with minor variations -- a composite's polymorphic operation() would eliminate the duplication
- [ ] **Type-switch on node type**: code uses switch/if-else on a type discriminator to decide how to process each node -- the composite's polymorphic dispatch eliminates this
- [ ] **Inconsistent depth handling**: some code traverses the full tree while other code only handles one level -- a composite operation with consistent depth semantics would unify behavior

### Composite Operations Semantics
<!-- activation: keywords=["aggregate", "sum", "count", "total", "collect", "flatten", "operation", "execute", "apply"] -->

- [ ] **Ambiguous aggregation**: composite's `getValue()` aggregates children's values (sum? max? concatenation?), but the aggregation strategy is not documented or configurable
- [ ] **Inconsistent empty composite**: an empty composite (no children) returns a value that differs from the aggregation identity element (e.g., returns null instead of 0 for sum, or null instead of empty list)
- [ ] **Partial failure**: composite operation fails on one child but continues on others, producing a partial result without indicating which children failed
- [ ] **Side-effect propagation**: composite operation has side effects (updating a database, sending notifications) that cascade through the entire tree -- one failure may leave the tree in an inconsistent state
- [ ] **Order-dependent operations**: composite iterates children in insertion order but operations depend on a different ordering (alphabetical, priority) -- sorting responsibility is unclear

## Common False Positives

- **UI component trees**: React, SwiftUI, Flutter, and Android View hierarchies are inherently composite structures. Their tree nature is framework-mandated, not pattern misuse.
- **File system abstractions**: file/directory hierarchies naturally use the composite pattern. Do not flag standard file-system APIs.
- **AST node hierarchies**: compiler and parser AST representations are textbook composite patterns. Flag only if the component interface is polluted with node-type-specific methods.
- **Organization/reporting hierarchies**: org charts, menu trees, and document outlines are natural hierarchies. Flag only if the hierarchy is artificially forced onto flat data.
- **Recursive data types**: functional-language recursive algebraic types (Haskell `data Tree a = Leaf a | Branch [Tree a]`) are idiomatic, not misuse.

## Severity Guidance

| Finding | Severity |
|---|---|
| Recursive traversal with no cycle detection on user-controlled input | high |
| Stack overflow risk from unbounded recursion depth | high |
| ConcurrentModificationException risk from tree mutation during traversal | high |
| Component interface forces leaves to implement composite methods with exceptions | medium |
| Parent-child references out of sync (orphans, dangling refs) | medium |
| Same child in multiple parents creating unexpected DAG semantics | medium |
| Client code type-checks nodes instead of using polymorphic dispatch | medium |
| Composite pattern for fundamentally flat data with no nesting | medium |
| Recursive equals/hashCode on large tree causing performance degradation | low |
| Missing documentation on shallow vs. deep operation semantics | low |
| Empty composite returns non-identity value for aggregation | low |

## See Also

- `principle-solid` -- fat component interfaces violate ISP; type-checking on node type violates OCP and LSP
- `principle-composition-over-inheritance` -- composite pattern is itself a composition pattern; misusing it with inheritance hierarchies defeats the purpose
- `principle-separation-of-concerns` -- traversal logic, aggregation logic, and structural management should be separated (consider Visitor pattern)
- `principle-law-of-demeter` -- clients should interact with composite nodes through the component interface, not reach into children

## Authoritative References

- [Erich Gamma et al., *Design Patterns: Elements of Reusable Object-Oriented Software* (1994), Composite](https://www.oreilly.com/library/view/design-patterns-elements/0201633612/)
- [Robert C. Martin, *Agile Software Development* (2002), Chapter 31: Composite Pattern](https://www.oreilly.com/library/view/agile-software-development/0135974445/)
- [Joshua Bloch, *Effective Java* (3rd ed., 2018), Item 18: Favor composition over inheritance](https://www.oreilly.com/library/view/effective-java/9780134686097/)
- [Eric Freeman et al., *Head First Design Patterns* (2nd ed., 2020), Chapter 9: The Composite Pattern](https://www.oreilly.com/library/view/head-first-design/9781492077992/)
