# CLI

vibeview is a single binary that serves the web interface and provides CLI tools for inspecting and searching Claude Code session data.

## Commands

### `vibeview web`

Starts the web server.

```bash
vibeview web
vibeview web --port 8080 --open
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `4880` | Port to listen on |
| `--open` | `false` | Open the browser on startup |
| `--lan` | `false` | Enable LAN mode: bind to `0.0.0.0` with token auth |
| `--tls-cert` | — | Serve HTTPS with this PEM certificate (requires `--tls-key`) |
| `--tls-key` | — | Serve HTTPS with this PEM private key (requires `--tls-cert`) |
| `--cors-origin` | — | Allow an additional exact browser origin; may be repeated |
| `--dirs` | | Comma-separated project path substrings to filter (OR-combined) |
| `--claude-dir` | `~/.claude` | Path to claude data directory |
| `--log-level` | `warn` | Log level: `debug`, `warn`, `error` |

You can also pass file paths or directories as positional arguments to run in standalone mode:

```bash
vibeview web session.jsonl
vibeview web /path/to/sessions/
```

#### LAN mode

By default the server binds to `127.0.0.1` and is reachable only from your own
machine. Passing `--lan` binds to `0.0.0.0` so other devices on your local
network can reach it, and generates a random access token to guard against
unauthorized access. The threat model is a **trusted LAN**: plaintext mode does
not protect the token or session contents from another device that can observe
network traffic. Treat public Wi-Fi, shared office networks, and compromised
home networks as hostile and use TLS or an encrypted tunnel.

Vibeview applies best-effort redaction before session data is sent to the UI.
It recognizes common provider credentials, JWTs, private-key blocks, connection
strings, and high-entropy token-like values. Redaction is pattern-based, not a
security boundary: novel formats, short secrets, credentials split across
fields, and ordinary text that resembles a secret can be missed or masked by
mistake. Review session contents before sharing them and do not rely on
redaction to make an untrusted network safe.

```bash
vibeview web --lan
```

On startup, vibeview prints a warning and a ready-to-use URL that includes the
token:

```
WARNING: LAN mode uses plaintext HTTP. Any device able to observe local-network traffic can read the access token and your complete session contents. Use --tls-cert and --tls-key on untrusted networks.
listening on 0.0.0.0:4880
access URL: http://192.168.1.42:4880/#token=<generated-token>
```

The token travels in the URL **fragment** (`#token=`), which browsers never send
to the server — keeping it out of access logs and `Referer` headers. On load, the
web app reads the token, removes it from the visible URL, and then authenticates
with an `Authorization: Bearer <token>` header. The live session stream (which
cannot send headers) is authorized by a short handshake that sets an `HttpOnly`
cookie, so the token is never placed in a request URL. Because LAN mode exposes
your session data on a network interface, only enable plaintext LAN mode on
networks you trust.

For encrypted transport, supply a certificate and matching private key. A local
CA tool such as `mkcert` can issue a certificate trusted by your devices:

```bash
vibeview web --lan --tls-cert ./vibeview.pem --tls-key ./vibeview-key.pem
```

Alternatively, keep vibeview on its default loopback address and reach it
through an encrypted SSH tunnel (`ssh -L 4880:127.0.0.1:4880 host`).

The embedded UI is same-origin and needs no CORS permission. LAN mode therefore
does **not** trust arbitrary RFC1918 browser origins. If a separate frontend must
call the API, opt in to its exact scheme, host, and port:

```bash
vibeview web --lan --cors-origin https://dashboard.example.test:8443
```

### `vibeview inspect`

Inspect a session and report metadata, path resolution, token usage, and insights.

```bash
# By session ID (looks up in ~/.claude/history.jsonl)
vibeview inspect 877fff1e-80c9-4d20-a600-f278eb2c7bdc

# By file path
vibeview inspect /path/to/session.jsonl

# By directory (inspects all .jsonl files)
vibeview inspect /path/to/sessions/
```

Output is a styled, human-readable terminal report by default. Use `--json` or `--yaml` for machine-readable formats.

```bash
vibeview inspect --json 877fff1e-80c9-4d20-a600-f278eb2c7bdc
vibeview inspect --yaml 877fff1e-80c9-4d20-a600-f278eb2c7bdc
vibeview inspect -v 877fff1e-80c9-4d20-a600-f278eb2c7bdc
```

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | `false` | Output as JSON |
| `--yaml` | `false` | Output as YAML |
| `--verbose`, `-v` | `false` | Include diagnostic sections (resolution, parse, enrichment) |

#### Session ID lookup

When given a session ID, `inspect` traces the full discovery pipeline:

