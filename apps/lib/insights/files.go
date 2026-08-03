package insights

import (
	"regexp"
	"sort"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/redact"
)

var catLineNumberPrefix = regexp.MustCompile(`(?m)^ *\d+→`)

var writeTools = map[string]bool{"Edit": true, "Write": true}
var readTools = map[string]bool{"Read": true}

// ExtractFiles categorizes file operations from Read/Write/Edit tool_use blocks.
func ExtractFiles(messages []claude.Message, toolResults map[string]claude.ContentBlock) FilesResult {
	written := make(map[string]bool)
	read := make(map[string]bool)
	var entries []FileEntry

	for _, msg := range messages {
		for _, block := range GetContentBlocks(msg) {
			if block.Type != "tool_use" || block.Name == "" || block.Input == nil {
				continue
			}
			filePath, _ := block.Input["file_path"].(string)
			if filePath == "" {
				continue
			}
			maskedPath := redact.MaskHomePath(filePath)

			if writeTools[block.Name] {
				written[maskedPath] = true
			} else if readTools[block.Name] {
				read[maskedPath] = true
			}

			if block.ID != "" {
				timestamp := msToISO(msg.Timestamp.Int64())
				var operation *FileOperation
				switch block.Name {
				case "Write":
					if content, ok := block.Input["content"].(string); ok {
						operation = &FileOperation{Type: "write", Content: redact.RedactSecrets(content), Timestamp: timestamp}
					}
				case "Read":
					if result, ok := toolResults[block.ID]; ok {
						if content := ResolveResultText(result); content != "" {
							operation = &FileOperation{Type: "read", Content: catLineNumberPrefix.ReplaceAllString(content, ""), Timestamp: timestamp}
						}
					}
				case "Edit":
					oldString, oldOK := block.Input["old_string"].(string)
					newString, newOK := block.Input["new_string"].(string)
					if oldOK && newOK {
						operation = &FileOperation{Type: "edit", OldString: redact.RedactSecrets(oldString), NewString: redact.RedactSecrets(newString), Timestamp: timestamp}
					}
				}
				entries = append(entries, FileEntry{
					ToolUseID:   block.ID,
					ToolName:    block.Name,
					FilePath:    maskedPath,
					Input:       block.Input,
					Timestamp:   timestamp,
					MessageUUID: msg.UUID,
					Operation:   operation,
				})
			}
		}
	}

	writtenList := sortedKeys(written)
	readList := sortedKeys(read)

	return FilesResult{
		Categories: FilesByCategory{
			Written: writtenList,
			Read:    readList,
		},
		Entries: entries,
	}
}

func sortedKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	return keys
}

func msToISO(ms int64) string {
	if ms == 0 {
		return ""
	}
	return time.UnixMilli(ms).UTC().Format(time.RFC3339)
}
