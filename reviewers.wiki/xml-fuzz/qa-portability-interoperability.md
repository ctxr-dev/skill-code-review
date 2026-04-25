---
id: qa-portability-interoperability
type: primary
depth_role: leaf
focus: "Detect OS-specific code without abstraction, hardcoded paths, platform-specific APIs without fallback, missing charset/encoding handling, and byte-order assumptions that hinder portability and interoperability"
parents:
  - index.md
covers:
  - OS-specific system calls without cross-platform abstraction layer
  - Hardcoded file paths using OS-specific separators or absolute locations
  - "Platform-specific APIs (Win32, macOS-only, Linux-only) without fallback"
  - "Missing cross-platform CI matrix (only testing on one OS)"
  - "Missing charset or encoding declaration when reading/writing text"
  - Byte-order assumptions when parsing binary data
  - "Line-ending assumptions (CRLF vs LF) in text processing"
  - "Locale-dependent string operations (sorting, case conversion) without explicit locale"
  - "Architecture-specific assumptions (pointer size, integer width, alignment)"
  - Platform-specific path length limits not handled
tags:
  - portability
  - interoperability
  - cross-platform
  - encoding
  - charset
  - endianness
  - paths
  - locale
  - os-specific
activation:
  file_globs:
    - "**/*"
    - "**/Dockerfile"
    - "**/.github/workflows/*"
    - "**/Makefile"
    - "**/*.sh"
    - "**/*.bat"
    - "**/*.ps1"
  keyword_matches:
    - os.path
    - path.join
    - "Path("
    - "/tmp"
    - "C:\\"
    - "/usr"
    - "/home"
    - platform
    - sys.platform
    - process.platform
    - runtime.GOOS
    - encoding
    - charset
    - utf-8
    - endian
    - byteorder
    - locale
  structural_signals:
    - Hardcoded path string in source code
    - Platform-conditional compilation block
    - Binary data parsing or serialization
source:
  origin: file
  path: qa-portability-interoperability.md
  hash: "sha256:57ed331c64b54fb3376d09d5e3429feb2afca57fcacccd94ceacb39c93e5fa30"
---
# Portability and Interoperability

## When This Activates

Activates when diffs contain file path manipulation, binary data handling, text encoding operations, platform-specific API calls, CI/CD configuration, or shell command invocations. Portability ensures code runs correctly across operating systems, architectures, and locales. Interoperability ensures data produced by one system is correctly consumed by another. Failures in either area produce bugs that only manifest in specific environments, making them expensive to diagnose and fix.

## Audit Surface

- [ ] Hardcoded path separator (backslash or forward slash) instead of path.join or equivalent
- [ ] Hardcoded absolute path (/usr/local, C:\\Program Files, /tmp, /home)
- [ ] Direct use of platform-specific API without conditional or abstraction
- [ ] Text file read/write without explicit encoding parameter
- [ ] Binary data parsed with assumed endianness and no byte-order check
- [ ] Line ending assumed as \n or \r\n without normalization
- [ ] String comparison or sorting without explicit locale
- [ ] CI/CD pipeline testing only one OS
- [ ] Shell command invoked with OS-specific syntax (cmd.exe vs /bin/sh)
- [ ] Environment variable access assuming OS-specific conventions
- [ ] File permission operations using POSIX-only or Windows-only APIs
- [ ] Integer size assumed (e.g., int is 32-bit) without explicit width types
- [ ] Temp directory accessed via hardcoded path instead of runtime API

## Detailed Checks

### File Path Handling
<!-- activation: keywords=["path", "os.path", "Path(", "join", "separator", "/tmp", "C:\\", "/usr", "/home", "file", "directory", "mkdir", "open("] -->

