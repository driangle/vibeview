package watcher

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/driangle/vibeview/apps/lib/claude"
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
	if err := f.Sync(); err != nil {
		t.Fatal(err)
	}
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

// TestTailerTooLong verifies that an over-limit line does not livelock the
// tailer: the tailer advances past the oversized line (rather than keeping the
// old offset and re-scanning it on every write) and still emits the valid
// message that follows it.
func TestTailerTooLong(t *testing.T) {
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

	f, err := os.OpenFile(path, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	// Append an oversized line (> the parser's line limit) followed by a valid
	// message. The valid message can only arrive if the tailer skipped past the
	// oversized line instead of aborting and re-scanning from the same offset.
	oversized := `{"type":"user","big":"` + strings.Repeat("x", claude.DefaultMaxLineBytes+1) + `"}` + "\n"
	if _, err := f.Write([]byte(oversized)); err != nil {
		t.Fatal(err)
	}
	valid := `{"type":"assistant","uuid":"a1","timestamp":2000,"message":{"role":"assistant","content":[{"type":"text","text":"hi"}]}}` + "\n"
	if _, err := f.Write([]byte(valid)); err != nil {
		t.Fatal(err)
	}
	if err := f.Sync(); err != nil {
		t.Fatal(err)
	}

	select {
	case msg := <-tailer.Messages():
		if msg.UUID != "a1" {
			t.Errorf("expected uuid a1, got %s", msg.UUID)
		}
	case <-time.After(3 * time.Second):
		t.Fatal("timed out waiting for message after oversized line (tailer livelock?)")
	}

	// The offset must have advanced past both the oversized line and the valid
	// line, so the oversized region is never re-scanned on future writes.
	wantOffset := int64(len(initial) + len(oversized) + len(valid))
	if got := tailer.offset.Load(); got != wantOffset {
		t.Errorf("offset = %d, want %d (oversized line not skipped past)", got, wantOffset)
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
		if !ok {
			// Channel closed as expected.
			return
		}
		// May receive residual messages; acceptable after close.
	case <-time.After(time.Second):
		// Channel may already be drained.
	}
}
