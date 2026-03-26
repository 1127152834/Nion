# Local Runtime Program 02: CLI and TUI MVP Design

## Goal

Add a first-class `nion` terminal product surface on top of the local daemon, with a real TUI shell, slash-command autocomplete, and in-message structured references. The TUI must feel like a product, not a debug REPL, while staying deliberately small in scope.

## Product Position

`nion tui` is not a fallback shell. It is the second primary interface to the same local daemon that already powers Electron.

The TUI should inherit three product principles:

- complete interaction shell, not a one-line prompt loop
- highly discoverable command system
- shared daemon/runtime semantics with Electron

The MVP should look and behave like a serious terminal product in the style of Hermes Agent, but without importing its full surface area or command sprawl.

## Scope

In scope:

- `nion daemon status`
- `nion daemon stop`
- `nion tui`
- thread list and thread switching
- message send and streaming output
- slash-command autocomplete
- in-message `@` references
- daemon lazy start for CLI

Out of scope:

- tray/menu-bar behavior
- autostart/login item integration
- admin/export/install command suites
- multi-window Electron
- complex recovery flows
- full CLI scripting surface

## Key Decisions

- `/` is reserved for commands only.
- `@` is reserved for in-message structured references only.
- The TUI is a client of the daemon, not a second runtime implementation.
- The MVP command set is intentionally small and high-frequency.
- The TUI should use a real terminal UI framework rather than a hand-rolled REPL shell.

## Information Architecture

The TUI should have a product-grade shell with four persistent regions:

1. Thread list
   A navigable list of recent threads with lightweight search/filter behavior.

2. Main conversation pane
   The active thread transcript, including user messages, assistant messages, streaming output, and tool/run state.

3. Composer
   A multiline input area supporting plain text, `/` command autocomplete, and `@` reference autocomplete.

4. Status bar
   A compact line showing daemon connection state, active thread, active model, and whether the thread is currently streaming.

The first version may render as a two-column shell or a left-rail + main pane layout. The important requirement is that the shell feels stable and navigable entirely by keyboard.

## Command Model

Slash commands should be small in number but complete in meaning.

First-version commands:

- `/new`
- `/threads`
- `/switch`
- `/model`
- `/status`
- `/stop`
- `/retry`
- `/help`

Design goals:

- command discovery through autocomplete
- keyboard selection through arrows, tab, enter, and escape
- no need to memorize syntax before basic use
- commands should not be sent as ordinary chat text

Expected behavior:

- `/new` creates a new thread and focuses it
- `/threads` opens or focuses thread selection mode
- `/switch` switches to a chosen thread
- `/model` selects the active model for the current conversation
- `/status` shows daemon/runtime status in a compact operator view
- `/stop` stops the active run or stream for the current thread
- `/retry` replays the most recent failed or interrupted submission
- `/help` explains commands and key bindings

The MVP should not attempt to cover every future operator action. That belongs in later CLI expansion work.

## `@` Reference Model

The TUI should support structured references inside the composer through `@` autocomplete.

First-version reference types:

- `@skill`
- `@tool`
- `@file`
- optional: `@thread`

Design goals:

- references are inserted into the draft as structured tokens, not loose strings
- users can discover references interactively
- references map cleanly onto daemon payload fields

UX rules:

- `/` never inserts into message content
- `@` never triggers direct runtime actions on its own
- the composer must clearly distinguish commands from references

This keeps the command system and the message-enhancement system conceptually separate.

## Runtime and Data Flow

The TUI must remain thin. It should not own thread state, model logic, or execution orchestration.

Startup flow:

1. User runs `nion tui`
2. CLI probes the local daemon
3. If absent, CLI starts the daemon
4. CLI registers as a daemon client
5. TUI loads thread list and active runtime metadata
6. User enters the main shell

Message flow:

1. User writes text and/or `@` references
2. TUI serializes the structured payload
3. TUI submits to daemon thread stream API
4. TUI consumes SSE events
5. Main conversation pane renders incremental updates

The daemon remains the source of truth for:

- thread state
- runtime state
- model selection
- stream lifecycle
- shutdown behavior

The TUI only owns interface state, such as:

- selected thread
- current draft
- current autocomplete menu state
- focus target
- ephemeral command palette state

## Error Handling

The MVP should distinguish three error classes:

1. Connection/startup errors
   The daemon is unavailable, failed to start, or is incompatible. The TUI should show a startup failure screen with retry/quit.

2. Thread/runtime errors
   Message submission, model execution, or tool execution fails. These errors should remain thread-local and appear in the conversation view.

3. Interaction errors
   Invalid slash command, missing reference target, bad selection, or file-not-found conditions. These should appear near the composer or autocomplete UI.

The TUI should never collapse into a broken terminal state because one thread failed.

## UX Principles Borrowed From Hermes Agent

The most valuable Hermes-like traits to copy are:

- product-grade TUI shell instead of raw CLI loop
- slash-command discoverability
- command semantics that feel stable and intentional
- fast keyboard-driven workflow
- clear distinction between operator actions and message content

The MVP should not copy:

- overly broad command coverage
- platform-specific operational sprawl
- premature admin/export/install layers
- advanced orchestration beyond daemon-backed chat, status, and stopping

## Technical Direction

Implementation should favor a terminal UI framework that can cleanly support:

- multiline input
- list views
- autocomplete overlays
- streaming updates
- keyboard focus management
- a durable status bar

The TUI should be implemented as a client of the daemon over local HTTP/SSE, consistent with the local runtime program.

## MVP Success Criteria

Program 02 is successful when:

- `nion tui` launches into a real TUI shell
- the shell can lazy-start and connect to the daemon
- users can list threads and switch threads
- users can send chat messages and see streaming output
- `/` command autocomplete works
- `@` reference autocomplete works
- `nion daemon status` and `nion daemon stop` work

## Explicit Non-Goals for Program 02

- tray or background shell affordances
- login item registration
- multi-window UI strategy
- export/admin command suites
- broad automation/operator command inventory
- full recovery framework

## Recommended Next Step

Write the implementation plan as:

- CLI entrypoint and packaging
- daemon management commands
- TUI shell framework and layout
- slash-command and `@` autocomplete
- thread/stream integration

This should be the next document in the sequence:

- `docs/plans/2026-03-25-local-runtime-program-02-cli-tui-mvp.md`
