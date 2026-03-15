---
title: "Build session view page with message rendering"
id: "01kkqxa68"
status: pending
priority: high
effort: large
type: feature
tags: ["frontend", "ui"]
phase: "core"
dependencies: ["01kkqx8dr", "01kkqx60d"]
created: "2026-03-15"
---

# Build session view page with message rendering

## Objective

Implement the session view page at `/session/:id` with a chat-style read-only layout. Render all message types with appropriate styling: user messages, assistant messages with markdown, tool calls as collapsible blocks, and thinking blocks as collapsible muted sections.

## Tasks

- [ ] Define TypeScript types for session detail API response and all content block types
- [ ] Create SWR hook for fetching session detail from `GET /api/sessions/:id`
- [ ] Build chat-style message layout (user right-aligned, assistant left-aligned)
- [ ] Render user messages with plain text or tool result content
- [ ] Render assistant text blocks with markdown (react-markdown + remark-gfm)
- [ ] Render tool_use blocks as collapsible sections showing tool name, input, and paired tool_result
- [ ] Render thinking blocks as collapsible, visually distinct sections (muted/italic)
- [ ] Render system/progress messages as small muted inline indicators
- [ ] Add syntax highlighting for code blocks (shiki or highlight.js)
- [ ] Implement message pagination (50 messages per page) for large sessions
- [ ] Style with Tailwind CSS

## Acceptance Criteria

- Session messages render in chronological order
- User and assistant messages have distinct visual styles
- Tool calls are collapsible and show name, input, and result
- Thinking blocks are collapsible and visually muted
- Markdown renders correctly including code blocks with syntax highlighting
- Pagination works for sessions with more than 50 messages
- Loading and error states handled gracefully
