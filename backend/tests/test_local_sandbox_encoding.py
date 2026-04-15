import builtins
import os

import nion.sandbox.local.local_sandbox as local_sandbox
from nion.sandbox.local.local_sandbox import LocalSandbox


def _open(base, file, mode="r", *args, **kwargs):
    if "b" in mode:
        return base(file, mode, *args, **kwargs)
    return base(file, mode, *args, encoding=kwargs.pop("encoding", "gbk"), **kwargs)


def test_read_file_uses_utf8_on_windows_locale(tmp_path, monkeypatch):
    path = tmp_path / "utf8.txt"
    text = "\u201cutf8\u201d"
    path.write_text(text, encoding="utf-8")
    base = builtins.open

    monkeypatch.setattr(local_sandbox, "open", lambda file, mode="r", *args, **kwargs: _open(base, file, mode, *args, **kwargs), raising=False)

    assert LocalSandbox("t").read_file(str(path)) == text


def test_write_file_uses_utf8_on_windows_locale(tmp_path, monkeypatch):
    path = tmp_path / "utf8.txt"
    text = "emoji \U0001F600"
    base = builtins.open

    monkeypatch.setattr(local_sandbox, "open", lambda file, mode="r", *args, **kwargs: _open(base, file, mode, *args, **kwargs), raising=False)

    LocalSandbox("t").write_file(str(path), text)

    assert path.read_text(encoding="utf-8") == text


def test_get_shell_prefers_windows_shells_when_posix_shells_are_missing(monkeypatch):
    def fake_isfile(path: str) -> bool:
        return path in {"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"}

    def fake_access(path: str, mode: int) -> bool:
        return path in {"C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"}

    def fake_which(name: str) -> str | None:
        if name == "pwsh":
            return "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
        if name == "powershell":
            return "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
        if name == "cmd":
            return "C:\\Windows\\System32\\cmd.exe"
        return None

    monkeypatch.setattr(local_sandbox.os.path, "isfile", fake_isfile)
    monkeypatch.setattr(local_sandbox.os, "access", fake_access)
    monkeypatch.setattr(local_sandbox.shutil, "which", fake_which)

    assert LocalSandbox._get_shell() == "C:\\Program Files\\PowerShell\\7\\pwsh.exe"
