---
title: "Add AI enrichment backend endpoints with agent-runner"
id: "01kma9rhy"
status: pending
priority: low
type: feature
tags: ["timeline", "backend", "ai-enrichment"]
created: "2026-03-22"
dependencies: ["01kma9rgj"]
---

# Add AI enrichment backend endpoints with agent-runner

## Objective

Add backend API endpoints that let the frontend trigger AI-powered semantic enrichment of a session's timeline. Uses the [agent-runner](https://github.com/driangle/agent-runner) Go library to invoke Claude CLI, which analyzes the conversation and returns phase summaries, node titles, intent tags, key decisions, and a narrative summary.

## Tasks

### Core enrichment service (shared by CLI and API)
- [ ] Add `agentrunner` Go dependency to the CLI module
- [ ] Define the enrichment data model in Go: `SessionEnrichment`, `PhaseEnrichment`, `CycleEnrichment`, `KeyDecision`
- [ ] Design the enrichment prompt — include session messages (or a summary for very long sessions) and request structured JSON output matching the enrichment schema
- [ ] Create a core enrichment service that accepts session data, invokes Claude CLI via `agentrunner.Run()` with a budget cap, and returns a parsed `SessionEnrichment`
- [ ] Add error handling in the service: agent-runner failures, budget exceeded, Claude CLI not installed
- [ ] Add caching: store/load enrichment results as `{sessionId}.enrichment.json` in VibeView's data directory

### API endpoints
- [ ] Create `POST /api/sessions/{id}/enrich` endpoint that calls the enrichment service and returns the result
- [ ] Create `GET /api/sessions/{id}/enrichment` endpoint that returns cached enrichment if available (404 if not)
- [ ] Support re-enrichment (POST overwrites existing cached result)

## Acceptance Criteria

- Core enrichment service is reusable by both API endpoints and CLI commands
- `POST /api/sessions/{id}/enrich` triggers a Claude CLI call and returns valid enrichment JSON
- `GET /api/sessions/{id}/enrichment` returns cached results or 404
- Enrichment results persist across server restarts
- Errors (missing Claude CLI, budget exceeded) return descriptive error responses
- Budget cap prevents runaway costs (configurable, default $0.10)
