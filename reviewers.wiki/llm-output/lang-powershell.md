---
id: lang-powershell
type: primary
depth_role: leaf
focus: Catch pipeline errors, security anti-patterns, and non-idiomatic patterns in PowerShell code
parents:
  - index.md
covers:
  - Strict mode enforcement — Set-StrictMode -Version Latest
  - Pipeline discipline — unintended output, return value pollution
  - ErrorAction and ErrorVariable patterns — silent failures
  - PSScriptAnalyzer baselines and suppression hygiene
  - Secure string and credential handling — no plaintext passwords
  - Remoting safety — WinRM, SSH, double-hop authentication
  - Module manifest completeness — psd1 required fields
  - Parameter validation — ValidateSet, ValidatePattern, mandatory params
  - Execution policy and script signing considerations
  - Cross-platform compatibility — Windows vs Linux vs macOS
tags:
  - powershell
  - windows
  - devops
  - automation
  - scripting
  - security
activation:
  file_globs:
    - "**/*.ps1"
    - "**/*.psm1"
    - "**/*.psd1"
    - "**/*.ps1xml"
    - "**/*.pssc"
  structural_signals:
    - PowerShell script or module files present in diff
    - "PowerShell module manifest (.psd1) changed"
source:
  origin: file
  path: lang-powershell.md
  hash: "sha256:561ffd8c407f5ea6e53d7df840dd878aabe6e37de6c4657c20ae0d4aff76d878"
---
# PowerShell Quality Reviewer

## When This Activates

Activates when a diff contains `.ps1`, `.psm1`, `.psd1`, or other PowerShell file types. Focuses on strict mode enforcement, pipeline correctness, secure credential handling, and cross-platform compatibility. Critical for automation scripts, DSC configurations, and module development.

PowerShell's pipeline model means every expression produces output. The most impactful bugs are unintended output pollution, silent error swallowing, and credential exposure. Prioritize these over style issues.

## Audit Surface

- [ ] `Set-StrictMode -Version Latest` present at script scope; `$ErrorActionPreference = 'Stop'` set
- [ ] Functions declare `[OutputType()]` and do not leak unintended objects into the pipeline
- [ ] `-ErrorAction Stop` used on cmdlets where failure must be caught; `SilentlyContinue` is justified
- [ ] No plaintext passwords — `ConvertTo-SecureString -AsPlainText` not used with hardcoded strings
- [ ] `[Parameter(Mandatory)]` and validation attributes on all public function parameters
- [ ] Module `.psd1` manifest has `FunctionsToExport` (not wildcard `*`), `ModuleVersion`, `RequiredModules`
- [ ] No command injection via string interpolation — `Invoke-Expression` not called with user input
- [ ] `try/catch/finally` structured correctly; `$ErrorActionPreference = 'Stop'` for non-terminating errors
- [ ] File paths use `Join-Path` and `[System.IO.Path]` — no hardcoded backslash concatenation
- [ ] `Invoke-Command` sessions disposed in `finally` block; `Remove-PSSession` called
- [ ] `Write-Output` for pipeline data; `Write-Verbose`/`Write-Debug` for diagnostics; `Write-Host` only for UX
- [ ] Public function names use approved verbs (from `Get-Verb`)

## Detailed Checks

### Strict Mode and Error Handling
<!-- activation: keywords=["StrictMode", "ErrorActionPreference", "try", "catch", "throw"] -->

PowerShell has two error categories: terminating (caught by `try/catch`) and non-terminating (silently continue by default). Without `$ErrorActionPreference = 'Stop'`, most cmdlet errors are non-terminating and slip through `try/catch` blocks entirely.

