---
title: "Add diff widget for Edit tool calls"
id: "01km3xdfr"
status: pending
priority: medium
type: feature
tags: ["ui", "messages", "tool-calls"]
created: "2026-03-19"
---

# Add diff widget for Edit tool calls

## Objective

Add a specialized widget for "Edit" tool calls that shows a side-by-side or inline diff view instead of raw JSON. Edit tool calls have a known shape with `old_string`, `new_string`, `file_path`, and `replace_all` fields. Displaying these as a visual diff makes it much easier to understand what changed.

### Edit tool call shape

```json
{
  "tool_use": {
    "name": "Edit",
    "input": {
      "file_path": "path/to/file.tsx",
      "old_string": "original code",
      "new_string": "modified code",
      "replace_all": false
    }
  },
  "tool_result": {
    "content": "The file ... has been updated successfully."
  }
}
```

## Tasks

- [ ] Detect Edit tool calls by `name === "Edit"` in the tool call rendering logic
- [ ] Extract `file_path`, `old_string`, `new_string`, and `replace_all` from the input
- [ ] Render a diff view showing removed lines (old_string) and added lines (new_string)
- [ ] Show the file path as a header above the diff
- [ ] Indicate `replace_all` when true (e.g. a small badge or note)
- [ ] Show the tool result status (success/failure) below the diff
- [ ] Keep the raw JSON view available as a fallback toggle

## Acceptance Criteria

- Edit tool calls render as a visual diff instead of raw JSON by default
- The diff clearly highlights removed vs added lines with red/green coloring
- The file path is displayed prominently
- Users can toggle back to raw JSON view if needed
- Non-Edit tool calls are unaffected
