# Session Timeline — Semantic 2D Map

**Date:** 2026-03-22
**Scope:** Replace linear message list in SessionView with a spatial, human-centric timeline visualization

---

## Overview

The current SessionView renders conversation messages as a paginated vertical list — functional but purely technical. This feature replaces it with a **2D semantic timeline** that spatially maps the conversation as an interactive journey, emphasizing *what happened* and *why* over raw message content.

The conversation flows left-to-right through colored **phase regions** (planning, researching, coding, debugging, etc.), with **interaction nodes** representing each exchange cycle. Tool activity, thinking depth, subagent work, and error recovery are all visible at a glance without expanding individual messages.

---

## Design Principles

- **Spatial over sequential** — position and proximity convey meaning, not just chronological order
- **Overview first, details on demand** — the map is scannable in seconds; drill down by clicking
- **No AI required for v1** — phase classification uses tool call heuristics, not LLM calls
- **Coexist with existing view** — users can toggle between timeline and classic list view

---

## Core Concepts

### Exchange Cycle

The fundamental unit. One exchange cycle = a user prompt and the full assistant response that follows (including all tool calls, thinking, and subagent work). Messages of type `progress`, `system`, and `file-history-snapshot` are folded into the cycle they belong to.

### Phase

A contiguous group of exchange cycles sharing the same semantic classification. Phases define the colored background regions on the map.

### Node

The visual representation of an exchange cycle on the timeline. Nodes vary in size, shape, and icon based on the cycle's characteristics.

---

## Phase Classification (Heuristic Engine)

Each exchange cycle is classified into a phase by analyzing its tool calls, message content, and structural patterns. Classification is rule-based and runs client-side.

### Phase Types

| Phase | Color | Detection Rules |
|---|---|---|
| **Planning** | Blue | No tool calls, or only thinking blocks. High text-to-tool ratio. Long user prompts. |
| **Research** | Indigo | Dominant tool calls are `Glob`, `Grep`, `Read`, `Agent(Explore)`. No `Edit`/`Write`. |
| **Coding** | Green | `Edit` or `Write` tool calls present. Primary activity is file modification. |
| **Testing** | Amber | `Bash` calls where command matches test patterns (`test`, `jest`, `pytest`, `vitest`, `cargo test`, `go test`, `make test`). |
| **Debugging** | Orange | Cycle contains `is_error: true` in tool results, OR alternating `Edit` -> `Bash` (fail) -> `Read`/`Edit` pattern within a single response. |
| **DevOps** | Purple | `Bash` calls matching git/deploy patterns (`git commit`, `git push`, `gh pr`, `docker`, `make build`). |
| **Configuration** | Slate | `Edit`/`Write` targeting config files (`.json`, `.yaml`, `.toml`, `.env`, `.config.*`, `Makefile`, `Dockerfile`). |
| **Conversation** | Gray | Fallback — no tool calls, short exchanges, clarification questions. |

### Classification Algorithm

```
for each exchange cycle:
  1. Extract tool_use blocks from assistant message content
  2. Extract tool_result blocks from the following user message (if any)
  3. Build feature set:
     - toolNames: Set<string>        — unique tool names used
     - hasErrors: boolean             — any tool_result with is_error
     - fileExtensions: Set<string>    — from Edit/Write/Read file_path inputs
     - bashCommands: string[]         — from Bash tool input.command
     - thinkingTokens: number         — total length of thinking blocks
     - textTokens: number             — total length of text blocks
     - hasSubagents: boolean          — Agent tool calls present
  4. Apply rules in priority order (first match wins):
     a. Debugging  — hasErrors OR (has Edit + has failing Bash in same cycle)
     b. Testing    — bashCommands match test patterns
     c. DevOps     — bashCommands match git/deploy patterns
     d. Configuration — Edit/Write targets config file extensions
     e. Coding     — toolNames includes Edit or Write
     f. Research   — toolNames subset of {Glob, Grep, Read, Agent}
     g. Planning   — thinkingTokens > 0 AND no tool calls, OR textTokens >> toolTokens
     h. Conversation — default fallback

  5. Merge adjacent cycles with same phase into a single region
     - Minimum region size: 1 cycle (no merging threshold)
     - Allow single-cycle phases to stand alone
```

