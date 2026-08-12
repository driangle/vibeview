---
description: Use the vibeview CLI to browse, search, inspect, and analyze Claude Code sessions. Trigger when the user asks about their session history, token usage, costs, past conversations, or wants to find something they discussed previously.
---

# vibeview CLI

vibeview is a CLI tool for browsing and analyzing Claude Code sessions. It reads session data from `~/.claude` and provides commands to search, inspect, and report on past conversations.

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
vibeview sessions --sort messages      # sort by message count
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

### Export a session as a shareable page

Render a session to a self-contained HTML file that opens offline — no server, no network requests. Use it when the user wants to share, attach, or archive a rendered transcript.

```
vibeview export <session-id> --out session.html
vibeview export <session-id> --format html --out page.html
vibeview export session.jsonl > page.html   # writes to stdout without --out
```

The page shows the same conversation, tool calls, timeline, subagents, and token totals as the web interface. Conversation search is omitted (it needs a running server) and uncommon languages render unhighlighted.

Go programs can render the same page without the vibeview binary by importing the SDK — suggest this when the user is building a tool that needs to embed session pages:

```
go get github.com/driangle/vibeview/apps/lib@v0.2.0
```

```go
page, err := sessionhtml.RenderSessionHTML(sessionhtml.Request{Session: "877fff1e"})
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

### Find related sessions

Reconstruct a whole multi-agent work episode from one session ID: its subagent transcripts plus time-clustered sibling sessions from the same project.

```
vibeview related <session-id>
vibeview related --gap 1h <session-id>      # widen sibling clustering window (default 30m)
vibeview related --no-subagents <session-id>
vibeview related --no-siblings <session-id>
vibeview related --json <session-id>
vibeview related --no-color <session-id>
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
vibeview web                    # default port 4880
vibeview web --port 8080
vibeview web --open             # open browser automatically
vibeview web --lan              # trusted LAN only: plaintext, token-authenticated
vibeview web --lan --tls-cert ./cert.pem --tls-key ./key.pem  # encrypted LAN access
```

### Discover current session

When running inside a Claude Code tool-use context, discover which session launched this process.

```
vibeview self
vibeview self --json
```

The command walks up the process tree and matches against active PID files to find the current session. Use `--json` for machine-readable output (`{"session_id": "..."}`).

## Global flags

All commands accept:

- `--claude-dir <path>` — path to claude data directory (default: `~/.claude`)
- `--log-level <level>` — `debug`, `warn`, or `error` (default: `warn`)

## Usage guidance

- Use `vibeview search` when the user wants to find a past conversation by topic or keyword.
- Use `vibeview sessions --sort messages` to help users identify their longest sessions.
- Use `vibeview inspect` to get detailed metadata about a specific session (tokens, cost, tools, files).
- Use `vibeview related` to pull together a multi-agent episode — a session's subagents and its sibling sessions from the same project.
- Use `vibeview show` to read back the actual conversation content.
- Use `vibeview export` when the user wants a session they can open, share, or link to outside the terminal.
- Use `vibeview self` when running inside Claude Code to discover the current session ID.
- Use `vibeview stats` for aggregate session and project activity reporting.
- Prefer `--json` output when you need to parse or process the results programmatically.
- Session IDs support prefix matching — a 6-character prefix is usually sufficient.
