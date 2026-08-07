// Package usage aggregates per-message token usage across dimensions
// (model, project, session, and time window).
//
// The parser retains per-message token usage and per-message model, but that
// granularity is otherwise collapsed into per-session totals during
// enrichment. This package provides a lightweight Record — one per assistant
// message that carries usage — plus stateless aggregation primitives, so the
// CLI and server can attribute tokens without re-parsing JSONL and without
// holding full parsed messages in memory.
package usage

import "github.com/driangle/vibeview/apps/lib/claude"

// Record captures the token usage attributed to a single assistant message.
// A Record is far smaller than a parsed claude.Message: callers extract records
// once and may discard the messages before aggregating.
type Record struct {
	// Timestamp is the epoch-millis time the message was produced.
	Timestamp int64
	// Model is the model that produced this message. Tokens are attributed to
	// this model, not to the session's first-seen model.
	Model string
	// SessionID and Project identify where the usage originated.
	SessionID string
	Project   string

	InputTokens              int
	OutputTokens             int
	CacheCreationInputTokens int
	CacheReadInputTokens     int
}

// TotalTokens returns the sum of all four token counters.
func (r Record) TotalTokens() int {
	return r.InputTokens + r.OutputTokens + r.CacheCreationInputTokens + r.CacheReadInputTokens
}

// ExtractParams are the inputs to Extract. SessionID and Project are fallbacks
// used when an individual message does not carry its own sessionId/cwd.
type ExtractParams struct {
	Messages  []claude.Message
	SessionID string
	Project   string
}

// Extract scans messages and returns one Record per assistant message that
// carries token usage. Each record is attributed to that message's own model
// (empty when the message omits it). Messages without usage — user messages,
// tool results, system events — are ignored.
func Extract(p ExtractParams) []Record {
	var records []Record
	for _, msg := range p.Messages {
		if msg.Type != claude.MessageTypeAssistant || msg.Message == nil || msg.Message.Usage == nil {
			continue
		}
		u := msg.Message.Usage

		sessionID := msg.SessionID
		if sessionID == "" {
			sessionID = p.SessionID
		}
		project := msg.Cwd
		if project == "" {
			project = p.Project
		}

		records = append(records, Record{
			Timestamp:                msg.Timestamp.Int64(),
			Model:                    msg.Message.Model,
			SessionID:                sessionID,
			Project:                  project,
			InputTokens:              u.InputTokens,
			OutputTokens:             u.OutputTokens,
			CacheCreationInputTokens: u.CacheCreationInputTokens,
			CacheReadInputTokens:     u.CacheReadInputTokens,
		})
	}
	return records
}
