#!/usr/bin/env bash
set -euo pipefail

# Only run for files under apps/web
file_path=$(jq -r '.tool_response.filePath // .tool_input.file_path')
case "$file_path" in
  */apps/web/*) ;;
  *) exit 0 ;;
esac

cd "$(dirname "$0")/../../apps/web"
npm run typeCheck 2>&1
npm run lint 2>&1
