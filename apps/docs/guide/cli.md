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

Output is YAML by default. Use `--json` for JSON.

```bash
vibeview inspect --json 877fff1e-80c9-4d20-a600-f278eb2c7bdc
```

#### Session ID lookup

When given a session ID, `inspect` traces the full discovery pipeline:

1. Validates the session ID format
2. Searches `history.jsonl` for matching entries
3. Encodes the project path and checks the expected directory exists
4. Verifies the session `.jsonl` file is on disk
5. Runs enrichment (message count, model, token usage, cost)
6. Extracts insights (tools, files, errors, commands, skills, subagents)

Any problems found along the way are reported in the `problems` field, making it useful for diagnosing why a session might not appear in the web interface.

#### Example output

```yaml
lookup:
  session_id: 877fff1e-80c9-4d20-a600-f278eb2c7bdc
  valid: true
  history_hits: 34
  project: /Users/you/myproject
  resolution:
    encoded_path: -Users-you-myproject
    dir_exists: true
    file_exists: true
  enrichment:
    success: true
    messages: 698
    model: claude-opus-4-6
    slug: I want to create my personal website...
    activity: idle
  usage:
    input_tokens: 246
    output_tokens: 60415
    cache_creation_tokens: 116470
    cache_read_tokens: 10821076
    total_tokens: 10998207
    cost_usd: 22.95
  insights:
    tools:
      - name: Write
        count: 44
      - name: Edit
        count: 44
    files_written: 34
    files_read: 12
    bash_commands: 20
```

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

## Global flags

These flags are available on all commands:

| Flag | Default | Description |
|------|---------|-------------|
| `--claude-dir` | `~/.claude` | Path to claude data directory |
| `--log-level` | `warn` | Log level: `debug`, `warn`, `error` |
| `--version` | | Print version and exit |

## Session discovery

vibeview automatically discovers sessions from Claude Code's data directory (`~/.claude/projects/`). No configuration is needed. The web server watches the session directory and picks up new sessions in real time.

## Aliasing

If you prefer a shorter command, add an alias to your shell profile:

```bash
alias vv=vibeview
```

Then use `vv inspect`, `vv search`, etc.
