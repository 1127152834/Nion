import os
import shutil
import subprocess
from dataclasses import dataclass

from nion.sandbox.local.list_dir import list_dir
from nion.sandbox.sandbox import Sandbox
from nion.sandbox.search import GrepMatch, glob_search, grep_search


@dataclass(frozen=True, slots=True)
class PathMapping:
    host_path: str
    virtual_path: str
    read_only: bool = False


class LocalSandbox(Sandbox):
    def __init__(self, id: str):
        """
        Initialize local sandbox.

        Args:
            id: Sandbox identifier
        """
        super().__init__(id)
        self._path_mappings: tuple[PathMapping, ...] = ()

    def set_path_mappings(self, path_mappings: list[PathMapping]) -> None:
        self._path_mappings = tuple(sorted(path_mappings, key=lambda item: len(item.host_path), reverse=True))

    def _ensure_writable_path(self, path: str) -> None:
        normalized = os.path.normcase(os.path.abspath(path))
        for mapping in self._path_mappings:
            host_root = os.path.normcase(os.path.abspath(mapping.host_path))
            if normalized == host_root or normalized.startswith(f"{host_root}{os.sep}"):
                if mapping.read_only:
                    raise PermissionError(f"Cannot write to read-only path: {path}")
                return

    @staticmethod
    def _get_shell() -> str:
        """Detect available shell executable with fallback.

        Returns the first available shell in order of preference:
        /bin/zsh → /bin/bash → /bin/sh → first `sh` found on PATH.
        Raises a RuntimeError if no suitable shell is found.
        """
        for shell in ("/bin/zsh", "/bin/bash", "/bin/sh"):
            if os.path.isfile(shell) and os.access(shell, os.X_OK):
                return shell
        shell_from_path = shutil.which("sh")
        if shell_from_path is not None:
            return shell_from_path
        raise RuntimeError("No suitable shell executable found. Tried /bin/zsh, /bin/bash, /bin/sh, and `sh` on PATH.")

    def execute_command(self, command: str) -> str:
        result = subprocess.run(
            command,
            executable=self._get_shell(),
            shell=True,
            capture_output=True,
            text=True,
            timeout=600,
        )
        output = result.stdout
        if result.stderr:
            output += f"\nStd Error:\n{result.stderr}" if output else result.stderr
        if result.returncode != 0:
            output += f"\nExit Code: {result.returncode}"

        return output if output else "(no output)"

    def list_dir(self, path: str, max_depth=2) -> list[str]:
        return list_dir(path, max_depth)

    def read_file(self, path: str) -> str:
        with open(path, encoding="utf-8") as f:
            return f.read()

    def write_file(self, path: str, content: str, append: bool = False) -> None:
        self._ensure_writable_path(path)
        dir_path = os.path.dirname(path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        mode = "a" if append else "w"
        with open(path, mode, encoding="utf-8") as f:
            f.write(content)

    def update_file(self, path: str, content: bytes) -> None:
        self._ensure_writable_path(path)
        dir_path = os.path.dirname(path)
        if dir_path:
            os.makedirs(dir_path, exist_ok=True)
        with open(path, "wb") as f:
            f.write(content)

    def glob(self, path: str, pattern: str) -> list[str]:
        return glob_search(path, pattern)

    def grep(self, path: str, query: str) -> list[GrepMatch]:
        return grep_search(path, query)
