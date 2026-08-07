package usage

import (
	"testing"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
)

// assistantMsg builds an assistant message carrying usage for the given model.
func assistantMsg(model string, ts int64, in, out, cc, cr int) claude.Message {
	return claude.Message{
		Type:      claude.MessageTypeAssistant,
		Timestamp: claude.Timestamp(ts),
		Message: &claude.APIMessage{
			Role:  "assistant",
			Model: model,
			Usage: &claude.Usage{
				InputTokens:              in,
				OutputTokens:             out,
				CacheCreationInputTokens: cc,
				CacheReadInputTokens:     cr,
			},
		},
	}
}

func TestExtractSkipsMessagesWithoutUsage(t *testing.T) {
	messages := []claude.Message{
		{Type: claude.MessageTypeUser, Message: &claude.APIMessage{Role: "user"}},
		assistantMsg("sonnet", 1000, 10, 5, 1, 2),
		// assistant with no usage payload
		{Type: claude.MessageTypeAssistant, Message: &claude.APIMessage{Role: "assistant", Model: "sonnet"}},
		{Type: claude.MessageTypeResult, TotalCostUSD: 0.01},
	}

	records := Extract(ExtractParams{Messages: messages, SessionID: "s1", Project: "/proj"})

	if len(records) != 1 {
		t.Fatalf("Extract returned %d records, want 1", len(records))
	}
	r := records[0]
	if r.Model != "sonnet" || r.Timestamp != 1000 {
		t.Errorf("record model/timestamp = %q/%d, want sonnet/1000", r.Model, r.Timestamp)
	}
	if r.SessionID != "s1" || r.Project != "/proj" {
		t.Errorf("record session/project = %q/%q, want s1//proj", r.SessionID, r.Project)
	}
	if r.TotalTokens() != 18 {
		t.Errorf("record TotalTokens = %d, want 18", r.TotalTokens())
	}
}

func TestExtractPrefersPerMessageSessionAndProject(t *testing.T) {
	msg := assistantMsg("sonnet", 1000, 10, 5, 0, 0)
	msg.SessionID = "own-session"
	msg.Cwd = "/own/dir"

	records := Extract(ExtractParams{Messages: []claude.Message{msg}, SessionID: "fallback", Project: "/fallback"})

	if records[0].SessionID != "own-session" || records[0].Project != "/own/dir" {
		t.Errorf("got session/project %q/%q, want own-session//own/dir", records[0].SessionID, records[0].Project)
	}
}

func TestSum(t *testing.T) {
	records := []Record{
		{InputTokens: 100, OutputTokens: 50, CacheCreationInputTokens: 5, CacheReadInputTokens: 10},
		{InputTokens: 200, OutputTokens: 100, CacheCreationInputTokens: 15, CacheReadInputTokens: 30},
	}
	got := Sum(records)
	want := Totals{InputTokens: 300, OutputTokens: 150, CacheCreationInputTokens: 20, CacheReadInputTokens: 40, Messages: 2}
	if got != want {
		t.Errorf("Sum = %+v, want %+v", got, want)
	}
	if got.TotalTokens() != 510 {
		t.Errorf("TotalTokens = %d, want 510", got.TotalTokens())
	}
}

func TestSumEmpty(t *testing.T) {
	if got := Sum(nil); got != (Totals{}) {
		t.Errorf("Sum(nil) = %+v, want zero", got)
	}
}

func TestByModelSplitsMixedModelSession(t *testing.T) {
	records := []Record{
		{Model: "opus", InputTokens: 100, OutputTokens: 10},
		{Model: "sonnet", InputTokens: 200, OutputTokens: 20},
		{Model: "opus", InputTokens: 50, OutputTokens: 5},
	}
	groups := ByModel(records)

	if len(groups) != 2 {
		t.Fatalf("ByModel returned %d groups, want 2", len(groups))
	}
	// Sorted ascending by key: opus before sonnet.
	if groups[0].Key != "opus" || groups[1].Key != "sonnet" {
		t.Fatalf("group keys = %q, %q; want opus, sonnet", groups[0].Key, groups[1].Key)
	}
	if groups[0].Totals.InputTokens != 150 || groups[0].Totals.OutputTokens != 15 || groups[0].Totals.Messages != 2 {
		t.Errorf("opus totals = %+v, want input 150 / output 15 / messages 2", groups[0].Totals)
	}
	if groups[1].Totals.InputTokens != 200 || groups[1].Totals.Messages != 1 {
		t.Errorf("sonnet totals = %+v, want input 200 / messages 1", groups[1].Totals)
	}
}

