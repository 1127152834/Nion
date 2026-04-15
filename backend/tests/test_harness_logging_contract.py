from pathlib import Path


RUNTIME_FILES = [
    Path("backend/packages/harness/nion/agents/lead_agent/prompt.py"),
    Path("backend/packages/harness/nion/agents/memory/queue.py"),
    Path("backend/packages/harness/nion/agents/middlewares/clarification_middleware.py"),
    Path("backend/packages/harness/nion/agents/middlewares/thread_data_middleware.py"),
    Path("backend/packages/harness/nion/agents/middlewares/view_image_middleware.py"),
    Path("backend/packages/harness/nion/skills/loader.py"),
    Path("backend/packages/harness/nion/skills/parser.py"),
]


def test_runtime_harness_modules_do_not_use_bare_print():
    for path in RUNTIME_FILES:
        source = path.read_text(encoding="utf-8")
        assert "print(" not in source, f"{path} still contains bare print()"
