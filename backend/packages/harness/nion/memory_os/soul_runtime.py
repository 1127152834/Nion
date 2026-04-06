from __future__ import annotations

from .repository import MemoryOSRepository


def compile_soul_runtime(repository: MemoryOSRepository) -> str:
    sections: list[str] = []

    core = _latest_summary(repository, domain="soul", subtype="core")
    relationship = _latest_summary(repository, domain="soul", subtype="relationship_soul")
    narrative = _latest_summary(repository, domain="agent_self", subtype="identity_narrative")
    overlay = _latest_summary(repository, domain="soul", subtype="adaptive_overlay")

    if core:
      sections.append(f"<core_identity>\n{core}\n</core_identity>")
    if relationship:
      sections.append(f"<relationship_stance>\n{relationship}\n</relationship_stance>")
    if overlay:
      sections.append(f"<active_adaptations>\n{overlay}\n</active_adaptations>")
    if narrative:
      sections.append(f"<current_identity_narrative>\n{narrative}\n</current_identity_narrative>")

    if not sections:
        return ""

    return "<soul_runtime>\n" + "\n".join(sections) + "\n</soul_runtime>\n"


def _latest_summary(
    repository: MemoryOSRepository,
    *,
    domain: str,
    subtype: str,
) -> str:
    for row in repository.list_memory_records(domain=domain, status="active"):
        if row["subtype"] == subtype:
            return str(row["summary"])
    return ""
