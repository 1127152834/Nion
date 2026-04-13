#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from textwrap import dedent


DEFAULT_SOURCE = "https://github.com/SamurAIGPT/llm-wiki-agent.git"
SKILL_NAME = "llm-wiki-agent"
VENDOR_DIRNAME = "llm-wiki-agent"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install the llm-wiki-agent template into Codex and optionally bootstrap a workspace.",
    )
    parser.add_argument(
        "--source",
        default=DEFAULT_SOURCE,
        help="Local repository path or git URL. Defaults to the public GitHub repository.",
    )
    parser.add_argument(
        "--codex-home",
        default=os.environ.get("CODEX_HOME", str(Path.home() / ".codex")),
        help="Codex home directory. Defaults to $CODEX_HOME or ~/.codex.",
    )
    parser.add_argument(
        "--workspace",
        help="Optional path to initialize as a ready-to-use wiki workspace.",
    )
    parser.add_argument(
        "--ref",
        help="Optional git ref when cloning from a remote source.",
    )
    parser.add_argument(
        "--overwrite-workspace",
        action="store_true",
        help="Replace the target workspace if it already exists.",
    )
    return parser.parse_args()


def run(cmd: list[str], *, cwd: Path | None = None) -> None:
    completed = subprocess.run(cmd, cwd=cwd, check=False, text=True)
    if completed.returncode != 0:
        raise SystemExit(completed.returncode)


def ensure_empty_dir(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)


def copy_tree(src: Path, dest: Path) -> None:
    ensure_empty_dir(dest)
    for child in src.iterdir():
        if child.name in {".git", "__pycache__"}:
            continue
        target = dest / child.name
        if child.is_dir():
            shutil.copytree(
                child,
                target,
                ignore=shutil.ignore_patterns(".git", "__pycache__"),
            )
        else:
            shutil.copy2(child, target)


def materialize_source(source: str, ref: str | None) -> tuple[Path, dict[str, str]]:
    source_path = Path(source).expanduser()
    if source_path.exists():
        return source_path.resolve(), {
            "source": str(source_path.resolve()),
            "type": "local-path",
        }

    with tempfile.TemporaryDirectory(prefix="llm-wiki-agent-clone-") as temp_dir:
        clone_dir = Path(temp_dir) / "repo"
        clone_cmd = ["git", "clone", "--depth", "1"]
        if ref:
            clone_cmd.extend(["--branch", ref])
        clone_cmd.extend([source, str(clone_dir)])
        run(clone_cmd)

        snapshot_dir = Path(tempfile.mkdtemp(prefix="llm-wiki-agent-snapshot-"))
        copy_tree(clone_dir, snapshot_dir)
        metadata = {"source": source, "type": "git-url"}
        if ref:
            metadata["ref"] = ref
        return snapshot_dir, metadata


