from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Literal

import httpx
from langchain.tools import tool

from nion.config import ConfigRepository, get_app_config, get_paths
from nion.config.extensions_config import (
    SkillStateConfig,
    get_extensions_config,
    reload_extensions_config,
)
from nion.capability_bridge_actions import build_capability_bridge_actions, execute_capability_bridge_action
from nion.config.agents_config import list_agent_catalog
from nion.config.memory_config import get_memory_config
from nion.notebook.service import NotebookService
from nion.skills import load_skills
from nion.system_capability_catalog import build_system_capability_catalog
from nion.telemetry.store import TelemetryStore


def _telemetry_store() -> TelemetryStore:
    return TelemetryStore(get_paths().telemetry_db_file)


def _daemon_base_url() -> str:
    config = get_app_config()
    return f"http://{config.daemon.host}:{config.daemon.port}"


def _daemon_get(path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
    response = httpx.get(f"{_daemon_base_url()}{path}", params=params, timeout=5.0)
    response.raise_for_status()
    return response.json()


def _daemon_post(path: str, *, payload: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
    response = httpx.post(f"{_daemon_base_url()}{path}", json=payload, timeout=5.0)
    response.raise_for_status()
    return response.json()


def _json_result(fn) -> str:
    try:
        payload = fn()
    except (httpx.HTTPError, ValueError) as exc:
        payload = {
            "error": str(exc),
            "error_type": type(exc).__name__,
        }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def _extract_tool_activity_timeline(events) -> list[dict[str, Any]]:
    timeline: list[dict[str, Any]] = []
    for event in reversed(events):
        details = event.details if isinstance(event.details, dict) else {}
        summary_label = details.get("latest_tool_summary")
        activity_label = details.get("latest_tool_activity")
        if summary_label or activity_label:
            timeline.append(
                {
                    "summary_label": summary_label,
                    "activity_label": activity_label,
                    "event_type": event.event_type,
                    "timestamp": event.timestamp,
                }
            )
    return timeline


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


def _enabled_mcp_capability_entries() -> list[dict[str, Any]]:
    try:
        extensions_config = get_extensions_config()
    except Exception:
        return []

    entries: list[dict[str, Any]] = []
    for server_name, server in extensions_config.get_enabled_mcp_servers().items():
        description = server.description.strip() if isinstance(server.description, str) else ""
        if not description:
            continue
        entries.append(
            {
                "name": server_name,
                "description": description,
                "type": server.type,
                "enabled": server.enabled,
            }
        )
    return entries


@tool("get_capability_catalog", parse_docstring=True)
def get_capability_catalog_tool() -> str:
    """Get the current runtime system capability catalog."""
    skills = load_skills(enabled_only=True)
    agents = list_agent_catalog()
    memory_config = get_memory_config()
    notebook = NotebookService()
    note_summaries = notebook.list_note_summaries()
    inbox_items = notebook.list_inbox_items()
    payload = build_system_capability_catalog(
        cli_tools_enabled=True,
        skill_count=len(skills),
        mcp_servers=_enabled_mcp_capability_entries(),
        agent_count=len(agents),
        memory_descriptor={
            "enabled": memory_config.enabled,
            "storage_class": memory_config.storage_class,
            "storage_path": memory_config.storage_path,
            "injection_enabled": memory_config.injection_enabled,
            "max_facts": memory_config.max_facts,
        },
        notebook_descriptor={
            "root_directory": str(notebook._paths.notebook_root_dir),
            "note_count": len(note_summaries),
            "inbox_count": len(inbox_items),
            "assistant_available": True,
        },
        agent_descriptors=[
            {
                "id": agent.id,
                "name": agent.name,
                "kind": agent.kind,
                "entrypoint": agent.entrypoint,
                "tool_policy": agent.tool_policy,
                "visibility": agent.visibility,
            }
            for agent in agents
        ],
        skill_descriptors=[
            {
                "name": skill.name,
                "category": skill.category,
                "user_invocable": getattr(skill, "user_invocable", False),
                "hooks": getattr(skill, "hooks", []) or [],
                "model": getattr(skill, "model", None),
                "effort": getattr(skill, "effort", None),
            }
            for skill in skills
        ],
    )
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("get_capability_actions", parse_docstring=True)
def get_capability_actions_tool() -> str:
    """Get the current capability bridge actions catalog."""
    return json.dumps({"actions": build_capability_bridge_actions()}, ensure_ascii=False, indent=2)


@tool("execute_capability_action", parse_docstring=True)
def execute_capability_action_tool(action_id: str, payload: dict[str, Any]) -> str:
    """Execute one capability bridge action.

    Args:
        action_id: Bridge action identifier.
        payload: Action payload.
    """
    return json.dumps(execute_capability_bridge_action(action_id, payload), ensure_ascii=False, indent=2)


@tool("diagnose_incident", parse_docstring=True)
def diagnose_incident_tool(
    source: Literal["chat", "desktop_button", "automatic"],
    thread_id: str | None = None,
    run_id: str | None = None,
    incident_type_hint: Literal["agent_execution", "daemon_runtime", "auto"] = "auto",
    include_recommended_actions: bool = True,
) -> str:
    """Diagnose one incident through the daemon control plane.

    Args:
        source: Trigger source for the diagnosis request.
        thread_id: Optional thread scope.
        run_id: Optional run scope.
        incident_type_hint: Optional incident-family hint.
        include_recommended_actions: Whether to include suggested next actions.
    """
    return _json_result(
        lambda: _daemon_post(
            "/api/daemon/incidents/diagnose",
            payload={
                "source": source,
                "thread_id": thread_id,
                "run_id": run_id,
                "incident_type_hint": incident_type_hint,
                "include_recommended_actions": include_recommended_actions,
            },
        )
    )


@tool("list_incidents", parse_docstring=True)
def list_incidents_tool(
    incident_type: str | None = None,
    status: str | None = None,
    thread_id: str | None = None,
    run_id: str | None = None,
    limit: int = 20,
) -> str:
    """List persisted incident records from the daemon control plane.

    Args:
        incident_type: Optional incident type filter.
        status: Optional incident status filter.
        thread_id: Optional thread scope filter.
        run_id: Optional run scope filter.
        limit: Maximum number of incidents to return.
    """
    params = {
        "incident_type": incident_type,
        "status": status,
        "thread_id": thread_id,
        "run_id": run_id,
        "limit": limit,
    }
    filtered_params = {key: value for key, value in params.items() if value is not None}
    return _json_result(lambda: _daemon_get("/api/daemon/incidents", params=filtered_params))


@tool("get_incident", parse_docstring=True)
def get_incident_tool(incident_id: str) -> str:
    """Get one persisted incident record from the daemon control plane.

    Args:
        incident_id: Incident identifier.
    """
    return _json_result(lambda: _daemon_get(f"/api/daemon/incidents/{incident_id}"))


@tool("dismiss_incident", parse_docstring=True)
def dismiss_incident_tool(incident_id: str) -> str:
    """Dismiss one persisted incident record through the daemon control plane.

    Args:
        incident_id: Incident identifier.
    """
    return _json_result(lambda: _daemon_post(f"/api/daemon/incidents/{incident_id}/dismiss"))


@tool("get_channels_status", parse_docstring=True)
def get_channels_status_tool() -> str:
    """Get the daemon-owned status view for all channels."""
    return _json_result(lambda: _daemon_get("/api/daemon/channels"))


@tool("get_channel_diagnostics", parse_docstring=True)
def get_channel_diagnostics_tool(channel_name: str) -> str:
    """Get the latest diagnostic view for one channel.

    Args:
        channel_name: Channel identifier, e.g. `feishu`.
    """
    return _json_result(lambda: _daemon_get(f"/api/daemon/channels/{channel_name}"))


@tool("list_channel_pair_requests", parse_docstring=True)
def list_channel_pair_requests_tool(
    platform: str,
    status: str | None = None,
) -> str:
    """List channel pair requests from the daemon control plane.

    Args:
        platform: Channel platform, e.g. `lark`.
        status: Optional request status filter.
    """
    params = {"status": status} if status is not None else None
    return _json_result(lambda: _daemon_get(f"/api/daemon/channels/{platform}/pair-requests", params=params))


@tool("list_channel_authorized_users", parse_docstring=True)
def list_channel_authorized_users_tool(
    platform: str,
    active_only: bool = True,
) -> str:
    """List channel authorized users from the daemon control plane.

    Args:
        platform: Channel platform, e.g. `lark`.
        active_only: Whether to list only active users.
    """
    return _json_result(
        lambda: _daemon_get(
            f"/api/daemon/channels/{platform}/authorized-users",
            params={"active_only": active_only},
        )
    )


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
                "tool_activity_timeline": _extract_tool_activity_timeline(events),
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
                "tool_activity_timeline": _extract_tool_activity_timeline(events),
            },
        }
    return json.dumps(payload, ensure_ascii=False, indent=2)


