# Chat-First Task System Strategy

## Summary

Nion 应该引入任务系统，但不能把自己改造成任务管理器。正确方向不是复制 OpenCow 的 task-control-plane-first 模型，而是在保持 chat 作为主入口与主心智的前提下，增加一个位于对话之上的 `Task` 协调层。这个 Task 层负责承载长周期目标、状态、责任边界、跨多次执行的连续性，以及与 automation / run / incident / event 的关系。

## RALPLAN-DR

### Principles

- Nion 的主入口与核心心智是对话助手，不是任务管理器。
- Task 是覆盖在对话之上的结构化协调层，不是一次 run 或一次 automation。
- Chat 仍是主工作流，用户应可在不离开对话主流程的情况下创建、查看、推进任务。
- Automation 独立存在，只负责计划并触发一次执行，不承载任务本体语义。
- Task 必须成为 thread、run、incident、automation 的一等关联键。
- 不复制 OpenCow 的 control-plane-first 模型。

### Decision Drivers

- Nion 已以 thread/chat 为核心，反转成 task-first 壳层会破坏现有心智。
- 长周期 related work 需要稳定对象承载目标、状态、上下文与执行历史。
- Automation、incident、delegated execution 都已经具备独立语义面，继续让 thread 单独承载长期协调会越来越脆。
- v1 必须边界清晰、可验证、可防漂移。

### Viable Options

#### Option A: Chat-First Task Layer

- 描述：Task 贴在主 thread 之上，task center 只做聚合与跳转。
- 优点：最贴合 Nion 现状；可复用线程、自动化、诊断、delegated runtime 资产；不破坏主聊天功能。
- 缺点：首版批量管理能力有限；需要刻意约束边界，避免做成半套 PM 工具。

#### Option B: Task-Center-First

- 描述：任务中心成为默认首页，chat 退居任务详情。
- 优点：管理视角更强，长期工作更清晰。
- 缺点：违背当前产品核心心智；会把 Nion 拖向 OpenCow 风格控制平面。

#### Option C: Only Extend Automation / Runs

- 描述：不新增 durable task object，继续靠 automation、subtask、incident、thread 承载长期工作。
- 优点：实现快。
- 缺点：缺少长期协调对象；跨 thread / run / incident 的归因和恢复会继续碎片化。

## Recommendation

选择 **Option A: Chat-First Task Layer**。

关键定义：

- `Task`：长期协调对象，承载目标、状态、owner、next step、共享上下文、关联执行历史。
- `Thread`：主对话容器，负责叙事、推理、协作与用户交互。
- `Run / Subtask / Incident / Event`：执行证据层，附着在 Task 下，不是 Task 本体。
- `Automation`：调度器，附着在 Task 上，但不重定义 Task 语义。

产品形态：

- 默认入口仍是 Chat。
- 一级导航采用 `Chat / Tasks / Automation`。
- `Tasks` 页只是辅助聚合面，不是主页替代。
- `Automation` 继续是独立模块，不与 Task 合并。

## What to Borrow from OpenCow

只借结构，不借产品主隐喻。

值得借：

- durable task object 思维
- task 与 run/history 的稳定关系
- task 级事件聚合面
- 显式 context injection / capability planning 思维
- automation pipeline 作为任务附属能力

不该照搬：

- issue/control-plane-first 产品形态
- 把多任务并行当成产品主叙事
- 用任务页替代主聊天流

## v1 / v2 / v3

### v1

- 默认入口仍是 Chat
- 一级导航：`Chat / Tasks / Automation`
- 支持在 chat 中创建 Task、查看当前 Task、更新 Task 状态
- 一个 Task 关联一个 `primary_thread`
- Task center 展示：
  - task 元数据
  - primary thread 入口
  - recent runs / incidents / events 聚合
  - attached automation summary
- 不做 kanban、项目视图、复杂依赖、跨任务批量编排

### v2

- 任务简报与共享上下文摘要
- 跨执行历史
- 从 incident 反查/关联任务
- 从 task center 快速回到 primary thread
- 轻量子任务树

