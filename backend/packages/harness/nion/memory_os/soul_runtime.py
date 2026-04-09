from __future__ import annotations

from nion.memory.soul.service import derive_relationship_stance_snapshot, get_soul_layer_snapshot
from .clock import utcnow_z
from .repository import MemoryOSRepository


def compile_soul_runtime(repository: MemoryOSRepository) -> str:
    sections: list[str] = []

    now_z = utcnow_z()
    core = get_soul_layer_snapshot(repository, layer="core", now_z=now_z)
    relationship = derive_relationship_stance_snapshot(repository, now_z=now_z)
    narrative = get_soul_layer_snapshot(repository, layer="identity_narrative", now_z=now_z)
    overlay = get_soul_layer_snapshot(repository, layer="adaptive_overlay", now_z=now_z)

    if core:
        sections.append(f"<core_identity>\n{core.summary}\n</core_identity>")
    if relationship:
        sections.append(f"<relationship_stance>\n{relationship.summary}\n</relationship_stance>")
    if overlay:
        sections.append(f"<active_adaptations>\n{overlay.summary}\n</active_adaptations>")
    if narrative:
        sections.append(f"<current_identity_narrative>\n{narrative.summary}\n</current_identity_narrative>")

    if not sections:
        return ""

    return "<soul_runtime>\n" + "\n".join(sections) + "\n</soul_runtime>\n"
