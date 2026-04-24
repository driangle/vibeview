package pidcheck

import (
	"os/exec"
	"strconv"
	"strings"
)

// AncestorPIDs returns the chain of ancestor PIDs starting from startPID,
// walking up via parent PID until reaching PID 0 or 1 (init).
// The startPID itself is included as the first element.
func AncestorPIDs(startPID int) []int {
	var pids []int
	pid := startPID
	seen := make(map[int]bool)

	for pid > 1 && !seen[pid] {
		seen[pid] = true
		pids = append(pids, pid)
		ppid, err := getParentPID(pid)
		if err != nil || ppid <= 0 {
			break
		}
		pid = ppid
	}
	return pids
}

// getParentPID returns the parent PID of the given process.
// Uses `ps` which works on both macOS and Linux.
func getParentPID(pid int) (int, error) {
	out, err := exec.Command("ps", "-o", "ppid=", "-p", strconv.Itoa(pid)).Output()
	if err != nil {
		return 0, err
	}
	return strconv.Atoi(strings.TrimSpace(string(out)))
}
