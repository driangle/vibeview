---
id: "audit-003"
title: "Add XSS sanitization to markdown and HTML rendering"
status: pending
priority: high
effort: small
type: bug
tags: [security, frontend]
group: audit
touches: ["web/components/MessageContent", "web/components/processMessageContent"]
context:
  - "apps/web/src/components/MessageContent.tsx"
  - "apps/web/src/components/processMessageContent.ts"
  - "apps/web/src/components/ThinkingBlock.tsx"
---

# Add XSS sanitization to markdown and HTML rendering

## Findings

### HIGH: No rehype-sanitize on react-markdown (MessageContent.tsx:2-31)
`react-markdown` is used without `rehype-sanitize`. Malicious HTML in session data could render unsafe content.

### MEDIUM: HTML tag whitelist includes dangerous tags (processMessageContent.ts:68-76)
The `HTML_TAGS` regex whitelist includes `<iframe>`, `<svg>`, `<img>` which can carry XSS payloads via event handlers (`onerror`, `onload`).

### HIGH: Thinking block content rendered directly (ThinkingBlock.tsx:57-59)
Content in `<pre>` tag without explicit escaping (React escapes by default but should be explicit).

## Acceptance Criteria

- [ ] Add `rehype-sanitize` plugin to react-markdown
- [ ] Remove `iframe`, `svg`, `path`, `rect`, `circle`, `line`, `video`, `audio` from HTML tag whitelist
- [ ] Strip event handler attributes (`onerror`, `onload`, `onclick`, etc.) from allowed tags
- [ ] Verify thinking blocks are safely rendered
