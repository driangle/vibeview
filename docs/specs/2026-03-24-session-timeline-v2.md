# Session Timeline v2 — Layered Cognition Map

**Date:** 2026-03-24
**Builds on:** [Session Timeline v1](2026-03-22-session-timeline.md)
**Scope:** Extend the v1 horizontal timeline with vertical semantic positioning, toggleable cognition layers, artifact visualization, replay, and provenance tracing

---

## Overview

v1 delivers a horizontal phase-colored timeline with interactive nodes. v2 transforms it into a **layered cognition map** — a 2D canvas where the Y-axis encodes abstraction depth, visual layers can be toggled like Photoshop, artifacts orbit their source nodes, and users can replay conversations as animations.

This spec assumes v1 is shipped and stable. Each section is an independent enhancement that can be built and released incrementally.

---

## Design Principles (extending v1)

- **Two axes of meaning** — X = time, Y = abstraction level
- **Layers are toggleable** — users control information density
- **Artifacts are first-class objects** — not hidden behind click-through panels
- **Replay over replay** — conversations are watchable, not just readable
- **Provenance is navigable** — every output traces back to its origin
- **Progressive disclosure** — zoom level controls semantic resolution

---

## 1. Vertical Abstraction Axis

### Concept

v1 positions all nodes on a single horizontal path. v2 introduces a Y-axis that maps each node's **abstraction level** — the layer of work the exchange cycle operates at.

### Abstraction Levels

| Level | Y-Position | Description | Detection |
|---|---|---|---|
| **Intent** | Top | Requirements, goals, acceptance criteria | Planning phase + long user prompts with no tool calls |
| **Design** | Upper-mid | Architecture decisions, interface contracts | Planning/Research phase + mentions of patterns, modules, APIs in text |
| **Implementation** | Center | Writing and editing code | Coding phase (Edit/Write tools) |
| **Execution** | Lower-mid | Running code, test suites, builds | Testing/DevOps phase (Bash tool calls) |
| **Result** | Bottom | Outputs, errors, test results, deployed artifacts | Cycles where dominant content is tool_result blocks |

### Layout Changes

```
    Intent       (o)          (o)                              (o)
    Design            (o)              (O)
    Implement                    (O) (o)(o)         (O)  (o)
    Execute                                  (o)
    Result                                    (!)
               |-- Planning --|-- Research+Coding --|-- Debug --|
```

- Nodes float to their Y-level instead of sitting on a single horizontal path
- The connection path becomes a smooth spline that curves between levels
- Phase regions remain as vertical bands spanning full height
- When abstraction detection is ambiguous, default to the v1 center-line position

### Classification

Abstraction level classification extends the existing `CycleFeatures` with additional signals:

```typescript
interface AbstractionFeatures extends CycleFeatures {
  userPromptLength: number;
  toolResultRatio: number;       // tool_result tokens / total tokens
  mentionsArchitecture: boolean; // regex match for design-level keywords
  hasCodeOutput: boolean;        // Edit/Write present
  hasExecutionOutput: boolean;   // Bash tool results present
  dominantContentType: 'text' | 'tool_use' | 'tool_result' | 'thinking';
}
```

Classification rules (first match wins, similar to phase rules):

```
1. Result    — toolResultRatio > 0.6 AND (hasErrors OR hasExecutionOutput)
2. Execution — phase is testing/devops AND bashCommands.length > 0
3. Implementation — phase is coding
4. Design    — phase is planning/research AND mentionsArchitecture
5. Intent    — phase is planning AND userPromptLength > 500 AND no tool calls
6. Default   — map to center (Implementation level)
```

### Data Model Addition

```typescript
type AbstractionLevel = 'intent' | 'design' | 'implementation' | 'execution' | 'result';

// Added to TimelineCycle
interface TimelineCycle {
  // ... existing v1 fields
  abstractionLevel: AbstractionLevel;
}
```

---

## 2. Toggleable Cognition Layers

### Concept

