package timeline

import (
	"testing"

	"github.com/driangle/vibeview/apps/lib/claude"
)

// buildInsights groups messages into exchanges and aggregates them, exercising
// the same path callers use.
func buildInsights(messages []claude.Message) TimelineInsights {
	return BuildInsights(BuildExchanges(messages), messages)
}

// --- empty / no-panic safety ---

func TestBuildInsights_EmptySession(t *testing.T) {
	ins := BuildInsights(nil, nil)

	if len(ins.TimeSplit) != 4 {
		t.Fatalf("TimeSplit len = %d, want 4", len(ins.TimeSplit))
	}
	for _, seg := range ins.TimeSplit {
		if seg.Pct != 0 || seg.DurationMs != 0 {
			t.Errorf("empty segment %q = %+v, want zero", seg.Label, seg)
		}
	}
	if len(ins.OverviewBuckets) != overviewBucketCount {
		t.Errorf("OverviewBuckets len = %d, want %d", len(ins.OverviewBuckets), overviewBucketCount)
	}
	if ins.ModelSwitches != 0 {
		t.Errorf("ModelSwitches = %d, want 0", ins.ModelSwitches)
	}
	if ins.LongestExchangeIndex != -1 {
		t.Errorf("LongestExchangeIndex = %d, want -1", ins.LongestExchangeIndex)
	}
	if ins.Top5TokenSharePct != 0 {
		t.Errorf("Top5TokenSharePct = %d, want 0", ins.Top5TokenSharePct)
	}
	if ins.TotalTokens != 0 || ins.TotalCostUSD != 0 || ins.TotalDurationMs != 0 || ins.TotalSpanMs != 0 {
		t.Errorf("totals not zero: %+v", ins)
	}
	// Lists must serialize as [] not null.
	if ins.Models == nil || ins.ModelBands == nil || ins.BusiestFiles == nil ||
		ins.TopCommands == nil || ins.Skills == nil || ins.ToolMix == nil {
		t.Errorf("expected non-nil empty slices, got %+v", ins)
	}
}

func TestBuildInsights_SingleExchangeNoDivideByZero(t *testing.T) {
	// One exchange with zero duration: span is 0. Must not panic or divide by zero.
	ins := buildInsights([]claude.Message{
		userMsg("u1", 1000, textBlock("hi")),
		assistantMsg("a1", 1000, "claude-opus-4-1-20250805",
			&claude.Usage{InputTokens: 10, OutputTokens: 5}, textBlock("hello")),
	})
	if ins.TotalTokens != 15 {
		t.Errorf("TotalTokens = %d, want 15", ins.TotalTokens)
	}
	if ins.LongestExchangeIndex != 0 {
		t.Errorf("LongestExchangeIndex = %d, want 0", ins.LongestExchangeIndex)
	}
	if ins.Top5TokenSharePct != 100 {
		t.Errorf("Top5TokenSharePct = %d, want 100", ins.Top5TokenSharePct)
	}
	if len(ins.Models) != 1 || ins.Models[0].Model != "claude-opus-4-1-20250805" {
		t.Errorf("Models = %+v, want single opus row", ins.Models)
	}
}

// --- model bands / switches ---

func TestBuildInsights_ModelBandsAndSwitches(t *testing.T) {
	tests := []struct {
		name         string
		messages     []claude.Message
		wantBands    int
		wantSwitches int
		wantModels   int
	}{
		{
			name: "single model, one band, no switches",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("a")),
				assistantMsg("a1", 2000, "claude-opus-4-1-20250805", nil, textBlock("x")),
				userMsg("u2", 3000, textBlock("b")),
				assistantMsg("a2", 4000, "claude-opus-4-1-20250805", nil, textBlock("y")),
			},
			wantBands:    1,
			wantSwitches: 0,
			wantModels:   1,
		},
		{
			name: "two models alternating, three bands, two switches",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("a")),
				assistantMsg("a1", 2000, "claude-opus-4-1-20250805", nil, textBlock("x")),
				userMsg("u2", 3000, textBlock("b")),
				assistantMsg("a2", 4000, "claude-sonnet-4-5-20250929", nil, textBlock("y")),
				userMsg("u3", 5000, textBlock("c")),
				assistantMsg("a3", 6000, "claude-opus-4-1-20250805", nil, textBlock("z")),
			},
			wantBands:    3,
			wantSwitches: 2,
			wantModels:   2,
		},
		{
			name: "two models, one switch (opus then sonnet)",
			messages: []claude.Message{
				userMsg("u1", 1000, textBlock("a")),
				assistantMsg("a1", 2000, "claude-opus-4-1-20250805", nil, textBlock("x")),
				userMsg("u2", 3000, textBlock("b")),
				assistantMsg("a2", 4000, "claude-sonnet-4-5-20250929", nil, textBlock("y")),
			},
			wantBands:    2,
			wantSwitches: 1,
			wantModels:   2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ins := buildInsights(tt.messages)
			if len(ins.ModelBands) != tt.wantBands {
				t.Errorf("ModelBands = %d, want %d", len(ins.ModelBands), tt.wantBands)
			}
			if ins.ModelSwitches != tt.wantSwitches {
				t.Errorf("ModelSwitches = %d, want %d", ins.ModelSwitches, tt.wantSwitches)
			}
			if len(ins.Models) != tt.wantModels {
				t.Errorf("Models = %d, want %d", len(ins.Models), tt.wantModels)
			}
			// Bands are ordered and their left edges are non-decreasing.
			var prevLeft float64 = -1
			for _, b := range ins.ModelBands {
				if b.LeftPct < prevLeft {
					t.Errorf("band LeftPct %f < previous %f (out of order)", b.LeftPct, prevLeft)
				}
				prevLeft = b.LeftPct
				if b.WidthPct < bandMinWidthPct {
					t.Errorf("band WidthPct %f below floor %f", b.WidthPct, bandMinWidthPct)
				}
			}
		})
	}
}

