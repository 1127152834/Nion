# P1 Upstream Adoption Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不回流 `config.yaml`、不破坏 Electron-first / local daemon 架构的前提下，吸收最近 upstream 中最有价值的一批能力：文档上传理解链路、sandbox 检索与只读挂载、附件输入稳定性，以及少量明确的健壮性修复。

**Architecture:** 这批同步不按 donor commit 整包迁移，而是按功能链路拆成 5 个独立任务包：上传文档转换、上传上下文注入、sandbox 搜索/挂载、前端附件输入、低风险 bugfix。每个任务都在 NION 当前结构内完成，优先修改已有模块而不是照搬 upstream 文件布局。

**Tech Stack:** Python, FastAPI, LangChain/LangGraph, TypeScript, React, node:test, pytest, SQLite Config Center

---

## Scope

本计划只覆盖这 11 个高优先级提交的产品价值吸收：

- `ddfc988b`
- `5ff230ea`
- `163121d3`
- `bbd08663`
- `c6cdf200`
- `1694c616`
- `1c0051c1`
- `144c9b24`
- `5664b9d4`
- `83039fa2`
- `db82b592`

明确不在本计划内：

- wecom / slack / channels
- serve.sh / docker / nginx / deploy
- skills 内容包
- runtime platform / SDK 主线重构

---

## 文件结构

### 现有文件职责

- `backend/packages/harness/nion/utils/file_conversion.py`
  当前文档转换入口，功能过于基础，只做 `MarkItDown` 直转。
- `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`
  当前上传文件上下文注入中间件，仅暴露文件名和路径。
- `backend/packages/harness/nion/sandbox/tools.py`
  当前本地 sandbox 工具与路径权限逻辑，不含 `grep` / `glob`。
- `backend/packages/harness/nion/sandbox/local/local_sandbox.py`
  当前本地 sandbox 实现，不支持 read-only path mapping。
- `backend/packages/harness/nion/sandbox/local/local_sandbox_provider.py`
  当前本地 sandbox provider，未吃透自定义 mounts 的只读语义。
- `frontend/src/components/ai-elements/prompt-input.tsx`
  当前附件输入 UI，已保存 `file` 字段，但仍有部分流程沿用旧 blob URL 心智。
- `frontend/src/core/threads/hooks.ts`
  当前线程提交流程，上传前仍在做 blob URL -> File 重建。
- `backend/app/gateway/routers/suggestions.py`
  当前 follow-up question 生成入口，仍以单字符串 prompt 调模型。
- `backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py`
  当前循环检测中间件，对 `AIMessage.content: list[...]` 不安全。
- `backend/packages/harness/nion/agents/memory/prompt.py`
  当前 memory prompt 注入遗漏 `longTermBackground`。

### 建议新增文件

- `backend/packages/harness/nion/sandbox/search.py`
  提供本地 sandbox `grep` / `glob` 搜索实现。
- `backend/tests/test_file_conversion.py`
  覆盖 PDF 转换策略、outline 提取与 fallback 行为。
- `backend/tests/test_sandbox_search_tools.py`
  覆盖 `grep` / `glob` 工具行为。
- `frontend/src/core/uploads/file-validation.ts`
  封装 `.app` 等不支持上传文件的前端校验。
- `frontend/src/core/uploads/prompt-input-files.ts`
  封装 `PromptInputFilePart -> File` 转换逻辑，优先复用原始 `File`。
- `frontend/src/core/uploads/file-validation.test.mjs`
  覆盖 `.app` 拦截行为。
- `frontend/src/core/uploads/prompt-input-files.test.mjs`
  覆盖附件文件对象保留与转换行为。

---

## 实施任务

### Task 1: 升级文档转换和 outline 提取链路

**Files:**
- Modify: `backend/packages/harness/nion/utils/file_conversion.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/packages/harness/pyproject.toml`
- Create: `backend/tests/test_file_conversion.py`

- [ ] **Step 1: 写失败测试，先锁定 long PDF / outline / fallback 行为**

