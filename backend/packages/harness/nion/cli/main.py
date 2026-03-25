from __future__ import annotations

import argparse
import json

from .daemon_client import get_runtime_info, stop_daemon
from .process import ensure_daemon_running


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="nion")
    subparsers = parser.add_subparsers(dest="command", required=True)

    daemon_parser = subparsers.add_parser("daemon")
    daemon_subparsers = daemon_parser.add_subparsers(
        dest="daemon_command",
        required=True,
    )
    daemon_subparsers.add_parser("status")
    daemon_subparsers.add_parser("stop")

    subparsers.add_parser("tui")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if args.command == "daemon":
        base_url = ensure_daemon_running()
        if args.daemon_command == "status":
            print(json.dumps(get_runtime_info(base_url), ensure_ascii=False))
            return 0
        if args.daemon_command == "stop":
            stop_daemon(base_url)
            return 0

    if args.command == "tui":
        from .tui.app import NionTuiApp

        base_url = ensure_daemon_running()
        NionTuiApp(base_url).run()
        return 0

    parser.error("unknown command")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
