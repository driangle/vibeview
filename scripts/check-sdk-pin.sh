#!/usr/bin/env bash
#
# Check whether apps/lib has changed since its last released tag.
#
# Why this exists
# ---------------
# apps/lib is a separate Go module (github.com/driangle/vibeview/apps/lib),
# released under its own apps/lib/vX.Y.Z tags. Downstream consumers — skival, and
# anyone else embedding sessionhtml — install it with `go get`, which resolves
# tags, not branches. Unreleased SDK changes on main are invisible to them.
#
# apps/cli builds against ../lib through a replace directive, so nothing in this
# repo notices a stale tag. Only outside consumers do, which is exactly why it
# needs a machine to watch it.
#
# Modes
# -----
#   --staged  (pre-commit) Reports, never blocks. The commit introducing an SDK
#             change cannot reference its own tag.
#
#   --strict  (CI on main) Exits 1 when apps/lib has moved since its last tag.
#             CI heals this by cutting the next tag; see auto-release-sdk.sh.
#
# Exit codes: 0 released tag is current (or check skipped), 1 release is due.

set -euo pipefail

MODE="${1:---staged}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
SDK_DIR="apps/lib"
SDK_MODULE="github.com/driangle/vibeview/apps/lib"
CLI_GO_MOD="$REPO_ROOT/apps/cli/go.mod"

LAST_TAG="$(git -C "$REPO_ROOT" tag -l "$SDK_DIR/v*" --sort=-v:refname | head -n 1)"

if [[ -z "$LAST_TAG" ]]; then
    echo "check-sdk-pin: no $SDK_DIR/v* tag yet, skipping"
    exit 0
fi

if ! git -C "$REPO_ROOT" rev-parse --verify --quiet "${LAST_TAG}^{commit}" >/dev/null 2>&1; then
    # Shallow clone: the tag exists on the remote but its commit is not here.
    echo "check-sdk-pin: $LAST_TAG not available locally (shallow clone?), skipping"
    exit 0
fi

if git -C "$REPO_ROOT" diff --quiet "$LAST_TAG" HEAD -- "$SDK_DIR"; then
    RELEASED_DRIFT=0
else
    RELEASED_DRIFT=1
fi

# Is the SDK part of what is being committed right now?
STAGED_SDK=0
if [[ "$MODE" == "--staged" ]] &&
    git -C "$REPO_ROOT" diff --cached --name-only | grep -q "^$SDK_DIR/"; then
    STAGED_SDK=1
fi

if [[ "$RELEASED_DRIFT" -eq 0 && "$STAGED_SDK" -eq 0 ]]; then
    exit 0
fi

if [[ "$MODE" != "--strict" ]]; then
    echo "check-sdk-pin: NOTE — $SDK_DIR has changed since $LAST_TAG."
    echo
    echo "  Consumers install the SDK by tag, so the change reaches them only once"
    echo "  a new one is cut. Landing this on main is enough: CI tags the next"
    echo "  version and repoints apps/cli/go.mod for you."
    echo
    echo "  Breaking API change? Say so in the commit message, or it ships as a patch:"
    echo
    echo "      sdk-bump: minor"
    echo
    echo "  To release by hand instead, from a clean tree:"
    echo
    echo "      make release-sdk VERSION=<x.y.z>"
    exit 0
fi

echo "check-sdk-pin: FAIL — $SDK_DIR has changed since $LAST_TAG and is unreleased."
echo
git -C "$REPO_ROOT" diff --stat "$LAST_TAG" HEAD -- "$SDK_DIR" | sed 's/^/      /'
echo
echo "  Consumers resolve $SDK_MODULE by tag:"
echo "      go get $SDK_MODULE@latest   # would not include the above"
echo
echo "  Cut the next version from a clean tree:"
echo
echo "      make release-sdk VERSION=<x.y.z>"

# The pin is hygiene rather than a build input (apps/cli replaces the module with
# ../lib), so it is reported alongside rather than failing separately.
PINNED="$(awk -v mod="$SDK_MODULE" '$1 == mod { print $2; exit }' "$CLI_GO_MOD" 2>/dev/null || true)"
if [[ -n "$PINNED" && "$PINNED" != "${LAST_TAG#$SDK_DIR/}" ]]; then
    echo
    echo "  (apps/cli/go.mod pins $PINNED; latest tag is ${LAST_TAG#$SDK_DIR/})"
fi

exit 1
