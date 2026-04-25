---
id: ai-llm-bias-and-privacy-leakage
type: primary
depth_role: leaf
focus: Detect PII in training data or prompts, model output containing PII from context, missing content filtering, bias in prompt design, and absent fairness evaluation
parents:
  - index.md
covers:
  - PII included in prompts or fine-tuning data without anonymization
  - Model output containing PII leaked from context or training data
  - No content filtering on LLM input or output
  - "Bias in prompt design (stereotyping, demographic assumptions)"
  - Missing fairness evaluation across demographic groups
  - User data sent to third-party LLM API without consent or data processing agreement
  - Conversation logs stored without PII redaction
tags:
  - privacy
  - PII
  - bias
  - fairness
  - content-filtering
  - GDPR
  - data-protection
  - ethics
activation:
  file_globs:
    - "**/*llm*"
    - "**/*prompt*"
    - "**/*chat*"
    - "**/*filter*"
    - "**/*moderate*"
    - "**/*pii*"
    - "**/*privacy*"
  keyword_matches:
    - PII
    - pii
    - personal
    - email
    - phone
    - ssn
    - address
    - redact
    - anonymize
    - filter
    - moderate
    - moderation
    - bias
    - fairness
    - demographic
    - content_filter
    - data_processing
  structural_signals:
    - pii_in_prompt
    - no_content_filter
    - unredacted_logs
source:
  origin: file
  path: ai-llm-bias-and-privacy-leakage.md
  hash: "sha256:4d30621443b0dd4d48f527e3f057b5c814dd6c09f7a269825a822c646ce573d0"
---
# Bias and Privacy Leakage

## When This Activates

Activates when diffs construct LLM prompts with user data, configure content filtering, prepare fine-tuning datasets, store conversation logs, or implement LLM-based decision systems. LLMs are both amplifiers and leakers of sensitive data -- PII sent in prompts may be logged by providers, reproduced in outputs, or memorized during fine-tuning. Bias in prompts propagates to outputs, and outputs used for decisions about people require fairness evaluation.

## Audit Surface

- [ ] User PII included in prompt context
- [ ] Fine-tuning dataset with unredacted PII
- [ ] No PII redaction on LLM input
- [ ] No PII detection on LLM output
- [ ] Prompt with demographic assumptions
- [ ] No fairness evaluation
- [ ] User data sent to external API without DPA
- [ ] Conversation logs stored with PII
- [ ] No content filtering for harmful content
- [ ] LLM decisions affecting individuals without bias audit

## Detailed Checks

### PII in Prompts and Context
<!-- activation: keywords=["PII", "pii", "personal", "email", "phone", "ssn", "name", "address", "user_data", "customer", "patient", "redact", "anonymize", "mask"] -->

- [ ] **PII in prompt context**: flag user PII (full name, email, phone, SSN, credit card, medical records) included in LLM prompt context without redaction or pseudonymization -- PII sent to third-party APIs may be logged, used for training, or exposed in data breaches
- [ ] **No PII redaction pipeline**: flag LLM API calls with user data but no PII detection or redaction step before the data reaches the prompt -- use NER-based PII detectors (Presidio, spaCy, regex patterns) to redact PII before sending to the LLM
- [ ] **PII in conversation logs**: flag conversation history storage (database, log files, analytics) that does not redact PII before persistence -- stored PII in logs creates compliance exposure (GDPR, CCPA, HIPAA)
- [ ] **PII in fine-tuning data**: flag fine-tuning datasets containing unredacted PII -- models can memorize and reproduce PII from training data in unrelated contexts

### Data Processing and Consent
<!-- activation: keywords=["consent", "privacy", "GDPR", "CCPA", "HIPAA", "data_processing", "DPA", "agreement", "third_party", "API", "external"] -->

- [ ] **No data processing agreement**: flag user data sent to third-party LLM APIs (OpenAI, Anthropic, Cohere) without a data processing agreement (DPA) in place -- DPAs are legally required under GDPR for processing EU personal data
- [ ] **No user consent for AI processing**: flag user data processed by LLMs without the user being informed that their data will be sent to an AI service -- transparency requirements exist under multiple privacy regulations
- [ ] **Data retained by provider**: flag use of LLM API endpoints that may retain input data for training (check provider terms) when processing sensitive data -- use zero-data-retention API tiers where available

