// Package pathutil provides path validation for security-sensitive file operations.
package pathutil

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
)

var sessionIDPattern = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,256}$`)

// ValidateSessionID checks that a session ID contains only safe characters.
// It rejects path traversal sequences and other unsafe characters.
func ValidateSessionID(id string) error {
	if !sessionIDPattern.MatchString(id) {
		return fmt.Errorf("invalid session ID %q: must match [a-zA-Z0-9_-]{1,256}", id)
	}
	return nil
}

// SafeResolve resolves symlinks in path and verifies the result is under baseDir.
// Returns the resolved path or an error if the path escapes baseDir.
func SafeResolve(path, baseDir string) (string, error) {
	resolved, err := filepath.EvalSymlinks(path)
	if err != nil {
		return "", fmt.Errorf("resolve symlinks for %q: %w", path, err)
	}

	resolvedBase, err := filepath.EvalSymlinks(baseDir)
	if err != nil {
		return "", fmt.Errorf("resolve symlinks for base %q: %w", baseDir, err)
	}

	resolved = filepath.Clean(resolved)
	resolvedBase = filepath.Clean(resolvedBase) + string(filepath.Separator)

	if resolved != filepath.Clean(resolvedBase[:len(resolvedBase)-1]) && !hasPrefix(resolved, resolvedBase) {
		return "", fmt.Errorf("path %q resolves to %q, which is outside base %q", path, resolved, baseDir)
	}

	return resolved, nil
}

func hasPrefix(path, prefix string) bool {
	return len(path) >= len(prefix) && path[:len(prefix)] == prefix
}

// IsSymlink reports whether the path is a symbolic link.
func IsSymlink(path string) (bool, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return false, err
	}
	return info.Mode()&os.ModeSymlink != 0, nil
}