func TestByProjectAndBySession(t *testing.T) {
	records := []Record{
		{SessionID: "s2", Project: "/b", InputTokens: 1},
		{SessionID: "s1", Project: "/a", InputTokens: 2},
		{SessionID: "s1", Project: "/a", InputTokens: 3},
	}

	byProject := ByProject(records)
	if len(byProject) != 2 || byProject[0].Key != "/a" || byProject[1].Key != "/b" {
		t.Fatalf("ByProject keys = %v, want [/a /b]", keys(byProject))
	}
	if byProject[0].Totals.InputTokens != 5 {
		t.Errorf("/a input = %d, want 5", byProject[0].Totals.InputTokens)
	}

	bySession := BySession(records)
	if len(bySession) != 2 || bySession[0].Key != "s1" || bySession[1].Key != "s2" {
		t.Fatalf("BySession keys = %v, want [s1 s2]", keys(bySession))
	}
	if bySession[0].Totals.Messages != 2 {
		t.Errorf("s1 messages = %d, want 2", bySession[0].Totals.Messages)
	}
}

func TestGroupByEmpty(t *testing.T) {
	if got := ByModel(nil); got != nil {
		t.Errorf("ByModel(nil) = %v, want nil", got)
	}
}

func TestByWindowBoundaries(t *testing.T) {
	hourMs := time.Hour.Milliseconds()
	// Three records: two in the first hour window (one exactly at the start
	// boundary, one mid-window), and one exactly on the next hour boundary.
	records := []Record{
		{Timestamp: 0, InputTokens: 1},          // window [0, 1h)
		{Timestamp: hourMs - 1, InputTokens: 2}, // window [0, 1h)
		{Timestamp: hourMs, InputTokens: 4},     // window [1h, 2h) — boundary belongs to next bucket
	}
	buckets := ByWindow(records, time.Hour)

	if len(buckets) != 2 {
		t.Fatalf("ByWindow returned %d buckets, want 2", len(buckets))
	}
	if !buckets[0].Start.Equal(time.UnixMilli(0).UTC()) {
		t.Errorf("bucket[0].Start = %v, want epoch", buckets[0].Start)
	}
	if buckets[0].Totals.InputTokens != 3 || buckets[0].Totals.Messages != 2 {
		t.Errorf("bucket[0] totals = %+v, want input 3 / messages 2", buckets[0].Totals)
	}
	if !buckets[1].Start.Equal(time.UnixMilli(hourMs).UTC()) {
		t.Errorf("bucket[1].Start = %v, want 1h", buckets[1].Start)
	}
	if buckets[1].Totals.InputTokens != 4 || buckets[1].Totals.Messages != 1 {
		t.Errorf("bucket[1] totals = %+v, want input 4 / messages 1", buckets[1].Totals)
	}
}

func TestByDayGroupsByUTCDay(t *testing.T) {
	dayMs := (24 * time.Hour).Milliseconds()
	records := []Record{
		{Timestamp: 1000, InputTokens: 1},         // day 0
		{Timestamp: dayMs + 1000, InputTokens: 2}, // day 1
		{Timestamp: dayMs + 2000, InputTokens: 3}, // day 1
	}
	buckets := ByDay(records)
	if len(buckets) != 2 {
		t.Fatalf("ByDay returned %d buckets, want 2", len(buckets))
	}
	if buckets[1].Totals.InputTokens != 5 || buckets[1].Totals.Messages != 2 {
		t.Errorf("day 1 totals = %+v, want input 5 / messages 2", buckets[1].Totals)
	}
}

func TestByWindowEdgeCases(t *testing.T) {
	if got := ByWindow(nil, time.Hour); got != nil {
		t.Errorf("ByWindow(nil) = %v, want nil", got)
	}
	if got := ByWindow([]Record{{Timestamp: 1}}, 0); got != nil {
		t.Errorf("ByWindow(window=0) = %v, want nil", got)
	}
	if got := ByWindow([]Record{{Timestamp: 1}}, -time.Hour); got != nil {
		t.Errorf("ByWindow(window<0) = %v, want nil", got)
	}
}

func keys(groups []Group) []string {
	ks := make([]string, len(groups))
	for i, g := range groups {
		ks[i] = g.Key
	}
	return ks
}
