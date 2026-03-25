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
