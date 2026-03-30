# Notebook Assistant Chat Design

## Context

The current `Ask Nion` panel inside notebook mode is built as a mini action console with multiple explicit affordances for assist preview, import, and conversation branching. That design is too heavy for the notebook editing context. The user wants `Ask Nion` to behave like a simple, note-scoped chat assistant that can answer questions and perform rewrites directly against the current note without exposing the full main-chat surface area.

The same request also introduces a new system-level agent concept: a built-in `笔记助手` agent that appears in the Agent module, cannot be deleted, and powers notebook chat interactions through a simplified prompt/tool chain.

## Goals

1. Replace the current `Ask Nion` action panel with a lightweight, note-scoped chat surface.
2. Support both question answering and rewriting through natural language, without explicit mode-switch buttons.
3. For rewrite requests, write changes directly into the note and present a local confirm/cancel flow.
4. Add a built-in `笔记助手` agent that is visible in the Agent module but locked from deletion.
5. Reuse as much of the existing chat/message stack as practical while stripping notebook chat down to a simpler product surface.

## Non-Goals

1. Do not merge notebook assistant conversations into the main chat thread list.
2. Do not expose the full main-chat toolbox inside notebook chat, including skills, CLI, model switching, or task-heavy workflows.
3. Do not support multiple pending rewrite proposals at the same time.
4. Do not design a generalized revision-tracking system for arbitrary editors beyond notebook chat.

## Product Decisions

### 1. Notebook Chat Surface

`Ask Nion` becomes a lightweight chat panel with three regions:

1. Header
   - Title: `笔记助手`
   - Secondary action: `新对话`
2. Message area
   - User messages
   - Assistant replies
   - Short system-status messages related to rewrite application or failure
3. Composer
   - Minimal text input
   - Send button
   - Stop/retry only if these can be inherited cheaply from the shared lightweight chat shell

No mode switcher, prompt chips, import cards, model selector, agent selector, skills, CLI affordances, or multi-tool UI is shown inside notebook chat.

### 2. Session Model

Notebook assistant conversations are scoped by:

- `note_id`
- `session_id`

Behavior:

1. Every note has one current notebook-assistant session.
2. `新对话` creates a fresh `session_id` for the current note.
3. Older notebook-assistant sessions are not surfaced in a switcher or list.
4. Notebook-assistant sessions do not appear in the main chat history UI.

This yields continuity by default while preserving the user's request for a fresh-start action and avoiding extra management UI.

### 3. Intent Handling

Notebook chat does not force users to choose `问答` or `改写` through buttons. The assistant decides based on user language and current note context:

1. If the request is interpretive or informational, return a normal answer in chat.
2. If the request is a rewrite/edit instruction, execute the rewrite flow.
3. If the user has a current text selection, rewriting defaults to the selection.
4. Without a selection, rewriting targets the whole note unless the prompt clearly narrows scope another way.

### 4. Rewrite Application Model

Rewrite requests are applied directly to the note body instead of generating a separate preview panel first.

After a successful rewrite:

1. The note body is updated immediately.
2. The affected region is shown in a pending-review visual state.
3. A local action control appears near the modified region with:
   - `确认`
   - `取消`
4. The chat stream also records a short assistant/system message describing that a rewrite was applied.

If the user chooses:

- `确认`: accept the rewritten content and clear pending-review state
- `取消`: revert to the pre-rewrite snapshot and clear pending-review state

### 5. Pending Rewrite Conflict Rule

Only one pending rewrite is allowed at a time.

If the user triggers another rewrite while a previous rewrite is still pending:

1. Revert the note to the original pre-pending state.
2. Apply the newest rewrite.
3. Replace the pending-review highlight and controls with the newest rewrite state.

This implements the user's requested overwrite model rather than blocking or stacking revisions.

### 6. Visual Treatment of Pending Rewrites

The pending rewrite state should resemble inline revision review rather than a detached card system.

Rules:

1. Added or modified text is highlighted with a distinct but restrained background treatment.
2. The confirm/cancel affordance appears adjacent to the rewritten region.
3. For whole-note rewrites, multiple ranges may be highlighted, but the action control should still feel local rather than turning into a full-page global banner.
4. The styling should read as "temporary AI-applied draft change" rather than "error" or "selection".

### 7. Built-In Agent Model

Introduce a built-in agent named `笔记助手`.

Required properties:

- visible in Agent page
- marked as built-in/system
- cannot be deleted
- not user-editable in the same way custom agents are
- intended entrypoint is notebook chat rather than full main chat

The Agent module must move from "custom agents only" to a unified catalog containing both built-in and custom agents.

## Data Model Changes

### Frontend Agent Type

Extend the frontend `Agent` model with fields that distinguish built-in and custom agents:

- `id: string`
- `kind: "builtin" | "custom"`
- `visibility: "public" | "internal"`
- `can_delete: boolean`
- `can_edit: boolean`
- `entrypoint: "full-chat" | "notebook-chat"`
- `tool_policy: string | null`
- existing fields such as `name`, `description`, `model`, `tool_groups`, `soul`

### Backend Agent Response

