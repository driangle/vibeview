---
title: "Quiet the discovery banner under --json/--yaml and guarantee stdout is payload-only"
id: "01kz1qfpe"
status: pending
priority: medium
type: bug
tags: ["cli", "json", "scripting"]
created: "2026-08-02"
---

# Quiet the discovery banner under --json/--yaml and guarantee stdout is payload-only

## Objective

A user driving vibeview programmatically piped `vibeview sessions --json` into a JSON
parser and hit `JSONDecodeError: Expecting value: line 1 column 1`, blaming the
`Discovering sessions in: …` banner appearing ahead of the JSON on stdout. They asked
that under `--json`/`--yaml`, stdout contain only the machine-readable payload, and
that diagnostics be quieted unless `--log-level debug` is set.

## Investigation — the literal symptom does NOT reproduce on `main`

I verified the current code empirically (built `main`, ran with streams separated):

- The banner is already written to **stderr**, not stdout —
  `apps/cli/cmd/vibeview/sessions.go:208`:
  `fmt.Fprintf(os.Stderr, "Discovering sessions in: %s\n", dir)`. Per `git blame`
  it has been on stderr since the command was first added (commit `8abfa33`,
  2026-04-18) — there is no version where it was on stdout.
- `sessions --json` writes exactly one JSON document to stdout
  (`sessions.go:242-256`); `python3 -c "json.load(open(stdout))"` succeeds and the
  banner lands only in the stderr capture.
- Every command with `--json`/`--yaml` (`sessions`, `show`, `stats`, `search`,
  `inspect`, `self`) gates human output behind the non-JSON path or routes it to
  stderr. `self.go:54-65` is a representative example (`if jsonOutput { … return }`
  before any stdout `Printf`). No command leaks a preamble onto stdout in the
  structured-output path.

**Most likely real cause of the user's error:** the invoking agent/harness captured
**combined** stdout+stderr (e.g. `2>&1` or a merged pipe), folding the stderr banner
into the stream it fed to `json.load`. The stdout/stderr split is already correct;
the banner simply isn't *silenced*, so anything merging the streams inherits it.

## The real, still-valuable work

Even though stdout is clean, the user's explicit ask is reasonable hardening:

1. **Silence the discovery banner under `--json`/`--yaml`.** Don't print
   `Discovering sessions in: …` at all when structured output is requested
   (or gate it behind `--log-level debug`). This removes the noise that lands in
   merged-stream captures and matches the "quiet diagnostics under --json" ask.
2. **Establish and test the contract explicitly.** There is currently no regression
   test asserting "under `--json`/`--yaml`, stdout is exactly the payload." Add
   cross-command tests so this can't regress.
3. **Document the stdout/stderr contract** so consumers know stderr may carry
   diagnostics and should not be merged into the parsed stream.

## Steps to Reproduce (user-reported)

1. `vibeview sessions --json | <JSON parser>` **with stdout and stderr merged**
   (e.g. captured via `2>&1` or an agent harness that combines streams).
2. Parser fails on the leading `Discovering sessions in: …` line.
3. (On `main` with streams **separated**, this does not occur — stdout is valid JSON.)

## Expected Behavior

- With `--json`/`--yaml`, no human-readable banner is emitted (on stdout **or**
  stderr) unless `--log-level debug`.
- stdout carries only the structured payload for every command's `--json`/`--yaml`
  mode, with no pre/post-amble.

## Actual Behavior

- stdout is already payload-only (verified), but the `Discovering sessions in: …`
  banner is printed to stderr unconditionally — including under `--json` — so any
  merged-stream consumer inherits it.

## Tasks

- [ ] Suppress the `Discovering sessions in: …` banner (`sessions.go:208`) when `--json`/`--yaml` is set, or gate it behind `--log-level debug`.
- [ ] Audit every command's `--json`/`--yaml` path to confirm no diagnostics reach stdout, and quiet non-essential stderr chatter under structured output.
- [ ] Add regression tests asserting stdout is valid, sole JSON/YAML for `sessions`, `show`, `stats`, `search`, `inspect`, and `self` under `--json`/`--yaml`.
- [ ] Document the stdout (payload) vs stderr (diagnostics) contract in help/docs, noting consumers should not merge the streams.

## Acceptance Criteria

- `vibeview sessions --json | <any JSON parser>` succeeds with no pre/post-amble (already true for separated streams).
- With `--json`/`--yaml`, the `Discovering sessions in: …` banner does not appear unless `--log-level debug`.
- Every command's `--json`/`--yaml` output is valid and is the only thing on stdout, verified by tests.
- Docs state that stdout is payload-only and stderr may carry diagnostics.

## Notes

- Related: task `01kz1q6rd` (search) also touches `--json` stdout cleanliness; its
  banner concern was likewise found to be a non-issue for `search`. Keep the
  regression-test approach consistent between the two.

## Environment

- OS: macOS (darwin)
- Version: 0.1.0 (banner on stderr since first commit; symptom implies merged-stream capture)
