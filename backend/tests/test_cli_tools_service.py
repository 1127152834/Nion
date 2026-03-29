from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from nion.cli_tools.models import CliToolRuntimeInfo
from nion.cli_tools.repository import CliToolsRepository
from nion.cli_tools.service import CliToolsService


def _make_exec(path: Path) -> None:
    path.write_text("#!/bin/sh\nexit 0\n", encoding="utf-8")
    path.chmod(0o755)


def test_list_describe_option_groups_exposes_models_by_provider(monkeypatch, tmp_path) -> None:
    service = CliToolsService(repository=CliToolsRepository(tmp_path / "cli.sqlite3"))
    registry = SimpleNamespace(
        list_runtime_models=lambda: [
            SimpleNamespace(
                provider=SimpleNamespace(id="openai", display_name="OpenAI"),
                runtime_name="gpt-5.4",
                model=SimpleNamespace(display_name="GPT-5.4", model_id="gpt-5.4"),
            ),
            SimpleNamespace(
                provider=SimpleNamespace(id="openai", display_name="OpenAI"),
                runtime_name="gpt-5.4-mini",
                model=SimpleNamespace(display_name="GPT-5.4 mini", model_id="gpt-5.4-mini"),
            ),
            SimpleNamespace(
                provider=SimpleNamespace(id="anthropic", display_name="Anthropic"),
                runtime_name="claude-sonnet",
                model=SimpleNamespace(display_name="Claude Sonnet", model_id="claude-sonnet"),
            ),
        ],
        get_default_model=lambda: SimpleNamespace(provider=SimpleNamespace(id="openai")),
    )
    monkeypatch.setattr("nion.cli_tools.service.get_model_registry_service", lambda: registry)

    payload = service.list_describe_option_groups()

    assert payload["default_provider_id"] == "openai"
    assert payload["groups"] == [
        {
            "provider_id": "openai",
            "provider_name": "OpenAI",
            "models": [
                {"value": "gpt-5.4", "label": "GPT-5.4"},
                {"value": "gpt-5.4-mini", "label": "GPT-5.4 mini"},
            ],
        },
        {
            "provider_id": "anthropic",
            "provider_name": "Anthropic",
            "models": [
                {"value": "claude-sonnet", "label": "Claude Sonnet"},
            ],
        },
    ]


def test_install_command_registers_precise_install_package(monkeypatch, tmp_path) -> None:
    repo = CliToolsRepository(tmp_path / "cli.sqlite3")
    service = CliToolsService(repository=repo)
    installed_exec = tmp_path / "stripe"
    _make_exec(installed_exec)

    monkeypatch.setattr(
        "nion.cli_tools.service.subprocess.run",
        lambda *args, **kwargs: SimpleNamespace(returncode=0, stdout="installed", stderr=""),
    )
    monkeypatch.setattr("nion.cli_tools.service.invalidate_detect_cache", lambda: None)
    monkeypatch.setattr("nion.cli_tools.service.shutil_which", lambda candidate: str(installed_exec) if candidate == "stripe" else None)
    monkeypatch.setattr("nion.cli_tools.service._extract_version_from_path", lambda path: "1.2.3")

    result = service.install_command(command="brew install stripe/stripe-cli/stripe")
    tool = repo.list_custom_tools()[0]

    assert 'Successfully installed and registered "Stripe CLI"' in result
    assert tool.installMethod == "brew"
    assert tool.installPackage == "stripe/stripe-cli/stripe"


def test_check_updates_uses_stored_install_package(tmp_path, monkeypatch) -> None:
    repo = CliToolsRepository(tmp_path / "cli.sqlite3")
    service = CliToolsService(repository=repo)
    exec_path = tmp_path / "stripe"
    _make_exec(exec_path)
    repo.upsert_custom_tool(
        name="Stripe",
        bin_path=str(exec_path),
        bin_name="stripe",
        version="1.0.0",
        install_method="brew",
        install_package="stripe/stripe-cli/stripe",
    )

    monkeypatch.setattr("nion.cli_tools.service._brew_outdated_map", lambda: {"stripe/stripe-cli/stripe": "1.1.0"})
    monkeypatch.setattr("nion.cli_tools.service._npm_outdated_map", lambda: {})

    result = service.check_updates()

    assert "Stripe: brew update available (1.0.0 -> 1.1.0)" in result


