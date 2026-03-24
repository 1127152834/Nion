from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.agents.middlewares.recall_capture_middleware import RecallCaptureMiddleware


def _runtime(thread_id: str) -> Runtime:
    return Runtime(context={"thread_id": thread_id})


def test_capture_archives_only_new_recallable_turns(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(content="Old question", id="h-old"),
            AIMessage(content="Old answer", id="ai-old"),
            SystemMessage(content="<continuity_context>\nOld snippet\n</continuity_context>"),
            HumanMessage(content="How did we fix staging auth?", id="h-1"),
            AIMessage(content="We rotated the staging token and restarted the worker.", id="ai-1"),
        ]
    }

    middleware.after_agent(state, _runtime("thread-1"))
    middleware.after_agent(state, _runtime("thread-1"))

    results = middleware._archive.search_global("staging token", limit=5)
    assert len(results) == 1
    assert "rotated the staging token" in results[0].snippet


def test_capture_normalizes_mixed_content_without_serializing_raw_blocks(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(
                content=[
                    {"type": "text", "text": "Summarize the screenshot"},
                    {"type": "image_url", "image_url": "file:///tmp/example.png"},
                ],
                id="h-1",
            ),
            AIMessage(content="It shows a login form.", id="ai-1"),
        ]
    }

    middleware.after_agent(state, _runtime("thread-1"))

    results = middleware._archive.search_global("Summarize the screenshot", limit=5)
    assert len(results) == 1
    assert "image_url" not in results[0].snippet


def test_capture_ignores_view_image_middleware_prompts(tmp_path):
    middleware = RecallCaptureMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(content="Analyze the image", id="h-1"),
            HumanMessage(
                content=[
                    {"type": "text", "text": "Here are the images you've viewed:"},
                    {"type": "image_url", "image_url": "file:///tmp/example.png"},
                ],
                id="vh-1",
            ),
            AIMessage(content="The screenshot shows a login form.", id="ai-1"),
        ]
    }

    middleware.after_agent(state, _runtime("thread-1"))

    assert middleware._archive.search_global("Here are the images you've viewed", limit=5) == []


def test_before_model_injects_thread_scoped_continuity_block(tmp_path):
    capture = RecallCaptureMiddleware(base_dir=tmp_path)
    capture._archive.append_turns(
        thread_id="thread-1",
        agent_name="lead_agent",
        turns=[
            capture._turn("human", "How did we fix staging auth?", source_message_id="h-1"),
            capture._turn(
                "ai",
                "We rotated the staging token and restarted the worker.",
                source_message_id="ai-1",
            ),
        ],
    )
    capture._archive.append_turns(
        thread_id="thread-2",
        agent_name="lead_agent",
        turns=[
            capture._turn("ai", "We rotated the production token.", source_message_id="ai-2"),
        ],
    )

    middleware = ContinuityMiddleware(base_dir=tmp_path)
    update = middleware.before_model(
        {"messages": [HumanMessage(content="continue the staging fix", id="h-2")]},
        _runtime("thread-1"),
    )

    assert update is not None
    injected = update["messages"][0]
    assert isinstance(injected, SystemMessage)
    assert "continuity_context" in str(injected.content).lower()
    assert "staging token" in str(injected.content)
    assert "production token" not in str(injected.content)
