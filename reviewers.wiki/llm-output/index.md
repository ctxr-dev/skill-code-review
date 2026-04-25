---
id: llm-output
type: index
depth_role: subcategory
depth: 1
focus: "CLI missing --help/-h or --version/-V; Commands always exit 0 regardless of success or failure; Cross-platform compatibility — Windows vs Linux vs macOS; Destructive commands without --confirm or dry-run"
parents:
  - "../index.md"
shared_covers: []
entries:
  - id: ai-llm-output-validation-structured
    file: ai-llm-output-validation-structured.md
    type: primary
    focus: "Detect LLM output parsed without schema validation, JSON mode not used when available, missing retry on malformed output, lack of Pydantic/Zod validation, and raw LLM text rendered as HTML"
    tags:
      - LLM-output
      - validation
      - structured-output
      - JSON-mode
      - XSS
      - Pydantic
      - Zod
      - parsing
  - id: ai-llm-tool-use-safety
    file: ai-llm-tool-use-safety.md
    type: primary
    focus: Detect tools executing arbitrary code from LLM output, tools without authorization checks, unvalidated tool output returned to the LLM, missing tool timeouts, and non-idempotent tool side effects
    tags:
      - tool-use
      - function-calling
      - LLM-safety
      - authorization
      - idempotency
      - sandbox
      - agent
  - id: cli-tui-ux-design
    file: cli-tui-ux-design.md
    type: primary
    focus: "Detect CLI/TUI ergonomics failures -- missing --help/--version, inconsistent flag naming, broken piping, interactive prompts without non-interactive fallback, missing signal handling, and disregard for NO_COLOR and tty detection"
    tags:
      - cli
      - tui
      - ux
      - flags
      - exit-codes
      - signals
      - tty
      - no-color
      - completion
      - piping
  - id: lang-powershell
    file: lang-powershell.md
    type: primary
    focus: Catch pipeline errors, security anti-patterns, and non-idiomatic patterns in PowerShell code
    tags:
      - powershell
      - windows
      - devops
      - automation
      - scripting
      - security
children: []
---
<!-- BEGIN AUTO-GENERATED NAVIGATION -->

# Llm Output

**Focus:** CLI missing --help/-h or --version/-V; Commands always exit 0 regardless of success or failure; Cross-platform compatibility — Windows vs Linux vs macOS; Destructive commands without --confirm or dry-run

## Children

| File | Type | Focus |
|------|------|-------|
| [ai-llm-output-validation-structured.md](ai-llm-output-validation-structured.md) | 📄 primary | Detect LLM output parsed without schema validation, JSON mode not used when available, missing retry on malformed output, lack of Pydantic/Zod validation, and raw LLM text rendered as HTML |
| [ai-llm-tool-use-safety.md](ai-llm-tool-use-safety.md) | 📄 primary | Detect tools executing arbitrary code from LLM output, tools without authorization checks, unvalidated tool output returned to the LLM, missing tool timeouts, and non-idempotent tool side effects |
| [cli-tui-ux-design.md](cli-tui-ux-design.md) | 📄 primary | Detect CLI/TUI ergonomics failures -- missing --help/--version, inconsistent flag naming, broken piping, interactive prompts without non-interactive fallback, missing signal handling, and disregard for NO_COLOR and tty detection |
| [lang-powershell.md](lang-powershell.md) | 📄 primary | Catch pipeline errors, security anti-patterns, and non-idiomatic patterns in PowerShell code |

<!-- END AUTO-GENERATED NAVIGATION -->

<!-- BEGIN AUTHORED ORIENTATION -->
<!-- END AUTHORED ORIENTATION -->
