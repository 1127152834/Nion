from nion.memory_os.builtin_provider import BuiltinMemoryProvider


def test_builtin_memory_provider_reads_legacy_memory_shape(tmp_path):
    provider = BuiltinMemoryProvider(base_dir=tmp_path)

    payload = provider.get_memory()

    assert payload["version"] == "1.0"
    assert payload["facts"] == []


def test_builtin_memory_provider_deletes_fact_and_returns_updated_payload(tmp_path):
    provider = BuiltinMemoryProvider(base_dir=tmp_path)
    provider.save_memory(
        {
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
                    "content": "prefers concise responses",
                    "category": "preference",
                    "confidence": 0.9,
                    "createdAt": "2026-03-30T00:00:00Z",
                    "source": "thread-1",
                }
            ],
        }
    )

    payload = provider.delete_fact("fact-1")

    assert payload["facts"] == []
