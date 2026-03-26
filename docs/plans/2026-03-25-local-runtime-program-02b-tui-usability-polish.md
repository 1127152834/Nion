# Local Runtime Program 02B: Codex-Style TUI Interaction Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rework the current Program 02 TUI so its interaction model aligns with Codex and Claude Code expectations: `/` opens one unified command palette for both commands and skills, `@` references files and directories from the current workdir, and the shell becomes visibly usable rather than an empty Textual frame.

**Architecture:** Keep the existing Program 02 daemon and CLI transport intact. Do not add a second runtime or a new command protocol. Instead, refactor the TUI shell around one unified slash palette and one filesystem-oriented `@` mention system, then bind those UI layers to the existing daemon-backed thread/model/skill/file APIs. The shell should show real thread titles and history, let users submit messages and see stream output, and make the palette behavior feel intentional and discoverable, following Codex and Claude Code interaction conventions rather than the previous split `/` versus `@skill:` model.

**Tech Stack:** Python 3.12, Textual, `httpx`, daemon-backed `/api/*` routes, pytest

---

## Pre-Read

Read these before changing code:

- Program 02 plan and design:
  - `docs/plans/2026-03-25-local-runtime-program-02-cli-tui-mvp.md`
  - `docs/plans/2026-03-25-local-runtime-program-02-cli-tui-mvp-design.md`
- Current Program 02 TUI implementation:
  - `backend/packages/harness/nion/cli/tui/app.py`
  - `backend/packages/harness/nion/cli/tui/state.py`
  - `backend/packages/harness/nion/cli/tui/commands.py`
  - `backend/packages/harness/nion/cli/tui/references.py`
  - `backend/packages/harness/nion/cli/tui/stream.py`
- Current daemon-backed read surfaces:
  - `backend/packages/harness/nion/cli/daemon_client.py`
  - `backend/app/gateway/routers/threads.py`
  - `backend/app/gateway/routers/models.py`
  - `backend/app/gateway/routers/skills.py`
  - `backend/app/gateway/routers/files.py`
  - `backend/app/gateway/routers/cli.py`
- Reference shape hints from the desktop app:
  - `frontend/src/core/threads/types.ts`
  - `frontend/src/core/files/api.ts`
  - `frontend/src/core/skills/api.ts`

Relevant execution skills:

- `@superpowers:executing-plans`
- `@superpowers:verification-before-completion`
- `@superpowers:test-driven-development`

Constraints to preserve throughout Program 02B:

- `/` becomes the single unified palette for commands and skills.
- `@` is for current workdir files and directories only.
- Selecting a skill from `/` inserts it into the current draft instead of executing it immediately.
- Do not expand command coverage beyond Program 02’s MVP set unless required by the palette model.
- Keep the shell keyboard-first.
- Do not pull tray/autostart/recovery work into this lane.

## Task 1: Replace the Split Interaction Model With a Unified Slash Palette

**Files:**
- Modify: `backend/packages/harness/nion/cli/tui/commands.py`
- Modify: `backend/packages/harness/nion/cli/tui/state.py`
- Modify: `backend/packages/harness/nion/cli/tui/app.py`
- Create: `backend/tests/test_cli_tui_palette.py`

**Step 1: Write the failing palette tests**

Create `backend/tests/test_cli_tui_palette.py`:

```python
from nion.cli.tui.commands import build_palette_items


def test_palette_contains_commands_and_skills_in_one_list() -> None:
    items = build_palette_items(
        commands=["/new", "/help"],
        skills=[{"name": "ask", "description": "Async ask"}],
    )

    labels = [item["label"] for item in items]
    kinds = {item["label"]: item["kind"] for item in items}

    assert "/new" in labels
    assert "/help" in labels
    assert "/ask" in labels
    assert kinds["/new"] == "command"
    assert kinds["/ask"] == "skill"
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette.py -q
```

Expected: `FAIL` because the current TUI still treats `/` as command-only and has no unified palette builder

