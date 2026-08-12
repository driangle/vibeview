#!/usr/bin/env bash
#
# Verify that the latest apps/lib tag is fetchable and importable the way a
# consumer gets it: through the module proxy, with no replace directive and no
# checkout of this repo.
#
# A tag that pushes fine but does not resolve (wrong tag prefix, module path
# mismatch, a package that only compiles inside the workspace) fails silently
# until a consumer hits it. This closes that gap while the release is fresh —
# though the version is already immutable by then, so a failure means fixing
# forward, not retagging.
#
# Usage: ./scripts/verify-sdk-release.sh [version]   (default: latest tag)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SDK_DIR="apps/lib"
SDK_MODULE="github.com/driangle/vibeview/apps/lib"

cd "$PROJECT_ROOT"

VERSION="${1:-}"
if [[ -z "$VERSION" ]]; then
    LAST_TAG="$(git tag -l "$SDK_DIR/v*" --sort=-v:refname | head -n 1)"
    if [[ -z "$LAST_TAG" ]]; then
        echo "verify-sdk-release: no $SDK_DIR/v* tag to verify, skipping"
        exit 0
    fi
    VERSION="${LAST_TAG#$SDK_DIR/}"
fi

echo "verify-sdk-release: checking $SDK_MODULE@$VERSION resolves"

WORK_DIR="$(mktemp -d)"
trap 'rm -rf "$WORK_DIR"' EXIT

cd "$WORK_DIR"
go mod init sdkcheck >/dev/null

cat > main.go << 'EOF'
package main

import (
	"fmt"

	"github.com/driangle/vibeview/apps/lib/sessionhtml"
)

func main() {
	// Compiling against the exported surface is the point; rendering needs a
	// session on disk, which a fresh checkout does not have.
	_, err := sessionhtml.RenderSessionHTML(sessionhtml.Request{Session: "does-not-exist"})
	fmt.Println("sdk reachable, render returned:", err != nil)
}
EOF

# The proxy fetches on demand and can lag a few seconds behind the push.
for attempt in 1 2 3 4 5; do
    if GOFLAGS=-mod=mod GOPROXY=https://proxy.golang.org,direct \
        go get "$SDK_MODULE@$VERSION" >/dev/null 2>&1; then
        break
    fi
    if [[ "$attempt" == 5 ]]; then
        echo "verify-sdk-release: FAIL — $SDK_MODULE@$VERSION did not resolve"
        GOFLAGS=-mod=mod GOPROXY=https://proxy.golang.org,direct go get "$SDK_MODULE@$VERSION"
        exit 1
    fi
    echo "  proxy not ready yet (attempt $attempt), retrying..."
    sleep 10
done

go build ./... || {
    echo "verify-sdk-release: FAIL — $SDK_MODULE@$VERSION does not compile for consumers"
    exit 1
}

echo "verify-sdk-release: OK — $SDK_MODULE@$VERSION resolves and compiles"
