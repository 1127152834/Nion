from pathlib import Path

from nion.agents.lead_agent.prompt import get_agent_soul
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore


def test_get_agent_soul_prefers_compiled_soul_runtime(tmp_path: Path, monkeypatch):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n稳定、结论先行。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是一个长期陪伴型助手。\n",
        created_at="2026-04-06T00:00:00Z",
    )

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    result = get_agent_soul(None)

    assert "<soul_runtime>" in result
    assert "稳定、结论先行" in result
    assert "<soul>" not in result


def test_get_agent_soul_falls_back_to_legacy_soul_file_when_runtime_missing(
    tmp_path: Path,
    monkeypatch,
):
    (tmp_path / "SOUL.md").write_text("legacy soul fallback", encoding="utf-8")
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    result = get_agent_soul(None)

    assert "<soul>" in result
    assert "legacy soul fallback" in result

