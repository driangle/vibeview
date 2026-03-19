package settings

import (
	"os"
	"path/filepath"
	"testing"
)

func TestDefault(t *testing.T) {
	s := Default()
	if s.Theme != "system" {
		t.Errorf("default theme = %q, want system", s.Theme)
	}
	if s.PageSize != 100 {
		t.Errorf("default pageSize = %d, want 100", s.PageSize)
	}
	if s.ShowCost != true {
		t.Error("default showCost should be true")
	}
	if err := Validate(s); err != nil {
		t.Errorf("default settings should be valid: %v", err)
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name    string
		modify  func(*Settings)
		wantErr bool
	}{
		{"valid defaults", func(s *Settings) {}, false},
		{"bad theme", func(s *Settings) { s.Theme = "neon" }, true},
		{"bad sort column", func(s *Settings) { s.DefaultSort.Column = "foo" }, true},
		{"bad sort direction", func(s *Settings) { s.DefaultSort.Direction = "sideways" }, true},
		{"pageSize too low", func(s *Settings) { s.PageSize = 10 }, true},
		{"pageSize too high", func(s *Settings) { s.PageSize = 1000 }, true},
		{"bad dateFormat", func(s *Settings) { s.DateFormat = "unix" }, true},
		{"refreshInterval too low", func(s *Settings) { s.RefreshInterval = 500 }, true},
		{"refreshInterval too high", func(s *Settings) { s.RefreshInterval = 100000 }, true},
		{"messagesPerPage too low", func(s *Settings) { s.MessagesPerPage = 5 }, true},
		{"recentThreshold too low", func(s *Settings) { s.RecentThreshold = 100 }, true},
		{"recentThreshold too high", func(s *Settings) { s.RecentThreshold = 5000000 }, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			s := Default()
			tt.modify(&s)
			err := Validate(s)
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestLoadSave(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "settings.json")

	// Load from nonexistent file returns defaults.
	s, err := Load(path)
	if err != nil {
		t.Fatalf("Load nonexistent: %v", err)
	}
	if s.PageSize != 100 {
		t.Errorf("expected default pageSize 100, got %d", s.PageSize)
	}

	// Save and reload.
	s.PageSize = 50
	if err := Save(path, s); err != nil {
		t.Fatalf("Save: %v", err)
	}

	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if loaded.PageSize != 50 {
		t.Errorf("loaded pageSize = %d, want 50", loaded.PageSize)
	}
	// Defaults should still be filled in.
	if loaded.Theme != "system" {
		t.Errorf("loaded theme = %q, want system", loaded.Theme)
	}
}

func TestLoadPartialFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "settings.json")

	// Write a partial JSON file (only pageSize).
	os.WriteFile(path, []byte(`{"pageSize": 50}`), 0o644)

	s, err := Load(path)
	if err != nil {
		t.Fatalf("Load partial: %v", err)
	}
	if s.PageSize != 50 {
		t.Errorf("pageSize = %d, want 50", s.PageSize)
	}
	// Missing fields should get defaults.
	if s.Theme != "system" {
		t.Errorf("theme = %q, want system", s.Theme)
	}
	if s.ShowCost != true {
		t.Error("showCost should default to true")
	}
}

func TestSaveValidation(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "settings.json")

	s := Default()
	s.PageSize = -1
	if err := Save(path, s); err == nil {
		t.Error("Save should reject invalid settings")
	}
}

func TestMergeJSON(t *testing.T) {
	base := Default()

	merged, err := MergeJSON(base, []byte(`{"pageSize": 50, "theme": "dark"}`))
	if err != nil {
		t.Fatalf("MergeJSON: %v", err)
	}
	if merged.PageSize != 50 {
		t.Errorf("merged pageSize = %d, want 50", merged.PageSize)
	}
	if merged.Theme != "dark" {
		t.Errorf("merged theme = %q, want dark", merged.Theme)
	}
	// Fields not in partial JSON should keep base values.
	if merged.ShowCost != true {
		t.Error("merged showCost should remain true from base")
	}
	if merged.RefreshInterval != 5000 {
		t.Errorf("merged refreshInterval = %d, want 5000", merged.RefreshInterval)
	}
}

func TestMergeJSONBoolOverride(t *testing.T) {
	base := Default()

	// Explicitly setting showCost to false should work.
	merged, err := MergeJSON(base, []byte(`{"showCost": false}`))
	if err != nil {
		t.Fatalf("MergeJSON: %v", err)
	}
	if merged.ShowCost != false {
		t.Error("merged showCost should be false when explicitly set")
	}
}