func TestBuildInsights_PerModelSwitchCounts(t *testing.T) {
	// opus, sonnet, opus → opus has 2 runs, sonnet has 1.
	ins := buildInsights([]claude.Message{
		userMsg("u1", 1000, textBlock("a")),
		assistantMsg("a1", 2000, "claude-opus-4-1-20250805", &claude.Usage{OutputTokens: 100}, textBlock("x")),
		userMsg("u2", 3000, textBlock("b")),
		assistantMsg("a2", 4000, "claude-sonnet-4-5-20250929", &claude.Usage{OutputTokens: 50}, textBlock("y")),
		userMsg("u3", 5000, textBlock("c")),
		assistantMsg("a3", 6000, "claude-opus-4-1-20250805", &claude.Usage{OutputTokens: 100}, textBlock("z")),
	})

	got := map[string]int{}
	for _, m := range ins.Models {
		got[m.Model] = m.Switches
	}
	if got["claude-opus-4-1-20250805"] != 2 {
		t.Errorf("opus switches = %d, want 2", got["claude-opus-4-1-20250805"])
	}
	if got["claude-sonnet-4-5-20250929"] != 1 {
		t.Errorf("sonnet switches = %d, want 1", got["claude-sonnet-4-5-20250929"])
	}
	// Sorted by tokens desc: opus (200) before sonnet (50).
	if ins.Models[0].Model != "claude-opus-4-1-20250805" {
		t.Errorf("Models[0] = %q, want opus (highest tokens)", ins.Models[0].Model)
	}
	if ins.Models[0].Exchanges != 2 {
		t.Errorf("opus exchanges = %d, want 2", ins.Models[0].Exchanges)
	}
}

// --- time split ---

func TestBuildInsights_TimeSplitSumsToSpan(t *testing.T) {
	ins := buildInsights([]claude.Message{
		userMsg("u1", 100000, textBlock("a")),
		// duration 30s, one tool → tool time capped at 11s, rest generation.
		assistantMsg("a1", 130000, "claude-opus-4-1-20250805", nil,
			toolUse("t1", "Bash", map[string]any{"command": "make"})),
		// idle gap of 10s before next prompt (140000 - 130000).
		userMsg("u2", 140000, textBlock("b")),
		assistantMsg("a2", 155000, "claude-opus-4-1-20250805", nil, textBlock("y")),
	})

	var pctSum float64
	labels := map[string]TimeSplitSegment{}
	for _, seg := range ins.TimeSplit {
		pctSum += seg.Pct
		labels[seg.Label] = seg
	}
	if pctSum < 99.9 || pctSum > 100.1 {
		t.Errorf("time-split pct sum = %f, want ~100", pctSum)
	}
	// Idle should be the 10s gap.
	if got := labels["Waiting on you"].DurationMs; got != 10000 {
		t.Errorf("idle = %dms, want 10000", got)
	}
	// Tool calls: first exchange has 1 tool → 11s; second has none.
	if got := labels["Tool calls"].DurationMs; got != 11000 {
		t.Errorf("tool time = %dms, want 11000", got)
	}
	if ins.TotalIdleMs != 10000 {
		t.Errorf("TotalIdleMs = %d, want 10000", ins.TotalIdleMs)
	}
	// TotalSpanMs is the single duration the header and overview render: the full
	// session span, always active + idle.
	if want := ins.TotalDurationMs + ins.TotalIdleMs; ins.TotalSpanMs != want {
		t.Errorf("TotalSpanMs = %d, want %d (TotalDurationMs + TotalIdleMs)", ins.TotalSpanMs, want)
	}
}

