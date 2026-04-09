from __future__ import annotations

from pathlib import Path

from nion.memory.soul.service import write_canonical_soul_layer
from .repository import MemoryOSRepository
from .soul_events import record_soul_event


class MemoryOSSoulArtifactStore:
    def __init__(self, *, repository: MemoryOSRepository, base_dir: str | Path) -> None:
        self._repository = repository
        self._base_dir = Path(base_dir)
        self._artifacts_dir = self._base_dir / "memory-os" / "artifacts"

    def write_core_soul(self, *, body: str, created_at: str) -> dict[str, object]:
        path = self._artifacts_dir / "soul" / "core" / "core_soul.md"
        summary = _extract_summary(body)
        record = {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "target_id": "agent:main",
            "status": "active",
            "title": "主智能体核心人格基底",
            "summary": summary,
            "confidence": 1.0,
            "created_at": created_at,
            "updated_at": created_at,
            "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
            "provenance": {
                "source_type": "system_bootstrap",
                "generated_by": "soul_artifact_writer",
            },
        }
        write_canonical_soul_layer(
            self._repository,
            layer="core",
            summary=summary,
            created_at=created_at,
            payload={"artifact_uri": record["artifact_uri"], "source_type": "artifact_write"},
        )
        return self._write_artifact(path=path, body=body, record=record)

    def write_identity_narrative(
        self,
        *,
        body: str,
        created_at: str,
        staged: bool = False,
        canonical_payload: dict[str, object] | None = None,
    ) -> dict[str, object]:
        path = (
            self._artifacts_dir / "agent-self" / "narrative" / "staged_identity_narrative.md"
            if staged
            else self._artifacts_dir / "agent-self" / "narrative" / "identity_narrative.md"
        )
        summary = _extract_summary(body)
        record = {
            "memory_id": "agent_self_narrative_staged_main" if staged else "agent_self_narrative_main",
            "domain": "agent_self",
            "subtype": "identity_narrative",
            "owner_type": "agent",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "target_id": "agent:main",
            "status": "candidate" if staged else "active",
            "title": "主智能体 staged 身份叙事" if staged else "主智能体当前身份叙事",
            "summary": summary,
            "confidence": 0.88,
            "created_at": created_at,
            "updated_at": created_at,
            "artifact_uri": (
                "nion://memory-os/artifacts/agent-self/narrative/staged_identity_narrative.md"
                if staged
                else "nion://memory-os/artifacts/agent-self/narrative/identity_narrative.md"
            ),
            "provenance": {
                "source_type": "reflection",
                "generated_by": "soul_artifact_writer",
            },
        }
        if not staged:
            write_canonical_soul_layer(
                self._repository,
                layer="identity_narrative",
                summary=summary,
                created_at=created_at,
                payload={
                    "artifact_uri": record["artifact_uri"],
                    "source_type": "artifact_write",
                    **dict(canonical_payload or {}),
                },
            )
        written = self._write_artifact(path=path, body=body, record=record)
        if staged:
            record_soul_event(
                self._repository,
                event_type="identity_narrative_staged",
                memory_id=str(record["memory_id"]),
                summary=f"主智能体形成了新的身份叙事草稿：{record['summary']}",
                created_at=created_at,
                source="soul_artifact_writer",
                metadata={
                    "artifact_uri": record["artifact_uri"],
                    "status": record["status"],
                },
            )
        return written

    def write_active_overlay(self, *, body: str, created_at: str) -> dict[str, object]:
        path = self._artifacts_dir / "soul" / "overlays" / "active_overlay.md"
        summary = _extract_summary(body)
        record = {
            "memory_id": "soul_overlay_active_main",
            "domain": "soul",
            "subtype": "adaptive_overlay",
            "owner_type": "agent",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "target_id": "agent:main",
            "status": "active",
            "title": "当前生效的 adaptive soul overlay",
            "summary": summary,
            "confidence": 0.9,
            "created_at": created_at,
            "updated_at": created_at,
            "artifact_uri": "nion://memory-os/artifacts/soul/overlays/active_overlay.md",
            "provenance": {
                "source_type": "governance_acceptance",
                "generated_by": "soul_artifact_writer",
            },
        }
        write_canonical_soul_layer(
            self._repository,
            layer="adaptive_overlay",
            summary=summary,
            created_at=created_at,
            payload={"artifact_uri": record["artifact_uri"], "source_type": "artifact_write"},
        )
        return self._write_artifact(path=path, body=body, record=record)

    def write_relationship_soul(
        self,
        *,
        body: str,
        created_at: str,
        target_id: str = "user:default",
        source_relationship_ids: list[str] | None = None,
    ) -> dict[str, object]:
        path = self._artifacts_dir / "soul" / "relationship" / "relationship_soul.md"
        summary = _extract_summary(body)
        record = {
            "memory_id": "soul_rel_user_default",
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "target_id": target_id,
            "status": "active",
            "title": "当前用户关系人格层",
            "summary": summary,
            "confidence": 0.9,
            "created_at": created_at,
            "updated_at": created_at,
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {
                "source_type": "relationship_derivation",
                "generated_by": "relationship_soul_writer",
                "source_relationship_ids": source_relationship_ids or [],
            },
        }
        write_canonical_soul_layer(
            self._repository,
            layer="relationship_stance",
            summary=summary,
            created_at=created_at,
            payload={
                "artifact_uri": record["artifact_uri"],
                "source_type": "relationship_derivation",
                "source_relationship_ids": source_relationship_ids or [],
            },
        )
        return self._write_artifact(path=path, body=body, record=record)

    def _write_artifact(
        self,
        *,
        path: Path,
        body: str,
        record: dict[str, object],
    ) -> dict[str, object]:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")
        self._repository.save_memory_record(record)
        return {
            "artifact_path": str(path),
            "memory_record": record,
        }


def import_legacy_soul_file(
    *,
    repository: MemoryOSRepository,
    soul_path: str | Path,
    created_at: str,
) -> dict[str, object]:
    path = Path(soul_path)
    content = path.read_text(encoding="utf-8")
    store = MemoryOSSoulArtifactStore(repository=repository, base_dir=path.parent)
    return store.write_core_soul(body=content, created_at=created_at)


def _extract_summary(body: str) -> str:
    for line in body.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        return stripped
    return ""
