---
id: lang-r
type: primary
depth_role: leaf
focus: Catch correctness, reproducibility, and performance bugs in R code
parents:
  - index.md
covers:
  - Vectorization violations — explicit loops where vectorized operations exist
  - "Non-standard evaluation (NSE) hygiene in dplyr/tidyverse pipelines"
  - data.table reference semantics vs data.frame copy-on-modify confusion
  - "Reproducibility discipline (renv, set.seed, session info)"
  - "R6/S4/S3 class system correctness and dispatch pitfalls"
  - "Memory management for large datasets (copy-on-modify triggers, gc)"
  - Factor vs character confusion and stringsAsFactors legacy
  - "CRAN/Bioconductor package submission requirements"
  - "Apply family correctness (sapply type instability vs vapply)"
  - Global environment pollution and function side effects
  - NA propagation and handling discipline
tags:
  - statistics
  - data-science
  - tidyverse
  - cran
  - reproducibility
  - bioinformatics
activation:
  file_globs:
    - "**/*.R"
    - "**/*.Rmd"
    - "**/*.Rnw"
    - "**/*.qmd"
    - "**/DESCRIPTION"
    - "**/NAMESPACE"
    - "**/.Rprofile"
    - "**/renv.lock"
  structural_signals:
    - R source files, R Markdown, or Quarto documents in diff
    - "DESCRIPTION or NAMESPACE file changes (package development)"
    - renv.lock dependency changes
source:
  origin: file
  path: lang-r.md
  hash: "sha256:0de6452a49074dbef4afdf1ca7cd2c9cecb0eb3e30f0fa50c0c06e99ecd6a643"
---
# R Quality Reviewer

## When This Activates

Activated when the diff contains `.R`, `.Rmd`, `.Rnw`, or `.qmd` files, R package manifests (`DESCRIPTION`, `NAMESPACE`), or environment lock files (`renv.lock`). Covers both script-based analysis and package development workflows.

## Audit Surface

- [ ] `for` loop iterates over data frame rows doing element-wise work — use vectorized functions or `apply`/`purrr::map`
- [ ] `sapply()` used in non-interactive code — return type depends on input length (character vector, matrix, or list); use `vapply()` with `FUN.VALUE`
- [ ] Vector grown incrementally in a loop (`c(result, new_val)` or `result <- append(result, x)`) — pre-allocate with `vector("type", n)`
- [ ] `set.seed()` not called before `sample()`, `rnorm()`, or other stochastic functions in analysis scripts
- [ ] Tidy evaluation function uses bare column name without `{{ }}` (embrace) or `.data$col` — breaks with non-standard column names
- [ ] `data.table` `:=` modifies the original by reference — caller may not expect their copy to change
- [ ] `read.csv()` called without explicit `stringsAsFactors` argument (behavior changed between R 3.x and 4.0)
- [ ] Package dependency used but not listed in `DESCRIPTION` Imports/Suggests fields
- [ ] `<<-` global assignment used outside reactive/closure context — creates hidden mutable state
- [ ] `mean()`, `sum()`, `min()`, `max()` called without `na.rm = TRUE` on data that may contain `NA` values
- [ ] `T`/`F` used as boolean literals — they are regular variables and can be reassigned (`T <- 42` is valid R)
- [ ] `attach()` called — pollutes search path and creates name masking bugs that are hard to debug
- [ ] `library()` called inside a function body instead of declaring the dependency in `NAMESPACE`/DESCRIPTION

## Detailed Checks

### Vectorization and Performance
<!-- activation: keywords=["for", "while", "apply", "sapply", "vapply", "lapply", "mapply", "purrr", "Vectorize", "Reduce"] -->

- [ ] Row-wise `for` loop replaced with vectorized operation where possible: `ifelse()`, `dplyr::case_when()`, matrix operations, `Vectorize()`
- [ ] `sapply()` replaced with `vapply()` in functions and packages — `sapply` returns a list for length-0 input, matrix for multi-column output, and character vector vs named list depending on simplification
- [ ] `apply(X, 2, func)` on a data frame: `apply` coerces the data frame to a matrix first — mixed column types all become character, silently corrupting numeric data
- [ ] `Reduce()` used correctly with `accumulate` parameter when intermediate results are needed; initial value specified to handle empty input
- [ ] `purrr::map()` variant matches expected return type: `map_dbl()`, `map_chr()`, `map_lgl()`, `map_int()` — plain `map()` returns a list
- [ ] Pre-allocation for unavoidable loops: `result <- vector("list", n)` then `result[[i]] <- value` — not `result <- c(result, value)` which copies the entire vector each iteration (O(n^2))
- [ ] `which()` not used unnecessarily: `x[x > 0]` is simpler and faster than `x[which(x > 0)]`, though they differ in NA handling (which drops NAs)
- [ ] `Vectorize()` wrapping is syntactic sugar, not true vectorization — it still loops internally; benchmark against actual vectorized alternatives
- [ ] `rowSums()`, `colMeans()`, etc. used instead of `apply(x, 1, sum)` — the specialized functions are implemented in C and much faster
- [ ] `ifelse()` evaluates both `yes` and `no` arguments fully — for expensive computations, use `dplyr::if_else()` or explicit indexing

