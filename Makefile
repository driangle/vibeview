.PHONY: check check-lite install install-dev install-dev-full build web web-export dev docs docs-dev docs-preview lint setup-hooks release-sdk check-sdk verify-sdk

# ldflags for injecting git info into dev builds
DEV_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo unknown)
DEV_DIRTY  := $(shell git diff --quiet 2>/dev/null && echo false || echo true)
DEV_DATE   := $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
DEV_LDFLAGS := -X 'main.GitCommit=$(DEV_COMMIT)' \
               -X 'main.GitDirty=$(DEV_DIRTY)' \
               -X 'main.BuildDate=$(DEV_DATE)'

dev: ## Run CLI + Vite dev server with hot reload
	@trap 'kill 0' EXIT; \
	cd apps/cli && go run ./cmd/vibeview web --open=false $(if $(LAN),--lan) & \
	cd apps/web && npm run dev -- --open $(if $(LAN),--host 0.0.0.0) & \
	wait

web: ## Build the React SPA
	cd apps/web && npm run build

web-export: ## Build the static export page template
	cd apps/web && npm run build:export
	cp apps/web/dist-export/export.html apps/lib/sessionhtml/template.html

build: web web-export ## Build the single binary with embedded SPA
	rm -rf apps/cli/internal/spa/dist
	cp -r apps/web/dist apps/cli/internal/spa/dist
	cd apps/cli && go build -ldflags "$(DEV_LDFLAGS)" -o vibeview ./cmd/vibeview

test: ## Run Go tests with coverage
	cd apps/cli && go test ./... -coverprofile=coverage.out -count=1
	@cd apps/cli && go tool cover -func=coverage.out | tail -1
	@echo "Coverage report: apps/cli/coverage.out (use 'go tool cover -html=coverage.out' to view)"
	cd apps/lib && go test ./... -count=1

check-lite: lint ## Compile + lint across all projects (no tests)
	cd apps/cli && go build ./cmd/vibeview
	cd apps/web && npm run typeCheck

check: check-lite ## Full validation: check-lite + tests, docs build
	cd apps/cli && go test ./... -coverprofile=coverage.out -count=1
	@cd apps/cli && go tool cover -func=coverage.out | tail -1
	cd apps/lib && go test ./... -count=1
	cd apps/web && npm test --if-present
	cd apps/docs && npm run build

install: web web-export ## Build and install the CLI binary
	rm -rf apps/cli/internal/spa/dist
	cp -r apps/web/dist apps/cli/internal/spa/dist
	cd apps/cli && go install -ldflags "$(DEV_LDFLAGS)" ./cmd/vibeview

install-dev: ## Install CLI in dev mode as vibeview-dev
	cd apps/cli && go build -ldflags "$(DEV_LDFLAGS)" -o "$$(go env GOPATH)/bin/vibeview-dev" ./cmd/vibeview

install-dev-full: web web-export ## Rebuild web SPA and install CLI as vibeview-dev
	rm -rf apps/cli/internal/spa/dist
	cp -r apps/web/dist apps/cli/internal/spa/dist
	cd apps/cli && go build -ldflags "$(DEV_LDFLAGS)" -o "$$(go env GOPATH)/bin/vibeview-dev" ./cmd/vibeview

docs-dev: ## Start VitePress dev server
	cd apps/docs && npm run dev

docs: ## Build documentation site
	cd apps/docs && npm run build

docs-preview: ## Preview built documentation site
	cd apps/docs && npm run preview

lint: ## Run linters for Go and Web
	cd apps/cli && go vet ./...
	cd apps/cli && golangci-lint run ./...
	cd apps/web && npm run lint

release-sdk: ## Tag and release the apps/lib Go module (VERSION=x.y.z)
	@test -n "$(VERSION)" || (echo "usage: make release-sdk VERSION=x.y.z" && exit 1)
	./scripts/release-sdk.sh $(VERSION)

check-sdk: ## Report whether apps/lib has unreleased changes
	./scripts/check-sdk-pin.sh --strict

verify-sdk: ## Check the latest apps/lib tag resolves through the module proxy
	./scripts/verify-sdk-release.sh

setup-hooks: ## Configure git to use .githooks/ for hooks
	git config core.hooksPath .githooks
