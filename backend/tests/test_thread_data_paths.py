from langgraph.runtime import Runtime

from nion.agents.middlewares.thread_data_middleware import ThreadDataMiddleware


def test_thread_data_middleware_points_workspace_path_to_workdir(tmp_path):
    middleware = ThreadDataMiddleware(base_dir=str(tmp_path), lazy_init=True)

    result = middleware.before_agent(
        state={},
        runtime=Runtime(context={"thread_id": "thread-123"}),
    )

    assert result is not None
    assert result["thread_data"]["workspace_path"].endswith(
        "threads/thread-123/user-data/workdir"
    )
    assert result["thread_data"]["uploads_path"].endswith(
        "threads/thread-123/user-data/uploads"
    )
    assert result["thread_data"]["outputs_path"].endswith(
        "threads/thread-123/user-data/outputs"
    )

