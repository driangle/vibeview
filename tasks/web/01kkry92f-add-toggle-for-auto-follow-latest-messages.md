---
title: "Add toggle for auto-follow latest messages"
id: "01kkry92f"
status: completed
priority: medium
type: feature
effort: small
tags: ["frontend", "ui"]
phase: "polish"
dependencies: ["01kkqxa68", "01kkqxaz1"]
created: "2026-03-15"
---

# Add toggle for auto-follow latest messages

## Objective

The session view currently auto-scrolls to follow the latest messages (tail mode). Users should be able to toggle this behavior on/off so they can read older messages without being jumped to the bottom when new messages arrive.

## Tasks

- [x] Add a visible toggle button/control for auto-follow mode in the session view
- [x] When auto-follow is on, continue current behavior (scroll to bottom on new messages)
- [x] When auto-follow is off, do not auto-scroll; let the user browse freely
- [x] Auto-disable follow mode when the user scrolls up manually
- [x] Auto-enable follow mode when the user scrolls to the bottom

## Acceptance Criteria

- A toggle control is visible in the session view
- When enabled, new messages cause auto-scroll to bottom
- When disabled, the user can browse history without being interrupted
- Scrolling up automatically disables follow mode
- Scrolling to the bottom automatically re-enables follow mode
