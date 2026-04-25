---
id: ai-llm-agent-design
type: primary
depth_role: leaf
focus: Detect unbounded agent loops, missing maximum iterations, absent human-in-the-loop for destructive actions, lost agent state on crash, missing reflection steps, and uncoordinated multi-agent systems
parents:
  - index.md
covers:
  - Agent loop with no maximum iteration limit
  - No termination condition beyond LLM deciding to stop
  - Missing human-in-the-loop for destructive or irreversible actions
  - "Agent state not persisted (lost on crash or restart)"
  - No reflection or self-critique step in multi-step reasoning
  - Multi-agent system without coordination protocol or shared state
  - Agent consuming entire token budget in a single loop
  - No graceful degradation when agent cannot complete task
tags:
  - agent
  - loop
  - iteration-limit
  - human-in-the-loop
  - state-persistence
  - multi-agent
  - reflection
activation:
  file_globs:
    - "**/*agent*"
    - "**/*loop*"
    - "**/*chain*"
    - "**/*workflow*"
    - "**/*orchestrat*"
    - "**/*planner*"
  keyword_matches:
    - agent
    - AgentExecutor
    - loop
    - iterate
    - step
    - max_iterations
    - human_in_the_loop
    - approve
    - persist
    - state
    - reflection
    - critique
    - multi_agent
    - supervisor
    - planner
  structural_signals:
    - unbounded_agent_loop
    - no_max_iterations
    - destructive_without_approval
source:
  origin: file
  path: ai-llm-agent-design.md
  hash: "sha256:2b94d4ce23554f06fa7a3ca789997bdc50b813dd4ca850be6569148686b5bd89"
---
# Agent Design

## When This Activates

Activates when diffs contain agent loop implementations, multi-step LLM workflows, agent executor configurations, or multi-agent coordination logic. Agents amplify both the capabilities and risks of LLMs -- an unbounded loop can exhaust API credits in minutes, a missing approval gate can delete production data, and lost state means hours of agent work vanish on a crash. This reviewer enforces structural safeguards around agent autonomy.

## Audit Surface

- [ ] While loop or recursive agent step with no iteration counter or max_iterations
- [ ] Agent termination relying solely on LLM producing a stop signal
- [ ] Destructive tool call without human approval gate
- [ ] Agent state stored only in memory with no persistence
- [ ] Multi-step agent with no reflection or plan-revision step
- [ ] Multiple agents without coordination protocol
- [ ] No token budget tracking within the agent loop
- [ ] No error handling for consecutive tool failures
- [ ] No observability on agent steps
- [ ] No fallback when agent is stuck

## Detailed Checks

### Loop Bounds and Termination
<!-- activation: keywords=["while", "loop", "iterate", "step", "max_iterations", "max_steps", "counter", "break", "terminate", "stop"] -->

- [ ] **No max iterations**: flag agent loops (while True, recursive step functions) with no maximum iteration counter -- a confused LLM can loop indefinitely, exhausting API credits and compute
- [ ] **Termination only via LLM signal**: flag agents that stop only when the LLM produces a "DONE" or finish_reason -- the LLM may never produce the stop signal; always combine LLM-driven termination with a hard iteration cap
- [ ] **No token budget tracking**: flag agent loops that do not track cumulative token usage and stop when approaching a budget limit -- without this, a single agent run can consume the monthly API budget
- [ ] **No consecutive failure limit**: flag agent loops with no check for repeated tool failures -- an agent that fails 5 times in a row is stuck and should escalate or terminate rather than keep retrying

### Human-in-the-Loop Controls
<!-- activation: keywords=["approve", "confirm", "human", "review", "gate", "checkpoint", "destructive", "delete", "deploy", "write", "payment"] -->

- [ ] **Destructive action without approval**: flag agent tool calls that perform write, delete, deploy, or payment operations without a human approval step -- the agent may hallucinate intent or be manipulated via prompt injection
- [ ] **No checkpoint before irreversible steps**: flag multi-step agents that do not checkpoint state before executing irreversible actions -- if the action fails or is wrong, there is no rollback point
- [ ] **No escalation path**: flag agents with no mechanism to escalate to a human when confidence is low or the task is ambiguous -- agents should be able to say "I need help" rather than guessing

### State Persistence and Recovery
<!-- activation: keywords=["state", "persist", "save", "checkpoint", "resume", "memory", "history", "store", "recover", "crash"] -->

- [ ] **In-memory-only state**: flag agent state (conversation history, plan, intermediate results) stored only in memory with no persistence to disk, database, or external store -- a crash or timeout loses all progress
- [ ] **No resume capability**: flag long-running agents (>5 minutes expected runtime) with no ability to resume from the last checkpoint after a failure -- the entire task restarts from scratch
- [ ] **Conversation history unbounded**: flag agent memory that appends every step's input and output to the conversation history without summarization or truncation -- this eventually exceeds the context window (see `ai-llm-frameworks-langchain-llamaindex-haystack-dspy`)

### Multi-Agent Coordination
<!-- activation: keywords=["multi_agent", "supervisor", "planner", "worker", "delegate", "coordinate", "handoff", "swarm", "crew"] -->

- [ ] **No coordination protocol**: flag multi-agent systems where agents communicate via shared mutable state without a defined protocol -- race conditions, conflicting actions, and infinite delegation loops result
- [ ] **No supervisor or arbiter**: flag multi-agent architectures where no agent has authority to resolve conflicts or terminate stuck sub-agents -- without a supervisor, the system deadlocks
- [ ] **Duplicate work across agents**: flag multi-agent systems where task assignment does not prevent multiple agents from working on the same sub-task -- wasted compute and conflicting results

## Common False Positives

- **Fixed-step pipelines**: sequential chains with a fixed number of steps (prompt -> parse -> validate) are not agent loops. Do not flag chains that always execute exactly N steps.
- **Developer CLI agents**: local development tools where the developer is always in the loop do not need explicit approval gates for every action.
- **Short-lived agents**: agents that complete in 1-3 steps with low cost do not need state persistence. Flag only when expected runtime or cost is significant.

## Severity Guidance

| Finding | Severity |
|---|---|
| No max iterations on agent loop | Critical |
| Destructive tool call without human approval gate | Critical |
| Agent state in memory only for long-running task | Important |
| No token budget tracking in agent loop | Important |
| No consecutive failure limit in agent loop | Important |
| Multi-agent system without coordination protocol | Important |
| No reflection step in complex multi-step agent | Minor |
| No observability (logging/tracing) on agent steps | Minor |

## See Also

- `ai-llm-tool-use-safety` -- tools invoked by agents need authorization and safety controls
- `ai-llm-prompt-injection-defense` -- agents are high-value injection targets due to tool access
- `ai-llm-cost-token-spend-monitoring` -- unbounded agent loops are the primary cost risk
- `principle-fail-fast` -- agent loops should fail fast on repeated errors rather than retrying indefinitely
- `reliability-timeout-deadline-propagation` -- agent execution needs an overall deadline

## Authoritative References

- [Anthropic, "Building Effective Agents"](https://docs.anthropic.com/en/docs/build-with-claude/agentic)
- [LangChain, "Agents" documentation](https://python.langchain.com/docs/concepts/agents/)
- [AutoGPT Architecture and Lessons Learned](https://github.com/Significant-Gravitas/AutoGPT)
- [OWASP Top 10 for LLM Applications -- LLM06: Excessive Agency](https://genai.owasp.org/)