### Node Properties (derived per cycle)

| Property | Derivation |
|---|---|
| **Size** | Based on total token count (input + output) of the cycle, bucketed into S/M/L/XL |
| **Icon** | Primary phase icon, with overlay badges for notable traits |
| **Badges** | Error (red dot), deep thinking (brain icon), subagent (fork icon), approval gate (pause icon) |
| **Files touched** | List of file paths from Read/Edit/Write/Glob tool inputs |
| **Cost** | Sum of usage.costUSD for messages in the cycle |
| **Duration** | Timestamp delta between first and last message in the cycle |

---

## Visual Layout

### Primary View: Horizontal Timeline

```
+------------------------------------------------------------------+
|  [Planning]     [Research]        [Coding]      [Debug] [Coding]  |  <- phase regions
|                                                                    |
|    (o)  (o)    (o) (O) (o)    (O) (O) (o)(o)   (!) (O)  (o)     |  <- nodes
|                       \                                            |
|                        `---(agent)---`                             |  <- subagent fork
|                                                                    |
|  ---- read read grep ---- edit edit bash ---- edit bash edit ---- |  <- tool activity lane
+------------------------------------------------------------------+
     [Pan / scroll horizontally]              [Zoom: +/-]
```

### Layers (bottom to top)

1. **Phase regions** — Soft colored rectangles spanning the width of each phase. Rounded corners, subtle gradient.
2. **Tool activity lane** — Thin strip below the main path showing individual tool calls as small glyphs/dots. Provides texture for "how much work" happened.
3. **Connection path** — A smooth curve connecting nodes in sequence. Represents the flow of conversation.
4. **Nodes** — Circles/shapes positioned along the path. Interactive (hover/click).
5. **Subagent branches** — When `Agent` tool calls spawn work, the path forks downward and merges back.
6. **Annotations** — Floating labels for phase names, timestamps at key points, file names near edit-heavy nodes.

### Interaction

| Action | Result |
|---|---|
| **Hover node** | Tooltip showing: user prompt preview (first ~100 chars), phase, tool count, cost, duration |
| **Click node** | Side panel opens with full message content (reusing existing MessageBubble component) |
| **Scroll/drag** | Pan horizontally through the timeline |
| **Zoom** | Mouse wheel or +/- buttons. Zoom out collapses nodes into phase summaries; zoom in reveals individual tool calls |
| **Click phase region** | Highlights all nodes in that phase, shows phase summary stats |

### Responsive Behavior

- On narrow viewports, the timeline becomes vertically scrollable (top-to-bottom) instead of horizontal
- Detail panel renders as a bottom sheet on mobile

---

## Implementation

### Technology

- **SVG-based rendering** within React — nodes, paths, and regions are SVG elements
- **No new dependencies** for v1 — use native SVG + React refs for pan/zoom
- If pan/zoom complexity warrants it, consider adding a lightweight library later

### Component Structure

```
src/
  pages/
    SessionView.tsx              # Toggle between timeline and list view
  components/
    timeline/
      SessionTimeline.tsx        # Main timeline container (SVG viewport, pan/zoom)
      TimelinePhaseRegion.tsx    # Colored background region for a phase
      TimelineNode.tsx           # Individual exchange cycle node
      TimelineToolLane.tsx       # Tool activity strip
      TimelineSubagentBranch.tsx # Forking path for agent work
      TimelineDetailPanel.tsx    # Side panel for selected node content
      TimelineMinimap.tsx        # Optional: small overview for long sessions
  lib/
    timeline/
      classifyPhase.ts           # Phase classification engine
      buildTimeline.ts           # Groups messages into cycles, classifies, lays out
      layoutEngine.ts            # Computes x/y positions for nodes and regions
```

