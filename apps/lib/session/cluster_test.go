package session

import "testing"

func TestTimeWindow(t *testing.T) {
	tests := []struct {
		name               string
		meta               SessionMeta
		wantStart, wantEnd int64
	}{
		{
			name:      "explicit start/end",
			meta:      SessionMeta{StartTime: 100, EndTime: 500},
			wantStart: 100, wantEnd: 500,
		},
		{
			name:      "falls back to timestamp + duration",
			meta:      SessionMeta{Timestamp: 100, DurationMs: 400},
			wantStart: 100, wantEnd: 500,
		},
		{
			name:      "no duration collapses to point",
			meta:      SessionMeta{Timestamp: 100},
			wantStart: 100, wantEnd: 100,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			start, end := tt.meta.TimeWindow()
			if start != tt.wantStart || end != tt.wantEnd {
				t.Errorf("TimeWindow() = (%d, %d), want (%d, %d)", start, end, tt.wantStart, tt.wantEnd)
			}
		})
	}
}

func TestClusterByTime(t *testing.T) {
	// Target window: [1000, 2000].
	target := SessionMeta{SessionID: "target", StartTime: 1000, EndTime: 2000}
	gap := int64(500)

	candidates := []SessionMeta{
		{SessionID: "overlap", StartTime: 1500, EndTime: 2500},    // overlaps -> in
		{SessionID: "within-gap", StartTime: 2400, EndTime: 2600}, // starts 400ms after end -> in
		{SessionID: "outside", StartTime: 3000, EndTime: 3500},    // 1000ms after end -> out
		{SessionID: "before", StartTime: 200, EndTime: 400},       // 600ms before start -> out
		{SessionID: "target", StartTime: 1000, EndTime: 2000},     // self -> excluded
		{SessionID: "no-window", StartTime: 0, EndTime: 0},        // no time -> excluded
	}

	got := ClusterByTime(target, candidates, gap)

	var ids []string
	for _, s := range got {
		ids = append(ids, s.SessionID)
	}
	want := []string{"overlap", "within-gap"}
	if len(ids) != len(want) {
		t.Fatalf("ClusterByTime returned %v, want %v", ids, want)
	}
	for i := range want {
		if ids[i] != want[i] {
			t.Errorf("ClusterByTime[%d] = %s, want %s (full: %v)", i, ids[i], want[i], ids)
		}
	}
}

func TestClusterByTimeSortedByStart(t *testing.T) {
	target := SessionMeta{SessionID: "t", StartTime: 1000, EndTime: 1000}
	candidates := []SessionMeta{
		{SessionID: "later", StartTime: 1200, EndTime: 1200},
		{SessionID: "earlier", StartTime: 800, EndTime: 800},
	}
	got := ClusterByTime(target, candidates, 1000)
	if len(got) != 2 || got[0].SessionID != "earlier" || got[1].SessionID != "later" {
		t.Errorf("expected [earlier, later], got %v", got)
	}
}
