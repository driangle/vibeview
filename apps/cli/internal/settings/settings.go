// Package settings handles persistent user preferences for VibeView.
package settings

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Settings holds all user-configurable preferences.
type Settings struct {
	Theme              string                  `json:"theme"`
	DefaultSort        SortSettings            `json:"defaultSort"`
	PageSize           int                     `json:"pageSize"`
	DateFormat         string                  `json:"dateFormat"`
	AutoFollow         bool                    `json:"autoFollow"`
	RefreshInterval    int                     `json:"refreshInterval"`
	ShowCost           bool                    `json:"showCost"`
	CustomModelPricing map[string]ModelPricing `json:"customModelPricing"`
	MessagesPerPage    int                     `json:"messagesPerPage"`
	RecentThreshold    int                     `json:"recentThreshold"`
}

// SortSettings configures default sort column and direction.
type SortSettings struct {
	Column    string `json:"column"`
	Direction string `json:"direction"`
}

// ModelPricing holds per-million-token prices for a custom model.
type ModelPricing struct {
	InputPerM  float64 `json:"inputPerM"`
	OutputPerM float64 `json:"outputPerM"`
}

var (
	validThemes         = map[string]bool{"light": true, "dark": true, "system": true}
	validSortColumns    = map[string]bool{"date": true, "name": true, "directory": true, "messages": true, "tokens": true, "cost": true}
	validSortDirections = map[string]bool{"asc": true, "desc": true}
	validDateFormats    = map[string]bool{"relative": true, "absolute": true}
)

// Default returns settings with sensible defaults.
func Default() Settings {
	return Settings{
		Theme:              "system",
		DefaultSort:        SortSettings{Column: "date", Direction: "desc"},
		PageSize:           100,
		DateFormat:         "relative",
		AutoFollow:         false,
		RefreshInterval:    5000,
		ShowCost:           true,
		CustomModelPricing: map[string]ModelPricing{},
		MessagesPerPage:    100,
		RecentThreshold:    300000,
	}
}

// Load reads settings from path, merging with defaults for any missing fields.
// If the file does not exist, defaults are returned.
func Load(path string) (Settings, error) {
	s := Default()

	data, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		return s, nil
	}
	if err != nil {
		return s, fmt.Errorf("read settings: %w", err)
	}

	if err := json.Unmarshal(data, &s); err != nil {
		return Default(), fmt.Errorf("parse settings: %w", err)
	}

	// Ensure map is never nil after unmarshal.
	if s.CustomModelPricing == nil {
		s.CustomModelPricing = map[string]ModelPricing{}
	}

	return s, nil
}

// Save validates then writes settings as JSON.
func Save(path string, s Settings) error {
	if err := Validate(s); err != nil {
		return err
	}

	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return fmt.Errorf("create settings directory: %w", err)
	}

	data, err := json.MarshalIndent(s, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal settings: %w", err)
	}

	return os.WriteFile(path, data, 0o644)
}

// Validate checks that all settings values are within allowed ranges.
func Validate(s Settings) error {
	var errs []string

	if !validThemes[s.Theme] {
		errs = append(errs, fmt.Sprintf("theme must be one of: light, dark, system (got %q)", s.Theme))
	}
	if !validSortColumns[s.DefaultSort.Column] {
		errs = append(errs, fmt.Sprintf("defaultSort.column must be one of: date, name, directory, messages, tokens, cost (got %q)", s.DefaultSort.Column))
	}
	if !validSortDirections[s.DefaultSort.Direction] {
		errs = append(errs, fmt.Sprintf("defaultSort.direction must be one of: asc, desc (got %q)", s.DefaultSort.Direction))
	}
	if s.PageSize < 25 || s.PageSize > 500 {
		errs = append(errs, fmt.Sprintf("pageSize must be 25–500 (got %d)", s.PageSize))
	}
	if !validDateFormats[s.DateFormat] {
		errs = append(errs, fmt.Sprintf("dateFormat must be one of: relative, absolute (got %q)", s.DateFormat))
	}
	if s.RefreshInterval < 1000 || s.RefreshInterval > 60000 {
		errs = append(errs, fmt.Sprintf("refreshInterval must be 1000–60000 (got %d)", s.RefreshInterval))
	}
	if s.MessagesPerPage < 25 || s.MessagesPerPage > 500 {
		errs = append(errs, fmt.Sprintf("messagesPerPage must be 25–500 (got %d)", s.MessagesPerPage))
	}
	if s.RecentThreshold < 60000 || s.RecentThreshold > 3600000 {
		errs = append(errs, fmt.Sprintf("recentThreshold must be 60000–3600000 (got %d)", s.RecentThreshold))
	}

	if len(errs) > 0 {
		return fmt.Errorf("invalid settings: %s", strings.Join(errs, "; "))
	}
	return nil
}

// MergeJSON applies only the fields present in partialJSON onto base.
// Fields not included in the JSON are left unchanged.
func MergeJSON(base Settings, partialJSON []byte) (Settings, error) {
	// Marshal base to JSON, then unmarshal into a map.
	baseRaw, err := json.Marshal(base)
	if err != nil {
		return base, err
	}

	var merged map[string]json.RawMessage
	if err := json.Unmarshal(baseRaw, &merged); err != nil {
		return base, err
	}

	// Unmarshal partial into a map — only keys present in the JSON appear.
	var partial map[string]json.RawMessage
	if err := json.Unmarshal(partialJSON, &partial); err != nil {
		return base, fmt.Errorf("invalid JSON: %w", err)
	}

	// Overlay partial keys onto base.
	for k, v := range partial {
		merged[k] = v
	}

	// Re-marshal the merged map and decode into Settings.
	mergedRaw, err := json.Marshal(merged)
	if err != nil {
		return base, err
	}

	var result Settings
	if err := json.Unmarshal(mergedRaw, &result); err != nil {
		return base, err
	}

	if result.CustomModelPricing == nil {
		result.CustomModelPricing = map[string]ModelPricing{}
	}

	return result, nil
}
