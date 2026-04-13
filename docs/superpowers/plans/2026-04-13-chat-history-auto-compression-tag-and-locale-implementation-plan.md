# Chat History Auto-Compression Tag And Locale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让历史对话自动压缩在时间线默认只显示可展开的小 tag，并让新生成的压缩摘要严格跟随界面语言生成且在生成后保持原语言。

**Architecture:** 这轮实现分成五个收口点：先冻结前端内部摘要新旧合同测试，再引入前端 tag 展开交互与结构化摘要识别，然后把 `locale` 通过 thread submit `context` 进入运行时，接着用 locale-aware summarization middleware 包装 LangChain 的 `SummarizationMiddleware` 并把 `internal_summary` / `summary_locale` 写入摘要消息元数据，最后更新文档与回归验证。实现坚持“读旧写新”：旧 thread 保持兼容识别，新摘要统一走结构化元数据合同。

**Tech Stack:** TypeScript, React 19, Next.js App Router, node:test contract tests, Python 3.12, LangChain `SummarizationMiddleware`, pytest

---

## Scope Check

这份计划只覆盖“自动压缩摘要 tag 化 + 原地展开 + locale 驱动摘要生成 + 新旧合同兼容”这一条链路。

In scope:

- 前端 `system:internal-summary` 新合同识别
- 时间线 tag 展开/收起交互
- thread submit `context.locale` 透传
- 后端 locale-aware summarization prompt 与摘要元数据
- 前后端合同测试与文档更新

Out of scope:

- summarization 触发阈值调整
- 历史线程批量迁移
- 运行时翻译已有摘要
- 对话时间线的其他消息类型重构

---

## Read This First

- [2026-04-13-chat-history-auto-compression-tag-and-locale-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-chat-history-auto-compression-tag-and-locale-design.md)
- [message-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.tsx)
- [utils.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/utils.ts)
- [internal-summary.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/messages/internal-summary.test.ts)
- [chat-thread-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx)
- [hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/hooks.ts)
- [desktop-client.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/api/desktop-client.ts)
- [types.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/types.ts)
- [summarization_config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/summarization_config.py)
- [agent.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/agent.py)
- [client.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py)
- [summarization.md](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/docs/summarization.md)

---

## File Map

### Frontend summary contract and UI

- Modify: `frontend/src/core/messages/utils.ts`
- Modify: `frontend/src/core/messages/internal-summary.test.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list.contract.test.ts`
- Create: `frontend/src/components/workspace/messages/internal-summary-state.ts`
- Create: `frontend/src/components/workspace/messages/internal-summary-state.test.ts`

### Frontend locale propagation

- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Modify: `frontend/src/core/threads/desktop-client.test.ts`

### Backend locale-aware summarization

- Create: `backend/packages/harness/nion/agents/middlewares/locale_aware_summarization.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/config/summarization_config.py`
- Modify: `backend/packages/harness/nion/client.py`
- Create: `backend/tests/test_locale_aware_summarization.py`
- Modify: `backend/tests/test_lead_agent_summarization_defaults.py`
- Modify: `backend/tests/test_lead_agent_model_resolution.py`
- Modify: `backend/tests/test_client.py`
- Modify: `backend/tests/test_threads_router.py`

### Docs

- Modify: `backend/docs/summarization.md`

---

## Task 1: Freeze the new and legacy internal-summary message contracts

**Files:**
- Modify: `frontend/src/core/messages/internal-summary.test.ts`
- Create: `frontend/src/components/workspace/messages/internal-summary-state.test.ts`

- [ ] **Step 1: Extend the summary contract tests with structured metadata recognition**

```ts
void test("recognizes structured internal summary messages from additional_kwargs metadata", () => {
  const message = {
    type: "human",
    content: "压缩后的上下文正文",
    additional_kwargs: {
      internal_summary: true,
      summary_locale: "zh-CN",
      summary_format_version: 1,
    },
  } as const;

  assert.equal(isInternalSummaryMessage(message), true);
});
```

