---
id: "01kmg7tn9"
title: "Export single SessionView page to PDF"
status: completed
priority: medium
dependencies: []
effort: medium
type: feature
tags: [export, pdf]
created: 2026-03-24
---

# Export single SessionView page to PDF

## Objective

Add an "Export to PDF" button to the SessionView page that generates a clean, readable PDF of the current session's conversation — including messages, tool calls, and metadata — suitable for sharing or archiving.

## Tasks

- [x] Add an "Export PDF" button to the SessionView header/toolbar
- [x] Implement PDF generation using a browser-based approach (e.g., `html2canvas` + `jsPDF`, or `window.print()` with a print stylesheet)
- [x] Ensure the exported PDF includes: session header (name, date, directory), all visible messages and tool call summaries, and proper page breaks
- [x] Apply print-friendly styling (hide navigation, sidebar, interactive controls; adjust colors for readability)
- [x] Handle long sessions gracefully with pagination across PDF pages
- [x] Show a loading indicator while the PDF is being generated
- [ ] Test with sessions of varying lengths (short, medium, very long)

## Acceptance Criteria

- Clicking the export button generates a PDF containing the full session conversation
- The PDF is readable with proper formatting, page breaks, and no clipped content
- Interactive UI elements (nav bar, follow toggle, buttons) are excluded from the PDF
- Works in Chrome and Safari
