---
id: mob-core-data-swiftdata
type: primary
depth_role: leaf
focus: Detect main context blocking UI, missing background context for writes, fetch requests without predicate or sort causing full scans, missing migration plans, and concurrency violations in Core Data and SwiftData.
parents:
  - index.md
covers:
  - "Heavy fetch or write on viewContext (main queue) blocking UI"
  - Background writes performed on main context instead of performBackgroundTask
  - NSFetchRequest without NSPredicate causing full table scan
  - NSFetchRequest without NSSortDescriptor causing non-deterministic ordering
  - Missing lightweight or custom migration for schema changes
  - "Managed object passed across context boundaries (concurrency violation)"
  - Managed object accessed after context is deallocated
  - "Batch insert/update/delete not refreshing viewContext"
  - "Relationship deletion rule missing (nullify, cascade, deny)"
  - "SwiftData @Model without proper #Predicate for queries"
tags:
  - core-data
  - swiftdata
  - persistence
  - database
  - migration
  - concurrency
  - ios
  - apple
  - nsfetchrequest
  - managed-object
activation:
  file_globs:
    - "**/*.swift"
    - "**/*.m"
    - "**/*.xcdatamodeld/**"
    - "**/*.xcdatamodel/**"
  keyword_matches:
    - CoreData
    - import CoreData
    - SwiftData
    - import SwiftData
    - NSManagedObject
    - NSManagedObjectContext
    - NSPersistentContainer
    - NSFetchRequest
    - NSPredicate
    - viewContext
    - performBackgroundTask
    - "@Model"
    - ModelContainer
    - ModelContext
    - "#Predicate"
    - "@Query"
  structural_signals:
    - fetch_without_predicate
    - main_context_write
    - cross_context_object
    - missing_migration
source:
  origin: file
  path: mob-core-data-swiftdata.md
  hash: "sha256:7c9371c9d5113cb2dce846ccb8657a2b98585884422f7bbb9bdc93cff074f916"
---
# Core Data and SwiftData

## When This Activates

Activates on diffs modifying Core Data models (.xcdatamodeld), NSManagedObject subclasses, NSFetchRequest usage, NSPersistentContainer setup, SwiftData @Model definitions, or ModelContext operations. Core Data and SwiftData enforce strict thread confinement -- accessing a managed object on the wrong queue is an undefined-behavior concurrency violation that may corrupt the SQLite store. The second most common issue is performing heavy fetches or writes on the main context, which freezes the UI. This reviewer targets both categories.

## Audit Surface

- [ ] viewContext.fetch() or viewContext.save() with large dataset
- [ ] NSManagedObjectContext.perform {} not used for background context access
- [ ] NSFetchRequest with no predicate (fetches all records)
- [ ] NSFetchRequest with no sort descriptors (non-deterministic order)
- [ ] NSPersistentContainer without migrationPolicy or versionedSchema
- [ ] NSManagedObject passed between threads without objectID transfer
- [ ] NSManagedObject property accessed outside its context's queue
- [ ] NSBatchInsertRequest/NSBatchDeleteRequest without merging changes to viewContext
- [ ] Relationship without deleteRule or using default (nullify) on required relationship
- [ ] SwiftData ModelContainer without schema versioning
- [ ] SwiftData @Query in view performing expensive unfiltered fetch
- [ ] Missing fetchBatchSize on fetch request with large result set

## Detailed Checks

### Main Context Blocking
<!-- activation: keywords=["viewContext", "main", "fetch", "save", "count", "execute", "performBackgroundTask", "newBackgroundContext"] -->

- [ ] **Heavy fetch on viewContext**: flag `viewContext.fetch()` or `container.viewContext.fetch()` for requests that could return large result sets (no predicate, no fetchLimit) -- fetching thousands of objects on the main queue freezes the UI
- [ ] **Write on viewContext**: flag `viewContext.save()` after inserting, updating, or deleting many objects -- batch writes should use `performBackgroundTask` or `newBackgroundContext()` to avoid main-thread stalls
- [ ] **Count without countResultType**: flag `viewContext.fetch(request).count` to count records when `request.resultType = .countResultType` with `viewContext.count(for:)` is more efficient
- [ ] **Missing fetchBatchSize**: flag fetch requests returning lists without `fetchBatchSize` set -- Core Data faults all objects into memory at once; batch size enables lazy loading

### Background Context and Concurrency
<!-- activation: keywords=["perform", "performAndWait", "performBackgroundTask", "NSManagedObjectContext", "queue", "thread", "concurrency", "objectID", "existingObject"] -->

- [ ] **Object passed across contexts**: flag `NSManagedObject` instances passed from one context to another without going through `objectID` and `existingObject(with:)` -- managed objects are confined to their context's queue
- [ ] **Missing perform block**: flag direct property access on a managed object outside its context's `perform {}` or `performAndWait {}` block -- this is a concurrency violation that corrupts the persistent store
- [ ] **Background context not saved**: flag `performBackgroundTask` blocks that modify objects but do not call `context.save()` -- changes exist only in memory and are lost when the block completes
- [ ] **Parent-child context confusion**: flag child contexts used for background work with the main context as parent -- saves on the child push to the parent (main queue) before reaching the store, blocking the main thread

