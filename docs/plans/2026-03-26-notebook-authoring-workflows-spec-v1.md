# Notebook Authoring Workflows Spec v1

## Goal

Define the first user-facing writing workflows for Nion's personal desktop notebook.

This spec focuses on:

- how users create and edit notes
- how the agent assists writing
- how attachments enter notes
- how users rename, move, delete, and restore notes
- how history becomes visible enough to trust direct agent edits

This spec does **not** define:

- notebook search UX
- graph/backlink exploration UI
- block-level editing
- OpenViking retrieval UI
- agent diary UI

## Product Position

Nion notebook is a document knowledge base, not a hidden app workspace.

The notebook should feel:

- calm
- writable
- file-backed
- inspectable
- safe even when the agent edits directly

The notebook should **not** feel like:

- a developer file browser
- a chat export dump
- a block editor that hides the underlying files
- a magical AI workspace that mutates documents invisibly

## Writing Principles

1. Writing starts from plain Markdown, not app-specific document primitives.
2. The user should be able to write without understanding storage internals.
3. Agent help should feel collaborative, not invasive.
4. Direct-apply edits are allowed, but history must always be visible later.
5. Every destructive action should be slower and more explicit than ordinary editing.

## Core Surfaces

v1 should eventually expose five notebook-writing surfaces:

1. **Notebook Home**
   Lightweight entry into the notebook space, recent notes, and creation actions.

2. **Note Editor**
   Main writing surface for Markdown notes.

3. **Agent Assist Bar**
   A simple action area for: summarize, rewrite, expand, clean up, append to note, create note from chat.

4. **History Drawer**
   Timeline of changes for the current note.

5. **Delete Confirmation Card**
   Focused destructive confirmation surface for note deletion.

## Canonical User Jobs

The first version should optimize for these jobs:

1. Create a new note quickly.
2. Capture a note from a thought or draft.
3. Ask the agent to improve or rewrite part of a note.
4. Turn a chat result into a note.
5. Append new findings to an existing note.
6. Attach an image or file to a note.
7. Rename or move a note without breaking its identity.
8. Review what changed.
9. Restore an earlier version.
10. Delete a note safely.

## Workflow 1: Create A New Note

### User Intent

- "Create a new note"
- "记一个笔记"
- "把这段存成笔记"

### UX Contract

The system should allow two creation modes:

1. Empty note
2. Seeded note from existing content

### First-Version Requirements

- user can create an empty note
- user can create a note seeded from selected text or chat output
- title is editable
- file path suggestion is human-friendly
- frontmatter is created automatically
- note is immediately editable as Markdown

### Safety Rule

Creating a new note from explicit user intent requires no extra confirmation.

## Workflow 2: Edit A Note Directly

### User Intent

- user opens a note and edits it manually

### UX Contract

The editor should prioritize low-friction writing:

- minimal chrome
- visible title
- visible save status
- no app-specific block UI in v1

### First-Version Requirements

- Markdown-first editing
- clear current-note identity
- stable save behavior
- note path is available but not visually dominant
- attachment insertion is nearby and easy

## Workflow 3: Ask Agent To Improve A Note

### User Intent

- "Polish this note"
- "帮我把这一段改得更清楚一点"
- "把这篇整理成会议纪要风格"

### UX Contract

The user should be able to invoke the agent against:

- the whole note
- selected text
- a requested operation

### First-Version Requirements

- support common transforms:
  - rewrite
  - summarize
  - expand
  - clean up
  - convert to checklist
  - extract action items
- agent may apply directly if the intent is clear
- history records the change
- user can inspect and roll back afterward

### Trust Rule

The notebook does not need preview-first safety for ordinary edits.
It needs **history-visible safety**.

## Workflow 4: Create A Note From Chat

### User Intent

- "Save this conversation as a note"
- "把这个回答整理成我的知识库笔记"

### UX Contract

The user should be able to send a chat answer into notebook authoring without copy-paste gymnastics.

### First-Version Requirements

