package timeline

import (
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
)

// BuildExchanges groups a session's messages into exchanges and computes each
// one's metrics. Exchanges are returned in session order; idleBeforeMs is the
// gap between one exchange's end and the next's start, and is 0 for the first.
func BuildExchanges(messages []claude.Message) []Exchange {
	raws := groupIntoExchanges(messages)
	exchanges := make([]Exchange, 0, len(raws))

	var prevEndMs int64
	for i, raw := range raws {
		startMs, endMs := timeSpan(raw.ordered)

		idleBeforeMs := int64(0)
		if i > 0 && startMs > 0 && prevEndMs > 0 && startMs > prevEndMs {
			idleBeforeMs = startMs - prevEndMs
		}

		exchanges = append(exchanges, Exchange{
			Index:         i,
			StartTime:     msToISO(startMs),
			EndTime:       msToISO(endMs),
			DurationMs:    nonNegative(endMs - startMs),
			IdleBeforeMs:  idleBeforeMs,
			PromptPreview: promptPreview(raw.userMessage),
			Model:         firstModel(raw.assistantMessages),
			Tokens:        sumTokens(raw.assistantMessages),
			CostUSD:       sumCost(raw.assistantMessages),
			Tools:         distinctTools(raw.assistantMessages),
			Files:         distinctFiles(raw.assistantMessages),
			Commands:      commandList(raw.assistantMessages),
			Skills:        skillList(raw.ordered),
			Flags:         computeFlags(raw),
			MessageUUIDs:  messageUUIDs(raw.ordered),
		})

		if endMs > 0 {
			prevEndMs = endMs
		}
	}

	return exchanges
}

// timeSpan returns the earliest and latest non-zero message timestamps (epoch
// millis) in the exchange. Missing timestamps (0) are ignored so a single
// undated message doesn't collapse the span to the epoch. Returns (0, 0) when no
// message carries a timestamp.
func timeSpan(msgs []claude.Message) (startMs, endMs int64) {
	for _, msg := range msgs {
		ts := msg.Timestamp.Int64()
		if ts <= 0 {
			continue
		}
		if startMs == 0 || ts < startMs {
			startMs = ts
		}
		if ts > endMs {
			endMs = ts
		}
	}
	return startMs, endMs
}

// messageUUIDs returns the UUIDs of the exchange's messages in order.
func messageUUIDs(msgs []claude.Message) []string {
	uuids := make([]string, 0, len(msgs))
	for _, msg := range msgs {
		uuids = append(uuids, msg.UUID)
	}
	return uuids
}

func nonNegative(v int64) int64 {
	if v < 0 {
		return 0
	}
	return v
}

// msToISO formats epoch millis as an RFC 3339 UTC string, or "" for 0.
func msToISO(ms int64) string {
	if ms == 0 {
		return ""
	}
	return time.UnixMilli(ms).UTC().Format(time.RFC3339)
}
