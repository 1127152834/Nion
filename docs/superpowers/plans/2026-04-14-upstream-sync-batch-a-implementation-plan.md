# NION Upstream Sync Batch A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以最小、可验证、逐提交的方式吸收第一批高价值上游修复，同时不破坏 NION 的 Config Center、Electron/daemon、Memory/Soul 和 desktop-first bridge 主链。

**Architecture:** 每个任务只处理一个 upstream commit 或一个明确的局部规则，不执行 merge，不执行整提交 cherry-pick。所有实现都以 NION 当前文件和架构为落点，先补回归测试，再做最小实现，最后独立提交。

**Tech Stack:** Python backend, TypeScript frontend/desktop tests, existing NION config store / provider stack / desktop stream clients, `pytest`, Node `node:test`; no new dependencies.

---

## File Structure

**Modify / Test:**

- `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`
  - Task 1: add `configurable.thread_id` fallback for upload path resolution.
- `backend/tests/test_uploads_middleware_core_logic.py`
  - Task 1 and Task 2 regression coverage.
- `backend/packages/harness/nion/utils/file_conversion.py`
  - Task 2: harden split-bold heading extraction and preview fallback rules.
- `backend/tests/test_file_conversion.py`
  - Task 2 regression coverage.
- `backend/packages/harness/nion/models/claude_provider.py`
  - Task 3: add OAuth billing header support if still missing.
- `backend/tests/test_cli_auth_providers.py`
  - Task 3 regression coverage.
- `backend/packages/harness/nion/client.py`
  - Task 4: inspect/adjust stream end semantics only if the test proves a gap.
- `frontend/src/core/api/desktop-client.ts`
  - Task 4: inspect/adjust desktop SSE consumption only if the test proves a gap.
- `desktop/src/main/bridge/nion-thread-client.ts`
  - Task 4: inspect/adjust bridge SSE consumption only if the test proves a gap.
- `frontend/src/core/threads/desktop-client.test.ts`
  - Task 4 regression coverage.
- `desktop/tests/nion-thread-client-behavior.test.mjs`
  - Task 4 regression coverage.
- `frontend/src/core/settings/local.ts`
  - Task 5 only if a thread-scoped model persistence gap is proven.
- `frontend/src/core/threads/hooks.ts`
  - Task 5 only if a gap is proven in submit context or persistence.

**Do Not Modify:**

- Do not modify `config.yaml`, `config.example.yaml`, or any file-mode config truth source.
- Do not modify upstream `backend/app/channels/*` into NION.
- Do not modify Memory/Soul product surfaces in this batch.
- Do not modify `frontend/pnpm-lock.yaml`; it is already dirty and unrelated in this worktree.

---

## Task 1: Partially Sync `46d0c329` Uploads Thread ID Fallback

**Decision:** `部分同步`

**Files:**

- Modify: `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`
- Modify: `backend/tests/test_uploads_middleware_core_logic.py`

- [ ] **Step 1: Add failing test for configurable thread fallback**

Add this test to `backend/tests/test_uploads_middleware_core_logic.py` near the existing `before_agent` tests:

```python
def test_before_agent_uses_configurable_thread_id_when_runtime_context_is_missing(
    tmp_path,
    monkeypatch,
):
    mw = _middleware(tmp_path)
    uploads_dir = _uploads_dir(tmp_path, "thread-from-config")
    (uploads_dir / "report.txt").write_text("hello", encoding="utf-8")

    msg = _human(
        "summarize",
        files=[{"filename": "report.txt", "size": 5, "path": "/ignored/report.txt"}],
    )
    state = {"messages": [msg]}
    runtime = _runtime(thread_id=None)
    runtime.context = {}

    monkeypatch.setattr(
        "nion.agents.middlewares.uploads_middleware.get_config",
        lambda: {"configurable": {"thread_id": "thread-from-config"}},
    )

    result = mw.before_agent(state, runtime)

    assert result is not None
    updated = result["messages"][-1]
    assert "report.txt" in updated.content
    assert "/mnt/user-data/uploads/report.txt" in updated.content
```

- [ ] **Step 2: Run test and verify failure**

Run:

```bash
uv run pytest backend/tests/test_uploads_middleware_core_logic.py::test_before_agent_uses_configurable_thread_id_when_runtime_context_is_missing -q
```

Expected before implementation:

```text
FAILED
```

The expected failure is that `uploads_dir` is not resolved because `runtime.context.thread_id` is missing.

- [ ] **Step 3: Implement fallback helper**

Modify `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`:

