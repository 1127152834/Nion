from nion.knowledge.compile_jobs import KnowledgeCompileJobStore


def test_compile_job_round_trips_outputs(tmp_path):
    store = KnowledgeCompileJobStore(base_dir=tmp_path)
    job = store.create_job(
        source_ids=["source:notebook_note:note_1"],
        trigger_mode="queue_approval",
    )
    updated = store.update_job(
        job.job_id,
        status="succeeded",
        stage="finalizing",
        outputs={
            "created_pages": ["sources/roadmap.md"],
            "created_page_ids": ["sources:note_1"],
            "updated_pages": ["overview.md"],
            "stale_pages": [],
            "archived_pages": [],
        },
    )

    assert updated.status == "succeeded"
    assert updated.stage == "finalizing"
    assert updated.created_page_ids == ["sources:note_1"]
