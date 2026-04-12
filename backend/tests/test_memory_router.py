from unittest.mock import patch

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from app.gateway.routers import memory
from nion.memory_os.repository import MemoryOSRepository
from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository


def _sample_memory(facts: list[dict] | None = None) -> dict:
    return {
        "version": "1.0",
        "lastUpdated": "2026-03-26T12:00:00Z",
        "user": {
            "workContext": {"summary": "", "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": facts or [],
    }


def _sample_user_facing_memory() -> dict:
    return {
        "user_profile": [],
        "long_term_background": [],
        "fact_memories": [],
    }


def collect_gateway_routes() -> set[str]:
    app = create_app()
    return {route.path for route in app.routes}


def test_gateway_docs_and_router_surface_match() -> None:
    routes = collect_gateway_routes()

    assert "/api/memory" in routes
    assert "/api/memory/growth" not in routes
    assert "/api/memory/facts" not in routes
    assert "/api/memory/import" not in routes
    assert "/api/memory/export" not in routes


def test_memory_route_returns_grouped_user_facing_payload(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    app = FastAPI()
    app.include_router(memory.router)

    with TestClient(app) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    assert response.json() == _sample_user_facing_memory()


def test_memory_router_status_has_no_runtime_block() -> None:
    app = create_app()

    with TestClient(app) as client:
        response = client.get("/api/memory/status")

    assert response.status_code == 200
    payload = response.json()
    assert "config" in payload
    assert "data" in payload
    assert "runtime" not in payload


def test_memory_router_reads_memory_os_projection_without_legacy_updater(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "user_work_1",
            "domain": "user_model",
            "subtype": "workContext",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "负责财务 BP",
            "confidence": 0.8,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    payload = response.json()
    assert payload["user_profile"] == [
        {
            "id": "user_profile.work_context",
            "content": "负责财务 BP",
            "source_label": "工作语境",
            "updated_at": "2026-04-07T00:00:00Z",
            "reason": "用户画像中的工作语境长期有效，适合作为稳定背景记忆展示。",
            "related_refs": [],
        }
    ]


def test_memory_router_projects_user_identity_profile_into_user_profile_group(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    UserIdentityRepository(tmp_path).save(
        UserIdentityProfile(
            user_name="张天成",
            preferred_address_for_user="大哥",
            assistant_self_name="小老弟",
            mutual_addressing_rule="你叫我大哥，我叫你小老弟",
            communication_style_preferences=["先给结论", "直接一点"],
            user_role="财务 BP",
            timezone="Asia/Shanghai",
            interaction_boundaries=["不要替我拍板", "少施压"],
            long_term_background_summary="长期负责经营分析与月度复盘。",
        )
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    payload = response.json()
    user_profile = {item["id"]: item for item in payload["user_profile"]}

    assert user_profile["user_profile.user_name"]["content"] == "张天成"
    assert user_profile["user_profile.preferred_address"]["content"] == "大哥"
    assert user_profile["user_profile.assistant_self_name"]["content"] == "小老弟"
    assert user_profile["user_profile.mutual_addressing_rule"]["content"] == "你叫我大哥，我叫你小老弟"
    assert user_profile["user_profile.communication_preferences"]["content"] == "先给结论 / 直接一点"
    assert user_profile["user_profile.user_role"]["content"] == "财务 BP"
    assert user_profile["user_profile.timezone"]["content"] == "Asia/Shanghai"
    assert user_profile["user_profile.interaction_boundaries"]["content"] == "不要替我拍板 / 少施压"
    assert user_profile["user_profile.long_term_background"]["content"] == "长期负责经营分析与月度复盘。"


def test_memory_router_maps_fact_memories_to_user_facing_items(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "fact_preference_1",
            "domain": "user_model",
            "subtype": "preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好先给结论，再补背景。",
            "confidence": 0.91,
            "created_at": "2026-04-07T09:00:00Z",
            "updated_at": "2026-04-07T10:00:00Z",
            "provenance": {"source_type": "thread", "source_ref": "thread:test"},
        }
    )
    repo.save_memory_node(
        {
            "memory_id": "fact_preference_1",
            "canonical_key": "user_model:fact:preference_1",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "user_model_fact",
            "status": "active",
            "summary": "用户偏好先给结论，再补背景。",
            "created_at": "2026-04-07T09:00:00Z",
            "updated_at": "2026-04-07T10:00:00Z",
            "metadata": {
                "domain": "user_model",
                "subtype": "preference",
                "category": "preference",
                "kind": "fact",
                "confidence": 0.91,
                "source": "thread:test",
                "created_at": "2026-04-07T09:00:00Z",
            },
        }
    )
    repo.append_memory_revision(
        memory_id="fact_preference_1",
        summary="用户偏好先给结论，再补背景。",
        evidence_ref=None,
        created_at="2026-04-07T09:00:00Z",
        payload={
            "domain": "user_model",
            "subtype": "preference",
            "category": "preference",
            "kind": "fact",
            "confidence": 0.91,
            "source": "thread:test",
        },
    )

    with TestClient(create_app()) as client:
        response = client.get("/api/memory")

    assert response.status_code == 200
    assert response.json()["fact_memories"] == [
        {
            "id": "fact_preference_1",
            "content": "用户偏好先给结论，再补背景。",
            "source_label": "偏好事实",
            "updated_at": "2026-04-07T09:00:00Z",
            "reason": "来自长期对话沉淀的稳定事实记忆。",
            "related_refs": ["thread:test"],
        }
    ]


def test_memory_router_status_uses_memory_os_projection_without_legacy_updater(
    monkeypatch,
    tmp_path,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        response = client.get("/api/memory/status")

    assert response.status_code == 200
    assert "data" in response.json()
    assert "user_profile" in response.json()["data"]


def test_memory_router_does_not_register_memory_os_or_maintenance_routes() -> None:
    routes = collect_gateway_routes()

    assert "/api/memory" in routes
    assert "/api/memory/config" in routes
    assert "/api/memory/status" in routes
    assert "/api/memory/reload" not in routes

    assert "/api/memory-os/providers/families" not in routes
    assert "/api/autodream/run" not in routes
    assert "/api/self-maintenance/run" not in routes
    assert "/api/heartbeat/status" not in routes
    assert "/api/memory/compact" not in routes
    assert not any(
        route == "/api/memory/rebuild" or route.startswith("/api/memory/rebuild/")
        for route in routes
    )
