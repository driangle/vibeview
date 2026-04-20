package watcher

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/pathutil"
	"github.com/driangle/vibeview/internal/redact"
	"github.com/driangle/vibeview/internal/session"
	"github.com/fsnotify/fsnotify"
)

// SSEEvent represents a server-sent event to be written to a client.
type SSEEvent struct {
	Event string // "message" or "ping"
	Data  string // JSON payload
}

// Client represents a connected SSE client for a specific session.
type Client struct {
	SessionID string
	Events    chan SSEEvent
}

// Broker manages file watching and distributes SSE events to connected clients.
type Broker struct {
	claudeDir  string
	standalone bool
	index      *session.Index
	pidChecker session.ProcessChecker
	dirSet     map[string]struct{} // encoded project dir names to filter (nil = no filter)

	mu            sync.Mutex
	clients       map[string]map[*Client]struct{} // sessionID -> set of clients
	tailers       map[string]*Tailer              // sessionID -> tailer
	lastMessageAt map[string]time.Time            // sessionID -> time of last message (for idle decay)

	historyWatcher *fsnotify.Watcher
	done           chan struct{}
	once           sync.Once
}

// NewBroker creates a new SSE broker that watches for file changes.
// In standalone mode, history watching is skipped.
// pidChecker may be nil, in which case PID-based liveness detection is disabled.
func NewBroker(claudeDir string, index *session.Index, standalone bool, dirs []string, pidChecker session.ProcessChecker) (*Broker, error) {
	var dirSet map[string]struct{}
	if len(dirs) > 0 {
		dirSet = make(map[string]struct{}, len(dirs))
		for _, d := range dirs {
			dirSet[d] = struct{}{}
		}
	}

	b := &Broker{
		claudeDir:     claudeDir,
		standalone:    standalone,
		index:         index,
		pidChecker:    pidChecker,
		dirSet:        dirSet,
		clients:       make(map[string]map[*Client]struct{}),
		tailers:       make(map[string]*Tailer),
		lastMessageAt: make(map[string]time.Time),
		done:          make(chan struct{}),
	}

	if !standalone {
		if err := b.startHistoryWatcher(); err != nil {
			return nil, fmt.Errorf("start history watcher: %w", err)
		}
		go b.startProjectsPoller()
	}

	go b.pingLoop()

	return b, nil
}

// Subscribe registers a client to receive events for the given session.
// Returns an error if the session file cannot be found or watched.
func (b *Broker) Subscribe(sessionID string) (*Client, error) {
	c := &Client{
		SessionID: sessionID,
		Events:    make(chan SSEEvent, 64),
	}

	b.mu.Lock()
	defer b.mu.Unlock()

	// Enforce total client limit.
	total := 0
	for _, cs := range b.clients {
		total += len(cs)
	}
	if total >= maxTotalClients {
		return nil, fmt.Errorf("too many connected clients (max %d)", maxTotalClients)
	}

	if b.clients[sessionID] == nil {
		b.clients[sessionID] = make(map[*Client]struct{})
	}

	// Enforce per-session client limit.
	if len(b.clients[sessionID]) >= maxClientsPerSession {
		return nil, fmt.Errorf("too many clients for session %s (max %d)", sessionID, maxClientsPerSession)
	}

	// Start a tailer for this session if one isn't running.
	if _, ok := b.tailers[sessionID]; !ok {
		if err := b.startTailer(sessionID); err != nil {
			delete(b.clients, sessionID)
			return nil, err
		}
	}

	b.clients[sessionID][c] = struct{}{}

	return c, nil
}

// Unsubscribe removes a client and cleans up resources if no clients remain.
func (b *Broker) Unsubscribe(c *Client) {
	b.mu.Lock()
	defer b.mu.Unlock()

	clients := b.clients[c.SessionID]
	if clients == nil {
		return
	}
	delete(clients, c)

	if len(clients) == 0 {
		delete(b.clients, c.SessionID)
		delete(b.lastMessageAt, c.SessionID)
		if tailer, ok := b.tailers[c.SessionID]; ok {
			tailer.Close()
			delete(b.tailers, c.SessionID)
		}
	}
}

// Close shuts down the broker and all active tailers.
func (b *Broker) Close() error {
	b.once.Do(func() {
		close(b.done)
	})

	b.mu.Lock()
	defer b.mu.Unlock()

	for _, t := range b.tailers {
		t.Close()
	}

	if b.historyWatcher != nil {
		b.historyWatcher.Close()
	}

	return nil
}

