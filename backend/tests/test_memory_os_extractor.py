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
