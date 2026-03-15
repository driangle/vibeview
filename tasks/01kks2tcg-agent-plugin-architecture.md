---
title: "Modularize ClaudeCode-specific code into a plugin architecture"
id: "01kks2tcg"
status: pending
priority: high
type: feature
tags: ["architecture", "extensibility"]
created: "2026-03-15"
---

# Modularize ClaudeCode-specific code into a plugin architecture

## Objective

Separate all ClaudeCode-specific logic (session parsing, message scanning, UX conventions) from the core application into a clean plugin/adapter architecture. The core should be agent-agnostic, and ClaudeCode support should be the first plugin. This enables adding support for additional coding agents (e.g. Cursor, Copilot, Aider) in the future without modifying core code.

This is intentionally a large task — it will be split into smaller subtasks later.

## Tasks

- [ ] Audit the codebase to identify all ClaudeCode-specific code (parsing, scanning, rendering, data models)
- [ ] Define a core agent-agnostic interface/contract (session structure, message types, tool call representation, etc.)
- [ ] Extract ClaudeCode-specific parsing logic into a dedicated plugin/adapter module
- [ ] Extract ClaudeCode-specific session scanning/discovery into the plugin
- [ ] Extract ClaudeCode-specific UX logic (message rendering, tool call display, status indicators) into the plugin
- [ ] Create a plugin registration/discovery mechanism so new agents can be added
- [ ] Refactor core code to depend only on the agent-agnostic interfaces
- [ ] Ensure the ClaudeCode plugin passes all existing functionality as-is

## Acceptance Criteria

- Core application code contains no direct references to ClaudeCode-specific formats or conventions
- ClaudeCode support is implemented entirely through a plugin/adapter module
- A clear, documented interface exists for adding new agent plugins
- Adding a new agent plugin requires no changes to core code
- All existing ClaudeCode functionality works identically after the refactor
