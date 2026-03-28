package projects

import (
	"os"
	"path/filepath"
	"testing"
)

func TestLoadNonexistent(t *testing.T) {
	path := filepath.Join(t.TempDir(), "projects.json")
	list, err := Load(path)
	if err != nil {
		t.Fatalf("Load nonexistent: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected empty slice, got %d items", len(list))
	}
}

func TestLoadSave(t *testing.T) {
	path := filepath.Join(t.TempDir(), "projects.json")

	projects := []Project{
		{ID: "1", Name: "Alpha", FolderPaths: []string{"/path/a"}},
		{ID: "2", Name: "Beta", FolderPaths: []string{"/path/b"}, Description: "desc", Color: "#ff0000"},
	}

	if err := Save(path, projects); err != nil {
		t.Fatalf("Save: %v", err)
	}

	loaded, err := Load(path)
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if len(loaded) != 2 {
		t.Fatalf("expected 2 projects, got %d", len(loaded))
	}
	if loaded[0].Name != "Alpha" {
		t.Errorf("expected Alpha, got %q", loaded[0].Name)
	}
	if loaded[1].Description != "desc" {
		t.Errorf("expected desc, got %q", loaded[1].Description)
	}
	if loaded[1].Color != "#ff0000" {
		t.Errorf("expected #ff0000, got %q", loaded[1].Color)
	}
}

func TestLoadEmptyArray(t *testing.T) {
	path := filepath.Join(t.TempDir(), "projects.json")
	os.WriteFile(path, []byte(`[]`), 0o644)

	list, err := Load(path)
	if err != nil {
		t.Fatalf("Load empty array: %v", err)
	}
	if len(list) != 0 {
		t.Errorf("expected empty slice, got %d items", len(list))
	}
}

func TestLoadNullJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "projects.json")
	os.WriteFile(path, []byte(`null`), 0o644)

	list, err := Load(path)
	if err != nil {
		t.Fatalf("Load null: %v", err)
	}
	if list == nil {
		t.Error("expected non-nil slice")
	}
}

func TestValidate(t *testing.T) {
	tests := []struct {
		name     string
		projects []Project
		wantErr  bool
	}{
		{"valid", []Project{{ID: "1", Name: "A", FolderPaths: []string{"/a"}}}, false},
		{"empty list", []Project{}, false},
		{"missing id", []Project{{Name: "A"}}, true},
		{"missing name", []Project{{ID: "1"}}, true},
		{"blank name", []Project{{ID: "1", Name: "  "}}, true},
		{"duplicate names", []Project{
			{ID: "1", Name: "Alpha"},
			{ID: "2", Name: "alpha"},
		}, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.projects)
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestSaveValidation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "projects.json")

	err := Save(path, []Project{{ID: "", Name: ""}})
	if err == nil {
		t.Error("Save should reject invalid projects")
	}
}

func TestSaveCreatesDirectory(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "nested", "dir")
	path := filepath.Join(dir, "projects.json")

	err := Save(path, []Project{{ID: "1", Name: "Test", FolderPaths: []string{"/a"}}})
	if err != nil {
		t.Fatalf("Save with nested dir: %v", err)
	}

	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Error("expected file to be created")
	}
}