- [ ] **Step 2: Add a fallback test for metadata summary without locale**

```ts
void test("keeps metadata-tagged summaries internal even when summary_locale is missing", () => {
  const message = {
    type: "human",
    content: "Stored summary without locale metadata",
    additional_kwargs: {
      internal_summary: true,
    },
  } as const;

  assert.equal(isInternalSummaryMessage(message), true);
});
```

- [ ] **Step 3: Add a pure state test for expand/collapse behavior**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { toggleInternalSummaryOpen } from "./internal-summary-state.ts";

void test("toggleInternalSummaryOpen opens then closes the same summary id", () => {
  const opened = toggleInternalSummaryOpen(new Set<string>(), "summary-1");
  assert.deepEqual([...opened], ["summary-1"]);

  const closed = toggleInternalSummaryOpen(opened, "summary-1");
  assert.deepEqual([...closed], []);
});
```

- [ ] **Step 4: Run the new frontend tests and verify failure**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/core/messages/internal-summary.test.ts \
  src/components/workspace/messages/internal-summary-state.test.ts
```

Expected:

- FAIL because metadata recognition and the toggle helper do not exist yet

- [ ] **Step 5: Commit**

```bash
git add \
  frontend/src/core/messages/internal-summary.test.ts \
  frontend/src/components/workspace/messages/internal-summary-state.test.ts
git commit -m "test: freeze internal summary metadata and toggle contracts"
```

---

## Task 2: Implement structured summary detection and expandable tag UI

**Files:**
- Create: `frontend/src/components/workspace/messages/internal-summary-state.ts`
- Modify: `frontend/src/core/messages/utils.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.tsx`
- Modify: `frontend/src/components/workspace/messages/message-list.contract.test.ts`
- Modify: `frontend/src/core/messages/internal-summary.test.ts`
- Modify: `frontend/src/components/workspace/messages/internal-summary-state.test.ts`

- [ ] **Step 1: Implement the summary toggle helper**

```ts
export function toggleInternalSummaryOpen(
  current: ReadonlySet<string>,
  summaryId: string,
): Set<string> {
  const next = new Set(current);
  if (next.has(summaryId)) {
    next.delete(summaryId);
  } else {
    next.add(summaryId);
  }
  return next;
}
```

- [ ] **Step 2: Upgrade summary detection in `utils.ts` to prefer metadata**

```ts
function hasInternalSummaryMetadata(message: Message) {
  return message.additional_kwargs?.internal_summary === true;
}

export function isInternalSummaryMessage(message: Message) {
  if (message.type !== "human") {
    return false;
  }
  if (hasInternalSummaryMetadata(message)) {
    return true;
  }
  if (typeof message.content !== "string") {
    return false;
  }
  const normalized = message.content.trimStart();
  if (normalized.startsWith(INTERNAL_SUMMARY_PREFIX)) {
    return true;
  }
  return isStructuredInternalSummary(normalized);
}

export function extractInternalSummaryContent(message: Message) {
  if (!isInternalSummaryMessage(message)) {
    return "";
  }
  if (typeof message.content === "string") {
    return message.content.trim();
  }
  return "";
}
```

- [ ] **Step 3: Replace the static summary pill with an expandable summary item**

```tsx
const [openSummaryIds, setOpenSummaryIds] = useState<Set<string>>(new Set());

// inside group.type === "system:internal-summary"
const message = group.messages[0];
const summaryId = group.id ?? message?.id ?? "internal-summary";
const isOpen = openSummaryIds.has(summaryId);
const summaryContent = message ? extractInternalSummaryContent(message) : "";

return (
  <div key={summaryId} className="flex w-full justify-center py-1">
    <button
      type="button"
      className="text-muted-foreground bg-muted/60 inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] leading-none"
      onClick={() =>
        setOpenSummaryIds((current) =>
          toggleInternalSummaryOpen(current, summaryId),
        )
      }
    >
      {t.conversation.compressedSummary}
    </button>
    {isOpen && summaryContent ? (
      <div className="bg-muted/35 border-muted-foreground/10 mt-3 w-full max-w-(--container-width-sm) rounded-2xl border px-4 py-3 text-sm leading-6">
        <MarkdownContent
          content={summaryContent}
          isLoading={thread.isLoading}
          rehypePlugins={rehypePlugins}
        />
      </div>
    ) : null}
  </div>
);
```

