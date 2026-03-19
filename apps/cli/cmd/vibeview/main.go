package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/server"
	"github.com/driangle/vibeview/internal/session"
)

func main() {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	port := flag.Int("port", 4880, "port to listen on")
	claudeDir := flag.String("claude-dir", filepath.Join(home, ".claude"), "path to claude data directory")
	open := flag.Bool("open", true, "open browser on startup")
	dirsFlag := flag.String("dirs", "", "comma-separated project directory names to filter (under ~/.claude/projects/)")
	logLevel := flag.String("log-level", "warn", "log level: debug, warn, error")
	flag.Parse()

	logutil.SetLevel(logutil.ParseLevel(*logLevel))

	paths := flag.Args()

	var dirs []string
	if *dirsFlag != "" {
		for _, d := range strings.Split(*dirsFlag, ",") {
			if trimmed := strings.TrimSpace(d); trimmed != "" {
				dirs = append(dirs, trimmed)
			}
		}
	}

	cfg := server.Config{
		ClaudeDir: *claudeDir,
		Dirs:      dirs,
	}

	if len(paths) > 0 {
		idx, err := session.LoadFromPaths(paths)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error: %v\n", err)
			os.Exit(1)
		}
		cfg.Index = idx
		cfg.Standalone = true
		cfg.Paths = paths
		fmt.Printf("vibeview (standalone)\n")
		fmt.Printf("  port:   %d\n", *port)
		fmt.Printf("  files:  %v\n", paths)
	} else {
		fmt.Printf("vibeview\n")
		fmt.Printf("  port:      %d\n", *port)
		fmt.Printf("  claude-dir: %s\n", *claudeDir)
		fmt.Printf("  open:      %t\n", *open)
		if len(dirs) > 0 {
			fmt.Printf("  dirs:      %s\n", strings.Join(dirs, ", "))
		}
	}

	srv, err := server.New(cfg)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	url := fmt.Sprintf("http://localhost:%d", *port)
	fmt.Printf("listening on %s\n", url)

	if *open {
		go openBrowser(url)
	}

	if err := srv.ListenAndServe(*port); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}

func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "darwin":
		cmd = exec.Command("open", url)
	case "linux":
		cmd = exec.Command("xdg-open", url)
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	default:
		return
	}
	cmd.Run()
}