```python
from pathlib import Path

from nion.utils.file_conversion import convert_file_to_markdown, extract_outline


async def test_convert_file_to_markdown_prefers_pymupdf_then_falls_back(tmp_path, monkeypatch):
    pdf_path = tmp_path / "paper.pdf"
    pdf_path.write_bytes(b"%PDF-1.4")

    monkeypatch.setattr(
        "nion.utils.file_conversion._convert_pdf_with_pymupdf4llm",
        lambda file_path: "short",
    )
    monkeypatch.setattr(
        "nion.utils.file_conversion._pymupdf_output_too_sparse",
        lambda text, file_path: True,
    )
    monkeypatch.setattr(
        "nion.utils.file_conversion._convert_with_markitdown",
        lambda file_path: "# Title\n\nBody",
    )

    md_path = await convert_file_to_markdown(pdf_path)

    assert md_path is not None
    assert md_path.read_text(encoding="utf-8") == "# Title\n\nBody"


def test_extract_outline_reads_markdown_headings_and_sec_style_bold(tmp_path):
    md_path = tmp_path / "paper.md"
    md_path.write_text(
        "# Overview\n\n## Method\n\n**1** **实验设置**\n\nBody\n",
        encoding="utf-8",
    )

    outline = extract_outline(md_path)

    assert outline[0]["title"] == "Overview"
    assert outline[1]["title"] == "Method"
    assert outline[2]["title"] == "实验设置"
```

- [ ] **Step 2: 运行测试确认失败**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_file_conversion.py -q`
Expected: FAIL because `extract_outline()` and converter fallback logic do not exist

- [ ] **Step 3: 在 `file_conversion.py` 实现最小 converter 策略和 outline 提取**

```python
import asyncio
import logging
import re
from pathlib import Path

logger = logging.getLogger(__name__)
_ASYNC_THRESHOLD_BYTES = 1 * 1024 * 1024
_MIN_CHARS_PER_PAGE = 50


def _convert_with_markitdown(file_path: Path) -> str:
    from markitdown import MarkItDown

    md = MarkItDown()
    return md.convert(str(file_path)).text_content


def _convert_pdf_with_pymupdf4llm(file_path: Path) -> str | None:
    try:
        import pymupdf4llm
    except ImportError:
        return None
    try:
        return pymupdf4llm.to_markdown(str(file_path))
    except Exception:
        logger.exception("pymupdf4llm failed for %s", file_path.name)
        return None


def _pymupdf_output_too_sparse(text: str, file_path: Path) -> bool:
    chars = len(text.strip())
    return chars < 200


def _do_convert(file_path: Path, pdf_converter: str = "auto") -> str:
    if file_path.suffix.lower() == ".pdf" and pdf_converter != "markitdown":
        pymupdf_text = _convert_pdf_with_pymupdf4llm(file_path)
        if pymupdf_text is not None:
            if pdf_converter == "pymupdf4llm" or not _pymupdf_output_too_sparse(pymupdf_text, file_path):
                return pymupdf_text
    return _convert_with_markitdown(file_path)


async def convert_file_to_markdown(file_path: Path) -> Path | None:
    try:
        text = (
            await asyncio.to_thread(_do_convert, file_path)
            if file_path.stat().st_size > _ASYNC_THRESHOLD_BYTES
            else _do_convert(file_path)
        )
        md_path = file_path.with_suffix(".md")
        md_path.write_text(text, encoding="utf-8")
        return md_path
    except Exception:
        logger.exception("Failed to convert %s", file_path.name)
        return None


_STD_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
_SPLIT_BOLD_HEADING_RE = re.compile(r"^\*\*\d+\*\*\s+\*\*([^*]+)\*\*$")


def extract_outline(md_path: Path) -> list[dict]:
    outline: list[dict] = []
    with md_path.open(encoding="utf-8") as handle:
        for index, line in enumerate(handle, start=1):
            text = line.strip()
            if not text:
                continue
            std_match = _STD_HEADING_RE.match(text)
            if std_match:
                outline.append({"line": index, "title": std_match.group(2).strip("* ").strip()})
                continue
            split_bold_match = _SPLIT_BOLD_HEADING_RE.match(text)
            if split_bold_match:
                outline.append({"line": index, "title": split_bold_match.group(1).strip()})
    return outline
