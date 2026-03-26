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

	path := session.ResolveFilePath(b.claudeDir, *meta)
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
			if state := session.DeriveActivityStateFromMessage(msg); state != "" {
				b.index.SetActivityState(sessionID, state)
				b.mu.Lock()
				b.lastMessageAt[sessionID] = time.Now()
				b.mu.Unlock()
			}

			data, err := json.Marshal(toMessageEvent(msg))
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

	return nil
}

func (b *Broker) startHistoryWatcher() error {
	historyPath := filepath.Join(b.claudeDir, "history.jsonl")
	if _, err := os.Stat(historyPath); err != nil {
		// History file doesn't exist yet; skip watching.
		return nil
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

	info, _ := os.Stat(historyPath)
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

	if _, err := f.Seek(offset, 0); err != nil {
		return offset
	}

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 1024*1024), 2*1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		entry, err := claude.ParseHistoryLine(line)
		if err != nil {
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

	pos, err := f.Seek(0, 1)
	if err == nil {
		return pos
	}
	return offset
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
	maxClientsPerSession = 10
	maxTotalClients      = 100
)

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
	UUID        string             `json:"uuid"`
	Type        string             `json:"type"`
	Timestamp   string             `json:"timestamp"`
	IsMeta      bool               `json:"isMeta,omitempty"`
	Message     *claude.APIMessage `json:"message,omitempty"`
	Data        map[string]any     `json:"data,omitempty"`
	Snapshot    map[string]any     `json:"snapshot,omitempty"`
	CustomTitle string             `json:"customTitle,omitempty"`
}

func toMessageEvent(msg claude.Message) messageEvent {
	var ts string
	if msg.Timestamp.Int64() != 0 {
		ts = time.UnixMilli(msg.Timestamp.Int64()).UTC().Format(time.RFC3339)
	}
	return messageEvent{
		UUID:        msg.UUID,
		Type:        string(msg.Type),
		Timestamp:   ts,
		IsMeta:      msg.IsMeta,
		Message:     msg.Message,
		Data:        msg.Data,
		Snapshot:    msg.Snapshot,
		CustomTitle: msg.CustomTitle,
	}
}
