# Similar Projects

Projects with similar goals or overlapping functionality.

## claude-code-ui

- **URL**: https://github.com/KyleAMathews/claude-code-ui
- **Description**: Real-time dashboard for monitoring Claude Code sessions across multiple projects. Displays what Claude is working on, which sessions need approval, and tracks associated PRs and CI status.
- **Key features**: Kanban board by session status (Working, Needs Approval, Waiting, Idle), AI-powered session summaries, PR and CI tracking, multi-repo support, real-time updates via Durable Streams.
- **Stack**: React, TanStack Router/DB, Radix UI, Node.js daemon with XState, Chokidar for file watching, TypeScript.

## ClaudeAgentViewer (claudevu)

- **URL**: https://github.com/HemantKumarMS/ClaudeAgentViewer
- **Description**: High-performance terminal interface for monitoring Claude Code sessions locally. Reads session files from `~/.claude/` with no external data transmission.
- **Key features**: 3-level hierarchical view (projects/sessions/subagents), token and cost tracking with per-model pricing, usage dashboard with aggregates by project and model, environmental impact estimates (energy, CO2, tree-days), live monitoring with log tailing, fuzzy search, session resumption via `claude --resume`.
- **Stack**: Go 1.22+, Bubble Tea (Charm ecosystem), Lip Gloss.