### v3

- 任务模板
- 轻量依赖关系
- 任务健康度与建议
- 任务网络视图
- 仍保持 chat-first，automation 仍独立

## Non-goals

- 不把 v1 做成首页替代或 task-first shell
- 不做 OpenCow 式 control-plane-first 重构
- 不做 kanban、资源管理、OKR/issue 平台、重型 PM suite
- 不让 automation 页面吞并 task 语义
- 不让 run / incident / event 直接变成任务对象

## v1 Rule Table

| 规则项 | v1 规则 |
|---|---|
| 可变更 Task 状态的动作 | 仅以下动作可变更 Task 状态：1. 用户在 Tasks 内手动改状态；2. 用户在 Chat 中基于当前任务明确改状态；3. 创建 Task 时显式设定初始状态。 |
| 不可变更 Task 状态的对象 | 以下对象在 v1 永不得直接变更 Task 状态：Automation、Automation Run、Thread、Message、Incident，以及任何自动化完成事件。 |
| Chat 创建 Task | 从 Chat 创建 Task 时，当前 thread 默认写入为该 Task 的 `primary_thread`。 |
| Automation 完成 | Automation 完成不自动完成 Task；只可追加 execution evidence，并可提出状态变更建议，是否采纳由用户决定。 |

## ADR

- **Decision:** 采用 `chat-first, task-above-conversation` 的任务系统。
- **Drivers:** 主入口必须仍是对话；任务需承载长周期协调；automation 必须独立；v1 需可验证且防漂移。
- **Alternatives considered:** task-center-first；仅扩展 automation/run。
- **Why chosen:** 以最小偏离现有产品心智的方式，补上长期协调对象。
- **Consequences:** 需要维护 Task 作为 thread/run/incident/automation 的统一 join key；v1 必须严格限制 UI 边界。
- **Follow-ups:** 定义 task schema、primary thread 约束、execution record 聚合模型、chat 内任务交互设计。

## Acceptance Criteria

### User Scenarios

1. 用户可在主 chat 中创建、查看、推进任务，而无需离开主对话流。
2. 用户可在 task center 查看该任务下的 run / incident / event 聚合，并一键返回 `primary_thread`。
3. 用户可给任务附着 automation；automation 到时仅触发一次计划执行，并把结果记录回该任务。

### Rule Checks

1. v1 中仅允许用户显式动作变更 Task 状态，系统对象不得隐式改状态。
2. 任一 Automation / Run / Thread / Message / Incident 事件发生后，Task 状态保持不变，除非用户明确执行改状态动作。
3. 从 Chat 创建 Task 时，系统默认将当前 thread 关联为 `primary_thread`，且无需额外配置。
4. Automation 完成后，Task 下新增可追溯 execution evidence 记录。
5. Automation 完成后，系统最多产生状态建议，不得自动将 Task 标记为完成。
6. Tasks 页仅做最小聚合，不承载复杂调度逻辑，不替代主页。

## Reality Check

这个方向也符合现实产品分层：

- OpenAI 的 ChatGPT Tasks 更接近“计划执行/提醒”，本质是 scheduled prompts，不是完整长期任务系统。[OpenAI Help](https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt)
- Asana Rules 是自动化层，建立在 task/project 对象之上，说明 automation 应是任务之上的 trigger/action 层。[Asana Rules](https://asana.com/features/workflow-automation/rules)
- Todoist 自己也把 recurring dates 当成 task 的时间行为，而不是独立取代 task 本体；甚至建议用 start-task 子任务和 recurring date 来组织长期开始/推进节奏。[Todoist Help](https://www.todoist.com/help/articles/does-todoist-support-start-dates-qhqlgZhk)
- Notion 的长期优势在于让 notes/docs 与 projects/tasks 并排共存，这与 Nion“个人助手 + Notebook + Task 模块” 的方向一致。[Notion Guide](https://www.notion.so/notion/Getting-Started-with-Notion-f0e1a6d326d84d6984d948da96965045)
