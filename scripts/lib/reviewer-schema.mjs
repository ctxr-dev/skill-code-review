/**
 * Single source of truth for the v2 reviewer-source schema.
 *
 * Used by scripts/build-index-src.mjs, scripts/validate-body-shape.mjs, and
 * scripts/validate-dimensions.mjs, plus their unit tests. Keep changes here
 * only; consumers must not redeclare these constants.
 *
 * The legacy v1 schema (scripts/build-index.js, reviewers/index.yaml) is
 * untouched — this module exists alongside it during the transition.
 */

/**
 * Required frontmatter fields. A missing field is a hard error.
 */
export const REQUIRED_FRONTMATTER = Object.freeze([
  "id",
  "type",
  "tier",
  "focus",
  "dimensions",
  "covers",
  "audit_surface",
  "languages",
  "tags",
  "last_reviewed",
]);

/**
 * Optional frontmatter fields. Present-but-invalid is a hard error; absent is
 * fine.
 */
export const OPTIONAL_FRONTMATTER = Object.freeze([
  "activation",
  "tools",
]);

/**
 * Allowed values for `type`.
 */
export const VALID_TYPES = Object.freeze(["universal", "conditional"]);

/**
 * Allowed values for `tier`.
 */
export const VALID_TIERS = Object.freeze([1, 2, 3]);

/**
 * Per-tier hard caps. Violations at-or-below the cap are soft-warn; over the
 * cap is the hard fail boundary we DO NOT enforce per the user's policy
 * ("soft-warn only, proceed"). Validators report them and exit 0; consumers
 * decide whether to fail.
 *
 * maxLines — total line count of the .md file.
 * maxAudit — number of `- [ ]` items inside the `## Audit Surface` section.
 * maxH3    — number of `###` subsections inside `## Detailed Checks`.
 */
export const TIER_LIMITS = Object.freeze({
  1: Object.freeze({ maxLines: 200, maxAudit: 12, maxH3: 4 }),
  2: Object.freeze({ maxLines: 500, maxAudit: 20, maxH3: 8 }),
  3: Object.freeze({ maxLines: 800, maxAudit: 25, maxH3: 12 }),
});

/**
 * The seven review dimensions. Every reviewer must declare `dimensions` as a
 * non-empty subset of this set, with no duplicates.
 */
export const DIMENSIONS = Object.freeze([
  "correctness",
  "security",
  "performance",
  "tests",
  "readability",
  "architecture",
  "documentation",
]);

/**
 * Required H2 body sections, in the order they must appear. Exactly these
 * seven, exactly this order.
 */
export const REQUIRED_BODY_SECTIONS = Object.freeze([
  "When This Activates",
  "Audit Surface",
  "Detailed Checks",
  "Common False Positives",
  "Severity Guidance",
  "See Also",
  "Authoritative References",
]);

/**
 * Covers field constraints (per SCHEMA.md: "3–15 granular bullets").
 */
export const COVERS_MIN = 3;
export const COVERS_MAX = 15;

/**
 * Audit-surface field constraint. Must be a non-empty array. Upper bound is
 * tier-dependent (see TIER_LIMITS.maxAudit).
 */
export const AUDIT_MIN = 10;

/**
 * last_reviewed must match YYYY-MM-DD. We don't validate the calendar (e.g.
 * Feb 30) because gray-matter parses it as a JS Date when well-formed; we
 * only check the raw string shape for consistency.
 */
export const LAST_REVIEWED_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ID pattern. Kebab-case, lowercase, digits allowed, no leading/trailing
 * hyphens.
 */
export const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Languages: either the literal string "all" or a non-empty array of strings.
 */
export function isValidLanguages(value) {
  if (value === "all") return true;
  return Array.isArray(value) && value.length > 0 && value.every((s) => typeof s === "string");
}
