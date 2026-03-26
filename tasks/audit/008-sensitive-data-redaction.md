---
id: "audit-008"
title: "Add sensitive data redaction for commands and tool results"
status: pending
priority: high
effort: medium
type: improvement
tags: [privacy, backend, frontend]
group: audit
touches: ["cli/insights", "cli/search", "web/components/SessionInsights", "web/components/RawJsonModal"]
context:
  - "apps/cli/internal/insights/commands.go"
  - "apps/cli/internal/insights/helpers.go"
  - "apps/cli/internal/search/search.go"
  - "apps/web/src/components/RawJsonModal.tsx"
  - "apps/web/src/components/SessionInsights.tsx"
  - "apps/web/src/components/CopyableText.tsx"
  - "apps/web/src/components/FilesTouched.tsx"
---

# Add sensitive data redaction for commands and tool results

## Findings

### HIGH: Bash commands stored verbatim (insights/commands.go:20)
Commands containing tokens, passwords, API keys (e.g., `curl -H "Authorization: Bearer ..."`) are stored and displayed without filtering.

### HIGH: Full tool result content exposed (insights/helpers.go:31-54)
stdout/stderr from tool results may contain database credentials, PII, API responses with auth details.

### HIGH: RawJsonModal exposes unfiltered JSON (RawJsonModal.tsx:11-18)
Copy-to-clipboard button directly copies entire unredacted JSON to system clipboard.

### MEDIUM: Search snippets expose sensitive context (search.go:103-150)
Searching for "password" returns surrounding context that may include the actual password.

### MEDIUM: Clipboard integration has no warnings (CopyableText.tsx:14, etc.)
No confirmation or warning before copying potentially sensitive data to clipboard.

### MEDIUM: Full absolute file paths exposed (SessionInsights.tsx:362, FilesTouched.tsx:100)
User home directory and project structure visible in UI.

## Acceptance Criteria

- [ ] Implement pattern-based redaction for known sensitive patterns:
  - `--password`, `--secret`, `--token`, `-H "Authorization"`
  - `API_KEY=`, `DATABASE_URL=`, `ANTHROPIC_API_KEY=`
  - Bearer tokens, SSH keys, connection strings
- [ ] Apply redaction to command display and tool result display
- [ ] Add warning before copying raw JSON or tool results
- [ ] Mask absolute paths by replacing home directory with `~`
- [ ] Sanitize search snippets containing sensitive patterns