```python
try:
    from langgraph.config import get_config
except Exception:  # pragma: no cover - depends on langgraph import surface
    get_config = None  # type: ignore[assignment]
```

Add a private helper in `UploadsMiddleware`:

```python
    def _resolve_thread_id(self, runtime: Runtime) -> str | None:
        thread_id = runtime.context.get("thread_id") if runtime.context else None
        if thread_id:
            return str(thread_id)

        if get_config is None:
            return None

        try:
            config = get_config()
        except RuntimeError:
            return None

        configurable = config.get("configurable", {}) if isinstance(config, dict) else {}
        fallback = configurable.get("thread_id") if isinstance(configurable, dict) else None
        return str(fallback) if fallback else None
```

Replace the current direct resolution:

```python
        thread_id = runtime.context.get("thread_id") if runtime.context else None
```

with:

```python
        thread_id = self._resolve_thread_id(runtime)
```

- [ ] **Step 4: Run upload middleware tests**

Run:

```bash
uv run pytest backend/tests/test_uploads_middleware_core_logic.py -q
```

Expected:

```text
passed
```

- [ ] **Step 5: Commit Task 1**

Run:

```bash
git add backend/packages/harness/nion/agents/middlewares/uploads_middleware.py \
  backend/tests/test_uploads_middleware_core_logic.py

git commit -m "Preserve upload context when runtime thread id is absent

NION already stores thread data by thread id, but UploadsMiddleware still
looked only at runtime.context. Some LangGraph invocation paths carry the
thread id in configurable instead, so the middleware could skip uploaded
file context even though the upload existed.

Constraint: Must not introduce config.yaml or upstream upload product copy
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep this as a local fallback only; do not pull upstream upload config surfaces
Tested: uv run pytest backend/tests/test_uploads_middleware_core_logic.py -q
Not-tested: Manual upload through desktop UI"
```

---

## Task 2: Partially Sync `163121d3` Outline Hardening

**Decision:** `部分同步`

**Files:**

- Modify: `backend/packages/harness/nion/utils/file_conversion.py`
- Modify: `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`
- Modify: `backend/tests/test_file_conversion.py`
- Modify: `backend/tests/test_uploads_middleware_core_logic.py`

- [ ] **Step 1: Add failing tests for non-ASCII split-bold headings**

Add to `backend/tests/test_file_conversion.py`:

```python
def test_extract_outline_supports_non_ascii_split_bold_headings(tmp_path: Path) -> None:
    md_path = tmp_path / "outline.md"
    md_path.write_text(
        "\n".join(
            [
                "**1** **概述**",
                "**2.1** **实验结果**",
                "**3** **!@#$**",
            ]
        ),
        encoding="utf-8",
    )

    outline = file_conversion.extract_outline(md_path)

    assert outline == [
        {"level": 2, "title": "概述", "number": "1", "line": 1},
        {"level": 3, "title": "实验结果", "number": "2.1", "line": 2},
    ]
```

- [ ] **Step 2: Add failing test for streamed outline read cap**

Add to `backend/tests/test_file_conversion.py`:

```python
def test_extract_outline_stops_after_reasonable_heading_cap(tmp_path: Path) -> None:
    md_path = tmp_path / "outline.md"
    md_path.write_text(
        "\n".join(f"# Heading {index}" for index in range(75)),
        encoding="utf-8",
    )

    outline = file_conversion.extract_outline(md_path)

    assert len(outline) == 50
    assert outline[-1] == {"level": 1, "title": "Heading 49", "line": 50}
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
uv run pytest backend/tests/test_file_conversion.py::test_extract_outline_supports_non_ascii_split_bold_headings backend/tests/test_file_conversion.py::test_extract_outline_stops_after_reasonable_heading_cap -q
```

Expected before implementation:

```text
FAILED
```

- [ ] **Step 4: Implement outline hardening**

Modify `backend/packages/harness/nion/utils/file_conversion.py`:

```python
MAX_OUTLINE_ENTRIES = 50
_MARKDOWN_HEADING_RE = re.compile(r"^(#{1,6})\s+(.+?)\s*$")
_SPLIT_BOLD_HEADING_RE = re.compile(
    r"^\*\*((?:\d+\.)*\d+)\*\*\s+\*\*((?![\d\W]+\*\*$)[^*]+)\*\*\s*$",
    re.UNICODE,
)
```

Update `extract_outline()` so it streams lines and stops at the cap:

```python
    with md_path.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            if len(outline) >= MAX_OUTLINE_ENTRIES:
                break
            line = raw_line.strip()
            if not line:
                continue
```

Keep the existing markdown and split-bold append logic, but use the new regex.

