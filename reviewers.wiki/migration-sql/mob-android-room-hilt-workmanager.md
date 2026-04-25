---
id: mob-android-room-hilt-workmanager
type: primary
depth_role: leaf
focus: Detect Room queries on the main thread, missing database migrations, Hilt scope mismatches, WorkManager constraint omissions, and missing foreground service type declarations.
parents:
  - index.md
covers:
  - "Room DAO query executed on the main thread (missing suspend or Flow)"
  - Room schema change without Migration object or autoMigration
  - "Hilt component scope mismatch (ViewModel-scoped dependency injected into singleton)"
  - WorkManager work request without network or battery constraints
  - WorkManager long-running task without foreground service type
  - "Room @Transaction not used for multi-statement operations"
  - "Hilt @Inject on class without @HiltViewModel or @AndroidEntryPoint"
  - Room TypeConverter missing for complex types
  - WorkManager periodic work with interval below 15 minutes
  - Missing Room index on frequently queried columns
tags:
  - room
  - hilt
  - workmanager
  - android
  - database
  - dependency-injection
  - background-work
  - migration
  - jetpack
  - dagger
activation:
  file_globs:
    - "**/*.kt"
    - "**/*.java"
    - "**/*.xml"
  keyword_matches:
    - Room
    - "@Database"
    - "@Entity"
    - "@Dao"
    - "@Query"
    - "@Insert"
    - "@Update"
    - "@Delete"
    - "@TypeConverter"
    - Hilt
    - "@HiltViewModel"
    - "@AndroidEntryPoint"
    - "@Inject"
    - "@Singleton"
    - "@ViewModelScoped"
    - "@Provides"
    - "@Module"
    - WorkManager
    - OneTimeWorkRequest
    - PeriodicWorkRequest
    - Worker
    - CoroutineWorker
    - Constraints
    - setForeground
  structural_signals:
    - room_main_thread_query
    - missing_migration
    - hilt_scope_mismatch
    - work_without_constraints
source:
  origin: file
  path: mob-android-room-hilt-workmanager.md
  hash: "sha256:edf9968b0e0cf1cf5b2783d7879bfa0a55a43fc458cc89a184d788a5cee4a70b"
---
# Android Room, Hilt, and WorkManager

## When This Activates

Activates on diffs modifying Room database entities/DAOs, Hilt dependency injection modules/components, or WorkManager work requests. These three Jetpack libraries form the backbone of Android data persistence, DI, and background work. Each has strict contracts: Room prohibits main-thread queries by default, Hilt enforces scope hierarchies, and WorkManager requires constraints and service type declarations for long-running tasks. Violations cause ANR dialogs, runtime crashes, or Play Store policy rejections.

## Audit Surface

- [ ] Room DAO function returning non-suspend, non-Flow type (runs on calling thread)
- [ ] Room @Database with version increment but no Migration or autoMigration
- [ ] Hilt @Singleton providing dependency that depends on Activity-scoped component
- [ ] WorkManager OneTimeWorkRequest without Constraints (runs immediately on any condition)
- [ ] WorkManager work exceeding 10 minutes without setForeground / foregroundServiceType
- [ ] Room @Insert/@Update/@Delete without @Transaction on multi-entity operations
- [ ] Missing @AndroidEntryPoint on Activity or Fragment using @Inject
- [ ] Room entity with field type not supported without @TypeConverter
- [ ] PeriodicWorkRequest with repeatInterval < 15 minutes (silently clamped)
- [ ] Room @Query without @Transaction for SELECT returning relations
- [ ] Missing Room index on columns used in WHERE or JOIN clauses
- [ ] Hilt @Provides returning interface but implementation scope does not match
- [ ] WorkManager unique work policy KEEP when REPLACE is needed for updates

## Detailed Checks

### Room Main-Thread and Query Issues
<!-- activation: keywords=["@Dao", "@Query", "@Insert", "@Update", "@Delete", "suspend", "Flow", "LiveData", "allowMainThreadQueries", "RoomDatabase", "index"] -->

- [ ] **Query on main thread**: flag Room DAO functions that return raw types (not `suspend`, `Flow<>`, `LiveData<>`, or `PagingSource<>`) -- Room throws `IllegalStateException` on main thread by default; if `allowMainThreadQueries()` is enabled, the UI freezes during the query
- [ ] **allowMainThreadQueries enabled**: flag `RoomDatabase.Builder.allowMainThreadQueries()` -- this disables the safety check and allows blocking queries on the main thread
- [ ] **Missing @Transaction on relations**: flag `@Query` that returns data with `@Relation` annotations without `@Transaction` -- without a transaction, the parent and child queries are not atomic and can return inconsistent data
- [ ] **Missing index**: flag `@Entity` fields used in `WHERE`, `ORDER BY`, or `JOIN` clauses across DAO queries that lack `@ColumnInfo(index = true)` or `indices` in the `@Entity` annotation -- full table scans on large datasets

### Room Migrations
<!-- activation: keywords=["@Database", "version", "Migration", "autoMigration", "AutoMigration", "fallbackToDestructiveMigration", "schema", "exportSchema"] -->