- [ ] **Step 4: Update the message-list contract test to assert expand affordance exists**

```ts
void test("message list renders internal summaries as a compact toggle with expandable body", async () => {
  const source = await readFile(new URL("./message-list.tsx", import.meta.url), "utf8");

  assert.match(source, /group\.type === "system:internal-summary"/);
  assert.match(source, /toggleInternalSummaryOpen/);
  assert.match(source, /type="button"/);
  assert.match(source, /MarkdownContent/);
});
```

- [ ] **Step 5: Run frontend tests**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/core/messages/internal-summary.test.ts \
  src/components/workspace/messages/internal-summary-state.test.ts \
  src/components/workspace/messages/message-list.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/components/workspace/messages/internal-summary-state.ts \
  frontend/src/components/workspace/messages/internal-summary-state.test.ts \
  frontend/src/core/messages/utils.ts \
  frontend/src/core/messages/internal-summary.test.ts \
  frontend/src/components/workspace/messages/message-list.tsx \
  frontend/src/components/workspace/messages/message-list.contract.test.ts
git commit -m "feat: add expandable internal summary tag rendering"
```

---

## Task 3: Pass UI locale through thread submit context

**Files:**
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `frontend/src/core/threads/hooks.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Modify: `frontend/src/core/threads/desktop-client.test.ts`

- [ ] **Step 1: Add `locale` to the thread context type**

```ts
export interface AgentThreadContext extends Record<string, unknown> {
  thread_id: string;
  locale?: "zh-CN" | "en-US";
  model_name: string | undefined;
  thinking_enabled: boolean;
  is_plan_mode: boolean;
  subagent_enabled: boolean;
  reasoning_effort?: "minimal" | "low" | "medium" | "high";
  agent_name?: string;
  execution_mode?: "sandbox" | "host";
  host_workdir?: string;
  requested_skills?: string[];
  selected_contexts?: Array<{ value: string; kind: "file" | "directory" }>;
  selected_mcp_tools?: string[];
  selected_cli_tools?: string[];
}
```

- [ ] **Step 2: Include `locale` in `chat-thread-page.tsx` submit context**

```tsx
const { t, locale } = useI18n();

context: {
  ...settings.context,
  ...threadRuntimeContext,
  locale,
  requested_skills: shortcutSelections?.skills ?? [],
  selected_contexts: shortcutSelections?.contexts ?? [],
  selected_mcp_tools: shortcutSelections?.mcpTools ?? [],
  selected_cli_tools: shortcutSelections?.cliTools ?? [],
  implicit_mentions: implicitMentions,
  thinking_enabled: currentMode !== "flash",
  is_plan_mode: currentMode === "pro" || currentMode === "ultra",
  subagent_enabled: currentMode === "ultra",
  reasoning_effort:
    settings.context.reasoning_effort ??
    (currentMode === "ultra"
      ? "high"
      : currentMode === "pro"
        ? "medium"
        : currentMode === "thinking"
          ? "low"
          : undefined),
  thread_id: threadId,
}
```

- [ ] **Step 3: Include `locale` in the shared submit path in `threads/hooks.ts`**

