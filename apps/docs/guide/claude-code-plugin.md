# Claude Code Plugin

vibeview ships a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that adds a `/vibeview` skill to Claude Code. This lets you search, inspect, and analyze your session history directly from within a Claude Code conversation.

## Install

First, add the vibeview marketplace:

```bash
claude plugin marketplace add driangle/vibeview
```

Then install the plugin:

```bash
# Install for the current project
claude plugin install vibeview@vibeview-marketplace --scope project

# Or install for all projects (user-wide)
claude plugin install vibeview@vibeview-marketplace --scope user

# Or install for the current directory only
claude plugin install vibeview@vibeview-marketplace --scope local
```

Once installed, the `/vibeview` skill is available in all Claude Code sessions.

## What it does

The plugin gives Claude Code access to the `vibeview` CLI so it can answer questions like:

- "Find the session where I worked on the auth middleware"
- "Show me the sessions with the most messages"
- "What tools did I use most in the last project?"

Claude Code will run the appropriate `vibeview` command (`search`, `inspect`, `stats`, `sessions`, `show`) and interpret the results for you.

## Prerequisites

The `vibeview` binary must be installed and available on your `PATH`. See [Installation](../getting-started/installation) for setup instructions.

## Available commands

The skill exposes all vibeview CLI commands:

| Command | Use case |
|---------|----------|
| `vibeview search "<query>"` | Find sessions by keyword or topic |
| `vibeview sessions` | List and sort sessions by date, messages, model, or directory |
| `vibeview inspect <id>` | Get detailed metadata for a session |
| `vibeview show <id>` | Read back conversation content |
| `vibeview stats` | Summarize activity across sessions and projects |
| `vibeview self` | Discover the current session from within Claude Code |

All commands support `--json` output for structured processing. See the [CLI reference](./cli) for full details.

## Example usage

```
You: Which models did I use most this month?

Claude: I'll check your session stats.
> vibeview stats --json
You used claude-sonnet-4-6 in 63 of 87 sessions this month...
```

```
You: Find the session where I refactored the database layer

Claude: Let me search for that.
> vibeview search "database refactor"
Found 3 matching sessions...
```
