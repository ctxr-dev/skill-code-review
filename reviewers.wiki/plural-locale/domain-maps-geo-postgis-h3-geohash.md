---
id: domain-maps-geo-postgis-h3-geohash
type: primary
depth_role: leaf
focus: Detect coordinate swaps, SRID mismatches, missing spatial indexes, and incorrect distance calculations in geospatial code
parents:
  - index.md
covers:
  - Latitude and longitude swapped in function arguments
  - SRID mismatch between layers or queries
  - Distance calculation using Euclidean instead of geodesic formula
  - Geohash precision too low for the use case
  - Spatial index missing on geometry column
  - GeoJSON without SRID specification
  - Antimeridian crossing not handled
  - Missing bounding box pre-filter before expensive spatial query
  - H3 resolution mismatch between indexing and query
  - Polygon winding order incorrect
tags:
  - PostGIS
  - H3
  - geohash
  - geo
  - spatial
  - GeoJSON
  - SRID
  - WGS84
  - coordinate
  - distance
  - polygon
  - latitude
  - longitude
  - maps
activation:
  file_globs:
    - "**/*geo*"
    - "**/*spatial*"
    - "**/*postgis*"
    - "**/*h3*"
    - "**/*geohash*"
    - "**/*location*"
    - "**/*coordinate*"
    - "**/*map*"
    - "**/*.geojson"
  keyword_matches:
    - PostGIS
    - H3
    - geohash
    - latitude
    - longitude
    - coordinate
    - GeoJSON
    - spatial
    - distance
    - bbox
    - polygon
    - point
    - SRID
    - WGS84
    - EPSG
    - ST_Distance
    - ST_Contains
    - ST_Intersects
    - ST_Transform
    - ST_MakePoint
    - h3ToGeo
    - geoToH3
  structural_signals:
    - postgis_query
    - geojson_construction
    - coordinate_pair_argument
    - spatial_index_creation
    - h3_resolution_config
source:
  origin: file
  path: domain-maps-geo-postgis-h3-geohash.md
  hash: "sha256:515a8f8bc75549b229559e275dd6e14f4ec7f7577c4ae43bc4eff7434c976d38"
---
# Maps / Geo: PostGIS / H3 / Geohash

## When This Activates

Activates on diffs involving PostGIS queries, H3 hexagonal indexing, geohash encoding, GeoJSON construction, coordinate handling, or spatial distance calculations. Geospatial code has a unique class of bugs where everything looks correct -- the query runs, results are returned -- but the results are wrong. Swapped coordinates place points in the wrong hemisphere, SRID mismatches silently produce meaningless distances, and missing spatial indexes turn millisecond queries into minutes. These bugs are silent: no exception is thrown, no error is logged.

## Audit Surface

- [ ] lat/lng argument order swapped
- [ ] SRID mismatch between layers or in comparison
- [ ] Euclidean distance on Earth-surface coordinates
- [ ] Geohash precision too low for use case
- [ ] Geometry column missing spatial index
- [ ] GeoJSON without CRS/SRID specification
- [ ] Antimeridian crossing not handled
- [ ] Expensive spatial query without bounding box pre-filter
- [ ] H3 resolution mismatch between indexing and query
- [ ] Polygon winding order incorrect
- [ ] Geography type not used for long-distance calculations
- [ ] Missing ST_Transform before cross-SRID comparison

## Detailed Checks

### Coordinate Order and Convention
<!-- activation: keywords=["lat", "lng", "lon", "latitude", "longitude", "coordinate", "point", "ST_MakePoint", "ST_Point", "LatLng", "LngLat", "GeoJSON", "position"] -->

- [ ] **lat/lng swap**: flag function calls where (longitude, latitude) is passed where (latitude, longitude) is expected, or vice versa -- PostGIS `ST_MakePoint(x, y)` uses (lng, lat), GeoJSON uses [lng, lat], but most mapping APIs and human conventions use (lat, lng); a swap places a point at a mirrored location
- [ ] **Inconsistent order across codebase**: flag codebases that mix (lat, lng) and (lng, lat) conventions in different modules without a clear conversion boundary -- one convention should be used internally with explicit conversion at API boundaries
- [ ] **Latitude out of range**: flag latitude values outside [-90, 90] or longitude values outside [-180, 180] that are not validated before use -- a swapped pair where latitude > 90 indicates a definite swap
- [ ] **Coordinate precision truncation**: flag coordinates rounded to fewer than 5 decimal places when meter-level precision is needed -- 5 decimal places give ~1.1m precision; fewer digits lose accuracy

### SRID and Projection Mismatches
<!-- activation: keywords=["SRID", "EPSG", "WGS84", "4326", "3857", "projection", "CRS", "transform", "ST_Transform", "ST_SetSRID", "geography", "geometry"] -->

