# CLI

## Basic usage

```bash
vibeview
```

Starts the server. Visit the URL printed in the terminal to open the web interface.

## Options

| Flag | Description |
|------|-------------|
| `--open` | Open the browser automatically on startup |
| `--port <port>` | Set the server port (default: 4880) |

## Supported providers

vibeview automatically discovers sessions from:

- **Claude Code** — `~/.claude/projects/`

No configuration is needed. vibeview watches the session directory and picks up new sessions in real time.
