from nion.memory_os.openviking_models import OpenVikingProviderConfig
from nion.memory_os.openviking_provider import OpenVikingMemoryProvider


def test_openviking_provider_config_accepts_embedded_mode():
    config = OpenVikingProviderConfig(mode="embedded")

    assert config.mode == "embedded"
    assert config.base_url is None


def test_openviking_provider_config_requires_base_url_for_remote_mode():
    config = OpenVikingProviderConfig(
        mode="remote",
        base_url="https://memory.example.com",
    )

    assert config.mode == "remote"
    assert config.base_url == "https://memory.example.com"


def test_openviking_memory_provider_embedded_mode_reads_memory_payload(tmp_path):
    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert "user" in payload


def test_openviking_memory_provider_embedded_mode_reports_autodream_domain():
    provider = OpenVikingMemoryProvider(config={"mode": "embedded"})

    assert "autodream_journal" in provider.supported_domains()


def test_openviking_memory_provider_remote_mode_uses_base_url(monkeypatch):
    calls = {"base_url": None}

    class FakeRemoteClient:
        def __init__(self, *, base_url, api_key=None):
            calls["base_url"] = base_url

        def get_memory(self):
            return {"version": "1.0", "facts": []}

    monkeypatch.setattr(
        "nion.memory_os.openviking_provider.OpenVikingRemoteClient",
        FakeRemoteClient,
        raising=False,
    )

    provider = OpenVikingMemoryProvider(
        config={"mode": "remote", "base_url": "https://memory.example.com"},
    )
    provider.get_memory()

    assert calls["base_url"] == "https://memory.example.com"


def test_openviking_memory_provider_embedded_mode_lists_notebook_resources(tmp_path):
    from nion.notebook.service import NotebookService
    from nion.openviking.notebook_ingest import EmbeddedNotebookIngestService

    notebook = NotebookService(base_dir=tmp_path)
    notebook.create_note(
        directory="projects/alpha",
        title="Roadmap",
        body="# Roadmap\n\nAlpha launch depends on onboarding quality.",
    )
    EmbeddedNotebookIngestService(base_dir=tmp_path).reindex_all()

    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    items = provider.list_notebook_resources()

    assert len(items) == 1
    assert items[0]["source_relative_path"] == "projects/alpha/roadmap.md"


def test_openviking_memory_provider_embedded_mode_lists_dream_logs(tmp_path):
    from nion.openviking.autodream_models import DreamEntry
    from nion.openviking.autodream_store import AutoDreamStore

    store = AutoDreamStore(base_dir=tmp_path)
    store.write_entry(
        DreamEntry(
            dream_id="dream_1",
            started_at="2026-03-30T00:00:00Z",
            ended_at="2026-03-30T00:05:00Z",
            time_window_start="2026-03-29T00:00:00Z",
            time_window_end="2026-03-30T00:00:00Z",
            summary="Consolidated notebook and recall learnings.",
            what_i_did=["Reviewed notebook retrieval work."],
            what_i_learned=["Notebook retrieval should stay provenance-rich."],
            what_changed=[],
            what_i_plan_to_change=[],
            what_i_changed=[],
            stale_items=[],
            agent_memory_updates=[],
            user_memory_candidates=[],
            action_proposals=[],
            sources=["recall", "notebook"],
        )
    )

    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    items = provider.list_autodream_entries()

    assert len(items) == 1
    assert items[0]["dream_id"] == "dream_1"


def test_openviking_memory_provider_embedded_mode_round_trips_user_memory(tmp_path):
    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    payload = {
        "version": "1.0",
        "lastUpdated": "",
        "user": {
            "workContext": {"summary": "Working on OpenViking migration", "updatedAt": ""},
            "personalContext": {"summary": "", "updatedAt": ""},
            "topOfMind": {"summary": "", "updatedAt": ""},
        },
        "history": {
            "recentMonths": {"summary": "", "updatedAt": ""},
            "earlierContext": {"summary": "", "updatedAt": ""},
            "longTermBackground": {"summary": "", "updatedAt": ""},
        },
        "facts": [],
    }

    provider.save_memory(payload)
    current = provider.get_memory()

    assert current["user"]["workContext"]["summary"] == "Working on OpenViking migration"


def test_openviking_memory_provider_embedded_mode_round_trips_agent_memory(tmp_path):
    provider = OpenVikingMemoryProvider(
        base_dir=tmp_path,
        config={"mode": "embedded"},
    )

    payload = {
        "version": "1.0",
        "lastUpdated": "",
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
        "facts": [
            {
                "id": "fact-1",
                "content": "Use OpenViking provider for notebook-aware retrieval.",
                "category": "context",
                "confidence": 0.9,
                "createdAt": "2026-03-30T00:00:00Z",
                "source": "agent-memory",
            }
        ],
    }

    provider.save_memory(payload)
    current = provider.get_memory()

    assert current["facts"][0]["content"] == "Use OpenViking provider for notebook-aware retrieval."
