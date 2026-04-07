from pathlib import Path

from nion.memory_os.repository import MemoryOSRepository


def test_soul_artifact_store_supports_staged_identity_narrative(tmp_path: Path):
    from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)

    artifact = store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个正在变得更稳的助手。\n",
        created_at="2026-04-07T00:00:00Z",
        staged=True,
    )

    assert artifact["memory_record"]["memory_id"] == "agent_self_narrative_staged_main"
    assert artifact["memory_record"]["status"] == "candidate"
    assert artifact["artifact_path"].endswith("memory-os/artifacts/agent-self/narrative/staged_identity_narrative.md")
