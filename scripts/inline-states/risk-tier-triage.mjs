// risk-tier-triage.mjs — deterministic implementation of FSM state Step 2.
//
// Inputs (from env):
//   - changed_paths     : string[]
//   - diff_stats        : { lines_changed, files_changed }
//   - project_profile   : { languages[], frameworks[], monorepo, ci, ... }
//   - args              : the orchestrator's arg bag (from `args` env entry)
//
// Outputs:
//   - tier                     : "trivial" | "lite" | "full" | "sensitive"
//   - cap                      : integer in [3, 50]
//   - tier_rationale           : string (one-sentence explanation)
//   - risk_signals             : string[] (each entry is a fired risk pattern)
//   - scope_overrides_present  : boolean (any scope-* arg present)
//
// Rules per code-reviewer.md Step 2:
//   trivial   = lines_changed ≤ 10  AND files_changed = 1  AND no risk-path match  →  cap 3
//   lite      = lines_changed ≤ 100 AND files_changed ≤ 5  AND no risk-path match  →  cap 8
//   full      = lines_changed > 100 OR  files_changed > 5                          →  cap 20
//   sensitive = ANY risk-path match OR ANY high-risk Project-Profile signal        →  cap 30

const RISK_KEYWORDS = [
  "auth",
  "crypto",
  "secret",
  "password",
  "token",
  "infra",
  "deploy",
  "migration",
  "migrate",
  "iam",
  "rbac",
  "oauth",
  "jwt",
  "session",
  "key",
  "tls",
  "ssl",
  "cert",
  "kms",
  "vault",
];

const HIGH_RISK_PATH_PATTERNS = [
  /(^|\/)Dockerfile($|\.|\/)/,
  /\.tf$/,
  /(^|\/)k8s\//,
  /(^|\/)kubernetes\//,
  /(^|\/)helm\//,
  /\.cdk\.ts$/,
  /(^|\/)serverless\.ya?ml$/,
  /(^|\/)Pulumi\.ya?ml$/,
  /(^|\/)\.github\/workflows\//,
  /(^|\/)\.gitlab-ci\.ya?ml$/,
  /(^|\/)migrations\//,
  /(^|\/)prisma\/migrations\//,
  /(^|\/)alembic\//,
  /(^|\/)flyway\//,
  /(^|\/)atlas\//,
];

const SCOPE_OVERRIDE_KEYS = [
  "scope-dir",
  "scope-lang",
  "scope-framework",
  "scope-reviewer",
  "scope-severity",
  "scope-gate",
];

function detectRiskSignals(changedPaths, projectProfile) {
  const signals = new Set();
  for (const path of changedPaths) {
    const lower = path.toLowerCase();
    for (const kw of RISK_KEYWORDS) {
      if (lower.includes(kw)) {
        signals.add(`keyword:${kw}`);
      }
    }
    for (const pattern of HIGH_RISK_PATH_PATTERNS) {
      if (pattern.test(path)) {
        signals.add(`path:${pattern.source}`);
        break;
      }
    }
  }
  if (Array.isArray(projectProfile?.iac) && projectProfile.iac.length > 0) {
    signals.add("profile:iac-present");
  }
  return [...signals].sort();
}

function detectScopeOverrides(argsBag) {
  if (!argsBag || typeof argsBag !== "object") return false;
  return SCOPE_OVERRIDE_KEYS.some((key) => argsBag[key] !== undefined);
}

function clampCap(n) {
  return Math.max(3, Math.min(50, Math.trunc(n)));
}

export default async function riskTierTriage({ env }) {
  const changedPaths = Array.isArray(env.changed_paths) ? env.changed_paths : [];
  const diffStats = env.diff_stats ?? { lines_changed: 0, files_changed: 0 };
  const projectProfile = env.project_profile ?? {};
  const argsBag = env.args ?? {};

  const riskSignals = detectRiskSignals(changedPaths, projectProfile);
  const scopeOverridesPresent = detectScopeOverrides(argsBag);

  let tier;
  let rationale;
  if (riskSignals.length > 0) {
    tier = "sensitive";
    rationale = `Risk signals fired: ${riskSignals.slice(0, 3).join(", ")}.`;
  } else if (
    diffStats.lines_changed > 100 ||
    diffStats.files_changed > 5
  ) {
    tier = "full";
    rationale = `Large diff (${diffStats.lines_changed} lines across ${diffStats.files_changed} files).`;
  } else if (
    diffStats.lines_changed <= 10 &&
    diffStats.files_changed === 1
  ) {
    tier = "trivial";
    rationale = `Single-file change ≤ 10 lines, no risk path.`;
  } else {
    tier = "lite";
    rationale = `Small diff (${diffStats.lines_changed} lines across ${diffStats.files_changed} files), no risk path.`;
  }

  const tierCaps = { trivial: 3, lite: 8, full: 20, sensitive: 30 };
  let cap = tierCaps[tier];

  const maxReviewersOverride = argsBag["max-reviewers"];
  if (maxReviewersOverride !== undefined) {
    const n = Number(maxReviewersOverride);
    if (Number.isFinite(n)) {
      cap = clampCap(n);
      rationale += ` Cap overridden to ${cap} via --max-reviewers.`;
    }
  }

  return {
    tier,
    cap,
    tier_rationale: rationale,
    risk_signals: riskSignals,
    scope_overrides_present: scopeOverridesPresent,
  };
}
