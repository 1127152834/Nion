import threading
from types import SimpleNamespace

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
