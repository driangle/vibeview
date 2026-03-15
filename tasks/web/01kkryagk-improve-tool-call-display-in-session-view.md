---
title: "Strip or format raw XML tags in message rendering"
id: "01kkryagk"
status: pending
priority: high
type: bug
effort: small
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkqxa68"]
created: "2026-03-15"
---

# Strip or format raw XML tags in message rendering

## Objective

Messages in the session view display raw XML tags (e.g., `<command-message>`, `<command-name>`, `<system-reminder>`, `<function_calls>`) as visible text. These internal/system tags should either be stripped entirely or rendered in a meaningful, human-readable way rather than shown as raw markup.

## Tasks

- [ ] Identify all XML-like tags that appear in message content (e.g., `<command-name>`, `<command-message>`, `<command-args>`, `<system-reminder>`, `<function_calls>`, `<invoke>`, `<parameter>`)
- [ ] Strip or hide system/internal tags that provide no user value (e.g., `<system-reminder>`)
- [ ] For meaningful tags (e.g., `<command-name>`, `<command-args>`), either strip them or render their content in a formatted way
- [ ] Ensure markdown rendering still works correctly after tag processing
- [ ] Handle edge cases where tags span multiple lines or are nested

## Acceptance Criteria

- No raw XML tags are visible in the rendered session view
- System reminder tags are hidden entirely
- Command/tool invocation tags are either stripped or rendered as clean, formatted content
- Normal markdown content and code blocks containing angle brackets are not affected
