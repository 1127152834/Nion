# Local Runtime Program 02: CLI and TUI MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ship a first-class `nion` CLI with daemon management commands and a Hermes-inspired TUI shell that connects to the same local daemon as Electron, supports slash-command autocomplete, and supports `@` references for skills, tools, and files.

**Architecture:** Extend the local daemon with the small set of read and control APIs the TUI needs, then add a Python CLI entrypoint under the existing `nion` package. The CLI should probe or lazy-start the daemon, register itself as a daemon client, and run a terminal UI built on one dedicated TUI framework instead of a hand-rolled REPL. The TUI should stay thin: it owns focus, panes, draft state, slash-command completion, and `@`-reference completion, while the daemon remains the source of truth for threads, runtime state, models, skills, and file listings.

**Tech Stack:** Python 3.12, FastAPI, `NionClient`, `httpx`, `sseclient`-style streaming via `httpx`, `argparse`, Textual, PyInstaller, pytest

---

## Pre-Read

Read these before changing code:

- Program design and sequencing:
  - `docs/plans/2026-03-25-local-runtime-program-00-roadmap-index.md`
  - `docs/plans/2026-03-25-local-runtime-program-02-cli-tui-mvp-design.md`
  - `docs/plans/2026-03-25-local-daemon-electron-cli-design.md`
- Existing local daemon surfaces:
  - `backend/app/daemon/app.py`
  - `backend/app/daemon/main.py`
  - `backend/app/daemon/service.py`
  - `backend/app/daemon/routers/runtime.py`
  - `backend/app/daemon/routers/clients.py`
- Existing compatible runtime APIs the TUI can reuse:
  - `backend/app/gateway/routers/threads.py`
  - `backend/app/gateway/routers/config.py`
  - `backend/app/gateway/routers/models.py`
  - `backend/app/gateway/routers/skills.py`
  - `backend/app/gateway/routers/files.py`
  - `backend/app/gateway/routers/cli.py`
- Existing frontend client behavior for reference payload shapes:
  - `frontend/src/core/api/desktop-client.ts`
  - `frontend/src/core/threads/types.ts`
  - `frontend/src/core/skills/api.ts`
  - `frontend/src/core/files/api.ts`
  - `frontend/src/core/models/api.ts`
  - `frontend/src/core/cli/api.ts`
- Current package root and namespace tests:
  - `backend/packages/harness/pyproject.toml`
  - `backend/packages/harness/nion/__init__.py`
  - `backend/tests/test_nion_namespace.py`

Relevant execution skills:

- `@superpowers:executing-plans`
- `@superpowers:verification-before-completion`
- `@superpowers:test-driven-development`
- `@superpowers:requesting-code-review`

Constraints to preserve throughout Program 02:

- The TUI is a client of the daemon, not a second execution runtime.
- `/` is reserved for commands only.
- `@` is reserved for in-message structured references only.
- Keep the first command set intentionally small: `/new`, `/threads`, `/switch`, `/model`, `/status`, `/stop`, `/retry`, `/help`.
- Keep tray/autostart/recovery/admin/export work out of this program.
- The daemon must stay bound to `127.0.0.1`.
- Prefer one TUI framework and one CLI entrypoint over layered wrappers.

## Task 1: Add the `nion` CLI Entrypoint and Daemon Management Commands

**Files:**
- Modify: `backend/packages/harness/pyproject.toml`
- Create: `backend/packages/harness/nion/cli/__init__.py`
- Create: `backend/packages/harness/nion/cli/main.py`
- Create: `backend/packages/harness/nion/cli/daemon_client.py`
- Create: `backend/packages/harness/nion/cli/process.py`
- Create: `backend/tests/test_cli_entrypoint.py`
- Create: `backend/tests/test_cli_daemon_commands.py`

**Step 1: Write the failing CLI tests**

Create `backend/tests/test_cli_entrypoint.py`:

```python
from importlib import import_module


def test_nion_cli_module_is_importable() -> None:
    module = import_module("nion.cli.main")
    assert hasattr(module, "main")
```

Create `backend/tests/test_cli_daemon_commands.py`:

```python
from nion.cli.main import build_parser


def test_cli_parser_exposes_daemon_and_tui_commands() -> None:
    parser = build_parser()
    actions = [
        action
        for action in parser._actions
        if getattr(action, "choices", None)
    ]
    subcommands = next(action for action in actions if action.dest == "command")

    assert "daemon" in subcommands.choices
    assert "tui" in subcommands.choices
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_entrypoint.py tests/test_cli_daemon_commands.py -q
```