```

- [ ] **Step 4: 运行测试确认通过**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_file_conversion.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/utils/file_conversion.py backend/packages/harness/nion/config/app_config.py backend/packages/harness/pyproject.toml backend/tests/test_file_conversion.py
git commit -m "feat(uploads): upgrade document conversion and outline extraction"
```

### Task 2: 把 outline / preview / file-first guidance 接进 UploadsMiddleware

**Files:**
- Modify: `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`
- Modify: `backend/tests/test_uploads_middleware_core_logic.py`

- [ ] **Step 1: 写失败测试，锁定 outline 注入与 preview fallback**

```python
from pathlib import Path
from unittest.mock import MagicMock

from langchain_core.messages import HumanMessage

from nion.agents.middlewares.uploads_middleware import UploadsMiddleware


def test_before_agent_includes_outline_for_uploaded_markdown_pair(tmp_path, monkeypatch):
    uploads_dir = tmp_path / "threads" / "thread-1" / "user-data" / "uploads"
    uploads_dir.mkdir(parents=True)
    (uploads_dir / "report.pdf").write_bytes(b"pdf")
    (uploads_dir / "report.md").write_text("# Overview\n\n## Findings\n", encoding="utf-8")

    runtime = MagicMock()
    runtime.context = {"thread_id": "thread-1"}
    state = {
        "messages": [
            HumanMessage(
                content="summarize it",
                additional_kwargs={
                    "files": [{"filename": "report.pdf", "size": 3, "path": "/mnt/user-data/uploads/report.pdf"}]
                },
            )
        ]
    }

    middleware = UploadsMiddleware(base_dir=str(tmp_path))
    result = middleware.before_agent(state, runtime)

    assert result is not None
    text = result["messages"][-1].content
    assert "Document outline" in text
    assert "L1: Overview" in text
    assert "L3: Findings" in text


def test_before_agent_uses_preview_when_outline_missing(tmp_path):
    uploads_dir = tmp_path / "threads" / "thread-1" / "user-data" / "uploads"
    uploads_dir.mkdir(parents=True)
    (uploads_dir / "note.pdf").write_bytes(b"pdf")
    (uploads_dir / "note.md").write_text("First line\n\nSecond line\n", encoding="utf-8")
```

- [ ] **Step 2: 运行测试确认失败**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_uploads_middleware_core_logic.py -q`
Expected: FAIL because outline/preview injection is not implemented

- [ ] **Step 3: 实现最小 outline/preview 注入**

```python
from nion.utils.file_conversion import extract_outline


def _extract_outline_for_file(file_path: Path) -> tuple[list[dict], list[str]]:
    md_path = file_path.with_suffix(".md")
    if not md_path.is_file():
        return [], []

    outline = extract_outline(md_path)
    if outline:
        return outline, []

    preview: list[str] = []
    with md_path.open(encoding="utf-8") as handle:
        for line in handle:
            stripped = line.strip()
            if stripped:
                preview.append(stripped)
            if len(preview) >= 5:
                break
    return [], preview


def _format_file_entry(self, file: dict, lines: list[str]) -> None:
    lines.append(f"- {file['filename']}")
    lines.append(f"  Path: {file['path']}")
    if file.get("outline"):
        lines.append("  Document outline (use `read_file` with line ranges to read sections):")
        for entry in file["outline"]:
            lines.append(f"    L{entry['line']}: {entry['title']}")
    elif file.get("outline_preview"):
        lines.append("  No structural headings detected. Document begins with:")
        for text in file["outline_preview"]:
            lines.append(f"    > {text}")
    lines.append("  Use `grep` and `glob` before falling back to web search.")
```

- [ ] **Step 4: 运行测试确认通过**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_uploads_middleware_core_logic.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/uploads_middleware.py backend/tests/test_uploads_middleware_core_logic.py
git commit -m "feat(uploads): inject document outline and file-first guidance"
```

