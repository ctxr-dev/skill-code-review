// minimatch-shim.mjs — minimal glob matcher used by activation-gate.mjs.
//
// Avoids pulling in the npm `minimatch` package for one helper. Supports the
// subset of glob syntax the corpus uses in `activation.file_globs`:
//
//   *        — any chars within a single path segment (excludes /)
//   **       — any number of path segments (zero or more, including /)
//   ?        — single character within a segment
//   {a,b,c}  — alternation
//
// Anchored to full path; case-sensitive (matches POSIX semantics).

function escapeRegex(s) {
  return s.replace(/[.+^$()|[\]\\]/g, "\\$&");
}

function compileGlob(glob) {
  let regex = "";
  let i = 0;
  while (i < glob.length) {
    const ch = glob[i];
    // **/ — match zero or more path segments (including the trailing /).
    if (ch === "*" && glob[i + 1] === "*" && glob[i + 2] === "/") {
      regex += "(?:.*/)?";
      i += 3;
      continue;
    }
    // ** at end — match anything (including no chars and any path segments).
    if (ch === "*" && glob[i + 1] === "*") {
      regex += ".*";
      i += 2;
      continue;
    }
    if (ch === "*") {
      regex += "[^/]*";
      i++;
      continue;
    }
    if (ch === "?") {
      regex += "[^/]";
      i++;
      continue;
    }
    if (ch === "{") {
      const close = glob.indexOf("}", i);
      if (close === -1) {
        regex += escapeRegex(ch);
        i++;
        continue;
      }
      const choices = glob.slice(i + 1, close).split(",");
      regex += "(?:" + choices.map(escapeRegex).join("|") + ")";
      i = close + 1;
      continue;
    }
    regex += escapeRegex(ch);
    i++;
  }
  return new RegExp("^" + regex + "$");
}

const cache = new Map();

export function minimatch(path, glob) {
  if (!cache.has(glob)) {
    cache.set(glob, compileGlob(glob));
  }
  return cache.get(glob).test(path);
}
