// collect-findings.mjs — deterministic implementation of FSM state Step 7.
//
// Inputs (from env):
//   - specialist_outputs : array of { id, status, findings[], skip_reason?, ... }
//
// Outputs:
//   - findings        : deduped + categorised array
//   - severity_counts : { critical, important, minor }
//
// Dedup rule: when two specialists flag the same (file, line, normalised_title),
// keep the higher-severity one and remember which specialists flagged it
// (cross-validation signal).
//
// Severity ordering (highest → lowest): critical > important > minor.

const SEVERITY_RANK = { critical: 3, important: 2, minor: 1 };

function normaliseTitle(title) {
  if (typeof title !== "string") return "";
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupKey(finding) {
  const file = finding.file ?? "";
  const line = finding.line === null || finding.line === undefined ? "" : String(finding.line);
  const title = normaliseTitle(finding.title);
  return `${file}::${line}::${title}`;
}

function pickHigherSeverity(a, b) {
  return (SEVERITY_RANK[a.severity] ?? 0) >= (SEVERITY_RANK[b.severity] ?? 0)
    ? a
    : b;
}

export default async function collectFindings({ env }) {
  const specialistOutputs = Array.isArray(env.specialist_outputs)
    ? env.specialist_outputs
    : [];

  const merged = new Map();
  for (const specialist of specialistOutputs) {
    if (specialist.status !== "completed") continue;
    const findings = Array.isArray(specialist.findings) ? specialist.findings : [];
    for (const f of findings) {
      const key = dedupKey(f);
      const existing = merged.get(key);
      const sourceIds = new Set(existing?.flagged_by ?? []);
      sourceIds.add(specialist.id);
      const winner = existing ? pickHigherSeverity(existing, f) : f;
      merged.set(key, {
        ...winner,
        flagged_by: [...sourceIds].sort(),
      });
    }
  }

  const findings = [...merged.values()].sort((a, b) => {
    const sevDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sevDiff !== 0) return sevDiff;
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const aLine = a.line ?? 0;
    const bLine = b.line ?? 0;
    if (aLine !== bLine) return aLine - bLine;
    return normaliseTitle(a.title) < normaliseTitle(b.title) ? -1 : 1;
  });

  const severityCounts = { critical: 0, important: 0, minor: 0 };
  for (const f of findings) {
    if (severityCounts[f.severity] !== undefined) {
      severityCounts[f.severity]++;
    }
  }

  return {
    findings,
    severity_counts: severityCounts,
  };
}