```ts
await thread.submit(
  payload,
  {
    threadId,
    streamSubgraphs: true,
    streamResumable: true,
    config: { recursion_limit: 1000 },
    context: {
      ...extraContext,
      ...context,
      locale: context.locale,
      requested_skills: shortcutSelections?.skills ?? [],
      selected_contexts: shortcutSelections?.contexts ?? [],
      selected_mcp_tools: shortcutSelections?.mcpTools ?? [],
      selected_cli_tools: shortcutSelections?.cliTools ?? [],
      implicit_mentions: implicitMentions ?? [],
      thinking_enabled: context.mode !== "flash",
      is_plan_mode: context.mode === "pro" || context.mode === "ultra",
      subagent_enabled: context.mode === "ultra",
      reasoning_effort:
        context.reasoning_effort ??
        (context.mode === "ultra"
          ? "high"
          : context.mode === "pro"
            ? "medium"
            : context.mode === "thinking"
              ? "low"
              : undefined),
      thread_id: threadId,
    },
  },
);
```

- [ ] **Step 4: Lock the desktop client request body in a test**

```ts
void test("desktop thread client forwards locale in stream context", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";

  globalThis.fetch = async (_input, init) => {
    requestBody = String(init?.body ?? "");
    return new Response("event: created\ndata: {\"thread_id\":\"t-1\"}\n\n", {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  };

  const client = createDesktopThreadClient({
    getBaseURL: () => "http://127.0.0.1:43115/api/threads",
  });

  await client.streamRun(
    "t-1",
    { messages: [] },
    { threadId: "t-1", context: { locale: "zh-CN" }, config: {} },
  );

  assert.match(requestBody, /"locale":"zh-CN"/);
  globalThis.fetch = originalFetch;
});
```

- [ ] **Step 5: Run frontend tests**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/core/threads/desktop-client.test.ts \
  src/core/messages/internal-summary.test.ts \
  src/components/workspace/messages/message-list.contract.test.ts
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  frontend/src/core/threads/types.ts \
  frontend/src/app/workspace/chats/chat-thread-page.tsx \
  frontend/src/core/threads/hooks.ts \
  frontend/src/core/api/desktop-client.ts \
  frontend/src/core/threads/desktop-client.test.ts
git commit -m "feat: pass locale through thread submit context"
```

---

## Task 4: Add locale-aware summarization middleware and summary metadata

**Files:**
- Create: `backend/packages/harness/nion/agents/middlewares/locale_aware_summarization.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/config/summarization_config.py`
- Modify: `backend/packages/harness/nion/client.py`
- Create: `backend/tests/test_locale_aware_summarization.py`
- Modify: `backend/tests/test_lead_agent_summarization_defaults.py`
- Modify: `backend/tests/test_lead_agent_model_resolution.py`
- Modify: `backend/tests/test_client.py`

- [ ] **Step 1: Write failing tests for locale-specific prompt generation and metadata output**

```python
def test_build_summary_prompt_for_locale_uses_chinese_sections():
    from nion.agents.middlewares.locale_aware_summarization import build_summary_prompt_for_locale

    prompt = build_summary_prompt_for_locale("zh-CN")

    assert "只返回简洁 Markdown" in prompt
    assert "目标" in prompt
    assert "已确认决策" in prompt


def test_locale_aware_middleware_builds_metadata_tagged_summary_message():
    from nion.agents.middlewares.locale_aware_summarization import LocaleAwareSummarizationMiddleware

    middleware = LocaleAwareSummarizationMiddleware(
        model="dummy",
        keep=("messages", 20),
        summary_prompt="ignored",
    )

    result = middleware._build_new_messages_for_locale("压缩后的正文", "zh-CN")

    assert result[0].content == "压缩后的正文"
    assert result[0].additional_kwargs["internal_summary"] is True
    assert result[0].additional_kwargs["summary_locale"] == "zh-CN"
```

- [ ] **Step 2: Implement the locale-aware prompt builder and summary message builder**

```python
ZH_SUMMARY_PROMPT = """<role>
对话压缩助手
</role>

<primary_objective>
压缩较早的对话历史，同时保留用户决策、稳定偏好、约束、已完成工作和待决问题。
</primary_objective>

<output_format>
只返回简洁 Markdown，按相关性使用这些章节：
- 目标
- 已确认决策
- 约束
- 已完成工作
- 待解决问题
</output_format>

<messages>
Messages to summarize:
{messages}
</messages>"""

