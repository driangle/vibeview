package features

import "testing"

func TestCostUIEnabled(t *testing.T) {
	cases := []struct {
		value string
		want  bool
	}{
		{"", false},  // unset → off by default
		{"0", false}, //
		{"false", false},
		{"1", true},
		{"t", true},
		{"true", true},
		{"TRUE", true},
		{"nonsense", false}, // unparseable → off, never an error
	}
	for _, c := range cases {
		t.Setenv(CostEnvVar, c.value)
		if got := CostUIEnabled(); got != c.want {
			t.Errorf("CostUIEnabled() with %s=%q = %v, want %v", CostEnvVar, c.value, got, c.want)
		}
	}
}
