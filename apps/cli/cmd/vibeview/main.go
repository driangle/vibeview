package main

import (
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"

	"github.com/driangle/vibeview/internal/server"
	"github.com/driangle/vibeview/internal/session"
)

func main() {
	home, err := os.UserHomeDir()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	port := flag.Int("port", 1337, "port to listen on")
	claudeDir := flag.String("claude-dir", filepath.Join(home, ".claude"), "path to claude data directory")
	open := flag.Bool("open", true, "open browser on startup")
	flag.Parse()

	paths := flag.Args()

	cfg := server.Config{
		ClaudeDir: *claudeDir,
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
