from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from nion.sandbox.local.local_sandbox import LocalSandbox
from nion.sandbox.local.local_sandbox_provider import LocalSandboxProvider
from nion.sandbox.tools import (
    VIRTUAL_PATH_PREFIX,
    _apply_cwd_prefix,
    _head_truncate_output,
    _is_acp_workspace_path,
    _is_skills_path,
    _middle_truncate_output,
    _reject_path_traversal,
    _resolve_acp_workspace_path,
    _resolve_and_validate_user_data_path,
    _resolve_skills_path,
    mask_local_paths_in_output,
    replace_virtual_path,
    replace_virtual_paths_in_command,
    validate_local_bash_command_paths,
    validate_local_tool_path,
)

_THREAD_DATA = {
    "workspace_path": "/tmp/nion/threads/t1/user-data/workspace",
    "uploads_path": "/tmp/nion/threads/t1/user-data/uploads",
    "outputs_path": "/tmp/nion/threads/t1/user-data/outputs",
}


# ---------- replace_virtual_path ----------


def test_replace_virtual_path_maps_virtual_root_and_subpaths() -> None:
    assert (
        Path(replace_virtual_path("/mnt/user-data/workspace/a.txt", _THREAD_DATA)).as_posix()
        == "/tmp/nion/threads/t1/user-data/workspace/a.txt"
    )
    assert Path(replace_virtual_path("/mnt/user-data", _THREAD_DATA)).as_posix() == "/tmp/nion/threads/t1/user-data"


# ---------- mask_local_paths_in_output ----------


def test_mask_local_paths_in_output_hides_host_paths() -> None:
    output = "Created: /tmp/nion/threads/t1/user-data/workspace/result.txt"
    masked = mask_local_paths_in_output(output, _THREAD_DATA)

    assert "/tmp/nion/threads/t1/user-data" not in masked
    assert "/mnt/user-data/workspace/result.txt" in masked


def test_mask_local_paths_in_output_hides_skills_host_paths() -> None:
    """Skills host paths in bash output should be masked to virtual paths."""
    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value="/home/user/nion/skills"),
    ):
        output = "Reading: /home/user/nion/skills/public/bootstrap/SKILL.md"
        masked = mask_local_paths_in_output(output, _THREAD_DATA)

        assert "/home/user/nion/skills" not in masked
        assert "/mnt/skills/public/bootstrap/SKILL.md" in masked


# ---------- _reject_path_traversal ----------


def test_reject_path_traversal_blocks_dotdot() -> None:
    with pytest.raises(PermissionError, match="path traversal"):
        _reject_path_traversal("/mnt/user-data/workspace/../../etc/passwd")


def test_reject_path_traversal_blocks_dotdot_at_start() -> None:
    with pytest.raises(PermissionError, match="path traversal"):
        _reject_path_traversal("../etc/passwd")


def test_reject_path_traversal_blocks_backslash_dotdot() -> None:
    with pytest.raises(PermissionError, match="path traversal"):
        _reject_path_traversal("/mnt/user-data/workspace\\..\\..\\etc\\passwd")


def test_reject_path_traversal_allows_normal_paths() -> None:
    # Should not raise
    _reject_path_traversal("/mnt/user-data/workspace/file.txt")
    _reject_path_traversal("/mnt/skills/public/bootstrap/SKILL.md")
    _reject_path_traversal("/mnt/user-data/workspace/sub/dir/file.py")


# ---------- validate_local_tool_path ----------


def test_validate_local_tool_path_rejects_non_virtual_path() -> None:
    with pytest.raises(PermissionError, match="Only paths under"):
        validate_local_tool_path("/Users/someone/config.yaml", _THREAD_DATA)


def test_validate_local_tool_path_rejects_bare_virtual_root() -> None:
    """The bare /mnt/user-data root without trailing slash is not a valid sub-path."""
    with pytest.raises(PermissionError, match="Only paths under"):
        validate_local_tool_path(VIRTUAL_PATH_PREFIX, _THREAD_DATA)


def test_validate_local_tool_path_allows_user_data_paths() -> None:
    # Should not raise — user-data paths are always allowed
    validate_local_tool_path(f"{VIRTUAL_PATH_PREFIX}/workspace/file.txt", _THREAD_DATA)
    validate_local_tool_path(f"{VIRTUAL_PATH_PREFIX}/uploads/doc.pdf", _THREAD_DATA)
    validate_local_tool_path(f"{VIRTUAL_PATH_PREFIX}/outputs/result.csv", _THREAD_DATA)