func (b *Broker) startTailer(sessionID string) error {
	meta := b.index.FindSession(sessionID)
	if meta == nil {
		return fmt.Errorf("session %s not found in index", sessionID)
	}

	path, err := session.ResolveFilePath(b.claudeDir, *meta)
	if err != nil {
		return fmt.Errorf("resolve path for %s: %w", sessionID, err)
	}
	if _, err := pathutil.SafeResolve(path, b.claudeDir); err != nil {
		return fmt.Errorf("unsafe path for session %s: %w", sessionID, err)
	}
	tailer, err := NewTailer(path)
	if err != nil {
		return fmt.Errorf("start tailer for %s: %w", sessionID, err)
	}

	b.tailers[sessionID] = tailer

	go func() {
		for msg := range tailer.Messages() {
			// Update the index when a session is renamed.
			if msg.Type == claude.MessageTypeCustomTitle && msg.CustomTitle != "" {
				b.index.SetCustomTitle(sessionID, msg.CustomTitle)
			}

			// Update activity state based on the latest message.
			derivedState := session.DeriveActivityStateFromMessage(msg)
			if derivedState != "" {
				b.index.SetActivityState(sessionID, derivedState)
				b.mu.Lock()
				b.lastMessageAt[sessionID] = time.Now()
				b.mu.Unlock()
			}

			data, err := json.Marshal(toMessageEvent(msg, derivedState))
			if err != nil {
				continue
			}
			event := SSEEvent{Event: "message", Data: string(data)}

			b.mu.Lock()
			for client := range b.clients[sessionID] {
				select {
				case client.Events <- event:
				default:
					// Drop event if client buffer is full.
				}
			}
			b.mu.Unlock()
		}
	}()

	go func() {
		for err := range tailer.Errors() {
			data, _ := json.Marshal(map[string]string{"error": err.Error()})
			event := SSEEvent{Event: "stream_error", Data: string(data)}

			b.mu.Lock()
			for client := range b.clients[sessionID] {
				select {
				case client.Events <- event:
				default:
				}
			}
			b.mu.Unlock()
		}
	}()

	return nil
}

func (b *Broker) startHistoryWatcher() error {
	historyPath := filepath.Join(b.claudeDir, "history.jsonl")
	info, err := os.Lstat(historyPath)
	if err != nil {
		// History file doesn't exist yet; skip watching.
		return nil
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return fmt.Errorf("history file %s is a symlink; refusing to watch", historyPath)
	}

	w, err := fsnotify.NewWatcher()
	if err != nil {
		return err
	}

	if err := w.Add(historyPath); err != nil {
		w.Close()
		return err
	}

	b.historyWatcher = w
	initialSize := info.Size()

	go func() {
		offset := initialSize
		for {
			select {
			case <-b.done:
				return
			case event, ok := <-w.Events:
				if !ok {
					return
				}
				if event.Has(fsnotify.Write) {
					offset = b.readNewHistoryEntries(historyPath, offset)
				}
			case _, ok := <-w.Errors:
				if !ok {
					return
				}
			}
		}
	}()

	return nil
}

func (b *Broker) readNewHistoryEntries(path string, offset int64) int64 {
	f, err := os.Open(path)
	if err != nil {
		return offset
	}
	defer f.Close()

	// Detect truncation: if the file is smaller than our offset, the file was
	// rotated or truncated. Reset to the beginning so we don't miss entries.
	info, err := f.Stat()
	if err != nil {
		return offset
	}
	if info.Size() < offset {
		logutil.Warnf("history.jsonl truncated (size %d < offset %d), re-reading from start", info.Size(), offset)
		offset = 0
	}

	if _, err := f.Seek(offset, 0); err != nil {
		return offset
	}

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 1024*1024), 2*1024*1024)

	bytesConsumed := int64(0)
	for scanner.Scan() {
		line := scanner.Bytes()
		bytesConsumed += int64(len(line)) + 1 // +1 for newline
		if len(line) == 0 {
			continue
		}
		entry, err := claude.ParseHistoryLine(line)
		if err != nil {
			logutil.Warnf("history.jsonl: skipping malformed line at offset %d (content: %.100s)", offset+bytesConsumed, line)
			continue
		}

		// Skip entries that don't match the directory filter.
		if b.dirSet != nil {
			encoded := claude.EncodeProjectPath(entry.Project)
			if _, ok := b.dirSet[encoded]; !ok {
				continue
			}
		}

		b.index.AddSession(b.claudeDir, entry)
		go b.enrichNewSession(entry.SessionID)
	}

	if scanner.Err() != nil {
		return offset // keep old offset; retry on next write event
	}

	newOffset := offset + bytesConsumed
	// Clamp offset to file size to guard against line-boundary issues.
	if newOffset > info.Size() {
		newOffset = info.Size()
	}
	return newOffset
}

