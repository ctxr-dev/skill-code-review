// report-renderer.mjs — pure render of the report payload to markdown / JSON.

export function renderReportJson(payload) {
  return JSON.stringify(payload, null, 2) + "\n";
}

export function renderReportMarkdown(payload) {
  const lines = [];
  lines.push(`# Code Review — Run ${payload.run_id}`);
  lines.push("");
  if (payload.repo) lines.push(`**Repo:** ${payload.repo}`);
  if (payload.base_sha) lines.push(`**Base:** \`${payload.base_sha}\``);
  if (payload.head_sha) lines.push(`**Head:** \`${payload.head_sha}\``);
  lines.push(`**Verdict:** **${payload.verdict ?? "(unknown)"}**${payload.degraded_run ? " (degraded run)" : ""}`);
  if (payload.tier) lines.push(`**Risk tier:** ${payload.tier} (cap ${payload.tier_cap ?? "?"})`);
  if (payload.tier_rationale) lines.push(`**Tier rationale:** ${payload.tier_rationale}`);
  lines.push("");

  if (Array.isArray(payload.gates) && payload.gates.length > 0) {
    lines.push("## Gates");
    lines.push("");
    lines.push("| # | Gate | Status | Blocker count | Contributing leaves |");
    lines.push("|---|------|--------|---------------|---------------------|");
    for (const g of payload.gates) {
      const leaves = (g.contributing_leaves ?? []).join(", ");
      lines.push(`| ${g.number} | ${g.name} | ${g.status} | ${g.blocker_count} | ${leaves || "—"} |`);
    }
    lines.push("");
  }

  const counts = payload.severity_counts ?? {};
  lines.push("## Severity counts");
  lines.push("");
  lines.push(`- **Critical:** ${counts.critical ?? 0}`);
  lines.push(`- **Important:** ${counts.important ?? 0}`);
  lines.push(`- **Minor:** ${counts.minor ?? 0}`);
  lines.push("");

  if (Array.isArray(payload.findings) && payload.findings.length > 0) {
    lines.push("## Findings");
    lines.push("");
    for (const f of payload.findings) {
      const where = f.line ? `${f.file}:${f.line}` : f.file;
      lines.push(`### [${f.severity?.toUpperCase() ?? "?"}] ${f.title}`);
      lines.push(`*${where}* — flagged by ${(f.flagged_by ?? []).join(", ") || "(unknown)"}`);
      lines.push("");
      if (f.description) lines.push(f.description);
      if (f.impact) {
        lines.push("");
        lines.push(`**Impact:** ${f.impact}`);
      }
      if (f.fix) {
        lines.push("");
        lines.push(`**Fix:** ${f.fix}`);
      }
      lines.push("");
    }
  }

  if (Array.isArray(payload.coverage_gaps) && payload.coverage_gaps.length > 0) {
    lines.push("## Coverage gaps");
    lines.push("");
    for (const g of payload.coverage_gaps) {
      lines.push(`- ${g}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