- [ ] `Set-StrictMode -Version Latest` at module/script scope — catches uninitialized variables
- [ ] `$ErrorActionPreference = 'Stop'` turns non-terminating errors into terminating — required for `try/catch`
- [ ] `catch` blocks specify exception types: `catch [System.IO.IOException]` not bare `catch`
- [ ] `$_` (or `$PSItem`) used inside `catch` to access the error — not stale variables from outer scope
- [ ] `-ErrorVariable` used to capture errors from pipelines without stopping execution
- [ ] `throw` used to re-throw; `Write-Error -ErrorAction Stop` creates terminating error from non-terminating
- [ ] `trap` not used in new code — prefer `try/catch` for clarity
- [ ] `-WarningAction SilentlyContinue` justified — suppressed warnings logged or documented
- [ ] `$?` checked immediately after native command calls — PowerShell does not auto-throw on non-zero exit
- [ ] `$LASTEXITCODE` inspected after external executables — `$?` only reflects the last PS cmdlet
- [ ] Error records logged with `$_.Exception.Message` AND `$_.ScriptStackTrace` for debugging
- [ ] `$ErrorActionPreference` scoped to function — not leaking into callers via global override
- [ ] `$ErrorActionPreference` reset in `finally` if temporarily changed within a scope
- [ ] `.NET` exceptions from `[System.IO.File]::` calls are terminating — different behavior from cmdlets
- [ ] `$ErrorActionPreference` in module scope does not affect caller's scope — module isolation understood
- [ ] `-ErrorAction Ignore` (not `SilentlyContinue`) used when errors should not populate `$Error` variable
- [ ] `$Error.Clear()` called before error-checking sections to prevent stale errors from prior operations
- [ ] `Write-Error` generates non-terminating error by default — use `-ErrorAction Stop` or `throw` for terminating
- [ ] `Select-String` errors on missing files caught — `-ErrorAction Stop` needed for try/catch

### Pipeline Discipline and Output
<!-- activation: keywords=["pipeline", "Write-Output", "return", "ForEach-Object", "Where-Object"] -->

In PowerShell, every expression that produces output implicitly writes to the output stream. A single `.Add()` call on an ArrayList, an uncaptured method return, or an extra variable reference can pollute a function's return value. This is the most common source of "it returns the wrong thing" bugs.

- [ ] Functions do not accidentally output values — every expression result either captured, piped, or cast to `[void]`
- [ ] `[void]` cast, `$null =`, or `| Out-Null` used for discarding output intentionally (prefer `[void]` for perf)
- [ ] `return` with explicit value used for clarity; bare `return` does not accidentally output `$null`
- [ ] `ForEach-Object` vs `foreach` statement: pipeline version used for streaming; statement version for known collections
- [ ] `Where-Object` filter placed early in pipeline to reduce data flowing through later stages
- [ ] `Select-Object -First N` used to short-circuit pipeline when only first N results needed
- [ ] Functions with `[OutputType([SomeType])]` actually return that type on all code paths
- [ ] `.NET` method calls that return values captured or discarded — `[System.IO.File]::WriteAllText(...)` outputs nothing, but `[System.IO.File]::ReadAllLines(...)` does
- [ ] `Write-Information` (stream 6) used for structured telemetry, not `Write-Host`
- [ ] Pipeline variable `$_` not used outside pipeline context — leads to stale value bugs
- [ ] Array unrolling understood: `return @(1, 2, 3)` emits 3 objects, not one array (use `,@(...)` to wrap)
- [ ] `begin`/`process`/`end` blocks used in pipeline functions — `process` runs per-item, not just once
- [ ] `$input` automatic variable not used in advanced functions — use pipeline parameters instead
- [ ] `-OutVariable` and `-PipelineVariable` used for debugging pipeline flow, not for production logic
- [ ] `Measure-Command` or `Measure-Object` used for performance profiling, not manual `[DateTime]::Now` subtraction
- [ ] `$PSCmdlet.WriteObject()` used in compiled cmdlets for explicit pipeline output control
- [ ] `$PSCmdlet.ShouldProcess()` called before destructive operations when `SupportsShouldProcess` is declared
- [ ] `$PSCmdlet.ThrowTerminatingError()` used for unrecoverable errors in advanced functions
- [ ] Single-element array preserved: `@(Get-SingleItem)` wrapped in `@()` to ensure array type even for one result

### Parameter Validation
<!-- activation: keywords=["Parameter", "Validate", "CmdletBinding", "param"] -->

PowerShell's parameter validation attributes provide declarative input checking that runs before the function body. Missing validation leads to cryptic errors deep in function logic instead of clear parameter rejection at the call site.

