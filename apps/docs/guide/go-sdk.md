# Go SDK

The renderer behind [`vibeview export`](/guide/cli#vibeview-export) is an
importable Go package. Programs that embed it produce session pages themselves —
no `vibeview` binary on the user's `PATH`, no subprocess.

```sh
go get github.com/driangle/vibeview/apps/lib@v0.2.0
```

The shared module `github.com/driangle/vibeview/apps/lib` is versioned
separately from the CLI, with tags of the form `apps/lib/vX.Y.Z`.

## Rendering a session

```go
package main

import (
    "os"

    "github.com/driangle/vibeview/apps/lib/sessionhtml"
)

func main() {
    page, err := sessionhtml.RenderSessionHTML(sessionhtml.Request{
        Session: "877fff1e", // session ID, prefix, or path to a .jsonl transcript
    })
    if err != nil {
        panic(err)
    }
    os.WriteFile("session.html", page, 0o644)
}
```

`RenderSessionHTML` returns a complete HTML document with the session and the viewer
inlined: it opens from disk, offline, with no external requests. `sessionhtml.Render`
is the same function under a shorter name.

### Request

| Field | Default | Description |
|-------|---------|-------------|
| `Session` | — | Session ID (full or unique prefix), or a path to a `.jsonl` transcript. Required. |
| `ClaudeDir` | `~/.claude` | Where sessions are looked up. Ignored when `Session` is a file path. |
| `CostEnabled` | `false` | Show cost ($) figures. Token counts always render. |

An unknown session, an ambiguous prefix, or an unreadable transcript comes back
as an error.

## What the page contains

The same session view the web interface serves — conversation, tool calls,
timeline, subagent conversations, and token/cost totals. Two things differ,
because there is no backend behind the page:

- Conversation search is omitted. The Timeline tab's filter is client-side and
  still works.
- Code blocks in less common languages render unhighlighted.

Pages are roughly 800 KB plus the session's own content.

## Releases

Versions are cut automatically. When a change to `apps/lib/**` lands on `main`,
CI tags the next `apps/lib/vX.Y.Z`, pushes it, and repoints `apps/cli/go.mod` at
it — so `go get github.com/driangle/vibeview/apps/lib@latest` always includes
what is on main.

The bump is a **patch** by default. Pre-1.0 a breaking API change is a **minor**
bump, which a diff cannot detect, so flag it in the commit that makes the break:

```
feat(sdk): rename Request.Session to Request.Ref

sdk-bump: minor
```

Any commit touching `apps/lib` since the last tag carrying that line promotes the
whole batch. Get it wrong and the mistake is permanent — module versions are
immutable once the proxy has fetched them.

To release by hand from a clean tree:

```sh
make release-sdk VERSION=0.2.1   # tags, pushes, repoints the pin, commits
make check-sdk                   # is there anything unreleased?
make verify-sdk                  # does the latest tag resolve for consumers?
```

## Reading a session without rendering

`github.com/driangle/vibeview/apps/lib/sessiondetail` exposes the payload
itself — messages, insights, timeline and usage — for programs that want the
data rather than a page:

```go
target, err := session.ResolveTarget(claudeDir, "877fff1e")
detail, err := sessiondetail.Build(target.BaseDir, target.Meta)
```

This is the same assembly the HTTP API and the static page both use.