def test_update_tool_uses_stored_install_package_and_refreshes_version(tmp_path, monkeypatch) -> None:
    repo = CliToolsRepository(tmp_path / "cli.sqlite3")
    service = CliToolsService(repository=repo)
    exec_path = tmp_path / "stripe"
    _make_exec(exec_path)
    repo.upsert_custom_tool(
        name="Stripe",
        bin_path=str(exec_path),
        bin_name="stripe",
        version="1.0.0",
        install_method="brew",
        install_package="stripe/stripe-cli/stripe",
    )

    commands: list[str] = []

    def fake_run(command, **kwargs):
        commands.append(command)
        return SimpleNamespace(returncode=0, stdout="updated", stderr="")

    monkeypatch.setattr("nion.cli_tools.service.subprocess.run", fake_run)
    monkeypatch.setattr("nion.cli_tools.service.invalidate_detect_cache", lambda: None)
    monkeypatch.setattr("nion.cli_tools.service.shutil_which", lambda candidate: str(exec_path))
    monkeypatch.setattr("nion.cli_tools.service._extract_version_from_path", lambda path: "1.1.0")
    monkeypatch.setattr(
        service,
        "_resolve_custom_tool",
        lambda identifier, include_shadow=True: repo.list_custom_tools()[0],
    )

    result = service.update_tool("Stripe")
    tool = repo.list_custom_tools()[0]

    assert commands == ["brew upgrade stripe/stripe-cli/stripe"]
    assert 'Updated "Stripe" using `brew upgrade stripe/stripe-cli/stripe`.' in result
    assert tool.version == "1.1.0"
    assert tool.installPackage == "stripe/stripe-cli/stripe"


def test_describe_tool_persists_structured_payload(monkeypatch, tmp_path) -> None:
    repo = CliToolsRepository(tmp_path / "cli.sqlite3")
    service = CliToolsService(repository=repo)

    registry = SimpleNamespace(
        get_default_model=lambda: SimpleNamespace(runtime_name="gpt-5.4"),
    )
    model = SimpleNamespace(
        invoke=lambda messages: SimpleNamespace(
            content="""{
  "intro": { "zh": "中文简介", "en": "English intro" },
  "useCases": { "zh": ["用例1"], "en": ["Use case 1"] },
  "guideSteps": { "zh": ["步骤1"], "en": ["Step 1"] },
  "examplePrompts": [
    { "label": "Try", "promptZh": "用 ffmpeg 处理视频", "promptEn": "Use ffmpeg to process video" }
  ]
}"""
        )
    )

    monkeypatch.setattr("nion.cli_tools.service.get_model_registry_service", lambda: registry)
    monkeypatch.setattr("nion.cli_tools.service.create_chat_model", lambda **kwargs: model)

    record = service.describe_tool(tool_id="ffmpeg")
    stored = repo.list_descriptions()["ffmpeg"]

    assert record.structured is not None
    assert record.structured.intro.en == "English intro"
    assert stored.structured is not None
    assert stored.structured.examplePrompts[0].label == "Try"


def test_describe_tool_resolves_model_from_provider_and_model(monkeypatch, tmp_path) -> None:
    repo = CliToolsRepository(tmp_path / "cli.sqlite3")
    service = CliToolsService(repository=repo)

    registry = SimpleNamespace(
        get_default_model=lambda: SimpleNamespace(runtime_name="gpt-5.4"),
    )
    captured: dict[str, str | None] = {}
    model = SimpleNamespace(
        invoke=lambda messages: SimpleNamespace(
            content="""{
  "intro": { "zh": "中文简介", "en": "English intro" },
  "useCases": { "zh": ["用例1"], "en": ["Use case 1"] },
  "guideSteps": { "zh": ["步骤1"], "en": ["Step 1"] },
  "examplePrompts": []
}"""
        )
    )

    monkeypatch.setattr("nion.cli_tools.service.get_model_registry_service", lambda: registry)
    monkeypatch.setattr(
        "nion.cli_tools.service.create_chat_model",
        lambda **kwargs: captured.update({"name": kwargs.get("name")}) or model,
    )

    service.describe_tool(
        tool_id="ffmpeg",
        model_name="anthropic:claude-sonnet",
    )

    assert captured["name"] == "anthropic:claude-sonnet"
