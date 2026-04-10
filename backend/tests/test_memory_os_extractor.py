from langchain_core.messages import AIMessage, HumanMessage

from nion.memory_os.extractor import extract_candidates_from_exchange


def test_extractor_turns_user_preference_signal_into_candidate():
    candidates = extract_candidates_from_exchange(
        messages=[
            HumanMessage(content="以后你直接一点，先给结论。"),
            AIMessage(content="明白。"),
        ],
        thread_id="thread-1",
    )

    assert candidates
    assert any("直接" in candidate.summary for candidate in candidates)


def test_extractor_turns_user_identity_contract_into_user_identity_candidates():
    candidates = extract_candidates_from_exchange(
        messages=[
            HumanMessage(content="我叫张天成，你以后叫我大哥，我叫你小老弟。"),
            AIMessage(content="记住了。"),
        ],
        thread_id="thread-identity",
    )

    by_subtype = {candidate.proposed_subtype: candidate for candidate in candidates}

    assert "identity_name" in by_subtype
    assert "mutual_addressing" in by_subtype

    assert by_subtype["identity_name"].proposed_domain == "user_model"
    assert by_subtype["identity_name"].summary == "用户姓名：张天成"
    assert by_subtype["identity_name"].raw_evidence_refs
    assert all(ref.startswith("compat_") for ref in by_subtype["identity_name"].raw_evidence_refs)

    assert by_subtype["mutual_addressing"].proposed_domain == "relationship"
    assert by_subtype["mutual_addressing"].summary == "你叫我大哥，我叫你小老弟"
