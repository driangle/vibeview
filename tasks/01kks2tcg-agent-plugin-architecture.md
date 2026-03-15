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
- [ ] Structure each plugin as a single package directory containing both frontend and backend code (e.g. `plugins/claude-code/`)
- [ ] Create a plugin registration/discovery mechanism so new agents can be added
- [ ] Define a version compatibility scheme for plugins (e.g. `>= 1.2.0`) declaring which agent CLI versions they support
- [ ] Implement version checking that warns or errors when the detected agent version falls outside the plugin's supported range
- [ ] Refactor core code to depend only on the agent-agnostic interfaces
- [ ] Ensure the ClaudeCode plugin passes all existing functionality as-is

## Acceptance Criteria

- Core application code contains no direct references to ClaudeCode-specific formats or conventions
- ClaudeCode support is implemented entirely through a plugin/adapter module
- A clear, documented interface exists for adding new agent plugins
- Adding a new agent plugin requires no changes to core code
- Each plugin is a single package directory co-locating its frontend and backend code
- Each plugin declares a supported agent version range (e.g. `>= 1.2.0`) so that breaking changes in event formats or new unsupported events can be detected
- When the detected agent version is outside the plugin's supported range, a clear warning or error is shown to the user
- All existing ClaudeCode functionality works identically after the refactor
