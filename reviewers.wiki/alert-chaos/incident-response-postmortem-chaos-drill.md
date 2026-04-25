---
id: incident-response-postmortem-chaos-drill
type: primary
depth_role: leaf
focus: Detect gaps in incident response, postmortem discipline, chaos engineering, and DR drills -- absent templates, blameful language, unowned action items, untested game-days, and repeated incidents without systemic fixes
parents:
  - index.md
covers:
  - No postmortem template; write-ups vary in structure and content
  - "Blameful language in postmortems (named individuals, 'should have')"
  - Action items without owner or deadline
  - "Severity levels (SEV1..4) not defined or inconsistently used"
  - "MTTD / MTTR / MTTA not measured or not tracked over time"
  - "Chaos experiments run in prod without safety limits / abort criteria"
  - Game-days not scheduled on a regular cadence
  - DR drills exist only on paper; never executed end-to-end
  - Incident ticket system disconnected from alerting channels
  - "No incident-communication template (status page, exec update, customer)"
  - Postmortems not shared beyond immediate responders
  - Repeated incidents against the same root cause with no systemic fix
tags:
  - incident-response
  - postmortem
  - chaos-engineering
  - gameday
  - dr-drill
  - mttr
  - mtta
  - sev
  - runbook
  - blameless
activation:
  file_globs:
    - "**/runbooks/**"
    - "**/postmortems/**"
    - "**/post-mortems/**"
    - "**/incidents/**"
    - "**/chaos/**"
    - "**/gameday/**"
    - "**/dr/**"
    - "**/disaster-recovery/**"
  keyword_matches:
    - incident
    - postmortem
    - post-mortem
    - RCA
    - root cause
    - SEV
    - severity
    - war room
    - chaos engineering
    - gameday
    - game-day
    - dr drill
    - disaster recovery
    - MTTR
    - MTTD
    - MTTA
    - blast radius
    - blameless
  structural_signals:
    - postmortem_template_missing
    - action_items_unowned
    - chaos_without_safety_limits
source:
  origin: file
  path: incident-response-postmortem-chaos-drill.md
  hash: "sha256:39c862abdcf862aabd2f4212d8bd6b6553c3b321cd4f6933fd9ea39c9bcb92c6"
---
# Incident Response, Postmortems, Chaos, and DR Drills

## When This Activates

Activates when diffs touch runbooks, postmortem documents, chaos-engineering configs, game-day plans, or DR procedures. Incident response is a cultural contract more than a technical one: the postmortem template determines whether learning happens, the severity taxonomy determines whether the right people show up, and the cadence of chaos experiments and DR drills determines whether the runbooks actually work. A skipped drill or an unowned action item is a latent bug with months-long dwell time. This reviewer enforces the structural practices that the literature (Allspaw, Google SRE, Beyer, Basiri) has converged on.

## Audit Surface

- [ ] Postmortem template missing or inconsistently applied
- [ ] Blameful language (named individuals, should-have statements)
- [ ] Action items without owner or deadline
- [ ] Severity levels undefined or inconsistently used
- [ ] MTTD / MTTA / MTTR not measured per severity
- [ ] Chaos experiments run in prod without safety limits
- [ ] Game-days not on a regular cadence (quarterly or better)
- [ ] DR drills not executed end-to-end (paper-only)
- [ ] Alerting not wired to incident-ticket auto-creation
- [ ] Status-page / customer-comms templates missing
- [ ] Postmortems not shared beyond immediate responders
- [ ] Repeated incidents against the same cause with no systemic fix
- [ ] Incident roles (IC, Comms, Scribe) not defined or staffed

## Detailed Checks

### Postmortem Template and Blamelessness
<!-- activation: keywords=["postmortem", "post-mortem", "RCA", "root cause", "template", "blameless", "5 whys", "timeline", "contributing factors"] -->

