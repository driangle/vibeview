# I Built VibeView to See What Claude Code Was Actually Doing

*A local, read-only viewer for browsing, searching, and understanding your Claude Code sessions.*

For the past year, I’ve used Claude Code extensively to build software. It is excellent at planning work, exploring a codebase, and executing long, multi-step tasks.

But once a session was over, I kept running into the same problem: I could continue it, but I could not easily review it.

I wanted to answer simple questions:

- What did Claude actually do in that session?
- Which files did it change, and which commands did it run?
- Where did that error appear?
- What happened inside the sub-agent whose final response was only two lines long?
- How much did a task cost?
- Which session contained the database refactor I worked on three weeks ago?

The answers were already on my machine. Claude Code records a surprisingly detailed history of every session. What was missing was a good way to look at it.

So I built [VibeView](https://driangle.github.io/vibeview/).

## A Claude Code session is more than a chat

Under the hood, Claude Code stores sessions as append-only streams of JSON events in `.jsonl` files under `~/.claude/projects/`.

These files contain much more than the messages you see in the terminal. A single task—say, “fix the failing authentication test”—can include:

- your prompts and Claude’s responses;
- thinking blocks;
- tool calls and their results;
- shell commands and file edits;
- hooks and skills;
- sub-agent activity;
- progress, token usage, and cost data.

It is a detailed record of an agent doing work: what it examined, what it tried, what failed, and what finally succeeded.

That record is valuable. It can help you debug an unexpected change, recover an earlier line of reasoning, audit an automated run, or understand how an agent arrived at its answer.

The problem is that raw JSONL is a storage format, not a reading experience.

## Resuming is not reviewing

Claude Code already provides useful ways to return to a conversation. You can continue the latest session, resume a specific one, open the session picker, or reverse-search your prompt history.

Those tools are designed to help you keep working. They are not designed to help you understand work that has already happened.

That distinction matters.

To read an old session, you generally have to resume it. Finding a session from weeks ago can mean hunting through abbreviated summaries and opaque IDs. Search is centered on session names and prompts rather than the full record, so it cannot easily answer questions such as “where did this stack trace appear?” or “which session edited this file?”

Some of the most interesting sessions are even harder to inspect. Sub-agents work in the background and usually return only a short summary. Headless runs—through `claude -p`, an SDK, CI, cron, or another automation—may never have had an interactive terminal to watch.

Their complete histories still exist on disk. They just needed a viewer.

## Meet VibeView

VibeView turns Claude Code’s session files into something you can browse, search, and reason about.

It has three interfaces:

1. A web app for reading sessions as conversations.
2. A CLI for search, inspection, and usage analysis.
3. A Claude Code plugin for asking questions about your history from inside Claude Code itself.

All three use the same data and analysis underneath.

Two principles shape the project:

- **Local-first:** your session history stays on your machine.
- **Read-only:** VibeView never modifies the Claude Code sessions it displays.

It is an observer, not an editor.

## Browse sessions in the web app

Start the interface with:

```sh
vibeview web --open
```

VibeView launches a local web app, by default at `localhost:4880`, and discovers the Claude Code sessions already on your machine.

The sessions page gives you a searchable, filterable view of your history. You can browse by project, directory, model, state, and time, and see useful metadata without opening every conversation.

Open a session and the raw event stream becomes a readable timeline: user and assistant messages, thinking blocks, tool calls, command output, hooks, skill invocations, and file edits with inline diffs. Tool inputs and results are expandable, and the underlying JSON remains available when you need to inspect the exact event.

A summary shows the files touched, tools used, commands run, sub-agents created, errors encountered, token usage, and estimated cost.

Large sessions are paginated so they remain usable, and active conversations update in real time as Claude Code writes new events. VibeView also includes activity and directory views for seeing when and where you have been working.

This is particularly useful for sub-agent and headless sessions. Instead of relying on a short handoff, you can read the complete transcript and see the work behind it.

## Search and inspect from the terminal

The same binary is also a CLI.

To search the full content of your session history:

```sh
vibeview search "database migration"
vibeview search --limit 5 "auth middleware"
```

To see aggregate usage and estimated cost:

```sh
vibeview stats
vibeview stats --dirs myproject
vibeview stats --json
```

To list and sort sessions:

```sh
vibeview sessions --limit 10 --sort cost
```

To read a session as plain text:

```sh
vibeview show --thinking <session-id>
```

And to inspect one in detail:

```sh
vibeview inspect <session-id>
```

`inspect` reports message counts, duration, model, token usage, estimated cost, tools, errors, and files touched. It also traces session discovery and reports problems along the way, which makes it useful for diagnosing the surprisingly common question: “Why is this session not showing up?”

Commands support structured output such as JSON, so VibeView can also become part of scripts and other developer tools.

## Let Claude Code search its own history

VibeView also ships as a Claude Code plugin that adds a `/vibeview` skill:

```sh
claude plugin add driangle/vibeview
```

Once installed, you can ask questions in natural language:

> How much have I spent on Claude Code this month?

> Find the session where I refactored the database layer.

> Show me the most expensive sessions in this project.

Claude Code runs the appropriate VibeView command, reads the structured result, and answers in context.

There is also a `vibeview self` command that identifies the current session from inside a tool call. In other words, an agent can inspect the session it is participating in.

That creates an interesting feedback loop: Claude Code’s history is no longer just an archive for humans. It becomes data the agent itself can query.

## Why I built it

As coding agents take on longer tasks, spawn more sub-agents, and run in increasingly automated environments, observability becomes part of the development workflow.

A final answer tells you what the agent wants you to know. A session tells you what actually happened.

That difference matters when you are debugging, learning, auditing, estimating costs, or trying to recover context from earlier work. The session history is already there, and it is richer than most people realize. It should be as easy to inspect as a Git history or a test log.

VibeView is my attempt to make it that easy.

## Try it

Installation takes about a minute:

```sh
brew install driangle/tap/vibeview
vibeview web --open
```

To query your history from Claude Code:

```sh
claude plugin add driangle/vibeview
```

VibeView is local, read-only, and available now.

[Read the documentation](https://driangle.github.io/vibeview/)

