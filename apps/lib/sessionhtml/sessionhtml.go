// Package sessionhtml renders a single Claude Code session as a self-contained
// HTML page.
//
// The page carries both the session and the viewer that renders it — the same
// React SessionView the vibeview web UI serves — with every asset inlined, so it
// opens from disk with no server and no network requests.
//
//	page, err := sessionhtml.Render(sessionhtml.Request{Session: "877fff1e"})
//	if err != nil {
//	    return err
//	}
//	os.WriteFile("session.html", page, 0o644)
//
// Session may be a session ID (full or a unique prefix) or the path to a .jsonl
// transcript. Programs that embed this package need no vibeview binary on PATH:
// the viewer is compiled in.
package sessionhtml

import (
	"bytes"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"github.com/driangle/vibeview/apps/lib/session"
	"github.com/driangle/vibeview/apps/lib/sessiondetail"
)

// template is the built page: the web app's session view, waiting for data.
// Regenerate it with `make web-export` after changing the web app.
//
//go:embed template.html
var template []byte

// The template's data node, whose body the render replaces.
const (
	dataNodeOpen  = `<script id="vibeview-export-data" type="application/json">`
	dataNodeClose = `</script>`
)

// ErrTemplate means the embedded template is missing its data node — the build
// produced something this code cannot fill in.
var ErrTemplate = errors.New("session page template has no data node")

// Request describes the page to render.
type Request struct {
	// Session is a session ID (full or unique prefix) or the path to a .jsonl
	// transcript. Required.
	Session string
	// ClaudeDir is where sessions are looked up. Defaults to ~/.claude.
	// Ignored when Session is a file path.
	ClaudeDir string
	// CostEnabled shows cost ($) figures in the rendered page. Token counts are
	// always shown.
	CostEnabled bool
}

// Payload is the data embedded in a rendered page. Its shape mirrors the
// vibeview API responses, which is what the bundled viewer consumes.
type Payload struct {
	SessionID string                                  `json:"sessionId"`
	Session   sessiondetail.Detail                    `json:"session"`
	Config    Config                                  `json:"config"`
	Settings  ViewSettings                            `json:"settings"`
	Subagents map[string]sessiondetail.SubagentDetail `json:"subagents"`
}

// Config carries the runtime flags the viewer reads. Only the cost toggle
// travels: the rest of the server's config is local paths, which have no place
// in a file meant to be shared.
type Config struct {
	CostEnabled bool `json:"costEnabled"`
}

// ViewSettings are the display preferences the viewer starts with. They mirror
// the web app's user settings; an exported page is not tied to any user, so it
// renders with the defaults.
type ViewSettings struct {
	Theme           string   `json:"theme"`
	DefaultSort     SortSpec `json:"defaultSort"`
	PageSize        int      `json:"pageSize"`
	DateFormat      string   `json:"dateFormat"`
	AutoFollow      bool     `json:"autoFollow"`
	RefreshInterval int      `json:"refreshInterval"`
	MessagesPerPage int      `json:"messagesPerPage"`
	RecentThreshold int      `json:"recentThreshold"`
}

// SortSpec is a sort column and direction.
type SortSpec struct {
	Column    string `json:"column"`
	Direction string `json:"direction"`
}

// DefaultViewSettings returns the display preferences an exported page uses.
func DefaultViewSettings() ViewSettings {
	return ViewSettings{
		Theme:           "system",
		DefaultSort:     SortSpec{Column: "date", Direction: "desc"},
		PageSize:        100,
		DateFormat:      "relative",
		AutoFollow:      false,
		RefreshInterval: 5000,
		MessagesPerPage: 100,
		RecentThreshold: 300000,
	}
}

// Render resolves the request and returns a complete HTML document.
func Render(req Request) ([]byte, error) {
	if req.Session == "" {
		return nil, errors.New("no session given")
	}

	claudeDir := req.ClaudeDir
	if claudeDir == "" {
		home, err := os.UserHomeDir()
		if err != nil {
			return nil, fmt.Errorf("locating the claude directory: %w", err)
		}
		claudeDir = filepath.Join(home, ".claude")
	}

	target, err := session.ResolveTarget(claudeDir, req.Session)
	if err != nil {
		return nil, err
	}

	payload, err := BuildPayload(target, req.CostEnabled)
	if err != nil {
		return nil, err
	}
	return RenderPayload(payload)
}

// BuildPayload gathers a session, its subagent conversations, and the display
// configuration needed to render them offline.
func BuildPayload(target session.Target, costEnabled bool) (Payload, error) {
	detail, err := sessiondetail.Build(target.BaseDir, target.Meta)
	if err != nil {
		return Payload{}, fmt.Errorf("reading session: %w", err)
	}

	subagents := make(map[string]sessiondetail.SubagentDetail)
	if detail.Insights != nil {
		for _, agent := range detail.Insights.Subagents {
			if agent.AgentID == "" {
				continue
			}
			// A subagent named in the transcript may have no file on disk; the
			// page simply cannot drill into that one.
			sub, err := sessiondetail.BuildSubagent(target.BaseDir, target.Meta, agent.AgentID)
			if err != nil {
				continue
			}
			subagents[agent.AgentID] = sub
		}
	}

	return Payload{
		SessionID: target.Meta.SessionID,
		Session:   detail,
		Config:    Config{CostEnabled: costEnabled},
		Settings:  DefaultViewSettings(),
		Subagents: subagents,
	}, nil
}

// RenderPayload writes a payload into the page template.
func RenderPayload(payload Payload) ([]byte, error) {
	data, err := encodePayload(payload)
	if err != nil {
		return nil, err
	}

	start := bytes.Index(template, []byte(dataNodeOpen))
	if start < 0 {
		return nil, ErrTemplate
	}
	bodyStart := start + len(dataNodeOpen)
	end := bytes.Index(template[bodyStart:], []byte(dataNodeClose))
	if end < 0 {
		return nil, ErrTemplate
	}

	var out bytes.Buffer
	out.Grow(len(template) + len(data))
	out.Write(template[:bodyStart])
	out.Write(data)
	out.Write(template[bodyStart+end:])
	return out.Bytes(), nil
}

// encodePayload serializes the payload for embedding in an HTML document.
// encoding/json escapes <, > and & as \u00XX, so no amount of session content
// can close the surrounding script tag.
func encodePayload(payload Payload) ([]byte, error) {
	var buf bytes.Buffer
	encoder := json.NewEncoder(&buf)
	encoder.SetEscapeHTML(true)
	if err := encoder.Encode(payload); err != nil {
		return nil, fmt.Errorf("encoding session payload: %w", err)
	}
	return bytes.TrimRight(buf.Bytes(), "\n"), nil
}