1. Validates the session ID format
2. Searches `history.jsonl` for matching entries
3. Encodes the project path and checks the expected directory exists
4. Verifies the session `.jsonl` file is on disk
5. Runs enrichment (message count, model, token usage, cost)
6. Extracts insights (tools, files, errors, commands, skills, subagents)

Any problems found along the way are reported in the Problems section (or `problems` field in JSON/YAML), making it useful for diagnosing why a session might not appear in the web interface.

#### Example output

The default styled output shows sections for session metadata, conversation stats, tool usage, files, errors, subagents, and skills. Empty sections are omitted.

```
Session
  ID           877fff1e-80c9-4d20-a600-f278eb2c7bdc
  Project      ~/myproject
  Slug         I want to create my personal website...
  Started      2026-03-26 21:07  (2h ago)
  Duration     45m30s
  Model        claude-opus-4-6
  Activity     idle

Conversation
  Messages     698 total, 120 user, 340 assistant, 238 progress

Tool Usage
  Tool                  Calls     Errors
  Write                 44        0
  Edit                  44        2
  Bash                  20        1
  Read                  12        0

Files
  Read         12 files
  Written      34 files
    ~/myproject/src/index.ts
    ~/myproject/src/app.ts
    ...
```

With `--verbose`, additional diagnostic sections are appended (Resolution, Enrichment).

### `vibeview sessions`

List all Claude Code sessions in a formatted table. Supports filtering by
directory, sorting by various columns, pagination, and JSON output for
scripting.

```bash
vibeview sessions
vibeview sessions --json
vibeview sessions --dir myproject --limit 10
vibeview sessions --sort messages
vibeview sessions --limit 10 --offset 20
```

| Flag | Default | Description |
|------|---------|-------------|
| `--dir` | | Filter by project directory (substring match) |
| `--sort` | `timestamp` | Sort by: `timestamp`, `cost`, `messages`, `model`, `dir` |
| `--limit` | `25` | Maximum number of sessions to show |
| `--offset` | `0` | Number of sessions to skip (for pagination) |
| `--json` | `false` | Output as JSON |

### `vibeview show`

Render a session's full conversation as compact, human-readable text. Shows
user and assistant messages with role labels, tool calls as one-line summaries,
and omits raw JSON, token counts, and metadata.

Input can be a session ID (full or 8-character prefix) or a `.jsonl` file path.

```bash
vibeview show 877fff1e-80c9-4d20-a600-f278eb2c7bdc
vibeview show 877fff
vibeview show --verbose 877fff1e
vibeview show --thinking 877fff1e
vibeview show --json 877fff1e
vibeview show session.jsonl
```

| Flag | Default | Description |
|------|---------|-------------|
| `--verbose`, `-v` | `false` | Expand tool calls with full input/output |
| `--thinking` | `false` | Include thinking blocks |
| `--json` | `false` | Output raw messages as JSON |
| `--no-color` | `false` | Strip ANSI color codes |

### `vibeview search`

Full-text search across all session content. Uses the same search algorithm as the web interface.

```bash
vibeview search "database migration"
vibeview search --limit 5 "auth middleware"
vibeview search --dirs myproject "TODO"
```

| Flag | Default | Description |
|------|---------|-------------|
| `--limit` | `20` | Maximum number of results |
| `--dirs` | | Comma-separated project path substrings to filter (OR-combined) |
| `--json` | `false` | Output as JSON instead of YAML |

#### Example output

```yaml
query: database migration
total: 2
results:
  - session_id: 877fff1e-80c9-4d20-a600-f278eb2c7bdc
    project: /Users/you/myproject
    slug: help me fix the database migration...
    model: claude-opus-4-6
    timestamp: "2026-03-26T21:07:06+01:00"
    snippet: "...help with the database migration issue..."
```

### `vibeview stats`

Display an aggregate usage summary across all Claude Code sessions.

```bash
# All sessions
vibeview stats

# Filter by project directory
vibeview stats --dirs myproject

# Analyze a specific project folder
vibeview stats /path/to/project

# Analyze a single session file
vibeview stats session.jsonl

# Machine-readable output
vibeview stats --json
vibeview stats --yaml
```

| Flag | Default | Description |
|------|---------|-------------|
| `--dirs` | | Comma-separated project path substrings to filter (OR-combined) |
| `--json` | `false` | Output as JSON |
| `--yaml` | `false` | Output as YAML |

### `vibeview related`

Reconstruct a whole multi-agent work episode from a single session ID. Given a
session, `related` groups it with:

- **Subagent transcripts** — the `agent-*.jsonl` files the session spawned (its
  `subagents/` directory), each shown with its agent type, description, and
  message/turn counts.
- **Sibling sessions** — other sessions from the **same project** whose time
  windows cluster with the target's. Clustering includes any session whose
  `[start, end]` window is within `--gap` of the target's window (overlapping
  or nearly so). Sessions outside the window, or in other projects, are
  excluded.

