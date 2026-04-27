// report-renderer.mjs — pure render of the canonical report payload to
// markdown / JSON. The payload shape comes from
// `scripts/inline-states/write-run-directory.mjs::buildReportPayload` and
// matches `report-format.md` (the contract README and code-reviewer.md
// point users at).

export function renderReportJson(payload) {
  return JSON.stringify(payload, null, 2) + "\n";
}

function severityCountsFromIssues(issues) {
  const counts = { critical: 0, important: 0, minor: 0 };
  for (const i of issues) {
    if (counts[i.severity] !== undefined) counts[i.severity]++;
  }
  return counts;
}

function bullet(label, value) {
  if (value === null || value === undefined || value === "") return null;
  return `| **${label}** | ${mdCell(value)} |`;
}

function renderVerdictTable(payload) {
  const counts = severityCountsFromIssues(payload.issues ?? []);
  const blocking =
    counts.critical > 0 || counts.important > 0
      ? `${counts.critical} critical, ${counts.important} important`
      : "none";
  const range = payload.summary?.range ?? {};
  const rangeStr =
    range.base && range.head
      ? `${range.base}..${range.head}`
      : range.head
      ? range.head
      : "—";
  const stack = (payload.summary?.stack ?? []).join(", ") || "—";
  const dispatched = payload.summary?.specialists_dispatched ?? 0;
  const total = payload.summary?.specialists_total ?? "?";
  const lines = [
    "## Verdict",
    "",
    "| | |",
    "|---|---|",
    `| **Decision** | **${payload.verdict ?? "(unknown)"}** |`,
    `| **Blocking** | ${blocking} |`,
  ];
  const description = bullet("Reviewed", payload.summary?.description);
  if (description) lines.push(description);
  lines.push(`| **Range** | ${rangeStr} |`);
  lines.push(`| **Files** | ${payload.summary?.files_changed ?? 0} files changed |`);
  lines.push(`| **Stack** | ${stack} |`);
  lines.push(`| **Mode** | ${payload.summary?.mode ?? "diff"} |`);
  lines.push(`| **Specialists** | ${dispatched} of ${total} dispatched |`);
  lines.push("");
  return lines;
}

function renderMethodologyTable(payload) {
  const m = payload.methodology ?? {};
  const principles = ["SRP", "OCP", "LSP", "ISP", "DIP", "DRY", "KISS", "YAGNI"];
  const lines = ["## SOLID Compliance", "", "| Principle | Status | Finding |", "|-----------|--------|---------|"];
  for (const p of principles) {
    lines.push(`| ${p} | ${m[p] ?? "N/A"} | — |`);
  }
  lines.push("");
  return lines;
}

// Escape a value for inclusion in a markdown table cell. `|` is the column
// separator and `\n` ends the row; either one in raw form would corrupt the
// table layout. Issue titles / fixes routinely include code like `a | b`,
// so escape them on the way in.
function mdCell(value) {
  if (value === null || value === undefined) return "—";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\|/g, "\\|")
    .replace(/\r?\n/g, " ");
}

function fileLink(file, line) {
  // The report.md lives under `.skill-code-review/<shard>/<run-id>/`, three
  // levels deep from the repo root. A relative link like `src/x.ts#L42`
  // resolves to `.skill-code-review/<shard>/<run-id>/src/x.ts` (which doesn't
  // exist) when GitHub / IDEs follow it. Use a leading `../../../` so the
  // link resolves to the repo-root path the user actually expects.
  if (!file) return "—";
  if (line === null || line === undefined) return `\`${file}\``;
  return `[${file}:${line}](../../../${file}#L${line})`;
}

