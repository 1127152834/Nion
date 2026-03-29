from __future__ import annotations

import json
import re
import shlex
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from shutil import which as shutil_which
from typing import Any

from langchain_core.messages import HumanMessage

from nion.model_management.service import get_model_registry_service
from nion.models import create_chat_model
from nion.telemetry.token_source import token_source_context

from .catalog import get_catalog_tool, list_catalog_tools, list_extra_well_known_bins
from .detect import detect_all_cli_tools, detect_brew, detect_catalog_tool, invalidate_detect_cache
from .models import (
    CliToolCatalogProjectionItem,
    CliToolDescriptionRecord,
    CliToolRuntimeInfo,
    CliToolStructuredDesc,
    CustomCliTool,
)
from .repository import CliToolsRepository


class CliToolsService:
    def __init__(self, repository: CliToolsRepository | None = None) -> None:
        self._repository = repository or CliToolsRepository()

    def list_catalog(self) -> list[dict[str, Any]]:
        return [tool.model_dump() for tool in list_catalog_tools()]

    def get_catalog_detail(self, tool_id: str) -> dict[str, Any] | None:
        tool = get_catalog_tool(tool_id)
        return tool.model_dump() if tool is not None else None

    def get_tool_status(self, tool_id: str) -> CliToolRuntimeInfo | None:
        tool = get_catalog_tool(tool_id)
        if tool is None:
            return None
        return detect_catalog_tool(tool)

    def list_installed_payload(self) -> dict[str, Any]:
        detected = detect_all_cli_tools()
        catalog = detected["catalog"]
        extra = [
            item.model_copy(
                update={
                    "displayName": next(
                        (entry[1] for entry in list_extra_well_known_bins() if entry[0] == item.id),
                        item.displayName or item.id,
                    )
                }
            )
            for item in detected["extra"]
        ]
        descriptions = self._repository.list_descriptions()
        all_custom = self._repository.list_custom_tools()
        catalog_bin_paths = {
            item.binPath for item in catalog if item.binPath is not None
        }
        custom_visible = [
            item for item in all_custom if item.binPath not in catalog_bin_paths
        ]
        return {
            "tools": [item.model_dump() for item in catalog],
            "extra": [item.model_dump() for item in extra],
            "custom": [item.model_dump() for item in custom_visible],
            "descriptions": self._serialize_descriptions(descriptions),
            "platform": sys.platform,
            "hasBrew": detect_brew(),
        }

    def list_describe_option_groups(self) -> dict[str, Any]:
        registry = get_model_registry_service()
        runtime_models = registry.list_runtime_models()
        groups: dict[str, dict[str, Any]] = {}
        for item in runtime_models:
            provider_id = item.provider.id
            group = groups.setdefault(
                provider_id,
                {
                    "provider_id": provider_id,
                    "provider_name": item.provider.display_name,
                    "models": [],
                },
            )
            group["models"].append(
                {
                    "value": item.runtime_name,
                    "label": item.model.display_name or item.model.model_id,
                }
            )

        default_provider_id = registry.get_default_model().provider.id
        return {
            "groups": list(groups.values()),
            "default_provider_id": default_provider_id,
        }

    def create_custom_tool(
        self,
        *,
        bin_path: str,
        name: str | None = None,
        install_method: str = "unknown",
        install_package: str = "",
    ) -> CustomCliTool:
        path_obj = Path(bin_path)
        if not path_obj.is_absolute():
            raise ValueError("binPath must be an absolute path")
        if not path_obj.exists():
            raise ValueError("File not found or not executable")
        if not path_obj.is_file() or not os_access_executable(path_obj):
            raise ValueError("File not found or not executable")
        version = _extract_version_from_path(str(path_obj))
        return self._repository.upsert_custom_tool(
            name=(name or path_obj.name).strip() or path_obj.name,
            bin_path=str(path_obj),
            bin_name=path_obj.name,
            version=version,
            install_method=install_method,
            install_package=install_package,
        )

    def delete_custom_tool(self, tool_id: str) -> bool:
        return self._repository.delete_custom_tool(tool_id)

    def get_custom_tool(self, tool_id: str) -> CustomCliTool | None:
        return self._repository.get_custom_tool(tool_id)

    def list_custom_tools(self) -> list[CustomCliTool]:
        return self._repository.list_custom_tools()

    def bulk_upsert_descriptions(self, entries: list[tuple[str, str, str]]) -> None:
        self._repository.bulk_upsert_descriptions(entries)

    def list_tools(self, *, format: str = "text") -> str | dict[str, Any]:
        detected = detect_all_cli_tools()
        descriptions = self._repository.list_descriptions()
        all_custom = self._repository.list_custom_tools()
        catalog_bin_paths = {item.binPath for item in detected["catalog"] if item.binPath}
        custom_visible = [item for item in all_custom if item.binPath not in catalog_bin_paths]

        if format == "json":
            return {
                "catalog": [
                    {
                        "id": runtime.id,
                        "name": get_catalog_tool(runtime.id).name if get_catalog_tool(runtime.id) else runtime.id,
                        "status": runtime.status,
                        "version": runtime.version,
                        "binPath": runtime.binPath,
                        "description": descriptions.get(runtime.id).en if runtime.id in descriptions else None,
                    }
                    for runtime in detected["catalog"]
                ],
                "extra": [
                    {
                        "id": runtime.id,
                        "name": next((entry[1] for entry in list_extra_well_known_bins() if entry[0] == runtime.id), runtime.id),
                        "status": runtime.status,
                        "version": runtime.version,
                        "binPath": runtime.binPath,
                        "description": descriptions.get(runtime.id).en if runtime.id in descriptions else None,
                    }
                    for runtime in detected["extra"]
                ],
                "custom": [item.model_dump() for item in custom_visible],
            }

        lines: list[str] = ["## Catalog Tools (Curated)"]
        for runtime in detected["catalog"]:
            tool = get_catalog_tool(runtime.id)
            if tool is None:
                continue
            marker = "✓" if runtime.status != "not_installed" else "✗"
            version = f" v{runtime.version}" if runtime.version else ""
            description = descriptions.get(runtime.id).en if runtime.id in descriptions else tool.summaryEn
            lines.append(f"{marker} {tool.name}{version}: {description}")

        if detected["extra"]:
            lines.append("")
            lines.append("## System Detected Tools")
            for runtime in detected["extra"]:
                label = next((entry[1] for entry in list_extra_well_known_bins() if entry[0] == runtime.id), runtime.id)
                version = f" v{runtime.version}" if runtime.version else ""
                description = f": {descriptions[runtime.id].en}" if runtime.id in descriptions else ""
                lines.append(f"✓ {label}{version}{description}")

        if custom_visible:
            lines.append("")
            lines.append("## Custom Tools")
            for tool in custom_visible:
                version = f" v{tool.version}" if tool.version else ""
                description = descriptions.get(tool.id).en if tool.id in descriptions else tool.binPath
                lines.append(f"✓ {tool.name}{version}: {description}")

        return "\n".join(lines)

    def describe_tool(
        self,
        *,
        tool_id: str,
        model_name: str | None = None,
    ) -> CliToolDescriptionRecord:
        catalog_tool = get_catalog_tool(tool_id)
        extra_entry = next(
            (item for item in list_extra_well_known_bins() if item[0] == tool_id),
            None,
        )
        custom_tool = None if catalog_tool or extra_entry else self.get_custom_tool(tool_id)

        if catalog_tool is None and extra_entry is None and custom_tool is None:
            raise ValueError("Tool not found")
        if catalog_tool is not None and not catalog_tool.supportsAutoDescribe:
            raise ValueError("Auto-describe not supported for this tool")

        tool_name = (
            catalog_tool.name
            if catalog_tool is not None
            else extra_entry[1]
            if extra_entry is not None
            else custom_tool.name
        )
        bin_names = (
            ", ".join(catalog_tool.binNames)
            if catalog_tool is not None
            else extra_entry[2]
            if extra_entry is not None
            else custom_tool.binName
        )
        categories = (
            ", ".join(catalog_tool.categories)
            if catalog_tool is not None
            else "general"
        )
        homepage = catalog_tool.homepage if catalog_tool is not None else "N/A"

        prompt = f"""You are a technical writer. Write a comprehensive, practical description of the CLI tool "{tool_name}" (binary: {bin_names}).
Categories: {categories}
Homepage: {homepage}

Provide the description in both Chinese and English with the following structure:

1. intro: A brief introduction (2-3 sentences) explaining what the tool does
2. useCases: 3-5 practical use cases (short phrases)
3. guideSteps: 2-3 quick start steps
4. examplePrompts: 2-3 example prompts a user might say to an AI assistant to use this tool (each with a short label)

Respond in this exact JSON format (no markdown, no code fences, just raw JSON):
{{
  "intro": {{ "zh": "中文简介", "en": "English intro" }},
  "useCases": {{ "zh": ["用例1", "用例2"], "en": ["Use case 1", "Use case 2"] }},
  "guideSteps": {{ "zh": ["步骤1", "步骤2"], "en": ["Step 1", "Step 2"] }},
  "examplePrompts": [
    {{ "label": "Short label", "promptZh": "中文提示词", "promptEn": "English prompt" }}
  ]
}}"""

        resolved_model_name = model_name or get_model_registry_service().get_default_model().runtime_name
        model = create_chat_model(name=resolved_model_name, thinking_enabled=False)
        with token_source_context("cli_tool_describe"):
            raw = model.invoke([HumanMessage(content=prompt)])
        text = _extract_text(raw)
        payload = _extract_json(text)
        structured = CliToolStructuredDesc.model_validate(payload)
        self._repository.upsert_description(
            tool_id=tool_id,
            zh=structured.intro.zh,
            en=structured.intro.en,
            structured_json=structured.model_dump_json(),
        )
        return CliToolDescriptionRecord(
            zh=structured.intro.zh,
            en=structured.intro.en,
            structured=structured,
        )

    def iter_install_stream(self, *, tool_id: str, method: str) -> Iterator[tuple[str, str]]:
        tool = get_catalog_tool(tool_id)
        if tool is None:
            raise ValueError("Tool not found")

        install_method = next(
            (item for item in tool.installMethods if item.method == method),
            None,
        )
        if install_method is None:
            raise ValueError(f'Install method "{method}" not available for {tool.name}')
        if sys.platform not in install_method.platforms:
            raise ValueError(
                f'Install method "{method}" is not supported on {sys.platform}'
            )

        process = subprocess.Popen(
            install_method.command,
            shell=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
        )

        assert process.stdout is not None
        for line in process.stdout:
            yield ("output", line.rstrip("\n"))

        process.wait()
        invalidate_detect_cache()

        if process.returncode != 0:
            yield ("error", f"Process exited with code {process.returncode}")
            return

        package_spec = _extract_package_spec(install_method.command) or ""
        runtime = detect_catalog_tool(tool)
        if runtime.binPath is not None:
            self._repository.upsert_custom_tool(
                name=tool.name,
                bin_path=runtime.binPath,
                bin_name=Path(runtime.binPath).name,
                version=runtime.version,
                install_method=method,
                install_package=package_spec,
            )

        message_lines = [f'Successfully installed "{tool.name}".']
        if runtime.binPath is not None:
            message_lines.append(f"Path: {runtime.binPath}")
        if runtime.version is not None:
            message_lines.append(f"Version: {runtime.version}")
        if tool.setupType == "needs_auth":
            message_lines.append("")
            message_lines.append("This tool requires follow-up authentication or setup:")
            for index, step in enumerate(tool.guideSteps.en[1:], start=1):
                message_lines.append(f"{index}. {step}")

        yield ("done", "\n".join(message_lines))

    def install_command(self, *, command: str, name: str | None = None) -> str:
        process = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=False,
        )
        output = "\n".join(
            part.strip() for part in [process.stdout or "", process.stderr or ""] if part.strip()
        ).strip()
        if process.returncode != 0:
            raise ValueError(output or f"Install command failed with exit code {process.returncode}")

        invalidate_detect_cache()
        package_spec = _extract_package_spec(command) or ""
        install_method = _extract_install_method(command)
        candidates = self._build_bin_candidates(command, package_spec)

        matched_path = None
        matched_bin = None
        version = None
        for candidate in candidates:
            bin_path = shutil_which(candidate)
            if not bin_path:
                continue
            matched_path = bin_path
            matched_bin = candidate
            version = _extract_version_from_path(bin_path)
            break

        if matched_path is None or matched_bin is None:
            return (
                f"Command executed successfully but no binary could be resolved.\n\n{output}\n\n"
                "Use the add tool with an absolute binary path to register it manually."
            )

        display_name = name or self._resolve_display_name(command, package_spec, matched_bin)
        registered = self._repository.upsert_custom_tool(
            name=display_name,
            bin_path=matched_path,
            bin_name=Path(matched_path).name,
            version=version,
            install_method=install_method,
            install_package=package_spec,
        )

        lines = [
            f'Successfully installed and registered "{display_name}".',
            f"Path: {registered.binPath}",
        ]
        if registered.version:
            lines.append(f"Version: {registered.version}")
        matched_catalog = self._find_catalog_by_bin(matched_bin)
        if matched_catalog and matched_catalog.setupType == "needs_auth":
            lines.append("")
            lines.append("This tool requires authentication before use:")
            for index, step in enumerate(matched_catalog.guideSteps.en[1:], start=1):
                lines.append(f"{index}. {step}")
        if output:
            lines.append("")
            lines.append(output[:4000])
        return "\n".join(lines)

    def add_tool(
        self,
        *,
        bin_path: str | None = None,
        name: str | None = None,
        tool_id: str | None = None,
        description_zh: str | None = None,
        description_en: str | None = None,
    ) -> str:
        if tool_id and not bin_path:
            if not description_zh or not description_en:
                raise ValueError("description_zh and description_en are required when updating by tool_id")
            self._repository.upsert_description(
                tool_id=tool_id,
                zh=description_zh,
                en=description_en,
            )
            return f'Updated description for "{tool_id}".'

        if not bin_path:
            raise ValueError("bin_path is required")
        tool = self.create_custom_tool(bin_path=bin_path, name=name)
        if description_zh and description_en:
            self._repository.upsert_description(
                tool_id=tool.id,
                zh=description_zh,
                en=description_en,
            )
        return f'Added "{tool.name}" ({tool.binPath}).'

    def remove_tool(self, identifier: str) -> str:
        tool = self._resolve_custom_tool(identifier)
        if tool is None:
            raise ValueError("Custom tool not found")
        self._repository.delete_custom_tool(tool.id)
        return f'Removed "{tool.name}".'

    def check_updates(self) -> str:
        updates: list[str] = []
        brew_map = _brew_outdated_map()
        npm_map = _npm_outdated_map()
        for tool in self._repository.list_custom_tools(enabled_only=False):
            package_name = tool.installPackage or tool.binName
            if tool.installMethod == "brew" and package_name in brew_map:
                latest = brew_map[package_name]
                updates.append(f'{tool.name}: brew update available ({tool.version or "unknown"} -> {latest})')
            if tool.installMethod == "npm" and package_name in npm_map:
                latest = npm_map[package_name]
                updates.append(f'{tool.name}: npm update available ({tool.version or "unknown"} -> {latest})')
        return "\n".join(updates) if updates else "No updates found."

    def update_tool(self, identifier: str) -> str:
        tool = self._resolve_custom_tool(identifier, include_shadow=True)
        if tool is None:
            raise ValueError("Tool not found")
        package_name = tool.installPackage or tool.binName
        command = _build_update_command(tool.installMethod, package_name)
        if not command:
            raise ValueError("This tool cannot be updated automatically")
        process = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            check=False,
        )
        output = "\n".join(
            part.strip() for part in [process.stdout or "", process.stderr or ""] if part.strip()
        ).strip()
        if process.returncode != 0:
            raise ValueError(output or f"Update command failed with exit code {process.returncode}")
        invalidate_detect_cache()
        updated_path = shutil_which(tool.binName) or tool.binPath
        version = _extract_version_from_path(updated_path) if updated_path else tool.version
        self._repository.upsert_custom_tool(
            name=tool.name,
            bin_path=updated_path or tool.binPath,
            bin_name=tool.binName,
            version=version,
            install_method=tool.installMethod,
            install_package=tool.installPackage,
        )
        lines = [f'Updated "{tool.name}" using `{command}`.']
        if version:
            lines.append(f"Current version: {version}")
        if output:
            lines.append("")
            lines.append(output[:4000])
        return "\n".join(lines)

    def list_catalog_projection(self, *, overrides: dict[str, dict[str, Any]]) -> dict[str, CliToolCatalogProjectionItem]:
        detected = detect_all_cli_tools()
        descriptions = self._repository.list_descriptions()
        all_custom = self._repository.list_custom_tools(enabled_only=False)

        result: dict[str, CliToolCatalogProjectionItem] = {}

        for item in detected["catalog"]:
            tool = get_catalog_tool(item.id)
            if tool is None:
                continue
            override = overrides.get(item.id, {})
            allowed = bool(override.get("enabled", True))
            description = str(
                override.get("description")
                or descriptions.get(item.id, CliToolDescriptionRecord(zh="", en="")).en
                or tool.summaryEn
            ).strip()
            result[item.id] = CliToolCatalogProjectionItem(
                id=item.id,
                displayName=tool.name,
                enabled=bool(item.status != "not_installed" and allowed),
                allowed=allowed,
                installed=item.status != "not_installed",
                configured=bool(item.binPath is not None or item.id in overrides),
                source="host-detected",
                description=description or "CLI tool",
                path=item.binPath,
                version=item.version,
            )

        for item in detected["extra"]:
            override = overrides.get(item.id, {})
            allowed = bool(override.get("enabled", True))
            label = next(
                (entry[1] for entry in list_extra_well_known_bins() if entry[0] == item.id),
                item.id,
            )
            description = str(
                override.get("description")
                or descriptions.get(item.id, CliToolDescriptionRecord(zh="", en="")).en
                or label
            ).strip()
            result[item.id] = CliToolCatalogProjectionItem(
                id=item.id,
                displayName=label,
                enabled=bool(item.status != "not_installed" and allowed),
                allowed=allowed,
                installed=item.status != "not_installed",
                configured=item.id in overrides,
                source="host-detected",
                description=description or "CLI tool",
                path=item.binPath,
                version=item.version,
            )

        for item in all_custom:
            override = overrides.get(item.id, {})
            allowed = bool(override.get("enabled", True))
            description = str(
                override.get("description")
                or descriptions.get(item.id, CliToolDescriptionRecord(zh="", en="")).en
                or item.binPath
            ).strip()
            result[item.id] = CliToolCatalogProjectionItem(
                id=item.id,
                displayName=item.name,
                enabled=bool(item.enabled and allowed),
                allowed=allowed,
                installed=True,
                configured=True,
                source="configured",
                description=description or "CLI tool",
                path=item.binPath,
                version=item.version,
            )

        for cli_id, override in overrides.items():
            if cli_id in result:
                continue
            result[cli_id] = CliToolCatalogProjectionItem(
                id=cli_id,
                displayName=cli_id,
                enabled=False,
                allowed=bool(override.get("enabled", True)),
                installed=False,
                configured=True,
                source="configured",
                description=str(override.get("description") or "CLI tool").strip(),
                path=None,
                version=None,
            )

        return dict(sorted(result.items()))

    def _build_bin_candidates(self, command: str, package_spec: str) -> list[str]:
        candidates: list[str] = []
        if package_spec:
            matched_catalog = next(
                (
                    tool
                    for tool in list_catalog_tools()
                    if any(package_spec in item.command for item in tool.installMethods)
                ),
                None,
            )
            if matched_catalog is not None:
                candidates.extend(matched_catalog.binNames)
        if package_spec:
            segments = package_spec.split("/")
            last = segments[-1]
            if last and last not in candidates:
                candidates.append(last)
            if len(segments) >= 2 and segments[0].startswith("@"):
                scoped = segments[1]
                if scoped and scoped not in candidates:
                    candidates.append(scoped)
        if not candidates:
            command_parts = shlex.split(command)
            last = command_parts[-1] if command_parts else ""
            if last and not last.startswith("-"):
                candidates.append(last)
        return candidates

    def _resolve_display_name(self, command: str, package_spec: str, matched_bin: str) -> str:
        if package_spec:
            matched_catalog = next(
                (
                    tool
                    for tool in list_catalog_tools()
                    if any(package_spec in item.command for item in tool.installMethods)
                ),
                None,
            )
            if matched_catalog is not None:
                return matched_catalog.name
        matched_catalog = self._find_catalog_by_bin(matched_bin)
        if matched_catalog is not None:
            return matched_catalog.name
        return matched_bin

    def _find_catalog_by_bin(self, bin_name: str):
        return next(
            (tool for tool in list_catalog_tools() if bin_name in tool.binNames),
            None,
        )

    def _resolve_custom_tool(
        self,
        identifier: str,
        *,
        include_shadow: bool = False,
    ) -> CustomCliTool | None:
        all_custom = self._repository.list_custom_tools(enabled_only=False)
        detected = detect_all_cli_tools()
        catalog_bin_paths = {item.binPath for item in detected["catalog"] if item.binPath}
        visible_custom = (
            all_custom
            if include_shadow
            else [item for item in all_custom if item.binPath not in catalog_bin_paths]
        )
        normalized = identifier.strip().lower()
        for tool in visible_custom:
            keys = {
                tool.id.lower(),
                tool.name.lower(),
                tool.binName.lower(),
                (tool.installPackage or "").lower(),
            }
            if normalized in keys:
                return tool
        return None

    @staticmethod
    def _serialize_descriptions(
        descriptions: dict[str, CliToolDescriptionRecord],
    ) -> dict[str, dict[str, Any]]:
        result: dict[str, dict[str, Any]] = {}
        for key, value in descriptions.items():
            payload: dict[str, Any] = {
                "zh": value.zh,
                "en": value.en,
            }
            if value.structured is not None:
                payload["structured"] = value.structured.model_dump()
            result[key] = payload
        return result


