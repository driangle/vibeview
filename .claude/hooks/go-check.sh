#!/usr/bin/env bash
set -euo pipefail

# Only run for .go files
file_path=$(jq -r '.tool_response.filePath // .tool_input.file_path')
case "$file_path" in
  *.go) ;;
  *) exit 0 ;;
esac

cd "$(dirname "$0")/../../apps/cli"
go vet ./... 2>&1
go build ./... 2>&1