def test_validate_local_tool_path_allows_user_data_write() -> None:
    # read_only=False (default) should still work for user-data paths
    validate_local_tool_path(f"{VIRTUAL_PATH_PREFIX}/workspace/file.txt", _THREAD_DATA, read_only=False)


def test_validate_local_tool_path_rejects_traversal_in_user_data() -> None:
    """Path traversal via .. in user-data paths must be rejected."""
    with pytest.raises(PermissionError, match="path traversal"):
        validate_local_tool_path(f"{VIRTUAL_PATH_PREFIX}/workspace/../../etc/passwd", _THREAD_DATA)


def test_validate_local_tool_path_rejects_traversal_in_skills() -> None:
    """Path traversal via .. in skills paths must be rejected."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        with pytest.raises(PermissionError, match="path traversal"):
            validate_local_tool_path("/mnt/skills/../../etc/passwd", _THREAD_DATA, read_only=True)


def test_validate_local_tool_path_rejects_none_thread_data() -> None:
    """Missing thread_data should raise SandboxRuntimeError."""
    from nion.sandbox.exceptions import SandboxRuntimeError

    with pytest.raises(SandboxRuntimeError):
        validate_local_tool_path(f"{VIRTUAL_PATH_PREFIX}/workspace/file.txt", None)


# ---------- _resolve_skills_path ----------


def test_resolve_skills_path_resolves_correctly() -> None:
    """Skills virtual path should resolve to host path."""
    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value="/home/user/nion/skills"),
    ):
        resolved = _resolve_skills_path("/mnt/skills/public/bootstrap/SKILL.md")
        assert resolved == "/home/user/nion/skills/public/bootstrap/SKILL.md"


def test_resolve_skills_path_resolves_root() -> None:
    """Skills container root should resolve to host skills directory."""
    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value="/home/user/nion/skills"),
    ):
        resolved = _resolve_skills_path("/mnt/skills")
        assert resolved == "/home/user/nion/skills"


def test_resolve_skills_path_raises_when_not_configured() -> None:
    """Should raise FileNotFoundError when skills directory is not available."""
    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value=None),
    ):
        with pytest.raises(FileNotFoundError, match="Skills directory not available"):
            _resolve_skills_path("/mnt/skills/public/bootstrap/SKILL.md")


# ---------- _resolve_and_validate_user_data_path ----------


def test_resolve_and_validate_user_data_path_resolves_correctly(tmp_path: Path) -> None:
    """Resolved path should land inside the correct thread directory."""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    thread_data = {
        "workspace_path": str(workspace),
        "uploads_path": str(tmp_path / "uploads"),
        "outputs_path": str(tmp_path / "outputs"),
    }
    resolved = _resolve_and_validate_user_data_path("/mnt/user-data/workspace/hello.txt", thread_data)
    assert resolved == str(workspace / "hello.txt")


def test_resolve_and_validate_user_data_path_blocks_traversal(tmp_path: Path) -> None:
    """Even after resolution, path must stay within allowed roots."""
    workspace = tmp_path / "workspace"
    workspace.mkdir()
    thread_data = {
        "workspace_path": str(workspace),
        "uploads_path": str(tmp_path / "uploads"),
        "outputs_path": str(tmp_path / "outputs"),
    }
    # This path resolves outside the allowed roots
    with pytest.raises(PermissionError):
        _resolve_and_validate_user_data_path("/mnt/user-data/workspace/../../../etc/passwd", thread_data)


# ---------- replace_virtual_paths_in_command ----------


def test_replace_virtual_paths_in_command_replaces_skills_paths() -> None:
    """Skills virtual paths in commands should be resolved to host paths."""
    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value="/home/user/nion/skills"),
    ):
        cmd = "cat /mnt/skills/public/bootstrap/SKILL.md"
        result = replace_virtual_paths_in_command(cmd, _THREAD_DATA)
        assert "/mnt/skills" not in result
        assert "/home/user/nion/skills/public/bootstrap/SKILL.md" in result


def test_replace_virtual_paths_in_command_replaces_both() -> None:
    """Both user-data and skills paths should be replaced in the same command."""
    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value="/home/user/skills"),
    ):
        cmd = "cat /mnt/skills/public/SKILL.md > /mnt/user-data/workspace/out.txt"
        result = replace_virtual_paths_in_command(cmd, _THREAD_DATA)
        assert "/mnt/skills" not in result
        assert "/mnt/user-data" not in result
        assert "/home/user/skills/public/SKILL.md" in result
        assert "/tmp/nion/threads/t1/user-data/workspace/out.txt" in result


# ---------- validate_local_bash_command_paths ----------


def test_validate_local_bash_command_paths_blocks_host_paths() -> None:
    with pytest.raises(PermissionError, match="Unsafe absolute paths"):
        validate_local_bash_command_paths("cat /etc/passwd", _THREAD_DATA)


def test_validate_local_bash_command_paths_allows_virtual_and_system_paths() -> None:
    validate_local_bash_command_paths(
        "/bin/echo ok > /mnt/user-data/workspace/out.txt && cat /dev/null",
        _THREAD_DATA,
    )


def test_validate_local_bash_command_paths_blocks_traversal_in_user_data() -> None:
    """Bash commands with traversal in user-data paths should be blocked."""
    with pytest.raises(PermissionError, match="path traversal"):
        validate_local_bash_command_paths(
            "cat /mnt/user-data/workspace/../../etc/passwd",
            _THREAD_DATA,
        )


def test_validate_local_bash_command_paths_blocks_traversal_in_skills() -> None:
    """Bash commands with traversal in skills paths should be blocked."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        with pytest.raises(PermissionError, match="path traversal"):
            validate_local_bash_command_paths(
                "cat /mnt/skills/../../etc/passwd",
                _THREAD_DATA,
            )


