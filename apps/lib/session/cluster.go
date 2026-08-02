package session

import "sort"

// TimeWindow returns a session's [start, end] as epoch millis. It prefers the
// enriched StartTime/EndTime fields and falls back to Timestamp (+DurationMs)
// for sessions that have not been fully enriched.
func (meta SessionMeta) TimeWindow() (start, end int64) {
	start = meta.StartTime
	if start == 0 {
		start = meta.Timestamp
	}
	end = meta.EndTime
	if end < start {
		end = start + meta.DurationMs
	}
	if end < start {
		end = start
	}
	return start, end
}

// ClusterByTime returns the candidate sessions whose time windows cluster with
// the target's window, excluding the target itself. A candidate is included
// when its [start, end] window is within gapMs of the target's window — i.e.
// the windows overlap or the nearest gap between them is at most gapMs.
//
// Candidates with no usable time window (start == 0) are excluded. Results are
// sorted by start time ascending.
func ClusterByTime(target SessionMeta, candidates []SessionMeta, gapMs int64) []SessionMeta {
	tStart, tEnd := target.TimeWindow()

	var clustered []SessionMeta
	for _, c := range candidates {
		if c.SessionID == "" || c.SessionID == target.SessionID {
			continue
		}
		cStart, cEnd := c.TimeWindow()
		if cStart == 0 {
			continue
		}
		// Windows cluster when neither lies fully more than gapMs away.
		if cStart <= tEnd+gapMs && cEnd >= tStart-gapMs {
			clustered = append(clustered, c)
		}
	}

	sort.Slice(clustered, func(i, j int) bool {
		si, _ := clustered[i].TimeWindow()
		sj, _ := clustered[j].TimeWindow()
		return si < sj
	})
	return clustered
}
