from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore


def test_soul_runtime_compiles_core_narrative_relationship_and_overlay(tmp_path: Path):
    from nion.memory_os.soul_runtime import compile_soul_runtime

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
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

    runtime = compile_soul_runtime(repo)

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
