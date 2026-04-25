---
id: ai-ml-data-pipelines-pandas-polars-dask-spark
type: primary
depth_role: leaf
focus: Detect pandas on data too large for memory, missing dtypes with object columns, chained indexing, Spark shuffle too wide, missing schema validation on input, and Polars lazy not collected
parents:
  - index.md
covers:
  - Pandas DataFrame on data exceeding available memory
  - "Missing dtype specification causing object columns (high memory, slow ops)"
  - Chained indexing in pandas causing SettingWithCopyWarning
  - "Spark shuffle too wide (excessive partitions or data movement)"
  - No schema validation on pipeline input data
  - Polars lazy frame not collected or collected too early
  - No null handling strategy for pipeline data
tags:
  - pandas
  - Polars
  - Dask
  - Spark
  - DataFrame
  - data-pipeline
  - memory
  - dtype
  - schema
  - shuffle
activation:
  file_globs:
    - "**/*pipeline*"
    - "**/*etl*"
    - "**/*data*"
    - "**/*transform*"
    - "**/*ingest*"
  keyword_matches:
    - pandas
    - pd.
    - DataFrame
    - read_csv
    - read_parquet
    - polars
    - pl.
    - LazyFrame
    - collect
    - dask
    - dd.
    - spark
    - pyspark
    - SparkSession
    - groupBy
    - join
    - merge
    - apply
    - dtype
    - schema
  structural_signals:
    - pandas_large_file
    - chained_indexing
    - spark_wide_shuffle
    - polars_eager_collect
source:
  origin: file
  path: ai-ml-data-pipelines-pandas-polars-dask-spark.md
  hash: "sha256:12011160587ed325654372652d83dbfd03b4405158fe7548f88dfe7c53587eea"
---
# Data Pipeline Discipline (Pandas, Polars, Dask, Spark)

## When This Activates

Activates when diffs contain DataFrame operations, ETL pipeline logic, data loading from files or databases, or data transformation code using pandas, Polars, Dask, or Spark. Data pipeline code is where performance and correctness bugs hide in plain sight: an object dtype column silently 10x-es memory usage, chained indexing silently produces wrong results, and a Spark shuffle silently turns a 5-minute job into a 5-hour job.

## Audit Surface

- [ ] pd.read_csv() on large files without chunking or dtypes
- [ ] DataFrame with object dtype columns
- [ ] Chained indexing (`df[cond][col] = value`)
- [ ] Spark join/groupBy causing full shuffle
- [ ] Pipeline input without schema validation
- [ ] Polars lazy frame collected too early or in a loop
- [ ] pandas apply() with Python function (no vectorization)
- [ ] No memory estimation for large datasets
- [ ] Dask compute() called prematurely
- [ ] String operations on object columns

## Detailed Checks

### Pandas Memory and Performance
<!-- activation: keywords=["pandas", "pd.", "read_csv", "read_excel", "read_parquet", "DataFrame", "dtype", "object", "memory_usage", "apply", "iterrows"] -->

- [ ] **Large file without chunking**: flag `pd.read_csv()` or `pd.read_excel()` on files likely >1GB without `chunksize` parameter or without Dask/Polars as an alternative -- pandas loads the entire file into memory, causing OOM on large datasets
- [ ] **Missing dtypes**: flag `read_csv()` without `dtype` parameter when columns contain integers, floats, or categoricals that default to `object` dtype -- object columns use 5-10x more memory and disable vectorized operations
- [ ] **apply() instead of vectorized operation**: flag `df.apply(lambda ...)` or `df.apply(func, axis=1)` where a vectorized pandas/numpy operation exists -- apply() runs Python per-row and is 10-100x slower than vectorized alternatives
- [ ] **iterrows() in production code**: flag `for idx, row in df.iterrows()` -- iterrows() is the slowest way to process a DataFrame; use vectorized operations or `.itertuples()` at minimum

### Pandas Correctness
<!-- activation: keywords=["SettingWithCopyWarning", "chained", "copy", "loc", "iloc", "assign", "inplace"] -->

- [ ] **Chained indexing**: flag `df[df['col'] > 0]['result'] = value` and similar patterns -- chained indexing may modify a copy instead of the original DataFrame, producing silent data corruption. Use `df.loc[condition, 'result'] = value`
- [ ] **inplace=True on filtered DataFrame**: flag `.fillna(inplace=True)`, `.drop(inplace=True)`, or similar on a filtered view -- inplace on a view may or may not modify the original, depending on pandas version