func (b *Broker) enrichNewSession(sessionID string) {
	delays := []time.Duration{500 * time.Millisecond, 1 * time.Second, 2 * time.Second, 4 * time.Second}
	for _, delay := range delays {
		select {
		case <-b.done:
			return
		case <-time.After(delay):
		}
		if b.index.EnrichSession(b.claudeDir, sessionID) {
			return
		}
	}
}

const (
	idleDecayDuration    = 5 * time.Minute
	projectsPollInterval = 15 * time.Second
	maxClientsPerSession = 10
	maxTotalClients      = 100
)

// startProjectsPoller periodically scans the projects directory for session files
// not present in the index. This catches sessions created by the SDK that never
// write to history.jsonl.
func (b *Broker) startProjectsPoller() {
	ticker := time.NewTicker(projectsPollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-b.done:
			return
		case <-ticker.C:
			for _, meta := range session.ScanProjectDirs(b.claudeDir, b.dirSet) {
				if b.index.AddSessionMeta(meta) {
					go b.enrichNewSession(meta.SessionID)
				}
			}
		}
	}
}

func (b *Broker) pingLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-b.done:
			return
		case <-ticker.C:
			now := time.Now()
			event := SSEEvent{Event: "ping", Data: `{"time":"` + now.UTC().Format(time.RFC3339) + `"}`}
			b.mu.Lock()
			// Decay stale active sessions to idle.
			var idledSessions []string
			for sessionID, lastMsg := range b.lastMessageAt {
				if now.Sub(lastMsg) > idleDecayDuration {
					b.index.SetActivityState(sessionID, session.ActivityIdle)
					delete(b.lastMessageAt, sessionID)
					idledSessions = append(idledSessions, sessionID)
				}
			}
			// Check process liveness for tracked active sessions.
			if b.pidChecker != nil {
				for sessionID := range b.lastMessageAt {
					if !b.pidChecker.IsProcessAlive(sessionID) {
						b.index.SetActivityState(sessionID, session.ActivityIdle)
						delete(b.lastMessageAt, sessionID)
						idledSessions = append(idledSessions, sessionID)
					}
				}
				// Also check sessions that were active at startup but never
				// received new messages through the tailer. Without this,
				// a session whose process dies after server start stays
				// "working" in the index indefinitely.
				for _, sessionID := range b.index.ActiveSessionIDs() {
					if _, tracked := b.lastMessageAt[sessionID]; tracked {
						continue // already handled above
					}
					if !b.pidChecker.IsProcessAlive(sessionID) {
						b.index.SetActivityState(sessionID, session.ActivityIdle)
						idledSessions = append(idledSessions, sessionID)
					}
				}
			}
			// Notify connected clients when their session becomes idle.
			for _, sessionID := range idledSessions {
				idleEvent := SSEEvent{
					Event: "activity_state",
					Data:  `{"state":"idle"}`,
				}
				for client := range b.clients[sessionID] {
					select {
					case client.Events <- idleEvent:
					default:
					}
				}
			}
			for _, clients := range b.clients {
				for client := range clients {
					select {
					case client.Events <- event:
					default:
					}
				}
			}
			b.mu.Unlock()
		}
	}
}

// messageEvent matches the MessageResponse type from the server package.
type messageEvent struct {
	UUID          string             `json:"uuid"`
	Type          string             `json:"type"`
	Timestamp     string             `json:"timestamp"`
	IsMeta        bool               `json:"isMeta,omitempty"`
	IsSidechain   bool               `json:"isSidechain,omitempty"`
	ActivityState string             `json:"activityState,omitempty"`
	Message       *claude.APIMessage `json:"message,omitempty"`
	Data          map[string]any     `json:"data,omitempty"`
	Snapshot      map[string]any     `json:"snapshot,omitempty"`
	CustomTitle   string             `json:"customTitle,omitempty"`
}

func toMessageEvent(msg claude.Message, activityState string) messageEvent {
	var ts string
	if msg.Timestamp.Int64() != 0 {
		ts = time.UnixMilli(msg.Timestamp.Int64()).UTC().Format(time.RFC3339)
	}
	return messageEvent{
		UUID:          msg.UUID,
		Type:          string(msg.Type),
		Timestamp:     ts,
		IsMeta:        msg.IsMeta,
		IsSidechain:   msg.IsSidechain,
		ActivityState: activityState,
		Message:       redact.RedactAPIMessage(msg.Message),
		Data:          redact.RedactMapValues(msg.Data),
		Snapshot:      redact.RedactMapValues(msg.Snapshot),
		CustomTitle:   msg.CustomTitle,
	}
}
