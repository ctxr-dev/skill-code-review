// emit-stdout.mjs — deterministic implementation of FSM state Step 11.
//
// Inputs (from env):
//   - run_dir_path : string (path written by Step 10 / write-run-directory)
//   - args         : the orchestrator's arg bag (carries `--format` if any)
//
// Outputs: none (FSM-side `outputs: []`). Side effect: prints the report
// payload to stdout in the requested format and a manifest pointer at the end
// so callers can chase the artefacts on disk.
//
// Format selection: `--format` ∈ {markdown (default), json, yaml}. We keep
// YAML behind a YAML lib check rather than introducing a runtime dep — when
// no YAML serializer is available we fall back to JSON with a one-line
// notice so the run isn't surprised.

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const VALID_FORMATS = new Set(["markdown", "json", "yaml"]);

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
    process.stdout.write(
      "(emit_stdout: no run_dir_path in env — Step 10 may have been skipped)\n",
    );
    return {};
  }

  const argsBag = env.args ?? {};
  const format = resolveFormat(argsBag);
  const body = readReport(runDirPath, format);
  if (body === null) {
    process.stdout.write(
      `(emit_stdout: report file for format=${format} not found under ${runDirPath})\n`,
    );
    return {};
  }

  if (format === "yaml") {
    process.stdout.write(
      "(emit_stdout: yaml format requested; YAML serializer not bundled — falling back to json)\n",
    );
  }

  process.stdout.write(body);
  if (!body.endsWith("\n")) process.stdout.write("\n");
  process.stdout.write(`# manifest: ${join(runDirPath, "manifest.json")}\n`);
  return {};
}
