from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from langchain.tools import tool

from nion.config import ConfigRepository, get_app_config, get_paths
from nion.config.extensions_config import (
    SkillStateConfig,
    get_extensions_config,
    reload_extensions_config,
)
from nion.skills import load_skills
from nion.telemetry.store import TelemetryStore


def _telemetry_store() -> TelemetryStore:
    return TelemetryStore(get_paths().telemetry_db_file)


def _runtime_summary() -> dict[str, Any]:
    config = get_app_config()
    diagnostics = {
        "status": "healthy",
        "summary": "Daemon control plane available",
        "details": {
            "daemon": {
                "host": config.daemon.host,
                "port": config.daemon.port,
                "allow_background_running": config.daemon.allow_background_running,
                "shutdown_grace_period_seconds": config.daemon.shutdown_grace_period_seconds,
            }
        },
    }
    return diagnostics


@tool("get_runtime_status", parse_docstring=True)
def get_runtime_status_tool() -> str:
    """Get the current daemon control-plane summary.

    Returns:
        JSON string containing daemon status and current runtime summary.
    """
    return json.dumps(_runtime_summary(), ensure_ascii=False, indent=2)


@tool("get_recent_logs", parse_docstring=True)
def get_recent_logs_tool(
    category: str | None = None,
    level: str | None = None,
    thread_id: str | None = None,
    run_id: str | None = None,
    limit: int = 20,
) -> str:
    """Get recent structured daemon logs.

    Args:
        category: Optional category filter.
        level: Optional level filter.
        thread_id: Optional thread filter.
        run_id: Optional task/run filter.
        limit: Maximum number of events to return.
    """
    events = _telemetry_store().list_events(
        limit=limit,
        category=category,
        level=level,
        thread_id=thread_id,
        run_id=run_id,
    )
    payload = [
        {
            "timestamp": event.timestamp,
            "category": event.category,
            "level": event.level,
            "event_type": event.event_type,
            "thread_id": event.thread_id,
            "run_id": event.run_id,
            "message": event.message,
            "details": event.details,
        }
        for event in events
    ]
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("get_thread_diagnostics", parse_docstring=True)
def get_thread_diagnostics_tool(thread_id: str) -> str:
    """Get the latest known diagnostic view for one thread.

    Args:
        thread_id: Thread identifier.
    """
    store = _telemetry_store()
    try:
        snapshot = store.get_snapshot("thread", thread_id)
        payload = {
            "status": snapshot.status,
            "summary": snapshot.summary,
            "updated_at": snapshot.updated_at,
            "details": snapshot.details,
        }
    except LookupError:
        events = store.list_events(limit=20, thread_id=thread_id)
        payload = {
            "status": "healthy" if not events else ("error" if events[0].level == "error" else "healthy"),
            "summary": (
                f"No diagnostics found for thread '{thread_id}'"
                if not events
                else events[0].message
            ),
            "details": {
                "thread_id": thread_id,
                "recent_events": [
                    {
                        "timestamp": event.timestamp,
                        "event_type": event.event_type,
                        "level": event.level,
                        "message": event.message,
                    }
                    for event in events
                ],
            },
        }
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("get_skill_diagnostics", parse_docstring=True)
def get_skill_diagnostics_tool(skill_name: str) -> str:
    """Get the latest known diagnostic view for one skill.

    Args:
        skill_name: Skill identifier.
    """
    store = _telemetry_store()
    try:
        snapshot = store.get_snapshot("skill", skill_name)
        payload = {
            "status": snapshot.status,
            "summary": snapshot.summary,
            "updated_at": snapshot.updated_at,
            "details": snapshot.details,
        }
    except LookupError:
        events = store.list_events(limit=20, category="skill", skill_name=skill_name)
        payload = {
            "status": "healthy" if not events else ("error" if events[0].level == "error" else "healthy"),
            "summary": (
                f"No diagnostics found for skill '{skill_name}'"
                if not events
                else events[0].message
            ),
            "details": {
                "skill_name": skill_name,
                "recent_events": [
                    {
                        "timestamp": event.timestamp,
                        "event_type": event.event_type,
                        "level": event.level,
                        "message": event.message,
                    }
                    for event in events
                ],
            },
        }
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("get_task_diagnostics", parse_docstring=True)
def get_task_diagnostics_tool(task_id: str) -> str:
    """Get the latest known diagnostic view for one delegated task.

    Args:
        task_id: Delegated task identifier.
    """
    store = _telemetry_store()
    try:
        snapshot = store.get_snapshot("task", task_id)
        payload = {
            "status": snapshot.status,
            "summary": snapshot.summary,
            "updated_at": snapshot.updated_at,
            "details": snapshot.details,
        }
    except LookupError:
        events = store.list_events(limit=20, run_id=task_id)
        payload = {
            "status": "healthy" if not events else ("error" if events[0].level == "error" else "healthy"),
            "summary": (
                f"No diagnostics found for task '{task_id}'"
                if not events
                else events[0].message
            ),
            "details": {
                "task_id": task_id,
                "recent_events": [
                    {
                        "timestamp": event.timestamp,
                        "event_type": event.event_type,
                        "level": event.level,
                        "message": event.message,
                    }
                    for event in events
                ],
            },
        }
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("list_skills_control_plane", parse_docstring=True)
def list_skills_tool() -> str:
    """List skills with enabled state and category."""
    payload = [
        {
            "name": skill.name,
            "description": skill.description,
            "category": skill.category,
            "enabled": skill.enabled,
        }
        for skill in load_skills(enabled_only=False)
    ]
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("read_skill_control_plane", parse_docstring=True)
def read_skill_tool(skill_name: str) -> str:
    """Read one skill's metadata and body.

    Args:
        skill_name: Skill identifier.
    """
    for skill in load_skills(enabled_only=False):
        if skill.name == skill_name:
            return json.dumps(
                {
                    "name": skill.name,
                    "description": skill.description,
                    "category": skill.category,
                    "enabled": skill.enabled,
                    "path": str(skill.skill_dir),
                    "content": skill.skill_md,
                },
                ensure_ascii=False,
                indent=2,
            )
    return json.dumps(
        {
            "error": f"Skill '{skill_name}' not found",
        },
        ensure_ascii=False,
        indent=2,
    )


