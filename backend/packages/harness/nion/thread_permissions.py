from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal

from nion.config.paths import get_paths


PermissionDecision = Literal["allow", "allow_session", "deny"]


@dataclass
class ThreadPermissionRequestRecord:
    id: str
    thread_id: str
    tool_name: str
    tool_input: dict[str, Any]
    original_message_text: str
    replay_payload: dict[str, Any]
    status: str
    created_at: str
    resolved_at: str | None = None
    consumed: bool = False


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


def _store_path() -> Path:
    return get_paths().base_dir / "thread_permissions.json"


def _read_store() -> dict[str, Any]:
    path = _store_path()
    if not path.exists():
        return {"requests": [], "thread_profiles": {}, "pending_allows": []}
    return json.loads(path.read_text())


def _write_store(store: dict[str, Any]) -> None:
    path = _store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(store, indent=2, ensure_ascii=False))


def _normalize_tool_input(tool_input: dict[str, Any]) -> str:
    return json.dumps(tool_input, sort_keys=True, ensure_ascii=False, separators=(",", ":"))


def create_thread_permission_request(
    *,
    thread_id: str,
    tool_name: str,
    tool_input: dict[str, Any],
    original_message_text: str,
    replay_payload: dict[str, Any] | None = None,
) -> ThreadPermissionRequestRecord:
    store = _read_store()
    record = ThreadPermissionRequestRecord(
        id=f"perm_{uuid.uuid4().hex}",
        thread_id=thread_id,
        tool_name=tool_name,
        tool_input=tool_input,
        original_message_text=original_message_text,
        replay_payload=replay_payload
        or {
            "text": original_message_text,
            "files": [],
            "additional_kwargs": {},
        },
        status="pending",
        created_at=_now_iso(),
    )
    store["requests"].append(asdict(record))
    _write_store(store)
    return record


def resolve_thread_permission_request(
    *,
    thread_id: str,
    permission_request_id: str,
    decision: PermissionDecision,
) -> ThreadPermissionRequestRecord | None:
    store = _read_store()
    for item in store["requests"]:
        if item["id"] != permission_request_id or item["thread_id"] != thread_id:
            continue
        if item["status"] != "pending":
            return ThreadPermissionRequestRecord(**item)

        item["status"] = decision
        item["resolved_at"] = _now_iso()

        if decision == "allow_session":
            store["thread_profiles"][thread_id] = "full_access"
        elif decision == "allow":
            store["pending_allows"].append(
                {
                    "thread_id": thread_id,
                    "tool_name": item["tool_name"],
                    "tool_input_signature": _normalize_tool_input(item["tool_input"]),
                    "permission_request_id": permission_request_id,
                }
            )

        _write_store(store)
        return ThreadPermissionRequestRecord(**item)
    return None


def consume_thread_permission_once(
    *,
    thread_id: str,
    permission_request_id: str,
) -> bool:
    store = _read_store()
    for item in store["requests"]:
        if item["id"] != permission_request_id or item["thread_id"] != thread_id:
            continue
        if item.get("consumed") is True:
            return False
        item["consumed"] = True
        _write_store(store)
        return True
    return False


def get_thread_permission_request(
    *,
    thread_id: str,
    permission_request_id: str,
) -> ThreadPermissionRequestRecord | None:
    store = _read_store()
    for item in store["requests"]:
        if item["id"] == permission_request_id and item["thread_id"] == thread_id:
            if "replay_payload" not in item:
                item["replay_payload"] = {
                    "text": item.get("original_message_text", ""),
                    "files": [],
                    "additional_kwargs": {},
                }
            return ThreadPermissionRequestRecord(**item)
    return None


def get_thread_permission_profile(thread_id: str) -> str:
    store = _read_store()
    return store.get("thread_profiles", {}).get(thread_id, "default")


def consume_thread_pending_allow(
    *,
    thread_id: str,
    tool_name: str,
    tool_input: dict[str, Any],
) -> bool:
    store = _read_store()
    signature = _normalize_tool_input(tool_input)
    pending_allows = store.get("pending_allows", [])
    for index, item in enumerate(pending_allows):
        if (
            item.get("thread_id") == thread_id
            and item.get("tool_name") == tool_name
            and item.get("tool_input_signature") == signature
        ):
            del pending_allows[index]
            store["pending_allows"] = pending_allows
            _write_store(store)
            return True
    return False
