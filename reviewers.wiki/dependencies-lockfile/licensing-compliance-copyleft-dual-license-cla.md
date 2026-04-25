---
id: licensing-compliance-copyleft-dual-license-cla
type: primary
depth_role: leaf
focus: "Detect software licensing compliance gaps including missing LICENSE file, copyleft (GPL/AGPL) dependencies in proprietary products, license incompatibility between dependencies, missing attribution, absent CLA/DCO enforcement, SPDX mismatches, and missing third-party notices in distributions"
parents:
  - index.md
covers:
  - Repository shipped without a root LICENSE or COPYING file
  - GPL or AGPL dependency pulled into a proprietary or SaaS product
  - "Two dependencies with mutually incompatible licenses (e.g., GPLv2-only + Apache-2.0)"
  - Redistributed code without required copyright and license attribution
  - "Contributions merged without CLA, DCO (Signed-off-by), or equivalent IP provenance"
  - SPDX-License-Identifier header disagrees with LICENSE file
  - Dual-licensed dependency consumed without explicit license choice recorded
  - "Distribution (binary, container, npm tarball) missing third-party license notices"
  - Code copy-pasted from Stack Overflow, examples, or other repos with no attribution
  - "License field in package manifest missing, UNLICENSED, or 'SEE LICENSE IN ...'"
tags:
  - licensing
  - open-source
  - copyleft
  - gpl
  - agpl
  - attribution
  - cla
  - dco
  - spdx
  - compliance
  - supply-chain
activation:
  file_globs:
    - "LICENSE*"
    - "COPYING*"
    - "NOTICE*"
    - "**/LICENSE*"
    - "**/COPYING*"
    - "**/NOTICE*"
    - "**/third_party/**"
    - "**/third-party/**"
    - "**/vendor/**"
    - package.json
    - pyproject.toml
    - Cargo.toml
    - go.mod
    - "**/*.spdx"
    - "**/*.spdx.json"
  keyword_matches:
    - LICENSE
    - license
    - COPYING
    - copyright
    - GPL
    - AGPL
    - LGPL
    - MIT
    - Apache
    - BSD
    - MPL
    - SSPL
    - dual-license
    - CLA
    - Contributor License Agreement
    - DCO
    - Signed-off-by
    - spdx-license-identifier
    - SPDX-License-Identifier
    - third_party
    - NOTICE
  structural_signals:
    - "Root LICENSE / COPYING / NOTICE file change"
    - Package manifest license field change
    - "Addition of third_party / vendor directory"
    - Dependency lockfile change pulling in new licenses
source:
  origin: file
  path: licensing-compliance-copyleft-dual-license-cla.md
  hash: "sha256:d8e089de7cac3f9bc7a4f257a9e090c1ff43aaed53a5c1bd5de99dcfba497192"
---
# Licensing Compliance: Copyleft, Dual-License, CLA

## When This Activates

Activates when diffs touch LICENSE / COPYING / NOTICE files, package manifests (package.json, pyproject.toml, Cargo.toml, go.mod), dependency lockfiles, vendored third-party source, release artifacts, or CLA/DCO configuration. Software licensing is legally binding: a GPL dependency in a proprietary SaaS product can force source disclosure or trigger breach-of-contract claims, a missing attribution violates nearly every permissive license, and accepting contributions without CLA or DCO leaves IP provenance undefendable. Mistakes here are often invisible until an acquirer's due-diligence pass or a customer's legal review -- reviewers should treat license metadata with the same rigor as security boundaries.

**Key Requirements**: every distributed artifact carries a LICENSE, every redistributed dependency carries its original license and copyright, every contribution has an IP provenance record (CLA or DCO), every dependency's license is compatible with the project's license and business model.

## Audit Surface

- [ ] New repository or subpackage without LICENSE or COPYING at root
- [ ] package.json, pyproject.toml, Cargo.toml, go.mod with missing or empty license field
- [ ] GPL / AGPL / LGPL / SSPL dependency in a proprietary product lockfile
- [ ] Dependency graph containing mutually incompatible licenses
- [ ] SPDX-License-Identifier header in source disagreeing with root LICENSE
- [ ] Vendored / embedded third-party source with stripped copyright header
- [ ] Dockerfile or release artifact with no NOTICE or third-party licenses file
- [ ] Contributions merged with no CLA bot check or DCO Signed-off-by verification
- [ ] Dual-licensed dependency (e.g., MPL/GPL, Apache/GPL) with no documented choice
- [ ] Copy-pasted code blocks with URL comment but no license attribution
- [ ] Source redistributed without propagating its original LICENSE and copyright
- [ ] License changed (relicensed) without contributor consent record
- [ ] AGPL library accessed over the network without source-offer mechanism
- [ ] Cryptography library with license terms separate from codebase license
- [ ] Font, icon, image, or dataset bundled without its separate license documented