def build_summary_prompt_for_locale(locale: str | None) -> str:
    if locale == "zh-CN":
        return ZH_SUMMARY_PROMPT
    return DEFAULT_SUMMARY_PROMPT

class LocaleAwareSummarizationMiddleware(SummarizationMiddleware):
    def _create_summary_with_prompt(
        self,
        messages_to_summarize: list[AnyMessage],
        summary_prompt: str,
    ) -> str:
        trimmed_messages = self._trim_messages_for_summary(messages_to_summarize)
        formatted_messages = get_buffer_string(trimmed_messages)
        response = self.model.invoke(summary_prompt.format(messages=formatted_messages))
        return response.text.strip()

    async def _acreate_summary_with_prompt(
        self,
        messages_to_summarize: list[AnyMessage],
        summary_prompt: str,
    ) -> str:
        trimmed_messages = self._trim_messages_for_summary(messages_to_summarize)
        formatted_messages = get_buffer_string(trimmed_messages)
        response = await self.model.ainvoke(summary_prompt.format(messages=formatted_messages))
        return response.text.strip()

    def _build_new_messages_for_locale(self, summary: str, locale: str | None) -> list[HumanMessage]:
        return [
            HumanMessage(
                content=summary,
                additional_kwargs={
                    "internal_summary": True,
                    "summary_locale": locale or "en-US",
                    "summary_format_version": 1,
                },
            )
        ]
```

- [ ] **Step 3: Override `before_model` / `abefore_model` to read `runtime.context["locale"]` and use locale-aware prompt/message building**

```python
def before_model(self, state: AgentState, runtime: Runtime) -> dict[str, Any] | None:
    messages = state["messages"]
    self._ensure_message_ids(messages)
    total_tokens = self.token_counter(messages)
    if not self._should_summarize(messages, total_tokens):
        return None

    cutoff_index = self._determine_cutoff_index(messages)
    if cutoff_index <= 0:
        return None

    to_summarize, preserved = self._partition_messages(messages, cutoff_index)
    locale = ((runtime.context or {}).get("locale") if runtime else None)
    prompt = build_summary_prompt_for_locale(locale if isinstance(locale, str) else None)
    summary = self._create_summary_with_prompt(to_summarize, prompt)
    new_messages = self._build_new_messages_for_locale(summary, locale if isinstance(locale, str) else None)
    return {"messages": [RemoveMessage(id=REMOVE_ALL_MESSAGES), *new_messages, *preserved]}
```

- [ ] **Step 4: Wire the middleware into `lead_agent/agent.py`**

```python
from nion.agents.middlewares.locale_aware_summarization import (
    LocaleAwareSummarizationMiddleware,
)

def _create_summarization_middleware() -> SummarizationMiddleware | None:
    config = get_summarization_config()
    if not config.enabled:
        return None
    # keep, trigger, model resolution unchanged
    kwargs["summary_prompt"] = config.summary_prompt or DEFAULT_SUMMARY_PROMPT
    return LocaleAwareSummarizationMiddleware(**kwargs)
```

- [ ] **Step 5: Pass locale through `NionClient.stream()` runtime context and preserve summary additional kwargs in serialized client events**

```python
context = {"thread_id": thread_id}
effective_agent_name = configurable.get("agent_name") or self._agent_name
if effective_agent_name:
    context["agent_name"] = effective_agent_name
if "locale" in kwargs and isinstance(kwargs.get("locale"), str):
    context["locale"] = kwargs["locale"]
if "execution_mode" in kwargs:
    context["execution_mode"] = kwargs.get("execution_mode")
if "host_workdir" in kwargs:
    context["host_workdir"] = kwargs.get("host_workdir")