Expected: `FAIL` because `nion.cli` does not exist

**Step 3: Add the CLI package and console entrypoint**

Modify `backend/packages/harness/pyproject.toml` to add:

```toml
[project.scripts]
nion = "nion.cli.main:main"
```

Create `backend/packages/harness/nion/cli/main.py`:

```python
from __future__ import annotations

import argparse


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="nion")
    subparsers = parser.add_subparsers(dest="command", required=True)

    daemon_parser = subparsers.add_parser("daemon")
    daemon_subparsers = daemon_parser.add_subparsers(dest="daemon_command", required=True)
    daemon_subparsers.add_parser("status")
    daemon_subparsers.add_parser("stop")

    subparsers.add_parser("tui")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    ...
```

Create `backend/packages/harness/nion/cli/process.py` for daemon probe/start helpers:

- `is_daemon_alive(base_url) -> bool`
- `ensure_daemon_running() -> str`

Create `backend/packages/harness/nion/cli/daemon_client.py` for daemon management:

- `get_runtime_info(base_url)`
- `stop_daemon(base_url)`

Implement command behavior:

- `nion daemon status` probes daemon and prints runtime info
- `nion daemon stop` calls the daemon stop endpoint once Task 2 adds it
- `nion tui` is stubbed to the future TUI launcher for now

**Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_entrypoint.py tests/test_cli_daemon_commands.py tests/test_nion_namespace.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/pyproject.toml backend/packages/harness/nion/cli/__init__.py backend/packages/harness/nion/cli/main.py backend/packages/harness/nion/cli/daemon_client.py backend/packages/harness/nion/cli/process.py backend/tests/test_cli_entrypoint.py backend/tests/test_cli_daemon_commands.py
git commit -F - <<'EOF'
Create the nion CLI entrypoint for daemon management and TUI launch

Constraint: Program 02 needs one first-class CLI entrypoint under the existing nion package rather than a parallel script tree
Rejected: Add standalone shell scripts for daemon status and TUI launch | that would fragment command semantics and packaging
Confidence: high
Scope-risk: moderate
Directive: Keep nion CLI subcommands centralized in nion.cli.main so later command expansion stays coherent
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_entrypoint.py tests/test_cli_daemon_commands.py tests/test_nion_namespace.py -q
Not-tested: Real console-script installation through wheel packaging
EOF
```

---

## Task 2: Expand the Daemon API for TUI Read and Control Needs

**Files:**
- Modify: `backend/app/daemon/app.py`
- Modify: `backend/app/daemon/service.py`
- Create: `backend/app/daemon/routers/control.py`
- Modify: `backend/app/daemon/routers/__init__.py`
- Create: `backend/tests/test_local_daemon_control_api.py`

**Step 1: Write the failing daemon control test**

Create `backend/tests/test_local_daemon_control_api.py`:

```python
from fastapi.testclient import TestClient

from app.daemon.app import create_app


def test_local_daemon_exposes_status_and_stop_routes() -> None:
    stopped = {"called": False}

    async def shutdown_callback() -> None:
        stopped["called"] = True

    with TestClient(create_app(shutdown_callback=shutdown_callback)) as client:
        status_response = client.get("/api/daemon/runtime-info")
        stop_response = client.post("/api/daemon/stop")

        assert status_response.status_code == 200
        assert stop_response.status_code == 202
        assert stopped["called"] is True
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_control_api.py -q
```

Expected: `FAIL` because `/api/daemon/stop` does not exist

**Step 3: Add the daemon control surface and required read routers**

Create `backend/app/daemon/routers/control.py`:

```python
from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

router = APIRouter(prefix="/api/daemon", tags=["daemon"])


@router.post("/stop", status_code=status.HTTP_202_ACCEPTED)
async def stop_daemon(request: Request) -> Response:
    callback = request.app.state.daemon_shutdown_callback
    if callback is not None:
        result = callback()
        if result is not None:
            await result
    return Response(status_code=status.HTTP_202_ACCEPTED)
```

Update `backend/app/daemon/routers/__init__.py` to export `control`.

Update `backend/app/daemon/app.py` to include additional read routers needed by the TUI:

```python
from app.gateway.routers import cli, config, files, models, skills, threads

