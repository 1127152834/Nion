from __future__ import annotations

import json
import uuid
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from nion.approval_requests import (
    ApprovalRequestKind,
    ThreadApprovalRequestRecord,
    normalize_approval_kind,
)
from nion.config.paths import get_paths

PermissionDecision = str
ThreadPermissionRequestRecord = ThreadApprovalRequestRecord


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
    return json.dumps(
        tool_input,
        sort_keys=True,
        ensure_ascii=False,
        separators=(",", ":"),
    )


def _build_default_replay_payload(original_message_text: str) -> dict[str, Any]:
    return {
        "text": original_message_text,
        "files": [],
        "additional_kwargs": {},
    }


def _normalize_request_item(item: dict[str, Any]) -> dict[str, Any]:
    tool_name = item.get("tool_name")
    approval_kind = normalize_approval_kind(
        item.get("approval_kind"),
        tool_name=tool_name if isinstance(tool_name, str) else None,
    )
    normalized = dict(item)
    normalized["approval_kind"] = approval_kind
    normalized.setdefault(
        "replay_payload",
        _build_default_replay_payload(str(normalized.get("original_message_text", ""))),
    )
    normalized.setdefault("tool_name", None)
    normalized.setdefault("tool_input", None)
    normalized.setdefault("local_action_payload", None)
    normalized.setdefault("resolved_at", None)
    normalized.setdefault("consumed", False)
    return normalized


def create_thread_approval_request(
    *,
    thread_id: str,
    approval_kind: ApprovalRequestKind,
    original_message_text: str,
    tool_name: str | None = None,
    tool_input: dict[str, Any] | None = None,
    local_action_payload: dict[str, Any] | None = None,
    replay_payload: dict[str, Any] | None = None,
) -> ThreadApprovalRequestRecord:
    store = _read_store()
    record = ThreadApprovalRequestRecord(
        id=f"approval_{uuid.uuid4().hex}",
        thread_id=thread_id,
        approval_kind=approval_kind,
        original_message_text=original_message_text,
        replay_payload=replay_payload
        or _build_default_replay_payload(original_message_text),
        status="pending",
        created_at=_now_iso(),
        tool_name=tool_name,
        tool_input=tool_input,
        local_action_payload=local_action_payload,
    )
    store["requests"].append(asdict(record))
    _write_store(store)
    return record


def resolve_thread_approval_request(
    *,
    thread_id: str,
    approval_request_id: str,
    decision: PermissionDecision,
) -> ThreadApprovalRequestRecord | None:
    store = _read_store()
    for item in store["requests"]:
        if item.get("id") != approval_request_id or item.get("thread_id") != thread_id:
            continue

        normalized = _normalize_request_item(item)
        approval_kind = normalized["approval_kind"]
        if normalized["status"] != "pending":
            return ThreadApprovalRequestRecord(**normalized)

        normalized_decision = (
            "allow"
            if approval_kind == "local_action_plan" and decision == "allow_session"
            else decision
        )
        normalized["status"] = normalized_decision
        normalized["resolved_at"] = _now_iso()

        if approval_kind == "tool_permission" and normalized_decision == "allow_session":
            store["thread_profiles"][thread_id] = "full_access"
        elif approval_kind == "tool_permission" and normalized_decision == "allow":
            store["pending_allows"].append(
                {
                    "thread_id": thread_id,
                    "tool_name": normalized.get("tool_name"),
                    "tool_input_signature": _normalize_tool_input(
                        normalized.get("tool_input") or {}
                    ),
                    "permission_request_id": approval_request_id,
                }
            )

        item.clear()
        item.update(normalized)
        _write_store(store)
        return ThreadApprovalRequestRecord(**normalized)
    return None


def consume_thread_permission_once(
    *,
    thread_id: str,
    permission_request_id: str,
) -> bool:
    store = _read_store()
    for item in store["requests"]:
        if item.get("id") != permission_request_id or item.get("thread_id") != thread_id:
            continue
        normalized = _normalize_request_item(item)
        if normalized.get("consumed") is True:
            return False
        normalized["consumed"] = True
        item.clear()
        item.update(normalized)
        _write_store(store)
        return True
    return False


def get_thread_approval_request(
    *,
    thread_id: str,
    approval_request_id: str,
) -> ThreadApprovalRequestRecord | None:
    store = _read_store()
    for item in store["requests"]:
        if item.get("id") != approval_request_id or item.get("thread_id") != thread_id:
            continue
        normalized = _normalize_request_item(item)
        return ThreadApprovalRequestRecord(**normalized)
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


def create_thread_permission_request(
    *,
    thread_id: str,
    tool_name: str,
    tool_input: dict[str, Any],
    original_message_text: str,
    replay_payload: dict[str, Any] | None = None,
) -> ThreadPermissionRequestRecord:
    return create_thread_approval_request(
        thread_id=thread_id,
        approval_kind="tool_permission",
        tool_name=tool_name,
        tool_input=tool_input,
        original_message_text=original_message_text,
        replay_payload=replay_payload,
    )


def resolve_thread_permission_request(
    *,
    thread_id: str,
    permission_request_id: str,
    decision: PermissionDecision,
) -> ThreadPermissionRequestRecord | None:
    return resolve_thread_approval_request(
        thread_id=thread_id,
        approval_request_id=permission_request_id,
        decision=decision,
    )


def get_thread_permission_request(
    *,
    thread_id: str,
    permission_request_id: str,
) -> ThreadPermissionRequestRecord | None:
    return get_thread_approval_request(
        thread_id=thread_id,
        approval_request_id=permission_request_id,
    )
