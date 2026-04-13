def test_intent_router_maps_common_aliases_to_system_objects():
    from nion.capability_backbone.intent_router import route_system_object_intent

    assert route_system_object_intent("帮我改一下 identify") == "identity_document"
    assert route_system_object_intent("帮我改一下 soul") == "soul_document"
    assert route_system_object_intent("现在有哪些模型") == "model_catalog"
    assert route_system_object_intent("现在有多少桥接在线") == "bridge_status"
    assert route_system_object_intent("帮我新增一个定时任务") == "automation_registry"