The timeline canvas supports overlay layers that users toggle on/off via a layer panel, similar to Photoshop's layer palette or a map legend. Each layer adds or modifies visual information on the existing timeline.

### Layer Definitions

| Layer | Default | Visual Effect | Data Source |
|---|---|---|---|
| **Phase Regions** | ON | Colored background bands | v1 phase classification |
| **Tool Activity** | ON | Glyph strip below nodes | v1 tool lane |
| **Reasoning Depth** | OFF | Node glow intensity proportional to thinking token count | `CycleFeatures.thinkingTokens` |
| **Cost Heatmap** | OFF | Node border color gradient (green→yellow→red) by `costUSD` | `TimelineCycle.costUSD` |
| **Error Hotspots** | OFF | Red pulse animation on error nodes, red-tinted phase regions containing errors | `CycleFeatures.hasErrors` |
| **File Impact** | OFF | Radial lines from node to a file list sidebar; line thickness = edit count per file | `TimelineCycle.filesTouched` |
| **Subagent Work** | ON | Branch paths forking below main path | v1 subagent branches |
| **Confidence** | OFF | Node opacity scales with AI enrichment confidence score | Requires AI enrichment (v1 enrichment data) |
| **Annotations** | ON | Phase labels, timestamps, file names | v1 annotations |

### Interaction

- Layer panel sits in the top-right corner of the timeline viewport, collapsible
- Each layer has a toggle switch, name, and icon
- Layers can be reordered by drag (render order = visual stacking)
- "Presets" for common combinations: Minimal (phases + nodes only), Developer (+ tools + files), Debug (+ errors + cost), Full

### Component

```
components/
  timeline/
    TimelineLayerPanel.tsx       # Layer toggle UI
    layers/
      ReasoningDepthLayer.tsx    # Glow overlay
      CostHeatmapLayer.tsx       # Border color overlay
      ErrorHotspotsLayer.tsx     # Pulse animation overlay
      FileImpactLayer.tsx        # Radial file lines
      ConfidenceLayer.tsx        # Opacity overlay
```

### Data Model

```typescript
interface LayerState {
  id: string;
  enabled: boolean;
  order: number;
}

// Persisted in user settings alongside existing view preferences
interface TimelineSettings {
  layers: LayerState[];
  activePreset: string | null;
}
```

---

## 3. Artifact Constellations

### Concept

Each exchange cycle may produce artifacts — code files, diffs, test results, stack traces, command outputs. Instead of hiding these behind a click-through panel, v2 renders them as **satellite objects** orbiting their source node.

### Artifact Types

| Type | Icon | Source |
|---|---|---|
| **Code File** | Document | Edit/Write tool calls — one per unique file path |
| **Diff** | Split-view | Edit tool calls — inline change preview |
| **Test Result** | Check/X | Bash tool results matching test patterns |
| **Command Output** | Terminal | Bash tool results (non-test) |
| **Error** | Alert | tool_result with `is_error: true` |
| **Search Result** | Magnifier | Glob/Grep results |
| **Read Snapshot** | Eye | Read tool calls |

### Layout

Artifacts are positioned in a circular orbit around their parent node:

```
              [diff]
         [file]  (O)  [test]
              [error]
```

- Orbit radius scales with node size (larger nodes = wider orbit)
- Artifacts are small glyphs (12-16px) with type-specific icons
- When nodes are close together, artifacts collapse into a count badge: `(O) +5`
- Zoom in to expand artifacts; zoom out to collapse

### Interaction

| Action | Result |
|---|---|
| **Hover artifact** | Tooltip: file name, artifact type, size/line count |
| **Click code file** | Opens inline code preview in detail panel with syntax highlighting |
| **Click diff** | Opens diff view in detail panel (reuse existing diff widget from v1 task `01km3xdfr`) |
| **Click test result** | Shows pass/fail summary with output |
| **Click error** | Shows error message with stack trace if available |

### Data Model

