package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"time"

	"github.com/driangle/vibeview/internal/logutil"
	"github.com/driangle/vibeview/internal/server"
	"github.com/driangle/vibeview/internal/session"
)

var version = "dev"

func main() {
	versionFlag := flag.Bool("version", false, "print version and exit")

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

	if *versionFlag {
		fmt.Printf("vibeview %s\n", version)
		return
	}

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

	settingsPath := filepath.Join(home, ".config", "vibeview", "settings.json")

	cfg := server.Config{
		ClaudeDir:    *claudeDir,
		Dirs:         dirs,
		SettingsPath: settingsPath,
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
		fmt.Printf("vibeview %s (standalone)\n", version)
		fmt.Printf("  port:   %d\n", *port)
		fmt.Printf("  files:  %v\n", paths)
	} else {
		fmt.Printf("vibeview %s\n", version)
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

	// Shut down cleanly on SIGINT/SIGTERM so the port is released.
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigCh
		ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		srv.Shutdown(ctx)
	}()

	if err := srv.ListenAndServe(*port); err != nil && err.Error() != "http: Server closed" {
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
