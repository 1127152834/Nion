from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from nion.automation.models import AutomationExecutionOutput, AutomationJob


def run_packaged_script(
    job: AutomationJob,
    *,
    trigger_event_name: str | None = None,
    trigger_event_payload: dict | None = None,
) -> AutomationExecutionOutput:
    if not job.package_dir:
        raise FileNotFoundError("Event task package directory is not configured")

    package_dir = Path(job.package_dir).resolve()
    entrypoint = str(job.action_spec.get("entrypoint") or "").strip()
    if not entrypoint:
        raise FileNotFoundError("Event task script entrypoint is not configured")

    script_path = (package_dir / entrypoint).resolve()
    try:
        script_path.relative_to(package_dir)
    except ValueError as exc:
        raise PermissionError(f"Script entrypoint escapes package directory: {entrypoint}") from exc

    if not script_path.exists():
        raise FileNotFoundError(f"Event task script entrypoint not found: {entrypoint}")

    command = _build_command(script_path)
    env = os.environ.copy()
    env["NION_HOOK_ID"] = job.id
    env["NION_HOOK_PACKAGE_DIR"] = str(package_dir)
    if trigger_event_name:
        env["NION_HOOK_EVENT_NAME"] = trigger_event_name
    if trigger_event_payload is not None:
        env["NION_HOOK_EVENT_PAYLOAD"] = json.dumps(trigger_event_payload, ensure_ascii=False)

    completed = subprocess.run(
        command,
        cwd=package_dir,
        env=env,
        capture_output=True,
        text=True,
        check=True,
        timeout=int(job.action_spec.get("timeout_seconds") or 30),
    )
    response_text = completed.stdout.strip() or completed.stderr.strip()
    return AutomationExecutionOutput(response_text=response_text)


def _build_command(script_path: Path) -> list[str]:
    suffix = script_path.suffix.lower()
    if suffix == ".py":
        return [sys.executable, str(script_path)]
    if suffix in {".sh", ".bash"}:
        return ["/bin/sh", str(script_path)]
    if suffix in {".js", ".mjs", ".cjs"}:
        node = shutil.which("node")
        if not node:
            raise FileNotFoundError("Node.js is required to run packaged JavaScript hooks")
        return [node, str(script_path)]
    if suffix == ".ts":
        tsx = shutil.which("tsx")
        if tsx:
            return [tsx, str(script_path)]
        raise FileNotFoundError("tsx is required to run packaged TypeScript hooks")
    raise ValueError(f"Unsupported packaged script type: {script_path.suffix or '<none>'}")