```typescript
type ArtifactType = 'code-file' | 'diff' | 'test-result' | 'command-output' | 'error' | 'search-result' | 'read-snapshot';

interface CycleArtifact {
  type: ArtifactType;
  label: string;          // file name or command summary
  toolCallIndex: number;  // index into the cycle's tool calls for provenance
  preview?: string;       // first ~200 chars for tooltip
}

// Added to TimelineCycle
interface TimelineCycle {
  // ... existing fields
  artifacts: CycleArtifact[];
}
```

### Component

```
components/
  timeline/
    TimelineArtifact.tsx          # Individual artifact glyph
    TimelineArtifactOrbit.tsx     # Positions artifacts around a node
    ArtifactPreview.tsx           # Inline preview in detail panel
```

---

## 4. Semantic Zoom (Progressive Disclosure)

### Concept

v1 has two disclosure levels: map overview and click-to-detail-panel. v2 introduces four semantic zoom levels that progressively reveal more information as the user zooms in — like Google Maps going from continent to street view.

### Zoom Levels

| Level | Trigger | What's Visible |
|---|---|---|
| **L1 — Session Overview** | Max zoom out | Phase regions as colored blocks with labels. No individual nodes. Phase duration and cycle count displayed. |
| **L2 — Phase Flow** | Default zoom | Phase regions + nodes as circles. Connection path visible. Badges on nodes. This is equivalent to v1's default view. |
| **L3 — Cycle Detail** | Zoom in | Nodes expand to show: prompt preview (first line), primary tool icon, artifact satellites, cost badge. Tool lane shows individual glyphs. |
| **L4 — Full Content** | Max zoom in | Nodes become cards showing structured content: user prompt, assistant summary, tool call list, artifacts expanded inline. Approaching the detail level of the list view. |

### Transitions

- Zoom levels blend smoothly — elements fade in/out as the zoom crosses thresholds
- Zoom thresholds are configurable in `LayoutConfig`
- Keyboard shortcuts: `1`, `2`, `3`, `4` to jump to each level

### Layout Config Addition

```typescript
interface LayoutConfig {
  // ... existing v1 fields
  zoomThresholds: {
    l1: number;  // zoom scale below which L1 activates (e.g., 0.3)
    l2: number;  // L2 range lower bound (e.g., 0.5)
    l3: number;  // L3 range lower bound (e.g., 1.0)
    l4: number;  // L4 range lower bound (e.g., 2.0)
  };
}
```

---

## 5. Replay Mode

### Concept

Users can replay the conversation as an animation, watching nodes appear one by one in chronological order. This turns a static map into a narrated timeline — useful for reviewing sessions, onboarding teammates, or understanding how a debugging session evolved.

### Controls

```
[|<] [<] [>||] [>] [>|]     [1x] [2x] [4x] [8x]     [---o--------] 12/47
 start back play  fwd  end    speed selector              scrub bar
```

### Behavior

- **Play**: Nodes appear one at a time with a fade-in animation. The viewport auto-pans to keep the current node centered.
- **Speed**: Controls the delay between nodes. At 1x, delay = actual time between exchanges (capped at 5s). At 8x, minimum delay between nodes.
- **Scrub bar**: Drag to jump to any point in the conversation. Shows cycle index / total.
- **Pause**: Freezes on current node. Detail panel shows that node's content.
- **Step forward/back**: Advance or retreat one cycle at a time.

### Visual During Replay

- Nodes ahead of the playhead render as dim outlines (ghost nodes)
- The current node has a highlight ring animation
- Phase regions fill in progressively as nodes within them appear
- Tool lane animates: glyphs appear in sequence within each cycle

### Component

```
components/
  timeline/
    TimelineReplayControls.tsx   # Transport bar UI
    useReplayState.ts            # Manages playhead position, speed, play/pause state
```

### Data Model

```typescript
interface ReplayState {
  playing: boolean;
  speed: 1 | 2 | 4 | 8;
  currentCycleIndex: number;
  totalCycles: number;
}
```