- [ ] `[CmdletBinding()]` on all advanced functions — enables `-Verbose`, `-Debug`, `-ErrorAction`
- [ ] `[Parameter(Mandatory=$true)]` on required parameters — no relying on `$null` default
- [ ] `[ValidateNotNullOrEmpty()]` on string parameters that must have a value
- [ ] `[ValidateSet()]` for enum-like parameters — provides tab completion and input validation
- [ ] `[ValidateScript()]` blocks return `$true` and throw descriptive errors, not just `$false`
- [ ] `[ValidateRange()]` or `[ValidatePattern()]` on numeric/string inputs where constraints exist
- [ ] Default parameter values are safe — no `$Path = "C:\temp"` that fails on Linux
- [ ] `SupportsShouldProcess` declared when function performs destructive operations; `-WhatIf` implemented
- [ ] `[Parameter(ValueFromPipeline)]` and `[Parameter(ValueFromPipelineByPropertyName)]` used for pipeline-friendly functions
- [ ] `[Alias()]` attribute used for backward-compatible parameter renaming
- [ ] `[switch]` parameters not given default `$true` — switches default to `$false` by convention
- [ ] `[AllowNull()]` and `[AllowEmptyString()]` explicitly declared when null/empty input is valid
- [ ] `[SupportsWildcards()]` declared on path parameters that accept wildcards
- [ ] Parameter sets (`ParameterSetName`) tested — mutually exclusive parameter groups work correctly
- [ ] `DynamicParam` block validated — dynamic parameters only used when static params cannot suffice
- [ ] `[SecureString]` parameter type used for password parameters — triggers secure prompt in interactive mode
- [ ] Enum parameters use PowerShell enums or `[ValidateSet]` — not raw strings that need manual validation
- [ ] `[OutputType]` matches all `begin`/`process`/`end` block output paths — not just the happy path
- [ ] Credential parameters named `$Credential` by convention — enables PSScriptAnalyzer rule matching
- [ ] `[ValidateLength()]` used on string parameters with known size constraints (e.g., hostnames, paths)

### Security and Credential Management
<!-- activation: keywords=["Credential", "SecureString", "Password", "Invoke-Expression", "ConvertTo", "Token"] -->

PowerShell automation scripts frequently handle credentials, API keys, and connection strings. `Invoke-Expression` is the most dangerous cmdlet (equivalent to `eval`) and hardcoded secrets in scripts are depressingly common in enterprise environments.

- [ ] `Get-Credential` or vault integration used — no hardcoded credentials
- [ ] `ConvertTo-SecureString -AsPlainText -Force` not used with literal strings (defeats the purpose)
- [ ] `Invoke-Expression` never called with user-controlled strings — command injection vector
- [ ] `Start-Process` uses `-ArgumentList` array, not a single string (shell expansion risk)
- [ ] API keys and tokens not embedded in scripts — sourced from environment variables or vaults
- [ ] `.ps1` scripts signed when required by execution policy; certificates not expired
- [ ] `New-PSSessionOption -SkipCACheck -SkipCNCheck` not used in production (MITM risk)
- [ ] Temporary files with secrets cleaned up in `finally` — `Remove-Item -Force` on sensitive temp files
- [ ] `ConvertFrom-SecureString` output not logged or written to plaintext files
- [ ] `Invoke-WebRequest` / `Invoke-RestMethod` with `-UseDefaultCredentials` reviewed for credential exposure
- [ ] Script-scoped variables with sensitive data cleared after use (`$secret = $null; [GC]::Collect()`)
- [ ] `-Credential` parameter on remoting cmdlets never uses stored PSCredential objects with plaintext export
- [ ] Transcript logging (`Start-Transcript`) not capturing sensitive data in shared environments
- [ ] `Set-ExecutionPolicy` not called in scripts — it changes machine state; use `-ExecutionPolicy Bypass` on invocation
- [ ] AMSI (Antimalware Scan Interface) not bypassed in scripts — `[Ref].Assembly` reflection tricks flagged
- [ ] `Add-Type` with inline C# code reviewed for unsafe blocks and P/Invoke declarations
- [ ] `[System.Runtime.InteropServices.Marshal]` calls reviewed for memory safety — SecureString decryption cleaned up
- [ ] Registry key access uses `Get-ItemProperty` — not direct `.NET` registry classes that bypass PS provider security
- [ ] `Invoke-WebRequest -UseBasicParsing` used for headless environments — full parsing requires IE on Windows