### Non-Standard Evaluation (NSE) and Tidy Evaluation
<!-- activation: keywords=["dplyr", "tidyr", "ggplot", "aes", "mutate", "filter", "select", "group_by", "{{", ".data", "enquo", "!!", "across"] -->

- [ ] Functions wrapping dplyr verbs use `{{ var }}` (embrace operator) for column arguments passed by the caller — bare unquoted names only work at the top level
- [ ] `.data$column` pronoun used when column name is a fixed string known at code-writing time inside a function
- [ ] `!!` (bang-bang) and `!!!` (splice) used correctly with `enquo()`/`syms()` in legacy tidy-eval code — prefer `{{ }}` in new code
- [ ] `across()` with `.names` argument used for multi-column transformations — `mutate_at()`/`mutate_if()`/`mutate_all()` are superseded
- [ ] `aes()` in ggplot uses `.data$col` or `{{ col }}` inside functions to avoid scope ambiguity between data columns and environment variables
- [ ] String column names in NSE context: use `.data[[var]]` or `across(all_of(var))` — `all_of()` is strict (errors on missing), `any_of()` is permissive
- [ ] Pipeline (`%>%` or `|>`) does not have side effects that depend on evaluation order — the pipe is not guaranteed to evaluate left-to-right in all edge cases
- [ ] R native pipe `|>` (R 4.1+) differences from magrittr `%>%`: native pipe does not support `.` placeholder in nested calls without anonymous function wrapper `\(x)`
- [ ] `select()` with negative indices (e.g., `select(-col)`) does not conflict with external variables named `col` — use `select(!col)` or `select(-all_of("col"))` for safety

### data.table Specifics
<!-- activation: keywords=["data.table", ":=", ".SD", ".N", ".I", ".GRP", "setkey", "setDT", "fread", "fwrite", "shift", "fifelse"] -->

- [ ] `:=` modifies by reference — if caller passes a data.table, their copy is also modified; use `copy()` explicitly when the function should not mutate the input
- [ ] `setkey()` / `setindex()` used for repeated lookups — binary search on keyed data.table is orders of magnitude faster than vector scan
- [ ] `.SD` usage includes `.SDcols` parameter to avoid processing all columns when only a subset is needed (performance and clarity)
- [ ] `fread()` preferred over `read.csv()` for large files — 5-20x faster, with automatic type detection and parallel reading
- [ ] Chaining `DT[...][...]` is idiomatic data.table — but intermediate results are not named, making debugging harder; assign to intermediate variable for complex chains
- [ ] `data.table` and `dplyr` loaded together: `filter`, `between`, `first`, `last`, `transpose` name conflicts resolved with explicit `pkg::func()` or the `conflicted` package
- [ ] `setDT()` converts data.frame in-place — the original variable is now a data.table; use `as.data.table()` for a copy
- [ ] `shift()` for lag/lead operations; `fifelse()` for fast vectorized if-else (faster than base `ifelse()` and stricter about types)
- [ ] `.N` inside `DT[, .N, by=group]` gives group counts; outside grouping `.N` gives total rows — verify which is intended
- [ ] `set()` used for loop-based column updates — avoids `[.data.table` overhead per iteration: `for (j in cols) set(DT, j=j, value=...)`

### NA Handling and Type Safety
<!-- activation: keywords=["NA", "na.rm", "is.na", "na.omit", "complete.cases", "NULL", "NaN", "Inf", "NA_real_", "NA_character_"] -->

- [ ] Aggregation functions (`mean`, `sum`, `sd`, `min`, `max`, `median`) use `na.rm = TRUE` when NA is possible in the data
- [ ] `is.na()` used for NA checks — `x == NA` always returns `NA`, never `TRUE` or `FALSE`
- [ ] `NULL` vs `NA` distinguished: `NULL` removes list elements and has length 0; `NA` is a missing value placeholder with length 1
- [ ] `NaN` and `Inf` handled: `is.finite()` returns FALSE for NA, NaN, Inf, and -Inf; `is.nan()` is specific to NaN only
- [ ] `na.omit()` applied intentionally — silently dropping rows can introduce selection bias in statistical analyses; document the decision
- [ ] Factor levels that are `NA` require explicit handling: `addNA()` or `forcats::fct_na_value_to_level()` to include NA as a visible level in tables and plots
- [ ] `ifelse()` returns `NA` of the wrong type for the falsy branch when input has NAs — `dplyr::if_else()` enforces consistent types and is safer
- [ ] Typed NA literals used in package code: `NA_real_`, `NA_character_`, `NA_integer_`, `NA_complex_` — plain `NA` is logical, which triggers implicit coercion
- [ ] `identical(x, NA)` vs `is.na(x)`: `identical` checks for exact NA type match; `is.na` is vectorized and handles all NA types
- [ ] Logical operations with NA: `TRUE | NA` is `TRUE`, but `FALSE | NA` is `NA` — understand short-circuit behavior when filtering

