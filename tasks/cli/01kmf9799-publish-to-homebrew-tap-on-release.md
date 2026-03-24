---
title: "Publish to Homebrew tap on release"
id: "01kmf9799"
status: in-progress
priority: low
type: chore
tags: ["ci", "release"]
created: "2026-03-24"
---

# Publish to Homebrew tap on release

## Objective

Automate publishing the `vibeview` CLI binary to the Homebrew tap at [driangle/homebrew-tap](https://github.com/driangle/homebrew-tap) whenever a new GitHub release is created. Users should be able to install via `brew install driangle/tap/vibeview`.

## Tasks

- [ ] Add a GitHub Actions release workflow (`.github/workflows/release.yml`) that triggers on new tags (e.g. `v*`)
- [ ] Build cross-platform binaries (darwin-amd64, darwin-arm64, linux-amd64) with the embedded SPA
- [ ] Upload binaries as release assets using GoReleaser or a manual build matrix
- [ ] Add a step to update the Homebrew formula in `driangle/homebrew-tap` with the new version, SHA256 checksums, and download URLs
- [ ] Create the initial Homebrew formula (`vibeview.rb`) in the tap repo
- [ ] Test the full flow: tag a release, verify binaries are uploaded, and `brew install driangle/tap/vibeview` works

## Acceptance Criteria

- Pushing a version tag (e.g. `v0.1.0`) triggers an automated release workflow
- Release artifacts include binaries for darwin-amd64, darwin-arm64, and linux-amd64
- The Homebrew formula in `driangle/homebrew-tap` is automatically updated with correct version, URLs, and checksums
- `brew install driangle/tap/vibeview` installs a working `vibeview` binary
