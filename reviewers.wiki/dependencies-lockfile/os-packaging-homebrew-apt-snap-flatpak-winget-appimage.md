---
id: os-packaging-homebrew-apt-snap-flatpak-winget-appimage
type: primary
depth_role: leaf
focus: "Detect OS-packaging hazards across Homebrew, Debian/apt, Snap, Flatpak, RPM, Chocolatey, winget, and AppImage -- missing checksums, weak sandboxing, hardcoded paths, unsigned artefacts, and broken uninstall cleanup"
parents:
  - index.md
covers:
  - Homebrew formula without a bottle sha256 or url sha256
  - "Debian control file missing explicit dependencies (relies on transitive)"
  - Snap confinement strict not tested against devmode runs
  - Flatpak sandbox escape via --filesystem=host or broad --talk-name
  - "RPM %files missing %config for editable configuration"
  - "Chocolatey package without checksum64 / checksum"
  - winget manifest without SHA256 for each installer
  - AppImage without embedded signature or zsync info
  - "Missing reproducible build flags (SOURCE_DATE_EPOCH, --build-arg)"
  - "Hardcoded absolute paths in install or pre/post scripts"
  - "Uninstall script leaves residue (temp dirs, daemons, registry keys)"
  - "User-writable install directory (privilege escalation risk)"
  - No upgrade path tested from older packaged versions
  - "Startup entries (systemd units, launchd, Run keys, Autostart) not removed on uninstall"
tags:
  - packaging
  - homebrew
  - debian
  - rpm
  - snap
  - flatpak
  - chocolatey
  - winget
  - appimage
  - msix
  - reproducible-build
  - uninstall
  - sandboxing
activation:
  file_globs:
    - "**/Formula/*.rb"
    - "**/*.deb"
    - "**/debian/**"
    - "**/snap/snapcraft.yaml"
    - "**/flatpak.json"
    - "**/*.flatpakref"
    - "**/*.spec"
    - "**/*.nuspec"
    - "**/winget-manifests/**"
    - "**/AppImageBuilder.yml"
    - "**/chocolateyInstall.ps1"
    - "**/chocolateyUninstall.ps1"
  keyword_matches:
    - homebrew
    - brew formula
    - debian
    - control
    - postinst
    - postrm
    - snapcraft
    - flatpak-builder
    - rpmbuild
    - chocolatey
    - winget
    - appimage
    - msix
    - pkg-config
    - sha256
    - confinement
  structural_signals:
    - missing_checksum
    - sandbox_escape_host_fs
    - hardcoded_install_path
source:
  origin: file
  path: os-packaging-homebrew-apt-snap-flatpak-winget-appimage.md
  hash: "sha256:81d3f0b83c3853972d2db2730958082cbc3499caf07b7a9cfc5c1a1805233b24"
---
# OS Packaging (Homebrew, apt/deb, Snap, Flatpak, RPM, Chocolatey, winget, AppImage)

## When This Activates

Activates when diffs touch OS-level packaging manifests, install/uninstall scripts, or package-build definitions. OS packaging is a trust boundary: users run `brew install`, `apt install`, or `winget install` expecting integrity, clean removal, and a sandboxed footprint. A formula without a checksum, a Flatpak with `--filesystem=host`, or a postrm that forgets to stop a systemd unit each turn into lingering risk on every machine that installs the package. This reviewer enforces the per-ecosystem hygiene rules that linters (lintian, rpmlint, snapcraft review) encode, plus cross-cutting concerns that apply to all of them.

## Audit Surface

- [ ] Missing integrity checksum (sha256) for downloaded artefacts
- [ ] Missing explicit dependency declarations
- [ ] Confinement / sandbox escape (classic Snap, Flatpak --filesystem=host)
- [ ] Missing %config / config file protection on upgrade
- [ ] Chocolatey / winget manifest without checksum
- [ ] AppImage without signature or zsync metadata
- [ ] Missing reproducible-build flags
- [ ] Hardcoded absolute paths in install scripts
- [ ] User-writable install directory
- [ ] No tested upgrade path from older versions
- [ ] Startup entries not removed on uninstall
- [ ] Postrm/chocolateyUninstall missing state cleanup
- [ ] Broad Flatpak portals or D-Bus access (--talk-name, --system-talk-name)