def write_text(path: Path, content: str, executable: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")
    if executable:
        path.chmod(0o755)


def build_skill_markdown(codex_home: Path) -> str:
    return dedent(
        f"""\
        ---
        name: llm-wiki-agent
        description: Use when the user wants a persistent markdown wiki, asks to ingest documents into a local knowledge base, query accumulated notes, lint wiki consistency, or build a knowledge graph from wiki pages. Triggers include "wiki ingest", "query the wiki", "build wiki graph", "知识库", "知识图谱", and "把文档整理成 wiki".
        ---

        # LLM Wiki Agent

        Use the upstream `llm-wiki-agent` template as a local Codex workflow for persistent knowledge wikis.

        ## Installed Paths

        - Template source: `{codex_home / "vendor_imports" / VENDOR_DIRNAME}`
        - Skill path: `{codex_home / "skills" / SKILL_NAME}`

        ## Bootstrap a Workspace

        Initialize a new workspace from the installed template:

        ```bash
        export CODEX_HOME="${{CODEX_HOME:-$HOME/.codex}}"
        "$CODEX_HOME/skills/{SKILL_NAME}/scripts/wiki-init.sh" ~/Documents/llm-wiki-agent-demo
        ```

        If you want to run the Python helper scripts directly, set up the workspace virtualenv:

        ```bash
        export CODEX_HOME="${{CODEX_HOME:-$HOME/.codex}}"
        "$CODEX_HOME/skills/{SKILL_NAME}/scripts/wiki-setup-python.sh" ~/Documents/llm-wiki-agent-demo
        ```

        ## Recommended Workflow

        1. Open the initialized workspace in Codex.
        2. Keep `raw/` immutable; ingest source files into `wiki/`.
        3. Let the workspace `AGENTS.md` drive wiki ingest/query/lint/graph behavior.
        4. Use the Python helpers when you want deterministic CLI execution.

        ## CLI Helpers

        ```bash
        cd ~/Documents/llm-wiki-agent-demo
        .venv/bin/python tools/ingest.py README.md
        .venv/bin/python tools/query.py "What does this wiki do?"
        .venv/bin/python tools/lint.py --save
        .venv/bin/python tools/build_graph.py --no-infer
        ```

        ## Notes

        - The template already includes `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md`.
        - `tools/*.py` require `ANTHROPIC_API_KEY`.
        - Restart Codex after installing this skill so future sessions can auto-discover it.
        """
    )


def build_openai_yaml() -> str:
    return dedent(
        """\
        interface:
          display_name: "LLM Wiki Agent"
          short_description: "Build and query a persistent local wiki from source docs"
          default_prompt: "Set up or operate a local llm-wiki-agent workspace and ingest/query the wiki."
        """
    )


def build_init_script() -> str:
    return dedent(
        f"""\
        #!/usr/bin/env bash
        set -euo pipefail

        CODEX_HOME="${{CODEX_HOME:-$HOME/.codex}}"
        SOURCE_DIR="$CODEX_HOME/vendor_imports/{VENDOR_DIRNAME}"
        TARGET_DIR="${{1:-}}"

        if [[ -z "$TARGET_DIR" ]]; then
          echo "Usage: wiki-init.sh <target-dir>" >&2
          exit 1
        fi

        python3 - "$SOURCE_DIR" "$TARGET_DIR" <<'PY'
        import shutil
        import sys
        from pathlib import Path

        source = Path(sys.argv[1]).expanduser().resolve()
        target = Path(sys.argv[2]).expanduser().resolve()

        if not source.exists():
            raise SystemExit(f"Template source not found: {{source}}")

        if target.exists():
            if any(target.iterdir()):
                raise SystemExit(f"Target workspace is not empty: {{target}}")
        else:
            target.mkdir(parents=True, exist_ok=True)

        for child in source.iterdir():
            if child.name in {{".git", "__pycache__"}}:
                continue
            destination = target / child.name
            if child.is_dir():
                shutil.copytree(
                    child,
                    destination,
                    dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns(".git", "__pycache__"),
                )
            else:
                shutil.copy2(child, destination)

        print(target)
        PY
        """
    )


def build_setup_python_script() -> str:
    return dedent(
        """\
        #!/usr/bin/env bash
        set -euo pipefail

        WORKSPACE_DIR="${1:-}"

        if [[ -z "$WORKSPACE_DIR" ]]; then
          echo "Usage: wiki-setup-python.sh <workspace-dir>" >&2
          exit 1
        fi

        if [[ ! -f "$WORKSPACE_DIR/requirements.txt" ]]; then
          echo "requirements.txt not found under $WORKSPACE_DIR" >&2
          exit 1
        fi

        python3 -m venv "$WORKSPACE_DIR/.venv"
        "$WORKSPACE_DIR/.venv/bin/pip" install --upgrade pip
        "$WORKSPACE_DIR/.venv/bin/pip" install -r "$WORKSPACE_DIR/requirements.txt"
        """
    )


def install_vendor_repo(source_dir: Path, vendor_dir: Path, metadata: dict[str, str]) -> None:
    copy_tree(source_dir, vendor_dir)
    write_text(
        vendor_dir / ".install-metadata.json",
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n",
    )


def install_skill(skill_dir: Path, codex_home: Path) -> None:
    ensure_empty_dir(skill_dir)
    write_text(skill_dir / "SKILL.md", build_skill_markdown(codex_home))
    write_text(skill_dir / "agents" / "openai.yaml", build_openai_yaml())
    write_text(skill_dir / "scripts" / "wiki-init.sh", build_init_script(), executable=True)
    write_text(
        skill_dir / "scripts" / "wiki-setup-python.sh",
        build_setup_python_script(),
        executable=True,
    )


def init_workspace(template_dir: Path, workspace_dir: Path, overwrite: bool) -> None:
    if workspace_dir.exists():
        if not overwrite:
            raise SystemExit(
                f"Workspace already exists: {workspace_dir}. Re-run with --overwrite-workspace to replace it.",
            )
        shutil.rmtree(workspace_dir)

    copy_tree(template_dir, workspace_dir)


def main() -> None:
    args = parse_args()

    codex_home = Path(args.codex_home).expanduser().resolve()
    vendor_dir = codex_home / "vendor_imports" / VENDOR_DIRNAME
    skill_dir = codex_home / "skills" / SKILL_NAME

    codex_home.mkdir(parents=True, exist_ok=True)
    (codex_home / "vendor_imports").mkdir(parents=True, exist_ok=True)
    (codex_home / "skills").mkdir(parents=True, exist_ok=True)

    source_dir, metadata = materialize_source(args.source, args.ref)
    install_vendor_repo(source_dir, vendor_dir, metadata)
    install_skill(skill_dir, codex_home)

    print(f"Installed template to {vendor_dir}")
    print(f"Installed skill to {skill_dir}")

    if args.workspace:
        workspace_dir = Path(args.workspace).expanduser().resolve()
        init_workspace(vendor_dir, workspace_dir, args.overwrite_workspace)
        print(f"Initialized workspace at {workspace_dir}")


if __name__ == "__main__":
    main()