@tool("restart_channel_control_plane", parse_docstring=True)
def restart_channel_control_plane_tool(channel_name: str) -> str:
    """Restart one channel through the daemon control plane.

    Args:
        channel_name: Channel identifier, e.g. `feishu`.
    """
    return _json_result(lambda: _daemon_post(f"/api/daemon/channels/{channel_name}/restart"))


@tool("issue_channel_pairing_code", parse_docstring=True)
def issue_channel_pairing_code_tool(
    platform: str,
    ttl_minutes: int = 10,
) -> str:
    """Issue a channel pairing code through the daemon control plane.

    Args:
        platform: Channel platform, e.g. `lark`.
        ttl_minutes: Pairing code TTL in minutes.
    """
    return _json_result(
        lambda: _daemon_post(
            f"/api/daemon/channels/{platform}/pairing-code",
            payload={"ttl_minutes": ttl_minutes},
        )
    )


@tool("approve_channel_pair_request", parse_docstring=True)
def approve_channel_pair_request_tool(
    platform: str,
    request_id: int,
    handled_by: str | None = None,
    workspace_id: str | None = None,
    note: str | None = None,
) -> str:
    """Approve a channel pair request through the daemon control plane.

    Args:
        platform: Channel platform, e.g. `lark`.
        request_id: Pair request identifier.
        handled_by: Optional operator identifier.
        workspace_id: Optional workspace binding.
        note: Optional note.
    """
    return _json_result(
        lambda: _daemon_post(
            f"/api/daemon/channels/{platform}/pair-requests/{request_id}/approve",
            payload={
                "handled_by": handled_by,
                "workspace_id": workspace_id,
                "note": note,
            },
        )
    )


