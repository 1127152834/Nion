from __future__ import annotations

from pathlib import Path

from nion.knowledge.frontmatter import render_knowledge_frontmatter, split_knowledge_frontmatter
from nion.knowledge.models import KnowledgePage
from nion.knowledge.paths import get_knowledge_paths


def _page_filename(page_id: str) -> str:
    safe = page_id.replace(":", "__").replace("/", "_")
    return f"{safe}.md"


def _page_directory_name(page_type: str) -> str:
    if page_type == "source":
        return "sources"
    if page_type == "entity":
        return "entities"
    if page_type == "concept":
        return "concepts"
    if page_type == "synthesis":
        return "syntheses"
    return "pages"


class KnowledgePageStore:
    def __init__(self, base_dir: str | Path | None = None) -> None:
        self._paths = get_knowledge_paths(base_dir=base_dir)
        self._paths.ensure_knowledge_dirs()

    def _page_path(self, page_id: str, page_type: str) -> Path:
        return (
            self._paths.knowledge_wiki_dir
            / _page_directory_name(page_type)
            / _page_filename(page_id)
        )

    def write_page(
        self,
        *,
        page_id: str,
        page_type: str,
        title: str,
        body: str,
        sources: list[str],
        compiled_from: list[dict[str, str]],
        last_compiled_at: str,
        page_state: str = "active",
    ) -> KnowledgePage:
        path = self._page_path(page_id, page_type)
        path.parent.mkdir(parents=True, exist_ok=True)
        frontmatter = {
            "title": title,
            "page_type": page_type,
            "page_id": page_id,
            "sources": sources,
            "compiled_from": compiled_from,
            "last_compiled_at": last_compiled_at,
            "page_state": page_state,
            "agent_owned": True,
            "human_editable": False,
        }
        text = render_knowledge_frontmatter(frontmatter, body)
        path.write_text(text, encoding="utf-8")
        return self.read_page(page_id)

    def read_page(self, page_id: str) -> KnowledgePage:
        candidates = list(self._paths.knowledge_wiki_dir.rglob(_page_filename(page_id)))
        if not candidates:
            raise FileNotFoundError(f"Knowledge page not found: {page_id}")
        path = candidates[0]
        frontmatter, body = split_knowledge_frontmatter(path.read_text(encoding="utf-8"))
        return KnowledgePage(
            page_id=str(frontmatter["page_id"]),
            page_type=str(frontmatter["page_type"]),
            title=str(frontmatter["title"]),
            relative_path=path.relative_to(self._paths.knowledge_root_dir).as_posix(),
            absolute_path=str(path.resolve()),
            body=body.lstrip("\n").rstrip("\n"),
            sources=list(frontmatter.get("sources") or []),
            compiled_from=list(frontmatter.get("compiled_from") or []),
            last_compiled_at=str(frontmatter["last_compiled_at"]),
            page_state=str(frontmatter.get("page_state", "active")),
            agent_owned=bool(frontmatter.get("agent_owned", True)),
            human_editable=bool(frontmatter.get("human_editable", False)),
        )
