from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from nion.sandbox.local.local_sandbox import LocalSandbox
from nion.sandbox.tools import glob_tool, grep_tool

_THREAD_DATA = {
    "workspace_path": "/tmp/nion/threads/t1/user-data/workspace",
    "uploads_path": "/tmp/nion/threads/t1/user-data/uploads",
    "outputs_path": "/tmp/nion/threads/t1/user-data/outputs",
}


def test_local_sandbox_glob_returns_sorted_matches(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    (workspace / "src").mkdir(parents=True)
    (workspace / "src" / "alpha.py").write_text("print('a')\n", encoding="utf-8")
    (workspace / "src" / "beta.py").write_text("print('b')\n", encoding="utf-8")
    (workspace / "src" / "notes.txt").write_text("skip\n", encoding="utf-8")

    sandbox = LocalSandbox("local")
    matches = sandbox.glob(str(workspace), "**/*.py")

    assert matches == [
        str((workspace / "src" / "alpha.py").resolve()),
        str((workspace / "src" / "beta.py").resolve()),
    ]


def test_local_sandbox_grep_returns_line_matches(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    (workspace / "src").mkdir(parents=True)
    target = workspace / "src" / "alpha.py"
    target.write_text("first line\nneedle here\nlast line\n", encoding="utf-8")

    sandbox = LocalSandbox("local")
    matches = sandbox.grep(str(workspace), "needle")

    assert matches == [
        {
            "path": str(target.resolve()),
            "line_number": 2,
            "line": "needle here",
        }
    ]


def test_glob_tool_reads_skills_paths_without_leaking_host_paths() -> None:
    runtime = SimpleNamespace(
        state={"sandbox": {"sandbox_id": "local"}, "thread_data": _THREAD_DATA},
        context={"thread_id": "thread-1"},
    )
    sandbox = LocalSandbox("local")
    skills_host = "/Users/demo/.codex/skills"

    with (
        patch("nion.sandbox.tools.ensure_sandbox_initialized", return_value=sandbox),
        patch("nion.sandbox.tools.ensure_thread_directories_exist"),
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value=skills_host),
        patch.object(sandbox, "glob", return_value=[f"{skills_host}/public/bootstrap/SKILL.md"]),
    ):
        result = glob_tool.func(
            runtime=runtime,
            description="find skills",
            path="/mnt/skills",
            pattern="**/*.md",
        )

    assert result == "/mnt/skills/public/bootstrap/SKILL.md"


def test_grep_tool_reads_acp_workspace_without_leaking_host_paths() -> None:
    runtime = SimpleNamespace(
        state={"sandbox": {"sandbox_id": "local"}, "thread_data": _THREAD_DATA},
        context={"thread_id": "thread-1"},
    )
    sandbox = LocalSandbox("local")
    acp_host = "/tmp/nion/threads/t1/acp-workspace"

    with (
        patch("nion.sandbox.tools.ensure_sandbox_initialized", return_value=sandbox),
        patch("nion.sandbox.tools.ensure_thread_directories_exist"),
        patch("nion.sandbox.tools._get_acp_workspace_host_path", return_value=acp_host),
        patch.object(
            sandbox,
            "grep",
            return_value=[
                {
                    "path": f"{acp_host}/agent.py",
                    "line_number": 3,
                    "line": "needle = True",
                }
            ],
        ),
    ):
        result = grep_tool.func(
            runtime=runtime,
            description="search acp",
            path="/mnt/acp-workspace",
            query="needle",
        )

    assert result == "/mnt/acp-workspace/agent.py:3: needle = True"


def test_grep_tool_rejects_non_virtual_host_path() -> None:
    runtime = SimpleNamespace(
        state={"sandbox": {"sandbox_id": "local"}, "thread_data": _THREAD_DATA},
        context={"thread_id": "thread-1"},
    )

    result = grep_tool.func(
        runtime=runtime,
        description="bad path",
        path="/etc",
        query="needle",
    )

    assert result == "Error: Permission denied: /etc"
