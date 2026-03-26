---
id: "audit-001"
title: "Fix symlink following and path traversal vulnerabilities"
status: pending
priority: critical
effort: medium
type: bug
tags: [security, backend]
group: audit
touches: ["cli/watcher/tailer", "cli/watcher/broker", "cli/session"]
context:
  - "apps/cli/internal/watcher/tailer.go"
  - "apps/cli/internal/watcher/broker.go"
  - "apps/cli/internal/session/session.go"
---

# Fix symlink following and path traversal vulnerabilities

## Findings

### CRITICAL: Symlink following on session files (tailer.go:26-51)
`NewTailer()` uses `os.Stat()` without resolving symlinks. An attacker who creates symlinks in `~/.claude/projects/` can cause VibeView to read arbitrary files (e.g., `~/.ssh/id_rsa`).

### CRITICAL: Path traversal via SessionID (session.go:436-478)
Session IDs derived from filenames are not validated. A malicious JSONL file with `../../../etc/passwd` as sessionID could bypass directory restrictions.

### HIGH: Symlinks in watched history file (broker.go:201-216)
History file watcher adds `~/.claude/history.jsonl` without symlink validation.

### HIGH: Recursive directory walk without depth limit (session.go:450-458)
`filepath.WalkDir()` in standalone mode has no depth limit or symlink cycle detection.

## Acceptance Criteria

- [ ] Use `filepath.EvalSymlinks()` in tailer and broker — reject paths resolving outside `~/.claude/`
- [ ] Validate session ID format: `^[a-zA-Z0-9_-]{1,256}$`
- [ ] Check `os.Lstat()` on history.jsonl to reject symlinks
- [ ] Add depth limit (e.g., 10) and symlink skip to `filepath.WalkDir` in standalone discovery
- [ ] Add tests for symlink and path traversal scenarios

## verify
```yaml
verify:
  - type: bash
    run: "go test ./internal/watcher/... ./internal/session/... -run Symlink -v"
    dir: "apps/cli"
  - type: assert
    check: "Symlinks outside ~/.claude are rejected"
  - type: assert
    check: "Session IDs with path traversal characters are rejected"
```
