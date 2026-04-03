from __future__ import annotations

from collections import Counter
from typing import Any

from .models import PROMPT_DYNAMIC_BOUNDARY, PromptBuildArtifact


def project_prompt_diagnostics(artifact: PromptBuildArtifact) -> dict[str, Any]:
    return {
        "provider_manifest": list(artifact.provider_manifest),
        "static_char_count": artifact.static_char_count,
        "dynamic_char_count": artifact.dynamic_char_count,
        "has_dynamic_boundary": PROMPT_DYNAMIC_BOUNDARY in artifact.full_prompt,
        "sections": [
            {
                "key": section.key,
                "title": section.title,
                "scope": section.scope,
                "layer": section.layer,
                "source": section.source,
                "enabled": section.enabled,
                "order": section.order,
                "priority": section.priority,
                "cache_group": section.cache_group,
                "char_count": len(section.content.strip()),
            }
            for section in artifact.section_manifest
        ],
        "section_counts_by_scope": dict(
            Counter(section.scope for section in artifact.section_manifest)
        ),
        "section_counts_by_layer": dict(
            Counter(section.layer for section in artifact.section_manifest)
        ),
        "section_counts_by_source": dict(
            Counter(section.source for section in artifact.section_manifest if section.source)
        ),
    }
