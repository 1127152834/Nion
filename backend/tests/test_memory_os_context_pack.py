from pathlib import Path

from nion.memory_os.context_assembler import MemoryOSContextAssembler
from nion.memory_os.context_pack import MemoryContextPack, MemoryContextPackItem
from nion.memory_os.repository import MemoryOSRepository


def test_memory_context_pack_renders_prompt_block():
    pack = MemoryContextPack(
        items=[
            MemoryContextPackItem(
                source_kind="user_model",
                title="沟通偏好",
                content="用户偏好直接表达。",
            )
        ]
    )

    rendered = pack.to_prompt_block()

    assert "<memory_os_context>" in rendered
    assert "用户偏好直接表达" in rendered


def test_context_assembler_reads_active_user_model_records(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_01",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    assembler = MemoryOSContextAssembler(repo)

    pack = assembler.build_prompt_memory_pack()

    assert "用户偏好结论先行" in pack.to_prompt_block()


def test_context_assembler_does_not_mix_soul_into_general_memory_pack(tmp_path: Path):
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
            "summary": "稳定、克制、长期主义。",
            "confidence": 1.0,
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    assembler = MemoryOSContextAssembler(repo)

    pack = assembler.build_prompt_memory_pack()

    assert "稳定、克制、长期主义" not in pack.to_prompt_block()
