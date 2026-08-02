---
title: "Fix vibeview search: match string-form user messages, rank hits, index tool inputs"
id: "01kz1q6rd"
status: pending
priority: high
type: bug
tags: ["cli", "search", "indexing"]
created: "2026-08-02"
---

# Fix vibeview search: match string-form user messages, rank hits, index tool inputs

## Objective

Make `vibeview search` reliably find a past conversation by topic. Content queries
like `search "refactor review cli"`, `search "content-review skill story"`, and
`search "review command"` return `total: 0` even when a session clearly discusses
the topic, forcing a fallback to raw `grep` over `~/.claude/projects/**/*.jsonl`.

**Important — the reported diagnosis is partly wrong; investigation refined it:**

- `search` already scans message **bodies** (not just titles/slugs). The matcher is
  a real per-line JSONL scan in `apps/lib/search/search.go` (`searchFile`,
  `search.go:120-170`), comparing against `text` content blocks — it never looked
  at `Slug`/`CustomTitle`.
- The **real root cause** is an unmarshal bug: the local `contentLine` struct
  (`search.go:110-118`) declares `content` as an array only. In Claude Code JSONL,
  **user prompt messages commonly carry `content` as a bare string**
  (`{"type":"user","message":{"role":"user","content":"..."}}`). `json.Unmarshal`
  of a string into a slice fails, so the whole line is silently skipped
  (`search.go:147-149`). Assistant text (always array form) is searchable; the most
  common **user-prompt form is not** — which is exactly why topic queries the user
  typed miss. The real parser handles both via `APIMessage.UnmarshalJSON`
  (`apps/lib/claude/claude.go:195-226`, string wrapped into one `text` block);
  `search.go`'s minimal struct bypasses it.
- The **"Discovering sessions in: …" banner is a non-issue for `search`.** It does
  not exist in the search command — it lives in `sessions.go:208` and already writes
  to **stderr**. The `search --json` path writes exactly one JSON document to stdout
  via `outputAny` (`main.go:804-816`); all diagnostics go to stderr. This is already
  correct; the task only needs a regression test to keep it that way.

## Steps to Reproduce

1. Have a session whose user prompts (string-form content) discuss "refactor review cli".
2. Run `vibeview search "refactor review cli"` → `total: 0`.
3. Run `grep -rl "refactor review cli" ~/.claude/projects` → finds the session.
4. Note assistant-authored phrasings sometimes match (array-form content), user prompts don't.

## Expected Behavior

- Topic queries match text from **both** user and assistant messages regardless of
  whether `content` is a string or an array.
- Results are ranked by relevance and the best-matching session appears as a top hit
  with a snippet drawn from the matching message.
- Tool inputs (file paths, bash commands, search patterns) are also searchable.
- `search --json "<term>"` emits valid JSON and nothing else on stdout.

## Actual Behavior

- User prompts in string-form `content` are silently skipped; many topic queries
  return `total: 0`.
- Results are unranked — effectively "whichever matching session's goroutine
  finishes first," capped at `--limit` (`search.go:66-101`); no relevance order.
- Tool-use inputs are not indexed at all (`contentLine` extracts only `text` blocks).

## Fix Plan

1. **Match string-form content (core fix).** Make `search.go`'s content decoding
   mirror `APIMessage.UnmarshalJSON` — accept `content` as string or array — so
   user prompts are matched. (Simplest: reuse the `claude` parser's message type
   instead of the ad-hoc `contentLine` struct.)
2. **Index tool inputs.** Extend extraction to pull searchable text from `tool_use`
   inputs (`file_path`, `command`, `pattern`, …) and optionally `tool_result`
   content, staying within the existing streaming scan.
3. **Rank and snippet on body hits.** Return sessions ranked by relevance (e.g.
   match count / earliest-match position / field weighting) rather than
   completion order; keep the existing `buildSnippet` (`search.go:174-218`) snippet
   at the match site. Note ranking interacts with the current per-session
   short-circuit at `opts.Limit` — collect then rank before truncating.
4. **`--dirs` filter.** Tracked separately in task `01kz1py04` (make `--dirs` a path
   substring match). For CLI search, `--dirs` currently uses the exact-set
   `buildDirSet` path (`session.go:277-310`); `search.go`'s own substring filter
   (`search.go:43`) is only exercised by the web server. Coordinate with `01kz1py04`
   rather than duplicating the fix here.
5. **Keep `--json` clean (verify-only).** Already correct — add a regression test
   asserting `search --json` writes exactly one JSON document to stdout with all
   diagnostics on stderr.

## Tasks

- [ ] Fix content decoding in `search.go` to accept string-or-array `content` (reuse `claude` parser types instead of `contentLine`).
- [ ] Index `tool_use` input fields (file paths, commands, patterns) and optionally `tool_result` text.
- [ ] Rank results by relevance and draw the snippet from the top matching message; collect-then-rank so `--limit` truncation happens after ranking.
- [ ] Coordinate the `--dirs` substring fix with task `01kz1py04` (don't duplicate).
- [ ] Add a regression test that `search --json` emits only valid JSON on stdout (diagnostics on stderr).
- [ ] Add tests: string-form user prompt matches, assistant-array matches, tool-input match, ranking order, snippet content.

## Acceptance Criteria

- `vibeview search --dirs modpol "refactor review cli"` returns the correct session as a top hit with a body-derived snippet.
- Queries matching only string-form user prompts return results (currently return 0).
- Tool-input terms (e.g. a file path or command) match the session that used them.
- Results are ordered by relevance, not goroutine completion order.
- `vibeview search --json "<any term>"` emits valid JSON with nothing else on stdout.
- Tests cover string-content matching, tool-input matching, ranking, snippets, and `--json` cleanliness.

## Environment

- OS: macOS (darwin)
- Version: 0.1.0
