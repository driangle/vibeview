---
title: "Add vibeview self command for session self-discovery"
id: "01kpy25hy"
status: completed
priority: medium
type: feature
tags: []
created: "2026-04-23"
completed_at: 2026-04-24
---

# Add vibeview self command for session self-discovery

## Objective

Add a `vibeview self` CLI command that allows a Claude Code process to discover its own session. The command determines the caller's session by walking up the process tree from `os.Getppid()`, scanning `~/.claude/sessions/*.json` PID files for a matching process ID, and returning the session ID along with suggested follow-up commands (`vibeview inspect <id>`, `vibeview show <id>`, etc.).

## Tasks

- [x] Add `FindSessionByPID(claudeDir string, pid int) (string, error)` to the `pidcheck` package that scans `~/.claude/sessions/*.json` for a PID entry matching the given process ID
- [x] Add a process-tree walking utility that traverses ancestors from PPID upward (to handle shell intermediaries like `sh` between Claude Code and `vibeview`)
- [x] Create `cmd/vibeview/self.go` with a `selfCmd` Cobra command that combines ancestor walking + PID lookup to find the current session
- [x] Output the session ID and print suggested follow-up commands (inspect, show, sessions)
- [x] Support `--json` output flag for machine-readable output (consistent with other commands)
- [x] Add tests for `FindSessionByPID` with matching, non-matching, and stale PID scenarios
- [x] Add tests for the ancestor-walking logic
- [x] Update the Claude Code plugin skill (`claude-code-plugin/skills/vibeview/SKILL.md`) to document the `vibeview self` command and its usage

## Acceptance Criteria

- Running `vibeview self` from within a Claude Code tool-use context prints the correct session ID
- When no matching session is found, a clear error message is shown (e.g., "no active Claude Code session found for this process tree")
- Stale PID files (where the process is no longer alive) are skipped
- The command handles shell intermediaries (PPID is not Claude Code directly, but a child shell)
- `--json` flag outputs `{"session_id": "..."}` for scripting use
