---
id: "01kz43h5k"
title: "Add memory package to lib for discovering and parsing Claude memory files"
status: pending
priority: high
effort: medium
type: feature
phase: memory-explorer
dependencies: []
tags: [lib, memory-explorer]
context: ["apps/lib/session/session.go", "apps/lib/claude/claude.go", "apps/lib/pathutil/pathutil.go"]
created_at: 2026-08-03
verify:
  - type: bash
    run: "cd apps/lib && go build ./... && go test ./..."
---

# Add memory package to lib for discovering and parsing Claude memory files

## Objective

Create a new `apps/lib/memory` package that discovers and parses Claude's on-disk
memory, so the CLI and server can surface it. This is the foundation for the Memory
Explorer feature — all logic (discovery, frontmatter parsing, classification,
cross-link resolution) lives here in Go, per the project rule "backend owns the
logic, frontend is a thin display layer."

The package reads, but never writes, memory. Memory is Claude-managed; vibeview is a
read-only lens.

### Two distinct kinds of memory (keep them separate in the model)

1. **Auto-memory** — `~/.claude/projects/<encoded-project>/memory/`, containing a
   `MEMORY.md` index plus individual entry `.md` files with YAML frontmatter
   (`name`, `description`, `metadata.type`) and a markdown body.
2. **Instruction files (`CLAUDE.md`)** — the global `~/.claude/CLAUDE.md` and
   per-repo `CLAUDE.md` files. Different mechanism, different lifecycle. Model them
   as a separate type; do not blend them with auto-memory entries.

## Context / Findings

- The Claude data dir is resolved in `apps/cli/cmd/vibeview/main.go` (`os.UserHomeDir()`
  + `.claude`, overridable via `--claude-dir`); the memory package should accept the
  resolved `claudeDir` as input, matching how `session` does.
- Project directory names use the path-encoded form (`-Users-driangle-workplace-gg-vibeview`)
  and are decoded via `claude.DecodeProjectPath` — reuse it so project labels match
  the rest of vibeview.
- `apps/lib/session/session.go` (`ScanProjectDirs`) is the model for iterating
  `filepath.Join(claudeDir, "projects")`; the scan currently only consumes `*.jsonl`
  and ignores the `memory/` subdir entirely — this is greenfield.
- Formats are NOT uniform: some projects' `MEMORY.md` is a `# Memory Index` of
  markdown links, others are plain bullet notes; some memory dirs contain only
  `MEMORY.md` and no entry files. Parse defensively — treat frontmatter as optional
  and fall back to preserving the raw markdown.
- Use `pathutil.SafeResolve` to keep every resolved path under the memory base dir.

## Tasks

- [ ] Create `apps/lib/memory/` package with core types: `MemoryEntry` (name,
      description, type, body, frontmatter map, source file path, project),
      `ProjectMemory` (decoded project path, encoded dir, raw `MEMORY.md` index text,
      `[]MemoryEntry`), and `InstructionFile` (scope: global | project, path, body).
- [ ] `Discover(claudeDir)` — walk `projects/*/memory/`, decode project names, and
      assemble one `ProjectMemory` per project that has a `memory/` dir. Skip
      projects without one. Include the global `~/.claude/CLAUDE.md` as an
      `InstructionFile`.
- [ ] Parse each entry `.md`: extract YAML frontmatter if present (`name`,
      `description`, `metadata.type`), keep the markdown body separately, and fall
      back gracefully when frontmatter is missing or malformed (never error out the
      whole scan for one bad file).
- [ ] Parse `MEMORY.md`: keep the raw text; best-effort extract the entry links so
      the index can be cross-referenced with the parsed entry files.
- [ ] Resolve `[[name]]` cross-links: for each entry body, identify referenced
      memory `name`s and expose them as resolved (entry exists) vs. dangling.
- [ ] Provide a simple in-memory filter/search over entries (by `type` and by
      substring across name/description/body) — enough for v1; do not wire into the
      `search` index yet.
- [ ] Unit tests with a temp `claudeDir` fixture covering: well-formed entry,
      entry with no frontmatter, memory dir with only `MEMORY.md`, a `[[link]]` that
      resolves and one that dangles, and the global `CLAUDE.md`.

## Acceptance Criteria

- `apps/lib/memory` builds and its tests pass (`cd apps/lib && go build ./... && go test ./...`).
- `Discover` returns one `ProjectMemory` per project with a `memory/` dir, with
  project paths decoded consistently with the rest of vibeview.
- A malformed or frontmatter-less entry degrades gracefully (raw body preserved, no
  scan-wide error).
- Auto-memory entries and `CLAUDE.md` instruction files are represented as distinct
  types.
- `[[name]]` links are resolved to existing entries where possible and flagged when
  dangling.
- The package writes nothing to disk.
