---
name: audit
description: "Perform a comprehensive codebase audit covering security, privacy, data integrity, architecture, and code quality. Use when the user wants to audit the codebase, check for security issues, or review code quality."
---

# Audit

Perform a comprehensive codebase audit across 8 dimensions using concurrent subagents for thorough, parallel analysis.

## Instructions

Run a full audit of the codebase. If `$ARGUMENTS` contains a specific dimension (e.g., "security", "privacy", "networking"), focus on that dimension only. Otherwise, run all 8 dimensions.

### Step 1: Launch parallel audit subagents

Use the **Agent tool** to launch subagents concurrently. Group them into two waves to balance thoroughness with context efficiency.

#### Wave 1 — Launch these 4 agents in parallel (single message, 4 Agent tool calls):

**Agent 1: Security & Trust Boundaries** (subagent_type: Explore, thoroughness: very thorough)
```
Audit this codebase for security and trust boundary issues. This is a tool that reads
Claude Code session data locally. Report findings with severity levels (critical/high/medium/low/info).

Inspect:
- How session data is loaded — file reads, path construction, glob patterns
- Path traversal risks — can a crafted session path escape intended directories?
- Symlink handling — does it follow symlinks that could point outside safe directories?
- Permission checks — does it verify it only reads intended directories?
- XSS risks in the rendering layer:
  - Markdown rendering (does it sanitize?)
  - Code highlighting (injection via code blocks?)
  - ANSI escape parsing
  - Use of dangerouslySetInnerHTML or raw HTML injection
- Command execution: any use of exec, spawn, eval, Function(), dynamic imports, or child_process
- Does the tool allow replaying commands, opening files from session links, or shell integration?
- Dependency risk: check package.json for unpinned deps, postinstall scripts, suspicious packages
- Any auto-update, remote code fetch, or plugin system without integrity checks

For each finding, report: severity, file:line, description, and recommendation.
```

**Agent 2: Secrets & Privacy Exposure** (subagent_type: Explore, thoroughness: very thorough)
```
Audit this codebase for secrets and privacy exposure risks. This tool handles Claude Code
sessions which often contain API keys, database URLs, internal code, production logs, PII,
and tokens. Report findings with severity levels.

Inspect:
- Does the tool redact or detect secrets in session content?
- Could sessions be accidentally indexed or cached in a searchable way?
- Does it write caches, telemetry, crash logs, or analytics that include raw session content?
- Search for any network calls: fetch, axios, http, https, XMLHttpRequest, WebSocket, navigator.sendBeacon
- Check for update checks, error reporting, usage analytics that could transmit session data
- Clipboard integrations: auto-copy features that could leak secrets to global clipboard history
- Check for localStorage, sessionStorage, IndexedDB usage that persists session content
- Look for any logging that could capture sensitive session data

For each finding, report: severity, file:line, description, and recommendation.
```

**Agent 3: Data Integrity & Correctness** (subagent_type: Explore, thoroughness: very thorough)
```
Audit this codebase for data integrity and correctness issues. This tool displays Claude Code
sessions and must show accurate, uncorrupted data. Report findings with severity levels.

Inspect:
- JSON parsing logic: streaming parsing bugs, error handling for malformed JSON
- Partial write / truncated file handling
- Concurrent session write handling
- Message ordering: is sorting deterministic? How are timestamps handled?
- Timezone handling in date display and sorting
- Tool call / diff reconstruction: if the tool reconstructs code changes, check correctness
- Claude session format version compatibility and backwards compatibility strategy
- Edge cases: empty sessions, sessions with only tool calls, very large sessions

For each finding, report: severity, file:line, description, and recommendation.
```

**Agent 4: Networking Behavior** (subagent_type: Explore, thoroughness: very thorough)
```
Audit this codebase for networking behavior. Even "offline" tools often aren't truly offline.
Report findings with severity levels.

Inspect:
- Search for ALL outbound network requests: fetch, axios, http/https imports, WebSocket,
  XMLHttpRequest, navigator.sendBeacon, Image() src loading, script/link tag injection
- Check for: npm registry calls, GitHub API calls, telemetry endpoints, CDN fonts/scripts
- Check index.html and any HTML templates for external resource loading (fonts, scripts, stylesheets)
- Is there an offline mode? Proxy support? Config to fully disable network?
- Check for service workers that might make network calls
- Look at vite.config / webpack config for any external resource loading
- TLS validation or certificate pinning considerations

For each finding, report: severity, file:line, description, and recommendation.
```

