# Chat Clarification UX Design

## Goal

Upgrade Nion's chat clarification flow so users can immediately recognize when an agent is blocked on their decision, answer through clickable choices instead of manual retyping, and resume execution without confusion.

The design target is not "make clarification messages prettier." The target is a reliable interrupt-and-resume interaction model across:

- the left conversation list
- the active chat transcript
- the composer
- thread state derivation

After this change, a thread that requires a user choice should look and behave like an inbox item, not like an ordinary assistant message buried in the transcript.

## Product Decisions

- Only clarification requests with structured `options` enter the explicit `待回复` thread state.
- A clarification request is a thread-level interaction state, not just a styled message.
- The left sidebar shows a `待回复` badge and moves pending threads above ordinary recent chats.
- Clicking a short option sends it immediately.
- Freeform user input remains available and clears the pending state the same way as choosing an option.
- Clarification options use adaptive presentation:
  - short lists use direct action buttons
  - long or dense lists fall back to a single-select list with explicit submit
- The UI should tell the user that replying will continue the current task.
- The first release should derive pending state from existing message history instead of introducing a new backend storage model.

## Current-State Problem

Nion already has a real clarification protocol, but the frontend does not treat it as a first-class interaction.

Today:

- the backend `ask_clarification` tool already accepts `options`
- the client stream already exposes clarification payloads
- the message layer already recognizes `ask_clarification`
- the UI currently renders the clarification as a prominent transcript block

But three gaps remain:

1. The left conversation list does not show that a thread is waiting on the user.
2. Clarification options are not rendered as direct actions, so the user has to retype or manually copy the answer.
3. The composer does not switch into a "replying to a pending question" mode.

That creates a failure mode common to agent products with weak interrupt UX:

- the agent pauses
- the user does not notice the pause state
- the thread looks inactive rather than blocked on input
- the recovery path requires more effort than necessary

The current relevant files are:

- [recent-chat-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/recent-chat-list.tsx)
- [message-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.tsx)
- [message-group.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-group.tsx)
- [input-box.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/input-box.tsx)
- [hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/hooks.ts)

## Existing Protocol Surface

The current backend/frontend contract is already close to what the product needs.

### Backend

The built-in tool `ask_clarification` accepts:

- `question`
- `clarification_type`
- `context`
- `options`

Reference:

- [clarification_tool.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/clarification_tool.py)

### Stream Transport

The stream client already forwards clarification payloads through tool messages and custom SSE events.

References:

- [client.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py)
- [desktop-client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/api/desktop-client.ts)

### Frontend Rendering

The frontend already groups clarification tool messages into `assistant:clarification`, but currently treats them mainly as formatted content, not as a resumable UI state.

Reference:

- [utils.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts)

## Target UX

The target interaction should feel like a lightweight agent inbox.

### 1. Left Sidebar

When a thread contains an unresolved clarification with `options`:

- show a small status dot beside the thread title
- show a lightweight `待回复` label
- sort pending threads above ordinary recent chats
- preserve `updated_at desc` ordering within the pending bucket

When the user answers by either:

- clicking an option
- submitting custom text

the badge disappears immediately through optimistic UI, then stays cleared once the stream confirms the human message.

### 2. Transcript Card

Clarification content should render as a dedicated card instead of plain markdown.

Card contents:

- title row: `需要你的协助`
- question text
- optional context copy
- helper line: `回复后将继续当前任务`
- options region

Options region behavior:

- use action buttons for short choices
- switch to a radio/select list with submit when options are long or visually dense
- always keep a freeform reply path available through the composer

### 3. Composer Context

When the current thread has an active clarification:

- placeholder switches from the generic prompt to a reply-specific prompt
- the composer visually indicates the user is responding to a pending question
- if the clarification card has scrolled away, a compact reminder strip appears above the composer

This avoids the common "what am I replying to?" problem in long threads.

## Interaction Model

### Recommended Default

The validated interaction choice is:

- click option and send immediately
- still allow manual text input

This is the best balance between speed and control for a clarification flow that is fundamentally a decision gate.

### Why Immediate Send

Clarification with explicit options is usually not exploratory chat. It is a blocking branch in execution. Requiring a second confirm click adds friction exactly where the agent is waiting on a narrow decision.

Immediate send also matches the user's stated preference and aligns with quick-reply patterns seen in agent tools such as Manus and Codex-style assistant surfaces.

### Why Freeform Input Still Matters

The user should not be trapped inside system-provided answers. Manual replies remain valid because:

- the listed options may be incomplete
- the user may want to combine or refine an option
- the correct response may be a correction rather than a selection

Any human reply should resolve the pending clarification state, not only exact option matches.

## State Model

### Product Rule

A thread enters the explicit `待回复` state only when the latest unresolved clarification has `options`.

This prevents the sidebar from being polluted by every generic assistant follow-up or missing-detail question.

### V1 State Source

Do not add a new backend thread field for first release.

Instead, derive pending clarification from `values.messages` already returned by thread search and thread state APIs.

Add a pure helper, for example:

- [clarification.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/clarification.ts)

Suggested shape:

```ts
type PendingClarification = {
  toolMessageId?: string;
  toolCallId?: string;
  question: string;
  context?: string;
  clarificationType: string;
  options: string[];
};
```

Suggested derivation rule:

1. walk messages from newest to oldest
2. find the newest `ask_clarification` tool message with `additional_kwargs.clarification.options`
3. if any later human message exists after that clarification, it is already resolved
4. otherwise return it as the active pending clarification

This keeps the logic deterministic and testable.

### Why Pure Derivation First

- no backend schema migration
- no risk of thread metadata getting out of sync with message history
- sidebar and chat page can share one helper
- easier to test than event-driven ad hoc flags