```

```python
if isinstance(msg, HumanMessage):
    payload = {"type": "human", "content": msg.content, "id": getattr(msg, "id", None)}
    additional_kwargs = getattr(msg, "additional_kwargs", None)
    if additional_kwargs:
        payload["additional_kwargs"] = additional_kwargs
    return payload
```

```python
def test_stream_emits_internal_summary_human_message_with_additional_kwargs(client):
    summary_message = HumanMessage(
        content="压缩后的正文",
        id="summary-1",
        additional_kwargs={
            "internal_summary": True,
            "summary_locale": "zh-CN",
            "summary_format_version": 1,
        },
    )
    mock_agent = _make_agent_mock(
        [
            {"messages": [HumanMessage(content="hi", id="human-1")]},
            {"messages": [HumanMessage(content="hi", id="human-1"), summary_message]},
        ]
    )

    with patch.object(client, "_ensure_agent") as mock_ensure_agent:
        client._agent = mock_agent
        events = list(client.stream("hi", thread_id="thread-summary"))

    human_events = [
        event
        for event in events
        if event.type == "values"
        and any(
            message.get("type") == "human"
            and message.get("additional_kwargs", {}).get("internal_summary") is True
            for message in event.data.get("messages", [])
        )
    ]

    assert human_events
    summary_projection = next(
        message
        for message in human_events[-1].data["messages"]
        if message.get("id") == "summary-1"
    )
    assert summary_projection["additional_kwargs"]["summary_locale"] == "zh-CN"
    assert summary_projection["content"] == "压缩后的正文"
    mock_ensure_agent.assert_called_once()
```

```python
def test_thread_service_stream_passes_locale_into_client_context():
    client = MagicMock()
    client.stream.return_value = iter(
        [SimpleNamespace(type="values", data={"title": "T", "messages": [], "artifacts": []})]
    )
    repository = MagicMock()
    repository.get_thread.return_value = None
    repository.upsert_thread.return_value = SimpleNamespace(values=SimpleNamespace(model_dump=lambda: {}))
    service = ThreadService(repository=repository, client=client)

    request = ThreadStreamRequest(
        messages=[{"type": "human", "content": [{"type": "text", "text": "hi"}]}],
        context={"locale": "zh-CN"},
        config={},
    )

    list(service.stream("thread-summary", request))

    assert client.stream.call_args.kwargs["thread_id"] == "thread-summary"
    assert client.stream.call_args.kwargs["locale"] == "zh-CN"
    assert client.stream.call_args.kwargs["human_message_payload"]["content"][0]["text"] == "hi"
```

```python
def test_stream_context_propagation_includes_locale(client):
    agent = _make_agent_mock([{"messages": [AIMessage(content="ok", id="ai-1")]}])

    with (
        patch.object(client, "_ensure_agent"),
        patch.object(client, "_agent", agent),
    ):
        list(client.stream("hi", thread_id="t1", locale="zh-CN"))

    call_kwargs = agent.stream.call_args.kwargs
    assert call_kwargs["context"]["thread_id"] == "t1"
    assert call_kwargs["context"]["locale"] == "zh-CN"
```

- [ ] **Step 6: Run backend tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_locale_aware_summarization.py \
  backend/tests/test_lead_agent_summarization_defaults.py \
  backend/tests/test_lead_agent_model_resolution.py \
  backend/tests/test_client.py \
  backend/tests/test_threads_router.py -q
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add \
  backend/packages/harness/nion/agents/middlewares/locale_aware_summarization.py \
  backend/packages/harness/nion/agents/lead_agent/agent.py \
  backend/packages/harness/nion/config/summarization_config.py \
  backend/packages/harness/nion/client.py \
  backend/tests/test_locale_aware_summarization.py \
  backend/tests/test_lead_agent_summarization_defaults.py \
  backend/tests/test_lead_agent_model_resolution.py \
  backend/tests/test_client.py \
  backend/tests/test_threads_router.py
git commit -m "feat: generate locale-aware internal summary messages"
```

