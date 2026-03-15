// Package spa serves the embedded React SPA.
package spa

import (
	"embed"
	"io/fs"
	"net/http"
	"strings"
)

//go:embed dist/*
var distFS embed.FS

// Handler returns an http.Handler that serves the embedded SPA files.
// Non-asset, non-API paths fall back to index.html for client-side routing.
func Handler() http.Handler {
	dist, _ := fs.Sub(distFS, "dist")
	fileServer := http.FileServer(http.FS(dist))

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path := strings.TrimPrefix(r.URL.Path, "/")

		// Try to serve the file directly (assets, favicon, etc.)
		if path != "" {
			if f, err := dist.Open(path); err == nil {
				f.Close()
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Fall back to index.html for SPA client-side routing.
		r.URL.Path = "/"
		fileServer.ServeHTTP(w, r)
	})
}
