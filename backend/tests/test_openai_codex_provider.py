from __future__ import annotations

import importlib.util
import sys
import types
from dataclasses import dataclass
from pathlib import Path


@dataclass
class _StubCodexCliCredential:
    access_token: str
    account_id: str


def _load_codex_provider_module():
    credential_loader = types.ModuleType("nion.models.credential_loader")
    credential_loader.CodexCliCredential = _StubCodexCliCredential
    credential_loader.load_codex_cli_credential = lambda: _StubCodexCliCredential(
        access_token="token",
        account_id="acct",
    )

    nion_pkg = sys.modules.setdefault("nion", types.ModuleType("nion"))
    models_pkg = types.ModuleType("nion.models")
    setattr(nion_pkg, "models", models_pkg)
    sys.modules["nion.models"] = models_pkg
    sys.modules["nion.models.credential_loader"] = credential_loader

    module_path = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "models"
        / "openai_codex_provider.py"
    )
    spec = importlib.util.spec_from_file_location(
        "test_openai_codex_provider_module",
        module_path,
    )
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def test_codex_provider_merges_streamed_output_when_completed_response_is_empty(monkeypatch):
    provider_module = _load_codex_provider_module()
    CodexChatModel = provider_module.CodexChatModel

    model = CodexChatModel()

    class FakeStream:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def raise_for_status(self):
            return None

        def iter_lines(self):
            return iter(
                [
                    'data: {"type":"response.output_item.done","output_index":0,"item":{"type":"message","content":[{"type":"output_text","text":"streamed text"}]}}',
                    'data: {"type":"response.completed","response":{"model":"gpt-5.4","output":[],"usage":{"input_tokens":1,"output_tokens":2,"total_tokens":3}}}',
                ]
            )

    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def stream(self, *args, **kwargs):
            return FakeStream()

    monkeypatch.setattr(provider_module.httpx, "Client", FakeClient)

    response = model._stream_response(headers={}, payload={})

    assert response["output"] == [
        {
            "type": "message",
            "content": [{"type": "output_text", "text": "streamed text"}],
        }
    ]
