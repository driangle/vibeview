package insights

import (
	"sort"

	"github.com/driangle/vibeview/internal/claude"
)

// ExtractToolCounts counts tool_use blocks by tool name, sorted by count descending.
func ExtractToolCounts(messages []claude.Message) []ToolCount {
	counts := make(map[string]int)

	for _, msg := range messages {
		for _, block := range GetContentBlocks(msg) {
			if block.Type == "tool_use" && block.Name != "" {
				counts[block.Name]++
			}
		}
	}

	result := make([]ToolCount, 0, len(counts))
	for name, count := range counts {
		result = append(result, ToolCount{Name: name, Count: count})
	}
	sort.Slice(result, func(i, j int) bool {
		return result[i].Count > result[j].Count
	})
	return result
}
