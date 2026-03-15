.PHONY: check install install-dev install-dev-full build web dev

dev: ## Run CLI + Vite dev server with hot reload
	@trap 'kill 0' EXIT; \
	cd apps/cli && go run ./cmd/vibeview & \
	cd apps/web && npm run dev & \
	wait

web: ## Build the React SPA
	cd apps/web && npm run build

build: web ## Build the single binary with embedded SPA
	rm -rf apps/cli/internal/spa/dist
	cp -r apps/web/dist apps/cli/internal/spa/dist
	cd apps/cli && go build -o vibeview ./cmd/vibeview

check: ## Run Go vet + build check
	cd apps/cli && go vet ./... && go build ./cmd/vibeview

install: web ## Build and install the CLI binary
	rm -rf apps/cli/internal/spa/dist
	cp -r apps/web/dist apps/cli/internal/spa/dist
	cd apps/cli && go install ./cmd/vibeview

install-dev: ## Install CLI in dev mode (same as install for now)
	cd apps/cli && go install ./cmd/vibeview

install-dev-full: ## Install CLI + web dependencies
	cd apps/cli && go install ./cmd/vibeview
	cd apps/web && npm install