- [ ] **Missing migration**: flag `@Database(version = N)` incremented from a previous version without a corresponding `Migration(N-1, N)` or `autoMigrations` entry -- the app crashes on launch for users with existing databases
- [ ] **fallbackToDestructiveMigration**: flag `fallbackToDestructiveMigration()` in production builds -- this silently deletes all user data when a migration is missing instead of crashing
- [ ] **Schema export disabled**: flag `exportSchema = false` in `@Database` -- exported schemas are needed for `autoMigration` and for testing migrations with `MigrationTestHelper`
- [ ] **Missing TypeConverter**: flag `@Entity` fields with types Room does not natively support (Date, Enum, custom objects) without a registered `@TypeConverter` -- compilation fails or data is silently lost

### Hilt Dependency Injection
<!-- activation: keywords=["@Inject", "@HiltViewModel", "@AndroidEntryPoint", "@Singleton", "@ViewModelScoped", "@ActivityScoped", "@FragmentScoped", "@Provides", "@Binds", "@Module", "@InstallIn", "SingletonComponent", "ViewModelComponent", "ActivityComponent"] -->

- [ ] **Missing @AndroidEntryPoint**: flag Activity, Fragment, or Service using `@Inject` fields without `@AndroidEntryPoint` annotation -- injection silently does not happen; fields are null at runtime
- [ ] **Scope mismatch**: flag `@Singleton` module providing a dependency that depends on `@ActivityScoped` or `@ViewModelScoped` components -- the singleton outlives the narrower scope, causing stale references or crashes
- [ ] **Constructor injection available but @Provides used**: flag `@Provides` functions in modules for classes that could use constructor `@Inject` -- @Provides adds boilerplate; prefer constructor injection
- [ ] **Missing @HiltViewModel**: flag ViewModel subclass using `@Inject constructor` without `@HiltViewModel` annotation -- Hilt cannot create the ViewModel and `by viewModels()` fails at runtime

### WorkManager Constraints and Foreground
<!-- activation: keywords=["WorkManager", "OneTimeWorkRequest", "PeriodicWorkRequest", "Worker", "CoroutineWorker", "ListenableWorker", "Constraints", "setConstraints", "setForeground", "ForegroundInfo", "foregroundServiceType", "KEEP", "REPLACE", "APPEND", "enqueueUniqueWork"] -->

- [ ] **Work without constraints**: flag `OneTimeWorkRequest.Builder(WorkerClass::class.java).build()` without `.setConstraints()` -- the work executes immediately regardless of network, battery, or storage state; add constraints appropriate to the work type
- [ ] **Long-running work without foreground**: flag `Worker`/`CoroutineWorker` implementations that may exceed 10 minutes without calling `setForeground(ForegroundInfo(...))` -- Android kills background work after 10 minutes; long tasks need foreground service promotion
- [ ] **Missing foreground service type**: flag `setForeground()` calls without declaring the corresponding `foregroundServiceType` in AndroidManifest.xml -- the system rejects the foreground promotion on Android 14+
- [ ] **Periodic interval below minimum**: flag `PeriodicWorkRequest` with `repeatInterval` below 15 minutes -- WorkManager silently clamps to 15 minutes; the shorter interval is misleading
- [ ] **Wrong unique work policy**: flag `enqueueUniqueWork(name, ExistingWorkPolicy.KEEP, ...)` for work that should be updated with new parameters -- KEEP discards the new request if existing work is pending; use REPLACE or APPEND

## Common False Positives

- **In-memory Room database**: test code using `Room.inMemoryDatabaseBuilder` with `allowMainThreadQueries()` is standard practice. Do not flag in test configurations.
- **Room query returning Flow/LiveData**: these types automatically move execution off the main thread. Do not flag DAO functions returning Flow or LiveData.
- **Hilt test components**: `@HiltAndroidTest` modules may intentionally override production scopes. Do not flag scope mismatches in test modules.
- **Immediate work by design**: some OneTimeWorkRequests (e.g., user-triggered upload) are intentionally unconstrained. Flag only when the work type clearly needs network or charging constraints.

## Severity Guidance

| Finding | Severity |
|---|---|
| Room query on main thread (ANR risk) | Critical |
| Missing database migration (app crash on launch) | Critical |
| Missing @AndroidEntryPoint (null injected fields) | Critical |
| Hilt scope mismatch (singleton depending on activity scope) | Important |
| Long-running WorkManager task without foreground service | Important |
| fallbackToDestructiveMigration in production (data loss) | Important |
| Work request without constraints | Important |
| Missing @Transaction on relation query | Minor |
| Missing Room index on frequently queried column | Minor |
| allowMainThreadQueries enabled | Minor |

## See Also

- `mob-kotlin-coroutines-flow` -- Room returns Flow; coroutine scope management applies
- `mob-jetpack-compose` -- Compose collects Room Flow via collectAsState
- `perf-db-query` -- general database query performance patterns
- `principle-fail-fast` -- fallbackToDestructiveMigration silences failures instead of failing fast

## Authoritative References

- [Android Developers, "Room Persistence Library" -- DAO patterns, migrations, and threading](https://developer.android.com/training/data-storage/room)
- [Android Developers, "Dependency injection with Hilt" -- scope hierarchy and component setup](https://developer.android.com/training/dependency-injection/hilt-android)
- [Android Developers, "Schedule tasks with WorkManager" -- constraints, foreground service, and policies](https://developer.android.com/topic/libraries/architecture/workmanager)
- [Android Developers, "Room auto-migrations" -- schema versioning and automatic migration](https://developer.android.com/training/data-storage/room/migrating-db-versions)