### Remoting and Sessions
<!-- activation: keywords=["Invoke-Command", "PSSession", "Enter-PSSession", "WinRM", "SSH"] -->

PowerShell Remoting (via WinRM or SSH) enables executing code on remote machines. Session leaks, double-hop authentication failures, and the `$using:` scope modifier are the most common pitfalls. Remote objects are deserialized copies — they lose methods.

- [ ] `New-PSSession` sessions closed in `finally` block — `Remove-PSSession` prevents resource leak
- [ ] Double-hop authentication addressed: CredSSP configured or Kerberos delegation enabled
- [ ] `Invoke-Command -AsJob` results collected with `Receive-Job` and jobs cleaned up with `Remove-Job`
- [ ] Remote script blocks do not reference local variables without `$using:` scope modifier
- [ ] SSH-based remoting (`-HostName` parameter) used for Linux targets instead of WinRM
- [ ] Session configurations (`-ConfigurationName`) restrict available commands for least-privilege
- [ ] `-ThrottleLimit` set on parallel `Invoke-Command` to prevent overloading target hosts
- [ ] Disconnected sessions (`Disconnect-PSSession`) reconnected and cleaned up — not left orphaned
- [ ] Remote output deserialized objects understood — they lose methods; `.ToString()` may differ
- [ ] `Import-PSSession` used for implicit remoting — proxy functions generated for remote cmdlets
- [ ] `Invoke-Command -ComputerName` uses `-Credential` explicitly — not relying on ambient credentials
- [ ] Remote error handling: `$Error` variable on remote session is separate from local `$Error`
- [ ] `Copy-Item -ToSession` / `-FromSession` used for file transfer instead of manual UNC path mapping
- [ ] Session timeout configured appropriately — `New-PSSessionOption -IdleTimeout` prevents stale sessions

### Module Development
<!-- activation: file_globs=["**/*.psm1", "**/*.psd1"], keywords=["Export-ModuleMember", "Import-Module"] -->

PowerShell modules are the primary packaging unit. The `.psd1` manifest controls what gets exported and is the source of truth for PSGallery publishing. A `FunctionsToExport = '*'` wildcard is a common mistake that both leaks internals and degrades module auto-loading performance.

- [ ] `.psd1` manifest has explicit `FunctionsToExport = @('Verb-Noun')` — not wildcard `'*'`
- [ ] `CmdletsToExport`, `VariablesToExport`, `AliasesToExport` set to `@()` if not exporting those
- [ ] `RequiredModules` lists dependencies with version constraints
- [ ] `ModuleVersion` follows semantic versioning and is incremented for changes
- [ ] `RootModule` points to the correct `.psm1` file
- [ ] `Export-ModuleMember` not used in `.psm1` when `.psd1` controls exports (redundant, confusing)
- [ ] Nested modules declared in manifest, not dynamically imported inside `.psm1`
- [ ] `PrivateData.PSData` section populated for PSGallery: `Tags`, `LicenseUri`, `ProjectUri`
- [ ] `PowerShellVersion` minimum set in manifest — ensures compatibility declaration
- [ ] Module loading tested with `Import-Module -Force` — stale cached versions do not mask bugs
- [ ] `ScriptsToProcess` in manifest used only for one-time initialization, not for defining functions
- [ ] `CompatiblePSEditions` set to `Core`, `Desktop`, or both — prevents accidental use on wrong edition
- [ ] `FormatsToProcess` and `TypesToProcess` in manifest point to valid `.ps1xml` files
- [ ] Module auto-loading tested: functions discoverable via `Get-Command` without explicit `Import-Module`
- [ ] `#Requires -Version 7.0` header used in scripts requiring PS Core-only features
- [ ] `Update-ModuleManifest` used to modify `.psd1` files programmatically — not hand-editing the hashtable
- [ ] Dot-sourced scripts (`. ./helpers.ps1`) exist at the expected relative path — use `$PSScriptRoot` for reliable paths
- [ ] `using namespace System.Collections.Generic` preferred over `[System.Collections.Generic.List[string]]` verbosity
- [ ] `[ordered]` hashtable used when key insertion order matters — standard hashtables are unordered

### Testing with Pester
<!-- activation: keywords=["Describe", "It", "Should", "Mock", "Pester", "BeforeAll"] -->

