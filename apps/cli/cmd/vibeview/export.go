package main

import (
	"fmt"
	"os"

	"github.com/driangle/vibeview/apps/lib/logutil"
	"github.com/driangle/vibeview/apps/lib/sessionhtml"
	"github.com/driangle/vibeview/internal/features"
	"github.com/spf13/cobra"
)

// formatHTML is the only format implemented today. The flag exists so other
// formats (md, pdf) can be added without changing the command's shape.
const formatHTML = "html"

// exportCmd wraps the sessionhtml SDK. Go programs can import that package
// directly instead of shelling out to this command.
func exportCmd(claudeDir *string, logLevel *string) *cobra.Command {
	var format string
	var out string

	cmd := &cobra.Command{
		Use:   "export <session-id | session-file>",
		Short: "Export a session as a self-contained HTML page",
		Long: `Render one session to a standalone HTML file.

The page contains the session and the viewer that renders it — no server, no
network requests — so it opens from disk and can be attached to a report or
archived alongside other artifacts.

Input can be a session ID (full or prefix match) or a .jsonl file path.
Writes to stdout unless --out is given.

Conversation search is omitted from exported pages (it needs a running server),
and code blocks in less common languages render unhighlighted.

Go programs can render the same page without this binary by importing
github.com/driangle/vibeview/apps/lib/sessionhtml.

Examples:
  vibeview export 877fff1e --out session.html
  vibeview export 877fff1e-80c9-4d20-a600-f278eb2c7bdc --format html --out page.html
  vibeview export session.jsonl > page.html`,
		Args: cobra.ExactArgs(1),
		RunE: func(cmd *cobra.Command, args []string) error {
			logutil.SetLevel(logutil.ParseLevel(*logLevel))
			cmd.SilenceUsage = true

			if format != formatHTML {
				return fmt.Errorf("unsupported format %q (supported: %s)", format, formatHTML)
			}

			page, err := sessionhtml.Render(sessionhtml.Request{
				Session:     args[0],
				ClaudeDir:   *claudeDir,
				CostEnabled: features.CostUIEnabled(),
			})
			if err != nil {
				return err
			}

			return writeOutput(out, page)
		},
	}

	cmd.Flags().StringVar(&format, "format", formatHTML, "output format: html")
	cmd.Flags().StringVar(&out, "out", "-", "output file, or - for stdout")

	return cmd
}

func writeOutput(out string, content []byte) error {
	if out == "-" {
		_, err := os.Stdout.Write(content)
		return err
	}
	if err := os.WriteFile(out, content, 0o644); err != nil {
		return fmt.Errorf("writing %s: %w", out, err)
	}
	return nil
}
