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
	pids := AncestorPIDs(os.Getpid())
	if len(pids) < 2 {
		t.Fatal("expected at least two PIDs (self + parent)")
	}
	if pids[1] != os.Getppid() {
		t.Errorf("expected second PID to be parent (%d), got %d", os.Getppid(), pids[1])
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
