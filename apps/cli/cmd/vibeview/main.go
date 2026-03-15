package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	"github.com/driangle/vibeview/internal/server"
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

	fmt.Printf("vibeview\n")
	fmt.Printf("  port:      %d\n", *port)
	fmt.Printf("  claude-dir: %s\n", *claudeDir)
	fmt.Printf("  open:      %t\n", *open)

	_ = *open // TODO: wire up browser open

	srv, err := server.New(*claudeDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("listening on http://localhost:%d\n", *port)
	if err := srv.ListenAndServe(*port); err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
}
