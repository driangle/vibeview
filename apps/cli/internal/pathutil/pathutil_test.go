package pathutil

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestValidateSessionID(t *testing.T) {
	valid := []string{
		"abc-123",
		"session_001",
		"a",
		strings.Repeat("x", 256),
	}
	for _, id := range valid {
		if err := ValidateSessionID(id); err != nil {
			t.Errorf("ValidateSessionID(%q) = %v, want nil", id, err)
		}
	}

	invalid := []string{
		"",
		"../../../etc/passwd",
		"foo/bar",
		"foo\\bar",
		"hello world",
		"session.jsonl",
		strings.Repeat("x", 257),
	}
	for _, id := range invalid {
		if err := ValidateSessionID(id); err == nil {
			t.Errorf("ValidateSessionID(%q) = nil, want error", id)
		}
	}
}

func TestSafeResolve(t *testing.T) {
	base := t.TempDir()
	inside := filepath.Join(base, "projects", "sess.jsonl")
	os.MkdirAll(filepath.Join(base, "projects"), 0755)
	os.WriteFile(inside, []byte("{}"), 0644)

	// Path inside base should succeed.
	resolved, err := SafeResolve(inside, base)
	if err != nil {
		t.Fatalf("SafeResolve(inside) = %v", err)
	}
	// On macOS, /var -> /private/var, so compare with resolved base.
	resolvedBase, _ := filepath.EvalSymlinks(base)
	if !strings.HasPrefix(resolved, resolvedBase) {
		t.Errorf("resolved %q not under base %q", resolved, resolvedBase)
	}

	// Symlink pointing outside base should fail.
	outside := t.TempDir()
	secret := filepath.Join(outside, "secret.txt")
	os.WriteFile(secret, []byte("secret"), 0644)

	link := filepath.Join(base, "projects", "evil.jsonl")
	os.Symlink(secret, link)

	_, err = SafeResolve(link, base)
	if err == nil {
		t.Error("SafeResolve(symlink-outside) = nil, want error")
	}

	// Non-existent path should fail.
	_, err = SafeResolve(filepath.Join(base, "nonexistent"), base)
	if err == nil {
		t.Error("SafeResolve(nonexistent) = nil, want error")
	}
}

func TestIsSymlink(t *testing.T) {
	dir := t.TempDir()

	regular := filepath.Join(dir, "file.txt")
	os.WriteFile(regular, []byte("hi"), 0644)

	link := filepath.Join(dir, "link.txt")
	os.Symlink(regular, link)

	if ok, _ := IsSymlink(regular); ok {
		t.Error("IsSymlink(regular file) = true, want false")
	}
	if ok, _ := IsSymlink(link); !ok {
		t.Error("IsSymlink(symlink) = false, want true")
	}
}
