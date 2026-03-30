---
title: "LAN mode with token-based access"
id: "01kn063mb"
status: in-progress
priority: medium
type: feature
tags: ["security", "networking"]
created: "2026-03-30"
---

# LAN mode with token-based access

## Objective

Allow accessing the vibeview web UI from other devices on the local network (e.g. a phone) by binding the server to `0.0.0.0` instead of `127.0.0.1`. Since this exposes terminal sessions to the network, generate a random access token on startup and require it for all requests — preventing unauthorized access from other devices on the same network.

## Tasks

- [ ] Add a `--lan` flag to the CLI that switches the bind address from `127.0.0.1` to `0.0.0.0`
- [ ] Generate a cryptographically random access token when `--lan` is enabled
- [ ] Add middleware to validate the token on all HTTP requests (query param `?token=<value>` or `Authorization` header)
- [ ] Print the full access URL with token to the terminal on startup (e.g. `http://192.168.0.8:4880?token=abc123`) and render a QR code in the terminal for easy mobile access
- [ ] Pass `--host 0.0.0.0` to the Vite dev server when in LAN mode (dev workflow)
- [ ] Update CORS handling to allow requests from LAN IP origins when `--lan` is enabled
- [ ] Print a warning that sessions are exposed on the local network

## Acceptance Criteria

- Server binds to `127.0.0.1` by default (no behavior change without `--lan`)
- With `--lan`, server binds to `0.0.0.0` and is reachable from other LAN devices
- Requests without a valid token return 401 Unauthorized
- The access URL with token is printed to stdout on startup along with a scannable QR code
- Token is randomly generated on each server start (not persisted)
