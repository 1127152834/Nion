# Notebook AI Assist Panel Redesign

## Why This Redesign Is Needed

The current right rail looks complete, but the core collaboration actions are still mock behavior:

- `生成摘要`
- `重写润色`
- `扩展内容`
- `生成清单`
- `提取行动项`

Problems in the current implementation:

- actions call deterministic placeholder logic instead of real AI capability
- all actions use the same flat interaction model, even though they carry very different risk
- there is no concept of scope
  - current selection
  - current paragraph
  - current note
- import-from-chat is hardcoded fake content
- start-conversation is not clearly connected to the current note context
- apply behavior is too coarse
  - only `replace` or `insert`
  - no distinction between rewriting source text and appending derived artifacts

So the right rail currently feels like a demo, not a trustworthy notebook copilot.

## Product Position

The right rail is not "AI buttons".

It is the **note collaboration surface** for a user-owned notebook.

Its job is to help the user:

- understand a note
- reshape a note
- derive structured outputs from a note
- carry note context into chat
- import useful chat output back into the note

It should behave like a careful writing assistant, not a random content generator.

## Design Principles

### 1. Scope Before Power

AI actions must know what they are acting on.

Supported scopes:

- `当前选中`
- `当前段落`
- `整篇笔记`

V1 fallback:

- if the editor cannot yet expose selection metadata, only show `整篇笔记`
- do not fake selection support

### 2. Derived Output And Destructive Rewrite Are Different

Some actions create side outputs.

Examples:

- summary
- checklist
- action items

Some actions directly modify source prose.

Examples:

- rewrite
- expand

These must not share the same default apply behavior.

### 3. Preview Is Risk-Based, Not Universal

Not every AI action should force the same preview flow.

- destructive text changes must be preview-first
- derived outputs can be faster but still need inspectable results
- all AI results must remain recoverable through note history

### 4. Chat And Notebook Must Form A Loop

The rail must support both directions:

- note -> chat
- chat -> note

This loop is what makes notebook collaboration real.

### 5. The User Must Understand What Will Happen

Every action should communicate:

- what content is being used
- what kind of output will be generated
- where the result will go

## Ask Tab Information Architecture

The `Ask Nion` tab should be rebuilt into four stacked blocks:

### Block A: Working Context

A compact card at the top showing:

- current note title
- current scope
- current action mode summary

Example:

- `作用范围：整篇笔记`
- `输出方式：先预览，再决定替换或插入`

If selection support exists:

- show a tiny excerpt of the selected text

### Block B: Assist Actions

The current five actions stay, but each becomes a real capability contract.

### Block C: From Chat Import

Replace the fake hardcoded chat snippet with a real source selector.

### Block D: Start Conversation

This becomes a context handoff card, not just a generic button.

## Capability Design

### 1. 生成摘要

Goal:

- help users quickly understand or share a note

Default scope:

- whole note

Output shape:

- Markdown summary with stable structure
- recommended format:
  - `一句话总结`
  - `核心要点`
  - `关键决定`
  - `未决问题`

Default interaction:

- click action
- show loading state in-place
- return preview card

Primary apply options:

- `插入为摘要区块`
- `复制`
- `发送到对话`

Do not default to:

- replacing the original note

Reason:

- summary is a derived artifact, not source prose

### 2. 重写润色

Goal:

- improve clarity, structure, tone, and readability without changing meaning

Default scope:

- current selection if available
- otherwise whole note

Required options:

- tone
  - `更清晰`
  - `更正式`
  - `更简洁`

Output shape:

- rewritten prose
- preferably with diff-aware preview if possible

Default interaction:

- open a lightweight config row
- user chooses tone
- generate preview
- preview shows:
  - original excerpt
  - rewritten result

Primary apply options:

- `替换原文`
- `插入到下方`
- `发送到对话继续修改`

This action must be preview-first.

### 3. 扩展内容

Goal:

- continue or enrich a note while staying aligned with existing intent

Default scope:

- current selection if available
- otherwise current note section
- otherwise whole note

Required options:

- expansion intent
  - `补背景`
  - `补细节`
  - `补例子`
  - `补下一步`

Output shape:

- additional prose

Default interaction:

- click action
- choose expansion intent
- preview generated continuation

Primary apply options:

- `插入到当前段落后`
- `追加到文末`
- `发送到对话继续展开`

Do not default to:

- replacing source text

### 4. 生成清单

Goal:

- turn unstructured note content into a practical checklist

Default scope:

- whole note

Output shape:

- Markdown checklist
- preserve headings when possible

Recommended format:

- `## 待办清单`
- grouped checkboxes by topic or section

Default interaction:

- one-click generate
- preview small result card

Primary apply options:

- `插入为清单区块`
- `替换当前区块`
- `复制`

This can be lighter than rewrite, but still should not silently overwrite the note.

### 5. 提取行动项

Goal:

- convert a note into actionable execution items

This is not the same as checklist.

Checklist:

- task formatting

Action items:

- responsibility and follow-up oriented extraction

Output shape:

- structured list with optional fields:
  - task
  - owner
  - due date
  - confidence

Recommended format:

- `## 行动项`
- bullet list or compact table

Default interaction:

- preview result
- surface extraction confidence
- if nothing actionable is found, explain that explicitly instead of hallucinating tasks

Primary apply options:

- `插入为行动项区块`
- `复制`
- `发送到对话拆解执行方案`

## Interaction Model

### Idle State

Show the five actions as cards, but each card should also display one line of intent:

- `生成摘要`: 为当前笔记生成结构化摘要
- `重写润色`: 改善表达但保留原意
- `扩展内容`: 为现有内容补充背景和细节
- `生成清单`: 转成可勾选的执行清单
- `提取行动项`: 抽取可执行任务和跟进点

### Generating State

Each action card should temporarily transform into a progress card.

Display:

- action name
- scope
- small loading copy such as `正在分析当前笔记...`

### Result State

The result area should show:

- result title
- scope badge
- generated content
- warnings if any

Action bar should vary by action type.

Examples:

- summary:
  - `插入摘要`
  - `复制`
  - `发送到对话`
- rewrite:
  - `替换原文`
  - `插入下方`
  - `重新生成`
- action items:
  - `插入行动项`
  - `复制`
  - `发送到对话`

### Failure State

Failures should not be generic toasts only.

The panel itself should show:

- what failed
- whether it was model generation failure, note conflict, or missing scope
- a direct retry button

## From Chat Import Redesign

Current issue:

- hardcoded fake chat snippet

Correct design:

- show real recent conversation candidates
- each candidate includes:
  - source conversation title
  - snippet preview
  - timestamp

When clicking one candidate, show import options:

- `插入到文末`
- `插入为引用区块`
- `替换当前选中`

If no recent chat content exists:

- show an empty state
- `当前没有可导入的对话内容`

## Start Conversation Redesign

Current issue:

- button only means "open a new thread"
- it does not communicate how notebook context is used

Correct design:

- position this block as a context handoff tool

Card copy:

- `带着这篇笔记继续聊`
- `Nion 会把当前笔记作为上下文，帮助你继续分析、改写或拆解任务。`

Primary CTA:

- `开启对话`

Secondary options:

- `带摘要进入`
- `带选中内容进入`

If selection is not available yet:

- only expose `带整篇笔记进入`

## Backend Contract Changes

The current contract is too thin:

- `assist-preview`
- `assist-apply`

It only supports flat action generation and blind apply.

Recommended contract:

### 1. Preview Endpoint

`POST /api/notebook/notes/{note_id}/assist-preview`

Request:

- `action`
- `scope`
  - `whole_note`
  - `selection`
  - `paragraph`
- `selection`
  - offsets or block ids when applicable
- `options`
  - tone
  - expansion intent
  - output format
- `expected_content_hash`

Response:

- `preview_id`
- `action`
- `scope`
- `content`
- `apply_modes`
- `warnings`
- `model`
- `usage`

### 2. Apply Endpoint

`POST /api/notebook/notes/{note_id}/assist-apply`

Request:

- `preview_id`
- `apply_mode`
  - `replace_selection`
  - `replace_note`
  - `insert_after_selection`
  - `append_section`

Response:

- updated note snapshot
- created history entry id

### 3. Chat Import Sources

`GET /api/notebook/import-sources?source=chat`

Response:

- recent importable chat snippets

### 4. Chat Import Apply

Keep existing import apply route but extend it with:

- source id
- import mode
- target position

## Capability Execution Model

These actions should use real AI, not template functions.

Recommended backend layering:

1. notebook router receives action request
2. notebook assist service builds a structured prompt from:
   - note content
   - selected scope
   - user options
3. model client runs generation
4. service normalizes output into notebook-safe Markdown
5. preview is returned with explicit apply modes

Important:

- notebook assist should stay stateless and derivation-focused
- agent diary or memory should not silently leak into notebook assists

## Delivery Order

### Phase 1: Make Existing Buttons Honest

- keep the current five actions
- add real loading, preview, and failure states
- stop hardcoded import content
- differentiate derived-output actions from destructive rewrite actions

### Phase 2: Add Scope And Action Options

- support whole-note scope first
- add selection-aware editing once editor selection contracts exist
- add tone and expansion intent options

### Phase 3: Deepen Note-Chat Loop

- import recent chat snippets
- send preview output into chat
- open conversation with explicit notebook context modes

## Final Recommendation

Do not redesign the right rail as "more buttons".

Redesign it as a **real note copilot workflow**:

- choose scope
- generate trustworthy output
- inspect result
- apply in the right way
- move naturally between note and chat

That is the difference between a decorative AI panel and a notebook collaboration system.