app.include_router(control.router)
app.include_router(config.router)
app.include_router(threads.router)
app.include_router(models.router)
app.include_router(skills.router)
app.include_router(files.router)
app.include_router(cli.router)
```

This gives the TUI what it needs for:

- `/model`
- `@skill`
- `@file`
- `@tool`

Keep write scope minimal. Do not mount unrelated routers yet.

**Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_control_api.py tests/test_local_daemon_api.py tests/test_cli_catalog_api.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/app/daemon/app.py backend/app/daemon/service.py backend/app/daemon/routers/control.py backend/app/daemon/routers/__init__.py backend/tests/test_local_daemon_control_api.py
git commit -F - <<'EOF'
Expand the local daemon API for CLI and TUI control surfaces

Constraint: The TUI must talk only to the daemon, so the daemon needs to expose the small read and control surfaces the shell depends on
Rejected: Make the TUI call a mix of daemon and gateway processes | that would break the single-runtime product model
Confidence: high
Scope-risk: moderate
Directive: Add only the daemon-facing routes Program 02 needs; keep broader operator APIs for later programs
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_local_daemon_control_api.py tests/test_local_daemon_api.py tests/test_cli_catalog_api.py -q
Not-tested: Real process stop from a running packaged daemon
EOF
```

---

## Task 3: Introduce the TUI Framework and Shell Layout

**Files:**
- Modify: `backend/packages/harness/pyproject.toml`
- Create: `backend/packages/harness/nion/cli/tui/__init__.py`
- Create: `backend/packages/harness/nion/cli/tui/app.py`
- Create: `backend/packages/harness/nion/cli/tui/screens.py`
- Create: `backend/packages/harness/nion/cli/tui/state.py`
- Create: `backend/tests/test_cli_tui_state.py`

**Step 1: Write the failing TUI state test**

Create `backend/tests/test_cli_tui_state.py`:

```python
from nion.cli.tui.state import TuiState


def test_tui_state_tracks_selected_thread_and_draft() -> None:
    state = TuiState()

    state.set_selected_thread("thread-1")
    state.set_draft("hello")

    assert state.selected_thread_id == "thread-1"
    assert state.draft_text == "hello"
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_state.py -q
```

Expected: `FAIL` because `nion.cli.tui` does not exist

**Step 3: Add the TUI framework and minimal shell**

Modify `backend/packages/harness/pyproject.toml` to add one dedicated TUI dependency:

```toml
dependencies = [
  ...
  "textual>=0.78.0",
]
```

Create `backend/packages/harness/nion/cli/tui/state.py`:

```python
from dataclasses import dataclass, field


@dataclass
class TuiState:
    selected_thread_id: str | None = None
    draft_text: str = ""
    command_query: str = ""
    mention_query: str = ""
    streaming: bool = False
    thread_ids: list[str] = field(default_factory=list)

    def set_selected_thread(self, thread_id: str | None) -> None:
        self.selected_thread_id = thread_id

    def set_draft(self, text: str) -> None:
        self.draft_text = text
```

Create `backend/packages/harness/nion/cli/tui/app.py` with a minimal Textual app:

- left pane placeholder for threads
- main transcript pane
- multiline composer
- status bar

Update `nion.cli.main` so `nion tui` launches this app.

Do not add slash-command or `@` logic yet. This task is layout and state only.

**Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_state.py tests/test_cli_entrypoint.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/pyproject.toml backend/packages/harness/nion/cli/tui/__init__.py backend/packages/harness/nion/cli/tui/app.py backend/packages/harness/nion/cli/tui/screens.py backend/packages/harness/nion/cli/tui/state.py backend/tests/test_cli_tui_state.py
git commit -F - <<'EOF'
Create the TUI shell foundation for nion

Constraint: Program 02 needs a product-grade terminal shell, not a line-oriented REPL
Rejected: Hand-roll a curses or input loop MVP | it would slow down autocomplete, pane layout, and future keyboard UX
Confidence: medium
Scope-risk: moderate
Directive: Keep the TUI framework isolated under nion.cli.tui so later command and reference logic can evolve without mixing with daemon clients
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_state.py tests/test_cli_entrypoint.py -q
Not-tested: Interactive terminal rendering under real user input
EOF
```

---

## Task 4: Implement Slash Commands and `@` Reference Autocomplete

**Files:**
- Create: `backend/packages/harness/nion/cli/tui/commands.py`
- Create: `backend/packages/harness/nion/cli/tui/references.py`
- Modify: `backend/packages/harness/nion/cli/tui/state.py`
- Modify: `backend/packages/harness/nion/cli/tui/app.py`
- Create: `backend/tests/test_cli_tui_commands.py`
- Create: `backend/tests/test_cli_tui_references.py`

**Step 1: Write the failing autocomplete tests**

Create `backend/tests/test_cli_tui_commands.py`:

```python
from nion.cli.tui.commands import COMMANDS, complete_command


