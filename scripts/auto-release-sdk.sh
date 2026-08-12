#!/usr/bin/env bash
#
# Decide the next apps/lib version and release it — the unattended entry point
# CI uses on main. Wraps release-sdk.sh, which does the actual work.
#
# Why this exists
# ---------------
# Consumers get the SDK by tag. Without this, every SDK change sits unreleased
# until someone remembers to tag it, and "can you cut a release?" becomes a
# recurring interruption.
#
# Choosing the version
# --------------------
# Defaults to a PATCH bump, correct for the common case (additive or fix-only
# changes, and rebuilds of the embedded session-page template). Pre-1.0, a
# BREAKING change must be a minor bump instead — a machine cannot detect that, so
# you flag it in the commit that makes the break by including this line anywhere
# in the message:
#
#     sdk-bump: minor
#
# Any commit touching apps/lib since the last tag carrying that marker promotes
# the whole batch to a minor bump. Get this wrong and the mistake is permanent:
# module versions are immutable once the proxy has fetched them.
#
# Usage:
#   ./scripts/auto-release-sdk.sh             # release if needed, else no-op
#   ./scripts/auto-release-sdk.sh --dry-run   # report what it would do

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SDK_DIR="apps/lib"

DRY_RUN=false
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=true

cd "$PROJECT_ROOT"

# Nothing to do unless apps/lib has actually moved since its last tag.
if ./scripts/check-sdk-pin.sh --strict >/dev/null 2>&1; then
    echo "auto-release-sdk: $SDK_DIR is unchanged since its last tag, nothing to do"
    exit 0
fi

LAST_TAG="$(git tag -l "$SDK_DIR/v*" --sort=-v:refname | head -n 1)"

if [[ -z "$LAST_TAG" ]]; then
    NEXT="0.1.0"
    LEVEL="initial"
else
    CURRENT="${LAST_TAG#$SDK_DIR/v}"
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"

    # A breaking change cannot be inferred from a diff, so it is opt-in via a
    # marker in the commit message of whatever made the break.
    if git log "$LAST_TAG"..HEAD -- "$SDK_DIR" | grep -qiE '^[[:space:]]*sdk-bump:[[:space:]]*minor'; then
        NEXT="$MAJOR.$((MINOR + 1)).0"
        LEVEL="minor (sdk-bump: minor marker found)"
    else
        NEXT="$MAJOR.$MINOR.$((PATCH + 1))"
        LEVEL="patch"
    fi
fi

echo "auto-release-sdk: ${LAST_TAG:-no previous tag} -> $SDK_DIR/v$NEXT ($LEVEL)"

if [[ "$DRY_RUN" == "true" ]]; then
    exec ./scripts/release-sdk.sh "$NEXT" --dry-run
fi

exec ./scripts/release-sdk.sh "$NEXT"
