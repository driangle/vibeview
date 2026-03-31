---
title: "Allow searching by session ID in web search box"
id: "01kn113ms"
status: pending
priority: medium
type: feature
tags: []
created: "2026-03-31"
---

# Allow searching by session ID in web search box

## Objective

Allow users to search for sessions by their session ID (full or partial match) using the existing web search box. Currently, the session list search matches against project directory, slug, and custom title but not the session ID itself.

## Tasks

- [ ] Add session ID to the searchable fields in the `/api/sessions` endpoint's `q` parameter filter (case-insensitive substring match, like the other fields)
- [ ] Verify the frontend search box picks up session ID matches without additional changes
- [ ] Add tests for partial session ID matching

## Acceptance Criteria

- Typing a full session ID in the search box returns the matching session
- Typing a partial session ID (substring) returns all sessions whose ID contains that substring
- Search remains case-insensitive
- Existing search functionality (title, slug, directory) is unaffected