## Detailed Checks

### Integrity, Checksums, and Signatures
<!-- activation: keywords=["sha256", "sha512", "checksum", "signature", "gpg", "sign", "Get-ChocolateyWebFile", "InstallerSha256"] -->

- [ ] **Homebrew formula without sha256**: flag `Formula/*.rb` using `url` without a matching `sha256` (or `bottle do ... sha256`) -- Homebrew refuses to install but reviewers often miss the omission in bottle blocks.
- [ ] **Chocolatey install without checksum**: flag `Get-ChocolateyWebFile` / `Install-ChocolateyPackage` without `-Checksum` / `-ChecksumType sha256` -- MITM or CDN compromise pushes arbitrary code.
- [ ] **winget manifest without InstallerSha256**: flag any installer entry lacking `InstallerSha256` -- winget refuses to install, but catching this pre-merge avoids breaking the submission PR.
- [ ] **AppImage unsigned and without zsync**: flag AppImageBuilder manifests with no `sign-key` and no `update-information` -- users cannot verify authenticity or receive delta updates.

### Dependencies and Conflicts
<!-- activation: keywords=["Depends", "Requires", "dependencies", "Conflicts", "Provides", "install_requires"] -->

- [ ] **Debian control missing explicit Depends**: flag `debian/control` whose `Depends:` field leans on transitive dependencies from other Depends-ed packages -- apt resolution may change. Pin minimum versions (`libfoo (>= 1.2)`).
- [ ] **RPM spec missing Requires**: flag `.spec` files without explicit `Requires:` or with only `BuildRequires:` -- runtime dependencies must be declared separately.
- [ ] **Snap/Flatpak missing runtime constraint**: flag Snap base/core mismatches or Flatpak runtime not pinned to a supported series -- the package breaks when the runtime is archived.

### Sandboxing and Confinement
<!-- activation: keywords=["confinement", "strict", "classic", "devmode", "plugs", "slots", "filesystem", "talk-name", "system-talk-name", "portal", "SELinux"] -->

- [ ] **Snap confinement: classic**: flag classic confinement without documented justification and store approval -- classic bypasses the Snap sandbox entirely. Prefer `strict` with declared `plugs`.
- [ ] **Snap overly-broad plugs**: flag `personal-files` or `system-files` with wildcard read/write paths -- grant narrow paths explicitly.
- [ ] **Flatpak --filesystem=host / host-os / host-etc**: flag any `--filesystem=host` or equivalent in `finish-args` -- this negates the Flatpak sandbox. Use xdg portals instead (see the Flatpak sandbox guide).
- [ ] **Flatpak broad D-Bus access**: flag `--talk-name=*` with org.freedesktop.DBus or similar root paths, `--system-talk-name=org.freedesktop.systemd1` -- restrict to the minimal bus name the app needs.

### Install Paths and Permissions
<!-- activation: keywords=["install", "prefix", "path", "Program Files", "/opt", "/usr/local", "chmod", "chown", "ACL", "Users group"] -->

- [ ] **Hardcoded install paths**: flag scripts that assume `/opt/foo`, `C:\\Program Files\\Foo`, or `/usr/local/bin` without using the package manager's prefix variables (`$(DESTDIR)`, `%{_bindir}`, `$INSTDIR`, `brew --prefix`) -- alternative prefixes and cross-distro installs break.
- [ ] **World-writable / user-writable install directory**: flag `chmod 777`, installing to a directory under `%APPDATA%\\Users\\Public`, or permissions where any user can replace binaries -- trivial privilege escalation for a local attacker.
- [ ] **RPM %files without %config(noreplace)**: flag config files under `/etc/` that are listed plainly in `%files` -- on upgrade the user's edits are overwritten. Use `%config(noreplace)`.

