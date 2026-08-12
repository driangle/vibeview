#!/usr/bin/env bash
#
# Release the apps/lib Go module: tag it, push the tag, and repoint the CLI's pin.
#
# Why this is a script and not three commands
# ------------------------------------------
# The ordering matters and is easy to get backwards. `go get` resolves versions
# through the module proxy, which fetches from the remote — so the tag has to be
# pushed before apps/cli/go.mod can reference it. Pushing a tag also pushes the
# commits it points at, so this works from a branch that has not been pushed yet.
# Get the order wrong and `go get` fails with an unhelpful "unknown revision".
#
# Module versions are immutable once the proxy has seen them. There is no
# retagging: a mistake ships as the next patch.
#
# Usage:
#   ./scripts/release-sdk.sh 0.2.1             # tag apps/lib/v0.2.1, push, repin
#   ./scripts/release-sdk.sh 0.2.1 --dry-run   # show what would happen
#
# Pre-1.0 versioning: a breaking API change is a MINOR bump (v0.2.0 -> v0.3.0);
# additive or fix-only changes are a PATCH bump (v0.2.0 -> v0.2.1).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SDK_DIR="apps/lib"
SDK_MODULE="github.com/driangle/vibeview/apps/lib"

DRY_RUN=false
VERSION=""

log_info()    { echo -e "${BLUE}==>${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warning() { echo -e "${YELLOW}!${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1" >&2; }
error_exit()  { log_error "$1"; exit 1; }

usage() {
    cat << EOF
Usage: $(basename "$0") VERSION [--dry-run]

Tag apps/lib as apps/lib/vVERSION, push the tag, repoint apps/cli/go.mod at it,
and commit the pin bump.

ARGUMENTS:
    VERSION     SDK version, with or without a leading 'v' (e.g. 0.2.1)

OPTIONS:
    --dry-run   Print the steps without tagging, pushing, or committing
    -h, --help  Show this help

Pre-1.0: breaking API change = minor bump, additive/fix = patch bump.
Versions are immutable once pushed — pick the next number, never retag.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=true; shift ;;
        -h|--help) usage; exit 0 ;;
        -*) error_exit "Unknown option: $1" ;;
        *)
            [[ -n "$VERSION" ]] && error_exit "Unexpected argument: $1"
            VERSION="$1"; shift ;;
    esac
done

[[ -z "$VERSION" ]] && { usage; exit 1; }

cd "$PROJECT_ROOT"

CLEAN_VERSION="${VERSION#v}"
if ! [[ "$CLEAN_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$ ]]; then
    error_exit "Invalid version: $VERSION (expected semver, e.g. 0.2.1)"
fi
SDK_TAG="$SDK_DIR/v$CLEAN_VERSION"

# --- Preflight -------------------------------------------------------------

# A dirty tree would let the tag point at a commit that does not contain the
# change being released, or sweep unrelated edits into the pin-bump commit.
if [[ -n "$(git status --porcelain)" ]]; then
    error_exit "Working tree is not clean. Commit or stash your changes first."
fi

if git rev-parse --verify --quiet "refs/tags/$SDK_TAG" >/dev/null; then
    error_exit "Tag $SDK_TAG already exists. Versions are immutable; pick a new one."
fi

LAST_TAG="$(git tag -l "$SDK_DIR/v*" --sort=-v:refname | head -n 1)"
if [[ -n "$LAST_TAG" ]] && git diff --quiet "$LAST_TAG" HEAD -- "$SDK_DIR"; then
    log_warning "$SDK_DIR is unchanged since $LAST_TAG — there is nothing to release."
    exit 0
fi

log_info "Releasing $SDK_DIR as $SDK_TAG (previous: ${LAST_TAG:-none})"
git diff --stat "${LAST_TAG:-HEAD}" HEAD -- "$SDK_DIR" | tail -n 5

# The tag is what consumers compile, so it must at least build and pass its tests.
log_info "Testing $SDK_DIR"
(cd "$SDK_DIR" && go build ./... && go test ./...) >/dev/null ||
    error_exit "$SDK_DIR does not build or its tests fail — not releasing."
log_success "$SDK_DIR is green"

if [[ "$DRY_RUN" == "true" ]]; then
    echo
    log_info "[dry-run] would run:"
    echo "    git tag -a $SDK_TAG -m 'apps/lib v$CLEAN_VERSION'"
    echo "    git push origin $SDK_TAG"
    echo "    (cd apps/cli && go mod edit -require=$SDK_MODULE@v$CLEAN_VERSION)"
    echo "    git commit apps/cli/go.mod -m 'chore(sdk): pin apps/lib v$CLEAN_VERSION'"
    exit 0
fi

# --- Tag and push ----------------------------------------------------------

log_info "Tagging $SDK_TAG"
git tag -a "$SDK_TAG" -m "apps/lib v$CLEAN_VERSION

Release of the shared Go module ($SDK_MODULE)."
log_success "Created tag $SDK_TAG"

log_info "Pushing $SDK_TAG"
if ! git push origin "$SDK_TAG"; then
    git tag -d "$SDK_TAG" >/dev/null
    error_exit "Failed to push $SDK_TAG (local tag removed, nothing else changed)."
fi
log_success "Pushed tag $SDK_TAG"

# --- Repoint the pin -------------------------------------------------------

# apps/cli replaces the module with ../lib, so this pin never affects a build
# here. It is the version the repo claims to ship against, and what the docs
# quote — worth keeping honest. `go mod edit` rather than `go get` because the
# replace directive means there is nothing to resolve or download.
log_info "Pinning apps/cli/go.mod to $SDK_MODULE@v$CLEAN_VERSION"
(cd apps/cli && go mod edit -require="$SDK_MODULE@v$CLEAN_VERSION")

if ! (cd apps/cli && go build ./... >/dev/null); then
    log_error "apps/cli does not build after the pin bump."
    log_error "The tag is already pushed and cannot be retagged; fix forward."
    exit 1
fi
log_success "Pin updated, apps/cli builds"

# --- Commit ----------------------------------------------------------------

if [[ -z "$(git status --porcelain apps/cli/go.mod)" ]]; then
    log_success "Pin was already up to date, nothing to commit"
    exit 0
fi

git commit -q apps/cli/go.mod -m "chore(sdk): pin apps/lib v$CLEAN_VERSION

Points apps/cli at $SDK_TAG, the version this repo ships against."
log_success "Committed the pin bump"

echo
log_success "Done. Push the branch to land the pin:  git push"
