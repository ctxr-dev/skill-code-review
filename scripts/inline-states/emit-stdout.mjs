// emit-stdout.mjs — deterministic implementation of FSM state Step 11.
//
// Inputs (from env):
//   - run_dir_path : string (path written by Step 10 / write-run-directory)
//   - args         : the orchestrator's arg bag (carries `--format` if any)
//
// Outputs: none (FSM-side `outputs: []`). Side effect: prints the report
// payload to stdout in the requested format. For markdown we append a
// `# manifest: <path>` pointer so a human (or shell pipeline) can chase the
// on-disk artefacts; for json we keep stdout valid JSON and emit the manifest
// pointer to stderr instead.
//
// Format selection: `--format` ∈ {markdown (default), json}. YAML is reserved
// for a future PR that bundles a serializer.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const VALID_FORMATS = new Set(["markdown", "json"]);

function resolveFormat(argsBag) {
  const requested = argsBag?.format;
  if (typeof requested !== "string") return "markdown";
  const normalised = requested.toLowerCase();
  return VALID_FORMATS.has(normalised) ? normalised : "markdown";
}

function readReport(runDirPath, format) {
  if (format === "markdown") {
    const path = join(runDirPath, "report.md");
    return existsSync(path) ? readFileSync(path, "utf8") : null;
  }
  const jsonPath = join(runDirPath, "report.json");
  return existsSync(jsonPath) ? readFileSync(jsonPath, "utf8") : null;
}

export default async function emitStdout({ env }) {
  const runDirPath = env.run_dir_path;
  if (!runDirPath) {
    process.stderr.write(
      "(emit_stdout: no run_dir_path in env — Step 10 may have been skipped)\n",
    );
    return {};
  }

  const argsBag = env.args ?? {};
  const format = resolveFormat(argsBag);
  const body = readReport(runDirPath, format);
  if (body === null) {
    process.stderr.write(
      `(emit_stdout: report file for format=${format} not found under ${runDirPath})\n`,
    );
    return {};
  }

  process.stdout.write(body);
  if (!body.endsWith("\n")) process.stdout.write("\n");
  // Manifest pointer: append to stdout for markdown (it's a human-friendly
  // trailer that doesn't break grep / less); send to stderr for json so the
  // primary stdout stays valid JSON for downstream parsers.
  const manifestLine = `# manifest: ${join(runDirPath, "manifest.json")}\n`;
  if (format === "markdown") {
    process.stdout.write(manifestLine);
  } else {
    process.stderr.write(manifestLine);
  }
  return {};
}
