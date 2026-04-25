---
id: build-maven-gradle
type: primary
depth_role: leaf
focus: Detect Maven and Gradle misconfigurations including missing dependency locking, SNAPSHOT dependencies in releases, missing BOM alignment, build scan credential exposure, and absent enforcer rules
parents:
  - index.md
covers:
  - "Missing dependency lock files (gradle.lockfile, dependency-lock.json)"
  - SNAPSHOT dependencies in release builds
  - "Missing BOM (Bill of Materials) for version alignment"
  - Gradle build scan exposing secrets or internal paths
  - maven-enforcer-plugin not configured
  - Repositories declared in build files instead of settings
  - "HTTP (non-TLS) repository URLs"
  - "Dynamic version ranges (+, latest.release) in production"
  - Missing Gradle wrapper committed to repository
  - Wrapper JAR checksum not verified
tags:
  - maven
  - gradle
  - jvm
  - pom
  - dependency-management
  - lockfile
  - snapshot
  - bom
  - enforcer
  - wrapper
activation:
  file_globs:
    - pom.xml
    - build.gradle
    - build.gradle.kts
    - settings.gradle
    - settings.gradle.kts
    - gradle.lockfile
    - "gradle/wrapper/gradle-wrapper.properties"
    - ".mvn/wrapper/maven-wrapper.properties"
    - gradle.properties
  keyword_matches:
    - dependency
    - SNAPSHOT
    - dependencyManagement
    - platform
    - enforcedPlatform
    - buildScan
    - maven-enforcer
    - repositories
    - wrapper
  structural_signals:
    - dependency_manifest_change
    - build_configuration_change
    - gradle_wrapper_change
source:
  origin: file
  path: build-maven-gradle.md
  hash: "sha256:c0530b2392527378335e335431ca56827af26dd457df71f14dfb95ffb38d4243"
---
# Maven and Gradle (JVM Build Systems)

## When This Activates

Activates when diffs touch Maven (pom.xml) or Gradle (build.gradle, build.gradle.kts, settings.gradle) files, wrapper configurations, lockfiles, or related properties files. This reviewer detects JVM build system misconfigurations: missing dependency locking allowing non-deterministic resolution, SNAPSHOT dependencies in release builds that pull unreleased code, missing BOM alignment causing version conflicts in multi-module projects, Gradle build scans leaking sensitive information, and absent maven-enforcer rules that prevent dependency convergence issues.

## Audit Surface

- [ ] No gradle.lockfile or Maven dependency:tree lockfile committed
- [ ] pom.xml or build.gradle dependency using SNAPSHOT version in release branch
- [ ] Dynamic version (1.+, latest.release, RELEASE) in production dependency
- [ ] Missing dependencyManagement or platform BOM for multi-module project
- [ ] Gradle build scan plugin publishing to scans.gradle.com without access control
- [ ] maven-enforcer-plugin not present in parent pom.xml
- [ ] Repository declared in build.gradle instead of settings.gradle
- [ ] Repository URL using http:// instead of https://
- [ ] Gradle wrapper JAR (gradle-wrapper.jar) not committed
- [ ] Gradle wrapper checksum not verified in CI
- [ ] Maven settings.xml with plaintext passwords
- [ ] Missing Maven wrapper (mvnw) in repository
- [ ] Build plugins using SNAPSHOT versions
- [ ] Dependency exclusions hiding transitive vulnerability

## Detailed Checks

### Dependency Locking and Pinning
<!-- activation: file_globs=["pom.xml", "build.gradle", "build.gradle.kts", "gradle.lockfile"], keywords=["dependencies", "SNAPSHOT", "1.+", "latest", "RELEASE", "lock", "dynamic"] -->

- [ ] **Missing dependency locking**: flag Gradle projects without `gradle.lockfile` or Maven projects without a dependency lock mechanism -- without locking, transitive dependency resolution can produce different results across builds
- [ ] **SNAPSHOT in release branch**: flag dependencies with `-SNAPSHOT` suffix in pom.xml or build.gradle on main/release branches -- SNAPSHOT versions are mutable and can change between builds, breaking reproducibility
- [ ] **Dynamic versions**: flag `1.+`, `[1.0,2.0)`, `latest.release`, or `RELEASE` version selectors in production dependencies -- these resolve to different versions on each build
- [ ] **Plugin SNAPSHOT versions**: flag build plugins using SNAPSHOT versions -- a compromised SNAPSHOT plugin executes with full build-system privileges
- [ ] **Dependency exclusions masking vulnerabilities**: flag broad exclusions (`<exclusion><groupId>*</groupId></exclusion>`) that may hide transitive dependencies with known CVEs from audit tools

### BOM and Version Alignment
<!-- activation: keywords=["dependencyManagement", "platform", "enforcedPlatform", "BOM", "bom", "import", "pom", "version alignment"] -->

- [ ] **Missing BOM in multi-module project**: flag multi-module Maven projects without a `<dependencyManagement>` section in the parent pom or Gradle projects without `platform()` / `enforcedPlatform()` -- different modules may resolve different versions of the same library
- [ ] **Version declared outside BOM**: flag child modules overriding versions managed by the parent BOM -- breaks alignment and may introduce incompatible versions
- [ ] **Conflicting dependency versions**: flag the same groupId:artifactId appearing at different versions across modules -- indicates missing version alignment that can cause ClassNotFoundException at runtime

