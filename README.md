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

### Commands

#### `serve` (default)

Start the web interface. This is the default when no subcommand is given.

```sh
vibeview serve --port 8080 --open
vibeview serve --lan              # bind to 0.0.0.0 with token auth
vibeview serve /path/to/session.jsonl
```

#### `inspect`

Analyze a session from the terminal. Accepts a session file, directory, or session ID.

```sh
vibeview inspect <session-file | session-id>
vibeview inspect --json <session-file>
vibeview inspect --verbose <session-id>
```

Shows message counts, token usage, cost estimate, tools used, and files touched.

#### `search`

Full-text search across all sessions.

```sh
vibeview search "database migration"
vibeview search --limit 5 "auth middleware"
vibeview search --json --dirs myproject "query"
```

#### `stats`

Show aggregate usage summary across sessions.

```sh
vibeview stats                    # all sessions
vibeview stats /path/to/project   # filter to a project folder
vibeview stats session.jsonl      # single session
vibeview stats --json
```

#### `show`

Display a session conversation as readable text.

```sh
vibeview show <session-id>
vibeview show --thinking <session-id>   # include thinking blocks
vibeview show --verbose <session-id>    # expand tool call details
vibeview show --json <session-id>       # raw message JSON
```

#### `sessions`

List sessions in a formatted table.

```sh
vibeview sessions
vibeview sessions --limit 10 --sort cost
vibeview sessions --dir myproject --json
```

## Web UI

- **Sessions list** -- browse, filter, sort, and search all sessions
- **Session detail** -- read-only chat view with messages, tool calls, thinking blocks, and diffs
- **Activity** -- contribution graph, hourly patterns, and usage trends
- **Directories** -- sessions grouped by project
- **Settings** -- theme, sort order, page size, cost display, custom model pricing

Live sessions update in real time via SSE.

## Claude Code Plugin

VibeView includes a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that adds a `/vibeview` skill to Claude Code. This lets you search, inspect, and analyze your sessions directly from a conversation.

```sh
claude plugin add driangle/vibeview
```

Once installed, you can ask Claude Code things like "how much have I spent this week?" or "find the session where I worked on auth" and it will use the vibeview CLI to answer.

## Configuration

Settings are persisted at `~/.config/vibeview/settings.json` and can also be changed from the web UI settings page.

## Global Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--claude-dir` | `~/.claude` | Path to Claude data directory |
| `--log-level` | `warn` | Log level: debug, warn, error |
| `--version` | | Show version information |
