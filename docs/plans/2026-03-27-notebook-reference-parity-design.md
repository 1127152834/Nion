# Notebook Reference Parity Design

## Goal

Reset the notebook implementation to match the local reference project at:

- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook`

The next implementation pass must treat that project as the canonical notebook product surface and reproduce it one-to-one in Nion's desktop workspace, except for color/theming adaptation where needed to stay coherent with the Nion shell.

This document exists because the current merged notebook work only partially adopted the reference and drifted in both product logic and page structure.

## Source Of Truth

Reference implementation:

- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/App.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/Sidebar.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/Editor.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/ContextPanel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/TrashView.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion-notebook/src/components/Modals.tsx`

Current Nion implementation to compare against:

- [notebook-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-page.tsx)
- [notebook-sidebar.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-sidebar.tsx)
- [notebook-editor-pane.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-editor-pane.tsx)
- [notebook-context-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.tsx)
- [notebook-trash-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-trash-page.tsx)
- [notebook-create-dialog.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-create-dialog.tsx)
- [notebook-quick-capture-dialog.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-quick-capture-dialog.tsx)
- [notebook-delete-dialog.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-delete-dialog.tsx)

## Correct Product Interpretation

The reference project is not a generic notebook CRUD page.

It is a **three-pane document workspace** with four product promises:

1. **Notebook is a writing environment, not a settings subpage**
   The center of gravity is the note itself, not the surrounding management controls.

2. **The left notebook rail is a local knowledge navigation surface**
   Search, pinned, recent, tree navigation, and trash are all notebook-native, not workspace-global.

3. **The right rail is a collaborative context surface**
   The right panel is not just metadata. It is where AI assistance, version trust, and note context live.

4. **Direct agent edits are acceptable only because history is visible**
   The UX is built on "apply directly, but inspect and restore later", not "always preview first".

This distinction matters because a page that merely exposes create/edit/delete/history is still not the same product as the reference.

## One-To-One Product Mapping

### 1. Overall Page Model

Reference:

- single notebook workspace
- left note-navigation pane
- center writing pane
- right context/assist pane
- no card-heavy "dashboard" feeling
- no empty large wrappers around the working surfaces

Required parity:

- The notebook route in Nion must visually read as one integrated workbench.
- The three panes must feel like permanent co-equal surfaces, not isolated cards placed inside a page.
- Vertical separators, spacing rhythm, and pane proportions should closely follow the reference.

### 2. Left Pane Model

Reference left pane behavior:

- notebook-local branding
- search field at top
- dual primary actions: create + quick capture
- pinned notes section
- recent notes section
- full note tree section
- trash entry anchored at bottom
- inline tree expansion
- note item hover affordances

Current Nion mismatch:

- search/recent/tree now exist, but the structure is still flatter and less reference-faithful
- pinned notes do not exist
- hover affordances and item density do not match
- current quick-capture flow is wired, but not visually equivalent
- tree section title/section ordering is still implementation-driven, not reference-driven

Required parity:

- left pane section order must match reference:
  - search
  - create + quick capture
  - pinned
  - recent
  - all notes tree
  - trash footer
- pin state must be first-class
- item density, padding, hover treatment, and hierarchy must closely mirror the reference
- note rows must visually look like notebook entries, not generic list rows

### 3. Center Pane Model

Reference center pane behavior:

- top breadcrumb/meta row
- large editable title
- explicit save state shown in header
- preview/edit toggle as a header action
- history/delete/more actions grouped in header
- note body is the primary focus area
- editing surface feels like a writing canvas, not a textarea inside a card
- empty state is centered and calm

Current Nion mismatch:

- preview toggle exists, but header/action grouping is still different
- save status is badge-driven rather than reference-like inline status
- the center pane still carries more app-shell card framing than the reference
- "more actions" placeholder is missing
- title/path/date grouping is not yet reference-faithful

Required parity:

- center header layout should match the reference composition:
  - breadcrumb/path + last-updated meta
  - large title
  - inline save status
  - actions cluster
- visual hierarchy must prioritize the note title and body
- body width, text rhythm, and canvas spacing should align to the reference
- the empty state should match the reference tone and placement

### 4. Right Pane Model

Reference right pane behavior:

- three tabs: ask / history / info
- ask tab includes:
  - collaboration suggestion cards
  - chat import card
  - start conversation card
- history tab includes:
  - timeline list
  - version preview
  - restore action
- info tab includes:
  - note properties
  - tags
  - path

Current Nion mismatch:

- tabs exist, but the content is far thinner than the reference
- ask tab is missing:
  - preview/apply workflow
  - import-from-chat card
  - start-conversation card
- history exists but looks like raw engineering history, not the reference timeline UX
- info tab only exposes system fields; it does not yet match the product intent of the reference
- tags do not exist

Required parity:

- right pane must be rebuilt as a real notebook side surface, not a thin inspection column
- ask tab must include the same three product areas as the reference
- history must visually become a timeline, not just a list of diffs
- info must include note properties, tags, and path treatment matching the reference

### 5. Create / Quick Capture / Delete Flows

Reference:

