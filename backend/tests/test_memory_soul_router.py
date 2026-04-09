from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.memory_os.repository import MemoryOSRepository


def test_memory_soul_router_exposes_settings_payload_without_governance_actions(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "长期陪伴、克制稳定、结论先行。",
            "confidence": 1.0,
            "created_at": "2026-04-08T00:00:00Z",
            "updated_at": "2026-04-08T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_node(
        {
            "memory_id": "soul_rel_user_default",
            "canonical_key": "soul:layer:relationship_stance:user:default",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "保持低刺激、少施压、结论先行。",
            "created_at": "2026-04-08T00:00:00Z",
            "updated_at": "2026-04-08T00:00:00Z",
            "metadata": {"layer": "relationship_stance"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_rel_user_default",
        summary="保持低刺激、少施压、结论先行。",
        evidence_ref=None,
        created_at="2026-04-08T00:00:00Z",
        payload={"layer": "relationship_stance"},
    )
    repo.save_memory_node(
        {
            "memory_id": "soul_overlay_active_main",
            "canonical_key": "soul:layer:adaptive_overlay:agent:main",
            "owner_type": "agent",
            "scope": "agent",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "近期减少鼓励式措辞。",
            "created_at": "2026-04-08T00:00:00Z",
            "updated_at": "2026-04-08T00:00:00Z",
            "metadata": {"layer": "adaptive_overlay"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_overlay_active_main",
        summary="近期减少鼓励式措辞。",
        evidence_ref=None,
        created_at="2026-04-08T00:00:00Z",
        payload={"layer": "adaptive_overlay"},
    )
    repo.save_memory_node(
        {
            "memory_id": "mem:user:zero-confidence",
            "canonical_key": "user_model:fact:zero-confidence",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "user_model_fact",
            "status": "active",
            "summary": "这是一条零置信度事实",
            "created_at": "2026-04-09T12:00:00Z",
            "updated_at": "2026-04-09T12:30:00Z",
            "metadata": {
                "domain": "user_model",
                "subtype": "preference",
                "category": "preference",
                "kind": "fact",
                "confidence": 0.0,
                "source": "thread:test-zero",
                "created_at": "2026-04-09T12:00:00Z",
            },
        }
    )
    repo.append_memory_revision(
        memory_id="mem:user:zero-confidence",
        summary="这是一条零置信度事实",
        evidence_ref=None,
        created_at="2026-04-09T12:00:00Z",
        payload={
            "domain": "user_model",
            "subtype": "preference",
            "category": "preference",
            "kind": "fact",
            "confidence": 0.0,
            "source": "thread:test-zero",
        },
    )

    with TestClient(create_app()) as client:
        settings = client.get("/api/memory/soul")
        apply = client.post(
            "/api/memory/soul/apply",
            json={
                "core_identity": "长期陪伴、克制稳定、结论先行。",
                "speech_style": "先给结论，再补上下文。",
                "values_and_boundaries": "不代替用户做最终判断。",
                "relationship_stance": "保持低刺激、少施压、结论先行。",
            },
        )
        freeze = client.post("/api/memory/soul/relationship_stance/freeze-auto-evolution")
        rollback = client.post("/api/memory/soul/adaptive_overlay/rollback")
        memory = client.get("/api/memory")
        retired_growth = client.get("/api/memory/growth")

    assert settings.status_code == 200
    body = settings.json()
    assert body["core_identity"] == "长期陪伴、克制稳定、结论先行。"
    assert body["speech_style"] == "目前还没有稳定的说话方式设置。"
    assert body["values_and_boundaries"] == "长期陪伴、克制稳定、结论先行。"
    assert body["relationship_stance"] == "保持低刺激、少施压、结论先行。"
    assert body["has_active_overlay"] is True
    assert body["adaptive_overlay_summary"] == "近期减少鼓励式措辞。"
    assert "layers" not in body
    assert "currentRevisionReason" not in body

    assert apply.status_code == 200
    assert apply.json()["action"] == "apply"
    assert freeze.status_code == 404
    assert rollback.status_code == 404

    assert memory.status_code == 200
    assert memory.json()["fact_memories"] == [
        {
            "id": "mem:user:zero-confidence",
            "content": "这是一条零置信度事实",
            "source_label": "偏好事实",
            "updated_at": "2026-04-09T12:00:00Z",
            "reason": "来自长期对话沉淀的稳定事实记忆。",
            "related_refs": ["thread:test-zero"],
        }
    ]

    assert retired_growth.status_code == 404