## Component Design

### Sidebar Pending Badge

Modify:

- [recent-chat-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/recent-chat-list.tsx)

Responsibilities:

- derive pending clarification for each thread
- sort pending threads to the top
- render dot + `待回复`

The badge should be lightweight, not a heavy pill. It needs to read as queue state, not as a primary CTA.

### Clarification Card

Create a dedicated component, for example:

- [clarification-card.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/clarification-card.tsx)

Responsibilities:

- render the title, question, context, and helper line
- render adaptive option UI
- send option selections through the existing composer submit path

Do not couple this component directly to transport or fetch logic. It should emit `onSelect(option: string)` and let the thread page route submission through existing message submission code.

### Composer Pending Context

Modify:

- [input-box.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/input-box.tsx)
- [chat-thread-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx)

Responsibilities:

- accept `pendingClarification`
- switch placeholder copy
- render a compact pending-response strip above the textarea
- keep the existing submit code path unchanged
- derive pending clarification once at the thread page level and pass it to both transcript and composer

This is important: choosing an option should not invent a second message pipeline. It should reuse the same `onSubmit` path as normal human messages.

### Message List Integration

Modify:

- [message-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.tsx)

Responsibilities:

- render `ClarificationCard` for active clarification groups
- avoid duplicate noisy rendering when a clarification is already represented by the card

## Adaptive Option Presentation

The option surface should adapt to content density.

### Button Mode

Use direct action buttons when:

- option count is small
- each option is short
- scanning cost is low

This is the preferred fast path.

### Select/List Mode

Switch to a single-select list when:

- options are long
- option count is high enough to create visual clutter
- wording is similar enough that direct buttons increase misclick risk

The exact thresholds can stay heuristic in V1.1. A practical first pass is:

- button mode when `options.length <= 4` and no option exceeds a medium text length
- otherwise list mode

## State Transitions

### Enter Pending

The thread becomes pending when:

- a new clarification tool message arrives
- it contains structured `options`
- there is no later human reply

### Resolve Pending

The thread leaves pending when the user:

- clicks an option and submission starts
- sends a freeform reply

### Failure Recovery

If submission fails:

- rollback the optimistic cleared state
- keep the clarification card active
- show an error toast

This prevents the worst failure mode where the UI claims the thread was answered when it was not.

## Edge Cases

### Multiple Clarifications in History

Only the newest unresolved clarification with options should be active.

Older clarifications are treated as resolved once the user has replied and the agent has continued. The sidebar must never show multiple badges for one thread.

### Clarification Without Options

Do not enter `待回复` sidebar state.

Rationale:

- the user's request specifically targets selection scenarios
- generic follow-up questions are too broad for the left-list inbox treatment
- keeping the badge exclusive preserves signal quality

### Freeform Reply That Does Not Match Any Option

Treat it as a valid resolution.

The purpose of the clarification is to unblock the agent, not to enforce a closed answer set.

### Streaming and Thread Switching

If the user switches away from the thread, the pending state remains derived from history and returns automatically when the thread is reopened.

### Duplicate Rendering Risk

Because the current message grouping already creates `assistant:clarification`, the new card must avoid creating both:

- a card
- the same clarification body again as plain markdown

The card becomes the primary rendering for that group.

## Comparative UX Notes

Useful patterns to borrow from other agent products:

- Manus-style quick action: clicking a suggested path should feel immediate
- Codex-style interruption clarity: when the agent is waiting, that state should be obvious outside the transcript
- Inbox mental model: unresolved user action should be visible from the navigation surface

Patterns to avoid:

- forcing the user to retype an answer that already exists as an option
- burying the blocked state inside a long assistant message
- using aggressive warning visuals for routine choices

The correct tone is "action needed," not "error."

## Implementation Plan

### V1

- add pending clarification derivation helper
- add sidebar `待回复` badge and pending-first ordering
- add `ClarificationCard`
- wire option click to existing submit pipeline
- allow manual input to resolve pending state
- update composer placeholder and pending prompt strip

### V1.1

- adaptive fallback to select/list mode for long options
- keyboard shortcuts for choice selection
- pending count indicator near recent chats
- more refined optimistic rollback behavior
- compact sticky reminder when clarification card is out of viewport

## Testing Strategy

### Pure State Tests

Add unit tests for pending-state derivation:

- unresolved clarification with options returns pending state
- later human reply clears pending state
- multiple clarifications choose the newest unresolved one
- clarification without options returns no pending state

### Sidebar Rendering Tests

Verify:

- `待回复` threads render with badge
- pending threads sort before ordinary threads
- non-pending threads preserve normal order

### Transcript/Card Tests

Verify:

- clarification group renders card instead of plain markdown-only output
- short options use button mode
- long options use select/list mode

### Interaction Tests

Verify:

- clicking an option submits the selected text
- freeform input clears pending state
- failed send restores pending state

## Risks

- Deriving state from message history may be slightly more expensive in long thread lists. In practice this should stay acceptable for current limits, but the helper should be cheap and linear.
- If future backend flows emit clarification-like messages outside `ask_clarification`, the derivation helper must remain strict to avoid false positives.
- Optimistic clearing must be carefully scoped so a failed send does not leave the sidebar inconsistent.

## Deferred Backend Enhancement

If V1 proves the interaction value, a later backend optimization can store a denormalized thread summary field such as `pending_clarification_summary`.

That should be treated as a performance optimization only, not as the initial source of truth.

## Success Criteria

The design is successful when:

- users can notice from the sidebar that the agent is waiting on them
- users can resolve option-based clarifications with one click
- users can still answer in their own words
- the thread visibly returns to normal state once answered
- the clarification flow feels like a deliberate interrupt, not like a broken conversation
