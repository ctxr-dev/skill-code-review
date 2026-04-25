---
id: sec-path-traversal-and-file-uploads
type: primary
depth_role: leaf
focus: Detect path traversal vulnerabilities and insecure file upload handling that enable unauthorized file access, code execution, or denial of service
parents:
  - index.md
covers:
  - "User input in file paths without sanitization allowing ../ traversal"
  - File extension validation performed on client side only
  - Uploaded files stored with original user-supplied filename
  - "File uploads served without Content-Disposition: attachment header"
  - Uploaded files stored within the web root enabling direct execution
  - Missing file size limits enabling denial of service via disk exhaustion
  - "MIME type sniffing not prevented with X-Content-Type-Options: nosniff"
  - "ZIP/archive extraction without path validation (zip slip vulnerability)"
  - Symlink following in file operations enabling escape from intended directory
  - Executable file types uploadable without restriction
  - Path canonicalization bypass via encoding, null bytes, or OS-specific tricks
  - Temporary file creation with predictable names enabling race conditions
tags:
  - path-traversal
  - directory-traversal
  - file-upload
  - zip-slip
  - symlink
  - LFI
  - RFI
  - CWE-22
  - CWE-434
  - CWE-73
activation:
  file_globs:
    - "**/*upload*"
    - "**/*download*"
    - "**/*file*"
    - "**/*storage*"
    - "**/*static*"
    - "**/*media*"
    - "**/*attachment*"
    - "**/*asset*"
    - "**/*serve*"
    - "**/*multer*"
    - "**/*formidable*"
    - "**/*busboy*"
    - "**/*multipart*"
  keyword_matches:
    - path
    - file
    - upload
    - download
    - filename
    - filepath
    - directory
    - mkdir
    - open
    - read
    - write
    - unzip
    - extract
    - archive
    - zip
    - tar
    - sendFile
    - serveFile
    - static
    - multer
    - formidable
    - busboy
    - multipart
    - realpath
    - canonicalize
    - basename
    - dirname
    - Path.join
    - os.path.join
    - path.resolve
    - createReadStream
    - createWriteStream
    - readFileSync
    - writeFileSync
    - Content-Disposition
    - originalname
    - originalFilename
  structural_signals:
    - File path built from user input concatenation
    - File system operation with request-derived path
    - Multipart form handling or file upload middleware
    - Archive extraction function call
    - Static file serving with dynamic path
    - File download endpoint with path parameter
source:
  origin: file
  path: sec-path-traversal-and-file-uploads.md
  hash: "sha256:1b6e82e1ffecd17b1cc63657a0d9f26dc7246f9b68f30a5fbc947409885c39ee"
---
# Path Traversal and Insecure File Upload Handling

## When This Activates

Activates when diffs contain file system operations (read, write, delete, mkdir), file path construction from user input, file upload handlers, archive extraction, static file serving, or file download endpoints. Path traversal (directory traversal) allows attackers to access files outside the intended directory by injecting `../` sequences or equivalent encodings. Insecure file upload allows attackers to upload malicious files that are then executed, served to other users, or used to overwrite critical files. Both vulnerability classes are pervasive because file operations are fundamental to web applications, and the attack surface grows with every endpoint that touches the file system.

**Primary CWEs**: CWE-22 (Improper Limitation of a Pathname to a Restricted Directory), CWE-434 (Unrestricted Upload of File with Dangerous Type), CWE-73 (External Control of File Name or Path).

## Audit Surface

- [ ] File path constructed by concatenating user input (query params, form fields, headers) with a base directory
- [ ] Path.join(), os.path.join(), or path.resolve() with user-controlled segments without post-join canonicalization check
- [ ] File read/write/delete operation where the filename comes from request parameters
- [ ] File download endpoint using user-supplied filename or path parameter
- [ ] File upload handler storing files with the original client-provided filename
- [ ] Upload directory located inside the web root or public static directory
- [ ] Missing or client-only file extension validation on upload
- [ ] Missing Content-Disposition: attachment on file download/serve responses
- [ ] Missing X-Content-Type-Options: nosniff on file serve responses
- [ ] No file size limit on upload endpoint (multipart or streaming)
- [ ] ZIP/tar/archive extraction without validating extracted file paths for traversal
- [ ] Archive extraction without checking for symlinks pointing outside target directory
- [ ] File operations following symlinks without O_NOFOLLOW or equivalent
- [ ] Temporary file created in shared directory with predictable name
- [ ] File path containing null byte (%00) not rejected before file system operation
- [ ] sendFile, serveFile, or static file middleware with user-controlled path component
- [ ] mkdir/rmdir with user-controlled path without canonicalization
- [ ] File rename or move operation where destination path is user-controlled
- [ ] Image processing library (ImageMagick, PIL, Sharp) processing uploaded file without type verification

