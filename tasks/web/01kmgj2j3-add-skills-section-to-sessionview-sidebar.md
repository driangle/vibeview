---
title: "Add Skills section to SessionView sidebar"
id: "01kmgj2j3"
status: completed
priority: medium
type: feature
tags: ["ui", "sidebar"]
created: "2026-03-24"
---

# Add Skills section to SessionView sidebar

## Objective

Add a "Skills" section to the `SessionSidebar` in `SessionView.tsx` that displays the Skill tool invocations found in the session. Skills (slash commands like `/commit`, `/review-pr`) are invoked via the `Skill` tool during a session. This section should list each skill used, similar to how other sidebar sections (Tool Usage, Bash Commands, etc.) summarize session activity.

## Tasks

- [x] Create a `SkillsSummary` component that extracts Skill tool calls from session messages
- [x] Display each skill name, with invocation count if used multiple times
- [x] Add the `SkillsSummary` component to `SessionSidebar` between existing sections
- [x] Support `onNavigateToMessage` to jump to the message where a skill was invoked

## Acceptance Criteria

- A "Skills" section appears in the sidebar when the session contains Skill tool invocations
- Each distinct skill name is listed with its usage count
- Clicking a skill entry navigates to the corresponding message in the conversation
- The section is hidden when no skills were used in the session
- Visual style is consistent with other sidebar sections (uses `SidebarSection` component)