### Reproducibility and Environment
<!-- activation: keywords=["set.seed", "renv", "sessionInfo", "library", "require", "source", "options", "Sys.setenv"] -->

- [ ] `set.seed()` called with explicit seed before any stochastic operation; the seed value is documented or stored for audit
- [ ] `renv` (or packrat) used for dependency isolation — `renv::snapshot()` captures lockfile; `renv::restore()` reproducibly reinstalls
- [ ] `sessionInfo()` or `sessioninfo::session_info()` output included in analysis reports for audit trail
- [ ] R version constraint specified in DESCRIPTION (`Depends: R (>= 4.1)`) if using version-specific features (native pipe, lambda syntax)
- [ ] `options()` changes are scoped: `old <- options(scipen = 999); on.exit(options(old))` to restore — global options leak across functions otherwise
- [ ] Random number generator specified if cross-version reproducibility needed: `RNGkind("L'Ecuyer-CMRG")` for parallel-safe RNG
- [ ] `source()` paths are relative to project root or use `here::here()` — hardcoded absolute paths break on other machines
- [ ] `Sys.setenv()` changes are scoped with `withr::local_envvar()` in tests — environment variable mutations leak across test cases
- [ ] `.Rprofile` does not silently load packages or set options that affect analysis results — reproducibility requires explicit setup

### R Package Development
<!-- activation: file_globs=["**/DESCRIPTION", "**/NAMESPACE", "**/R/**/*.R", "**/man/**", "**/tests/**", "**/vignettes/**"], keywords=["roxygen", "export", "import", "usethis", "devtools"] -->

- [ ] All exported functions have `@export` roxygen tag and documented `@param`, `@return`, `@examples` sections
- [ ] `NAMESPACE` is generated by roxygen2 (`devtools::document()`) — never edited manually; manual edits are overwritten
- [ ] Imports use `@importFrom pkg func` for specific functions — bare `@import pkg` pollutes the namespace with all of pkg's exports
- [ ] `DESCRIPTION` lists all runtime dependencies in `Imports` and test/vignette-only dependencies in `Suggests`
- [ ] Package functions never call `library()` or `require()` — use `pkg::func()` for suggested packages, `@importFrom` for imported ones
- [ ] `.onLoad()` vs `.onAttach()` used correctly: `.onAttach()` for startup messages (`packageStartupMessage()`), `.onLoad()` for side effects (setting options, loading DLLs)
- [ ] `inst/` directory does not contain large data files (>5MB) — use dedicated data packages or external hosting with download-on-demand
- [ ] `@examples` sections are runnable — use `\dontrun{}` only for examples requiring authentication or network; prefer `\donttest{}` for slow examples
- [ ] Version number in DESCRIPTION follows semantic versioning; development versions use `.9000` suffix (e.g., `1.2.3.9000`)
- [ ] Package passes `R CMD check --as-cran` with zero warnings and zero notes before submission
- [ ] C/C++ code in `src/` registered via `usethis::use_c()` or `usethis::use_cpp11()` with proper `init.c`/`RcppExports.cpp` generation

### Testing Conventions
<!-- activation: file_globs=["**/tests/**/*.R", "**/testthat/**"], keywords=["test_that", "expect_", "testthat", "describe", "it"] -->

- [ ] `testthat` tests use `expect_equal()` (with tolerance) for numeric comparisons — `expect_identical()` fails on floating-point representation differences
- [ ] `expect_error()` / `expect_warning()` / `expect_message()` check for specific message patterns (regex) — bare expectation just checks "any error" which is brittle
- [ ] Snapshot tests (`expect_snapshot()`) are deterministic — no timestamps, random values, locale-dependent output, or system-specific file paths
- [ ] Test fixtures clean up after themselves: temp files removed, options restored, connections closed, working directory reset
- [ ] `withr::local_*` / `withr::with_*` used for temporary side effects in tests: `local_tempdir()`, `local_envvar()`, `local_options()`, `local_seed()`
- [ ] `skip_on_cran()` used for tests requiring network access, large memory, external services, or platform-specific features
- [ ] Code coverage exceeds project threshold — `covr::package_coverage()` run in CI; aim for >80% line coverage
- [ ] `test_that()` descriptions are human-readable sentences describing the expected behavior, not implementation details
- [ ] Helper functions in `tests/testthat/helper-*.R` files are used for shared setup — not duplicated across test files
- [ ] `expect_no_error()`, `expect_no_warning()`, `expect_no_message()` used to explicitly verify clean execution paths

