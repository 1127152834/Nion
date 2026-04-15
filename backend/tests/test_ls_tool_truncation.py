from types import SimpleNamespace
from unittest.mock import patch

from nion.sandbox.tools import ls_tool


def test_ls_tool_truncates_large_output_for_local_sandbox():
    runtime = SimpleNamespace(
        state={},
        context={"thread_id": "thread-1"},
        config={},
    )
    huge_listing = [f"/mnt/user-data/workspace/file-{index:04d}.txt" for index in range(2000)]
    sandbox = SimpleNamespace(list_dir=lambda path: huge_listing)

    with (
        patch("nion.sandbox.tools.ensure_sandbox_initialized", return_value=sandbox),
        patch("nion.sandbox.tools.ensure_thread_directories_exist"),
        patch("nion.sandbox.tools._configure_local_sandbox_path_mappings"),
        patch("nion.sandbox.tools.is_local_sandbox", return_value=False),
        patch("nion.sandbox.tools._get_sandbox_output_limit", return_value=120),
    ):
        result = ls_tool.func(
            runtime=runtime,
            description="list files",
            path="/mnt/user-data/workspace",
        )

    assert len(result) <= 120
    assert "file-0000" in result
    assert "output truncated" in result
