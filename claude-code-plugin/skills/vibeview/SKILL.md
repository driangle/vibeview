---
description: Use the vibeview CLI to browse, search, inspect, and analyze Claude Code sessions. Trigger when the user asks about their session history, token usage, costs, past conversations, or wants to find something they discussed previously.
---

# VibeView CLI

VibeView is a CLI tool for browsing and analyzing Claude Code sessions. It reads session data from `~/.claude` and provides commands to search, inspect, and report on past conversations.

**Prerequisite:** `vibeview` must be installed and available in PATH. If not found, tell the user to install it with `go install github.com/gg/vibeview/apps/cli/cmd/vibeview@latest` or `brew install vibeview`.

## Commands

### Search sessions

Find sessions by content. Returns matching sessions with context snippets.

```
vibeview search "<query>"
vibeview search --limit 5 "<query>"
vibeview search --dirs myproject "<query>"
vibeview search --json "<query>"
```

### List sessions

Browse all sessions in a table format.

```
vibeview sessions
vibeview sessions --sort cost          # sort by: timestamp, cost, messages, model, dir
vibeview sessions --dir myproject      # filter by project directory
vibeview sessions --limit 10 --offset 20
vibeview sessions --json
```

### Show a session conversation

Render a session as readable text. Accepts a session ID (full or prefix) or a `.jsonl` file path.

```
vibeview show <session-id>
vibeview show --verbose <session-id>   # expand tool calls with full input/output
vibeview show --thinking <session-id>  # include thinking blocks
vibeview show --json <session-id>      # raw message JSON
vibeview show --no-color <session-id>
```

### Inspect session metadata

Analyze a session's metadata, token usage, and insights (tools used, files touched, errors).

```
vibeview inspect <session-id>
vibeview inspect --verbose <session-id>
vibeview inspect --json <session-id>
vibeview inspect --yaml <session-id>
vibeview inspect /path/to/session.jsonl
```

### Aggregate usage stats

Show usage summary across all sessions or filtered by project.

```
vibeview stats
vibeview stats --json
vibeview stats --dirs myproject
vibeview stats /path/to/project
```

### Start the web interface

Launch a local web UI for browsing sessions visually.

```
vibeview                        # default port 4880
vibeview serve --port 8080
vibeview serve --open           # open browser automatically
vibeview serve --lan            # bind to 0.0.0.0 with token auth
```

## Global flags

All commands accept:

- `--claude-dir <path>` — path to claude data directory (default: `~/.claude`)
- `--log-level <level>` — `debug`, `warn`, or `error` (default: `warn`)

## Usage guidance

- Use `vibeview search` when the user wants to find a past conversation by topic or keyword.
- Use `vibeview sessions --sort cost` to help users identify their most expensive sessions.
- Use `vibeview inspect` to get detailed metadata about a specific session (tokens, cost, tools, files).
- Use `vibeview show` to read back the actual conversation content.
- Use `vibeview stats` for aggregate usage reporting and cost tracking.
- Prefer `--json` output when you need to parse or process the results programmatically.
- Session IDs support prefix matching — a 6-character prefix is usually sufficient.
