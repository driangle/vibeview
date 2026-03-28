---
title: "Add LLM-enriched inspect output via agent-runner"
id: "01kmnyjaf"
status: pending
priority: medium
type: feature
tags: ["inspect", "llm"]
dependencies: ["01kmnygwh", "01kma9rhy"]
created: "2026-03-26"
---

# Add LLM-enriched inspect output via agent-runner

## Objective

Add an opt-in `--enrich` flag to `vibeview inspect` that uses an LLM (via Claude CLI through [agent-runner](https://github.com/driangle/agent-runner)) to derive higher-level insights from session data that can't be computed mechanically. This includes a natural-language summary of what the session accomplished, key decisions made, and a quality assessment of how cleanly the session went. Requires explicit user confirmation before making any LLM calls.

## Tasks

- [ ] Add `--enrich` flag to the inspect command
- [ ] Prompt the user for confirmation before calling the LLM (e.g. "This will send session data to Claude. Continue? [y/N]")
- [ ] Call the core enrichment service (from 01kma9rhy) with the session data
- [ ] Render enriched sections in the styled terminal output (appended after the mechanical sections)
- [ ] Skip confirmation with `--enrich --yes` for scripting use cases
- [ ] Add tests for the enrichment flow (mock enrichment service calls)

## Acceptance Criteria

- `vibeview inspect <id>` without `--enrich` never calls an LLM
- `--enrich` prompts for user confirmation before proceeding
- `--enrich --yes` skips the confirmation prompt
- LLM-derived sections are clearly labeled as AI-generated in the output
- If Claude CLI is not available, `--enrich` fails with a clear error message (error surfaced from core enrichment service)
- Enriched output includes at minimum: a 1-2 sentence summary and key decisions list