function renderIssuesSection(issues) {
  if (!Array.isArray(issues) || issues.length === 0) return [];
  const buckets = { critical: [], important: [], minor: [] };
  for (const i of issues) {
    if (buckets[i.severity]) buckets[i.severity].push(i);
  }
  const out = ["## Issues", ""];
  if (buckets.critical.length > 0) {
    out.push("### Critical — Blocks Merge", "");
    out.push("| # | Specialist | Location | Title | Impact | Fix |");
    out.push("|---|-----------|----------|-------|--------|-----|");
    for (const i of buckets.critical) {
      out.push(
        `| ${i.id} | ${mdCell(i.specialist)} | ${fileLink(i.file, i.line)} | ${mdCell(i.title)} | ${mdCell(i.impact)} | ${mdCell(i.fix)} |`,
      );
    }
    out.push("");
  }
  if (buckets.important.length > 0) {
    out.push("### Important — Should Fix Before Merge", "");
    out.push("| # | Specialist | Location | Title | Impact | Fix |");
    out.push("|---|-----------|----------|-------|--------|-----|");
    for (const i of buckets.important) {
      out.push(
        `| ${i.id} | ${mdCell(i.specialist)} | ${fileLink(i.file, i.line)} | ${mdCell(i.title)} | ${mdCell(i.impact)} | ${mdCell(i.fix)} |`,
      );
    }
    out.push("");
  }
  if (buckets.minor.length > 0) {
    out.push("### Minor — Advisory", "");
    out.push("| # | Specialist | Location | Title | Fix |");
    out.push("|---|-----------|----------|-------|-----|");
    for (const i of buckets.minor) {
      out.push(
        `| ${i.id} | ${mdCell(i.specialist)} | ${fileLink(i.file, i.line)} | ${mdCell(i.title)} | ${mdCell(i.fix)} |`,
      );
    }
    out.push("");
  }
  return out;
}

function renderStrengths(strengths) {
  if (!Array.isArray(strengths) || strengths.length === 0) return [];
  const out = ["## Strengths", ""];
  for (const s of strengths) {
    out.push(`- **[${s.specialist ?? "—"}]** ${s.description ?? ""}`);
  }
  out.push("");
  return out;
}

function renderToolResults(tools) {
  if (!Array.isArray(tools) || tools.length === 0) return [];
  const out = [
    "## Tool Results",
    "",
    "| Tool | Status | Findings | Specialist |",
    "|------|--------|----------|-----------|",
  ];
  for (const t of tools) {
    const status =
      t.status === "skipped" && t.reason
        ? `SKIP (${t.reason})`
        : (t.status ?? "—").toUpperCase();
    out.push(`| ${mdCell(t.name)} | ${mdCell(status)} | ${t.findings ?? "—"} | ${mdCell(t.specialist)} |`);
  }
  out.push("");
  return out;
}

function renderSpecialists(specialists) {
  if (!Array.isArray(specialists) || specialists.length === 0) return [];
  const out = [
    "## Specialist Results",
    "",
    "| Specialist | Status | C | I | M | Key Finding |",
    "|-----------|--------|---|---|---|-------------|",
  ];
  for (const s of specialists) {
    out.push(
      `| ${mdCell(s.id)} | ${(s.status ?? "—").toUpperCase()} | ${s.critical ?? 0} | ${s.important ?? 0} | ${s.minor ?? 0} | ${mdCell(s.key_finding)} |`,
    );
  }
  out.push("");
  return out;
}

function renderGates(gates) {
  if (!Array.isArray(gates) || gates.length === 0) return [];
  const out = [
    "## Release Gates",
    "",
    "| # | Gate | Status | Blockers |",
    "|---|------|--------|----------|",
  ];
  for (const g of gates) {
    out.push(`| ${g.number} | ${g.name} | ${g.status} | ${g.blockers ?? 0} |`);
  }
  out.push("");
  return out;
}

function renderCoverage(coverage) {
  if (!Array.isArray(coverage) || coverage.length === 0) return [];
  const out = ["## Coverage", "", "| File | Reviewed By |", "|------|-----------|"];
  for (const row of coverage) {
    const reviewers = (row.reviewers ?? []).join(", ") || "—";
    out.push(`| ${row.file} | ${reviewers} |`);
  }
  out.push("");
  return out;
}

export function renderReportMarkdown(payload) {
  const lines = ["# Code Review Report", ""];
  lines.push(...renderVerdictTable(payload));
  lines.push(...renderMethodologyTable(payload));
  lines.push(...renderIssuesSection(payload.issues));
  lines.push(...renderStrengths(payload.strengths));
  lines.push(...renderToolResults(payload.tool_results));
  lines.push(...renderSpecialists(payload.specialists));
  lines.push(...renderGates(payload.gates));
  lines.push(...renderCoverage(payload.coverage));
  // Trail a single newline so the file matches renderReportJson's POSIX
  // "ends in \n" convention.
  return lines.join("\n") + "\n";
}
