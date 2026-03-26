---
title: "Create audit skill for codebase security and quality review"
id: "01kmmpjkt"
status: completed
priority: high
type: feature
tags: ["security", "skill", "audit"]
created: "2026-03-26"
---

# Create audit skill for codebase security and quality review

## Objective

Create a new Claude Code skill at `.claude/skills/audit.md` that performs a comprehensive codebase audit covering security, privacy, code quality, and architectural concerns. The skill should be invocable via `/audit` and produce a structured report across 8 audit dimensions. Since VibeView handles sensitive Claude session data, the audit must pay special attention to ensuring data never leaves the local machine.

## Tasks

- [ ] Create `.claude/skills/audit.md` with skill frontmatter (name, description, trigger conditions)
- [ ] Define the audit prompt covering all 8 audit dimensions:
  - [ ] **Security & Trust Boundaries** — session data loading, path traversal, symlink handling, XSS risks (markdown/code rendering, `dangerouslySetInnerHTML`), command execution (`exec`/`spawn`/`eval`/dynamic imports), dependency risk (unpinned deps, postinstall scripts, auto-update)
  - [ ] **Secrets & Privacy Exposure** — secret redaction, accidental indexing, caches/telemetry/crash logs containing raw session content, network calls transmitting session data, clipboard leak risks
  - [ ] **Data Integrity & Correctness** — JSON parsing bugs, partial write handling, concurrent session writes, deterministic message ordering, timezone handling, tool call reconstruction correctness, session format version compatibility
  - [ ] **Local Attack Surface** — image/HTML/iframe rendering triggers, terminal escape sequences, large file memory DoS, recursive directory scanning CPU spikes
  - [ ] **Networking Behavior** — outbound requests (npm, GitHub API, telemetry, CDN), offline mode support, proxy support, TLS validation
  - [ ] **Architecture & Maintainability** — typed session model, parser/UI isolation, fuzz testing, edge case fixtures, schema validation, feature flags, migration utilities
  - [ ] **Testing & Reproducibility** — snapshot tests, property-based parser tests, golden files, deterministic builds (lockfile), sandbox verification (no network, no unexpected writes)
  - [ ] **Developer UX & Failure Modes** — graceful handling of corrupted sessions/missing outputs/unknown message types, secret detection warnings, version mismatch alerts, verbose/debug mode with redaction
- [ ] Structure the skill to output findings as a prioritized report with severity levels
- [ ] Test the skill by running it against the current codebase

## Acceptance Criteria

- `.claude/skills/audit.md` exists and is a valid Claude Code skill
- Running `/audit` produces a structured report covering all 8 audit dimensions
- The report identifies concrete findings with severity levels (critical, high, medium, low, info)
- Security & trust boundary checks are prioritized first in the output
- The skill examines actual source code, dependencies, and configuration — not just theoretical concerns
- The audit verifies that session data stays local (no network transmission of session content)
