// Package projects handles persistent project storage for VibeView.
package projects

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Project represents a user-defined project grouping.
type Project struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	FolderPaths []string `json:"folderPaths"`
	Description string   `json:"description,omitempty"`
	Color       string   `json:"color,omitempty"`
}

// Load reads projects from path. Returns an empty slice if the file does not exist.
func Load(path string) ([]Project, error) {
	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return []Project{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("read projects: %w", err)
	}

	var projects []Project
	if err := json.Unmarshal(data, &projects); err != nil {
		return nil, fmt.Errorf("parse projects: %w", err)
	}

	if projects == nil {
		projects = []Project{}
	}

	return projects, nil
}

// Save validates then writes projects as JSON.
func Save(path string, projects []Project) error {
	if err := Validate(projects); err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create projects directory: %w", err)
	}

	data, err := json.MarshalIndent(projects, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal projects: %w", err)
	}

	return os.WriteFile(path, data, 0o600)
}

// Validate checks that all projects have valid fields and no duplicate names.
func Validate(projects []Project) error {
	var errs []string
	seen := map[string]bool{}

	for i, p := range projects {
		if p.ID == "" {
			errs = append(errs, fmt.Sprintf("project[%d]: id is required", i))
		}
		if strings.TrimSpace(p.Name) == "" {
			errs = append(errs, fmt.Sprintf("project[%d]: name is required", i))
		}

		lower := strings.ToLower(p.Name)
		if seen[lower] {
			errs = append(errs, fmt.Sprintf("project[%d]: duplicate name %q", i, p.Name))
		}
		seen[lower] = true
	}

	if len(errs) > 0 {
		return fmt.Errorf("invalid projects: %s", strings.Join(errs, "; "))
	}
	return nil
}