---

## Task 5: Update docs and run final verification

**Files:**
- Modify: `backend/docs/summarization.md`
- Modify: `frontend/src/core/messages/internal-summary.test.ts`
- Modify: `frontend/src/components/workspace/messages/message-list.contract.test.ts`
- Modify: `frontend/src/core/threads/desktop-client.test.ts`
- Modify: `backend/tests/test_locale_aware_summarization.py`

- [ ] **Step 1: Update the summarization docs to describe the new message format**

```md
### Summary message format

New summaries are injected as `HumanMessage` records whose `content` is the summary body itself and whose `additional_kwargs` contain:

- `internal_summary: true`
- `summary_locale: "zh-CN" | "en-US"`
- `summary_format_version: 1`

Legacy summaries using `Here is a summary of the conversation to date:` are still read for compatibility but are no longer emitted for new turns.
```

- [ ] **Step 2: Run the focused frontend verification suite**

Run:

```bash
pnpm --dir frontend test:contracts -- \
  src/core/messages/internal-summary.test.ts \
  src/components/workspace/messages/internal-summary-state.test.ts \
  src/components/workspace/messages/message-list.contract.test.ts \
  src/core/threads/desktop-client.test.ts
```

Expected:

- PASS

- [ ] **Step 3: Run the focused backend verification suite**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_locale_aware_summarization.py \
  backend/tests/test_lead_agent_summarization_defaults.py \
  backend/tests/test_lead_agent_model_resolution.py \
  backend/tests/test_client.py \
  backend/tests/test_threads_router.py -q
```

Expected:

- PASS

- [ ] **Step 4: Run lint/typecheck-level verification on touched frontend files**

Run:

```bash
pnpm --dir frontend typecheck
pnpm --dir frontend lint --file src/components/workspace/messages/message-list.tsx --file src/core/messages/utils.ts --file src/core/api/desktop-client.ts --file src/core/threads/hooks.ts --file src/app/workspace/chats/chat-thread-page.tsx
```

Expected:

- `typecheck` exits 0
- lint exits 0

- [ ] **Step 5: Commit**

```bash
git add \
  backend/docs/summarization.md \
  frontend/src/core/messages/internal-summary.test.ts \
  frontend/src/components/workspace/messages/internal-summary-state.test.ts \
  frontend/src/components/workspace/messages/message-list.contract.test.ts \
  frontend/src/core/threads/desktop-client.test.ts \
  backend/tests/test_locale_aware_summarization.py \
  backend/tests/test_lead_agent_summarization_defaults.py \
  backend/tests/test_lead_agent_model_resolution.py \
  backend/tests/test_client.py \
  backend/tests/test_threads_router.py
git commit -m "docs: record locale-aware internal summary contract"
```

---

## Spec Coverage Check

- 默认时间线只显示小 tag：Task 1, Task 2
- tag 可展开/收起：Task 1, Task 2
- 新摘要优先读结构化元数据，旧摘要继续兼容：Task 1, Task 2
- `locale` 进入 thread submit `context`：Task 3
- 摘要语言跟随 UI locale 生成：Task 4
- 摘要正文与 `summary_locale` 一起持久化到消息元数据：Task 4
- 历史摘要不动态翻译：Task 2, Task 4
- 文档与回归验证：Task 5

无 spec gap。

---

## Placeholder Scan

已检查本计划，未保留 `TBD` / `TODO` / “后续补上” 类占位语。  
代码步骤均给出明确文件、代码骨架、命令与预期结果。

---

## Type Consistency Check

- 前端 context 字段统一使用 `locale`
- 摘要元数据统一使用 `internal_summary`、`summary_locale`、`summary_format_version`
- 前端消息分组统一继续使用 `system:internal-summary`
- 新 helper 命名统一为 `toggleInternalSummaryOpen`

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-chat-history-auto-compression-tag-and-locale-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
