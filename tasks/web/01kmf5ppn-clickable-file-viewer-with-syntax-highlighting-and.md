---
title: "Clickable file viewer with syntax highlighting and copy path"
id: "01kmf5ppn"
status: completed
priority: medium
type: feature
tags: ["ui", "sidebar", "file-viewer"]
created: "2026-03-24"
dependencies: ["01kmf5k8r"]
---

# Clickable file viewer with syntax highlighting and copy path

## Objective

Make files listed in the sidebar (Context File and Files Touched) clickable to view their content inline on the web page. Each file entry should also have a copy-path button. The file content viewer should render a syntax-highlighted formatted view based on file type, with a toggle to switch to a raw text view.

## Tasks

- [x] Add a "copy path" button next to each file entry in the sidebar (Context File section and Files Touched section)
- [x] Make file entries clickable — clicking opens a file content viewer panel
- [x] Build a `FileViewer` component that displays file content with syntax highlighting based on file extension
- [x] Add a "Raw" toggle in the file viewer to switch between formatted and plain text views
- [x] Source file content from tool_result blocks in the session data (content returned by Read/Write/Edit tools)
- [x] Handle missing content gracefully (e.g. file was touched but content not available in session data)

## Acceptance Criteria

- Clicking any file in the sidebar (Context File or Files Touched) opens its content in a viewer
- Each file entry has a copy-path button that copies the full path to clipboard
- File content is syntax-highlighted based on file extension (e.g. `.tsx`, `.css`, `.json`)
- A "Raw" toggle switches between formatted and plain text views
- Files whose content is not available in session data show an appropriate message
