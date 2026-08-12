---
title: "Expose session-HTML rendering as a Go SDK (+ thin 'vibeview export' CLI)"
id: "01kztbrsq"
status: in-progress
priority: medium
type: feature
tags: ["export", "cli", "integration"]
created: "2026-08-12"
---

# Add 'vibeview export' — static single-session HTML for embedding

## Objective

Expose a **public, importable Go package** that renders a **single session** to a
**self-contained static HTML** page (no running server, no external requests —
inline CSS/JS/assets), and publish it in a tagged release so other Go tools can
depend on it as an **SDK**. A thin `vibeview export` CLI command wraps the same
function for humans and shell users.

Motivating consumer: [skival](https://github.com/driangle/skival) has
`--link-sessions`, which attaches a rendered "view session" page to each run in
its reports. It currently shells out to a (not-yet-existing) `vibeview export`
CLI and falls back to a hint when the binary is absent. We want skival to instead
**import the SDK** so the renderer is compiled in — no requirement that end users
install vibeview. The value is general: any Go program can embed a session page.

## Why SDK over CLI here

- CLI dependency ⇒ every downstream user must have `vibeview` on PATH. SDK ⇒ the
  renderer ships inside the consumer's binary. For a distributed tool that's the
  right coupling.
- vibeview already ships releases (latest `v0.1.1`) and already has a shared,
  importable module `github.com/driangle/vibeview/apps/lib` — a natural home.

## Scope (high level)

- New **public** package (e.g. under `apps/lib`, NOT `internal/`) exposing
  something like `RenderSessionHTML(session) ([]byte, error)` — accepts a session
  id (prefix ok) or a `.jsonl` path.
- Reuse the existing SessionView **React** rendering: the rich view is the web
  SPA embedded today via `apps/cli/internal/spa` (`go:embed dist/*`). Move/expose
  that embed+inline logic into the public package so the SDK produces a page that
  templates the built SPA with inlined session data — one renderer, no divergent
  second implementation.
- `vibeview export … --format html --out <file>` becomes a thin CLI wrapper over
  the public function. Leave room for other formats (`md`, `pdf`) later.
- **Release the SDK**: tag the `apps/lib` submodule (`apps/lib/vX.Y.Z`, separate
  from the root CLI tags) so skival can pin it in `go.mod`.

## Out of scope

- Multi-session / whole-project export, indexes, or bundling.
- Any change to the live web server or the browser PDF export.

## Acceptance Criteria

- A public package function renders a session to self-contained HTML that opens
  offline and shows the conversation, tool calls, and token/cost metadata.
- The package lives outside `internal/` and is importable at a stable path; a
  tagged `apps/lib` release makes it consumable via `go get`.
- `vibeview export <session> --format html --out page.html` wraps the same
  function; unknown/ambiguous session exits non-zero with a helpful message.
- Rendering is shared with SessionView (no divergent second renderer).
- Documented in CLI help + the vibeview skill/README, including the import path
  and released module version.
- Downstream check: skival can `go get` the module and render a session with no
  `vibeview` binary installed. (skival-side migration tracked separately.)
