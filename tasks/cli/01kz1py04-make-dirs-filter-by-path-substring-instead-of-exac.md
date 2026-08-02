---
title: "Make --dirs filter by path substring instead of exact match"
id: "01kz1py04"
status: pending
priority: high
type: bug
tags: ["cli", "filtering"]
created: "2026-08-02"
---

# Make --dirs filter by path substring instead of exact match

## Objective

Make the `--dirs` flag behave the way it looks — a path substring/glob filter over
project directories — instead of the current exact-segment match. Today
`--dirs modpol` returns 0 sessions even for generic terms, forcing users to pull
all sessions and substring-filter the dir in Python. Either make `--dirs` a path
substring/glob match (the obviously-expected behavior) or document it clearly as
exact-match. Substring is the preferred fix and aligns it with the already-working
`sessions --dir` and the server's `dir`/`project` query params.

## Steps to Reproduce

1. Have a project whose path/basename contains but does not exactly equal `modpol`
   (e.g. `.../modpol-api` or `.../my-modpol`).
2. Run `vibeview search --dirs modpol` (or `serve --dirs modpol`, `stats --dirs modpol`).
3. Observe 0 results, plus a stderr warning `no project directory matching "modpol" found`.

## Expected Behavior

`--dirs modpol` matches any project whose decoded path contains `modpol` as a
substring (or glob), returning all sessions under those directories — matching how
`sessions --dir` (singular) and the server's `dir`/`project` params already behave.

## Actual Behavior

`--dirs` only matches when the value equals the encoded dir name, the exact
basename of the decoded path, or an exact trailing path segment. Partial/substring
terms match nothing.

## Root Cause

`--dirs` is a comma-separated list registered on **serve** (`main.go:243`),
**search** (`main.go:352`), and **stats** (`stats.go:168`) — not on `sessions`
(that command has a separate, already-substring `--dir` at `sessions.go:271`).

The exact-match gate is applied at **index-build time** in
`apps/lib/session/session.go`, before sessions ever reach the downstream substring
filters:

- **`buildDirSet`** — decision at `session.go:300`:
  ```go
  if name == d || filepath.Base(decoded) == d || strings.HasSuffix(decoded, "/"+d) {
  ```
  Exact encoded name, exact basename, or exact trailing segment only.
- **`matchesDirFilter`** — `session.go:314-320`: re-encodes the session's
  `Project` via the lossy `claude.EncodeProjectPath` and does an exact map-key
  lookup in the set built above.

Because sessions failing this gate are excluded from the index, the substring
filters that already exist (`search.go:43`, `server.go:372`,
`strings.Contains(sm.Project, d)`) never get a chance to match them.

## Tasks

- [ ] Change the gate in `buildDirSet` (`session.go:300`) to a path substring (`strings.Contains(decoded, d)`) or `filepath.Match` glob against the decoded project path.
- [ ] Relax `matchesDirFilter` (`session.go:314-320`) to substring-match against the decoded/full `Project` rather than an exact encoded map lookup, keeping it consistent with `buildDirSet`.
- [ ] Confirm `ScanProjectDirs` filesystem fallback (`session.go:208`, `240-243`) honors the same substring semantics.
- [ ] Keep multi-value OR combining and drop or adjust the "no project directory matching %q found" warning (`session.go:305-307`) so a legitimate-but-broad term isn't wrongly flagged.
- [ ] Add tests covering substring `--dirs` matches (partial term, multiple OR terms) for serve/search/stats.
- [ ] Update `--dirs` flag help text and docs to describe substring/glob behavior.

## Acceptance Criteria

- `vibeview search --dirs modpol` (and `serve`/`stats`) returns sessions from any project whose path contains `modpol`.
- Multiple comma-separated `--dirs` values combine as OR.
- `--dirs` behavior matches `sessions --dir` and the server `dir`/`project` params.
- Flag help/docs describe the substring/glob semantics.
- Tests cover partial-term and multi-term `--dirs` matching.

## Environment

- OS: macOS (darwin)
- Version: 0.1.0
