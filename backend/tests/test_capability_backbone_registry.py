def test_capability_registry_includes_first_batch_system_objects():
    from nion.capability_backbone.registry import build_system_object_registry

    registry = build_system_object_registry()
    ids = {item["id"] for item in registry}

    assert "identity_document" in ids
    assert "soul_document" in ids
    assert "active_memory_document" in ids
    assert "automation_registry" in ids
    assert "model_catalog" in ids
    assert "bridge_status" in ids
    assert "skill_registry" in ids
    assert "notebook_registry" in ids