### Polars and Dask Lazy Evaluation
<!-- activation: keywords=["polars", "pl.", "LazyFrame", "collect", "lazy", "scan_csv", "scan_parquet", "dask", "dd.", "compute", "persist"] -->

- [ ] **Polars collect too early**: flag Polars code that calls `.collect()` before all transformations are chained -- collecting early prevents query optimization and may load unnecessary data into memory
- [ ] **Polars collect in a loop**: flag `.collect()` called inside a loop -- each collect triggers a full computation; batch operations or use streaming
- [ ] **Dask compute premature**: flag Dask code that calls `.compute()` on intermediate results instead of chaining transformations lazily -- premature compute materializes large intermediate DataFrames

### Spark Shuffle and Partitioning
<!-- activation: keywords=["spark", "pyspark", "SparkSession", "groupBy", "groupByKey", "join", "repartition", "coalesce", "shuffle", "partition", "broadcast"] -->

- [ ] **Wide shuffle on join**: flag Spark joins where neither side is broadcast and no partition hints are given -- joining two large DataFrames triggers a full shuffle; broadcast the smaller side with `broadcast()` hint when it fits in memory
- [ ] **groupByKey instead of reduceByKey**: flag `groupByKey()` followed by aggregation -- `groupByKey` shuffles all data; use `reduceByKey()`, `aggregateByKey()`, or DataFrame `groupBy().agg()` which pre-aggregate before shuffle
- [ ] **Too many partitions**: flag `repartition(10000)` or similar with excessive partition counts -- too many partitions create scheduling overhead; aim for 128MB-256MB per partition

### Schema Validation
<!-- activation: keywords=["schema", "validate", "pandera", "pydantic", "StructType", "StructField", "column", "type", "null", "missing"] -->

- [ ] **No input schema validation**: flag data pipelines reading external files or API responses without schema validation (Pandera, Great Expectations, Spark StructType) -- unexpected columns, types, or nulls propagate silently and corrupt downstream results
- [ ] **No null handling**: flag pipelines that do not explicitly handle null/NaN values -- nulls in numeric columns silently propagate through calculations and produce incorrect results
- [ ] **No output schema validation**: flag pipeline output written to downstream consumers without validating the output schema matches expectations -- corrupt data propagates to dashboards, models, and reports

## Common False Positives

- **Small datasets in notebooks**: pandas on small (<100MB) datasets does not need chunking, dtype optimization, or Spark. Do not flag for clearly small-scale exploratory work.
- **One-time scripts**: ETL scripts that run once (data migration) do not need the same optimization as recurring pipelines.
- **Polars eager mode for small data**: Polars eager mode is fine for small datasets where optimization overhead exceeds benefit.

## Severity Guidance

| Finding | Severity |
|---|---|
| Chained indexing causing silent data corruption | Critical |
| No schema validation on pipeline input | Important |
| pandas on >1GB file without chunking or alternative | Important |
| Spark groupByKey instead of reduceByKey on large data | Important |
| apply() instead of vectorized operation in production pipeline | Minor |
| Missing dtype specification on read_csv | Minor |
| Polars collect() called before all transforms chained | Minor |

## See Also

- `perf-memory-gc` -- DataFrame memory issues are a specific case of memory management
- `principle-fail-fast` -- schema validation at pipeline entry is fail-fast
- `ai-ml-orchestration-airflow-prefect-dagster-kubeflow` -- data pipelines run within orchestrators

## Authoritative References

- [pandas Documentation, "Enhancing Performance"](https://pandas.pydata.org/docs/user_guide/enhancingperf.html)
- [Polars Documentation, "Lazy API"](https://docs.pola.rs/user-guide/lazy/)
- [Spark Documentation, "Performance Tuning"](https://spark.apache.org/docs/latest/sql-performance-tuning.html)
- [Pandera -- DataFrame validation](https://pandera.readthedocs.io/)
- [Great Expectations -- Data quality](https://docs.greatexpectations.io/)
- [Dask Documentation, "Best Practices"](https://docs.dask.org/en/stable/best-practices.html)