def test_validate_local_bash_command_paths_blocks_skills_paths_entirely() -> None:
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        with pytest.raises(PermissionError, match="not available to bash"):
            validate_local_bash_command_paths(
                "echo hacked > /mnt/skills/x.txt",
                _THREAD_DATA,
            )


def test_validate_local_bash_command_paths_blocks_acp_workspace_read_path() -> None:
    with pytest.raises(PermissionError, match="not available to bash"):
        validate_local_bash_command_paths(
            "cat /mnt/acp-workspace/a.txt",
            _THREAD_DATA,
        )


def test_validate_local_bash_command_paths_blocks_acp_workspace_write_path() -> None:
    with pytest.raises(PermissionError, match="not available to bash"):
        validate_local_bash_command_paths(
            "echo x > /mnt/acp-workspace/a.txt",
            _THREAD_DATA,
        )


def test_validate_local_bash_command_paths_blocks_relative_path_escape_to_acp_workspace() -> None:
    with pytest.raises(PermissionError, match="relative path traversal"):
        validate_local_bash_command_paths(
            "cd ..; cd ..; echo hacked > acp-workspace/pwned.txt",
            _THREAD_DATA,
        )


def test_validate_local_bash_command_paths_blocks_python_relative_path_escape() -> None:
    with pytest.raises(PermissionError, match="relative path traversal"):
        validate_local_bash_command_paths(
            'python -c "from pathlib import Path; Path(\'..\').joinpath(\'..\',\'acp-workspace\',\'pyc.txt\').write_text(\'x\')"',
            _THREAD_DATA,
        )


# ---------- Skills path tests ----------


def test_is_skills_path_recognises_default_prefix() -> None:
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        assert _is_skills_path("/mnt/skills") is True
        assert _is_skills_path("/mnt/skills/public/bootstrap/SKILL.md") is True
        assert _is_skills_path("/mnt/skills-extra/foo") is False
        assert _is_skills_path("/mnt/user-data/workspace") is False


def test_validate_local_tool_path_allows_skills_read_only() -> None:
    """read_file / ls should be able to access /mnt/skills paths."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        # Should not raise
        validate_local_tool_path(
            "/mnt/skills/public/bootstrap/SKILL.md",
            _THREAD_DATA,
            read_only=True,
        )


def test_validate_local_tool_path_blocks_skills_write() -> None:
    """write_file / str_replace must NOT write to skills paths."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        with pytest.raises(PermissionError, match="Write access to skills path is not allowed"):
            validate_local_tool_path(
                "/mnt/skills/public/bootstrap/SKILL.md",
                _THREAD_DATA,
                read_only=False,
            )


def test_validate_local_bash_command_paths_blocks_skills_read_path() -> None:
    """bash commands may not access read-only skills mounts."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        with pytest.raises(PermissionError, match="not available to bash"):
            validate_local_bash_command_paths(
                "cat /mnt/skills/public/bootstrap/SKILL.md",
                _THREAD_DATA,
            )


def test_validate_local_bash_command_paths_still_blocks_other_paths() -> None:
    """Paths outside virtual and system prefixes must still be blocked."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"):
        with pytest.raises(PermissionError, match="Unsafe absolute paths"):
            validate_local_bash_command_paths("cat /etc/shadow", _THREAD_DATA)


