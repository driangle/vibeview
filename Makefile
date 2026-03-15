.PHONY: check install install-dev install-dev-full

check: ## Run Go vet + build check
	cd apps/cli && go vet ./... && go build ./cmd/vibeview

install: ## Build and install the CLI binary
	cd apps/cli && go install ./cmd/vibeview

install-dev: ## Install CLI in dev mode (same as install for now)
	cd apps/cli && go install ./cmd/vibeview

install-dev-full: ## Install CLI + web dependencies
	cd apps/cli && go install ./cmd/vibeview
	cd apps/web && npm install
