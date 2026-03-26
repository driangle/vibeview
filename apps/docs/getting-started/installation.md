# Installation

## Homebrew (recommended)

```bash
brew install driangle/tap/vibeview
```

## From source

Requires Go 1.22+ and Node.js 20+.

```bash
git clone https://github.com/driangle/vibeview.git
cd vibeview
make install
```

This builds the frontend, embeds it into the Go binary, and installs `vibeview` to your `$GOPATH/bin`.

## GitHub Releases

Pre-built binaries for macOS (Intel & Apple Silicon) and Linux are available on the [GitHub Releases](https://github.com/driangle/vibeview/releases) page. Download the archive for your platform, extract it, and place the `vibeview` binary somewhere on your `PATH`.
