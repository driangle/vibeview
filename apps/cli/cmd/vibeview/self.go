package main

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/pidcheck"
	"github.com/spf13/cobra"
)

type selfReport struct {
	SessionID string `json:"session_id"`
}

func selfCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var jsonOutput bool

	cmd := &cobra.Command{
		Use:   "self",
		Short: "Discover the current Claude Code session",
		Long: `Determine which Claude Code session launched this process by walking
up the process tree and matching against active PID files.

Useful when running vibeview from within a Claude Code tool-use context
to inspect the current session.

Examples:
  vibeview self
  vibeview self --json`,
		Args: cobra.NoArgs,
		Run: func(cmd *cobra.Command, args []string) {
			logutil.SetLevel(logutil.ParseLevel(*logLevel))

			ppid := os.Getppid()
			ancestors := pidcheck.AncestorPIDs(ppid)
			logutil.Debugf("self: ancestor PIDs from %d: %v", ppid, ancestors)

			var sessionID string
			for _, pid := range ancestors {
				id, err := pidcheck.FindSessionByPID(*claudeDir, pid)
				if err == nil {
					sessionID = id
					break
				}
			}

			if sessionID == "" {
				fmt.Fprintln(os.Stderr, "error: no active Claude Code session found for this process tree")
				os.Exit(1)
			}

			if jsonOutput {
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				_ = enc.Encode(selfReport{SessionID: sessionID})
				return
			}

			fmt.Printf("%s  %s\n\n", bold("Session:"), sessionID)
			fmt.Println(dim("Commands:"))
			fmt.Printf("  vibeview inspect %s\n", sessionID)
			fmt.Printf("  vibeview show %s\n", sessionID)
			fmt.Println("  vibeview sessions")
		},
	}

	cmd.Flags().BoolVar(&jsonOutput, "json", false, "output as JSON")

	return cmd
}