Pester is the standard PowerShell testing framework. Version 5 introduced breaking changes from v4 (especially `Should` syntax and scoping rules). Tests should use v5 syntax, mock correctly, and use `TestDrive:` for file isolation.

- [ ] Tests use Pester v5+ syntax: `Should -Be`, not legacy `Should Be` (no hyphen)
- [ ] `BeforeAll`/`AfterAll` for setup/teardown; `BeforeEach`/`AfterEach` for per-test isolation
- [ ] `Mock` declarations in appropriate scope — `BeforeAll` for describe-wide, `It` for test-specific
- [ ] `Assert-MockCalled` (or `Should -Invoke`) verifies mock was called expected number of times
- [ ] Test file names match source: `Get-Widget.Tests.ps1` tests `Get-Widget.ps1`
- [ ] `-CI` switch used in CI pipeline for non-interactive Pester runs with exit codes
- [ ] `InModuleScope` used to test private functions without exporting them
- [ ] `TestDrive:` used for temporary file operations — automatically cleaned up after each test
- [ ] `Should -Throw` verifies exception type and message, not just that something was thrown
- [ ] Code coverage configured: `Invoke-Pester -CodeCoverage @{Path='./src/*.ps1'}` in CI
- [ ] `Should -HaveCount` used for collection assertions — not `$result.Count | Should -Be N`
- [ ] Test discovery: `*.Tests.ps1` naming convention followed so Pester finds tests automatically

## Common False Positives

- **`Write-Host` in interactive scripts**: CLI tools with colored output legitimately use `Write-Host` for UX
- **`[void]` on cmdlets that produce no output**: Some cmdlets already return nothing — `[void]` is harmless but unnecessary
- **`$ErrorActionPreference = 'Continue'` in cleanup blocks**: Intentional to ensure all cleanup runs even if one step fails
- **Unapproved verb in internal helper**: Private functions (not exported) don't need approved verbs
- **`ConvertTo-SecureString` from encrypted files**: Reading pre-encrypted credential files is a valid secure pattern
- **`Invoke-Expression` with static strings**: `Invoke-Expression 'Get-Date'` is needless but not a security issue (no user input)

## Severity Guidance

| Finding | Severity |
|---|---|
| `Invoke-Expression` with user-controlled input (injection) | Critical |
| Hardcoded plaintext password or API key in script | Critical |
| Missing `Set-StrictMode` and `$ErrorActionPreference = 'Stop'` in production | Critical |
| `-SkipCACheck` / `-SkipCNCheck` in production remoting (MITM) | Critical |
| `Start-Process` with unsanitized string arguments (shell injection) | Critical |
| Unintended pipeline output from function (data corruption) | Important |
| PSSession resource leak — missing `Remove-PSSession` in finally | Important |
| `FunctionsToExport = '*'` in published module manifest | Important |
| Missing parameter validation on public function | Important |
| Double-hop authentication not handled (silent auth failure) | Important |
| `$LASTEXITCODE` not checked after native command | Important |
| `$using:` scope modifier missing in remote script block | Important |
| Missing `[CmdletBinding()]` on advanced function | Minor |
| Unapproved verb on exported function | Minor |
| `Write-Host` for data that should go to pipeline | Minor |
| Legacy Pester v4 syntax | Minor |
| Array unrolling not handled (function returns wrong shape) | Minor |

## See Also

- `lang-bash` — Shell scripting patterns, similar automation concerns
- `security-reviewer` — Credential handling and injection prevention

## Authoritative References

- [PowerShell Documentation](https://learn.microsoft.com/en-us/powershell/)
- [PSScriptAnalyzer Rules](https://learn.microsoft.com/en-us/powershell/utility-modules/psscriptanalyzer/rules/readme)
- [PowerShell Best Practices and Style Guide](https://poshcode.gitbooks.io/powershell-practice-and-style/)
- [Pester Documentation](https://pester.dev/docs/quick-start)
- [About Approved Verbs](https://learn.microsoft.com/en-us/powershell/scripting/developer/cmdlet/approved-verbs-for-windows-powershell-commands)
- [PowerShell Remoting Security](https://learn.microsoft.com/en-us/powershell/scripting/security/remoting/winrm-security)