`/api/agents` should return a merged catalog of:

1. built-in agents from a backend registry
2. custom agents from filesystem-backed agent configs

For `笔记助手`, the backend should return something equivalent to:

- `kind = "builtin"`
- `visibility = "public"`
- `can_delete = false`
- `can_edit = false`
- `entrypoint = "notebook-chat"`
- `tool_policy = "notebook-basic"`

### Built-In Agent Registry

Add a backend built-in agent registry instead of pretending the notebook assistant is a filesystem custom agent. This avoids leaking system-owned lifecycle into user CRUD.

The registry should support:

1. listing built-in agent definitions
2. loading built-in agent metadata by name/id
3. merging with custom agents for API responses
4. enforcing immutable behavior for built-ins in update/delete handlers

## API and Routing Changes

### Agent APIs

Adjust `/api/agents` semantics:

1. `GET /api/agents`
   - return built-in + custom agents
2. `GET /api/agents/{name}`
   - support both built-in and custom agents
3. `DELETE /api/agents/{name}`
   - reject built-in agents with a stable error
4. `PUT /api/agents/{name}`
   - reject built-in agents for v1 unless a very small editable subset is explicitly needed later

### Notebook Assistant Session APIs

Notebook chat should not reuse the main thread list UX, but it can still reuse thread-style streaming primitives if isolated in separate routes/storage.

The notebook assistant needs an internal session API supporting:

1. create or resume current note session
2. start a new session for the current note
3. send message against current note + session
4. stream assistant output
5. persist notebook-assistant conversation history per `note_id` + `session_id`

The implementation may reuse existing thread infrastructure, but the product boundary must ensure notebook sessions are not surfaced in the main chat list.

## Chat Component Strategy

Build a notebook-specific lightweight chat component by reusing existing main-chat primitives where they already fit:

- message rendering
- streaming
- composer submission
- stop/retry basics

Do not reuse heavyweight UI or orchestration features:

- agent switching
- model switching
- skills UI
- CLI/tool execution UI
- artifact/task-specific affordances
- general-purpose workspace controls

The right mental model is "a slim notebook chat shell built from shared chat primitives", not "the full chat page embedded in the notebook rail".

## Backend Prompt and Tool Policy

### Prompt Profile

Create a notebook-assistant-specific prompt profile that is much simpler than the main agent prompt.

It should instruct the assistant to:

1. operate only on the current note context and selection
2. answer clearly and briefly
3. rewrite directly when requested
4. avoid broad task orchestration behavior
5. avoid unnecessary tool use

### Tool Policy

For v1, `笔记助手` should not have:

- skills
- CLI execution
- complex multi-tool agent workflows
- task/subagent behaviors

The only capability worth considering beyond pure text reasoning is a limited search ability, but it should not be part of v1.

Required v1 policy:

- no extra tools
- no search
- no CLI
- no skills
- no task/subagent orchestration

Future expansion, if needed:

- one constrained search capability can be evaluated later behind the notebook assistant tool policy

### Rewrite Output Contract

The rewrite chain should return a compact structured result instead of a verbose tool trace:

- target scope (`selection` or `whole_note`)
- rewritten content
- optional short explanation
- enough location metadata to highlight the affected range in the note view

This keeps the notebook assistant deterministic and easy to apply to the note editor state.

## UI Rules for Agent Gallery

The Agent page should reflect built-in status without making the notebook assistant feel special-cased in an ad hoc way.

For built-in agents:

1. show a `系统内置` or equivalent badge
2. hide the delete action when `can_delete = false`
3. if edit is later exposed, respect `can_edit`; for v1 notebook assistant it remains locked

This makes the notebook assistant visible and transparent, matching the user's request that it appear in the Agent module.

## Error Handling

### Chat Errors

If notebook chat fails to answer:

1. leave note content unchanged
2. show a compact error message in the message stream
3. allow the user to retry or send a new instruction immediately

### Rewrite Apply Errors

If rewrite generation or note write-back fails:

1. do not leave partial pending-review state behind
2. keep or restore the previous stable note body
3. append a short failure message in the notebook chat

## Testing Strategy

### Frontend

1. Agent card/gallery rendering for built-in locked agents
2. Notebook assistant panel renders the lightweight chat shell instead of the current action console
3. Selection-first rewrite targeting
4. Pending rewrite confirm/cancel behavior
5. Overwrite behavior when a second rewrite is issued before confirmation
6. Notebook assistant sessions do not appear in main chat history UI

### Backend

1. Built-in + custom agent list merging
2. Built-in agent detail retrieval
3. Built-in agent delete/update rejection
4. Notebook assistant session lifecycle per note
5. Simplified prompt/tool policy for notebook assistant
6. Rewrite output contract and revert behavior

## Migration Notes

The current notebook `Ask Nion` panel already contains preview/rewrite-related logic. The implementation should not layer the new chat flow on top of that UI. Instead, it should replace the current right-rail ask surface with the lightweight notebook assistant experience and retire the old preview/import-specific affordances from that panel.

The existing main chat architecture should be treated as a component source, not a product template.
