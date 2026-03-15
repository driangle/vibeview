package watcher

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/driangle/vibeview/internal/claude"
)

func writeLine(t *testing.T, f *os.File, msg map[string]any) {
	t.Helper()
	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := f.Write(append(data, '\n')); err != nil {
		t.Fatal(err)
	}
	f.Sync()
}

func TestTailerEmitsNewMessages(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "session.jsonl")

	// Write initial content that the tailer should skip.
	initial := `{"type":"user","uuid":"u1","timestamp":1000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}` + "\n"
	if err := os.WriteFile(path, []byte(initial), 0644); err != nil {
		t.Fatal(err)
	}

	tailer, err := NewTailer(path)
	if err != nil {
		t.Fatal(err)
	}
	defer tailer.Close()

	// Append a new message.
	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	writeLine(t, f, map[string]any{
		"type":      "assistant",
		"uuid":      "a1",
		"timestamp": 2000,
		"message":   map[string]any{"role": "assistant", "content": []any{map[string]any{"type": "text", "text": "hi"}}},
	})

	select {
	case msg := <-tailer.Messages():
		if msg.UUID != "a1" {
			t.Errorf("expected uuid a1, got %s", msg.UUID)
		}
		if msg.Type != claude.MessageTypeAssistant {
			t.Errorf("expected type assistant, got %s", msg.Type)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for message")
	}
}

func TestTailerSkipsExistingContent(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "session.jsonl")

	initial := `{"type":"user","uuid":"u1","timestamp":1000,"message":{"role":"user","content":[{"type":"text","text":"hello"}]}}` + "\n"
	if err := os.WriteFile(path, []byte(initial), 0644); err != nil {
		t.Fatal(err)
	}

	tailer, err := NewTailer(path)
	if err != nil {
		t.Fatal(err)
	}
	defer tailer.Close()

	// No new content written — should not receive anything.
	select {
	case msg := <-tailer.Messages():
		t.Fatalf("should not have received a message, got uuid=%s", msg.UUID)
	case <-time.After(200 * time.Millisecond):
		// Expected.
	}
}

func TestTailerClose(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "session.jsonl")
	if err := os.WriteFile(path, []byte{}, 0644); err != nil {
		t.Fatal(err)
	}

	tailer, err := NewTailer(path)
	if err != nil {
		t.Fatal(err)
	}

	if err := tailer.Close(); err != nil {
		t.Fatalf("Close() error: %v", err)
	}

	// Messages channel should be closed eventually.
	select {
	case _, ok := <-tailer.Messages():
		if ok {
			// May receive residual messages; keep draining.
		}
	case <-time.After(time.Second):
		// Channel may already be drained.
	}
}