- [ ] **Step 5: Run conversion tests**

Run:

```bash
uv run pytest backend/tests/test_file_conversion.py -q
```

Expected:

```text
passed
```

- [ ] **Step 6: Run upload middleware tests for prompt compatibility**

Run:

```bash
uv run pytest backend/tests/test_uploads_middleware_core_logic.py -q
```

Expected:

```text
passed
```

- [ ] **Step 7: Commit Task 2**

Run:

```bash
git add backend/packages/harness/nion/utils/file_conversion.py \
  backend/packages/harness/nion/agents/middlewares/uploads_middleware.py \
  backend/tests/test_file_conversion.py \
  backend/tests/test_uploads_middleware_core_logic.py

git commit -m "Harden uploaded document outline extraction

Upstream uncovered malformed split-bold headings from PDF conversion. NION
already has outline injection, so this sync only strengthens the parser and
line-reading behavior without importing upstream prompt or config surfaces.

Constraint: Keep upload context product wording and config ownership in NION
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Do not introduce upstream pdf_converter config while hardening outline parsing
Tested: uv run pytest backend/tests/test_file_conversion.py -q; uv run pytest backend/tests/test_uploads_middleware_core_logic.py -q
Not-tested: Real scanned PDF corpus"
```

---

## Task 3: Partially Sync `43ef3691` Claude OAuth Billing Header

**Decision:** `部分同步`, only if missing.

**Files:**

- Modify: `backend/packages/harness/nion/models/claude_provider.py`
- Modify: `backend/tests/test_cli_auth_providers.py`

- [ ] **Step 1: Add failing billing header test**

Add to `backend/tests/test_cli_auth_providers.py`:

```python
def test_claude_oauth_request_payload_injects_billing_header(monkeypatch):
    monkeypatch.setenv("ANTHROPIC_AUTH_TOKEN", "sk-ant-oat01-test-token")
    monkeypatch.setenv("ANTHROPIC_BILLING_HEADER", "nion-test-billing")

    model = ClaudeChatModel(model="claude-sonnet-4-6", retry_max_attempts=1)
    payload = model._get_request_payload([HumanMessage(content="hello")])

    system = payload.get("system")
    assert isinstance(system, list)
    first_block = system[0]
    assert first_block["type"] == "text"
    assert "nion-test-billing" in first_block["text"]
    assert payload["metadata"]["user_id"]
```

Ensure the test imports `HumanMessage` if not already imported:

```python
from langchain_core.messages import HumanMessage
```

- [ ] **Step 2: Run test and verify failure or existing pass**

Run:

```bash
uv run pytest backend/tests/test_cli_auth_providers.py::test_claude_oauth_request_payload_injects_billing_header -q
```

Expected:

- If it fails, implement Step 3.
- If it already passes, skip Step 3 and commit only the regression test as an equivalent-absorption lock.

- [ ] **Step 3: Implement billing header injection if needed**

Modify `backend/packages/harness/nion/models/claude_provider.py`:

```python
import os
import socket
```

Add constants:

```python
DEFAULT_OAUTH_BILLING_HEADER = "claude-code"
```

Add helper:

```python
    def _apply_oauth_billing(self, payload: dict) -> None:
        if not self._is_oauth:
            return

        billing_header = os.getenv("ANTHROPIC_BILLING_HEADER", DEFAULT_OAUTH_BILLING_HEADER)
        billing_block = {"type": "text", "text": billing_header}
        system = payload.get("system")
        if isinstance(system, list):
            system = [
                block
                for block in system
                if not (
                    isinstance(block, dict)
                    and block.get("type") == "text"
                    and block.get("text") == billing_header
                )
            ]
            payload["system"] = [billing_block, *system]
        elif isinstance(system, str):
            payload["system"] = [billing_block, {"type": "text", "text": system}]
        else:
            payload["system"] = [billing_block]

        metadata = payload.get("metadata")
        if not isinstance(metadata, dict):
            metadata = {}
        metadata.setdefault("user_id", f"nion-{socket.gethostname()}")
        payload["metadata"] = metadata
```

Call it in `_get_request_payload()` before prompt caching:

```python
        if self._is_oauth:
            self._apply_oauth_billing(payload)
```

- [ ] **Step 4: Run provider tests**

Run:

```bash
uv run pytest backend/tests/test_cli_auth_providers.py -q
```

Expected:

```text
passed
```

- [ ] **Step 5: Commit Task 3**

Run:

```bash
git add backend/packages/harness/nion/models/claude_provider.py \
  backend/tests/test_cli_auth_providers.py

git commit -m "Keep Claude OAuth model requests billable under NION provider stack

Claude OAuth tokens require the same billing identity expected by the
Anthropic API. This ports only the provider-level request shaping into
NION's Claude provider and does not touch model configuration ownership.

Constraint: Provider fix must stay independent of config.yaml
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Keep OAuth request shaping in the provider layer; do not encode it in model settings UI
Tested: uv run pytest backend/tests/test_cli_auth_providers.py -q
Not-tested: Live Claude OAuth request against paid models"
```

---

## Task 4: Gated Rewrite For `6dbdd467` Stream End Delivery

**Decision:** `只吸收规则，不吸收实现`

**Files:**

- Modify only if failing test proves a gap:
  - `backend/packages/harness/nion/client.py`
  - `frontend/src/core/api/desktop-client.ts`
  - `desktop/src/main/bridge/nion-thread-client.ts`
- Tests:
  - `frontend/src/core/threads/desktop-client.test.ts`
  - `desktop/tests/nion-thread-client-behavior.test.mjs`

- [ ] **Step 1: Add desktop client test for terminal event handling under chunk boundaries**

Add to `frontend/src/core/threads/desktop-client.test.ts`:

```ts
void test("desktop thread client treats final end event as terminal even when split across chunks", async () => {
  const originalFetch = globalThis.fetch;
  const events: string[] = [];

  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('event: messages-tuple\ndata: {"type":"ai","content":"hello"}\n\n'));
          controller.enqueue(encoder.encode('event: en'));
          controller.enqueue(encoder.encode('d\ndata: {}'));
          controller.enqueue(encoder.encode('\n\n'));
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });

  await client.streamRun(
    "t-1",
    { messages: [] },
    { threadId: "t-1", context: {}, config: {} },
    { onEvent: (event) => events.push(event) },
  );

  assert.ok(events.includes("end"));
  globalThis.fetch = originalFetch;
});
```

- [ ] **Step 2: Add bridge client test for split end event**

Add to `desktop/tests/nion-thread-client-behavior.test.mjs`:

```js
test("nion thread client handles split end event without losing final text", async () => {
  const createNionThreadClient = await loadThreadClientFactory();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode('event: messages-tuple\ndata: {"type":"ai","content":"done"}\n\n'));
          controller.enqueue(encoder.encode('event: en'));
          controller.enqueue(encoder.encode('d\ndata: {}'));
          controller.enqueue(encoder.encode('\n\n'));
          controller.close();
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );

  const client = createNionThreadClient("http://127.0.0.1:43115");
  const result = await client.streamMessage("t-1", "hi");

  assert.equal(result.finalText, "done");
  assert.ok(result.events.some((event) => event.event === "end"));
  globalThis.fetch = originalFetch;
});
```

- [ ] **Step 3: Run gated tests**

Run:

```bash
pnpm -C frontend test -- frontend/src/core/threads/desktop-client.test.ts
pnpm -C desktop/electron test -- desktop/tests/nion-thread-client-behavior.test.mjs
```

Expected:

- If both pass, do not modify streaming implementation. Commit the tests only if they add useful coverage.
- If either fails, fix only the relevant SSE parser/buffer logic and rerun.

- [ ] **Step 4: Commit Task 4**

Run:

```bash
git add frontend/src/core/threads/desktop-client.test.ts \
  desktop/tests/nion-thread-client-behavior.test.mjs \
  frontend/src/core/api/desktop-client.ts \
  desktop/src/main/bridge/nion-thread-client.ts \
  backend/packages/harness/nion/client.py

git commit -m "Lock stream termination behavior in NION clients

Upstream fixed queue-level END sentinel delivery, but NION does not use the
same stream bridge implementation. This task preserves the business rule by
testing NION's SSE consumers directly and only changes parser code if a real
gap is proven.

Constraint: Do not import upstream stream_bridge implementation into NION
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Treat end-event delivery as a NION streaming invariant, not an upstream file copy
Tested: pnpm -C frontend test -- frontend/src/core/threads/desktop-client.test.ts; pnpm -C desktop/electron test -- desktop/tests/nion-thread-client-behavior.test.mjs
Not-tested: Live daemon backpressure under production load"
```

---

## Task 5: Gated Diff For `0eb6550c` Per-Thread Model Persistence

**Decision:** verify before implementation.

**Files:**

- `frontend/src/core/settings/local.ts`
- `frontend/src/core/threads/hooks.ts`
- Existing or new frontend tests under `frontend/src/core/settings/` or `frontend/src/core/threads/`

