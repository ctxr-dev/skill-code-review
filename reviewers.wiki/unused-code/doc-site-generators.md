---
id: doc-site-generators
type: primary
depth_role: leaf
focus: Detect documentation site issues including broken builds, stale content, missing search, unversioned docs, and absent API reference auto-generation
parents:
  - index.md
covers:
  - Docs site not built or validated in CI
  - Broken links in documentation pages
  - Stale documentation content that no longer matches the codebase
  - Missing search functionality in the docs site
  - Documentation not versioned alongside code releases
  - Missing API reference auto-generation from source code
  - Documentation site configuration errors
  - Navigation structure not reflecting current doc organization
tags:
  - documentation-site
  - docusaurus
  - mkdocs
  - sphinx
  - vitepress
  - hugo
  - jekyll
  - starlight
  - api-reference
  - search
  - versioning
activation:
  file_globs:
    - "**/docusaurus.config.*"
    - "**/mkdocs.yml"
    - "**/mkdocs.yaml"
    - "**/conf.py"
    - "**/docs/**"
    - "**/.vitepress/**"
    - "**/vitepress.config.*"
    - "**/hugo.toml"
    - "**/hugo.yaml"
    - "**/config.toml"
    - "**/astro.config.*"
    - "**/book.toml"
    - "**/_config.yml"
    - "**/sidebars.*"
  keyword_matches:
    - docusaurus
    - Docusaurus
    - mkdocs
    - MkDocs
    - sphinx
    - Sphinx
    - vitepress
    - VitePress
    - starlight
    - Starlight
    - hugo
    - Hugo
    - docs site
    - documentation site
  structural_signals:
    - Documentation site configuration present
    - Docs directory with markdown files and a build tool
source:
  origin: file
  path: doc-site-generators.md
  hash: "sha256:833b9dfea6a970fbbd38cfe8e976ea44915b1519ac985a6cc3a84ba88e79b0d5"
---
# Documentation Site Generator Quality

## When This Activates

Activates when diffs modify documentation site configuration (Docusaurus, MkDocs, Sphinx, VitePress, Hugo, Starlight), add or change docs content, or modify source code that should be reflected in auto-generated API references. A documentation site is only as good as its freshest build. A site that does not build in CI silently accumulates broken links, stale content, and configuration errors until someone notices months later. This reviewer ensures the docs pipeline is healthy and the content stays current.

## Audit Surface

- [ ] Docs site build not included in CI pipeline
- [ ] Docs build warnings treated as non-blocking (broken links, missing references pass silently)
- [ ] Documentation page references a feature, API, or configuration that no longer exists
- [ ] Documentation page omits a feature that the codebase implements and users need
- [ ] No search functionality configured in the docs site
- [ ] Docs site serves a single version with no version selector or archive
- [ ] API reference section is hand-written instead of auto-generated from source code doc comments
- [ ] Navigation sidebar does not include newly added pages
- [ ] Docs site configuration file references a theme, plugin, or extension that is not installed
- [ ] Code examples in documentation do not match the current API
- [ ] Documentation build produces warnings that indicate content issues
- [ ] Docs site has no 404 page or redirects for moved content

## Detailed Checks

### CI Build Integration
<!-- activation: keywords=["ci", "build", "deploy", "pipeline", "github actions", "netlify", "vercel", "cloudflare pages"] -->

- [ ] The docs site builds as part of CI on every PR that touches docs content or configuration -- broken builds should block merge
- [ ] Build warnings are treated as errors in CI (`--strict` flag in Docusaurus, `strict: true` in MkDocs, `-W` in Sphinx) -- warnings about broken links or missing references indicate real problems
- [ ] The docs site is deployed automatically on merge to the default branch -- manual deployment processes lead to stale published docs
- [ ] Build failures on docs-only changes are not ignored ("it's just docs") -- broken docs are broken product
- [ ] Preview deployments are generated for PRs modifying docs so reviewers can see the rendered result

### Broken Links and Missing Pages
<!-- activation: keywords=["link", "href", "ref", "url", "redirect", "404", "anchor"] -->