def test_validate_local_tool_path_skills_custom_container_path() -> None:
    """Skills with a custom container_path in config should also work."""
    with patch("nion.sandbox.tools._get_skills_container_path", return_value="/custom/skills"):
        # Should not raise
        validate_local_tool_path(
            "/custom/skills/public/my-skill/SKILL.md",
            _THREAD_DATA,
            read_only=True,
        )

        # The default /mnt/skills should not match since container path is /custom/skills
        with pytest.raises(PermissionError, match="Only paths under"):
            validate_local_tool_path(
                "/mnt/skills/public/bootstrap/SKILL.md",
                _THREAD_DATA,
                read_only=True,
            )


# ---------- ACP workspace path tests ----------


def test_is_acp_workspace_path_recognises_prefix() -> None:
    assert _is_acp_workspace_path("/mnt/acp-workspace") is True
    assert _is_acp_workspace_path("/mnt/acp-workspace/hello.py") is True
    assert _is_acp_workspace_path("/mnt/acp-workspace-extra/foo") is False
    assert _is_acp_workspace_path("/mnt/user-data/workspace") is False


def test_validate_local_tool_path_allows_acp_workspace_read_only() -> None:
    validate_local_tool_path(
        "/mnt/acp-workspace/hello_world.py",
        _THREAD_DATA,
        read_only=True,
    )


def test_validate_local_tool_path_blocks_acp_workspace_write() -> None:
    with pytest.raises(PermissionError, match="Write access to ACP workspace is not allowed"):
        validate_local_tool_path(
            "/mnt/acp-workspace/hello_world.py",
            _THREAD_DATA,
            read_only=False,
        )


def test_validate_local_bash_command_paths_blocks_acp_workspace_copy_path() -> None:
    with pytest.raises(PermissionError, match="not available to bash"):
        validate_local_bash_command_paths(
            "cp /mnt/acp-workspace/hello_world.py /mnt/user-data/outputs/hello_world.py",
            _THREAD_DATA,
        )


def test_validate_local_bash_command_paths_allows_mcp_filesystem_host_paths() -> None:
    with patch(
        "nion.sandbox.tools._get_mcp_allowed_paths",
        return_value=["/Users/demo/project/"],
    ):
        validate_local_bash_command_paths(
            "cat /Users/demo/project/README.md",
            _THREAD_DATA,
        )


def test_resolve_acp_workspace_path_resolves_correctly(tmp_path: Path) -> None:
    acp_dir = tmp_path / "acp-workspace"
    acp_dir.mkdir()
    with patch("nion.sandbox.tools._get_acp_workspace_host_path", return_value=str(acp_dir)):
        resolved = _resolve_acp_workspace_path("/mnt/acp-workspace/hello.py")
        assert resolved == str(acp_dir / "hello.py")


def test_replace_virtual_paths_in_command_replaces_acp_workspace() -> None:
    acp_host = "/home/user/.nion-data/threads/t1/acp-workspace"
    with patch("nion.sandbox.tools._get_acp_workspace_host_path", return_value=acp_host):
        cmd = "cp /mnt/acp-workspace/hello.py /mnt/user-data/outputs/hello.py"
        result = replace_virtual_paths_in_command(cmd, _THREAD_DATA)
        assert "/mnt/acp-workspace" not in result
        assert f"{acp_host}/hello.py" in result
        assert "/tmp/nion/threads/t1/user-data/outputs/hello.py" in result


def test_mask_local_paths_in_output_hides_acp_workspace_host_paths() -> None:
    acp_host = "/tmp/nion/threads/t1/acp-workspace"
    with patch("nion.sandbox.tools._get_acp_workspace_host_path", return_value=acp_host):
        output = f"Copied: {acp_host}/hello.py"
        masked = mask_local_paths_in_output(output, _THREAD_DATA)

        assert acp_host not in masked
        assert "/mnt/acp-workspace/hello.py" in masked


def test_apply_cwd_prefix_uses_workspace_path() -> None:
    command = "python script.py"
    prefixed = _apply_cwd_prefix(command, _THREAD_DATA)

    assert prefixed.startswith("cd ")
    assert "workspace" in prefixed
    assert prefixed.endswith("&& python script.py")


def test_apply_cwd_prefix_without_thread_data_returns_original() -> None:
    assert _apply_cwd_prefix("pwd", None) == "pwd"


def test_middle_truncate_output_keeps_head_and_tail() -> None:
    value = "A" * 100 + "B" * 100
    truncated = _middle_truncate_output(value, 80)

    assert len(truncated) <= 80
    assert truncated.startswith("A")
    assert truncated.endswith("B" * 25)
    assert "output truncated" in truncated


