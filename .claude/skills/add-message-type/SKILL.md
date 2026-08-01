---
name: add-message-type
description: "Add end-to-end support for a new Claude Code session message type (a new top-level `type` in the session JSONL) to vibeview — the Go parser, activity classification, API serialization, the React type union, and its inline display component. Use this whenever the user wants to support, handle, or render a new/unknown message type, mentions an 'unknown message type' warning, pastes a JSONL line with an unfamiliar `type`, or asks why some session event shows up as the amber 'Unknown message type' fallback."
---

# Add support for a new message type

vibeview reads Claude Code session JSONL files. Each line is a message with a top-level
`type` (e.g. `user`, `assistant`, `system`, `queue-operation`, `permission-mode`). When Claude
Code introduces a new `type`, vibeview parses it but renders it through the amber
"Unknown message type" fallback and logs a `console.warn`. This skill walks you through wiring
a new type all the way through so it parses cleanly, is classified correctly, and renders as a
tidy inline event.

Most new types are **system-like events** — low-level session bookkeeping (a mode change, a
queue operation, a hook firing). Per the project's `CLAUDE.md`, these must use the shared
inline `EventMessage` component (compact left-border style, click to view raw JSON), **not** a
bespoke card. This skill assumes that common case. If the new type is genuinely a
conversational message (its own bubble like user/assistant), see
[Not a system-like event?](#not-a-system-like-event) at the end.

Also remember the project rule **backend owns the logic, frontend is a thin display layer**:
derive/classify in Go, and let the web client just render server-provided values.

## Before you start: understand the shape

Look at a real JSONL example of the new type. The single most important question is **where the
type's payload lives**, because it decides whether you touch the Go struct at all:

- **Nested under `data`** — e.g. `{"type":"mode","data":{"mode":"normal"}}`. The `data` key is
  already a known field that unmarshals into `Message.Data map[string]any`, so the payload is
  captured for free. **No new Go struct field is needed.** The frontend reads `message.data?.mode`.
  This is the simplest and most common case.
- **A custom top-level field you want typed** — e.g. `permissionMode` on `permission-mode`. Add a
  dedicated struct field *and* register its JSON key (see step 2b). Do this only when you want a
  first-class, strongly-typed field.
- **A custom top-level field, untyped** — any unknown top-level key is auto-captured into
  `Message.Data` by `UnmarshalJSON` (this is how `queue-operation` exposes `operation` to the
  frontend as `message.data?.operation`). No struct change; the frontend reads it from `data`.

When in doubt, prefer the `data`-nested / auto-captured path — it needs the least code and
matches how most recent types are modeled.

## The files you'll touch

Grep for an existing analogous type to anchor yourself — `permission-mode` and
`queue-operation` are the best templates. `grep -rn "permission-mode\|MessageTypePermissionMode\|queue-operation" apps` shows every site end-to-end.

The full path, backend → frontend:

1. `apps/lib/claude/claude.go` — the `MessageType` constant (and optionally a struct field).
2. `apps/lib/session/activity.go` — classify the type as non-semantic.
3. `apps/cli/internal/server/server.go` — API serialization (only if you added a struct field).
4. `apps/web/src/types.ts` — add the literal to the `MessageResponse.type` union.
5. `apps/web/src/components/EventMessages.tsx` — the inline display component.
6. `apps/web/src/components/MessageBubble.tsx` — route the type to that component.
7. Tests in `apps/lib/claude/claude_test.go` and `apps/lib/session/activity_test.go`.

Work through them in order.

### Step 1 — Register the type constant (Go)

In `apps/lib/claude/claude.go`, add a `MessageType` constant to the `const (...)` block
alongside the others (keep the gofmt-aligned column):

```go
MessageTypeMode MessageType = "mode"
```

The parser (`ParseMessageLine`) never rejects unknown types, so nothing breaks without this —
but the constant is what every downstream `switch`/classification refers to, and it documents
the type as known.

### Step 2 — Model the payload (Go, usually nothing to do)

- **Payload under `data` or an untyped top-level field:** skip this step. `Message.Data`
  already captures it.
- **You want a dedicated typed field (step 2b):** add the field to the `Message` struct with a
  JSON tag, **and** add its JSON key to the `knownMessageKeys` map. That map lists keys mapped to
  named struct fields so `UnmarshalJSON` doesn't also duplicate them into `Data`. Forgetting the
  `knownMessageKeys` entry is the classic bug — the value ends up in both the field and `Data`.

### Step 3 — Classify as a non-semantic event (Go)

In `apps/lib/session/activity.go`, `DeriveActivityState` walks messages backwards to decide what
the session is doing. System-like events must not count as conversation state, so add the new
constant to the "Skip non-semantic message types" `case` list:

```go
case claude.MessageTypeSystem, /* …existing… */, claude.MessageTypeMode:
    continue
```

Functionally the `switch` has no `default`, so an unlisted type is skipped anyway — but adding
it explicitly keeps intent clear and is what the skip-test asserts. Leave
`DeriveActivityStateFromMessage` alone: its `default: return ""` already treats the type as
non-semantic. (Only touch these if the type genuinely reflects working/waiting state, which
system events don't.)

### Step 4 — API serialization (Go, only if you added a struct field)

`apps/cli/internal/server/server.go` maps `claude.Message` → `MessageResponse` in
`toMessageResponse`. `Data` (and `Attachment`, etc.) already flow through with redaction applied,
so **payloads under `data` need no change here.** If in step 2b you added a new dedicated struct
field, add a matching field to the `MessageResponse` struct and copy it in `toMessageResponse`
(mirror how `PermissionMode` is carried). Apply redaction consistent with the neighbors
(`redact.RedactMapValues` for maps, `redact.RedactSecrets` for strings).

### Step 5 — Extend the frontend type union (TS)

In `apps/web/src/types.ts`, add the string literal to the `MessageResponse['type']` union:

```ts
  | 'permission-mode'
  | 'attachment'
  | 'mode';
```

Without this, TypeScript will reject the `message.type === 'mode'` comparison you add in step 7.

### Step 6 — Add the inline display component (TSX)

In `apps/web/src/components/EventMessages.tsx`, add a component that wraps the shared
`EventMessage`. Copy `PermissionModeMessage` (dedicated field) or `QueueOperationMessage`
(reads from `data`) as your template. Read the detail defensively and give the event a **distinct
Tailwind color** so it's visually separable from its neighbors:

```tsx
export function ModeMessage({ message }: { message: MessageResponse }) {
  const mode = message.data?.mode ? String(message.data.mode) : 'unknown';

  return (
    <EventMessage
      message={message}
      label="Mode"
      borderColor="border-indigo-300 dark:border-indigo-600"
      labelColor="text-indigo-500 dark:text-indigo-400"
      detailColor="text-indigo-400 dark:text-indigo-500"
      detailText={mode}
    />
  );
}
```

Colors already in use (pick an unused one): queue-operation → blue/amber, last-prompt → violet,
permission-mode → emerald, attachment → cyan, hook → stone, mode → indigo. Good remaining
choices: sky, rose, teal, fuchsia, lime. `EventMessage` also accepts an optional `rawData` prop
if the click-to-view-JSON should show a nested object (see `AttachmentMessage`).

### Step 7 — Route the type to the component (TSX)

In `apps/web/src/components/MessageBubble.tsx`, import the new component from `./EventMessages`
(keep the import list alphabetical) and add a branch **before** the final
`console.warn(...) / <UnknownMessage>` fallback:

```tsx
if (message.type === 'mode') {
  return <ModeMessage message={message} />;
}
```

Once this branch exists, the type stops falling through to the amber "Unknown message type"
fallback.

### Step 8 — Tests (required for every new behavior)

The project rule is **test all new behavior**. Add two small tests, mirroring existing ones:

- **Parse test** in `apps/lib/claude/claude_test.go` — copy `TestParseMessageLine_PermissionMode`
  / `TestParseMessageLine_Attachment`. Assert the `type` maps to the new constant and the payload
  landed where you expect (`msg.Data["mode"]` for `data`-nested, or the struct field otherwise):

```go
func TestParseMessageLine_Mode(t *testing.T) {
	line := `{"type":"mode","uuid":"m1","timestamp":"2026-04-16T10:09:19.406Z","data":{"mode":"normal"}}`
	msg, err := ParseMessageLine([]byte(line))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if msg.Type != MessageTypeMode {
		t.Errorf("Type = %q, want %q", msg.Type, MessageTypeMode)
	}
	if msg.Data["mode"] != "normal" {
		t.Errorf("Data[mode] = %v, want %q", msg.Data["mode"], "normal")
	}
}
```

- **Classification test** in `apps/lib/session/activity_test.go` — extend
  `TestDeriveActivityState_SkipsPermissionModeAndAttachment` (add a message of the new type to the
  slice) so it proves the event is skipped and the real conversation state still wins.

A frontend test isn't strictly required (there are currently no `MessageBubble`/`EventMessages`
component tests), but the Go tests above are.

### Step 9 — Verify

Run `make check-lite` while iterating to catch compile/lint errors fast, then `make check`
before finishing — it must pass Go tests, `golangci-lint`, `eslint`, `tsc`, the web tests, and
the docs build. A common trip-up: the project's TypeScript pre-edit hook flags an unused import,
so add the `MessageBubble.tsx` routing branch (step 7) in the same pass as the import.

## Quick checklist

- [ ] `MessageType` constant added (`claude.go`)
- [ ] Payload modeled — nothing to do if under `data`; else struct field **and** `knownMessageKeys`
- [ ] Added to the non-semantic skip `case` in `DeriveActivityState` (`activity.go`)
- [ ] `MessageResponse` + `toMessageResponse` updated **only if** you added a struct field (`server.go`)
- [ ] Type literal added to the union (`types.ts`)
- [ ] Inline component added with a distinct color (`EventMessages.tsx`)
- [ ] Routing branch added before the fallback, import alphabetized (`MessageBubble.tsx`)
- [ ] Parse test + activity skip test added
- [ ] `make check` passes

## Not a system-like event?

If the new type is a real conversational message deserving its own bubble (not an inline event),
it doesn't belong in `EventMessages.tsx`. Instead model it like `user`/`assistant`: give it a
dedicated component (see `AssistantMessage.tsx` / `UserMessage.tsx`), route it high up in
`MessageBubble.tsx`, and reconsider steps 3–4 — it may carry real activity-state meaning, in
which case add it to the semantic `switch` cases in `activity.go` rather than the skip list.
This is rare; confirm with the user before going this route, since it diverges from the
"minimal UX for system-like events" convention.
