from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore


def test_soul_runtime_compiles_core_narrative_relationship_and_overlay(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_runtime

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    monkeypatch.setattr(soul_runtime, "utcnow_z", lambda: "2026-04-08T00:00:00Z", raising=False)
    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n稳定、克制、长期主义。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是长期陪伴型助手。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n最近减少鼓励式措辞。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    repo.save_memory_record(
        {
            "memory_id": "soul_rel_user_default",
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "面对当前用户时，保持低刺激、少施压、结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {"source_type": "test"},
        }
    )

    runtime = soul_runtime.compile_soul_runtime(repo)

    assert "<soul_runtime>" in runtime
    assert "稳定、克制、长期主义" in runtime
    assert "低刺激、少施压、结论先行" in runtime
    assert "长期陪伴型助手" in runtime
    assert "减少鼓励式措辞" in runtime


def test_soul_runtime_ignores_stale_overlay_or_narrative(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_runtime

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    monkeypatch.setattr(soul_runtime, "utcnow_z", lambda: "2026-04-08T00:00:00Z", raising=False)

    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n稳定、克制、长期主义。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个已经过时的身份叙事。\n",
        created_at="2026-01-01T00:00:00Z",
    )
    store.write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n这是一个过时的 overlay。\n",
        created_at="2026-01-01T00:00:00Z",
    )
    repo.save_memory_record(
        {
            "memory_id": "soul_rel_user_default",
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "面对当前用户时，保持低刺激、少施压、结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {"source_type": "test"},
        }
    )

    runtime = soul_runtime.compile_soul_runtime(repo)

    assert "稳定、克制、长期主义" in runtime
    assert "低刺激、少施压、结论先行" in runtime
    assert "已经过时的身份叙事" not in runtime
    assert "过时的 overlay" not in runtime


def test_soul_runtime_ignores_stale_relationship_soul(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_runtime

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    monkeypatch.setattr(soul_runtime, "utcnow_z", lambda: "2026-04-08T00:00:00Z", raising=False)

    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n稳定、克制、长期主义。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n近期减少鼓励式措辞。\n",
        created_at="2026-04-07T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是长期陪伴型助手。\n",
        created_at="2026-04-07T00:00:00Z",
    )
    repo.save_memory_record(
        {
            "memory_id": "soul_rel_user_default",
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "这是一个过时的 relationship soul。",
            "confidence": 0.9,
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {"source_type": "test"},
        }
    )

    runtime = soul_runtime.compile_soul_runtime(repo)

    assert "稳定、克制、长期主义" in runtime
    assert "长期陪伴型助手" in runtime
    assert "减少鼓励式措辞" in runtime
    assert "过时的 relationship soul" not in runtime


def test_soul_runtime_prefers_canonical_layers_and_derived_relationship_stance(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_runtime
    from nion.memory_os.relationship_soul import refresh_relationship_soul

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    monkeypatch.setattr(soul_runtime, "utcnow_z", lambda: "2026-04-08T00:00:00Z", raising=False)

    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n这是旧的 core record summary。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n这是旧的 narrative record summary。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n这是旧的 overlay record summary。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    repo.save_memory_node(
        {
            "memory_id": "soul_core_main",
            "canonical_key": "soul:layer:core:agent:main",
            "owner_type": "agent",
            "scope": "agent",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "稳定、克制、长期主义。",
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "metadata": {"layer": "core"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_core_main",
        summary="稳定、克制、长期主义。",
        evidence_ref=None,
        created_at="2026-04-06T00:00:00Z",
        payload={"layer": "core"},
    )
    repo.save_memory_node(
        {
            "memory_id": "agent_self_narrative_main",
            "canonical_key": "soul:layer:identity_narrative:agent:main",
            "owner_type": "agent",
            "scope": "agent",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "我是长期陪伴型助手。",
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "metadata": {"layer": "identity_narrative"},
        }
    )
    repo.append_memory_revision(
        memory_id="agent_self_narrative_main",
        summary="我是长期陪伴型助手。",
        evidence_ref=None,
        created_at="2026-04-07T00:00:00Z",
        payload={"layer": "identity_narrative"},
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
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "metadata": {"layer": "adaptive_overlay"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_overlay_active_main",
        summary="近期减少鼓励式措辞。",
        evidence_ref=None,
        created_at="2026-04-07T00:00:00Z",
        payload={"layer": "adaptive_overlay"},
    )

    repo.save_memory_record(
        {
            "memory_id": "rel_01",
            "domain": "relationship",
            "subtype": "initiative_policy",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好低刺激、少施压、结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-07T00:00:00Z",
            "updated_at": "2026-04-07T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    refresh_relationship_soul(repo, created_at="2026-04-07T00:01:00Z")

    runtime = soul_runtime.compile_soul_runtime(repo)

    assert "这是旧的 core record summary" not in runtime
    assert "这是旧的 narrative record summary" not in runtime
    assert "这是旧的 overlay record summary" not in runtime
    assert "稳定、克制、长期主义" in runtime
    assert "我是长期陪伴型助手" in runtime
    assert "近期减少鼓励式措辞" in runtime
    assert "用户偏好低刺激、少施压、结论先行" in runtime


def test_build_relationship_soul_summary_respects_real_freshness_window(monkeypatch, tmp_path: Path):
    from nion.memory_os import relationship_soul

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    monkeypatch.setattr(relationship_soul, "utcnow_z", lambda: "2026-04-08T00:00:00Z", raising=False)

    repo.save_memory_node(
        {
            "memory_id": "soul_rel_user_default",
            "canonical_key": "soul:layer:relationship_stance:user:default",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "这是一个已经过期的 relationship stance。",
            "created_at": "2026-01-01T00:00:00Z",
            "updated_at": "2026-01-01T00:00:00Z",
            "metadata": {"layer": "relationship_stance"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_rel_user_default",
        summary="这是一个已经过期的 relationship stance。",
        evidence_ref=None,
        created_at="2026-01-01T00:00:00Z",
        payload={"layer": "relationship_stance"},
    )

    summary = relationship_soul.build_relationship_soul_summary(repo)

    assert summary is None


def test_soul_runtime_skips_expired_overlay_but_keeps_fresh_narrative(monkeypatch, tmp_path: Path):
    from nion.memory_os import soul_runtime

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    monkeypatch.setattr(soul_runtime, "utcnow_z", lambda: "2026-04-09T00:00:00Z", raising=False)

    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n稳定、克制、长期主义。\n",
        created_at="2026-04-01T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是仍然有效的身份叙事。\n",
        created_at="2026-04-04T00:00:00Z",
    )
    store.write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n这是一个应该过期的 overlay。\n",
        created_at="2026-04-01T00:00:00Z",
    )

    runtime = soul_runtime.compile_soul_runtime(repo)

    assert "稳定、克制、长期主义" in runtime
    assert "我是仍然有效的身份叙事" in runtime
    assert "应该过期的 overlay" not in runtime
