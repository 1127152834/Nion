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
        outputs={
            "created_pages": ["sources/roadmap.md"],
            "updated_pages": ["overview.md"],
            "contradiction_pages": [],
            "graph_rebuilt": True,
        },
    )

    assert updated.status == "succeeded"
    assert updated.outputs["graph_rebuilt"] is True