### Build Scan and Credential Safety
<!-- activation: keywords=["buildScan", "scans.gradle.com", "settings.xml", "password", "server", "credentials", "token", "auth"] -->

- [ ] **Build scan publishing to public endpoint**: flag `buildScan { publishAlways() }` or equivalent publishing to scans.gradle.com without access control -- build scans can expose internal project structure, dependency trees, environment variables, and file paths
- [ ] **Maven settings.xml with plaintext passwords**: flag `<password>` elements in settings.xml that are not encrypted with `{...}` Maven encryption -- plaintext passwords committed to the repository are exposed to all contributors
- [ ] **Credentials in gradle.properties committed**: flag gradle.properties containing passwords, tokens, or API keys committed to the repository -- use environment variables or credential stores instead

### Enforcer and Governance
<!-- activation: keywords=["enforcer", "requireUpperBoundDeps", "convergence", "ban", "requireJavaVersion", "requireMavenVersion"] -->

- [ ] **Missing maven-enforcer-plugin**: flag parent pom.xml without `maven-enforcer-plugin` configured -- enforcer rules catch dependency convergence issues, banned dependencies, and version requirement violations at build time
- [ ] **Missing requireUpperBoundDeps**: flag enforcer configuration without `requireUpperBoundDeps` rule -- this rule ensures the highest version of a transitive dependency is always used, preventing silent downgrades
- [ ] **Missing requireJavaVersion**: flag enforcer without `requireJavaVersion` rule -- allows builds on unsupported JDK versions
- [ ] **Missing dependency-check plugin**: flag CI builds without OWASP dependency-check-maven or dependency-check-gradle plugin -- known CVEs in dependencies are only caught by automated scanning

### Wrapper and Repository Hygiene
<!-- activation: file_globs=["gradle/wrapper/gradle-wrapper.properties", ".mvn/wrapper/maven-wrapper.properties", "gradlew", "mvnw"], keywords=["wrapper", "distributionUrl", "distributionSha256Sum", "repository", "repositories", "mavenCentral", "jcenter"] -->

- [ ] **Missing Gradle wrapper**: flag Gradle projects without gradlew and gradle/wrapper/gradle-wrapper.jar committed -- contributors must install the exact Gradle version manually, causing version drift
- [ ] **Wrapper checksum not verified**: flag gradle-wrapper.properties without `distributionSha256Sum` -- without the checksum, a tampered Gradle distribution can be downloaded
- [ ] **Repository in build file instead of settings**: flag `repositories { }` blocks in build.gradle that should be in settings.gradle -- Gradle recommends declaring repositories in settings for security and consistency
- [ ] **HTTP repository URL**: flag repository URLs using `http://` instead of `https://` -- artifact downloads over plaintext are subject to MITM attacks
- [ ] **JCenter repository**: flag use of `jcenter()` -- JCenter is deprecated and read-only; migrate to Maven Central

## Common False Positives

- **SNAPSHOT in development branches**: SNAPSHOT dependencies are expected in feature branches during active development. Flag only on main/release branches.
- **Library projects without lockfiles**: libraries that publish to Maven Central may intentionally omit Gradle lockfiles so consumers resolve compatible versions. Flag only for applications and services.
- **Internal Gradle Enterprise build scans**: organizations using Gradle Enterprise publish scans to a private server with access control, which is safe.
- **Version ranges in BOM imports**: using version ranges when importing BOMs from well-known organizations (Spring, Jakarta) is lower risk than ranges on individual dependencies.

## Severity Guidance

| Finding | Severity |
|---|---|
| Maven settings.xml with plaintext passwords committed | Critical |
| HTTP repository URL in build configuration | Critical |
| SNAPSHOT dependency on release branch | Important |
| Missing dependency locking in production application | Important |
| Dynamic version (1.+, latest.release) in production dependency | Important |
| Build scan publishing to public endpoint without access control | Important |
| Missing maven-enforcer-plugin in parent pom | Important |
| Gradle wrapper without distributionSha256Sum | Important |
| Missing BOM in multi-module project | Minor |
| JCenter repository still referenced | Minor |
| Missing requireJavaVersion enforcer rule | Minor |

## See Also

- `build-lockfile-hygiene` -- lockfile-specific checks applicable across all package managers
- `sec-owasp-a06-vulnerable-components` -- known CVEs in JVM dependencies
- `sec-supply-chain-sbom-slsa-sigstore` -- provenance and signing for published JVM artifacts
- `build-reproducibility-slsa-sigstore` -- reproducible build requirements for JVM projects

## Authoritative References

- [Maven Enforcer Plugin](https://maven.apache.org/enforcer/maven-enforcer-plugin/)
- [Gradle Dependency Locking](https://docs.gradle.org/current/userguide/dependency_locking.html)
- [Gradle Build Scan Security](https://docs.gradle.com/enterprise/gradle-plugin/#security)
- [Maven Password Encryption](https://maven.apache.org/guides/mini/guide-encryption.html)
- [Gradle Wrapper Checksum Verification](https://docs.gradle.org/current/userguide/gradle_wrapper.html#sec:verification)
- [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/)
