// Package logutil provides a simple leveled logger.
package logutil

import (
	"fmt"
	"os"
	"strings"
	"sync"
)

// Level controls which messages are printed.
type Level int

const (
	LevelDebug Level = iota
	LevelWarn
	LevelError
)

// ParseLevel converts a string to a Level. Returns LevelWarn if unknown.
func ParseLevel(s string) Level {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "debug":
		return LevelDebug
	case "warn":
		return LevelWarn
	case "error":
		return LevelError
	default:
		return LevelWarn
	}
}

func (l Level) String() string {
	switch l {
	case LevelDebug:
		return "debug"
	case LevelWarn:
		return "warn"
	case LevelError:
		return "error"
	default:
		return "unknown"
	}
}

var (
	mu    sync.RWMutex
	level = LevelWarn
)

// SetLevel sets the global log level.
func SetLevel(l Level) {
	mu.Lock()
	level = l
	mu.Unlock()
}

// GetLevel returns the current global log level.
func GetLevel() Level {
	mu.RLock()
	defer mu.RUnlock()
	return level
}

func logf(l Level, prefix, format string, args ...any) {
	mu.RLock()
	cur := level
	mu.RUnlock()
	if l < cur {
		return
	}
	msg := fmt.Sprintf(format, args...)
	fmt.Fprintf(os.Stderr, "%s: %s\n", prefix, msg)
}

// Debugf logs a debug-level message.
func Debugf(format string, args ...any) { logf(LevelDebug, "debug", format, args...) }

// Warnf logs a warning-level message.
func Warnf(format string, args ...any) { logf(LevelWarn, "warn", format, args...) }

// Errorf logs an error-level message.
func Errorf(format string, args ...any) { logf(LevelError, "error", format, args...) }