def test_complete_command_filters_by_prefix() -> None:
    assert "/new" in COMMANDS
    assert complete_command("/st") == ["/status", "/stop"]
```

Create `backend/tests/test_cli_tui_references.py`:

```python
from nion.cli.tui.references import parse_reference_trigger


def test_parse_reference_trigger_detects_skill_reference() -> None:
    parsed = parse_reference_trigger("Use @skill:research-helper now")

    assert parsed.kind == "skill"
    assert parsed.query == "research-helper"
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_commands.py tests/test_cli_tui_references.py -q
```

Expected: `FAIL` because the command/reference modules do not exist

**Step 3: Implement commands and references**

Create `backend/packages/harness/nion/cli/tui/commands.py`:

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


def complete_command(prefix: str) -> list[str]:
    return [command for command in COMMANDS if command.startswith(prefix)]
```

Create `backend/packages/harness/nion/cli/tui/references.py`:

```python
from dataclasses import dataclass
import re


REFERENCE_RE = re.compile(r"@(?P<kind>skill|tool|file|thread):(?P<query>[^\s]+)")


@dataclass
class ReferenceTrigger:
    kind: str
    query: str


def parse_reference_trigger(text: str) -> ReferenceTrigger | None:
    match = REFERENCE_RE.search(text)
    if not match:
        return None
    return ReferenceTrigger(
        kind=match.group("kind"),
        query=match.group("query"),
    )
```

Update `app.py` and `state.py` so:

- `/` opens command suggestions
- `@skill:` / `@tool:` / `@file:` trigger reference suggestions
- selected command executes or opens a selection view
- selected reference inserts a structured token into draft state

For this MVP, the structured token can be a dataclass stored in draft state alongside display text.

**Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_commands.py tests/test_cli_tui_references.py tests/test_cli_tui_state.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/cli/tui/commands.py backend/packages/harness/nion/cli/tui/references.py backend/packages/harness/nion/cli/tui/state.py backend/packages/harness/nion/cli/tui/app.py backend/tests/test_cli_tui_commands.py backend/tests/test_cli_tui_references.py
git commit -F - <<'EOF'
Add slash-command and @reference autocomplete to the nion TUI

Constraint: Program 02 must keep slash commands and in-message references as separate interaction systems
Rejected: Put both commands and references behind slash syntax | that would blur command semantics and hurt discoverability
Confidence: high
Scope-risk: moderate
Directive: Keep slash command behavior action-oriented and keep @references as structured message content only
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tui_commands.py tests/test_cli_tui_references.py tests/test_cli_tui_state.py -q
Not-tested: Full interactive autocomplete behavior in a real terminal
EOF
```

---

## Task 5: Connect the TUI to Threads, Streaming, and Runtime Metadata

**Files:**
- Modify: `backend/packages/harness/nion/cli/daemon_client.py`
- Modify: `backend/packages/harness/nion/cli/process.py`
- Modify: `backend/packages/harness/nion/cli/tui/app.py`
- Create: `backend/packages/harness/nion/cli/tui/stream.py`
- Create: `backend/tests/test_cli_tui_stream.py`
- Create: `backend/tests/test_cli_daemon_client.py`

**Step 1: Write the failing daemon-client tests**

Create `backend/tests/test_cli_daemon_client.py`:

```python
from nion.cli.daemon_client import build_threads_base_url


def test_build_threads_base_url_joins_daemon_host_and_threads_route() -> None:
    assert build_threads_base_url("http://127.0.0.1:43115") == "http://127.0.0.1:43115/api/threads"
```

Create `backend/tests/test_cli_tui_stream.py`:

```python
from nion.cli.tui.stream import normalize_stream_event


def test_normalize_stream_event_handles_created_event() -> None:
    event = normalize_stream_event("created", {"thread_id": "thread-1"})
    assert event["thread_id"] == "thread-1"
```

**Step 2: Run the tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_daemon_client.py tests/test_cli_tui_stream.py -q
```

Expected: `FAIL` because the helpers do not exist

**Step 3: Implement daemon-backed TUI runtime behavior**

Extend `daemon_client.py` to provide:

- runtime probe
- thread search
- thread state load
- message stream submission
- models list
- skills list
- file tree/meta lookup
- CLI catalog lookup

Create `backend/packages/harness/nion/cli/tui/stream.py` for parsing SSE events into renderable state.

Update `app.py` so the TUI:

