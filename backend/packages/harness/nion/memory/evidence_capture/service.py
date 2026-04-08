from __future__ import annotations

import uuid
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from nion.config.paths import Paths, get_paths
from nion.memory.evidence_vault.store import EvidenceVaultStore
from nion.memory.session_policy import resolve_memory_session_policy


def capture_turn_evidence(
    *,
    thread_id: str,
    turn_id: str,
    messages: list[Mapping[str, Any]],
    session_mode: str | None,
    memory_read: bool,
    memory_write: bool,
    base_dir: str | Path | None = None,
) -> list[dict[str, Any]]:
    policy = resolve_memory_session_policy(
        {
            "session_mode": session_mode,
            "memory_read": memory_read,
            "memory_write": memory_write,
        }
    )
    paths = _resolve_paths(base_dir)
    durability_scope = "durable_user_memory" if policy.allow_durable_evidence else "session_ephemeral"
    store = EvidenceVaultStore(paths.memory_os_dir) if policy.allow_durable_evidence else None

    results: list[dict[str, Any]] = []
    for message in messages:
        evidence_input = _build_evidence_input(message)
        if evidence_input is None:
            continue

        message_turn_id = evidence_input["message_id"] or f"{turn_id}:{uuid.uuid4().hex}"
        if store is None:
            results.append(
                {
                    "evidence_id": uuid.uuid4().hex,
                    "thread_id": thread_id,
                    "turn_id": message_turn_id,
                    "actor": evidence_input["actor"],
                    "source_type": evidence_input["source_type"],
                    "durability_scope": durability_scope,
                    "artifact_uri": None,
                    "document_path": str(paths.memory_os_evidence_dir / f"{message_turn_id}.json"),
                }
            )
            continue

        write_result = store.write_document(
            source_type=evidence_input["source_type"],
            thread_id=thread_id,
            turn_id=message_turn_id,
            actor=evidence_input["actor"],
            content_raw=evidence_input["content"],
            durability_scope=durability_scope,
        )
        results.append(
            {
                "evidence_id": write_result.document.evidence_id,
                "thread_id": thread_id,
                "turn_id": message_turn_id,
                "actor": write_result.document.actor,
                "source_type": write_result.document.source_type,
                "durability_scope": write_result.document.durability_scope,
                "artifact_uri": write_result.document.artifact_uri,
                "document_path": str(write_result.document_path),
            }
        )

    return results


def _resolve_paths(base_dir: str | Path | None) -> Paths:
    return Paths(base_dir=base_dir) if base_dir is not None else get_paths()


def _build_evidence_input(message: Mapping[str, Any]) -> dict[str, str | None] | None:
    message_type = str(message.get("type") or "")
    if message_type not in {"human", "ai"}:
        return None

    content = _normalize_content(message.get("content"))
    if not content:
        return None

    actor = "user" if message_type == "human" else "assistant"
    source_type = "human_message" if message_type == "human" else "assistant_message"
    message_id = message.get("id")

    return {
        "actor": actor,
        "source_type": source_type,
        "content": content,
        "message_id": str(message_id) if message_id else None,
    }


def _normalize_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                text = item.strip()
                if text:
                    parts.append(text)
                continue
            if isinstance(item, Mapping):
                text_value = item.get("text")
                if isinstance(text_value, str):
                    text = text_value.strip()
                    if text:
                        parts.append(text)
        return "\n".join(parts).strip()
    return ""