**Step 3: Implement the unified palette model**

Refactor `backend/packages/harness/nion/cli/tui/commands.py` so it exports:

```python
COMMANDS = [
    "/new",
    "/threads",
    "/switch",
    "/model",
    "/status",
    "/stop",
    "/retry",
    "/help",
]


def build_palette_items(commands: list[str], skills: list[dict[str, str]]) -> list[dict[str, str]]:
    items = [
        {"label": command, "kind": "command", "description": ""}
        for command in commands
    ]
    items.extend(
        {
            "label": f"/{skill['name']}",
            "kind": "skill",
            "description": skill.get("description", ""),
        }
        for skill in skills
    )
    return items
```

Update `TuiState` to track:

- `palette_query`
- `palette_items`
- `palette_index`
- `palette_visible`

Update `app.py` so:

- typing `/` opens one palette
- both commands and skills appear in the same list
- the palette shows label + description
- arrow keys move selection
- Enter accepts selection
- Esc closes the palette

Do not execute skills directly. That behavior belongs to the next task.

**Step 4: Run the test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette.py tests/test_cli_tui_commands.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/cli/tui/commands.py backend/packages/harness/nion/cli/tui/state.py backend/packages/harness/nion/cli/tui/app.py backend/tests/test_cli_tui_palette.py
git commit -F - <<'EOF'
Replace the split slash model with one unified command-and-skill palette

Constraint: Program 02B must align with Codex and Claude Code, where slash opens one discoverable palette instead of multiple disconnected systems
Rejected: Keep slash command-only and continue using @skill syntax | that diverges from the intended interaction model and adds unnecessary cognitive load
Confidence: high
Scope-risk: moderate
Directive: Keep the slash palette unified; do not split skills back into a second trigger path
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette.py tests/test_cli_tui_commands.py -q
Not-tested: Human evaluation of palette ranking quality under real typing
EOF
```

---

## Task 2: Make Slash-Selected Skills Insert Into the Draft Instead of Executing

**Files:**
- Modify: `backend/packages/harness/nion/cli/tui/app.py`
- Modify: `backend/packages/harness/nion/cli/tui/state.py`
- Create: `backend/tests/test_cli_tui_skill_insert.py`

**Step 1: Write the failing skill-insert test**

Create `backend/tests/test_cli_tui_skill_insert.py`:

```python
from nion.cli.tui.app import NionTuiApp


class SkillStubClient:
    def get_runtime_info(self):
        return {"mode": "local-daemon"}

    def search_threads(self, limit=50):
        return []

    def list_skills(self):
        return [{"name": "ask", "description": "Async ask"}]

    def list_cli_tools(self):
        return []

    def list_thread_files(self, thread_id, depth=3):
        return []


def test_selecting_skill_from_palette_inserts_it_into_draft() -> None:
    app = NionTuiApp("http://127.0.0.1:43115", daemon_client=SkillStubClient())
    app.state.set_draft("hello")

    app._insert_skill_token("ask")

    assert "/ask" in app.state.draft_text
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_skill_insert.py -q
```

Expected: `FAIL` because the shell has no skill insertion helper

**Step 3: Implement skill insertion behavior**

Add `_insert_skill_token(skill_name: str)` in `app.py`:

```python
def _insert_skill_token(self, skill_name: str) -> None:
    token = f"/{skill_name}"
    draft = self.state.draft_text.rstrip()
    next_text = f"{draft} {token}".strip()
    self.state.set_draft(next_text)