### Uninstall Cleanup and Startup Entries
<!-- activation: keywords=["postrm", "preuninstall", "chocolateyUninstall", "uninstall", "systemd", "launchd", "Autostart", "Run key", "Startup", "enable", "disable"] -->

- [ ] **Startup entries not removed**: flag installs that register systemd units, launchd plists, HKLM/HKCU Run keys, or `~/.config/autostart/` entries without matching removal in the uninstall script -- the service keeps running (or tries to) after removal.
- [ ] **Postrm missing state cleanup**: flag Debian `postrm` / RPM `%postun` / chocolateyUninstall.ps1 without removing created directories, log files, and cache entries -- `--purge` should behave like a clean uninstall.
- [ ] **Daemon left running**: flag installs that `systemctl enable --now` a service without a corresponding `systemctl stop && disable` in uninstall -- zombie services linger across reinstall.

### Upgrade Path and Reproducibility
<!-- activation: keywords=["upgrade", "SOURCE_DATE_EPOCH", "reproducible", "build-arg", "deterministic", "release", "changelog", "version"] -->

- [ ] **No upgrade test**: flag packaging changes with no CI step installing the previous version and then upgrading -- breakage on upgrade is by far the most common packaging bug to reach users.
- [ ] **Missing reproducible-build flags**: flag builds that do not honour `SOURCE_DATE_EPOCH`, or that embed build timestamps / hostnames -- reproducibility is a Debian, Nix, and Arch expectation.
- [ ] **Version regression**: flag packaging diffs that lower the version number vs the previous release -- apt/dnf refuse to upgrade, and Chocolatey rejects the push.

## Common False Positives

- **Internal-only packages**: packages shipped via a private registry for a single organisation can be laxer on signing/reproducibility; still require checksums.
- **Meta-packages (apt empty packages)**: may legitimately have no files; skip the %files / %config rule.
- **Flatpak dev builds**: `--filesystem=host` in a `dev` profile not shipped to Flathub is acceptable if gated; confirm the manifest on the release branch.

## Severity Guidance

| Finding | Severity |
|---|---|
| Missing sha256 / checksum on downloaded artefact | Critical |
| Flatpak --filesystem=host shipped to users | Critical |
| Snap classic confinement without approval | Critical |
| World- or user-writable install directory | Critical |
| Version regression blocking upgrade | Critical |
| Startup entries not removed on uninstall | Important |
| Postrm / chocolateyUninstall missing state cleanup | Important |
| RPM %files missing %config(noreplace) | Important |
| Debian control without explicit Depends | Important |
| Broad Flatpak D-Bus / portal access | Important |
| Hardcoded absolute install path | Important |
| No upgrade-from-previous-version CI test | Important |
| Missing reproducible-build flags | Minor |
| AppImage without zsync update metadata | Minor |

## See Also

- `sec-secrets-management-and-rotation` -- packaging artefacts occasionally leak signing keys and API tokens
- `sec-owasp-a05-misconfiguration` -- broad sandbox escapes and writable install paths are classic misconfigurations
- `reliability-health-checks` -- installed services need health checks wired up alongside startup entries

## Authoritative References

- [Homebrew, "Formula Cookbook"](https://docs.brew.sh/Formula-Cookbook)
- [Debian Policy Manual](https://www.debian.org/doc/debian-policy/)
- [Snapcraft, "Confinement"](https://snapcraft.io/docs/snap-confinement)
- [Flatpak, "Sandbox Permissions"](https://docs.flatpak.org/en/latest/sandbox-permissions.html)
- [Fedora, "Packaging Guidelines"](https://docs.fedoraproject.org/en-US/packaging-guidelines/)
- [Chocolatey, "Create Packages"](https://docs.chocolatey.org/en-us/create/create-packages)
- [winget-pkgs, "Manifest Schema"](https://github.com/microsoft/winget-pkgs/tree/master/doc)
- [AppImage, "Creating AppImages"](https://docs.appimage.org/packaging-guide/index.html)
- [Reproducible Builds](https://reproducible-builds.org/)