### Content Filtering
<!-- activation: keywords=["filter", "moderate", "moderation", "content", "safety", "harmful", "toxic", "hate", "violence", "nsfw"] -->

- [ ] **No input content filter**: flag user-facing LLM applications with no content filtering or moderation on user input -- without filtering, users can elicit harmful, hateful, or illegal content from the model
- [ ] **No output content filter**: flag LLM output displayed to users without content moderation -- even with input filtering, models can generate inappropriate content; use the provider's moderation API or a content classifier
- [ ] **No harmful content handling**: flag content filter detections that are logged but not acted upon -- detected harmful content should be blocked, not just logged

### Bias and Fairness
<!-- activation: keywords=["bias", "fairness", "demographic", "gender", "race", "age", "stereotype", "discriminat", "evaluate", "audit"] -->

- [ ] **Biased prompt design**: flag prompts that embed demographic assumptions, stereotypes, or use non-inclusive language -- biased prompts produce biased outputs
- [ ] **No fairness evaluation**: flag LLM-based decision systems (hiring screening, loan assessment, content moderation) deployed without fairness evaluation across demographic groups -- disparate impact may violate anti-discrimination law
- [ ] **No bias testing in eval suite**: flag LLM evaluation suites that do not include bias and fairness test cases -- add test examples that probe for demographic bias in outputs

### Logging and Data Retention
<!-- activation: keywords=["log", "logging", "store", "retain", "retention", "audit", "conversation", "history", "delete", "expiry"] -->

- [ ] **No data retention policy**: flag conversation logs and prompt histories stored without a defined retention period or expiry mechanism -- indefinite retention increases privacy exposure and may violate data minimization principles under GDPR
- [ ] **Audit trail missing**: flag LLM-powered decision systems with no audit log linking the decision to the input data, prompt, model version, and output -- audit trails are required for regulatory compliance and dispute resolution
- [ ] **No opt-out mechanism**: flag user-facing LLM features with no mechanism for users to opt out of AI processing -- GDPR Article 22 gives individuals the right not to be subject to solely automated decision-making

## Common False Positives

- **PII required by the task**: some applications legitimately need PII in context (personal assistant, CRM summarization). Flag only when PII is unnecessarily included or not protected in transit and at rest.
- **Internal-only tools**: applications processing data that never leaves the organization's infrastructure have lower privacy risk. Note the deployment context.
- **Provider zero-retention tiers**: when using zero-data-retention API tiers with a DPA in place, sending PII is acceptable (though redaction is still preferred as defense in depth).

## Severity Guidance

| Finding | Severity |
|---|---|
| PII sent to third-party LLM API without DPA | Critical |
| PII in fine-tuning dataset without redaction | Critical |
| LLM-based decisions on individuals without fairness evaluation | Important |
| No PII redaction on LLM input containing user data | Important |
| Conversation logs stored with unredacted PII | Important |
| No content filtering on user-facing LLM application | Important |
| Biased language in prompt design | Minor |
| No bias test cases in evaluation suite | Minor |

## See Also

- `ai-llm-prompt-injection-defense` -- injection can extract PII from context
- `ai-llm-eval-harness` -- fairness evaluation as part of the eval strategy
- `sec-owasp-a03-injection` -- PII exposure via injection attacks
- `ai-llm-output-validation-structured` -- output filtering can catch leaked PII

## Authoritative References

- [OWASP Top 10 for LLM Applications -- LLM06: Sensitive Information Disclosure](https://genai.owasp.org/)
- [Microsoft Presidio -- PII detection and anonymization](https://microsoft.github.io/presidio/)
- [NIST AI 100-1, "AI Risk Management Framework"](https://www.nist.gov/artificial-intelligence/ai-risk-management-framework)
- [EU AI Act -- requirements for high-risk AI systems](https://artificialintelligenceact.eu/)
- [OpenAI, "Moderation API"](https://platform.openai.com/docs/guides/moderation)