```

When the user accepts a palette item with `kind == "skill"`:

- insert the skill token into the draft
- keep focus in the composer
- close the palette
- do not call the daemon or submit the message yet

When the user accepts a palette item with `kind == "command"`:

- run the command behavior immediately as before

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_skill_insert.py tests/test_cli_tui_palette.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/cli/tui/app.py backend/packages/harness/nion/cli/tui/state.py backend/tests/test_cli_tui_skill_insert.py
git commit -F - <<'EOF'
Make slash-selected skills insert into the draft instead of executing

Constraint: Codex-style slash palette entries for skills should enrich the current message, not bypass the message flow
Rejected: Execute skills immediately from palette selection | that would break the unified composer model and surprise users
Confidence: high
Scope-risk: narrow
Directive: Treat skills chosen from slash palette as draft insertions unless a later design explicitly introduces execute-now actions
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_skill_insert.py tests/test_cli_tui_palette.py -q
Not-tested: Human perception of insertion behavior with long drafts
EOF
```

---

## Task 3: Narrow `@` to Files and Directories in the Current Workdir

**Files:**
- Modify: `backend/packages/harness/nion/cli/tui/references.py`
- Modify: `backend/packages/harness/nion/cli/tui/app.py`
- Modify: `backend/packages/harness/nion/cli/daemon_client.py`
- Create: `backend/tests/test_cli_tui_file_mentions.py`

**Step 1: Write the failing file-mention test**

Create `backend/tests/test_cli_tui_file_mentions.py`:

```python
from nion.cli.tui.references import parse_file_reference_trigger


def test_parse_file_reference_trigger_detects_plain_at_prefix() -> None:
    parsed = parse_file_reference_trigger("Open @src/")

    assert parsed is not None
    assert parsed.query == "src/"
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_file_mentions.py -q
```

Expected: `FAIL` because references still expect `@skill:` / `@tool:` / `@file:` prefixes

**Step 3: Refactor `@` mentions to filesystem only**

Replace the old multi-kind parser with:

```python
@dataclass
class FileReferenceTrigger:
    query: str


def parse_file_reference_trigger(text: str) -> FileReferenceTrigger | None:
    ...
```

Behavior:

- `@` opens file/directory suggestions from current thread workdir
- suggestions are based on filesystem paths only
- directories and files should both appear
- no `@skill:` / `@tool:` / `@thread:` syntax remains in this program

Update `daemon_client.py` so file listing returns both directory paths and file paths in one combined suggestion list.

Update the TUI so:

- `@` suggestions only consult the current workdir source
- selecting a result inserts the path token into the current draft

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_file_mentions.py tests/test_cli_tui_suggestions.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/cli/tui/references.py backend/packages/harness/nion/cli/tui/app.py backend/packages/harness/nion/cli/daemon_client.py backend/tests/test_cli_tui_file_mentions.py
git commit -F - <<'EOF'
Limit @ mentions to current-workdir files and directories

Constraint: Program 02B should align with Codex and Claude Code, where @ primarily references filesystem context rather than skills
Rejected: Keep @kind: prefixes for skills and tools | that duplicates slash palette semantics and makes mentions less intuitive
Confidence: high
Scope-risk: moderate
Directive: Treat @ as filesystem-context insertion unless a future design explicitly broadens mention sources
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_file_mentions.py tests/test_cli_tui_suggestions.py -q
Not-tested: Human validation of directory-heavy worktrees with many similar paths
EOF
```

---

## Task 4: Make the Palette and Shell Visually Closer to Codex / Claude Code

**Files:**
- Modify: `backend/packages/harness/nion/cli/tui/app.py`
- Modify: `backend/packages/harness/nion/cli/tui/screens.py`
- Create: `backend/tests/test_cli_tui_palette_layout.py`

**Step 1: Write the failing palette-layout test**

Create `backend/tests/test_cli_tui_palette_layout.py`:

```python
from nion.cli.tui.app import NionTuiApp


def test_tui_css_includes_palette_region_and_composer_focus_rules() -> None:
    css = NionTuiApp.CSS
    assert "#palette" in css
    assert "#composer" in css
    assert "background" in css
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette_layout.py -q
```

Expected: `FAIL` because the current shell still uses split command/reference panels rather than one integrated palette

**Step 3: Rework the visual shell**

Replace the split `#command-panel` and `#reference-panel` with one integrated `#palette` surface that:

- sits directly under the composer like the Codex/Claude Code pattern
- shows highlighted selection
- renders name on the left and description on the right
- shows item kind subtly rather than as the main visual weight

Polish the rest of the shell:

- left rail shows readable thread labels with active highlight
- conversation pane has an explicit empty state
- composer has a visible focus style
- status bar remains compact and muted

Do not chase pixel-perfect cloning. The goal is the same interaction feel and information hierarchy.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette_layout.py tests/test_cli_tui_layout.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/cli/tui/app.py backend/packages/harness/nion/cli/tui/screens.py backend/tests/test_cli_tui_palette_layout.py
git commit -F - <<'EOF'
Rework the TUI shell around a single Codex-style slash palette

Constraint: The shell should feel like one integrated composer-and-palette system, not two stacked helper boxes
Rejected: Keep separate command and reference panels visible at all times | that does not match the intended Codex/Claude Code interaction model
Confidence: medium
Scope-risk: moderate
Directive: Prioritize palette clarity, composer focus, and thread readability over decorative terminal styling
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette_layout.py tests/test_cli_tui_layout.py -q
Not-tested: Human judgment of visual fidelity against Codex/Claude Code
EOF
```

---

## Task 5: Verify the Corrected Interaction Model End-to-End

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `docs/desktop/development.md`

**Step 1: Update docs for corrected semantics**

Document these rules:

- `/` opens one unified palette for commands and skills
- selecting a skill inserts it into the draft
- `@` references files and directories from the current workdir

Do not leave stale `@skill:` guidance anywhere.

**Step 2: Run the full verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette.py tests/test_cli_tui_skill_insert.py tests/test_cli_tui_file_mentions.py tests/test_cli_tui_history.py tests/test_cli_tui_send_flow.py tests/test_cli_tui_suggestions.py tests/test_cli_tui_palette_layout.py tests/test_cli_tui_layout.py tests/test_cli_tui_state.py tests/test_cli_tui_stream.py tests/test_cli_tui_commands.py tests/test_cli_tui_references.py tests/test_cli_daemon_client.py tests/test_cli_help_smoke.py tests/test_local_daemon_control_api.py -q
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python -m nion.cli.main --help
uv run python -m nion.cli.main daemon status
```

Expected: all tests pass and both CLI commands succeed

**Step 3: Manual smoke**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python -m nion.cli.main tui
```

Manual checks:

- `/` opens one unified palette
- commands and skills are in the same list
- selecting a skill inserts it into the draft
- `@` shows current-workdir file/directory suggestions
- thread rail shows titles
- sending a message renders stream output

**Step 4: Commit**

```bash
git add README.md backend/README.md docs/desktop/development.md
git commit -F - <<'EOF'
Document the corrected Codex-style interaction model for the TUI

Constraint: The docs must match the corrected interaction contract once slash and @ semantics are changed
Rejected: Leave stale split-trigger guidance in place | that would confuse users and future implementers about the intended product model
Confidence: medium
Scope-risk: narrow
Directive: Keep slash as the unified palette and keep @ tied to filesystem context in Program 02B docs
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_palette.py tests/test_cli_tui_skill_insert.py tests/test_cli_tui_file_mentions.py tests/test_cli_tui_history.py tests/test_cli_tui_send_flow.py tests/test_cli_tui_suggestions.py tests/test_cli_tui_palette_layout.py tests/test_cli_tui_layout.py tests/test_cli_tui_state.py tests/test_cli_tui_stream.py tests/test_cli_tui_commands.py tests/test_cli_tui_references.py tests/test_cli_daemon_client.py tests/test_cli_help_smoke.py tests/test_local_daemon_control_api.py -q; cd backend && uv run python -m nion.cli.main --help && uv run python -m nion.cli.main daemon status
Not-tested: Human validation across multiple terminal emulators
EOF
```