---

## 6. Provenance Tracing

### Concept

Users can ask "why did the agent do this?" and get a visual answer. Clicking a provenance action on any node highlights the chain of causation — which earlier nodes, tool results, or user instructions led to this output.

### Provenance Chain

Each cycle can reference earlier cycles that influenced it. Provenance is derived from two sources:

1. **Heuristic provenance** (automatic): If cycle N contains an error that cycle N+1 fixes (same file), link them. If cycle N reads a file that cycle N+2 edits, link them.
2. **AI provenance** (enrichment): The AI enrichment pass (from v1 spec) is extended to identify causal links between cycles.

### Interaction

| Action | Result |
|---|---|
| **Right-click node → "Trace origin"** | Highlights ancestor nodes with directed arrows showing the provenance chain. Non-related nodes dim. |
| **Right-click node → "Trace impact"** | Highlights descendant nodes that were influenced by this cycle. |
| **Click provenance arrow** | Tooltip explains the relationship ("This edit was triggered by the test failure in cycle #12") |
| **Escape** | Clears provenance highlight |

### Visual

```
  (o) ----→ (o) ----→ (!) ----→ (O)
  "read     "edit     "test     "fix based on
   config"   config"   failed"   error in #3"
```

- Provenance arrows render as dashed directional lines between nodes
- Arrow color matches the type of relationship (error-fix = red, read-then-edit = blue, etc.)
- Non-provenance nodes fade to 20% opacity during tracing

### Data Model

```typescript
type ProvenanceRelation = 'error-fix' | 'read-then-edit' | 'test-then-fix' | 'ai-identified';

interface ProvenanceLink {
  fromCycleIndex: number;
  toCycleIndex: number;
  relation: ProvenanceRelation;
  description?: string;         // human-readable, populated by AI enrichment
}

// Added to TimelineData
interface TimelineData {
  // ... existing fields
  provenanceLinks: ProvenanceLink[];
}
```

### Heuristic Link Detection

```
for each cycle pair (i, j) where j > i:
  1. error-fix: cycle i has error in file F, cycle j edits file F within 3 cycles
  2. read-then-edit: cycle i reads file F (Read tool), cycle j edits file F (Edit/Write)
  3. test-then-fix: cycle i is testing phase with failure, cycle j is coding/debugging phase
```

---

## 7. Role Embodiment (Visual Identity)

### Concept

v1 nodes are uniform circles differentiated only by size and phase icon. v2 gives each actor a distinct visual language so the conversation reads as a dialogue between distinct entities.

### Actor Styles

| Actor | Shape | Style | Border |
|---|---|---|---|
| **User** | Rounded rectangle | Solid fill, sharp edges, terminal-monospace font for prompt preview | 2px solid, phase-colored |
| **Agent** | Circle with soft glow | Gradient fill, slightly translucent | 1px soft, phase-colored |
| **System/Tool** | Hexagon | Flat mechanical fill, dashed border | 1px dashed, gray |
| **Subagent** | Smaller circle | Same as agent but 70% scale, connected by branch | 1px soft, dimmed phase color |

### Application

- In L2 (default zoom), actor shape is visible but subtle
- In L3/L4, the full visual differentiation is rendered including font styles
- Role legend appears in the layer panel

---

## 8. Live Session Animations

### Concept

When viewing an active session, the timeline animates to reflect real-time activity — not just appending nodes, but providing visual feedback for what the agent is currently doing.

### Animation Types

| Event | Animation |
|---|---|
| **New node appearing** | Fade in + slight bounce at the timeline edge |
| **Tool call in progress** | Pulsing glyph in the tool lane |
| **Bash command running** | Spinning indicator on the tool glyph |
| **Error encountered** | Red flash on the node + ripple through the phase region |
| **Thinking in progress** | Gentle breathing glow on the current node |
| **Subagent spawned** | Branch path animates downward from the current node |
| **Phase transition** | New phase region slides in from the right with a color wipe |

