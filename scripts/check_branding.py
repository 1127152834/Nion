from __future__ import annotations

import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP_PARTS = {".git", "node_modules", ".next", ".venv", ".omx", ".worktrees"}
SKIP_FILES = {
    "docs/brand-audit-allowlist.md",
    "scripts/check_branding.py",
}
TEXT_EXTENSIONS = {
    ".md", ".txt", ".py", ".toml", ".yaml", ".yml", ".json", ".ts", ".tsx",
    ".js", ".jsx", ".css", ".sh", ".env", ".example", ".conf", ".html",
}
FORBIDDEN = [
    (re.compile(r"\bDeerFlow\b"), "DeerFlow"),
    (re.compile(r"\bdeer-flow\b"), "deer-flow"),
    (re.compile(r"\bdeerflow\b"), "deerflow"),
    (re.compile(r"\bByteDance\b"), "ByteDance"),
    (re.compile(r"\bbytedance\b"), "bytedance"),
    (re.compile(r"\bDF\b"), "DF"),
    (re.compile(r"\bDEER\b"), "DEER"),
]


def load_allowlist() -> list[tuple[str, str]]:
    allowlist = ROOT / "docs/brand-audit-allowlist.md"
    if not allowlist.exists():
        return []
    pairs: list[tuple[str, str]] = []
    for raw in allowlist.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        path_text, needle = line.split("|", 1)
        pairs.append((path_text.strip(), needle.strip()))
    return pairs


def is_text_file(path: pathlib.Path) -> bool:
    return path.suffix in TEXT_EXTENSIONS or path.name in {
        "Makefile",
        "Dockerfile",
        ".env.example",
        "nion.code-workspace",
    }


def is_allowlisted(path: pathlib.Path, snippet: str, allowlist: list[tuple[str, str]]) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return any(rel == allowed_path and allowed_snippet in snippet for allowed_path, allowed_snippet in allowlist)


def main() -> int:
    allowlist = load_allowlist()
    failures: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        rel_path = path.relative_to(ROOT).as_posix()
        if rel_path in SKIP_FILES:
            continue
        if not is_text_file(path):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern, label in FORBIDDEN:
            for match in pattern.finditer(text):
                snippet = text[max(0, match.start() - 30):match.end() + 30]
                if not is_allowlisted(path, snippet, allowlist):
                    failures.append(f"{rel_path} | {label} | {snippet!r}")
    if failures:
        print("\n".join(failures))
        return 1
    print("Brand audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
