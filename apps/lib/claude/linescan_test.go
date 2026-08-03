package claude

import (
	"strings"
	"testing"
)

// bigString returns a string of n bytes, used to build oversized lines.
func bigString(n int) string {
	return strings.Repeat("x", n)
}

func TestLineScannerNormalLines(t *testing.T) {
	// Includes a blank line and a final line without a trailing newline.
	input := "a\n\nbc\ndef"
	s := NewLineScanner(strings.NewReader(input), DefaultMaxLineBytes)

	var got []string
	for s.Scan() {
		if s.Oversized() {
			t.Fatalf("unexpected oversized line: %q", s.Bytes())
		}
		got = append(got, string(s.Bytes()))
	}
	if err := s.Err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	want := []string{"a", "", "bc", "def"}
	if len(got) != len(want) {
		t.Fatalf("got %d lines %q, want %d %q", len(got), got, len(want), want)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Errorf("line %d = %q, want %q", i, got[i], want[i])
		}
	}
}

func TestLineScannerConsumedTracksNewlines(t *testing.T) {
	input := "ab\ncde\n"
	s := NewLineScanner(strings.NewReader(input), DefaultMaxLineBytes)

	var total int64
	for s.Scan() {
		total += s.Consumed()
	}
	if err := s.Err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if total != int64(len(input)) {
		t.Errorf("total consumed = %d, want %d", total, len(input))
	}
}

// TestLineScannerTooLong verifies that an over-limit line is skipped and flagged
// rather than aborting the scan, and that the lines around it still parse.
func TestLineScannerTooLong(t *testing.T) {
	const maxBytes = 1024
	big := bigString(maxBytes * 3) // well over the limit
	input := "before\n" + big + "\nafter\n"
	s := NewLineScanner(strings.NewReader(input), maxBytes)

	var normal []string
	oversizedCount := 0
	var total int64
	for s.Scan() {
		total += s.Consumed()
		if s.Oversized() {
			oversizedCount++
			if s.Bytes() != nil {
				t.Errorf("oversized line should have nil Bytes, got %d bytes", len(s.Bytes()))
			}
			if s.OversizedBytes() != int64(len(big)) {
				t.Errorf("OversizedBytes = %d, want %d", s.OversizedBytes(), len(big))
			}
			continue
		}
		normal = append(normal, string(s.Bytes()))
	}
	if err := s.Err(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if oversizedCount != 1 {
		t.Errorf("oversizedCount = %d, want 1", oversizedCount)
	}
	want := []string{"before", "after"}
	if len(normal) != len(want) || normal[0] != want[0] || normal[1] != want[1] {
		t.Errorf("normal lines = %q, want %q", normal, want)
	}
	// The whole input must be consumed so a caller tracking a file offset can
	// advance past the oversized line rather than re-scanning it.
	if total != int64(len(input)) {
		t.Errorf("total consumed = %d, want %d", total, len(input))
	}
}

// TestParseSessionFileTooLong verifies a >2 MB line does not render the whole
// session unparseable: the surrounding messages still parse and the oversized
// line is surfaced via SkippedLines/OversizedLines.
func TestParseSessionFileTooLong(t *testing.T) {
	oversized := `{"type":"user","big":"` + bigString(DefaultMaxLineBytes+1) + `"}`
	input := strings.Join([]string{
		`{"type":"user","uuid":"u1","sessionId":"s1","timestamp":1,"message":{"role":"user","content":[{"type":"text","text":"hi"}]}}`,
		oversized,
		`{"type":"assistant","uuid":"a1","sessionId":"s1","timestamp":2,"message":{"role":"assistant","content":[{"type":"text","text":"hello"}]}}`,
	}, "\n")

	messages, result, err := ParseSessionFile(strings.NewReader(input))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(messages) != 2 {
		t.Fatalf("got %d messages, want 2 (surrounding messages should still render)", len(messages))
	}
	if messages[0].UUID != "u1" || messages[1].UUID != "a1" {
		t.Errorf("messages = [%s, %s], want [u1, a1]", messages[0].UUID, messages[1].UUID)
	}
	if result.OversizedLines != 1 {
		t.Errorf("OversizedLines = %d, want 1", result.OversizedLines)
	}
	if result.SkippedLines != 1 {
		t.Errorf("SkippedLines = %d, want 1", result.SkippedLines)
	}
}

func TestParseHistoryFileTooLong(t *testing.T) {
	oversized := `{"sessionId":"big","big":"` + bigString(DefaultMaxLineBytes+1) + `"}`
	input := strings.Join([]string{
		`{"sessionId":"s1","project":"/a","display":"task 1","timestamp":1}`,
		oversized,
		`{"sessionId":"s2","project":"/b","display":"task 2","timestamp":2}`,
	}, "\n")

	entries, result, err := ParseHistoryFile(strings.NewReader(input))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("got %d entries, want 2", len(entries))
	}
	if entries[0].SessionID != "s1" || entries[1].SessionID != "s2" {
		t.Errorf("entries = [%s, %s], want [s1, s2]", entries[0].SessionID, entries[1].SessionID)
	}
	if result.OversizedLines != 1 {
		t.Errorf("OversizedLines = %d, want 1", result.OversizedLines)
	}
	if result.SkippedLines != 1 {
		t.Errorf("SkippedLines = %d, want 1", result.SkippedLines)
	}
}