- [ ] **Template missing / inconsistent**: flag `postmortems/` without a `TEMPLATE.md` (or link to one) -- ad-hoc write-ups miss timeline, contributing factors, and action items. Template should cover: summary, impact, timeline (UTC), detection path, contributing factors, action items, lessons.
- [ ] **Blameful language**: flag postmortems that name individuals ("@alice pushed the change", "Bob forgot to ...") or use "should have" / "failed to" framings -- drives cover-up behaviour on subsequent incidents. Replace with systemic framings ("the deploy tool permitted X without Y guardrail").
- [ ] **No contributing-factors analysis**: flag postmortems with a single "root cause" line -- real incidents are multi-causal (latent bug, missing alarm, ambiguous runbook). Enforce an explicit contributing-factors section.
- [ ] **Impact not quantified**: flag incidents without user-visible impact quantified (users affected, requests failed, revenue / SLO burn) -- prioritisation of action items becomes guesswork.

### Action Items, Tracking, and Follow-through
<!-- activation: keywords=["action item", "follow-up", "owner", "deadline", "due date", "remediation", "tracker", "Jira", "Linear"] -->

- [ ] **Action items unowned**: flag postmortems with action items missing `@owner` or a due date -- unowned items do not happen. Tracker links should resolve to live tickets.
- [ ] **No stale-item review**: flag repositories of postmortems with no process to review open action items regularly -- aging items accumulate and the backlog becomes meaningless.
- [ ] **Action items that are "add monitoring" without specifics**: flag vague remediations (add alerting, improve observability) not reduced to concrete alerts, dashboards, or SLOs -- see `obs-alerting-discipline` and `obs-sli-slo-error-budgets`.

### Severity Taxonomy and Metrics
<!-- activation: keywords=["SEV", "severity", "SEV1", "SEV2", "MTTD", "MTTA", "MTTR", "priority", "P0", "P1"] -->

- [ ] **Severity taxonomy undefined**: flag the absence of a written SEV1..4 (or P0..P3) definition with clear criteria -- responders disagree about whether to page and who to involve. Definitions should tie to measurable impact (user %, revenue, SLO burn).
- [ ] **MTTD / MTTA / MTTR not tracked**: flag incident tooling / dashboards that do not surface these metrics per severity over time -- trends are the signal that process is improving or regressing.
- [ ] **Severity assigned but never revisited**: flag workflows that fix severity at declaration and never reassess -- incidents escalate and deescalate, and the record should reflect peak severity.

### Roles, Communication, and Customer Updates
<!-- activation: keywords=["incident commander", "IC", "Scribe", "Comms", "status page", "customer update", "exec update", "war room"] -->

- [ ] **Roles undefined**: flag runbooks that do not define Incident Commander, Communications Lead, and Scribe roles -- without a named IC, decisions stall during high-pressure moments.
- [ ] **No status-page / customer-comms templates**: flag incident runbooks that do not reference pre-written templates for customer updates, exec updates, and support macros -- teams improvise under pressure and leak sensitive internal context.
- [ ] **Status cadence missing**: flag the absence of a defined update cadence (e.g., "customer update every 30 min while SEV1 active") -- silence erodes trust with customers.

### Chaos Engineering Safety
<!-- activation: keywords=["chaos", "chaos mesh", "gremlin", "litmus", "blast radius", "abort", "guardrail", "steady state", "experiment"] -->

- [ ] **Prod chaos without safety limits**: flag chaos experiment configs without explicit `blast_radius` / target percentage and without `abort_on` health-check clauses -- a poorly scoped experiment becomes a real incident. Require an auto-abort when SLO burn or error rate crosses thresholds.
- [ ] **No steady-state hypothesis**: flag experiments that do not define "steady state" (the metric proving the system is healthy) before injecting failure -- you cannot tell whether the experiment revealed a defect vs. normal noise.
- [ ] **Experiments not peer-reviewed**: flag chaos experiments that roll out without a reviewer sign-off on blast radius and rollback plan -- cultural safeguard as much as technical one.

