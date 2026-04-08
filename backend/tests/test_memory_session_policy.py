from nion.memory.session_policy import resolve_memory_session_policy


def test_memory_write_false_disables_durable_capture_and_memory_write():
    policy = resolve_memory_session_policy(
        {
            "session_mode": "temporary_chat",
            "memory_read": True,
            "memory_write": False,
        }
    )

    assert policy.memory_read is True
    assert policy.memory_write is False
    assert policy.allow_durable_evidence is False
    assert policy.allow_memory_write is False


def test_memory_read_false_blocks_long_term_reads():
    policy = resolve_memory_session_policy(
        {
            "session_mode": "workspace",
            "memory_read": False,
            "memory_write": False,
        }
    )

    assert policy.memory_read is False
    assert policy.allow_memory_read is False


def test_temporary_chat_defaults_memory_write_to_false():
    policy = resolve_memory_session_policy(
        {
            "session_mode": "temporary_chat",
            "memory_read": True,
        }
    )

    assert policy.memory_write is False
    assert policy.allow_durable_evidence is False
    assert policy.allow_memory_write is False
