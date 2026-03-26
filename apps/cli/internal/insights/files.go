package insights

import (
	"sort"
	"time"

	"github.com/driangle/vibeview/internal/claude"
)

var writeTools = map[string]bool{"Edit": true, "Write": true}
var readTools = map[string]bool{"Read": true}

// ExtractFiles categorizes file operations from Read/Write/Edit tool_use blocks.
func ExtractFiles(messages []claude.Message) FilesResult {
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

			if writeTools[block.Name] {
				written[filePath] = true
			} else if readTools[block.Name] {
				read[filePath] = true
			}

			if block.ID != "" {
				entries = append(entries, FileEntry{
					ToolUseID:   block.ID,
					ToolName:    block.Name,
					FilePath:    filePath,
					Input:       block.Input,
					Timestamp:   msToISO(msg.Timestamp.Int64()),
					MessageUUID: msg.UUID,
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
