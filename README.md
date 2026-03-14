# VibeView

A local CLI tool that lets developers view their AI coding assistant sessions (Claude Code, Codex, Gemini CLI) in a clean, read-only web interface.

VibeView watches well-known session directories, detects conversations in real time, and presents them as a browsable chat UI — complete with tool calls, file edits, thinking blocks, and cost breakdowns.

## Features

- Browse all sessions in one place
- Real-time updates as conversations progress
- View full conversation detail: messages, tool calls, file edits, thinking blocks, costs
- Read-only — never modifies session data
- Configurable watch directories
- Local-first, runs on your machine

## Architecture

```
┌─────────────┐       HTTP/SSE        ┌─────────────────────┐
│  Go server  │ ◄───────────────────► │  React 19 SPA       │
│  (net/http) │                       │  (Vite + Tailwind)   │
└──────┬──────┘                       └─────────────────────┘
       │
       │ watches
       ▼
  ~/.claude/projects/
  (session directories)
```

**Backend:** Go, standard library `net/http` (no framework)
**Frontend:** React 19, TypeScript, Vite, Tailwind CSS, SWR, React Router

## Status

Early development — see [docs/specs/2026-03-15-mvp-spec.md](docs/specs/2026-03-15-mvp-spec.md) for the MVP plan.
