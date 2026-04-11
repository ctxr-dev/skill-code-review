---
tools:
  - name: hadolint
    command: "hadolint --format json Dockerfile"
    purpose: "Dockerfile best practices linter"
---

# Docker — Review Overlay

Load this overlay for the **Security**, **Reliability**, and **Build** specialists when Dockerfiles or Docker Compose files are being reviewed.

> **Canonical reference:** <https://docs.docker.com/build/building/best-practices/> — Docker official best practices.

## Image Safety

- [ ] Base images are pinned to a specific digest or immutable tag (e.g., `node:20.12.1-alpine3.19` or `node@sha256:…`); `latest` and floating minor tags are absent
- [ ] A non-root user is created and set via `USER` before the final `CMD` / `ENTRYPOINT`; the process does not run as `root` inside the container
- [ ] No secrets, credentials, API keys, or tokens appear in any `ENV`, `ARG`, or `RUN` layer — they cannot be removed from the image history after the fact
- [ ] `.dockerignore` exists and excludes `.git`, `node_modules`, `.env` files, local secrets, and build artifacts that should not enter the build context

## Build Efficiency

- [ ] Multi-stage builds are used to separate build-time dependencies from the runtime image; the final stage contains only what is needed to run the application
- [ ] `COPY` instructions are ordered from least-frequently-changed to most-frequently-changed to maximize layer cache reuse (e.g., copy dependency manifests before source code)
- [ ] `COPY` is used instead of `ADD` for local files; `ADD` is reserved for remote URLs or tar auto-extraction where its behavior is intentional
- [ ] `RUN` commands that install packages clean up their cache in the same layer (`apt-get clean && rm -rf /var/lib/apt/lists/*`) to avoid cache bloat in the layer

## Runtime Safety

- [ ] A `HEALTHCHECK` instruction is defined so the container orchestrator can detect a stuck or failed process
- [ ] `CMD` and `ENTRYPOINT` use JSON array form (`["executable", "arg"]`) rather than shell form to ensure signals are delivered to the application, not a shell wrapper
- [ ] Container does not run with `--privileged` or unnecessary capabilities in deployment manifests; capabilities are dropped with `--cap-drop ALL` and added back selectively
- [ ] Exposed ports (`EXPOSE`) match the ports the application actually listens on; no extra ports are exposed

## Compose-Specific

- [ ] Service images in `docker-compose.yml` for production or staging environments are pinned, not `build: .` with no tag
- [ ] Secrets in Compose files use `secrets:` top-level config or environment variable substitution from a `.env` file that is gitignored — not hardcoded values
- [ ] Resource limits (`mem_limit`, `cpus`) are defined for services that run in resource-constrained environments