def os_access_executable(path_obj: Path) -> bool:
    import os

    return os.access(path_obj, os.X_OK)


def _extract_version_from_path(bin_path: str) -> str | None:
    try:
        result = subprocess.run(
            [bin_path, "--version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
    except Exception:
        return None
    output = (result.stdout or result.stderr or "").strip()
    if not output:
        return None
    first_line = output.splitlines()[0].strip()
    match = re.search(r"(\d+\.\d+[\w.\-]*)", first_line)
    return match.group(1) if match is not None else None


def _extract_text(raw: Any) -> str:
    content = getattr(raw, "content", raw)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict) and isinstance(item.get("text"), str):
                parts.append(item["text"])
            elif hasattr(item, "text"):
                parts.append(str(getattr(item, "text")))
        return "\n".join(part for part in parts if part)
    return str(content)


def _extract_json(raw: str) -> dict[str, Any]:
    trimmed = raw.strip()
    for candidate in (
        trimmed,
        _extract_fenced_json(trimmed),
        _extract_braced_json(trimmed),
    ):
        if not candidate:
            continue
        try:
            return json.loads(candidate)
        except Exception:
            continue
    raise ValueError("AI response was not valid JSON")


def _extract_fenced_json(text: str) -> str | None:
    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    return match.group(1).strip() if match is not None else None


def _extract_braced_json(text: str) -> str | None:
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end <= start:
        return None
    return text[start : end + 1]


def _extract_package_spec(command: str) -> str | None:
    parts = shlex.split(command)
    try:
        install_index = parts.index("install")
    except ValueError:
        return None
    for part in parts[install_index + 1 :]:
        if not part.startswith("-"):
            return re.sub(r"@[\d.].*$", "", part)
    return None


def _extract_install_method(command: str) -> str:
    normalized = command.strip().lower()
    if normalized.startswith("brew "):
        return "brew"
    if normalized.startswith("npm "):
        return "npm"
    if normalized.startswith("pipx "):
        return "pipx"
    if normalized.startswith("pip ") or normalized.startswith("pip3 "):
        return "pip"
    if normalized.startswith("cargo "):
        return "cargo"
    if normalized.startswith("apt ") or normalized.startswith("apt-get "):
        return "apt"
    return "unknown"


def _build_update_command(method: str, package_name: str) -> str | None:
    match method:
        case "brew":
            return f"brew upgrade {package_name}"
        case "npm":
            return f"npm update -g {package_name}"
        case "pipx":
            return f"pipx upgrade {package_name}"
        case "pip":
            return f"pip install --upgrade {package_name}"
        case "cargo":
            return f"cargo install {package_name}"
        case "apt":
            return f"sudo apt-get install --only-upgrade {package_name}"
        case _:
            return None


def _brew_outdated_map() -> dict[str, str]:
    if shutil_which("brew") is None:
        return {}
    process = subprocess.run(
        "brew outdated --json=v2",
        shell=True,
        capture_output=True,
        text=True,
        check=False,
    )
    if process.returncode != 0 or not process.stdout.strip():
        return {}
    try:
        payload = json.loads(process.stdout)
    except Exception:
        return {}
    formulae = payload.get("formulae", [])
    result: dict[str, str] = {}
    for item in formulae:
        if not isinstance(item, dict):
            continue
        name = str(item.get("name", "")).strip()
        current_version = (
            str(item.get("current_version", "")).strip()
            or str(item.get("installed_versions", [""])[0]).strip()
        )
        if name:
            result[name] = current_version
    return result


def _npm_outdated_map() -> dict[str, str]:
    if shutil_which("npm") is None:
        return {}
    process = subprocess.run(
        "npm outdated -g --json",
        shell=True,
        capture_output=True,
        text=True,
        check=False,
    )
    stdout = process.stdout.strip()
    if not stdout:
        return {}
    try:
        payload = json.loads(stdout)
    except Exception:
        return {}
    result: dict[str, str] = {}
    for name, item in payload.items():
        if isinstance(item, dict):
            latest = str(item.get("latest", "")).strip()
            if latest:
                result[str(name)] = latest
    return result