### Game-days and DR Drills
<!-- activation: keywords=["gameday", "game-day", "dr drill", "disaster recovery", "failover drill", "tabletop", "exercise", "simulate"] -->

- [ ] **No regular cadence**: flag game-day / DR calendars that are blank or older than one quarter -- muscle memory atrophies and untested runbooks accumulate errors.
- [ ] **DR drill paper-only**: flag DR runbooks whose "last executed" field is empty, "never", or older than a year -- paper DR plans reliably fail when first exercised for real.
- [ ] **Failover drills without measurable exit criteria**: flag drills that "simulate region X down" without defined RTO/RPO targets and an evaluation against them -- see `reliability-multi-region-failover`.

### Alert-to-Incident Pipeline and Knowledge Sharing
<!-- activation: keywords=["alert", "PagerDuty", "Opsgenie", "Jira", "incident ticket", "share", "distribution", "eng-wide", "repeat"] -->

- [ ] **Alerting not wired to incident tickets**: flag alerting configs that page an on-call person without automatically creating an incident ticket -- postmortems depend on ticket threads to reconstruct timelines.
- [ ] **Postmortems not distributed**: flag postmortems whose visibility is limited to the on-call team -- organisational learning requires broader share (eng-wide all-hands, incident newsletter, or review meeting).
- [ ] **Repeat incidents unreviewed**: flag clusters of incidents with the same root cause across multiple postmortems without a designated follow-up owner -- systemic fix is missing. Introduce a repeat-incident metric and review it periodically.

## Common False Positives

- **Small teams / early-stage products**: a four-person startup cannot run quarterly game-days. Flag only when headcount and customer impact justify process investment; encourage minimum viable practice (postmortem template, severity taxonomy) regardless.
- **Internal-only systems**: DR drills for a low-criticality internal tool can be paper-only; the finding should note the reduced severity rather than block.
- **Security incidents**: may warrant restricted distribution by policy; a limited-share postmortem is acceptable if the restriction is deliberate and documented.

## Severity Guidance

| Finding | Severity |
|---|---|
| Chaos in prod without blast_radius / abort_on | Critical |
| DR drill never executed end-to-end | Critical |
| Severity taxonomy undefined | Important |
| Postmortem template missing | Important |
| Blameful language in postmortems | Important |
| Action items without owner / deadline | Important |
| MTTD / MTTA / MTTR not measured | Important |
| Alerting not wired to incident-ticket creation | Important |
| Incident roles (IC, Comms, Scribe) undefined | Important |
| Repeat incidents without systemic fix tracking | Important |
| Status-page / customer-comms templates missing | Important |
| Game-days not on a regular cadence | Minor |
| Postmortems not shared beyond on-call | Minor |

## See Also

- `obs-sli-slo-error-budgets` -- severity taxonomy should tie to SLO burn; action items often close out as new SLOs
- `obs-alerting-discipline` -- alerts feed the incident pipeline; noisy alerts undermine MTTA
- `reliability-multi-region-failover` -- DR drills exercise exactly this surface; drills without it are theatre
- `reliability-health-checks` -- health-check accuracy drives both detection time and chaos-experiment abort criteria

## Authoritative References

- [Google SRE Book, "Postmortem Culture: Learning from Failure"](https://sre.google/sre-book/postmortem-culture/)
- [Google SRE Workbook, "Incident Response"](https://sre.google/workbook/incident-response/)
- [Principles of Chaos Engineering](https://principlesofchaos.org/)
- [Basiri et al., "Chaos Engineering" (O'Reilly)](https://www.oreilly.com/library/view/chaos-engineering/9781491988459/)
- [PagerDuty Incident Response Documentation](https://response.pagerduty.com/)
- [Etsy, "Blameless Postmortems"](https://www.etsy.com/codeascraft/blameless-postmortems/)
- [AWS Well-Architected, "Reliability Pillar -- Testing DR"](https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html)
