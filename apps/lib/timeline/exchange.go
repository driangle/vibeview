// Package timeline groups a session's messages into exchanges — one per genuine
// user prompt plus the assistant work that follows it — and computes the
// per-exchange metrics the Timeline Track view renders. This is the server-side
// port of the client buildTimeline/cycleMetrics grouping so all domain logic
// lives in Go and the web client only displays the result.
package timeline

// ExchangeFlags are the boolean badges shown for an exchange.
type ExchangeFlags struct {
	HasErrors    bool `json:"hasErrors"`    // a tool_result in this exchange had is_error
	DeepThinking bool `json:"deepThinking"` // assistant thinking blocks exceeded the threshold
	HasSubagents bool `json:"hasSubagents"` // an Agent tool or agent_progress appeared
	ApprovalGate bool `json:"approvalGate"` // exchange ends waiting on a tool_use (pending approval)
}

// Exchange is one user prompt and the assistant work that answers it, with the
// per-row and detail-panel metrics the Timeline Track needs. A leading run of
// assistant/auxiliary messages with no preceding prompt forms an exchange with
// an empty PromptPreview and no user message.
type Exchange struct {
	Index         int           `json:"index"`
	StartTime     string        `json:"startTime"`    // ISO 8601, earliest message timestamp ("" if none)
	EndTime       string        `json:"endTime"`      // ISO 8601, latest message timestamp ("" if none)
	DurationMs    int64         `json:"durationMs"`   // EndTime - StartTime, never negative
	IdleBeforeMs  int64         `json:"idleBeforeMs"` // gap from the previous exchange's end; 0 for the first
	PromptPreview string        `json:"promptPreview"`
	Model         string        `json:"model"`   // model id of the first assistant reply ("" if none)
	Tokens        int           `json:"tokens"`  // sum of assistant input+output tokens
	CostUSD       float64       `json:"costUSD"` // sum of per-message cost via the pricing helper
	Tools         []string      `json:"tools"`   // distinct tool names, sorted
	Files         []string      `json:"files"`   // distinct file paths touched, masked and sorted
	Commands      []string      `json:"commands"`
	Skills        []string      `json:"skills"`
	Flags         ExchangeFlags `json:"flags"`
	MessageUUIDs  []string      `json:"messageUuids"` // every message in the exchange, in order
}
