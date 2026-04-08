from __future__ import annotations

import json
import uuid
from typing import Any

from nion.memory_os.automation_bridge import create_agent_owned_job
from nion.memory_os.projections import (
    build_automation_projection,
    record_soul_automation_created,
    save_automation_projection,
)
from nion.memory_os.repository import MemoryOSRepository


def project_learning_outputs(
    *,
    repository: MemoryOSRepository,
    learning_memory_id: str,
    created_at: str,
) -> dict[str, dict[str, Any]]:
    learning_node = repository.get_memory_node(learning_memory_id)
    if learning_node is None:
        raise KeyError(f"Learning memory not found: {learning_memory_id}")

    learning_revisions = repository.list_memory_revisions(memory_id=learning_memory_id)
    if not learning_revisions:
        raise ValueError(f"Learning memory has no canonical revision: {learning_memory_id}")
    learning_revision = learning_revisions[0]

    learning_title = str(
        learning_node.metadata.get("title")
        or learning_revision.payload.get("title")
        or "学习主题"
    )
    learning_summary = str(learning_node.summary or learning_revision.summary)

    procedure = _create_projected_procedure(
        repository=repository,
        learning_memory_id=learning_memory_id,
        learning_revision_id=learning_revision.revision_id,
        learning_title=learning_title,
        learning_summary=learning_summary,
        created_at=created_at,
    )

    job = create_agent_owned_job(
        job_id=f"job_learning_projection_{uuid.uuid4().hex[:8]}",
        name=f"{learning_title}提醒",
        prompt=f"在类似“{learning_summary}”场景下执行派生流程并提供低刺激提醒。",
        created_at=created_at,
        provenance_memory_id=str(procedure["memory_id"]),
        provenance_learning_id=learning_memory_id,
    )
    automation_projection = save_automation_projection(
        repository=repository,
        projection=build_automation_projection(job),
        created_at=created_at,
        metadata={
            "source_memory_id": learning_memory_id,
            "source_revision_id": learning_revision.revision_id,
            "procedure_memory_id": procedure["memory_id"],
        },
    )
    record_soul_automation_created(
        repository=repository,
        job=job,
        created_at=created_at,
        provenance_learning_revision_id=learning_revision.revision_id,
        procedure_memory_id=str(procedure["memory_id"]),
    )

    soul_reflection_input = {
        "learning_memory_id": learning_memory_id,
        "learning_revision_id": learning_revision.revision_id,
        "procedure_memory_id": procedure["memory_id"],
        "procedure_revision_id": procedure["revision_id"],
        "source_summary": learning_summary,
    }

    return {
        "procedure": procedure,
        "automation_projection": automation_projection,
        "soul_reflection_input": soul_reflection_input,
    }


def _create_projected_procedure(
    *,
    repository: MemoryOSRepository,
    learning_memory_id: str,
    learning_revision_id: str,
    learning_title: str,
    learning_summary: str,
    created_at: str,
) -> dict[str, Any]:
    memory_id = f"proc_{uuid.uuid4().hex[:10]}"
    title = f"{learning_title}流程草案"
    summary = f"把“{learning_summary}”整理为可复用的流程草案。"
    provenance = {
        "source_type": "learning_projection",
        "generated_by": "project_learning_outputs",
        "source_memory_id": learning_memory_id,
        "source_revision_id": learning_revision_id,
    }

    repository.save_memory_record(
        {
            "memory_id": memory_id,
            "domain": "procedure",
            "subtype": "draft",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "procedural",
            "subject_id": "user:default",
            "status": "candidate",
            "summary": summary,
            "confidence": 0.75,
            "created_at": created_at,
            "updated_at": created_at,
            "provenance": provenance,
        }
    )
    repository.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": f"procedure:draft:{memory_id}",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "procedure",
            "status": "candidate",
            "summary": summary,
            "created_at": created_at,
            "updated_at": created_at,
            "metadata": {
                "domain": "procedure",
                "subtype": "draft",
                "title": title,
                "source_memory_id": learning_memory_id,
                "source_revision_id": learning_revision_id,
            },
        }
    )
    revision_id = f"{memory_id}:rev:1"
    repository.save_memory_revision(
        {
            "revision_id": revision_id,
            "memory_id": memory_id,
            "revision_number": 1,
            "summary": summary,
            "evidence_ref": None,
            "created_at": created_at,
            "payload": {
                "domain": "procedure",
                "subtype": "draft",
                "title": title,
                "source_memory_id": learning_memory_id,
                "source_revision_id": learning_revision_id,
            },
        }
    )
    _save_memory_link(
        repository=repository,
        source_memory_id=memory_id,
        target_memory_id=learning_memory_id,
        relation="derived_from_learning",
        created_at=created_at,
        metadata={"source_revision_id": learning_revision_id},
    )
    return {
        "memory_id": memory_id,
        "revision_id": revision_id,
        "title": title,
        "summary": summary,
        "provenance": provenance,
    }


def _save_memory_link(
    *,
    repository: MemoryOSRepository,
    source_memory_id: str,
    target_memory_id: str,
    relation: str,
    created_at: str,
    metadata: dict[str, Any],
) -> None:
    with repository._connect() as conn:
        conn.execute(
            """
            INSERT INTO memory_links (
                link_id,
                source_memory_id,
                target_memory_id,
                relation,
                created_at,
                metadata_json
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                f"link_{uuid.uuid4().hex[:10]}",
                source_memory_id,
                target_memory_id,
                relation,
                created_at,
                json.dumps(metadata, ensure_ascii=False),
            ),
        )