func TestBuildInsights_TimeSplitSubagentShare(t *testing.T) {
	// A subagent exchange with duration 20s and no tools: 55% subagent, 45% gen.
	ins := buildInsights([]claude.Message{
		userMsg("u1", 100000, textBlock("delegate")),
		assistantMsg("a1", 120000, "claude-opus-4-1-20250805", nil,
			toolUse("t1", "Agent", map[string]any{"prompt": "go"})),
	})
	labels := map[string]int64{}
	for _, seg := range ins.TimeSplit {
		labels[seg.Label] = seg.DurationMs
	}
	// Agent tool counts as one tool → tools = min(dur-agent, 1*11000).
	// agent = 20000*0.55 = 11000; dur-agent = 9000; tools = min(9000, 11000) = 9000; gen = 0.
	if labels["Subagents"] != 11000 {
		t.Errorf("subagent ms = %d, want 11000", labels["Subagents"])
	}
	if labels["Tool calls"] != 9000 {
		t.Errorf("tool ms = %d, want 9000", labels["Tool calls"])
	}
	if labels["Model generation"] != 0 {
		t.Errorf("generation ms = %d, want 0", labels["Model generation"])
	}
}

// --- file / command / tool / skill tallies ---

func TestBuildInsights_FileAndCommandTallies(t *testing.T) {
	ins := buildInsights([]claude.Message{
		userMsg("u1", 1000, textBlock("work")),
		assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
			toolUse("t1", "Read", map[string]any{"file_path": "/home/x/a.go"}),
			toolUse("t2", "Edit", map[string]any{"file_path": "/home/x/a.go"}),
			toolUse("t3", "Read", map[string]any{"file_path": "/home/x/b.go"}),
			toolUse("t4", "Bash", map[string]any{"command": "go test ./..."})),
		userMsg("u2", 2000, textBlock("again")),
		assistantMsg("a2", 2100, "claude-opus-4-1-20250805", nil,
			toolUse("t5", "Bash", map[string]any{"command": "go test ./..."}),
			toolUse("t6", "Bash", map[string]any{"command": "make check"})),
	})

	// Files are tallied by their (masked) full path. a.go touched twice
	// (Read+Edit), b.go once.
	files := map[string]int{}
	for _, f := range ins.BusiestFiles {
		files[f.Name] = f.Count
	}
	if files["/home/x/a.go"] != 2 {
		t.Errorf("a.go count = %d, want 2", files["/home/x/a.go"])
	}
	if files["/home/x/b.go"] != 1 {
		t.Errorf("b.go count = %d, want 1", files["/home/x/b.go"])
	}
	if ins.BusiestFiles[0].Name != "/home/x/a.go" {
		t.Errorf("busiest file = %q, want /home/x/a.go", ins.BusiestFiles[0].Name)
	}

	// "go test ./..." ran twice, "make check" once.
	cmds := map[string]int{}
	for _, c := range ins.TopCommands {
		cmds[c.Name] = c.Count
	}
	if cmds["go test ./..."] != 2 {
		t.Errorf("go test count = %d, want 2", cmds["go test ./..."])
	}
	if cmds["make check"] != 1 {
		t.Errorf("make check count = %d, want 1", cmds["make check"])
	}
	if ins.TopCommands[0].Name != "go test ./..." {
		t.Errorf("top command = %q, want 'go test ./...'", ins.TopCommands[0].Name)
	}

	// Tool mix counts every invocation: Bash 3, Read 2, Edit 1.
	tools := map[string]int{}
	for _, tm := range ins.ToolMix {
		tools[tm.Name] = tm.Count
	}
	if tools["Bash"] != 3 || tools["Read"] != 2 || tools["Edit"] != 1 {
		t.Errorf("ToolMix = %+v, want Bash:3 Read:2 Edit:1", tools)
	}
	if ins.ToolMix[0].Name != "Bash" {
		t.Errorf("top tool = %q, want Bash", ins.ToolMix[0].Name)
	}
}

func TestBuildInsights_TopFilesLimit(t *testing.T) {
	// Seven distinct files, each touched once → only top 5 returned.
	var blocks []claude.ContentBlock
	for _, name := range []string{"a", "b", "c", "d", "e", "f", "g"} {
		blocks = append(blocks, toolUse("t"+name, "Read", map[string]any{"file_path": "/home/x/" + name + ".go"}))
	}
	ins := buildInsights([]claude.Message{
		userMsg("u1", 1000, textBlock("read all")),
		assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil, blocks...),
	})
	if len(ins.BusiestFiles) != topFilesLimit {
		t.Errorf("BusiestFiles len = %d, want %d", len(ins.BusiestFiles), topFilesLimit)
	}
}

