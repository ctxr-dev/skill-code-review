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

// Tie-break the dedup winner deterministically when severities are equal but
// other fields (description / impact / fix / …) differ. Without this, the
// winner depends on input iteration order, which would let two seeded
// fixtures with the same findings produce byte-different manifests across
// runs that visit the specialists in different orders. Pick by:
//   1. higher severity (the original rule),
//   2. lexicographically earlier source id (stable across runs because each
//      finding always carries `flagged_by[]` after the first merge — but on
//      the first encounter `flagged_by` may not exist; fall back to the
//      hosting specialist's id captured at the call site).
// Tie-breaker MUST be a stable property of the finding record itself, not
// derived from a value that the caller mutates between merges. flagged_by
// is recomputed as the sorted union of source ids on every merge, so its
// [0] entry shifts as more specialists flag the same row — using it for
// tie-break would let the "winner" fields (title / impact / fix) change
// over time and break determinism. Use the persisted __winner / __origin
// stamp on each record instead. The finding that arrived first carries the
// id of the specialist that produced it, and that id never changes.
function pickWinner(a, b) {
  const aSev = SEVERITY_RANK[a.severity] ?? 0;
  const bSev = SEVERITY_RANK[b.severity] ?? 0;
  if (aSev !== bSev) return aSev > bSev ? a : b;
  const aOrigin = a.__winner ?? a.__origin ?? "";
  const bOrigin = b.__winner ?? b.__origin ?? "";
  return aOrigin <= bOrigin ? a : b;
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
      // Stamp __origin so the tie-breaker can compare even on the first
      // encounter (before the merged record has a flagged_by[]). Persist
      // the origin of whichever finding *won* onto the merged record as
      // `__winner` so downstream consumers (write-run-directory's
      // buildIssue) can attribute the issue to the specialist whose
      // finding fields actually carried through the dedup. When `existing`
      // wins, the previous __winner is the right answer; when `fStamped`
      // wins, the current specialist.id is.
      const fStamped = { ...f, __origin: specialist.id };
      const winner = existing ? pickWinner(existing, fStamped) : fStamped;
      const winnerOrigin =
        existing && winner === existing
          ? existing.__winner ?? existing.__origin ?? null
          : specialist.id;
      const { __origin: _o, __winner: _w, ...winnerOut } = winner;
      merged.set(key, {
        ...winnerOut,
        flagged_by: [...sourceIds].sort(),
        __winner: winnerOrigin ?? specialist.id,
      });
    }
  }

  const findings = [...merged.values()].map((f) => {
    // Strip the dedup-internal __winner from the user-visible field set,
    // but project it onto a stable `winner` field so downstream code can
    // attribute the finding without needing to know about the internal
    // bookkeeping name.
    const { __winner, ...rest } = f;
    return __winner ? { ...rest, winner: __winner } : rest;
  }).sort((a, b) => {
    const sevDiff = (SEVERITY_RANK[b.severity] ?? 0) - (SEVERITY_RANK[a.severity] ?? 0);
    if (sevDiff !== 0) return sevDiff;
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    const aLine = a.line ?? 0;
    const bLine = b.line ?? 0;
    if (aLine !== bLine) return aLine - bLine;
    const aTitle = normaliseTitle(a.title);
    const bTitle = normaliseTitle(b.title);
    if (aTitle === bTitle) return 0;
    return aTitle < bTitle ? -1 : 1;
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