- loads thread list on startup
- lets users switch threads
- sends chat payloads through daemon stream API
- renders stream events incrementally in the transcript pane
- updates status bar with model / daemon / streaming state

The `/model` command should call daemon-backed model listing.

The `@skill`, `@tool`, and `@file` suggestion lists should be hydrated from daemon APIs, not hard-coded.

**Step 4: Run the tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_daemon_client.py tests/test_cli_tui_stream.py tests/test_cli_tui_commands.py tests/test_cli_tui_references.py -q
```

Expected: `PASS`

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/cli/daemon_client.py backend/packages/harness/nion/cli/process.py backend/packages/harness/nion/cli/tui/app.py backend/packages/harness/nion/cli/tui/stream.py backend/tests/test_cli_daemon_client.py backend/tests/test_cli_tui_stream.py
git commit -F - <<'EOF'
Connect the nion TUI to daemon-backed threads and streaming

Constraint: The TUI must stay a thin client of the daemon and must not grow its own execution runtime
Rejected: Reimplement thread execution locally inside the CLI | that would fork runtime semantics away from Electron
Confidence: high
Scope-risk: moderate
Directive: All TUI data loading and streaming should flow through daemon_client helpers so later CLI surfaces can reuse the same transport
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_daemon_client.py tests/test_cli_tui_stream.py tests/test_cli_tui_commands.py tests/test_cli_tui_references.py -q
Not-tested: Full interactive end-to-end chat loop in a real terminal
EOF
```

---

## Task 6: Document CLI Usage and Run Program 02 Verification

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `docs/desktop/development.md`
- Create: `backend/tests/test_cli_help_smoke.py`

**Step 1: Write the failing CLI smoke test**

Create `backend/tests/test_cli_help_smoke.py`:

```python
import subprocess
import sys


def test_nion_cli_help_smoke() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "nion.cli.main", "--help"],
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0
    assert "daemon" in result.stdout
    assert "tui" in result.stdout
```

**Step 2: Run the test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_help_smoke.py -q
```

Expected: `FAIL` until the CLI entrypoint is fully wired

**Step 3: Update docs**

Modify `README.md` to add:

- `nion daemon status`
- `nion daemon stop`
- `nion tui`

Modify `backend/README.md` to explain:

- the daemon now serves both Electron and CLI
- Program 02 introduces a TUI client

Modify `docs/desktop/development.md` to clarify:

- Electron and TUI share the same daemon
- `allow_background_running` affects Electron detach semantics, not active CLI sessions

**Step 4: Run the full verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
UV_LINK_MODE=copy uv run pytest tests/test_cli_entrypoint.py tests/test_cli_daemon_commands.py tests/test_cli_tui_state.py tests/test_cli_tui_commands.py tests/test_cli_tui_references.py tests/test_cli_daemon_client.py tests/test_cli_tui_stream.py tests/test_cli_help_smoke.py tests/test_local_daemon_control_api.py -q
```

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python -m nion.cli.main daemon status
uv run python -m nion.cli.main --help
```

Expected:

- all tests `PASS`
- `daemon status` returns a useful runtime summary
- `--help` shows `daemon` and `tui`

**Step 5: Manual smoke test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run python -m nion.cli.main tui
```

Manual checks:

- TUI shell opens
- thread list renders
- `/help` autocomplete appears
- `@skill:` suggestions appear
- sending a message streams output
- closing the TUI unregisters the CLI client but does not kill daemon policy incorrectly

**Step 6: Commit**

```bash
git add README.md backend/README.md docs/desktop/development.md backend/tests/test_cli_help_smoke.py
git commit -F - <<'EOF'
Document and verify the Program 02 CLI and TUI MVP

Constraint: Once nion becomes a user-facing CLI, the docs must explain daemon-sharing behavior and the core commands clearly
Rejected: Leave CLI behavior implicit in code only | that would make the second primary product surface hard to discover and support
Confidence: medium
Scope-risk: narrow
Directive: Keep Program 02 documentation focused on daemon status, daemon stop, and tui flows; defer broader command documentation to Program 03
Tested: cd backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_entrypoint.py tests/test_cli_daemon_commands.py tests/test_cli_tui_state.py tests/test_cli_tui_commands.py tests/test_cli_tui_references.py tests/test_cli_daemon_client.py tests/test_cli_tui_stream.py tests/test_cli_help_smoke.py tests/test_local_daemon_control_api.py -q; cd backend && uv run python -m nion.cli.main daemon status && uv run python -m nion.cli.main --help
Not-tested: Human-validated TUI interaction beyond the manual smoke checklist
EOF
```