- [ ] **Step 1: Audit current implementation**

Run:

```bash
rg -n 'THREAD_MODEL_KEY_PREFIX|getThreadModelName|saveThreadModelName|getThreadLocalSettings|saveThreadLocalSettings|model_name' frontend/src/core/settings/local.ts frontend/src/core/threads/hooks.ts frontend/src/app/workspace/chats/chat-thread-page.tsx frontend/src/components/workspace/input-box.tsx
```

Expected:

- If thread-scoped model persistence is already present, record `0eb6550c` as `已等价吸收`.
- If the model persists globally but not per thread, proceed to Step 2.

- [ ] **Step 2: Add failing thread-local settings test only if a gap exists**

Create or update a frontend unit test near settings/local tests:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  getThreadLocalSettings,
  saveThreadLocalSettings,
  DEFAULT_LOCAL_SETTINGS,
} from "./local";

void test("thread local settings preserve independent model choices", () => {
  localStorage.clear();
  saveThreadLocalSettings("thread-a", {
    ...DEFAULT_LOCAL_SETTINGS,
    context: {
      ...DEFAULT_LOCAL_SETTINGS.context,
      model_name: "model-a",
      mode: "thinking",
    },
  });
  saveThreadLocalSettings("thread-b", {
    ...DEFAULT_LOCAL_SETTINGS,
    context: {
      ...DEFAULT_LOCAL_SETTINGS.context,
      model_name: "model-b",
      mode: "thinking",
    },
  });

  assert.equal(getThreadLocalSettings("thread-a").context.model_name, "model-a");
  assert.equal(getThreadLocalSettings("thread-b").context.model_name, "model-b");
});
```

- [ ] **Step 3: Implement only if test fails**

If the test fails, add per-thread local storage similar to the existing `THREAD_MODEL_KEY_PREFIX` pattern. If the test passes, do not modify implementation.

- [ ] **Step 4: Commit Task 5 only if needed**

If changes were needed:

```bash
git add frontend/src/core/settings/local.ts frontend/src/core/settings/local.test.ts
git commit -m "Preserve thread-scoped model settings without changing config ownership

Upstream added per-thread model persistence. NION only adopts this if the
current local-settings path lacks the same behavior, and keeps the storage
local to the thread UI rather than changing Config Center semantics.

Constraint: Do not move model selection truth out of NION's settings/runtime model
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Keep thread-scoped model persistence separate from provider registry ownership
Tested: frontend local settings unit test
Not-tested: Manual browser localStorage migration"
```

If no changes were needed, do not create an empty commit.

---

## Task 6: Conditional Windows Startup Fixes `092bf13f` / `82c3dbbc`

**Decision:** conditional partial sync.

**Files:**

- Inspect only:
  - `Makefile`
  - `scripts/serve.sh`
  - `scripts/start-daemon.sh`
  - `desktop/electron` package scripts if relevant

- [ ] **Step 1: Check whether NION has the same failure mode**

Run:

```bash
rg -n 'Git Bash|bash.exe|Windows|win32|serve.sh|start-daemon|pnpm|uv sync' Makefile scripts desktop/electron package.json
```

Expected:

- If no comparable script path exists, record as `明确不同步`.
- If comparable script path exists and current verification fails on Windows, open a separate implementation plan for Windows-specific fixes.

- [ ] **Step 2: Do not change scripts without a reproduced failure**

No commit is required in this task unless a specific current NION script failure is reproduced.

---

## Execution Order

1. Task 1: `46d0c329`
2. Task 2: `163121d3`
3. Task 3: `43ef3691`
4. Task 4: `6dbdd467`
5. Task 5: `0eb6550c`
6. Task 6: `092bf13f` / `82c3dbbc`

Do not reorder Task 4 ahead of Task 1 or Task 2. Upload fixes are smaller and have less architectural uncertainty.

---

## Plan Self-Review

Spec coverage:

- `46d0c329`: Task 1.
- `163121d3`: Task 2.
- `43ef3691`: Task 3.
- `6dbdd467`: Task 4.
- `0eb6550c`: Task 5.
- `092bf13f` / `82c3dbbc`: Task 6.
- Explicit no-merge/no-cherry-pick/no-config.yaml rule: File Structure and all task constraints.

Placeholder scan:

- No unresolved task slots remain. Any conditional branch says exactly when to implement and when to stop.

Anti-patch-stack check:

- This plan does not stack compatibility shells on top of old upstream structures.
- Each task is a local NION implementation or test of one upstream-derived rule.
- `config.yaml`, backend channel architecture, and upstream memory product surfaces stay out of scope.