### Task 3: 为本地 sandbox 增加 grep/glob 和只读 path mapping

**Files:**
- Create: `backend/packages/harness/nion/sandbox/search.py`
- Modify: `backend/packages/harness/nion/sandbox/local/local_sandbox.py`
- Modify: `backend/packages/harness/nion/sandbox/local/local_sandbox_provider.py`
- Modify: `backend/packages/harness/nion/sandbox/tools.py`
- Modify: `backend/tests/test_sandbox_tools_security.py`
- Create: `backend/tests/test_sandbox_search_tools.py`

- [ ] **Step 1: 写失败测试，先锁定 grep/glob 与只读挂载行为**

```python
from pathlib import Path

import pytest

from nion.sandbox.local.local_sandbox import LocalSandbox, PathMapping


def test_local_sandbox_glob_returns_virtual_paths(tmp_path):
    root = tmp_path / "workspace"
    root.mkdir()
    (root / "a.py").write_text("print('a')")
    sandbox = LocalSandbox(
        id="sandbox-1",
        path_mappings=[PathMapping("/mnt/user-data/workspace", str(root), False)],
    )

    matches, truncated = sandbox.glob("/mnt/user-data/workspace", "*.py")

    assert truncated is False
    assert matches == ["/mnt/user-data/workspace/a.py"]


def test_local_sandbox_rejects_write_to_read_only_mapping(tmp_path):
    root = tmp_path / "skills"
    root.mkdir()
    sandbox = LocalSandbox(
        id="sandbox-1",
        path_mappings=[PathMapping("/mnt/skills", str(root), True)],
    )

    with pytest.raises(OSError):
        sandbox.write_file("/mnt/skills/test.txt", "content")
```

- [ ] **Step 2: 运行测试确认失败**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_sandbox_search_tools.py backend/tests/test_sandbox_tools_security.py -q`
Expected: FAIL because `PathMapping` / `glob` / `grep` are not implemented

- [ ] **Step 3: 实现最小搜索模块和只读映射**

```python
# backend/packages/harness/nion/sandbox/search.py
from dataclasses import dataclass
from pathlib import Path
import fnmatch


@dataclass(frozen=True)
class GrepMatch:
    path: str
    line_number: int
    line: str


def find_glob_matches(root: Path, pattern: str, *, include_dirs: bool = False, max_results: int = 200):
    matches: list[str] = []
    for path in root.rglob("*"):
        if len(matches) >= max_results:
            return matches, True
        if path.is_dir() and not include_dirs:
            continue
        rel = path.relative_to(root).as_posix()
        if fnmatch.fnmatch(rel, pattern) or fnmatch.fnmatch(path.name, pattern):
            matches.append(str(path))
    return matches, False
```

```python
# backend/packages/harness/nion/sandbox/local/local_sandbox.py
from dataclasses import dataclass


@dataclass(frozen=True)
class PathMapping:
    container_path: str
    local_path: str
    read_only: bool = False
```

并在 `write_file()` / `update_file()` 前增加 `_is_read_only_path()` 检查，在类上新增 `glob()` / `grep()` 方法。

- [ ] **Step 4: 在 `sandbox/tools.py` 中暴露 `grep_tool` / `glob_tool`**

```python
@tool("glob", parse_docstring=True)
def glob_tool(runtime: ToolRuntime[ContextT, ThreadState], description: str, path: str, pattern: str) -> str:
    sandbox = ensure_sandbox_initialized(runtime)
    matches, truncated = sandbox.glob(path, pattern)
    lines = matches[:]
    if truncated:
        lines.append("... [results truncated]")
    return "\n".join(lines) if lines else "(empty)"


@tool("grep", parse_docstring=True)
def grep_tool(runtime: ToolRuntime[ContextT, ThreadState], description: str, path: str, pattern: str) -> str:
    sandbox = ensure_sandbox_initialized(runtime)
    matches, truncated = sandbox.grep(path, pattern)
    lines = [f"{match.path}:{match.line_number}: {match.line}" for match in matches]
    if truncated:
        lines.append("... [results truncated]")
    return "\n".join(lines) if lines else "(empty)"
