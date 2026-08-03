// Package messagedto defines the single API representation of a Claude session
// message. Both the HTTP fetch path (server) and the live SSE path (watcher)
// build this one type through From, so the two representations cannot drift.
package messagedto

import (
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
	"github.com/driangle/vibeview/apps/lib/insights"
	"github.com/driangle/vibeview/apps/lib/redact"
)

// Message is the API representation of a single session message. It is the one
// shape emitted over both SSE and the REST fetch endpoint. ActivityState is
// only populated on the live SSE path; the fetch path leaves it empty.
type Message struct {
	UUID           string                `json:"uuid"`
	Type           string                `json:"type"`
	Timestamp      string                `json:"timestamp"`
	IsMeta         bool                  `json:"isMeta,omitempty"`
	IsSidechain    bool                  `json:"isSidechain,omitempty"`
	ActivityState  string                `json:"activityState,omitempty"`
	MessageKind    string                `json:"messageKind,omitempty"`
	ChannelInfo    *insights.ChannelInfo `json:"channelInfo,omitempty"`
	Message        *claude.APIMessage    `json:"message,omitempty"`
	Content        string                `json:"content,omitempty"`
	Data           map[string]any        `json:"data,omitempty"`
	Snapshot       map[string]any        `json:"snapshot,omitempty"`
	CustomTitle    string                `json:"customTitle,omitempty"`
	AiTitle        string                `json:"aiTitle,omitempty"`
	PermissionMode string                `json:"permissionMode,omitempty"`
	Attachment     map[string]any        `json:"attachment,omitempty"`
}

// From builds the API representation from a raw claude.Message, applying
// redaction and message-kind classification. This is the single builder shared
// by the SSE and fetch paths; callers that stream live may set ActivityState on
// the returned value.
func From(msg claude.Message) Message {
	kind := insights.ClassifyMessageKind(msg)
	m := Message{
		UUID:           msg.UUID,
		Type:           string(msg.Type),
		Timestamp:      msToISO(msg.Timestamp.Int64()),
		IsMeta:         msg.IsMeta,
		IsSidechain:    msg.IsSidechain,
		MessageKind:    kind,
		Message:        redact.RedactAPIMessage(msg.Message),
		Content:        redact.RedactSecrets(msg.Content),
		Data:           redact.RedactMapValues(msg.Data),
		Snapshot:       redact.RedactMapValues(msg.Snapshot),
		CustomTitle:    msg.CustomTitle,
		AiTitle:        msg.AiTitle,
		PermissionMode: msg.PermissionMode,
		Attachment:     redact.RedactMapValues(msg.Attachment),
	}
	if kind == "channel-message" {
		m.ChannelInfo = insights.ExtractChannelInfo(msg)
	}
	return m
}

func msToISO(ms int64) string {
	if ms == 0 {
		return ""
	}
	return time.UnixMilli(ms).UTC().Format(time.RFC3339)
}