### Fetch Request Quality
<!-- activation: keywords=["NSFetchRequest", "NSPredicate", "NSSortDescriptor", "fetchLimit", "fetchOffset", "fetchBatchSize", "propertiesToFetch", "@Query", "#Predicate", "FetchDescriptor"] -->

- [ ] **No predicate (full scan)**: flag `NSFetchRequest` or SwiftData `FetchDescriptor` without a predicate or with `NSPredicate(value: true)` -- fetches every record in the entity, which degrades as data grows
- [ ] **No sort descriptor**: flag fetch requests used for display (table view, list) without sort descriptors -- the ordering is undefined and may change between fetches
- [ ] **Missing fetchLimit for pagination**: flag fetch requests intended for paginated display that do not set `fetchLimit` and `fetchOffset` -- all matching records are loaded into memory
- [ ] **SwiftData @Query without filter**: flag `@Query` in a SwiftUI view without a `filter:` parameter on a large entity -- the query fetches all records and the view re-renders for every change

### Schema Migration
<!-- activation: keywords=["migration", "migrate", "version", "versionedSchema", "SchemaMigrationPlan", "NSMappingModel", "lightweight", "NSPersistentStoreDescription", "addPersistentStore"] -->

- [ ] **No migration plan**: flag schema changes (new attributes, renamed entities, changed relationships) without a corresponding lightweight migration configuration or custom mapping model -- the app crashes on launch with an incompatible store
- [ ] **SwiftData missing VersionedSchema**: flag `@Model` changes without `VersionedSchema` and `SchemaMigrationPlan` -- SwiftData requires explicit versioning for schema evolution
- [ ] **Non-optional attribute added without default**: flag new non-optional attributes in the data model without a default value -- existing records cannot satisfy the constraint, causing migration failure

### Batch Operations and Merge
<!-- activation: keywords=["NSBatchInsertRequest", "NSBatchUpdateRequest", "NSBatchDeleteRequest", "mergeChanges", "NSManagedObjectContextDidSave", "refreshAllObjects", "stalenessInterval"] -->

- [ ] **Batch operation without merge**: flag `NSBatchInsertRequest`, `NSBatchUpdateRequest`, or `NSBatchDeleteRequest` execution without merging changes into the viewContext via `NSManagedObjectContext.mergeChanges(fromRemoteContextSave:into:)` -- the UI shows stale data until the next fetch
- [ ] **Merge on wrong context**: flag batch result merging called on a background context instead of the viewContext -- the UI-bound context does not receive the update notification

### Relationships and Delete Rules
<!-- activation: keywords=["relationship", "inverse", "deleteRule", "cascade", "nullify", "deny", "noAction", "toMany", "toOne", "NSSet", "NSOrderedSet"] -->

- [ ] **Missing delete rule**: flag relationships in the data model without an explicit delete rule -- the default (nullify) may leave orphaned objects for required relationships
- [ ] **Missing inverse relationship**: flag relationships without an inverse -- Core Data uses inverses to maintain referential integrity; missing inverses cause silent data corruption
- [ ] **Cascade on large to-many**: flag cascade delete rule on to-many relationships with potentially thousands of children -- cascade delete is synchronous and can block the context's queue

## Common False Positives

- **Small datasets**: apps with bounded data (settings, user preferences, <100 records) may correctly use viewContext for all operations. Flag only when the dataset can grow unbounded.
- **NSFetchedResultsController**: FRC batches fetches internally. A fetch request used exclusively by FRC with appropriate batchSize is not problematic.
- **Lightweight migration with compatible changes**: adding optional attributes or new entities with defaults is automatically migrated. Do not flag if the change is compatible.
- **SwiftData automatic migration**: SwiftData handles some migrations automatically. Flag only when the schema change requires explicit versioning.

## Severity Guidance

| Finding | Severity |
|---|---|
| Managed object accessed outside its context's queue (concurrency violation) | Critical |
| Schema change without migration plan (app crashes on launch) | Critical |
| Object passed across contexts without objectID transfer | Critical |
| Heavy fetch on viewContext blocking UI | Important |
| Batch operation without merging changes to viewContext | Important |
| Fetch request without predicate on large entity | Important |
| Missing inverse relationship | Important |
| Background context not saved after modifications | Minor |
| Fetch request without sort descriptors | Minor |
| Missing fetchBatchSize on large result set | Minor |

## See Also

- `mob-swiftui` -- SwiftUI @Query and ModelContext integration with views
- `mob-swift-concurrency-actors` -- actor isolation interacts with Core Data context confinement
- `perf-db-query` -- N+1 and full scan patterns apply to Core Data fetch requests
- `principle-fail-fast` -- migration failures should be caught at launch, not silently corrupting data

## Authoritative References

- [Apple, "Core Data Programming Guide" -- concurrency, migration, and fetch request best practices](https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/CoreData/)
- [Apple, "Core Data Concurrency" -- perform/performAndWait and context confinement](https://developer.apple.com/documentation/coredata/using_core_data_in_the_background)
- [Apple, "SwiftData" -- @Model, ModelContainer, and schema versioning](https://developer.apple.com/documentation/swiftdata)
- [Apple, "Migrating your data model automatically" -- lightweight migration requirements](https://developer.apple.com/documentation/coredata/migrating_your_data_model_automatically)
