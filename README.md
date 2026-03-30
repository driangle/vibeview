# VibeView

A local CLI tool for browsing your Claude Code sessions in a clean, read-only web interface.

[Documentation](https://driangle.github.io/vibeview/)

VibeView watches your `~/.claude` directory, discovers sessions in real time, and presents them as a browsable chat UI with tool calls, file edits, thinking blocks, and cost breakdowns.

## Install

**Homebrew:**

```sh
brew install driangle/tap/vibeview
```

**From source:**

```sh
make install
```

Requires Go 1.22+ and Node.js.

## Usage

```sh
vibeview              # start the web UI on port 4880
vibeview --open       # start and open browser
vibeview --port 8080  # custom port
```

View a specific session file:

```sh
vibeview /path/to/session.jsonl
```

Filter to specific projects:

```sh
vibeview --dirs myproject,another
```

### Inspect

Analyze a session from the terminal:

```sh
vibeview inspect <session-file | session-id>
vibeview inspect --json <session-file>
```

Shows message counts, token usage, cost estimate, tools used, and files touched.

### Search

Search across all sessions:

```sh
vibeview search "database migration"
vibeview search --limit 5 "auth middleware"
```

## Web UI

- **Sessions list** -- browse, filter, sort, and search all sessions
- **Session detail** -- read-only chat view with messages, tool calls, thinking blocks, and diffs
- **Activity** -- contribution graph, hourly patterns, and usage trends
- **Directories** -- sessions grouped by project
- **Settings** -- theme, sort order, page size, cost display, custom model pricing

Live sessions update in real time via SSE.

## Configuration

Settings are persisted at `~/.config/vibeview/settings.json` and can also be changed from the web UI settings page.

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `4880` | Port to listen on |
| `--open` | `false` | Open browser on startup |
| `--claude-dir` | `~/.claude` | Path to Claude data directory |
| `--dirs` | | Filter to specific project directories |
| `--log-level` | `warn` | Log level: debug, warn, error |
