# GitHub Actions — Review Overlay

Load this overlay for the **Security**, **Reliability**, and **Supply Chain** specialists when GitHub Actions workflow files are being reviewed.

> **Canonical reference:** <https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions> — GitHub official hardening guide.

## Supply Chain — Action Pinning

- [ ] All third-party actions are pinned to a full commit SHA (`uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683`), not a mutable tag (`@v4`) or branch (`@main`)
- [ ] First-party GitHub actions (`actions/*`) are also pinned to a SHA for consistency; tags can be moved
- [ ] A comment alongside each SHA records the human-readable version it corresponds to (e.g., `# v4.1.1`) to aid future updates
- [ ] Dependency update tooling (Dependabot or Renovate) is configured to keep pinned action SHAs current

## Security — Secrets and Inputs

- [ ] Secrets are accessed only via `${{ secrets.NAME }}`; no secret values are echoed, printed, or interpolated into `run:` blocks where they could appear in logs
- [ ] `run:` steps that reference `${{ github.event.* }}` or any untrusted external input (PR title, branch name, issue body) do not interpolate those values directly into shell — use an intermediate environment variable instead (`env: VAR: ${{ github.event.pull_request.title }}` then `$VAR` in shell)
- [ ] `pull_request_target` trigger is used only when the workflow must access secrets from the base repo; it runs in the context of the base branch and can be exploited by malicious PRs if the `run:` step checks out and executes PR code
- [ ] No `GITHUB_TOKEN` write permissions are granted beyond what the job explicitly needs

## Permissions — Least Privilege

- [ ] Top-level `permissions: read-all` (or `permissions: {}`) is set, with individual jobs granting only the specific scopes they need (`contents: write`, `pull-requests: write`, etc.)
- [ ] Jobs that do not push, deploy, or modify repo state have `permissions: read-all` or no write permissions at all
- [ ] OIDC (`id-token: write`) is used to authenticate to cloud providers (AWS, GCP, Azure) instead of long-lived static credentials stored as secrets

## Reliability — Workflow Design

- [ ] `timeout-minutes` is set on jobs and/or steps that could hang; no job runs indefinitely on a stuck process
- [ ] Cache actions (`actions/cache`) use a cache key that changes when the lock file changes; stale caches do not mask dependency updates
- [ ] Artifact uploads (`actions/upload-artifact`) include attestation steps (`actions/attest-build-provenance`) for release artifacts that will be published
- [ ] Workflows that run on `push` to main and on PRs do not duplicate expensive jobs unnecessarily; use `workflow_call` reusable workflows or conditional steps
- [ ] Environment secrets (`environment: production`) gate deployment jobs behind required reviewers; production deployments do not run automatically on every push