## Detailed Checks

### Repository and Package License Metadata
<!-- activation: file_globs=["LICENSE*", "COPYING*", "package.json", "pyproject.toml", "Cargo.toml", "go.mod"] -->

- [ ] **Missing LICENSE file**: flag new repositories or subpackages without a LICENSE or COPYING file at the root. Without a license, the default is "all rights reserved" and external users have no right to use the code
- [ ] **Package manifest license field missing or UNLICENSED**: flag `"license": "UNLICENSED"`, empty license fields, or placeholder values like `"SEE LICENSE IN ..."` when a real license exists. Package registries and SBOM tooling rely on this field
- [ ] **SPDX identifier disagrees with LICENSE**: flag `SPDX-License-Identifier:` headers in source files that contradict the project's LICENSE file (e.g., files tagged `MIT` in an Apache-2.0 repository). Cross-reference with `sec-supply-chain-sbom-slsa-sigstore`
- [ ] **License changed without contributor consent**: flag commits that modify the LICENSE file to a more restrictive or incompatible terms without a corresponding record of contributor consent (CLA re-signing or re-licensing vote)

### Copyleft Contamination (GPL / AGPL / LGPL / SSPL)
<!-- activation: keywords=["GPL", "AGPL", "LGPL", "SSPL", "copyleft", "derivative", "linking"] -->

- [ ] **GPL / AGPL dependency in proprietary product**: flag dependencies under GPL, AGPL, or SSPL pulled into a closed-source or SaaS product. GPL requires derivative-work disclosure on distribution; AGPL extends this to network access
- [ ] **AGPL over the network with no source offer**: flag AGPL-licensed components served to users over a network without a corresponding "source available" link or download endpoint
- [ ] **LGPL static linking without exception**: flag LGPL libraries statically linked into proprietary binaries without the LGPL static-linking exception or relinking-object provision
- [ ] **SSPL (MongoDB, Elastic, Redis) in managed-service offering**: flag SSPL components used as the basis for a commercial managed service -- SSPL Section 13 requires open-sourcing the entire service stack

### License Incompatibility
<!-- activation: keywords=["incompatible", "compatibility", "GPLv2", "GPLv3", "Apache", "MIT"] -->

- [ ] **Known-incompatible license pairs**: flag GPLv2-only combined with Apache-2.0, or GPLv2-only combined with GPLv3-only. These pairs cannot be combined in a single binary
- [ ] **CC-BY-SA code imported into MIT project**: flag Creative Commons ShareAlike content (including CC-BY-SA text, images, datasets) imported into a project that does not propagate ShareAlike terms
- [ ] **Proprietary / custom license in OSS project**: flag dependencies with non-standard "source-available", "Commons Clause", BUSL, or custom licenses imported into an open-source project without explicit policy review

### Attribution and Redistribution
<!-- activation: keywords=["attribution", "notice", "copyright", "redistribute", "third_party", "vendor"] -->

- [ ] **Redistributed code with stripped copyright header**: flag vendored or embedded third-party source files where the original copyright header has been removed. MIT, BSD, and Apache all require retention of the notice
- [ ] **Missing NOTICE or THIRD_PARTY_LICENSES in distribution**: flag release artifacts (Docker images, npm tarballs, compiled binaries, installer packages) that bundle third-party dependencies without an accompanying NOTICE, THIRD_PARTY_LICENSES, or licenses/ directory
- [ ] **Apache-2.0 dependency without NOTICE propagation**: flag Apache-2.0 dependencies where the upstream `NOTICE` file is not reproduced in the distribution (Apache-2.0 Section 4(d))
- [ ] **Code copied from Stack Overflow / blog without attribution**: flag code blocks with URL comments pointing at SO, MDN, GitHub gists, or blog posts where the source is CC-BY-SA or otherwise restricted, with no license note in the file

### Dual-License Choice and Specialty Assets
<!-- activation: keywords=["dual-license", "dual_license", "or", "MPL", "ruby license", "font", "icon", "dataset"] -->

