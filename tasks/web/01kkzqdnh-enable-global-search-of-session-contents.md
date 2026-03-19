---
title: "Enable global search of session contents"
id: "01kkzqdnh"
status: completed
priority: medium
type: feature
tags: []
created: "2026-03-18"
---

# Enable global search of session contents

## Objective

Allow users to search across all sessions by querying session contents (conversation messages, tool calls, etc.). Currently, users can only browse sessions individually — this feature adds a global search bar that finds sessions matching a text query, making it easy to locate past conversations.

## Tasks

- [ ] Add a search input to the sessions list / header area
- [ ] Implement backend/API endpoint that searches session contents for a query string
- [ ] Return matching sessions with relevant snippets / highlighted matches
- [ ] Display search results with session metadata (name, date) and matching excerpts
- [ ] Support incremental / debounced search as the user types
- [ ] Handle empty results state with helpful messaging

## Implementation Notes

### Architecture: Streaming Parallel File Scan

Do NOT build an in-memory index of all session contents. Instead, scan JSONL files on-demand with a bounded worker pool.

#### Backend — `GET /api/search?q=...&limit=20`

1. **Pre-filter with metadata** — Use the existing in-memory Index to skip sessions outside date range, wrong project, etc. before touching disk
2. **Fan out to bounded worker pool** (8–16 goroutines) — Each worker streams one JSONL file line-by-line with `bufio.Scanner`
3. **Selective parsing** — Only parse `"type":"user"` or `"type":"assistant"` lines (cheap string pre-check before JSON unmarshal). Skip `progress`, `file-history-snapshot`, `tool_result` content blocks (huge, noisy)
4. **Partial JSON parsing** — Extract only `content[].text` fields, not full `Message` struct
5. **Early termination** — Per file: stop at first match, capture ~120 char snippet. Globally: cancel all workers via `context.WithCancel` once `limit` results collected
6. **Newest-first scan order** — Sort sessions by timestamp descending before scanning so `limit`-based cutoff skips old sessions

#### Memory Budget

- 16 workers × ~1MB scanner buffer = **~16MB peak**
- Results: `limit` sessions × ~500 bytes = negligible
- Drops to ~0 after response completes

#### What NOT to do

- Don't build an inverted index in memory — 10K+ sessions at 100KB–50MB each could consume GBs
- Don't add SQLite/Bleve — unnecessary dependency for a local tool; streaming scan is fast enough
- Don't search `tool_result` content blocks — raw file contents and command outputs bloat scan time and produce noisy matches

#### Frontend

- Reuse existing search input; add a toggle or mode for "search content" vs metadata search (or upgrade `?q=` to hit the new endpoint when needed)
- Display results with session metadata + match snippet (highlighted)
- Debounce at 500ms (slightly longer than current 300ms since content search is heavier)

## Acceptance Criteria

- Users can type a query and see sessions whose contents match the search term
- Search covers message text within sessions (both user and assistant messages)
- Results show which session matched and a snippet of the matching content
- Search is performant and responsive (debounced input, reasonable latency)
- Empty and error states are handled gracefully
