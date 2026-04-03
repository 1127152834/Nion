from __future__ import annotations

from .models import PROMPT_DYNAMIC_BOUNDARY, PromptBuildArtifact, PromptBuildContext, PromptSection


def build_prompt_artifact(
    context: PromptBuildContext,
    sections: list[PromptSection],
) -> PromptBuildArtifact:
    del context
    enabled_sections = [section for section in sections if section.enabled]
    ordered_sections = sorted(enabled_sections, key=lambda section: section.order)
    provider_manifest = list(dict.fromkeys(
        section.source for section in ordered_sections if section.source
    ))

    static_sections = [
        section.content.strip()
        for section in ordered_sections
        if section.scope == "global_static"
    ]
    dynamic_sections = [
        section.content.strip()
        for section in ordered_sections
        if section.scope != "global_static"
    ]

    static_prefix = "\n\n".join(content for content in static_sections if content)
    dynamic_suffix = "\n\n".join(content for content in dynamic_sections if content)

    if dynamic_suffix:
        full_prompt = f"{static_prefix}\n\n{PROMPT_DYNAMIC_BOUNDARY}\n\n{dynamic_suffix}"
    else:
        full_prompt = f"{static_prefix}\n\n{PROMPT_DYNAMIC_BOUNDARY}" if static_prefix else PROMPT_DYNAMIC_BOUNDARY

    return PromptBuildArtifact(
        full_prompt=full_prompt,
        static_prefix=static_prefix,
        dynamic_suffix=dynamic_suffix,
        section_manifest=ordered_sections,
        provider_manifest=provider_manifest,
    )
