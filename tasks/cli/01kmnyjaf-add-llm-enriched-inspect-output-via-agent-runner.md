---
title: "Add LLM-enriched inspect output via agent-runner"
id: "01kmnyjaf"
status: pending
priority: medium
type: feature
tags: ["inspect", "llm"]
dependencies: ["01kmnygwh"]
created: "2026-03-26"
---

# Add LLM-enriched inspect output via agent-runner

## Objective

Add an opt-in `--enrich` flag to `vibeview inspect` that uses an LLM (via Claude CLI through [agent-runner](https://github.com/driangle/agent-runner)) to derive higher-level insights from session data that can't be computed mechanically. This includes a natural-language summary of what the session accomplished, key decisions made, and a quality assessment of how cleanly the session went. Requires explicit user confirmation before making any LLM calls.

## Tasks

- [ ] Add `--enrich` flag to the inspect command
- [ ] Prompt the user for confirmation before calling the LLM (e.g. "This will send session data to Claude. Continue? [y/N]")
- [ ] Integrate [agent-runner](https://github.com/driangle/agent-runner) as a dependency for invoking Claude CLI
- [ ] Design the prompt: pass session metadata, tool usage, errors, files changed, and conversation content to Claude for analysis
- [ ] Parse LLM response into structured sections: summary, key decisions, session quality assessment
- [ ] Render enriched sections in the styled terminal output (appended after the mechanical sections)
- [ ] Handle errors gracefully (Claude CLI not installed, agent-runner failure, timeout)
- [ ] Skip confirmation with `--enrich --yes` for scripting use cases
- [ ] Add tests for the enrichment flow (mock agent-runner calls)

## Acceptance Criteria

- `vibeview inspect <id>` without `--enrich` never calls an LLM
- `--enrich` prompts for user confirmation before proceeding
- `--enrich --yes` skips the confirmation prompt
- LLM-derived sections are clearly labeled as AI-generated in the output
- If Claude CLI is not available, `--enrich` fails with a clear error message
- Session data is sent to Claude via agent-runner (not a direct API call)
- Enriched output includes at minimum: a 1-2 sentence summary and key decisions list
