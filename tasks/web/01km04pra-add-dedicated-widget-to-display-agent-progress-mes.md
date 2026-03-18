---
title: "Add dedicated widget to display agent_progress messages"
id: "01km04pra"
status: completed
priority: medium
type: feature
tags: ["session-view", "agent"]
created: "2026-03-18"
---

# Add dedicated widget to display agent_progress messages

## Objective

Add a dedicated UI widget in the SessionView to render `agent_progress` messages as collapsible subagent conversations, instead of showing them as raw JSON in the generic progress/system message fallback.

## Context

Claude Code spawns subagents (via the Agent tool) that produce `progress` messages with `data.type === "agent_progress"`. These messages represent a full conversation happening inside a subagent, including tool calls and results. Currently they fall through to the generic `SystemMessage` renderer which just shows raw JSON — not useful for understanding what the subagent is doing.

**Reference session:** `13694fc9-fb76-42ad-a765-eae35dcef50f`

### Data shape

Each `agent_progress` message is a `type: "progress"` JSONL entry with:
- `data.type`: `"agent_progress"`
- `data.agentId`: string identifying the subagent instance
- `data.prompt`: the prompt given to the subagent (non-empty on the first message only)
- `data.message`: a subagent conversation turn (`{ type: "user" | "assistant", message: APIMessage }`)
- `toolUseID`: the tool call ID that spawned the agent (same across all messages for one agent invocation)
- `parentToolUseID`: the parent tool use in the main conversation

Messages with the same `agentId` form a sequential conversation within a single subagent invocation.

## Tasks

- [ ] Group `agent_progress` messages by `agentId` to reconstruct each subagent's conversation
- [ ] Create an `AgentProgressWidget` component that renders a subagent conversation as a collapsible section
- [ ] Show the agent's prompt as the header/summary (from the first message's `data.prompt`)
- [ ] Render the subagent's assistant messages (tool calls, text responses) inside the collapsed section
- [ ] Wire up the new component in `MessageBubble.tsx` to route `agent_progress` messages to it instead of the generic `SystemMessage`
- [ ] Handle real-time streaming — new `agent_progress` messages arriving via SSE should append to the correct agent group

## Acceptance Criteria

- `agent_progress` messages are rendered in a dedicated collapsible widget, not as raw JSON
- The widget header shows the subagent's prompt text so the user can understand what the agent was asked to do
- Expanding the widget reveals the subagent's conversation turns (tool calls and responses)
- Multiple subagent invocations in the same session are rendered as separate widgets
- Real-time SSE messages for `agent_progress` are correctly grouped and appended
- Verified against reference session `13694fc9-fb76-42ad-a765-eae35dcef50f`