### Viewport Behavior

- **Auto-follow ON** (default for active sessions): Viewport pans to keep the latest node visible with a smooth scroll
- **Auto-follow OFF**: A "new activity" pill appears at the right edge with a count of unseen nodes. Click to jump.
- Auto-follow toggles off automatically when the user manually pans/zooms

### Data Source

Live animations are driven by the existing SSE stream (`useSessionData`). Each SSE event maps to an animation trigger:

```typescript
type AnimationTrigger =
  | { type: 'node-appear'; cycleIndex: number }
  | { type: 'tool-active'; toolName: string }
  | { type: 'tool-complete'; toolName: string; isError: boolean }
  | { type: 'thinking-active' }
  | { type: 'phase-change'; newPhase: Phase };
```

---

## 9. Conversation Bookmarks

### Concept

Users can bookmark specific nodes or ranges of nodes to mark important moments in the conversation — key decisions, breakthroughs, interesting failures.

### Interaction

- **Right-click node → "Bookmark"** or keyboard shortcut `B` while hovering
- Bookmarked nodes get a small flag icon above them
- **Bookmark panel** (collapsible sidebar) lists all bookmarks with:
  - Node index and prompt preview
  - Optional user-added note
  - Click to navigate to that node

### Storage

Bookmarks are stored in localStorage keyed by session ID. They are client-only and do not affect the session data.

```typescript
interface Bookmark {
  cycleIndex: number;
  note: string;
  createdAt: string;
}

// localStorage key: `vibeview:bookmarks:{sessionId}`
```

---

## Implementation Priorities

These features are independent and can be built in any order. Recommended priority based on value and complexity:

| Priority | Feature | Complexity | Value |
|---|---|---|---|
| 1 | Semantic Zoom (Progressive Disclosure) | Medium | High — dramatically improves navigation of long sessions |
| 2 | Toggleable Cognition Layers | Medium | High — gives users control over information density |
| 3 | Replay Mode | Medium | High — unique capability, strong demo value |
| 4 | Artifact Constellations | Medium | Medium — makes tool output visible without clicking |
| 5 | Conversation Bookmarks | Low | Medium — simple to build, immediately useful |
| 6 | Vertical Abstraction Axis | High | Medium — requires layout engine rework, classification tuning |
| 7 | Live Session Animations | Medium | Medium — polish feature, depends on SSE reliability |
| 8 | Provenance Tracing | High | Medium — heuristic version is tractable, AI version needs enrichment |
| 9 | Role Embodiment | Low | Low — visual polish, can be done anytime |

---

## Dependency on v1

All v2 features build on the v1 foundation:

- **v1 phase classification** → used by layers, abstraction axis, provenance
- **v1 layout engine** → extended by abstraction axis, semantic zoom
- **v1 SVG viewport + pan/zoom** → used by all visual features
- **v1 detail panel** → reused by artifact preview, provenance display
- **v1 AI enrichment** → extended by provenance (AI-identified links), confidence layer

No v2 feature requires modifying v1's core data pipeline. All extensions are additive — new fields on existing types, new components alongside existing ones, new layers rendered on top of the existing SVG.

---

## Out of Scope for v2

These PM ideas are noted but deferred beyond v2:

- **Branchable reality / what-if forks** — Requires conversation forking at the agent level, which is outside VibeView's read-only observation model. VibeView visualizes sessions that have already happened; it does not control the agent. This would require integration with the agent runtime.
- **Drag to cluster** — User-driven spatial rearrangement conflicts with the algorithmic layout. Would need a freeform canvas mode that is a fundamentally different interaction model.
- **Collaborative cursor presence** — VibeView is a single-user tool. Multi-user presence requires WebSocket infrastructure and auth.
- **Diff view between agent responses** — Meaningful only for branched conversations, which are out of scope (see above).
- **Token stream playback** (L5 zoom) — Requires token-level timing data not available in the JSONL format.
