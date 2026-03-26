// Package watcher provides file watching and tailing for JSONL files.
package watcher

import (
	"bufio"
	"fmt"
	"io"
	"os"
	"sync"
	"sync/atomic"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/driangle/vibeview/internal/logutil"
	"github.com/fsnotify/fsnotify"
)

// Tailer watches a JSONL session file and emits new messages as they are appended.
type Tailer struct {
	path    string
	offset  atomic.Int64
	watcher *fsnotify.Watcher
	msgCh   chan claude.Message
	errCh   chan error
	done    chan struct{}
	once    sync.Once
}

// NewTailer creates a tailer that watches the given session file for new lines.
// It starts reading from the current end of the file (only new content).
func NewTailer(path string) (*Tailer, error) {
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}

	w, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	if err := w.Add(path); err != nil {
		w.Close()
		return nil, err
	}

	t := &Tailer{
		path:    path,
		watcher: w,
		msgCh:   make(chan claude.Message, 64),
		errCh:   make(chan error, 8),
		done:    make(chan struct{}),
	}
	t.offset.Store(info.Size())

	go t.loop()
	return t, nil
}

// Messages returns a channel that receives new messages as they appear.
func (t *Tailer) Messages() <-chan claude.Message {
	return t.msgCh
}

// Errors returns a channel that receives tailer errors (file read, seek, scan failures).
func (t *Tailer) Errors() <-chan error {
	return t.errCh
}

// Close stops the tailer and releases resources.
func (t *Tailer) Close() error {
	t.once.Do(func() {
		close(t.done)
	})
	return t.watcher.Close()
}

func (t *Tailer) loop() {
	defer close(t.msgCh)
	defer close(t.errCh)

	for {
		select {
		case <-t.done:
			return
		case event, ok := <-t.watcher.Events:
			if !ok {
				return
			}
			if event.Has(fsnotify.Write) {
				t.readNewLines()
			}
		case err, ok := <-t.watcher.Errors:
			if !ok {
				return
			}
			logutil.Warnf("tailer: fsnotify error for %s: %v", t.path, err)
			t.sendError(fmt.Errorf("file watch error: %w", err))
		}
	}
}

func (t *Tailer) sendError(err error) {
	select {
	case t.errCh <- err:
	default:
	}
}

func (t *Tailer) readNewLines() {
	f, err := os.Open(t.path)
	if err != nil {
		logutil.Warnf("tailer: failed to open %s: %v", t.path, err)
		t.sendError(fmt.Errorf("failed to open session file: %w", err))
		return
	}
	defer f.Close()

	currentOffset := t.offset.Load()
	if _, err := f.Seek(currentOffset, io.SeekStart); err != nil {
		logutil.Warnf("tailer: failed to seek %s: %v", t.path, err)
		t.sendError(fmt.Errorf("failed to seek session file: %w", err))
		return
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
		msg, err := claude.ParseMessageLine(line)
		if err != nil {
			continue
		}
		select {
		case t.msgCh <- msg:
		case <-t.done:
			return
		}
	}

	if err := scanner.Err(); err != nil {
		logutil.Warnf("tailer: scanner error for %s: %v", t.path, err)
		t.sendError(fmt.Errorf("scanner error: %w", err))
		return // keep old offset; retry on next write event
	}

	t.offset.Store(currentOffset + bytesConsumed)
}