- [ ] **SRID mismatch in comparison**: flag `ST_Distance`, `ST_Contains`, `ST_Intersects`, or other spatial operations where the two geometries have different SRIDs -- results are meaningless without `ST_Transform` to a common SRID
- [ ] **Missing ST_SetSRID on geometry creation**: flag geometry created from raw coordinates without setting the SRID -- PostGIS defaults to SRID 0, which does not match any coordinate system
- [ ] **Geometry type for long distances**: flag `ST_Distance(geometry, geometry)` used for distances over a few kilometers -- geometry distance calculates Cartesian distance in SRID units; use `geography` type or `ST_DistanceSphere` for geodesic accuracy
- [ ] **Web Mercator (3857) for area/distance**: flag area or distance calculations using EPSG:3857 (Web Mercator) -- Mercator projection distorts area and distance at high latitudes; use an equal-area or geodesic calculation

### Spatial Index and Query Performance
<!-- activation: keywords=["index", "GiST", "BRIN", "spatial", "ST_DWithin", "ST_Contains", "ST_Intersects", "bbox", "envelope", "explain", "scan", "performance"] -->

- [ ] **Missing spatial index**: flag geometry columns used in WHERE clauses with spatial predicates but no GiST or SP-GiST index -- spatial queries without an index perform a sequential scan, which is O(n) on the table
- [ ] **No bounding box pre-filter**: flag expensive spatial operations (`ST_Contains` on complex polygons, `ST_Distance` for nearest-neighbor) without a prior bounding box filter (`ST_MakeEnvelope`, `&&` operator) -- the bounding box filter uses the spatial index to reduce the candidate set before the expensive calculation
- [ ] **ST_Distance for proximity search**: flag `WHERE ST_Distance(geom, point) < threshold` instead of `ST_DWithin(geom, point, threshold)` -- `ST_DWithin` uses the spatial index; `ST_Distance < N` computes distance for every row
- [ ] **Missing index after bulk load**: flag bulk insert into a spatially-indexed table without a `REINDEX` or `VACUUM ANALYZE` after load -- the index statistics are stale, causing the query planner to make poor choices

### Geohash, H3, and Grid Systems
<!-- activation: keywords=["geohash", "H3", "h3", "resolution", "precision", "hex", "cell", "ring", "neighbor", "compact", "grid", "tile"] -->

- [ ] **Geohash precision too low**: flag geohash precision <5 for use cases requiring address-level resolution (~5m) -- precision 4 covers ~39km x 20km; precision 5 covers ~5km x 5km; precision 6 covers ~1.2km x 600m
- [ ] **H3 resolution mismatch**: flag H3 indexing at one resolution (e.g., 7) but querying at a different resolution without explicit `h3ToParent` or `h3ToChildren` conversion -- results silently miss or double-count areas
- [ ] **Edge-of-cell boundary errors**: flag geohash or H3 proximity queries that check only the target cell without including neighboring cells -- a point near the edge of a cell may have its nearest neighbor in an adjacent cell
- [ ] **Antimeridian crossing**: flag bounding box or geohash queries that span the antimeridian (longitude 180/-180) without splitting the query into two ranges -- a single bbox crossing the antimeridian returns empty results or wraps incorrectly

## Common False Positives

- **Consistent internal convention**: if a codebase consistently uses (lng, lat) order and documents this convention, do not flag the order. Flag only when the convention is inconsistent or when calling an external API that expects the opposite order.
- **Small geographic area**: operations within a city-sized area using a local projected SRID (UTM zone) are valid for Euclidean calculations. Do not flag Euclidean distance when a local projection is correctly applied.
- **Test data**: hardcoded coordinates in test fixtures may intentionally use simplified or fake values. Focus on production code paths.
- **Visualization only**: Web Mercator (3857) is correct for map tile rendering. Flag it only when used for distance or area calculations.

## Severity Guidance

| Finding | Severity |
|---|---|
| lat/lng swap producing points in wrong hemisphere | Critical |
| SRID mismatch in spatial comparison (meaningless results) | Critical |
| Euclidean distance on WGS84 coordinates for business logic | Important |
| Missing spatial index on queried geometry column | Important |
| Antimeridian crossing not handled | Important |
| Missing bounding box pre-filter on expensive spatial query | Important |
| Geohash precision too low for required accuracy | Minor |
| H3 resolution mismatch between index and query | Minor |
| GeoJSON without explicit SRID specification | Minor |
| Polygon winding order incorrect | Minor |

## See Also

- `footgun-floating-point-comparison` -- coordinate equality comparisons must account for floating-point imprecision
- `data-relational-modeling` -- spatial columns need appropriate types (geometry vs geography) and indexes
- `perf-db-query` -- spatial queries without indexes are a special case of missing-index performance problems
- `principle-fail-fast` -- silent wrong results from SRID mismatches should be caught with validation

## Authoritative References

- [PostGIS Documentation, "Spatial Relationships" and "Performance Tips"](https://postgis.net/documentation/)
- [H3 Documentation, "Resolution Table" and "Indexing"](https://h3geo.org/docs/)
- [GeoJSON Specification, RFC 7946](https://datatracker.ietf.org/doc/html/rfc7946)
- [Tom MacWright, "More than you ever wanted to know about GeoJSON"](https://macwright.com/2015/03/23/geojson-second-bite)
- [Uber Engineering, "H3: Uber's Hexagonal Hierarchical Spatial Index"](https://www.uber.com/blog/h3/)