```

- [ ] **Step 5: 运行测试确认通过**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_sandbox_search_tools.py backend/tests/test_sandbox_tools_security.py -q`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/sandbox/search.py backend/packages/harness/nion/sandbox/local/local_sandbox.py backend/packages/harness/nion/sandbox/local/local_sandbox_provider.py backend/packages/harness/nion/sandbox/tools.py backend/tests/test_sandbox_search_tools.py backend/tests/test_sandbox_tools_security.py
git commit -m "feat(sandbox): add grep glob tools and read-only path mappings"
```

### Task 4: 稳定前端附件输入和不支持文件拦截

**Files:**
- Modify: `frontend/src/components/ai-elements/prompt-input.tsx`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/uploads/index.ts`
- Create: `frontend/src/core/uploads/file-validation.ts`
- Create: `frontend/src/core/uploads/prompt-input-files.ts`
- Create: `frontend/src/core/uploads/file-validation.test.mjs`
- Create: `frontend/src/core/uploads/prompt-input-files.test.mjs`
- Modify: `frontend/src/components/ai-elements/prompt-input.test.ts`

- [ ] **Step 1: 写失败测试，锁定 .app 拦截和原始 File 复用**

```js
import assert from "node:assert/strict";
import test from "node:test";

import {
  MACOS_APP_BUNDLE_UPLOAD_MESSAGE,
  isLikelyMacOSAppBundle,
} from "./file-validation.js";
import { promptInputFilePartToFile } from "./prompt-input-files.js";

void test("isLikelyMacOSAppBundle detects browser-uploaded .app bundles", () => {
  assert.equal(
    isLikelyMacOSAppBundle({ name: "MyApp.app", type: "" }),
    true,
  );
  assert.match(MACOS_APP_BUNDLE_UPLOAD_MESSAGE, /\.app/);
});

void test("promptInputFilePartToFile prefers the preserved File object", async () => {
  const file = new File(["ok"], "report.txt", { type: "text/plain" });
  const result = await promptInputFilePartToFile({
    type: "file",
    filename: "report.txt",
    mediaType: "text/plain",
    file,
  });

  assert.equal(result, file);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm exec node --test frontend/src/core/uploads/file-validation.test.mjs frontend/src/core/uploads/prompt-input-files.test.mjs`
Expected: FAIL because helper modules do not exist

- [ ] **Step 3: 实现最小上传校验与文件转换 helper**

```ts
// frontend/src/core/uploads/file-validation.ts
const MACOS_APP_BUNDLE_CONTENT_TYPES = new Set(["", "application/octet-stream"]);

export const MACOS_APP_BUNDLE_UPLOAD_MESSAGE =
  "macOS .app bundles can't be uploaded directly from the browser. Compress the app as a .zip or upload the .dmg instead.";

export function isLikelyMacOSAppBundle(file: Pick<File, "name" | "type">) {
  return file.name.toLowerCase().endsWith(".app") && MACOS_APP_BUNDLE_CONTENT_TYPES.has(file.type);
}

export function splitUnsupportedUploadFiles(fileList: File[] | FileList) {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of Array.from(fileList)) {
    if (isLikelyMacOSAppBundle(file)) {
      rejected.push(file);
      continue;
    }
    accepted.push(file);
  }
  return {
    accepted,
    rejected,
    message: rejected.length > 0 ? MACOS_APP_BUNDLE_UPLOAD_MESSAGE : null,
  };
}
```

```ts
// frontend/src/core/uploads/prompt-input-files.ts
import type { PromptInputFilePart } from "@/components/ai-elements/prompt-input";

export async function promptInputFilePartToFile(part: PromptInputFilePart) {
  if (part.file instanceof File) {
    return part.file;
  }
  if (part.url && part.filename) {
    const response = await fetch(part.url);
    const blob = await response.blob();
    return new File([blob], part.filename, {
      type: part.mediaType || blob.type,
    });
  }
  return null;
}
```

