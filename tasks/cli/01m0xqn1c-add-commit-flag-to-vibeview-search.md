---
title: "Add --commit flag to vibeview search"
id: "01m0xqn1c"
status: completed
priority: medium
type: feature
tags: ["search", "git"]
created: "2026-08-25"
completed_at: 2026-08-25
---

# Add --commit flag to vibeview search

## Objective

Let users find the Claude session(s) related to a git commit — even when the transcript never mentions the commit hash. `vibeview search --commit <hash>` resolves the commit in a local repo (via `git show`), expands it into search terms (short + full hash, changed file paths and basenames, significant commit message words), and reuses the existing `search.Search` coverage-first ranking. A session time-window filter (session `StartTime`/`EndTime` overlapping the commit timestamp ± a window, default 24h) keeps common terms like `main.go` from producing false positives.

## Tasks

- [x] Add commit resolution: run `git -C <dir> show --name-only --format=...` for the given hash and parse timestamp, message, and changed file paths (new module, e.g. `apps/lib/search/commit.go`)
- [x] Implement query expansion from the resolved commit: short/full hash, changed file paths and basenames, significant commit message words
- [x] Add additive time-window fields to `search.Options` (e.g. `After`/`Before` epoch millis) filtering on `SessionMeta.StartTime`/`EndTime` overlap
- [x] Wire up `--commit <hash>` (with `--repo` for the repository, default cwd) in the CLI `search` command; apply the time window as a hard filter with a sensible default (±24h)
- [x] Tests: commit parsing, query expansion, time-window filtering in `Search`, and CLI flag behavior
- [x] Update docs (CLI docs and vibeview skill reference) with the new flag

## Acceptance Criteria

- `vibeview search --commit <hash>` returns sessions ranked by how many commit-derived terms they match, restricted to sessions active within the time window around the commit
- Works when the transcript never contains the commit hash (matches via changed files and commit message words)
- A missing/invalid hash or non-repo directory produces a clear error, not a panic
- `search.Options` changes are additive (backward compatible for the published `apps/lib` module — no `sdk-bump: minor` required)
- `make check` passes

## Notes

### Why `--repo` is separate from `--dirs`

`--repo` was briefly folded into `--dirs` to avoid adding a flag: the commit
would resolve in the first `--dirs` entry naming an existing directory, else the
cwd. It was reverted, because the two flags answer different questions —
`--repo` is where to *read the commit*, `--dirs` is which *sessions to search* —
and collapsing them couples the two.

Git worktrees are the case that breaks. A session run from a worktree records
that worktree as its project, so the commit and the session sit at different
paths. Under the merged flag, scoping to a repository also filtered sessions to
its path, silently hiding worktree sessions — failing exactly where the feature
is most useful. `TestSearchCommitFindsSessionFromAnotherPath` pins this: it
would fail under the merged design.

The cost of keeping them separate is a third flag and the noise that comes from
not scoping by default (a generic subject word pulls in other projects' sessions
below the correct top hit). Auto-defaulting `--dirs` to the repo's toplevel was
also considered and rejected for the same worktree reason; deriving it from
`git worktree list` would be the safe version if scoping ever becomes automatic.

### `make check`

`make check` still fails at the `lint` stage on 26 pre-existing issues (23
errcheck, 3 staticcheck) in `internal/watcher`, `internal/server`,
`cmd/vibeview/render.go`, and `cmd/vibeview/main.go:763` — an identical count to
a clean tree, so this change introduces none. The remaining stages were run
directly and pass: `go vet`, all `apps/cli` and `apps/lib` tests, and the docs
build. Clearing that lint debt is separate work.
