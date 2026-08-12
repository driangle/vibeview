# vibeview

A local CLI tool for browsing your Claude Code sessions in a clean, read-only web interface.

[Documentation](https://driangle.github.io/vibeview/)

vibeview watches your `~/.claude` directory, discovers sessions in real time, and presents them as a browsable chat UI with tool calls, file edits, thinking blocks, and cost breakdowns.

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

## Development

Run the Go test suite directly after cloning; no web build is required:

```sh
cd apps/cli && go test ./...
```

## Usage

```sh
vibeview web              # start the web UI on port 4880
vibeview web --open       # start and open browser
vibeview web --port 8080  # custom port
```

View a specific session file:

```sh
vibeview web /path/to/session.jsonl
```

Filter to specific projects:

```sh
vibeview web --dirs myproject,another
```

### Commands

#### `web`

Start the web interface.

```sh
vibeview web --port 8080 --open
vibeview web --lan              # trusted LAN only: plaintext, token-authenticated
vibeview web --lan --tls-cert ./cert.pem --tls-key ./key.pem  # encrypted LAN access
vibeview web /path/to/session.jsonl
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

#### `export`

Render a session to a self-contained HTML page that opens offline.

```sh
vibeview export <session-id> --out session.html
vibeview export session.jsonl > page.html
```

The same renderer is importable, so Go programs can produce session pages
without the binary:

```sh
go get github.com/driangle/vibeview/apps/lib@v0.2.0
```

```go
page, err := sessionhtml.Render(sessionhtml.Request{Session: "877fff1e"})
```

See the [Go SDK guide](https://driangle.github.io/vibeview/guide/go-sdk) for details.

#### `sessions`

List sessions in a formatted table.

```sh
vibeview sessions
vibeview sessions --limit 10 --sort messages
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

vibeview includes a [Claude Code plugin](https://docs.anthropic.com/en/docs/claude-code/plugins) that adds a `/vibeview` skill to Claude Code. This lets you search, inspect, and analyze your sessions directly from a conversation.

```sh
claude plugin marketplace add driangle/vibeview
claude plugin install vibeview@vibeview-marketplace --scope user
```

Once installed, you can ask Claude Code things like "find the session where I worked on auth" or "which tools did I use on my last project?" and it will use the vibeview CLI to answer.

## Configuration

Settings are persisted at `~/.config/vibeview/settings.json` and can also be changed from the web UI settings page.

## Global Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--claude-dir` | `~/.claude` | Path to Claude data directory |
| `--log-level` | `warn` | Log level: debug, warn, error |
| `--version` | | Show version information |
