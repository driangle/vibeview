//go:build !unix

package pidcheck

// isProcessRunning is a no-op on non-Unix platforms.
// Always returns true (fail-open) since we cannot reliably check process liveness.
func isProcessRunning(pid int) (bool, error) {
	return true, nil
}
