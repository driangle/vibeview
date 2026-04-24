# Claude Code Plugin

VibeView ships a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that adds a `/vibeview` skill to Claude Code. This lets you search, inspect, and analyze your session history directly from within a Claude Code conversation.

## Install

```bash
claude plugin add driangle/vibeview
```

Once installed, the `/vibeview` skill is available in all Claude Code sessions.

## What it does

The plugin gives Claude Code access to the `vibeview` CLI so it can answer questions like:

- "How much have I spent on Claude Code this week?"
- "Find the session where I worked on the auth middleware"
- "Show me the most expensive session"
- "What tools did I use most in the last project?"

Claude Code will run the appropriate `vibeview` command (`search`, `inspect`, `stats`, `sessions`, `show`) and interpret the results for you.

## Prerequisites

The `vibeview` binary must be installed and available on your `PATH`. See [Installation](../getting-started/installation) for setup instructions.

## Available commands

The skill exposes all vibeview CLI commands:

| Command | Use case |
|---------|----------|
| `vibeview search "<query>"` | Find sessions by keyword or topic |
| `vibeview sessions` | List and sort sessions by cost, date, messages |
| `vibeview inspect <id>` | Get detailed metadata for a session |
| `vibeview show <id>` | Read back conversation content |
| `vibeview stats` | Aggregate usage and cost reporting |
| `vibeview self` | Discover the current session from within Claude Code |

All commands support `--json` output for structured processing. See the [CLI reference](./cli) for full details.

## Example usage

```
You: How much have I spent on Claude Code this month?

Claude: I'll check your usage stats.
> vibeview stats --json
You've spent $142.30 across 87 sessions this month...
```

```
You: Find the session where I refactored the database layer

Claude: Let me search for that.
> vibeview search "database refactor"
Found 3 matching sessions...
```