def test_head_truncate_output_adds_hint() -> None:
    value = "line\n" * 100
    truncated = _head_truncate_output(value, 120)

    assert len(truncated) <= 120
    assert truncated.startswith("line")
    assert "start_line/end_line" in truncated


def test_bash_tool_blocks_local_host_bash_when_disallowed() -> None:
    runtime = SimpleNamespace(
        state={"sandbox": {"sandbox_id": "local"}, "thread_data": _THREAD_DATA},
        context={"thread_id": "thread-1"},
    )

    with (
        patch("nion.sandbox.tools.ensure_sandbox_initialized", return_value=MagicMock()),
        patch("nion.sandbox.tools.ensure_thread_directories_exist"),
        patch("nion.sandbox.tools.is_host_bash_allowed", return_value=False),
    ):
        result = __import__("nion.sandbox.tools", fromlist=["bash_tool"]).bash_tool.func(
            runtime=runtime,
            description="test",
            command="pwd",
        )

    assert "Host bash execution is disabled" in result


def test_bash_tool_allows_local_host_bash_in_host_mode_even_when_global_flag_is_disabled() -> None:
    runtime = SimpleNamespace(
        state={"sandbox": {"sandbox_id": "local"}, "thread_data": _THREAD_DATA},
        context={
            "thread_id": "thread-1",
            "execution_mode": "host",
            "host_workdir": "/tmp/nion-host",
        },
    )
    sandbox = MagicMock()
    sandbox.execute_command.return_value = "/tmp/nion-host\n"

    with (
        patch("nion.sandbox.tools.ensure_sandbox_initialized", return_value=sandbox),
        patch("nion.sandbox.tools.ensure_thread_directories_exist"),
        patch("nion.sandbox.tools.is_host_bash_allowed", return_value=False),
        patch("nion.sandbox.tools.validate_local_bash_command_paths"),
        patch("nion.sandbox.tools.replace_virtual_paths_in_command", side_effect=lambda command, _: command),
        patch("nion.sandbox.tools._apply_cwd_prefix", side_effect=lambda command, _: command),
        patch("nion.sandbox.tools.mask_local_paths_in_output", side_effect=lambda output, _: output),
    ):
        result = __import__("nion.sandbox.tools", fromlist=["bash_tool"]).bash_tool.func(
            runtime=runtime,
            description="test",
            command="pwd",
        )

    assert result == "/tmp/nion-host\n"
    sandbox.execute_command.assert_called_once_with("pwd")


def test_local_sandbox_write_file_blocks_read_only_mapped_path(tmp_path: Path) -> None:
    sandbox = LocalSandbox("local")
    provider = LocalSandboxProvider()
    skills_dir = tmp_path / "skills"
    workspace = tmp_path / "workspace"
    uploads = tmp_path / "uploads"
    outputs = tmp_path / "outputs"
    for directory in (skills_dir, workspace, uploads, outputs):
        directory.mkdir()

    thread_data = {
        "workspace_path": str(workspace),
        "uploads_path": str(uploads),
        "outputs_path": str(outputs),
    }

    with (
        patch("nion.sandbox.tools._get_skills_container_path", return_value="/mnt/skills"),
        patch("nion.sandbox.tools._get_skills_host_path", return_value=str(skills_dir)),
    ):
        provider.configure_path_mappings(sandbox, thread_data)

    with pytest.raises(PermissionError, match="read-only path"):
        sandbox.write_file(str(skills_dir / "public" / "bootstrap" / "SKILL.md"), "changed")


def test_local_sandbox_update_file_blocks_read_only_mapped_path(tmp_path: Path) -> None:
    sandbox = LocalSandbox("local")
    provider = LocalSandboxProvider()
    acp_dir = tmp_path / "thread" / "acp-workspace"
    workspace = tmp_path / "thread" / "user-data" / "workspace"
    uploads = tmp_path / "thread" / "user-data" / "uploads"
    outputs = tmp_path / "thread" / "user-data" / "outputs"
    for directory in (acp_dir, workspace, uploads, outputs):
        directory.mkdir(parents=True, exist_ok=True)

    thread_data = {
        "workspace_path": str(workspace),
        "uploads_path": str(uploads),
        "outputs_path": str(outputs),
    }

    provider.configure_path_mappings(sandbox, thread_data)

    with pytest.raises(PermissionError, match="read-only path"):
        sandbox.update_file(str(acp_dir / "generated.txt"), b"changed")