- [ ] **Step 4: 改 `prompt-input.tsx` 和 `threads/hooks.ts` 接 helper**

```ts
import { splitUnsupportedUploadFiles } from "@/core/uploads";
import { promptInputFilePartToFile, uploadFiles } from "@/core/uploads";
```

并在拖拽/选择文件时先走 `splitUnsupportedUploadFiles()`，在线程提交时统一走 `promptInputFilePartToFile()`。

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm exec node --test frontend/src/core/uploads/file-validation.test.mjs frontend/src/core/uploads/prompt-input-files.test.mjs frontend/src/components/ai-elements/prompt-input.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ai-elements/prompt-input.tsx frontend/src/core/threads/hooks.ts frontend/src/core/uploads/index.ts frontend/src/core/uploads/file-validation.ts frontend/src/core/uploads/prompt-input-files.ts frontend/src/core/uploads/file-validation.test.mjs frontend/src/core/uploads/prompt-input-files.test.mjs frontend/src/components/ai-elements/prompt-input.test.ts
git commit -m "feat(frontend): stabilize prompt attachments and block app bundle uploads"
```

### Task 5: 吸收低风险健壮性修复

**Files:**
- Modify: `backend/app/gateway/routers/suggestions.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py`
- Modify: `backend/packages/harness/nion/agents/memory/prompt.py`
- Modify: `backend/app/gateway/routers/agents.py`
- Modify: `backend/tests/test_suggestions_router.py`
- Modify: `backend/tests/test_loop_detection_middleware.py`
- Modify: `backend/tests/test_memory_prompt_injection.py`
- Modify: `backend/tests/test_custom_agent.py`

- [ ] **Step 1: 写失败测试，锁定 4 个小修点**

```python
from langchain_core.messages import AIMessage

from nion.agents.middlewares.loop_detection_middleware import LoopDetectionMiddleware
from nion.agents.memory.prompt import format_memory_for_injection


def test_generate_suggestions_invokes_model_with_system_and_human_messages(monkeypatch):
    ...


def test_loop_detection_hard_stop_handles_list_content():
    middleware = LoopDetectionMiddleware(warn_threshold=1, hard_limit=1)
    runtime = type("Runtime", (), {"context": {"thread_id": "thread-1"}})()
    state = {
        "messages": [
            AIMessage(content=[{"type": "text", "text": "thinking"}], tool_calls=[{"name": "bash", "args": {"command": "ls"}}]),
        ]
    }

    result = middleware._apply(state, runtime)

    assert result is not None
    assert result["messages"][0].tool_calls == []


def test_format_memory_includes_long_term_background():
    memory_data = {
        "history": {
            "recentMonths": {"summary": "Recent"},
            "earlierContext": {"summary": "Earlier"},
            "longTermBackground": {"summary": "Background"},
        }
    }
    result = format_memory_for_injection(memory_data)
    assert "Background: Background" in result
```

- [ ] **Step 2: 运行测试确认失败**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_suggestions_router.py backend/tests/test_loop_detection_middleware.py backend/tests/test_memory_prompt_injection.py backend/tests/test_custom_agent.py -q`
Expected: FAIL on the new assertions

- [ ] **Step 3: 实现最小修复**

```python
# backend/app/gateway/routers/suggestions.py
from langchain_core.messages import HumanMessage, SystemMessage
...
response = await model.ainvoke([SystemMessage(content=system_instruction), HumanMessage(content=user_content)])
```

```python
# backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py
def _append_text(content, suffix: str):
    if content is None:
        return suffix
    if isinstance(content, list):
        return [*content, {"type": "text", "text": suffix}]
    return f"{content}{suffix}"
```

```python
# backend/packages/harness/nion/agents/memory/prompt.py
background = history_data.get("longTermBackground", {})
if background.get("summary"):
    history_sections.append(f"Background: {background['summary']}")
```

并在 `GET /api/agents` 列表返回时开启 `include_soul=True`。

- [ ] **Step 4: 运行测试确认通过**