- create note from AI response
- create note from selected conversation segment
- allow the agent to generate a clean Markdown structure
- suggest title and destination
- allow immediate save into notebook

### Product Value

This workflow is critical because it is the main bridge from chat into long-term user-owned knowledge.

## Workflow 5: Append To Existing Note

### User Intent

- "Add this to my LangGraph note"
- "把今天的结论追加到那篇项目文档里"

### UX Contract

The agent should be able to locate the target note from user intent.

If one target is obvious:

- append directly

If more than one target is plausible:

- ask a follow-up question

### First-Version Requirements

- semantic target resolution
- append section or append paragraph behavior
- timestamp or heading insertion policy left configurable later
- history captures the append event

## Workflow 6: Insert Attachments

### User Intent

- drag in an image
- attach a PDF
- paste a screenshot

### UX Contract

Attachment insertion should feel lightweight and predictable.

### First-Version Requirements

- drag-and-drop or picker insertion
- asset stored using the note-local attachment strategy from the storage spec
- Markdown link inserted automatically
- the user does not need to think about path management

### Trust Rule

Attachment placement should be automatic, but never hidden.
Users should still be able to find the file in the filesystem later.

## Workflow 7: Rename Or Move A Note

### User Intent

- rename the note
- move the note to a different folder

### UX Contract

Rename and move should feel like notebook organization, not low-level file operations.

### First-Version Requirements

- rename from the note header or contextual action
- move through notebook tree selection
- keep stable note identity
- record event in history
- keep future room for link maintenance behavior

## Workflow 8: Inspect History

### User Intent

- "What changed?"
- "What did the agent modify?"
- "Go back to an earlier version"

### UX Contract

History should be easy to understand without teaching git.

### First-Version Requirements

- history timeline in reverse chronological order
- each entry shows:
  - time
  - actor
  - operation
  - short change summary
- click into compare view
- restore entry is visible but explicit

## Workflow 9: Restore A Version

### User Intent

- "Restore this version"
- "Roll back to yesterday"

### UX Contract

Restore is a safe recovery operation, not a destructive rewind.

### First-Version Requirements

- restore action creates a new top version
- prior history remains visible
- user sees clear feedback that a restore occurred

## Workflow 10: Delete A Note

### User Intent

- "Delete this note"

### UX Contract

Delete must always be confirm-gated.

The confirmation card should show:

- note title
- short summary or excerpt
- path
- confirm and cancel actions

### First-Version Requirements

- natural-language delete request may trigger the card
- no delete without confirm
- delete is recoverable through notebook trash/history

## Trust UX Rules

### Rule 1: Direct Apply Is Fine

For normal writing actions, the user should not be interrupted with unnecessary confirmations.

### Rule 2: History Must Be Discoverable

Because direct apply is allowed, the user must be able to quickly answer:

- what changed
- who changed it
- when it changed
- how to undo it

### Rule 3: Delete Is Different

Delete is the only common notebook action that should always slow down the user with an explicit confirmation step.

### Rule 4: Ambiguity Requires Follow-up

If the agent cannot confidently identify the target note, it must ask.

## Recommended v1 UI Components

These can likely be composed from existing UI patterns:

- editor shell
- compact action strip
- history drawer / side panel
- compare panel
- confirm dialog
- lightweight attachment insert affordance

Relevant existing building blocks in the codebase:

- `ConfirmActionDialog`
- dialog primitives
- input-group primitives
- artifact preview/detail patterns

## Acceptance Criteria

- users can create notes without understanding filesystem internals
- users can ask the agent to modify notes using semantic intent
- ordinary note edits apply directly and feel low-friction
- users can always inspect history after agent edits
- restore is explicit and append-only
- delete always requires confirmation
- attachment insertion follows the storage contract and feels easy
- rename and move feel like notebook organization, not raw file operations

## Recommended Next Step

After this workflow spec, define:

- the notebook note editor shell
- the history drawer information architecture
- the delete confirmation card content contract
