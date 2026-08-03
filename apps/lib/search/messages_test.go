package search

import (
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
)

func TestSearchMessagesReturnsServerNavigationData(t *testing.T) {
	messages := []claude.Message{{Type: claude.MessageTypeUser, UUID: "m1", Message: &claude.APIMessage{Content: []claude.ContentBlock{{Type: "text", Text: "before Needle after needle"}}}}}
	results := SearchMessages(messages, "needle", 20)
	if len(results) != 2 {
		t.Fatalf("got %d results, want 2", len(results))
	}
	if results[0].MessageUUID != "m1" || results[0].MessageIndex != 0 || results[0].Role != "user" {
		t.Fatalf("unexpected result: %+v", results[0])
	}
}

func TestSearchMessagesHonorsLimitAndIgnoresToolResults(t *testing.T) {
	messages := []claude.Message{{Type: claude.MessageTypeUser, UUID: "m1", Message: &claude.APIMessage{Content: []claude.ContentBlock{{Type: "tool_result", Content: "needle"}, {Type: "text", Text: "needle needle"}}}}}
	if results := SearchMessages(messages, "needle", 1); len(results) != 1 {
		t.Fatalf("got %d results, want 1", len(results))
	}
}