- [ ] Internal links between documentation pages resolve correctly -- flag links to renamed, moved, or deleted pages
- [ ] Anchor links (links to specific headings) resolve -- headings get renamed during content updates but links to them do not get updated
- [ ] External links are periodically checked and known-dead links are removed or replaced
- [ ] When a page is moved or deleted, a redirect is configured in the site generator (Docusaurus `_redirects`, MkDocs redirect plugin, Sphinx `redirects`) so existing bookmarks continue working
- [ ] The docs site has a custom 404 page that helps users find what they were looking for

### Content Freshness
<!-- activation: keywords=["guide", "tutorial", "getting started", "configuration", "api", "example", "reference"] -->

- [ ] Code examples in documentation use the current API -- flag examples that reference removed functions, changed parameter names, or deprecated patterns
- [ ] Configuration guides reflect current configuration options -- flag documentation of removed or renamed config keys
- [ ] Getting started guides work when followed step-by-step against the current version of the software
- [ ] Screenshots and diagrams depict the current UI or output, not a previous version
- [ ] When the diff changes a public API or CLI command, corresponding documentation pages are updated in the same PR

### Search and Navigation
<!-- activation: keywords=["search", "algolia", "typesense", "lunr", "pagefind", "sidebar", "nav", "navigation", "menu"] -->

- [ ] Search is configured and functional -- Docusaurus local search or Algolia, MkDocs search plugin, Sphinx search, VitePress local search
- [ ] New documentation pages are added to the navigation sidebar or table of contents -- orphaned pages that exist but are not reachable via navigation are effectively invisible
- [ ] Navigation structure groups related content logically -- newly added pages are placed in the appropriate section, not appended to the end
- [ ] Search index is rebuilt as part of the deployment process so new content is searchable immediately

### Versioning and API Reference
<!-- activation: keywords=["version", "versioned", "typedoc", "javadoc", "rustdoc", "pydoc", "sphinx-apidoc", "auto-generate"] -->

- [ ] For libraries and APIs with multiple supported versions: the docs site provides version-specific documentation using the generator's versioning feature (Docusaurus versioned docs, MkDocs mike, Sphinx multiversion)
- [ ] API reference documentation is auto-generated from source code doc comments (TypeDoc, Javadoc, Rustdoc, Sphinx autodoc) rather than hand-written -- hand-written API docs drift from code
- [ ] Auto-generated API reference is regenerated as part of the docs build, not committed as a stale snapshot
- [ ] Version selectors in the docs site show only supported versions, not end-of-life releases without a clear EOL notice

## Common False Positives

- **Small projects without a docs site**: Not every project needs a dedicated documentation site. A well-maintained README may suffice for single-purpose libraries. Flag only when the project's complexity warrants structured documentation.
- **Docs-as-code in README only**: Some projects keep all documentation in the README and do not use a site generator. This is valid for small projects.
- **Third-party hosted docs**: Some projects use Notion, Confluence, or GitBook for documentation hosted outside the repo. If linked from the README, do not flag missing in-repo docs.
- **Work-in-progress docs site**: A newly configured docs site may be intentionally incomplete during initial setup. Flag only mature docs sites with clear gaps.

## Severity Guidance

| Finding | Severity |
|---|---|
| Docs site build is broken and cannot be deployed | Important |
| Code examples in docs reference APIs that no longer exist | Important |
| Getting started guide fails when followed against current version | Important |
| Broken internal links between documentation pages | Important |
| No CI build for the docs site | Minor |
| No search configured on docs site | Minor |
| New pages not added to navigation sidebar | Minor |
| Docs not versioned for a library with multiple supported versions | Minor |
| API reference is hand-written instead of auto-generated | Minor |
| Missing 404 page or redirects for moved content | Minor |

## See Also

- `doc-readme-root` -- the README links to the docs site; the docs site provides detailed content the README summarizes
- `doc-jsdoc-tsdoc-godoc-rustdoc-javadoc` -- doc comments in source code feed the auto-generated API reference on the docs site
- `doc-openapi-asyncapi` -- API specs can be rendered as interactive docs on the site (Redoc, Swagger UI)
- `pr-description-quality` -- PRs modifying docs should describe what content changed and why

## Authoritative References

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [MkDocs Documentation](https://www.mkdocs.org/)
- [Sphinx Documentation](https://www.sphinx-doc.org/)
- [VitePress Documentation](https://vitepress.dev/)
- [Starlight Documentation](https://starlight.astro.build/)
- [Diátaxis -- A Documentation Framework](https://diataxis.fr/)