Run: `UV_LINK_MODE=copy uv run pytest backend/tests/test_suggestions_router.py backend/tests/test_loop_detection_middleware.py backend/tests/test_memory_prompt_injection.py backend/tests/test_custom_agent.py -q`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/app/gateway/routers/suggestions.py backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py backend/packages/harness/nion/agents/memory/prompt.py backend/app/gateway/routers/agents.py backend/tests/test_suggestions_router.py backend/tests/test_loop_detection_middleware.py backend/tests/test_memory_prompt_injection.py backend/tests/test_custom_agent.py
git commit -m "fix: absorb low-risk upstream suggestion memory and agent catalog fixes"
```

---

## 验证矩阵

### 后端验证

Run:

```bash
UV_LINK_MODE=copy uv run pytest \
  backend/tests/test_file_conversion.py \
  backend/tests/test_uploads_middleware_core_logic.py \
  backend/tests/test_sandbox_search_tools.py \
  backend/tests/test_sandbox_tools_security.py \
  backend/tests/test_suggestions_router.py \
  backend/tests/test_loop_detection_middleware.py \
  backend/tests/test_memory_prompt_injection.py \
  backend/tests/test_custom_agent.py -q
```

Expected:

- 文档转换与 outline 提取通过
- 上传文件 prompt 注入通过
- grep / glob 与只读挂载安全通过
- suggestions / loop detection / memory prompt / agents list 小修通过

### 前端验证

Run:

```bash
pnpm exec node --test \
  frontend/src/core/uploads/file-validation.test.mjs \
  frontend/src/core/uploads/prompt-input-files.test.mjs \
  frontend/src/components/ai-elements/prompt-input.test.ts
```

Expected:

- `.app` 拦截通过
- 原始 File 优先复用通过
- prompt input 现有 contract 不回归

### 人工冒烟

Run:

```bash
make desktop-dev
```

Check:

- 上传 PDF 后，agent 能看到 outline 或 preview
- 输入框拖入 `.app` 时会被拦截
- 有附件的消息发送后不会因 blob URL 丢失而失败
- agent 可以使用 `grep` / `glob`
- follow-up suggestions 仍能正常生成

---

## 风险与防线

### 风险一：文档转换引入新依赖后影响现有轻量路径

防线：

- `pymupdf4llm` 必须是 optional/fallback 方案
- 小文件仍允许同步路径，大文件才 offload

### 风险二：上传 prompt 注入过度膨胀

防线：

- outline 条数要有限制
- outline 为空时只给 preview，不灌整段文档

### 风险三：sandbox 搜索工具放宽了权限边界

防线：

- `grep` / `glob` 仍走现有 `validate_local_tool_path()` 边界
- read-only 挂载要在 `write_file` / `update_file` 两个写入口都拦住

### 风险四：前端附件 helper 再次分叉

防线：

- 统一由 `promptInputFilePartToFile()` 负责转换
- `prompt-input.tsx` 与 `threads/hooks.ts` 不再各自实现一套文件重建逻辑

### 风险五：小修 commit 混进 donor 假设

防线：

- `suggestions` 只吸 `SystemMessage + HumanMessage`
- `agents list soul` 只改 API 返回，不改 agent 存储模型
- 不吸 `config.yaml` 路径查找那类 donor 假设

---

## 自检

### Spec coverage

- 覆盖了 P1 批次 11 个提交中的主要价值点
- 明确排除了 wecom、部署、skills 包、runtime platform 主线
- 上传文档链路、sandbox 工具、前端附件、小修均有对应任务

### Placeholder scan

- 无 `TODO` / `TBD`
- 每个任务都有具体文件、测试、命令和 commit

### Type consistency

- 上传链路统一使用 `extract_outline()`、`outline_preview`、`promptInputFilePartToFile()`
- sandbox 链路统一使用 `PathMapping`、`grep_tool`、`glob_tool`
- 小修链路统一围绕当前 NION 文件，不引用 donor 专属类型

---

Plan complete and saved to `docs/superpowers/plans/2026-04-06-p1-upstream-adoption-batch-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
