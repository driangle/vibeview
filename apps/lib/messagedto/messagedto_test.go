package messagedto

import (
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
)

func TestFromPopulatesCoreFields(t *testing.T) {
	msg := claude.Message{
		UUID:      "msg-1",
		Type:      claude.MessageTypeUser,
		Timestamp: claude.Timestamp(1700000000000),
		Message: &claude.APIMessage{
			Role:    "user",
			Content: []claude.ContentBlock{{Type: "text", Text: "hello"}},
		},
	}

	m := From(msg)

	if m.UUID != "msg-1" {
		t.Errorf("UUID = %q, want %q", m.UUID, "msg-1")
	}
	if m.Type != "user" {
		t.Errorf("Type = %q, want %q", m.Type, "user")
	}
	if m.Timestamp == "" {
		t.Error("expected non-empty timestamp")
	}
	if m.Message == nil {
		t.Error("expected non-nil message")
	}
	// ActivityState is only set by live callers, never by the builder itself.
	if m.ActivityState != "" {
		t.Errorf("ActivityState = %q, want empty", m.ActivityState)
	}
}

func TestFromZeroTimestamp(t *testing.T) {
	m := From(claude.Message{UUID: "msg-2", Type: claude.MessageTypeSystem})
	if m.Timestamp != "" {
		t.Errorf("Timestamp = %q, want empty for zero timestamp", m.Timestamp)
	}
}

func TestFromCarriesResultCost(t *testing.T) {
	msg := claude.Message{
		UUID:         "r1",
		Type:         claude.MessageTypeResult,
		Timestamp:    claude.Timestamp(1700000000000),
		TotalCostUSD: 0.25,
		Data:         map[string]any{"subtype": "success"},
	}

	m := From(msg)

	if m.TotalCostUSD != 0.25 {
		t.Errorf("TotalCostUSD = %v, want %v", m.TotalCostUSD, 0.25)
	}
	if m.Data["subtype"] != "success" {
		t.Errorf("Data[subtype] = %v, want %q", m.Data["subtype"], "success")
	}
}
