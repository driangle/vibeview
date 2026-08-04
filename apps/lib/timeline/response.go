package timeline

import "github.com/driangle/vibeview/apps/lib/claude"

// TimelineResponse is the Timeline Track payload for a single session: the
// per-exchange rows plus the session-level insights aggregated from them. It is
// attached to the single-session API response so the client renders it directly.
type TimelineResponse struct {
	Exchanges []Exchange       `json:"exchanges"`
	Insights  TimelineInsights `json:"insights"`
}

// Build groups a session's messages into exchanges and aggregates the timeline
// insights over them. Sensitive strings (prompt previews, file paths, commands)
// are already redacted at the source by BuildExchanges/BuildInsights. It is safe
// on an empty session: Exchanges is an empty slice and Insights is zero-valued.
func Build(messages []claude.Message) TimelineResponse {
	exchanges := BuildExchanges(messages)
	return TimelineResponse{
		Exchanges: exchanges,
		Insights:  BuildInsights(exchanges, messages),
	}
}