- create modal is lightweight and notebook-owned
- quick capture is distinct from create
- delete modal is reassuring and recoverable, with note preview/context

Current Nion mismatch:

- create / quick capture / delete are now separated, but still visually closer to generic dialogs
- quick capture is functionally correct, but not yet reference-faithful in wording, layout, and submission behavior
- delete confirmation lacks the same product reassurance treatment

Required parity:

- these flows should visually and behaviorally match the reference
- quick capture should clearly feel like "capture now, organize later"
- delete should feel recoverable and trusted, not just destructive

### 6. Trash Surface

Reference:

- trash is a full notebook sub-surface
- strong destructive but recoverable visual language
- item cards include summary + timestamp + path + restore

Current Nion mismatch:

- trash route exists and helper is fixed
- current trash page is serviceable but still not a close visual match
- the reference uses stronger visual emphasis on recoverability and deletion context

Required parity:

- trash page should follow the reference card layout and visual treatment more closely

## Exact Functional Gaps To Close

These are not optional if the goal is true reference parity.

### Gap A: Pinned Notes

Reference requires:

- notes can be pinned
- pinned notes appear in a dedicated section

Current backend/frontend gap:

- no persisted pin metadata in notebook note model

Required implementation:

- add pinned state to notebook note metadata/frontmatter or notebook metadata store
- expose pin/unpin operations in backend API
- render pinned section in left pane exactly like reference

### Gap B: Ask Tab Preview/Apply Flow

Reference requires:

- AI suggestion actions generate preview content
- user can replace or append from preview

Current gap:

- current Nion notebook only routes assist actions into a new chat

Required implementation:

- notebook assist preview endpoint or local generation contract
- apply-as-replace
- apply-as-insert
- preview dismissal
- history entry after apply

### Gap C: Import From Chat Card

Reference requires:

- the right rail can import a chat result into the current note

Current mismatch:

- current notebook has save-to-notebook from chats, but not the same in-note import affordance

Required implementation:

- add a current-note import card in ask tab
- connect it to actual selected/last-thread content source

### Gap D: Start Conversation From Current Note

Reference requires:

- a clear CTA that opens a new conversation using the current note as context

Current state:

- prompt routing exists in code, but the right-rail product surface is not yet equivalent

Required implementation:

- explicit reference-style start-conversation card in ask tab

### Gap E: Tags In Info Tab

Reference requires:

- tags are visible and editable

Current gap:

- no tag metadata contract

Required implementation:

- add tags to notebook metadata
- expose read/write path
- render editable tag chips

### Gap F: More Actions / Note Toolbar Completeness

Reference has an explicit toolbar cluster including a "more" affordance.

Current mismatch:

- current implementation still treats toolbar completeness as secondary

Required implementation:

- add a real toolbar structure matching the reference
- if an action is unavailable, expose the affordance but keep behavior grounded

## Non-Negotiable Parity Rules

The next implementation pass must follow these rules:

1. **Reference first**
   If current Nion notebook structure differs from the reference, prefer the reference unless a real backend constraint forbids it.

2. **No abstract reinterpretation**
   Do not "translate the spirit" of the reference into a different layout.
   Copy the layout, section ordering, and interaction model.

3. **Only adapt theme, not structure**
   Color, border tone, and shell integration may adapt to Nion.
   Information architecture, pane layout, and component hierarchy must stay reference-faithful.

4. **Do not defer required product behavior just because UI exists**
   If the reference has pinned notes, preview/apply assist, import from chat, and richer info metadata, those are product requirements, not polish.

5. **No more notebook card-dashboard drift**
   The notebook route must look like a dedicated document workspace, not a settings-like composition of cards.

## Implementation Order

### Phase 1: Lock Backend/Data Gaps Needed For True Parity

- pinned metadata
- tags metadata
- assist preview/apply contract
- current-note import from chat contract

### Phase 2: Rebuild Left Pane To Match Reference Exactly

- section order
- pinned section
- recent section
- tree rows
- bottom trash anchor
- action styling

### Phase 3: Rebuild Center Pane To Match Reference Exactly

- header composition
- title/meta/save state
- toolbar grouping
- writing canvas spacing

### Phase 4: Rebuild Right Pane To Match Reference Exactly

- tabs
- ask cards
- history timeline + preview
- info properties + tags

### Phase 5: Rebuild Modals And Trash To Match Reference Exactly

- create
- quick capture
- delete
- trash page

### Phase 6: Final Visual Parity Pass

- spacing
- borders
- separators
- icon sizes
- empty states
- scroll behavior
- hover states

## What Was Wrong In The Previous Implementation Approach

The previous implementation took the reference as inspiration instead of as a canonical product surface.

That created three classes of error:

1. **Layout drift**
   The page became "Nion notebook with some donor ideas" instead of "reference notebook inside Nion shell".

2. **Behavioral drift**
   Features that existed in the reference were treated as optional or later-wave enhancements, even though they are part of the core product behavior.

3. **Product misread**
   The notebook was treated too much like a file-backed CRUD surface and not enough like a writing-first collaborative knowledge workspace.

This document resets that.

The next pass should be evaluated against the reference project first, and against the current Nion notebook only second.
