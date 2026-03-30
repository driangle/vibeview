# CLI

vibeview is a single binary that serves the web interface and provides CLI tools for inspecting and searching Claude Code session data.

## Commands

### `vibeview` / `vibeview serve`

Starts the web server. This is the default when no subcommand is given.

```bash
vibeview
vibeview serve --port 8080 --open
```

| Flag | Default | Description |
|------|---------|-------------|
| `--port` | `4880` | Port to listen on |
| `--open` | `false` | Open the browser on startup |
| `--dirs` | | Comma-separated project directory names to filter |
| `--claude-dir` | `~/.claude` | Path to claude data directory |
| `--log-level` | `warn` | Log level: `debug`, `warn`, `error` |

You can also pass file paths or directories as positional arguments to run in standalone mode:

```bash
vibeview session.jsonl
vibeview /path/to/sessions/
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
  Tokens       In: 246  Out: 60,415  Cache: 10,937,546
  Cost         $22.95

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
| `--dirs` | | Comma-separated project directory names to filter |
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
| `--dirs` | | Comma-separated project directory names to filter |
| `--json` | `false` | Output as JSON |
| `--yaml` | `false` | Output as YAML |

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

## Session discovery

vibeview automatically discovers sessions from Claude Code's data directory (`~/.claude/projects/`). No configuration is needed. The web server watches the session directory and picks up new sessions in real time.

## Aliasing

If you prefer a shorter command, add an alias to your shell profile:

```bash
alias vv=vibeview
```

Then use `vv inspect`, `vv search`, etc.
