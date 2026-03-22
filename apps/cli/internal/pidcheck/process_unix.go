//go:build unix

package pidcheck

import (
	"errors"
	"syscall"
)

// isProcessRunning checks if a process with the given PID exists.
// Uses signal 0 which doesn't actually send a signal but checks for existence.
func isProcessRunning(pid int) (bool, error) {
	err := syscall.Kill(pid, 0)
	if err == nil {
		return true, nil
	}
	if errors.Is(err, syscall.ESRCH) {
		return false, nil
	}
	// EPERM or other errors — process exists but we can't signal it.
	return true, nil
}
