---
title: "Show first page of conversation by default with manual navigation to last page"
id: "01kkzrf9t"
status: in-progress
priority: medium
type: feature
tags: ["ui", "session"]
created: "2026-03-18"
---

# Show first page of conversation by default with manual navigation to last page

## Objective

On the Session view page, change the default behavior so that the first page of a conversation is shown when a session is opened. Currently the conversation jumps to the latest/last page. Add pagination controls that let the user manually navigate to the last page (and between pages) when they want to see more recent messages.

## Tasks

- [ ] Change the Session view to load and display the first page of conversation messages by default
- [ ] Add pagination controls (e.g., previous/next page, jump to first/last) to the Session view
- [ ] Ensure the "go to last page" action scrolls to and loads the most recent messages
- [ ] Preserve any existing scroll-to-bottom behavior as a manual user action rather than automatic

## Acceptance Criteria

- When opening a session, the first page of the conversation is displayed by default
- Pagination controls are visible and allow navigating between pages
- User can manually jump to the last page to see the most recent messages
- Page navigation is responsive and does not cause layout shifts
