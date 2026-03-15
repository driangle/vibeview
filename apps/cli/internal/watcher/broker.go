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

	mu      sync.Mutex
	clients map[string]map[*Client]struct{} // sessionID -> set of clients
	tailers map[string]*Tailer              // sessionID -> tailer

	historyWatcher *fsnotify.Watcher
	done           chan struct{}
	once           sync.Once
}

// NewBroker creates a new SSE broker that watches for file changes.
// In standalone mode, history watching is skipped.
func NewBroker(claudeDir string, index *session.Index, standalone bool) (*Broker, error) {
	b := &Broker{
		claudeDir:  claudeDir,
		standalone: standalone,
		index:      index,
		clients:    make(map[string]map[*Client]struct{}),
		tailers:    make(map[string]*Tailer),
		done:       make(chan struct{}),
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

	if b.clients[sessionID] == nil {
		b.clients[sessionID] = make(map[*Client]struct{})
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
	scanner.Buffer(make([]byte, 0, 1024*1024), 10*1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
		if len(line) == 0 {
			continue
		}
		entry, err := claude.ParseHistoryLine(line)
		if err != nil {
			continue
		}

		b.index.AddSession(b.claudeDir, entry)
	}

	pos, err := f.Seek(0, 1)
	if err == nil {
		return pos
	}
	return offset
}

func (b *Broker) pingLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-b.done:
			return
		case <-ticker.C:
			event := SSEEvent{Event: "ping", Data: `{"time":"` + time.Now().UTC().Format(time.RFC3339) + `"}`}
			b.mu.Lock()
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
	UUID      string              `json:"uuid"`
	Type      string              `json:"type"`
	Timestamp string              `json:"timestamp"`
	Message   *claude.APIMessage  `json:"message,omitempty"`
	Data      map[string]any      `json:"data,omitempty"`
	Snapshot  map[string]any      `json:"snapshot,omitempty"`
}

func toMessageEvent(msg claude.Message) messageEvent {
	var ts string
	if msg.Timestamp.Int64() != 0 {
		ts = time.UnixMilli(msg.Timestamp.Int64()).UTC().Format(time.RFC3339)
	}
	return messageEvent{
		UUID:      msg.UUID,
		Type:      string(msg.Type),
		Timestamp: ts,
		Message:   msg.Message,
		Data:      msg.Data,
		Snapshot:  msg.Snapshot,
	}
}