### Data Flow

```
SessionDetail.messages
  -> buildTimeline(messages)
     -> groupIntoCycles(messages)         // group by user->assistant pairs
     -> classifyPhase(cycle)              // for each cycle
     -> mergeAdjacentPhases(cycles)       // create phase regions
     -> layoutEngine(cycles, phases)      // compute positions
  -> TimelineData { cycles, phases, layout }
     -> SessionTimeline renders SVG
```

### Layout Algorithm

1. Each cycle gets a fixed horizontal slot width (adjustable by zoom level)
2. Phases span the combined width of their constituent cycles
3. Nodes are positioned at the center of their slot, vertically centered on the main path
4. Subagent branches offset downward with bezier curves connecting to parent
5. Tool lane glyphs are evenly spaced within each cycle's slot

---

## AI Enrichment (Future — v2)

In a future version, users can trigger an **AI enrichment** pass that enhances the timeline with deeper semantic understanding. This is an explicit user action, not automatic.

### Mechanism

The backend invokes Claude CLI via [agent-runner](https://github.com/driangle/agent-runner) (Go library) to analyze the conversation:

```go
runner := claudecode.NewRunner()

result, err := runner.Run(ctx, enrichmentPrompt,
    agentrunner.WithModel("claude-sonnet-4-20250514"),
    claudecode.WithMaxBudgetUSD(0.10),
)
```

### What AI Adds

| Enhancement | Description |
|---|---|
| **Phase summaries** | Short natural-language description of what each phase accomplished ("Refactored auth middleware to use JWT validation") |
| **Node titles** | Human-readable names for exchange cycles instead of prompt previews ("Fix failing login test") |
| **Intent tags** | Richer semantic tags beyond tool heuristics (e.g., "security fix", "performance optimization", "tech debt") |
| **Key decisions** | Highlights moments where significant architectural or design decisions were made |
| **Narrative summary** | A top-level paragraph summarizing the entire session as a story |

### API

```
POST /api/sessions/{id}/enrich
  -> Triggers agent-runner call
  -> Stores enrichment result alongside session data
  -> Returns enrichment JSON

GET /api/sessions/{id}/enrichment
  -> Returns cached enrichment (if available)
```

### Enrichment Data Model

```typescript
interface SessionEnrichment {
  sessionId: string;
  enrichedAt: string;
  narrative: string;                    // top-level session summary
  phases: PhaseEnrichment[];
  cycles: CycleEnrichment[];
  keyDecisions: KeyDecision[];
}

interface PhaseEnrichment {
  phaseIndex: number;
  summary: string;
}

interface CycleEnrichment {
  cycleIndex: number;
  title: string;
  intentTags: string[];
}

interface KeyDecision {
  cycleIndex: number;
  description: string;
}
```

### Storage

Enrichment results are stored as `{sessionId}.enrichment.json` alongside the session JSONL, or in a dedicated VibeView data directory. Cached indefinitely — user can re-trigger to refresh.

---

## View Toggle

SessionView gets a toggle control in the header:

```
[List View] [Timeline View]
```

- Default view is persisted in user settings (existing settings system)
- Both views share the same data hooks (`useSessionData`)
- Timeline view adds its own processing pipeline on top

---

## Open Questions

1. **Long sessions** — Sessions with 100+ exchanges need virtualization or aggressive zoom-out. Minimap component may be needed for navigation.
2. **Live streaming** — When a session is active, new nodes should animate into the timeline. Need to decide whether to auto-scroll or show a "new activity" indicator.
3. **Phase boundary ambiguity** — Some cycles are genuinely multi-phase (research + coding in one response). Should we allow hybrid phases or pick the dominant one?
4. **Performance budget** — SVG with 200+ nodes may need optimization. If so, consider canvas fallback for the tool lane or node rendering.
