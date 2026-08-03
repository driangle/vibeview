package pidcheck

import (
	"os"
	"testing"
)

func TestAncestorPIDs_CurrentProcess(t *testing.T) {
	pids := AncestorPIDs(os.Getpid())
	if len(pids) == 0 {
		t.Fatal("expected at least one ancestor PID")
	}
	if pids[0] != os.Getpid() {
		t.Errorf("expected first PID to be current process (%d), got %d", os.Getpid(), pids[0])
	}
}

func TestAncestorPIDs_IncludesParent(t *testing.T) {
	parent, err := getParentPID(os.Getpid())
	if err != nil {
		t.Skipf("process table unavailable in test environment: %v", err)
	}
	pids := AncestorPIDs(os.Getpid())
	// In containers and process sandboxes the test process may be parented
	// directly by PID 1, which is the walk's documented stopping point.
	if os.Getppid() <= 1 {
		if len(pids) != 1 {
			t.Fatalf("expected only self when parent is init, got %v", pids)
		}
		return
	}
	if len(pids) < 2 {
		t.Fatal("expected at least two PIDs (self + parent)")
	}
	if pids[1] != parent {
		t.Errorf("expected second PID to be parent (%d), got %d", parent, pids[1])
	}
}

func TestAncestorPIDs_InvalidPID(t *testing.T) {
	pids := AncestorPIDs(999999999)
	// Invalid PID: should return just the starting PID since getParentPID will fail
	if len(pids) != 1 {
		t.Errorf("expected 1 PID for invalid process, got %d: %v", len(pids), pids)
	}
}

func TestAncestorPIDs_NoCycle(t *testing.T) {
	pids := AncestorPIDs(os.Getpid())
	seen := make(map[int]bool)
	for _, pid := range pids {
		if seen[pid] {
			t.Fatalf("cycle detected: PID %d appears twice", pid)
		}
		seen[pid] = true
	}
}
