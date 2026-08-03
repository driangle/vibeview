package server

import (
	"testing"
	"time"
)

func TestBuildActivityBuckets(t *testing.T) {
	days := []ActivityDayResponse{{Date: "2024-01-01", Count: 2}, {Date: "2024-01-07", Count: 3}, {Date: "2024-02-01", Count: 4}}
	dayYears, weekYears, months := buildActivityBuckets(days, time.Date(2024, 2, 10, 12, 0, 0, 0, time.FixedZone("test", 3600)))
	if len(dayYears) != 1 || len(weekYears) != 1 {
		t.Fatalf("unexpected year buckets: %d day, %d week", len(dayYears), len(weekYears))
	}
	if got := dayYears[0].Weeks[0][1]; got.Date != "2024-01-01" || got.Count != 2 || got.DayOfWeek != 1 {
		t.Fatalf("unexpected day cell: %+v", got)
	}
	if weekYears[0].Cells[0].Count != 2 || weekYears[0].Cells[1].Count != 3 {
		t.Fatalf("unexpected week counts: %+v", weekYears[0].Cells[:2])
	}
	if len(months) != 2 || months[0].Count != 5 || months[1].Count != 4 || months[1].ToDate != "2024-02-29" {
		t.Fatalf("unexpected month buckets: %+v", months)
	}
}

func TestBuildActivityBucketsEmpty(t *testing.T) {
	days, weeks, months := buildActivityBuckets(nil, time.Now())
	if days == nil || weeks == nil || months == nil || len(days)+len(weeks)+len(months) != 0 {
		t.Fatal("empty activity must serialize as empty arrays")
	}
}
