package insights

import (
	"regexp"
	"strings"

	"github.com/driangle/vibeview/internal/claude"
)

var skillExpansionRe = regexp.MustCompile(`^Base directory for this skill:.*\/skills\/([^\s/]+)`)

// channelRe matches a <channel ...>...</channel> wrapper anywhere in the text.
var channelRe = regexp.MustCompile(`<channel\s+([^>]*)>([\s\S]*?)</channel>`)

// channelAttrRe extracts key="value" pairs from the attribute section.
var channelAttrRe = regexp.MustCompile(`(\w+)="([^"]*)"`)

// ChannelInfo holds the parsed metadata of a channel-wrapped user message.
type ChannelInfo struct {
	Source     string `json:"source,omitempty"`
	SourceID   string `json:"sourceId,omitempty"`
	SourceName string `json:"sourceName,omitempty"`
	ReplyTo    string `json:"replyTo,omitempty"`
	Content    string `json:"content"`
}

// ClassifyMessageKind determines a special messageKind for a user message.
// Returns "skill-expansion" for skill-loaded meta messages, "channel-message"
// for messages whose content is wrapped in a <channel> tag, or empty string.
func ClassifyMessageKind(msg claude.Message) string {
	if msg.Type != claude.MessageTypeUser {
		return ""
	}
	text := messageText(msg)
	if msg.IsMeta && skillExpansionRe.MatchString(text) {
		return "skill-expansion"
	}
	if channelRe.MatchString(text) {
		return "channel-message"
	}
	return ""
}

// ExtractSkillExpansionName extracts the skill name from a skill expansion message.
// Returns empty string if the message is not a skill expansion.
func ExtractSkillExpansionName(msg claude.Message) string {
	text := messageText(msg)
	m := skillExpansionRe.FindStringSubmatch(text)
	if m != nil {
		return m[1]
	}
	return ""
}

// ExtractChannelInfo extracts channel metadata and inner content from a
// channel-wrapped user message. Returns nil if the message is not a channel message.
func ExtractChannelInfo(msg claude.Message) *ChannelInfo {
	text := messageText(msg)
	m := channelRe.FindStringSubmatch(text)
	if m == nil {
		return nil
	}
	info := &ChannelInfo{Content: strings.TrimSpace(m[2])}
	for _, attr := range channelAttrRe.FindAllStringSubmatch(m[1], -1) {
		switch attr[1] {
		case "source":
			info.Source = attr[2]
		case "source_id":
			info.SourceID = attr[2]
		case "source_name":
			info.SourceName = attr[2]
		case "reply_to":
			info.ReplyTo = attr[2]
		}
	}
	return info
}