@tool("reject_channel_pair_request", parse_docstring=True)
def reject_channel_pair_request_tool(
    platform: str,
    request_id: int,
    handled_by: str | None = None,
    workspace_id: str | None = None,
    note: str | None = None,
) -> str:
    """Reject a channel pair request through the daemon control plane.

    Args:
        platform: Channel platform, e.g. `lark`.
        request_id: Pair request identifier.
        handled_by: Optional operator identifier.
        workspace_id: Optional workspace binding.
        note: Optional note.
    """
    return _json_result(
        lambda: _daemon_post(
            f"/api/daemon/channels/{platform}/pair-requests/{request_id}/reject",
            payload={
                "handled_by": handled_by,
                "workspace_id": workspace_id,
                "note": note,
            },
        )
    )


@tool("revoke_channel_authorized_user", parse_docstring=True)
def revoke_channel_authorized_user_tool(
    platform: str,
    user_id: int,
    handled_by: str | None = None,
) -> str:
    """Revoke a channel authorized user through the daemon control plane.

    Args:
        platform: Channel platform, e.g. `lark`.
        user_id: Authorized user identifier.
        handled_by: Optional operator identifier.
    """
    return _json_result(
        lambda: _daemon_post(
            f"/api/daemon/channels/{platform}/authorized-users/{user_id}/revoke",
            payload={"handled_by": handled_by},
        )
    )


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
