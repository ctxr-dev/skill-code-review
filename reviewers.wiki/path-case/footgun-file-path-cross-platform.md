---
id: footgun-file-path-cross-platform
type: primary
depth_role: leaf
focus: Detect hardcoded path separators, case sensitivity assumptions, path length limits, symlink traversal, and null bytes in file paths
parents:
  - index.md
covers:
  - "Hardcoded / or \\ path separator instead of platform-aware join"
  - "Case sensitivity assumption: macOS HFS+ is case-insensitive, Linux ext4 is case-sensitive"
  - "Path length exceeding Windows MAX_PATH (260 chars) without long path prefix"
  - Symlink resolution allowing traversal outside intended directory
  - "Null byte in path causing C-layer truncation (path injection)"
  - Whitespace or special characters in path not quoted or escaped
  - "Path encoding assumption: Windows uses UTF-16, Unix uses bytes (often UTF-8)"
  - Relative path resolved against unexpected working directory
  - Trailing dot or space in filename valid on Unix but stripped on Windows
tags:
  - file-path
  - cross-platform
  - symlink
  - path-traversal
  - null-byte
  - CWE-22
  - CWE-426
  - CWE-61
activation:
  file_globs:
    - "**/*.{c,h,cpp,hpp,java,kt,py,rb,go,rs,js,ts,cs,swift}"
  keyword_matches:
    - path
    - Path
    - filepath
    - dirname
    - basename
    - join
    - os.path
    - path.join
    - Path.Combine
    - realpath
    - resolve
    - normalize
    - symlink
    - readlink
    - mkdir
    - mkdirs
    - fopen
    - open
    - createReadStream
    - createWriteStream
    - File
    - tempfile
    - tmpdir
  structural_signals:
    - File path construction from string concatenation
    - Path from user input passed to filesystem API
    - Cross-platform code handling file paths
source:
  origin: file
  path: footgun-file-path-cross-platform.md
  hash: "sha256:4d2e2061b60f27c56895a45e52e4d3e317c88529a8160f4979e8c7e25188d956"
---
# File Path Cross-Platform Footguns

## When This Activates

Activates when diffs construct file paths, handle user-supplied filenames, perform path comparisons, or interact with the filesystem in code intended to run on multiple platforms. File paths are deceptively non-portable: separator character, case sensitivity, maximum length, allowed characters, encoding, and symlink behavior all differ across operating systems. User-controlled paths add security risks: path traversal (../../etc/passwd), null byte injection (truncating the path at the C layer), and symlink attacks that redirect file operations outside the intended directory.

## Audit Surface

- [ ] String concatenation with / or \\ to build file paths
- [ ] Path comparison using == without normalizing case or separators
- [ ] File path from user input without canonicalization or jail check
- [ ] Path length not validated before filesystem operations
- [ ] Symlink followed without realpath check
- [ ] Null byte in filename not rejected before passing to file API
- [ ] Path with spaces not quoted for shell execution
- [ ] Relative path resolved with working directory assumption
- [ ] Filename with trailing dot or space (Unix vs Windows difference)
- [ ] File path in shell command via string interpolation
- [ ] Path.join called with absolute path as non-first argument
- [ ] Temp file in world-writable directory without O_EXCL

## Detailed Checks

### Hardcoded Separators and Path Construction
<!-- activation: keywords=["join", "path", "Path", "os.path", "filepath", "separator", "/", "\\", "concat", "+"] -->

