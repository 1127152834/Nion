import threading
from types import SimpleNamespace
from unittest.mock import MagicMock

from nion.community.aio_sandbox.aio_sandbox import AioSandbox


def test_execute_command_uses_command_lock():
    commands: list[str] = []

    sandbox = AioSandbox.__new__(AioSandbox)
    sandbox._base_url = "http://sandbox"
    sandbox._home_dir = None
    sandbox._command_lock = threading.Lock()

    def exec_command(*, command: str):
        assert sandbox._command_lock.locked()
        commands.append(command)
        return SimpleNamespace(data=SimpleNamespace(output=f"ok:{command}"))

    sandbox._client = SimpleNamespace(
        shell=SimpleNamespace(exec_command=exec_command),
        file=SimpleNamespace(),
        sandbox=SimpleNamespace(),
    )

    result = sandbox.execute_command("echo a")

    assert result == "ok:echo a"
    assert commands == ["echo a"]


def test_execute_command_retries_when_error_observation_signature_is_returned():
    sandbox = AioSandbox.__new__(AioSandbox)
    sandbox._base_url = "http://sandbox"
    sandbox._home_dir = None
    sandbox._command_lock = threading.Lock()

    calls: list[dict[str, object]] = []

    def exec_command(*, command: str, id: str | None = None):
        calls.append({"command": command, "id": id})
        if len(calls) == 1:
            return SimpleNamespace(
                data=SimpleNamespace(
                    output="'ErrorObservation' object has no attribute 'exit_code'"
                )
            )
        return SimpleNamespace(data=SimpleNamespace(output="ok:retry"))

    sandbox._client = SimpleNamespace(
        shell=SimpleNamespace(exec_command=exec_command),
        file=SimpleNamespace(),
        sandbox=SimpleNamespace(),
    )

    result = sandbox.execute_command("echo retry")

    assert result == "ok:retry"
    assert len(calls) == 2
    assert calls[0]["id"] is None
    assert isinstance(calls[1]["id"], str)
    assert len(calls[1]["id"]) == 36


def test_list_dir_quotes_shell_path_and_holds_lock():
    sandbox = AioSandbox.__new__(AioSandbox)
    sandbox._base_url = "http://sandbox"
    sandbox._home_dir = None
    sandbox._command_lock = threading.Lock()

    original_exec = MagicMock(
        return_value=SimpleNamespace(data=SimpleNamespace(output="/tmp/a\n/tmp/b"))
    )

    def tracking_exec(*, command: str):
        assert sandbox._command_lock.locked()
        return original_exec(command=command)

    sandbox._client = SimpleNamespace(
        shell=SimpleNamespace(exec_command=tracking_exec),
        file=SimpleNamespace(),
        sandbox=SimpleNamespace(),
    )

    result = sandbox.list_dir("/tmp/space dir", max_depth=3)

    assert result == ["/tmp/a", "/tmp/b"]
    original_exec.assert_called_once()
    command = original_exec.call_args.kwargs["command"]
    assert "find '/tmp/space dir' -maxdepth 3" in command