Accepts a full session ID or any-length ID prefix.

```bash
vibeview related 877fff1e-80c9-4d20-a600-f278eb2c7bdc
vibeview related 877fff
vibeview related --gap 1h 877fff1e
vibeview related --no-siblings 877fff1e
vibeview related --json 877fff1e
```

| Flag | Default | Description |
|------|---------|-------------|
| `--gap` | `30m` | Max gap between time windows to cluster siblings (Go duration, e.g. `10m`, `1h`) |
| `--no-subagents` | `false` | Skip the subagents section |
| `--no-siblings` | `false` | Skip the sibling-sessions section |
| `--json` | `false` | Emit the grouped structure (`target`, `subagents`, `siblings`) as JSON for scripting |
| `--no-color` | `false` | Strip ANSI color codes |

#### Example output

```
Session
  ID           7425387b-39ff-4bf5-91a9-83f210b92c5c
  Title        typescript-session-management-port
  Project      starfish
  Started      2026-07-10 15:47  (23d ago)

Subagents (2)
  AGENT ID            TYPE              DESCRIPTION                 MSGS   TURNS
  a86318110715528c0   Explore           Explore Go session code     34     20
  aec4c3c310e017380   Explore           Explore TS server code      52     31

Sibling sessions (4)
  ID        TITLE                        DATE               MSGS
  b3c400c9  websocket-server-handshake   2026-07-10 15:47   135
  ...
```

### `vibeview self`

Discover which Claude Code session launched this process. Walks up the process tree and matches against active PID files in `~/.claude/sessions/`.

```bash
vibeview self
vibeview self --json
```

| Flag | Default | Description |
|------|---------|-------------|
| `--json` | `false` | Output as JSON (`{"session_id": "..."}`) |

This is useful when running vibeview from within a Claude Code tool-use context (e.g. a Bash tool call) to identify and inspect the current session.

#### Example output

```
Session:  877fff1e-80c9-4d20-a600-f278eb2c7bdc

Commands:
  vibeview inspect 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview show 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  vibeview sessions
```

When no matching session is found:

```
error: no active Claude Code session found for this process tree
```

### `vibeview completion`

Generate shell autocompletion scripts for bash, zsh, fish, or powershell.

```bash
# Generate and load completions for your shell
vibeview completion bash > /etc/bash_completion.d/vibeview
vibeview completion zsh > "${fpath[1]}/_vibeview"
vibeview completion fish > ~/.config/fish/completions/vibeview.fish
vibeview completion powershell > vibeview.ps1
```

Supported shells: `bash`, `zsh`, `fish`, `powershell`. Run `vibeview completion <shell> --help` for shell-specific setup instructions.

## Global flags

These flags are available on all commands:

| Flag | Default | Description |
|------|---------|-------------|
| `--claude-dir` | `~/.claude` | Path to claude data directory |
| `--log-level` | `warn` | Log level: `debug`, `warn`, `error` |
| `--version` | | Print version and exit (no `-v` shorthand; `-v` is used by `inspect` for `--verbose`) |

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_CONFIG_DIR` | `~/.claude` | Claude data directory, if `--claude-dir` is not given (see [Session discovery](#session-discovery)). |
| `VIBEVIEW_COST_ENABLED` | _(off)_ | Show cost (`$`) figures in the CLI and web UI. Set to `1`/`true` to enable. |
| `NO_COLOR` | | If set, disables ANSI colors in CLI output. |

### Cost display is off by default

Cost (`$`) figures are **hidden by default** in both the CLI and the web UI while
token→cost estimation is being reworked for accuracy. Interactive sessions carry
per-message token counts but no authoritative cost, and estimating from a model
pricing table is not yet reliable enough to show.

Set `VIBEVIEW_COST_ENABLED=1` to turn cost back on for both surfaces at runtime —
no rebuild:

```bash
VIBEVIEW_COST_ENABLED=1 vibeview web     # or: export it for the whole session
VIBEVIEW_COST_ENABLED=1 vibeview stats
```

Machine-readable output (`--json` / `--yaml`) is unaffected: it still includes
authoritative cost where a session provides it. See `docs/cost.md` in the repo
for the full rationale and the path to re-enabling.

## Session discovery

vibeview automatically discovers sessions from Claude Code's data directory (`~/.claude/projects/`). No configuration is needed. The web server watches the session directory and picks up new sessions in real time.

The data directory is resolved in this order:

1. The `--claude-dir` flag, if provided.
2. The `CLAUDE_CONFIG_DIR` environment variable, if set.
3. The default `~/.claude`.

## Aliasing

If you prefer a shorter command, add an alias to your shell profile:

```bash
alias vv=vibeview
```

Then use `vv inspect`, `vv search`, etc.