### Memory Management
<!-- activation: keywords=["gc", "object.size", "pryr", "lobstr", "copy", "tracemem", "rm", "mem_used"] -->

- [ ] Large intermediate objects removed with `rm()` followed by `gc()` in long-running scripts processing multiple large datasets
- [ ] Copy-on-modify understood: `y <- x; y[1] <- 0` creates a full copy of `x` — data.table `:=` avoids this with in-place modification
- [ ] `readr::read_csv()` or `data.table::fread()` with `select` parameter loads only needed columns from disk — not full file into memory
- [ ] `connection` objects (`file()`, `url()`, `gzfile()`) are closed — use `on.exit(close(con))` or `withr::local_connection()`; unclosed connections leak file descriptors
- [ ] Large lists of model objects use `butcher::butcher()` or manual stripping to remove unneeded components (environments, training data copies)
- [ ] `object.size()` or `lobstr::obj_size()` used to verify memory footprint of large objects before scaling to full dataset
- [ ] `arrow::open_dataset()` or `dbplyr` used for datasets larger than available RAM — process lazily and collect only needed results
- [ ] Environments captured in closures/formulas can hold references to large objects — use `rlang::new_environment()` or `pryr::unenclose()` to minimize retained data

## Common False Positives

- **`for` loops with complex side effects**: Not every `for` loop should be vectorized. Loops that write files, call APIs, have complex control flow, or depend on previous iterations are fine as explicit loops.
- **`sapply` in interactive/exploratory code**: `sapply` is acceptable in `.Rmd` analysis chunks and console exploration where the user visually verifies output type. Only flag in package code and reusable functions.
- **`library()` at script top level**: Calling `library()` at the top of an analysis script is standard and expected practice. Only flag `library()` inside package code (files under `R/` directory) or inside function bodies.
- **`<<-` in Shiny reactive contexts**: Global assignment with `<<-` inside `reactiveValues`, `observeEvent`, or `reactive()` is the expected pattern in Shiny applications for updating shared state.
- **Missing `na.rm` on curated data**: If data has already been filtered for completeness (e.g., after `na.omit()`, `drop_na()`, or `complete.cases()`), redundant `na.rm = TRUE` is not required.
- **`T`/`F` in interactive console**: While `TRUE`/`FALSE` is always preferred, `T`/`F` in throwaway console commands and .Rmd exploration chunks is common and generally harmless.

## Severity Guidance

| Finding | Severity |
|---------|----------|
| `sapply()` in package function where return type varies | Critical |
| Missing `set.seed()` before stochastic analysis published as a result | Critical |
| `attach()` in package or shared code | Critical |
| `:=` mutation surprise (caller's data modified unexpectedly) | Critical |
| `apply()` on mixed-type data frame (silent coercion to character) | Critical |
| Growing vector in loop (O(n^2) copy) on large data | Important |
| Missing `na.rm` on data with potential NAs | Important |
| NSE column reference without embrace/`.data` in reusable function | Important |
| Package dependency not listed in DESCRIPTION | Important |
| `<<-` outside of reactive/closure context | Important |
| `library()` inside function body in package code | Important |
| `T`/`F` instead of `TRUE`/`FALSE` | Minor |
| `read.csv` instead of `fread`/`read_csv` for small files | Minor |
| Missing `sessionInfo()` in analysis output | Minor |
| Style inconsistency (`<-` vs `=` for assignment) | Minor |
| `which()` used unnecessarily for subsetting | Minor |

## See Also

- `lang-python` — Python data science patterns (pandas, numpy equivalents)
- `concern-testing` — General testing discipline across languages
- `concern-performance` — Performance review patterns

## Authoritative References

- [Advanced R (Hadley Wickham)](https://adv-r.hadley.nz/) — Definitive R language internals reference
- [R Packages (Hadley Wickham)](https://r-pkgs.org/) — Package development best practices
- [Tidyverse Style Guide](https://style.tidyverse.org/) — Community style standard
- [data.table Reference](https://rdatatable.gitlab.io/data.table/) — data.table vignettes and reference semantics
- [lintr Documentation](https://lintr.r-lib.org/) — Static analysis tool for R
- [CRAN Repository Policy](https://cran.r-project.org/web/packages/policies.html) — Submission requirements and policies
- [Programming with dplyr](https://dplyr.tidyverse.org/articles/programming.html) — Tidy evaluation and NSE guide
- [R Inferno (Patrick Burns)](https://www.burns-stat.com/pages/Tutor/R_inferno.pdf) — Classic guide to R pitfalls