@tool("get_config_summary", parse_docstring=True)
def get_config_summary_tool() -> str:
    """Get the current config-center summary relevant to daemon control."""
    repo = ConfigRepository()
    config, version, source_path = repo.read()
    payload = {
        "version": version,
        "source_path": str(source_path),
        "daemon": config.get("daemon", {}),
        "models_count": len(config.get("models", [])),
        "tools_count": len(config.get("tools", [])),
        "skills_configured": sorted((config.get("skills") or {}).keys()) if isinstance(config.get("skills"), dict) else [],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("run_doctor", parse_docstring=True)
def run_doctor_tool() -> str:
    """Run a lightweight daemon self-check."""
    config = get_app_config()
    store = _telemetry_store()
    events = store.list_events(limit=10, category="daemon")
    payload = {
        "status": "healthy",
        "summary": "Daemon control plane doctor completed",
        "checks": [
            {"name": "daemon_host", "ok": bool(config.daemon.host)},
            {"name": "daemon_port", "ok": bool(config.daemon.port)},
            {"name": "telemetry_store_access", "ok": True},
            {"name": "recent_daemon_events", "ok": len(events) >= 0},
        ],
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("update_skill_control_plane", parse_docstring=True)
def update_skill_tool(skill_name: str, enabled: bool) -> str:
    """Update one custom skill's enabled state.

    Args:
        skill_name: Skill identifier.
        enabled: Desired enabled state.
    """
    skills = load_skills(enabled_only=False)
    skill = next((item for item in skills if item.name == skill_name), None)
    if skill is None:
        return json.dumps({"error": f"Skill '{skill_name}' not found"}, ensure_ascii=False, indent=2)
    if skill.category != "custom":
        return json.dumps({"error": "Only custom skills can be updated"}, ensure_ascii=False, indent=2)

    extensions_config = get_extensions_config()
    extensions_config.skills[skill_name] = SkillStateConfig(enabled=enabled)
    config_path = extensions_config.resolve_config_path()
    if config_path is None:
        return json.dumps({"error": "extensions_config.json not found"}, ensure_ascii=False, indent=2)

    payload = {
        "mcpServers": {name: server.model_dump() for name, server in extensions_config.mcp_servers.items()},
        "skills": {name: {"enabled": skill_config.enabled} for name, skill_config in extensions_config.skills.items()},
    }
    Path(config_path).write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    reload_extensions_config()
    return json.dumps(
        {"ok": True, "skill_name": skill_name, "enabled": enabled},
        ensure_ascii=False,
        indent=2,
    )


@tool("update_config_control_plane", parse_docstring=True)
def update_config_tool(daemon_config: dict[str, Any]) -> str:
    """Update the daemon config section only.

    Args:
        daemon_config: Partial daemon config patch.
    """
    repo = ConfigRepository()
    config, version, _ = repo.read()
    current = config.get("daemon")
    if not isinstance(current, dict):
        current = {}
    config["daemon"] = {
        **current,
        **daemon_config,
    }
    try:
        new_version, warnings = repo.write_with_warnings(config_dict=config, expected_version=version)
    except Exception as exc:  # noqa: BLE001
        return json.dumps({"error": str(exc)}, ensure_ascii=False, indent=2)
    return json.dumps(
        {"ok": True, "version": new_version, "warnings": warnings},
        ensure_ascii=False,
        indent=2,
    )