func TestBuildInsights_Skills(t *testing.T) {
	ins := buildInsights([]claude.Message{
		userMsg("u1", 1000, textBlock("go")),
		assistantMsg("a1", 1100, "claude-opus-4-1-20250805", nil,
			toolUse("t1", "Skill", map[string]any{"skill": "commit-msg"}),
			toolUse("t2", "Skill", map[string]any{"skill": "commit-msg"}),
			toolUse("t3", "Skill", map[string]any{"skill": "audit"})),
	})
	skills := map[string]int{}
	for _, s := range ins.Skills {
		skills[s.Name] = s.Count
	}
	if skills["commit-msg"] != 2 {
		t.Errorf("commit-msg count = %d, want 2", skills["commit-msg"])
	}
	if skills["audit"] != 1 {
		t.Errorf("audit count = %d, want 1", skills["audit"])
	}
	if ins.Skills[0].Name != "commit-msg" {
		t.Errorf("top skill = %q, want commit-msg", ins.Skills[0].Name)
	}
}

// --- headline stats ---

func TestBuildInsights_ErrorCountAndLongest(t *testing.T) {
	ins := buildInsights([]claude.Message{
		userMsg("u1", 0, textBlock("a")),
		assistantMsg("a1", 5000, "claude-opus-4-1-20250805", nil,
			toolUse("t1", "Bash", map[string]any{"command": "false"})),
		toolResultMsg("r1", 6000, "t1", true), // error in exchange 0
		userMsg("u2", 10000, textBlock("b")),
		// long exchange: 50s
		assistantMsg("a2", 60000, "claude-opus-4-1-20250805", nil, textBlock("done")),
		userMsg("u3", 61000, textBlock("c")),
		assistantMsg("a3", 62000, "claude-opus-4-1-20250805", nil,
			toolUse("t2", "Read", map[string]any{"file_path": "/x"})),
		toolResultMsg("r2", 62500, "t2", true), // error in exchange 2
	})

	if ins.ErrorCount != 2 {
		t.Errorf("ErrorCount = %d, want 2", ins.ErrorCount)
	}
	if ins.LongestExchangeIndex != 1 {
		t.Errorf("LongestExchangeIndex = %d, want 1 (the 50s exchange)", ins.LongestExchangeIndex)
	}
}

func TestBuildInsights_Top5TokenShare(t *testing.T) {
	// Six exchanges: five at 1000 tokens, one at 5000. Total 10000.
	// Top 5 = 5000 + 1000*4 = 9000 → 90%.
	var msgs []claude.Message
	ts := int64(1000)
	tokens := []int{1000, 1000, 1000, 1000, 1000, 5000}
	for i, tok := range tokens {
		msgs = append(msgs,
			userMsg("u"+string(rune('a'+i)), ts, textBlock("p")),
			assistantMsg("a"+string(rune('a'+i)), ts+100, "claude-opus-4-1-20250805",
				&claude.Usage{OutputTokens: tok}, textBlock("r")))
		ts += 1000
	}
	ins := buildInsights(msgs)

	if ins.TotalTokens != 10000 {
		t.Fatalf("TotalTokens = %d, want 10000", ins.TotalTokens)
	}
	if ins.Top5TokenSharePct != 90 {
		t.Errorf("Top5TokenSharePct = %d, want 90", ins.Top5TokenSharePct)
	}
}

// --- overview buckets ---

func TestBuildInsights_OverviewBuckets(t *testing.T) {
	ins := buildInsights([]claude.Message{
		userMsg("u1", 0, textBlock("a")),
		assistantMsg("a1", 1000, "claude-opus-4-1-20250805",
			&claude.Usage{OutputTokens: 500}, textBlock("x")),
		userMsg("u2", 1000, textBlock("b")),
		assistantMsg("a2", 2000, "claude-opus-4-1-20250805",
			&claude.Usage{OutputTokens: 700}, toolUse("t1", "Bash", map[string]any{"command": "x"})),
		toolResultMsg("r1", 2100, "t1", true), // error in last exchange
	})

	if len(ins.OverviewBuckets) != overviewBucketCount {
		t.Fatalf("buckets = %d, want %d", len(ins.OverviewBuckets), overviewBucketCount)
	}
	// Tokens across all buckets equal the session total.
	var bucketTokens int
	var errorBuckets int
	for _, b := range ins.OverviewBuckets {
		bucketTokens += b.Tokens
		if b.ErrorLevel > 0 {
			errorBuckets++
		}
	}
	if bucketTokens != ins.TotalTokens {
		t.Errorf("summed bucket tokens = %d, want %d", bucketTokens, ins.TotalTokens)
	}
	if errorBuckets == 0 {
		t.Errorf("expected at least one bucket flagged with an error")
	}
}
