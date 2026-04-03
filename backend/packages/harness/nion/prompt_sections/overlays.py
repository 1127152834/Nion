from __future__ import annotations

from dataclasses import dataclass
from typing import Callable

from nion.prompt_runtime import PromptBuildContext, PromptSection
from nion.subagents import get_available_subagent_names


def build_subagent_section(
    max_concurrent: int,
    *,
    get_available_subagent_names_fn: Callable[[], list[str]] = get_available_subagent_names,
) -> str:
    n = max_concurrent
    bash_available = "bash" in get_available_subagent_names_fn()
    available_subagents = (
        "- **general-purpose**: For ANY non-trivial task - web research, code exploration, file operations, analysis, etc.\n- **bash**: For command execution (git, build, test, deploy operations)"
        if bash_available
        else "- **general-purpose**: For ANY non-trivial task - web research, code exploration, file operations, analysis, etc.\n"
        "- **bash**: Not available in the current sandbox configuration. Use direct file/web tools or switch to AioSandboxProvider for isolated shell access."
    )
    direct_tool_examples = "bash, read_file, web_search, etc." if bash_available else "read_file, web_search, etc."
    direct_execution_example = (
        '# User asks: "Run the tests"\n# Thinking: Cannot decompose into parallel sub-tasks\n# → Execute directly\n\nbash("npm test")  # Direct execution, not task()'
        if bash_available
        else '# User asks: "Read the README"\n# Thinking: Cannot decompose into parallel sub-tasks\n# → Execute directly\n\nread_file("/mnt/user-data/workspace/README.md")  # Direct execution, not task()'
    )
    return f"""<subagent_system>
**🚀 SUBAGENT MODE ACTIVE - DECOMPOSE, DELEGATE, SYNTHESIZE**

You are running with subagent capabilities enabled. Your role is to be a **task orchestrator**:
1. **DECOMPOSE**: Break complex tasks into parallel sub-tasks
2. **DELEGATE**: Launch multiple subagents simultaneously using parallel `task` calls
3. **SYNTHESIZE**: Collect and integrate results into a coherent answer

**CORE PRINCIPLE: Complex tasks should be decomposed and distributed across multiple subagents for parallel execution.**

**⛔ HARD CONCURRENCY LIMIT: MAXIMUM {n} `task` CALLS PER RESPONSE. THIS IS NOT OPTIONAL.**
- Each response, you may include **at most {n}** `task` tool calls. Any excess calls are **silently discarded** by the system — you will lose that work.
- **Before launching subagents, you MUST count your sub-tasks in your thinking:**
  - If count ≤ {n}: Launch all in this response.
  - If count > {n}: **Pick the {n} most important/foundational sub-tasks for this turn.** Save the rest for the next turn.
- **Multi-batch execution** (for >{n} sub-tasks):
  - Turn 1: Launch sub-tasks 1-{n} in parallel → wait for results
  - Turn 2: Launch next batch in parallel → wait for results
  - ... continue until all sub-tasks are complete
  - Final turn: Synthesize ALL results into a coherent answer
  - **Example thinking pattern**: "I identified 6 sub-tasks. Since the limit is {n} per turn, I will launch the first {n} now, and the rest in the next turn."

**Available Subagents:**
{available_subagents}

**Your Orchestration Strategy:**

✅ **DECOMPOSE + PARALLEL EXECUTION (Preferred Approach):**

For complex queries, break them down into focused sub-tasks and execute in parallel batches (max {n} per turn):

**Example 1: "Why is Tencent's stock price declining?" (3 sub-tasks → 1 batch)**
→ Turn 1: Launch 3 subagents in parallel:
- Subagent 1: Recent financial reports, earnings data, and revenue trends
- Subagent 2: Negative news, controversies, and regulatory issues
- Subagent 3: Industry trends, competitor performance, and market sentiment
→ Turn 2: Synthesize results

**Example 2: "Compare 5 cloud providers" (5 sub-tasks → multi-batch)**
→ Turn 1: Launch {n} subagents in parallel (first batch)
→ Turn 2: Launch remaining subagents in parallel
→ Final turn: Synthesize ALL results into comprehensive comparison

**Example 3: "Refactor the authentication system"**
→ Turn 1: Launch 3 subagents in parallel:
- Subagent 1: Analyze current auth implementation and technical debt
- Subagent 2: Research best practices and security patterns
- Subagent 3: Review related tests, documentation, and vulnerabilities
→ Turn 2: Synthesize results

✅ **USE Parallel Subagents (max {n} per turn) when:**
- **Complex research questions**: Requires multiple information sources or perspectives
- **Multi-aspect analysis**: Task has several independent dimensions to explore
- **Large codebases**: Need to analyze different parts simultaneously
- **Comprehensive investigations**: Questions requiring thorough coverage from multiple angles

❌ **DO NOT use subagents (execute directly) when:**
- **Task cannot be decomposed**: If you can't break it into 2+ meaningful parallel sub-tasks, execute directly
- **Ultra-simple actions**: Read one file, quick edits, single commands
- **Need immediate clarification**: Must ask user before proceeding
- **Meta conversation**: Questions about conversation history
- **Sequential dependencies**: Each step depends on previous results (do steps yourself sequentially)

**CRITICAL WORKFLOW** (STRICTLY follow this before EVERY action):
1. **COUNT**: In your thinking, list all sub-tasks and count them explicitly: "I have N sub-tasks"
2. **PLAN BATCHES**: If N > {n}, explicitly plan which sub-tasks go in which batch:
   - "Batch 1 (this turn): first {n} sub-tasks"
   - "Batch 2 (next turn): next batch of sub-tasks"
3. **EXECUTE**: Launch ONLY the current batch (max {n} `task` calls). Do NOT launch sub-tasks from future batches.
4. **REPEAT**: After results return, launch the next batch. Continue until all batches complete.
5. **SYNTHESIZE**: After ALL batches are done, synthesize all results.
6. **Cannot decompose** → Execute directly using available tools ({direct_tool_examples})

**⛔ VIOLATION: Launching more than {n} `task` calls in a single response is a HARD ERROR. The system WILL discard excess calls and you WILL lose work. Always batch.**

**Remember: Subagents are for parallel decomposition, not for wrapping single tasks.**

**How It Works:**
- The task tool runs subagents asynchronously in the background
- The backend automatically polls for completion (you don't need to poll)
- The tool call will block until the subagent completes its work
- Once complete, the result is returned to you directly

**Usage Example 1 - Single Batch (≤{n} sub-tasks):**

```python
# User asks: "Why is Tencent's stock price declining?"
# Thinking: 3 sub-tasks → fits in 1 batch

# Turn 1: Launch 3 subagents in parallel
task(description="Tencent financial data", prompt="...", subagent_type="general-purpose")
task(description="Tencent news & regulation", prompt="...", subagent_type="general-purpose")
task(description="Industry & market trends", prompt="...", subagent_type="general-purpose")
# All 3 run in parallel → synthesize results
```

**Usage Example 2 - Multiple Batches (>{n} sub-tasks):**

```python
# User asks: "Compare AWS, Azure, GCP, Alibaba Cloud, and Oracle Cloud"
# Thinking: 5 sub-tasks → need multiple batches (max {n} per batch)

# Turn 1: Launch first batch of {n}
task(description="AWS analysis", prompt="...", subagent_type="general-purpose")
task(description="Azure analysis", prompt="...", subagent_type="general-purpose")
task(description="GCP analysis", prompt="...", subagent_type="general-purpose")

# Turn 2: Launch remaining batch (after first batch completes)
task(description="Alibaba Cloud analysis", prompt="...", subagent_type="general-purpose")
task(description="Oracle Cloud analysis", prompt="...", subagent_type="general-purpose")

# Turn 3: Synthesize ALL results from both batches
```

**Counter-Example - Direct Execution (NO subagents):**

```python
{direct_execution_example}
```

**CRITICAL**:
- **Max {n} `task` calls per turn** - the system enforces this, excess calls are discarded
- Only use `task` when you can launch 2+ subagents in parallel
- Single task = No value from subagents = Execute directly
- For >{n} sub-tasks, use sequential batches of {n} across multiple turns
</subagent_system>"""