#### Wave 2 — Launch these 4 agents in parallel (single message, 4 Agent tool calls):

**Agent 5: Local Attack Surface** (subagent_type: Explore, thoroughness: medium)
```
Audit this codebase for local attack surface issues. Report findings with severity levels.

Inspect:
- Does opening a session file trigger image rendering, HTML preview, embedded iframes,
  or terminal emulation that could be exploited?
- Malicious terminal escape sequence handling in ANSI parsing
- Browser engine exploit surface if using Electron or webview
- Large file handling: could a huge session cause memory exhaustion / DoS?
- Recursive directory scanning: could deep/circular directories cause CPU spikes?
- File watcher behavior with many files

For each finding, report: severity, file:line, description, and recommendation.
```

**Agent 6: Architecture & Maintainability** (subagent_type: Explore, thoroughness: medium)
```
Audit this codebase for architecture and maintainability quality. Report findings with severity levels.

Inspect:
- Is the session data model well typed with proper TypeScript types/interfaces?
- Are parsers isolated from UI components? (separation of concerns)
- Are there test fixtures with real session edge cases?
- Schema validation layer: does the app validate session data shape before using it?
- Error boundaries in React components
- Feature flags or configuration system
- Code modularity: are files focused on single responsibilities?
- Are there god files or components doing too much?
- Import structure: circular dependencies?

For each finding, report: severity, file:line, description, and recommendation.
```

**Agent 7: Testing & Reproducibility** (subagent_type: Explore, thoroughness: medium)
```
Audit this codebase for testing and reproducibility. Report findings with severity levels.

Inspect:
- Test coverage: are there tests? What kind? (unit, integration, snapshot, e2e)
- Snapshot tests for rendering sessions?
- Property-based or fuzz tests for parsers?
- Golden files for large/complex sessions?
- Deterministic builds: is the lockfile (package-lock.json, pnpm-lock.yaml, etc.) committed?
- Can the app be built reproducibly?
- Are there CI/CD configurations?
- Test fixtures: do they cover edge cases (empty sessions, huge sessions, malformed data)?

For each finding, report: severity, file:line, description, and recommendation.
```

**Agent 8: Developer UX & Failure Modes** (subagent_type: Explore, thoroughness: medium)
```
Audit this codebase for developer UX and failure mode handling. Report findings with severity levels.

Inspect:
- Graceful handling of: corrupted sessions, missing tool outputs, unknown message types
- Error messages: are they helpful and actionable?
- Warnings when: secrets detected, session truncated, version mismatch
- Loading states and error states in the UI
- Verbose/debug mode availability
- Debug logging with proper redaction of sensitive data
- Graceful degradation when session data is incomplete or unexpected

For each finding, report: severity, file:line, description, and recommendation.
```

### Step 2: Compile the audit report

After all agents complete, compile their findings into a single structured report:

```markdown
# Codebase Audit Report

## Summary
- Total findings: N
- Critical: N | High: N | Medium: N | Low: N | Info: N

## 1. Security & Trust Boundaries
[Agent 1 findings, sorted by severity]

## 2. Secrets & Privacy Exposure
[Agent 2 findings, sorted by severity]

## 3. Data Integrity & Correctness
[Agent 3 findings, sorted by severity]

## 4. Networking Behavior
[Agent 4 findings, sorted by severity]

## 5. Local Attack Surface
[Agent 5 findings, sorted by severity]

## 6. Architecture & Maintainability
[Agent 6 findings, sorted by severity]

## 7. Testing & Reproducibility
[Agent 7 findings, sorted by severity]

## 8. Developer UX & Failure Modes
[Agent 8 findings, sorted by severity]

## Top Recommendations
[List the 5-10 most impactful recommendations across all dimensions]
```

### Step 3: Present findings

- Present the compiled report to the user
- Highlight any critical or high severity findings first
- If `$ARGUMENTS` requested a specific dimension, only show that section
- Offer to create task files for any findings the user wants to address
