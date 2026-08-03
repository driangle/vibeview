---
id: "cf-005"
title: "Deepen secret redaction beyond narrow regex shapes"
status: pending
priority: medium
effort: medium
type: improvement
tags: [security, privacy, backend]
group: critical-feedback
phase: critical-feedback
touches: ["lib/redact"]
created: 2026-08-03
context:
  - "apps/lib/redact/redact.go"
  - "apps/lib/redact/message.go"
  - "apps/cli/internal/server/server.go"
---

# Deepen secret redaction beyond narrow regex shapes

## Findings

Redaction is **plumbed well** — `redact.RedactAPIMessage`/`RedactMapValues` walk the full
message structure recursively (content blocks, tool inputs, tool outputs, `Data`,
`Snapshot`, `Attachment`) and are applied on every outbound path (server.go:946-953, 746).

The weakness is **detection depth**, not coverage. `sensitivePatterns` (redact.go:20-35)
only matches known shapes: `--flag=value`, `KEY=value` for an enumerated set of names,
`Bearer <token>`, connection strings, and SSH key blocks. A bare high-entropy secret that
a `Read`/`cat` tool dumps into output — a lone `AKIA...` access key, a standalone
`sk-ant-...` / `sk-...` key, a JWT not preceded by "Bearer", a GCP service-account JSON —
passes through unredacted. For the LAN-exposure feature this is a false sense of security:
the pipeline says "redacted" while common secret formats slip through.

Prior work `audit-008` established the redaction pipeline; this ticket is about the
completeness of the pattern set.

## Acceptance Criteria

- [ ] Add detectors for common standalone credential formats (AWS `AKIA`/`ASIA` + secret, `sk-ant-`/`sk-` API keys, GitHub `ghp_`/`gho_` tokens, bare JWTs, high-entropy hex/base64 blobs above a length/entropy threshold)
- [ ] Add table-driven tests with realistic tool-output fixtures (a `.env` dump, a `cat` of a credentials file) asserting the secrets are masked
- [ ] Document redaction as best-effort with its known limits in the LAN docs

## verify
```yaml
verify:
  - type: bash
    run: "go test ./redact/... -v"
    dir: "apps/lib"
  - type: assert
    check: "Standalone AWS keys, provider API keys, and bare JWTs in tool output are redacted, not just KEY=value / Bearer forms"
```