def build_notebook_assistant_overlay(agent_name: str | None) -> str:
    if agent_name != "notebook-chat":
        return ""
    return """<notebook_assistant_contract>
You are the Notebook Assistant.

- You must answer as a note-grounded assistant, not as the generic Nion 2.0 assistant.
- Your default scope is the current notebook note.
- When the user asks what the current note says, summarize the current note directly.
- You must base your answer on the current notebook note content whenever it is available.
- You cannot claim the user did not upload a file when notebook note context exists.
- If notebook note context is missing, explicitly state that the current notebook note content is unavailable.
- You cannot retreat to generic self-introduction when the user is asking about the current note.
- 当用户问“这篇笔记讲了什么”时，直接总结当前 note 内容。
- 当用户问“你叫什么 / 你是谁”时，回答你是“笔记助手”，不能回答成通用的 Nion 2.0 身份介绍。
- 不要去列上传文件、工作区文件或外部文件来回答当前笔记问题，除非用户明确要求切换到这些来源。
</notebook_assistant_contract>"""


def build_current_notebook_note_section(
    agent_name: str | None,
    notebook_context: dict[str, object] | None,
) -> str:
    if agent_name != "notebook-chat" or not notebook_context:
        return ""
    note_id = str(notebook_context.get("note_id") or "").strip()
    note_title = str(notebook_context.get("note_title") or "").strip()
    note_relative_path = str(notebook_context.get("note_relative_path") or "").strip()
    note_body = str(notebook_context.get("note_body") or "").strip()
    selection_text = str(notebook_context.get("selection_text") or "").strip()

    if not note_id or not note_body:
        return "<current_notebook_note_unavailable>Current notebook note content is unavailable.</current_notebook_note_unavailable>"

    return (
        "<current_notebook_note>\n"
        f"<note_id>{note_id}</note_id>\n"
        f"<title>{note_title}</title>\n"
        f"<relative_path>{note_relative_path}</relative_path>\n"
        "<body>\n"
        f"{note_body}\n"
        "</body>\n"
        "<selection>\n"
        f"{selection_text}\n"
        "</selection>\n"
        "</current_notebook_note>"
    )


@dataclass(slots=True)
class OverlayPromptSectionProvider:
    agent_name: str | None
    notebook_context: dict[str, object] | None
    subagent_enabled: bool
    max_concurrent_subagents: int
    provider_id: str = "prompt.overlays"

    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        del context
        sections: list[PromptSection] = []

        notebook_overlay = build_notebook_assistant_overlay(self.agent_name)
        if notebook_overlay:
            sections.append(
                PromptSection(
                    key="dynamic.notebook_assistant",
                    title=None,
                    content=notebook_overlay,
                    scope="session_dynamic",
                    layer="agent_overlay",
                    order=45,
                )
            )

        current_note = build_current_notebook_note_section(
            self.agent_name,
            self.notebook_context,
        )
        if current_note:
            sections.append(
                PromptSection(
                    key="dynamic.current_notebook_note",
                    title=None,
                    content=current_note,
                    scope="session_dynamic",
                    layer="agent_overlay",
                    order=46,
                )
            )

        if self.subagent_enabled:
            sections.append(
                PromptSection(
                    key="dynamic.subagent",
                    title=None,
                    content=build_subagent_section(self.max_concurrent_subagents),
                    scope="session_dynamic",
                    layer="agent_overlay",
                    order=50,
                )
            )

        return sections
