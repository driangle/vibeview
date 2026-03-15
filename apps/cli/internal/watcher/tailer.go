// Package watcher provides file watching and tailing for JSONL files.
package watcher

import (
	"bufio"
	"io"
	"os"
	"sync"

	"github.com/driangle/vibeview/internal/claude"
	"github.com/fsnotify/fsnotify"
)

// Tailer watches a JSONL session file and emits new messages as they are appended.
type Tailer struct {
	path    string
	offset  int64
	watcher *fsnotify.Watcher
	msgCh   chan claude.Message
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
		offset:  info.Size(),
		watcher: w,
		msgCh:   make(chan claude.Message, 64),
		done:    make(chan struct{}),
	}

	go t.loop()
	return t, nil
}

// Messages returns a channel that receives new messages as they appear.
func (t *Tailer) Messages() <-chan claude.Message {
	return t.msgCh
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
		case _, ok := <-t.watcher.Errors:
			if !ok {
				return
			}
		}
	}
}

func (t *Tailer) readNewLines() {
	f, err := os.Open(t.path)
	if err != nil {
		return
	}
	defer f.Close()

	if _, err := f.Seek(t.offset, io.SeekStart); err != nil {
		return
	}

	scanner := bufio.NewScanner(f)
	scanner.Buffer(make([]byte, 0, 1024*1024), 10*1024*1024)

	for scanner.Scan() {
		line := scanner.Bytes()
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

	// Update offset to current position.
	pos, err := f.Seek(0, io.SeekCurrent)
	if err == nil {
		t.offset = pos
	}
}