- [ ] **String concatenation for paths**: flag `dir + "/" + filename` or `dir + "\\" + filename`. Use `os.path.join()` (Python), `path.join()` (Node.js), `Path.Combine()` (C#), `filepath.Join()` (Go), `Path.resolve()` (Java NIO). Platform-aware join handles separators, trailing slashes, and drive letters
- [ ] **Hardcoded / in Windows code path**: forward slash works in most Windows APIs but fails in command-line arguments, batch scripts, and some third-party tools. Flag if the code must work on Windows
- [ ] **path.join with absolute second argument**: `path.join("/base", userInput)` where `userInput` is `/etc/passwd` -- in Node.js, `path.join` does not resolve to base; it produces `/etc/passwd`. Use `path.resolve()` and then verify the result starts with the base directory
- [ ] **Path normalization not applied**: `../` sequences in a path bypass prefix checks. `"/uploads/../etc/passwd"` starts with `"/uploads/"` but resolves elsewhere. Always canonicalize with `realpath()` or `Path.normalize()` before checking containment

### Case Sensitivity and Comparison
<!-- activation: keywords=["case", "compare", "equals", "==", "sensitive", "insensitive", "HFS", "NTFS", "ext4", "normalize"] -->

- [ ] **Path equality without case normalization**: `pathA == pathB` may be wrong on case-insensitive filesystems (Windows NTFS, macOS HFS+/APFS default). `"/Users/App"` and `"/users/app"` refer to the same file on macOS but different files on Linux. Flag path comparison without documenting the case sensitivity assumption
- [ ] **Case-preserving but case-insensitive**: macOS preserves the case of the original creation but matches case-insensitively. Code that creates `"Config.json"` but opens `"config.json"` works on macOS but fails on Linux
- [ ] **Git case sensitivity**: Git is case-sensitive by default. Renaming `File.txt` to `file.txt` on macOS may not register as a change, causing CI/CD failures on Linux

### Path Length and Special Characters
<!-- activation: keywords=["MAX_PATH", "260", "long path", "\\\\?\\", "special", "space", "whitespace", "quote", "escape", "unicode"] -->

- [ ] **Windows MAX_PATH limit**: Windows limits paths to 260 characters by default. Deeply nested directories or long filenames silently fail. Flag code that constructs paths without length validation when targeting Windows. Use `\\?\` prefix for extended-length paths (up to 32,767 chars)
- [ ] **Spaces in paths**: flag paths passed to `exec()`, `system()`, or shell commands without quoting. `/path/to/my file.txt` is interpreted as two arguments. Use array-form exec or proper escaping
- [ ] **Trailing dot or space**: Windows silently strips trailing dots and spaces from filenames. `"file.txt."` becomes `"file.txt"`. A file created on Unix with trailing dot cannot be accessed with the same name on Windows

### Symlink and TOCTOU (CWE-61, CWE-22)
<!-- activation: keywords=["symlink", "readlink", "realpath", "resolve", "follow", "link", "junction", "traversal", "../", "..\\"] -->

- [ ] **Symlink traversal escape**: flag code that writes to a user-specified path without resolving symlinks first. An attacker creating a symlink `uploads/evil -> /etc/` redirects writes outside the intended directory. Resolve with `realpath()` then verify the canonical path is within the allowed directory
- [ ] **Path traversal via ../**: flag user-supplied filenames passed to file operations without stripping or rejecting `..` components. Even after joining with a base directory, `../` can escape: `path.join("/uploads", "../../etc/passwd")` = `"/etc/passwd"`
- [ ] **Temp file race (CWE-377)**: flag `open(tempdir + "/" + predictable_name)` in world-writable directories. An attacker can pre-create a symlink with that name. Use `mkstemp()`, `tempfile.NamedTemporaryFile()`, or `O_CREAT | O_EXCL` for atomic creation

### Null Bytes and Encoding
<!-- activation: keywords=["null", "\\0", "\\x00", "byte", "encoding", "UTF-16", "UTF-8", "bytes", "encode", "decode"] -->

- [ ] **Null byte injection**: in languages that pass paths to C-layer syscalls, a null byte in user input truncates the path. `open("/uploads/" + userInput + ".txt")` where userInput is `"evil\x00"` opens `/uploads/evil` instead of `/uploads/evil.txt`. Flag user-supplied paths without null byte rejection. Modern Python 3.x and Node.js reject null bytes, but older versions and C do not
- [ ] **Path encoding mismatch**: Unix paths are byte sequences (conventionally UTF-8). Windows uses UTF-16 internally. Flag code that assumes paths are valid UTF-8 on Unix without handling `surrogateescape` (Python) or invalid byte sequences

## Common False Positives

- **Single-platform code**: code explicitly targeting only one OS (Docker container always Linux, iOS app always macOS) has lower cross-platform risk. Still flag security issues (path traversal, symlinks).
- **Path constants for known directories**: hardcoded paths like `/dev/null`, `/tmp`, or `C:\Windows` are platform-specific by design.
- **URL paths**: URL paths always use `/` and are not filesystem paths. Do not flag `/api/v1/users`.
- **Build tool configuration**: build scripts often use platform-specific paths within platform-specific blocks.

## Severity Guidance

| Finding | Severity |
|---|---|
| Path traversal via user input without canonicalization (CWE-22) | Critical |
| Null byte in user-supplied path not rejected | Critical |
| Symlink escape allowing write outside intended directory | Critical |
| User-supplied path passed to shell command without quoting | Important |
| Temp file creation without O_EXCL in shared directory | Important |
| Hardcoded separator in cross-platform library code | Minor |
| Path comparison without case normalization | Minor |
| Path length not validated for Windows compatibility | Minor |

## See Also

- `footgun-toctou-race` -- file existence check then open is a TOCTOU race
- `sec-owasp-a03-injection` -- path traversal is a form of injection
- `conc-race-conditions-data-races` -- symlink race is a TOCTOU data race
- `footgun-encoding-unicode-normalization` -- path encoding mismatches

## Authoritative References

- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-61: UNIX Symbolic Link Following](https://cwe.mitre.org/data/definitions/61.html)
- [OWASP: Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [Microsoft: Maximum Path Length Limitation](https://learn.microsoft.com/en-us/windows/win32/fileio/maximum-file-path-limitation)
- [Python pathlib documentation](https://docs.python.org/3/library/pathlib.html)