- [ ] **Dual-licensed dependency without explicit choice**: flag dual-licensed dependencies (e.g., "MPL-2.0 OR Apache-2.0", "GPL-2.0 OR commercial", Ruby license) consumed without recording which license terms the project is operating under
- [ ] **Commercial-option license used without proof of purchase**: flag dependencies where the OSS option is copyleft and the project uses the code in a proprietary product -- implies the commercial option was taken, requiring a procurement record
- [ ] **Fonts / icons / datasets without separate license docs**: flag bundled fonts, icon packs, stock images, or datasets without their individual license documented. These often have separate terms (SIL OFL, CC, commercial EULAs) from the code

### Contributor IP Provenance (CLA / DCO)
<!-- activation: keywords=["CLA", "DCO", "Signed-off-by", "contributor", "contributing", "CONTRIBUTORS"] -->

- [ ] **No CLA or DCO enforcement on contributions**: flag open-source repositories accepting external contributions without a CLA bot (cla-assistant, EasyCLA) or a DCO check requiring `Signed-off-by:` trailers. Without either, the project has no provable right to redistribute contributed code
- [ ] **DCO Signed-off-by missing on merge commits**: flag merge configurations where DCO is declared in CONTRIBUTING.md but not enforced by a required status check
- [ ] **Employee contributions without assignment/authorization**: flag large PRs from corporate contributors without either a corporate CLA or documented authorization; individual CLAs do not always bind employer-owned IP

### Specialty: Cryptography and Export-Controlled Code
<!-- activation: keywords=["crypto", "openssl", "wolfssl", "libsodium", "boringssl", "export"] -->

- [ ] **OpenSSL / cryptography library with separate terms**: flag older OpenSSL versions (pre-3.0) that carry dual-license terms (OpenSSL + original SSLeay) which must both be reproduced. Cross-reference with `export-control-sanctions-screening`
- [ ] **Patent-encumbered codec without license grant**: flag codecs (H.264, HEVC, AAC) shipped without verifying the patent-pool license posture

## Common False Positives

- **Dev-only dependencies**: GPL tools used only at build time (e.g., GPL linters, code generators) often do not contaminate the shipped artifact -- but still need legal review for edge cases.
- **Classpath / linking exceptions**: many LGPL, GCC runtime, and OpenJDK components carry explicit linking exceptions that permit static linking.
- **MIT-like but custom wording**: some permissive licenses (ISC, zlib, BSD-0) are effectively MIT but fail naive string matching.
- **Apache NOTICE files intentionally empty**: an Apache-2.0 project with no NOTICE content upstream does not require inventing one downstream.
- **Internal-only code**: repositories never distributed externally do not trigger redistribution obligations, though internal users still need use rights.

## Severity Guidance

| Finding | Severity |
|---|---|
| GPL / AGPL / SSPL dependency in proprietary product | Critical |
| License incompatibility (GPLv2-only + Apache-2.0) in one binary | Critical |
| AGPL served over network without source offer | Critical |
| Relicensing without contributor consent | Critical |
| Missing LICENSE file on a distributed artifact | Important |
| Redistributed code with stripped copyright header | Important |
| No CLA or DCO enforcement on external contributions | Important |
| Missing NOTICE / THIRD_PARTY_LICENSES in distribution | Important |
| SPDX identifier disagrees with LICENSE file | Important |
| Dual-licensed dependency without explicit choice | Minor |
| Bundled fonts / icons without separate license documented | Minor |

## See Also

- `sec-supply-chain-sbom-slsa-sigstore` -- SBOM generation surfaces license metadata for every dependency; SPDX is the canonical format
- `compliance-gdpr-data-subject-rights` -- separate from licensing but often co-reviewed during external legal due diligence
- `export-control-sanctions-screening` -- cryptography licensing intersects with export-control classification
- `principle-feature-flags-and-config` -- license-gated features (enterprise edition) are often flag-controlled

## Authoritative References

- [SPDX License List](https://spdx.org/licenses/)
- [OSI Approved Licenses](https://opensource.org/licenses/)
- [GNU License Compatibility Matrix](https://www.gnu.org/licenses/license-list.html)
- [Apache-2.0 License (Section 4 - Redistribution)](https://www.apache.org/licenses/LICENSE-2.0)
- [Developer Certificate of Origin](https://developercertificate.org/)
- [Linux Foundation - CLA vs DCO](https://www.linuxfoundation.org/blog/blog/cla-vs-dco-whats-the-difference)
- [ReuseSoftware - REUSE Specification](https://reuse.software/spec/)
