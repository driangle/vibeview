package usage

import (
	"sort"
	"time"
)

// Totals holds summed token counters plus the number of contributing messages.
type Totals struct {
	InputTokens              int
	OutputTokens             int
	CacheCreationInputTokens int
	CacheReadInputTokens     int
	Messages                 int
}

// TotalTokens returns the sum of all four token counters.
func (t Totals) TotalTokens() int {
	return t.InputTokens + t.OutputTokens + t.CacheCreationInputTokens + t.CacheReadInputTokens
}

// add folds a record's tokens into the totals.
func (t *Totals) add(r Record) {
	t.InputTokens += r.InputTokens
	t.OutputTokens += r.OutputTokens
	t.CacheCreationInputTokens += r.CacheCreationInputTokens
	t.CacheReadInputTokens += r.CacheReadInputTokens
	t.Messages++
}

// Sum returns the grand total across all records.
func Sum(records []Record) Totals {
	var t Totals
	for _, r := range records {
		t.add(r)
	}
	return t
}

// Group pairs a dimension key with its aggregated totals.
type Group struct {
	Key    string
	Totals Totals
}

// groupBy aggregates records by an arbitrary string key, returning groups
// sorted by key ascending for deterministic output.
func groupBy(records []Record, key func(Record) string) []Group {
	if len(records) == 0 {
		return nil
	}
	byKey := make(map[string]*Totals)
	for _, r := range records {
		k := key(r)
		t := byKey[k]
		if t == nil {
			t = &Totals{}
			byKey[k] = t
		}
		t.add(r)
	}
	groups := make([]Group, 0, len(byKey))
	for k, t := range byKey {
		groups = append(groups, Group{Key: k, Totals: *t})
	}
	sort.Slice(groups, func(i, j int) bool { return groups[i].Key < groups[j].Key })
	return groups
}

// ByModel groups records by the model that produced each message. For a
// mixed-model session this splits tokens across each model correctly.
func ByModel(records []Record) []Group {
	return groupBy(records, func(r Record) string { return r.Model })
}

// ByProject groups records by project/working directory.
func ByProject(records []Record) []Group {
	return groupBy(records, func(r Record) string { return r.Project })
}

// BySession groups records by session ID.
func BySession(records []Record) []Group {
	return groupBy(records, func(r Record) string { return r.SessionID })
}

// TimeBucket holds the totals for a single fixed-width time window starting at
// Start (UTC).
type TimeBucket struct {
	Start  time.Time
	Totals Totals
}

// ByWindow buckets records into fixed-width rolling windows of the given size,
// aligned to the Unix epoch in UTC. A record whose timestamp falls exactly on a
// window boundary belongs to the window that starts at that boundary. Buckets
// are returned sorted ascending by Start. Empty input or a non-positive window
// returns nil.
func ByWindow(records []Record, window time.Duration) []TimeBucket {
	if len(records) == 0 || window <= 0 {
		return nil
	}
	byStart := make(map[int64]*Totals)
	for _, r := range records {
		start := time.UnixMilli(r.Timestamp).UTC().Truncate(window).UnixMilli()
		t := byStart[start]
		if t == nil {
			t = &Totals{}
			byStart[start] = t
		}
		t.add(r)
	}
	buckets := make([]TimeBucket, 0, len(byStart))
	for start, t := range byStart {
		buckets = append(buckets, TimeBucket{Start: time.UnixMilli(start).UTC(), Totals: *t})
	}
	sort.Slice(buckets, func(i, j int) bool { return buckets[i].Start.Before(buckets[j].Start) })
	return buckets
}

// ByHour buckets records into one-hour windows aligned to UTC hour boundaries.
func ByHour(records []Record) []TimeBucket {
	return ByWindow(records, time.Hour)
}

// ByDay buckets records into 24-hour windows aligned to UTC day boundaries.
func ByDay(records []Record) []TimeBucket {
	return ByWindow(records, 24*time.Hour)
}
