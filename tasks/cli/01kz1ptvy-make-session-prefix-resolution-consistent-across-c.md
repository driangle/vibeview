---
title: "Make session prefix resolution consistent across commands"
id: "01kz1ptvy"
status: completed
priority: high
type: bug
tags: ["cli", "session-lookup"]
created: "2026-08-02"
completed_at: 2026-08-02
---

# Make session prefix resolution consistent across commands

## Objective

Unify session ID resolution so that `sessions`, `show`, and `inspect` all accept
the same forms of input — in particular short 8-char prefixes like `df9336c1`, not
just full UUIDs. Today the same ID resolves under two commands but fails under a
third, forcing users to paste the full UUID for `inspect`. `inspect` should reuse
the same resolver that `show` uses.

## Steps to Reproduce

1. Pick any session and note its 8-char prefix, e.g. `df9336c1`.
2. Run `vibeview sessions` — the session lists fine.
3. Run `vibeview show df9336c1` — resolves and displays the session.
4. Run `vibeview inspect df9336c1` — fails with
   `session not found in history.jsonl or on disk`.
5. Run `vibeview inspect <full-uuid>` — only this works.

## Expected Behavior

`inspect df9336c1` resolves the same session as `show df9336c1` and
`sessions`. All three commands share one lookup path and accept both the
8-char prefix and the full UUID (with consistent error/ambiguity handling).

## Actual Behavior

`inspect` uses a different, stricter lookup path that only matches a full UUID.
Given the 8-char prefix it returns `session not found in history.jsonl or on disk`.
Same ID, two lookup paths.

## Root Cause

Two independent resolution paths:

- **`show`** (`apps/cli/cmd/vibeview/show.go`) resolves via
  `resolveSessionMessages` (`show.go:88-115`), which does an exact match with
  `Index.FindSession` and then a prefix match with `Index.FindSessionByPrefix`
  (`apps/lib/session/session.go:81-114`). This is why `df9336c1` works.
- **`inspect`** (`apps/cli/cmd/vibeview/main.go:250`) resolves via
  `buildLookupReport` (`main.go:563+`), which matches with **exact equality only** —
  against `history.jsonl` (`main.go:587`) and then `findSessionOnDisk`
  (`main.go:700-708`, exact match at `main.go:703`). No prefix logic, hence
  "session not found in history.jsonl or on disk" (`main.go:599`) for a prefix.

(Note: `sessions` takes no positional ID arg — `cobra.NoArgs`, `sessions.go:203` —
it only *displays* IDs truncated to 8 chars. Prefix *input* resolution today is
exclusive to `show`. This task makes `inspect` match `show`.)

## Tasks

- [x] Change `inspect`'s lookup (`buildLookupReport` / `findSessionOnDisk`) to reuse the prefix-capable resolver `Index.FindSessionByPrefix` instead of exact-only equality.
- [x] Preserve the same exact-then-prefix precedence and ambiguous-prefix error handling that `show` uses.
- [x] Add a test covering `inspect` prefix resolution and guarding parity with `show`.

## Acceptance Criteria

- `vibeview inspect df9336c1` resolves the same session as `vibeview show df9336c1`.
- `inspect` accepts both the 8-char prefix and the full UUID.
- An ambiguous or unknown prefix produces a consistent error between `inspect` and `show`.
- A test verifies `inspect` resolves by prefix and stays in parity with `show`.

## Environment

- OS: macOS (darwin)
- Version: 0.1.0