## Detailed Checks

### Path Traversal via User Input (CWE-22)
<!-- activation: keywords=["path", "file", "filename", "filepath", "open(", "readFile", "writeFile", "readFileSync", "writeFileSync", "createReadStream", "os.path.join", "Path.join", "path.resolve", "Paths.get", "File(", "fopen", "file_get_contents", "sendFile", "send_file", "download("] -->

- [ ] **Direct path concatenation**: flag `basePath + "/" + userInput`, `basePath + userInput`, `File(basePath, userInput)` where `userInput` comes from request parameters -- `../` sequences traverse out of the base directory. The attacker can read `../../../../etc/passwd` or any file the process can access
- [ ] **Path.join without canonicalization check**: flag `os.path.join(BASE_DIR, user_filename)` (Python), `path.join(baseDir, userFilename)` (Node.js), `Paths.get(baseDir, userPath)` (Java) without subsequently verifying the resolved path starts with the base directory -- `path.join("/uploads", "../etc/passwd")` resolves to `/etc/passwd`. After joining, call `os.path.realpath()` or `path.resolve()` and verify the result starts with the expected base
- [ ] **Missing starts-with check after canonicalization**: flag code that canonicalizes the path (`realpath`, `resolve`, `getCanonicalPath`) but does not compare the result against the allowed base directory -- canonicalization alone does not prevent traversal; it only normalizes the path for comparison
- [ ] **Null byte injection**: flag file path handling that does not reject null bytes (`%00`, `\x00`) in filenames -- in languages/runtimes where C libraries handle file I/O, a null byte truncates the path, allowing `malicious.php%00.jpg` to bypass extension checks while the OS opens `malicious.php`
- [ ] **URL-encoded traversal sequences**: flag path handling that decodes URL encoding before validation but not before file system access (or vice versa) -- `%2e%2e%2f` decodes to `../` and may bypass naive string checks. Double-encoding (`%252e%252e%252f`) bypasses single-decode filters
- [ ] **Windows-specific traversal**: flag applications running on Windows that do not normalize backslashes (`..\\`), drive letters (`C:\`), UNC paths (`\\server\share`), or alternate data streams (`file.txt::$DATA`) in user-controlled paths -- Windows path semantics differ from Unix and many traversal filters miss these

### File Upload Security (CWE-434)
<!-- activation: keywords=["upload", "multer", "formidable", "busboy", "multipart", "originalname", "originalFilename", "content-type", "Content-Type", "extension", "mimetype", "enctype", "form-data", "file.name", "file.type", "file.size"] -->

- [ ] **Original filename used for storage**: flag `fs.writeFile(uploadDir + file.originalname, ...)` or any pattern where the uploaded file is stored using the client-supplied filename -- attackers control the filename and can include path traversal sequences, overwrite existing files, or use dangerous extensions. Generate a random filename server-side (UUID) and store the original name in metadata
- [ ] **Extension validation on client side only**: flag file type validation that checks the file extension only in JavaScript before upload without server-side revalidation -- client-side checks are trivially bypassed by modifying the request
- [ ] **MIME type trusted from Content-Type header**: flag upload handlers that validate file type based solely on the `Content-Type` header from the multipart upload -- this header is client-controlled. Validate the file content (magic bytes / file signature) on the server
- [ ] **Upload directory inside web root**: flag configurations where uploaded files are saved to a directory served by the web server (e.g., `public/uploads/`, `static/files/`, `wwwroot/uploads/`) -- if the web server maps the directory to URLs and executes scripts, an uploaded `.php`, `.jsp`, `.aspx`, or `.py` file becomes a web shell
- [ ] **Missing file size limit**: flag upload endpoints without `maxFileSize`, `limits.fileSize`, or equivalent configuration -- unlimited uploads enable denial of service via disk exhaustion. Set explicit limits at both the application and web server/proxy level
- [ ] **Executable extensions allowed**: flag upload handlers that do not block dangerous extensions (`.php`, `.jsp`, `.aspx`, `.py`, `.rb`, `.sh`, `.bat`, `.exe`, `.dll`, `.so`, `.html`, `.svg`, `.xml`) -- even outside the web root, these files may be processed by other system components

### File Serving and Download Security
<!-- activation: keywords=["sendFile", "serveFile", "send_file", "download", "Content-Disposition", "attachment", "inline", "X-Content-Type-Options", "nosniff", "static", "express.static", "serve_static", "StaticFiles"] -->

- [ ] **sendFile with user-controlled path**: flag `res.sendFile(path.join(baseDir, req.params.filename))` or `send_file(os.path.join(base_dir, filename))` without traversal checks -- even with `path.join`, the joined path can escape the base directory
- [ ] **Missing Content-Disposition on downloads**: flag file download endpoints that do not set `Content-Disposition: attachment; filename="safe_name"` -- without this header, browsers may render the file inline, enabling XSS if the file contains HTML or SVG
- [ ] **Missing X-Content-Type-Options: nosniff**: flag file serve responses that do not include `X-Content-Type-Options: nosniff` -- without this header, browsers may MIME-sniff the response and interpret an uploaded file as HTML or JavaScript regardless of the Content-Type
- [ ] **Static file middleware with user path prefix**: flag configurations like `app.use('/files', express.static(userControlledDir))` or any static file serving where the base directory is influenced by user input
- [ ] **Reflected filename in Content-Disposition**: flag `Content-Disposition: attachment; filename="` + userInput + `"` -- a filename containing `"` or newlines can inject headers (response splitting) or confuse download dialogs

### ZIP Slip and Archive Extraction (CWE-22)
<!-- activation: keywords=["unzip", "extract", "extractall", "ZipFile", "ZipInputStream", "TarFile", "tar", "archive", "ZipEntry", "getEntry", "getName", "extractTo", "decompress", "gunzip", "7z", "rar"] -->

- [ ] **ZIP extraction without path validation**: flag `ZipFile.extractall()` (Python), `ZipInputStream` entry processing (Java), or any archive extraction that does not validate each entry's filename for `../` sequences -- the zip slip vulnerability allows a malicious archive to write files outside the extraction directory by including entries with names like `../../../etc/cron.d/malicious`
- [ ] **Java ZipEntry.getName() not validated**: flag `zipEntry.getName()` used to construct an output path without checking that the resolved path starts with the intended extraction directory -- the canonical Java zip slip fix is: `File destFile = new File(destDir, entry.getName()); if (!destFile.getCanonicalPath().startsWith(destDir.getCanonicalPath() + File.separator)) throw ...`
- [ ] **Tar extraction with symlinks**: flag `tarfile.extractall()` (Python) or tar extraction that does not check for symlink entries -- a malicious tarball can include a symlink pointing to `/etc/` followed by a regular file entry that writes through the symlink. Python 3.12+ provides `tarfile.data_filter` for safe extraction
- [ ] **Archive extraction without size limits**: flag archive extraction that does not check the uncompressed size of entries -- a zip bomb (e.g., 42.zip) can extract to petabytes of data from a small archive. Check cumulative extracted size and individual entry size before writing
- [ ] **Nested archives**: flag code that recursively extracts archives within archives without depth limits -- attackers can nest zip bombs to amplify the effect

### Symlink and Race Condition Attacks
<!-- activation: keywords=["symlink", "link", "lstat", "readlink", "O_NOFOLLOW", "followLinks", "realpath", "tmpfile", "tempfile", "mktemp", "tmpnam", "tempnam", "race", "TOCTOU"] -->

- [ ] **Following symlinks in file operations**: flag file read/write/delete operations that follow symlinks without checking (no `O_NOFOLLOW` flag, no `lstat` before operation) when the file path includes any user-controlled component -- an attacker who can create symlinks in the target directory can redirect file operations to arbitrary locations
- [ ] **TOCTOU race in file operations**: flag check-then-act patterns like `if os.path.exists(path): os.remove(path)` or `if not os.path.islink(path): open(path)` -- between the check and the action, an attacker can replace the file with a symlink (time-of-check to time-of-use race condition). Use atomic operations or open with `O_NOFOLLOW`
- [ ] **Predictable temporary file names**: flag `tempnam()`, `tmpnam()`, `mktemp()` (deprecated) or manual temp file naming with predictable patterns -- attackers can predict the filename and pre-create a symlink at that path. Use `mkstemp()`, `tempfile.NamedTemporaryFile()`, or `os.CreateTemp()` which atomically create the file

### Image and Document Processing
<!-- activation: keywords=["ImageMagick", "convert", "identify", "Sharp", "sharp", "PIL", "Pillow", "Image.open", "gm(", "GraphicsMagick", "ffmpeg", "libvips", "exiftool", "metadata"] -->

- [ ] **ImageMagick on untrusted uploads**: flag ImageMagick (`convert`, `identify`, `mogrify`) processing user-uploaded files without a restrictive policy.xml -- ImageMagick has a history of RCE vulnerabilities (ImageTragick CVE-2016-3714) and supports delegates that execute shell commands. Disable dangerous coders (MVG, MSL, EPHEMERAL, URL, HTTPS) in policy.xml
- [ ] **Image library without format verification**: flag image processing (PIL/Pillow, Sharp, libvips) that does not verify the actual image format matches the expected type -- a file with a `.jpg` extension may contain SVG (XML), EPS (PostScript), or PDF content that triggers parser vulnerabilities
- [ ] **EXIF/metadata not stripped**: flag image upload pipelines that do not strip EXIF metadata before serving -- EXIF data can contain GPS coordinates, device information, and injected HTML/JavaScript that some viewers render

## Common False Positives

- **Path construction with compile-time constants**: `path.join(BASE_DIR, "config", "settings.json")` where all segments are hardcoded string literals is safe. Flag only when at least one segment derives from user input.
- **Internal file operations not reachable from user input**: background jobs, migrations, or CLI tools that perform file operations with internally-generated paths are not vulnerable to external traversal. Verify no request parameter or user data influences the path.
- **Framework-provided static file middleware**: Express.js `express.static()`, Django `WhiteNoise`, and similar static file middleware typically include traversal protection when the root directory is a static string. Flag only when the root path is user-influenced or when the framework version has known bypass vulnerabilities.
- **Cloud storage (S3, GCS, Azure Blob)**: file operations that use cloud storage APIs with user-controlled keys are not local path traversal but may still enable unauthorized access to other users' files. Flag with a note about access control rather than path traversal.
- **File upload to separate storage service**: uploads that go directly to S3, GCS, or Azure Blob Storage via presigned URLs bypass the application file system entirely. Local path traversal does not apply, but the presigned URL generation should still be reviewed.

## Severity Guidance

| Finding | Severity |
|---|---|
| File read with user-controlled path and no traversal protection | Critical |
| File write/delete with user-controlled path and no canonicalization | Critical |
| File upload stored with original filename inside web root (web shell risk) | Critical |
| ZIP/tar extraction without path validation (zip slip) | Critical |
| ImageMagick processing untrusted uploads without restrictive policy | Critical |
| sendFile or file download with user-controlled path without starts-with check | Important |
| File upload without server-side extension/type validation | Important |
| Missing Content-Disposition: attachment on user-uploaded file serving | Important |
| Archive extraction without symlink checking | Important |
| Upload endpoint without file size limit | Important |
| Symlink following in file operations with user-influenced paths | Important |
| Missing X-Content-Type-Options: nosniff on file serve responses | Minor |
| Predictable temporary file name in shared directory | Minor |
| EXIF metadata not stripped from served user images | Minor |
| Client-only extension validation without server revalidation | Minor |

## See Also

- `sec-owasp-a01-broken-access-control` -- path traversal is a form of broken access control where the file system is the protected resource
- `sec-owasp-a03-injection` -- path traversal can be viewed as injection into the file system path interpreter
- `sec-owasp-a05-misconfiguration` -- insecure upload directory configuration and missing security headers are misconfigurations
- `principle-fail-fast` -- reject invalid paths and file types at the boundary before any file system operation
- `principle-encapsulation` -- file operations should be behind an abstraction that enforces path restrictions

## Authoritative References

- [CWE-22: Improper Limitation of a Pathname to a Restricted Directory (Path Traversal)](https://cwe.mitre.org/data/definitions/22.html)
- [CWE-434: Unrestricted Upload of File with Dangerous Type](https://cwe.mitre.org/data/definitions/434.html)
- [CWE-73: External Control of File Name or Path](https://cwe.mitre.org/data/definitions/73.html)
- [OWASP Path Traversal](https://owasp.org/www-community/attacks/Path_Traversal)
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)
- [Snyk: Zip Slip Vulnerability](https://security.snyk.io/research/zip-slip-vulnerability)
- [PortSwigger: Path Traversal](https://portswigger.net/web-security/file-path-traversal)
- [PortSwigger: File Upload Vulnerabilities](https://portswigger.net/web-security/file-upload)
- [ImageTragick (CVE-2016-3714)](https://imagetragick.com/)