- [ ] **Hardcoded separators**: flag string concatenation using `/` or `\\` to build paths -- use `os.path.join`, `path.join`, `Path`, `filepath.Join`, or equivalent platform-agnostic API
- [ ] **Hardcoded absolute paths**: flag references to `/tmp`, `/usr/local`, `/home`, `C:\Program Files`, or `~` resolved as string -- use `tempfile.mkdtemp`, `os.tmpdir()`, `env.TEMP`, or equivalent runtime API
- [ ] **Path length assumptions**: flag paths that may exceed 260 characters on Windows -- use long-path APIs or verify `\\?\` prefix handling on Windows builds
- [ ] **Case sensitivity assumptions**: flag path comparisons using case-sensitive string equality -- macOS (APFS default) and Windows (NTFS) are case-insensitive; Linux (ext4) is case-sensitive

### Encoding and Character Sets
<!-- activation: keywords=["encoding", "charset", "utf", "ascii", "latin", "decode", "encode", "open(", "read", "write", "bytes", "str(", "string("] -->

- [ ] **Missing encoding on file I/O**: flag file open/read/write calls without explicit encoding parameter -- Python 2/3 default encoding differs; Java `FileReader` uses platform default; always specify UTF-8 explicitly
- [ ] **Implicit string-to-bytes conversion**: flag code that converts strings to bytes (or vice versa) without specifying encoding -- implicit conversion uses platform default encoding, causing silent corruption
- [ ] **Byte-order mark (BOM) handling**: flag UTF-8 file reads that do not handle BOM (`\xEF\xBB\xBF`) -- Windows tools often prepend BOM; parsers must strip or tolerate it
- [ ] **Line ending normalization**: flag text processing that assumes `\n` line endings -- files from Windows use `\r\n`; use universal newline mode or normalize on read

### Binary Data and Byte Order
<!-- activation: keywords=["binary", "bytes", "struct", "pack", "unpack", "endian", "byteorder", "little", "big", "ntohl", "htonl", "DataView", "Buffer"] -->

- [ ] **Assumed endianness**: flag binary struct packing/unpacking without explicit byte-order specifier -- use network byte order (big-endian) for wire protocols or document the endianness convention
- [ ] **Integer width assumptions**: flag code that assumes `int` is 32 bits or `long` is 64 bits -- use fixed-width types (`int32_t`, `uint64`, `i32`) for portable binary formats
- [ ] **Alignment assumptions**: flag struct layouts that assume specific padding or alignment -- different compilers and architectures pad differently; use packed structs or explicit serialization for wire formats

### Platform-Specific API Usage
<!-- activation: keywords=["platform", "os", "sys.platform", "process.platform", "runtime.GOOS", "ifdef", "#if", "cfg(", "win32", "posix", "darwin", "linux"] -->

- [ ] **OS-specific API without abstraction**: flag direct use of Win32, POSIX-only, or macOS-only APIs in shared code -- wrap behind a platform-agnostic interface or use conditional compilation with a fallback
- [ ] **Shell command assumptions**: flag subprocess calls using shell syntax specific to one OS (e.g., `cmd /c` vs `/bin/sh -c`, `ls` vs `dir`) -- use language-native APIs or provide OS-specific command selection
- [ ] **Environment variable conventions**: flag assumptions about environment variable names (`HOME` vs `USERPROFILE`, `PATH` separator `:` vs `;`) -- use runtime APIs that abstract OS differences

### CI and Cross-Platform Testing
<!-- activation: keywords=["ci", "github", "actions", "workflow", "matrix", "runs-on", "ubuntu", "windows", "macos", "pipeline", "build"] -->

- [ ] **Single-OS CI**: flag CI/CD pipelines that test on only one operating system when the software targets multiple platforms -- add a build matrix covering at minimum Linux and the primary target OS
- [ ] **Missing architecture coverage**: flag CI that tests only x86_64 when the software targets ARM (Apple Silicon, AWS Graviton, mobile) -- add arm64 to the build matrix

## Common False Positives

- **Container-only deployment**: code that runs exclusively in Linux containers may legitimately use POSIX-only APIs -- flag only if the Dockerfile or deployment target is ambiguous.
- **Language-managed encoding**: languages like Go (UTF-8 by default) and Rust (strings are always UTF-8) handle encoding at the language level -- missing explicit encoding parameters are not a concern.
- **Test fixtures with hardcoded paths**: test files using `/tmp/test-data` in a Linux-only CI pipeline are acceptable if the pipeline is not intended to run on other platforms.
- **Platform-specific modules**: code in a directory explicitly named `win/`, `darwin/`, or `linux/` is expected to use platform-specific APIs.

## Severity Guidance

| Finding | Severity |
|---|---|
| Binary protocol parsed with assumed endianness, no byte-order handling | Critical |
| Text file I/O with no encoding, deployed cross-platform | Important |
| Hardcoded absolute path in production code | Important |
| OS-specific API in shared code without fallback | Important |
| Line ending assumption causing data corruption | Important |
| CI testing only one OS for multi-platform software | Minor |
| Missing explicit locale in string sorting | Minor |
| Hardcoded /tmp in code that only runs in Linux containers | Minor |

## See Also

- `principle-encapsulation` -- platform-specific logic should be encapsulated behind abstraction layers
- `principle-separation-of-concerns` -- separate platform adaptation from business logic

## Authoritative References

- [Joel Spolsky, "The Absolute Minimum Every Developer Must Know About Unicode and Character Sets"](https://www.joelonsoftware.com/2003/10/08/the-absolute-minimum-every-software-developer-absolutely-positively-must-know-about-unicode-and-character-sets-no-excuses/)
- [Python Documentation, "Unicode HOWTO"](https://docs.python.org/3/howto/unicode.html)
- [ISO/IEC 25010:2023 -- Portability and compatibility quality attributes](https://www.iso.org/standard/78176.html)
- [The Open Group, POSIX.1-2024 -- portable operating system interface](https://pubs.opengroup.org/onlinepubs/9799919799/)
