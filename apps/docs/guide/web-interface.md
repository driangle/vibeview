# Web Interface

vibeview serves a local web UI for browsing your AI coding sessions.

## Session list

The home screen shows all discovered sessions sorted by most recent activity. Sessions update in real time as conversations progress.

![Session list](/images/sessions-list.png)

## Session detail

Click into a session to see the full conversation, including:

- **Messages** — user and assistant turns
- **Tool calls** — with expandable inputs and results
- **File edits** — inline diffs showing what changed
- **Thinking blocks** — the assistant's reasoning steps
- **Cost breakdown** — token usage and estimated cost per message

![Session detail](/images/sessions-detail.png)

![Tool calls and file edits](/images/tool-calls.png)

## Session insights

The sidebar shows a summary of the session — files touched, tool usage, skills, commands, subagents, and errors — giving you a quick overview without scrolling through the full conversation.

<img src="/images/side-bar.png" alt="Session insights" style="max-width: 320px;" />

## Activity

The Activity page shows a timeline of recent session activity across all providers.

![Activity](/images/activity.png)
