from nion.openviking.retrieval_intent import classify_retrieval_intent


def test_notebook_intent_detects_project_and_note_queries():
    assert classify_retrieval_intent("帮我看看我笔记里关于 Alpha 项目的内容").search_notebook is True
    assert classify_retrieval_intent("总结一下我记录过的 onboarding 方案").search_notebook is True
    assert classify_retrieval_intent("解释一下 Python 的 GIL").search_notebook is False
