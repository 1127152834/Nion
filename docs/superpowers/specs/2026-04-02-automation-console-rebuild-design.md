# Automation Console Rebuild Design

## Status

- 状态：已通过用户逐段确认
- 适用范围：`/workspace/automation` 自动化工作台、主聊天输入框中的对象引用能力、automation run 到 thread preview 的关联透出
- 本文性质：产品与交互设计文档，不直接包含实现代码
- 覆盖关系：本文覆盖并替代“自动化模块继续走高级功能堆叠”的主设计方向；[2026-03-30-automation-advanced-features-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-30-automation-advanced-features-design.md) 可保留为历史参考，但不再作为当前主线

## One-Line Decision

自动化模块应从“按类型切 tab 的配置页”重构为“创建器优先的自动化控制台”，核心价值不是继续增加高级设置，而是把 `提醒`、`定时任务`、`对象引用`、`执行结果回看` 组织成真正可管理的工作流。

## Confirmed Facts

以下是本轮设计中已经确认的事实或现状：

1. 用户明确选择了控制台取向，但希望交互极简。
   - 不要继续堆“高级设置”“复杂规则”“正则表达式”之类的入口。
2. 提醒与定时任务的语义必须分开。
   - 提醒本质上是一段要提醒出来的话，不是一个 agent prompt。
   - 定时任务本质上是一个可定时触发的聊天任务，应沿用主聊天能力。
3. 当前调度逻辑整体可保留。
   - 现有定时配置已经足够全面，重点是交互样式与信息层级重做，而不是继续扩展规则。
4. 用户当前最需要的对象引用是 `@笔记`。
   - 未来可能扩展到 `@项目`、`@产物`，但本期只做 `@笔记`。
5. 定时任务结果不应只看日志。
   - 每个定时任务实际上对应一个独立聊天线程。
   - 用户已明确选择结果交互为：列表摘要 + 右侧线程预览，再决定是否进入完整线程。
6. 现有聊天输入框已经有 mention / shortcut 基础设施。
   - `@` 当前主要覆盖文件、目录、项目线程；
   - `/` 当前主要覆盖 skills。
7. 后端 automation 执行链已经生成独立线程 ID。
   - `AutomationExecutionOutput` 中已有 `isolated_thread_id`；
   - 但当前 `AutomationRun` 对前端暴露的数据里还没有这层 thread 关联。

## Problem Statement

当前自动化模块的问题不是“样式不够新”，而是产品模型有三处根本错位：

1. 用户看到的是字段，不是自动化资产。
   - 页面重心在填写表单；
   - 自动化列表和运行结果只是附属区；
   - 用户无法把自动化当成可长期管理、复用和验收的工作单元。
2. 提醒与定时任务被错误地共用成一个“prompt 配置器”。
   - 这让提醒显得过重；
   - 也让定时任务没有真正继承主聊天能力。
3. 结果面设计停留在“运行记录”层。
   - 用户真正关心的是“这次自动化做出了什么”；
   - 当前只给 run 状态和摘要，不足以支撑验收与复查。

## Product Principles

本次重构遵循以下产品原则：

1. 创建必须足够轻。
   - 打开页面后第一件事应该是写任务，而不是理解信息架构。
2. 管理必须稳定。
   - 自动化模块首先是资产管理台，其次才是表单。
3. 结果必须可回看。
   - 定时任务的结果要能顺着 run 回看到对应线程。
4. 自动化模块不应发明私有语法。
   - `@笔记` 必须成为主聊天与自动化共用的对象引用能力。
5. 不做补丁叠补丁。
   - 优先重组页面骨架与通用 contract；
   - 不继续在旧 tab 页面上加更多折叠区和例外逻辑。

## IA Decision

### Replace Current Tabs with a Single Console Surface

当前的 `overview / reminders / tasks / history` 四个 tab 不再作为自动化页的主结构。

自动化页改成单页工作台，按垂直信息层级组织：

1. 顶部：极简创建区
2. 中部：自动化资产列表
3. 底部：结果区

### Why This IA

这套 IA 与用户确认的目标一致：

- 满足 `B` 方向的“创建器优先”
- 仍然保留控制台骨架，不会退化回纯表单页
- 能自然容纳“提醒结果列表”和“定时任务线程预览”两种不同结果面

### Page Skeleton

#### 1. 顶部创建区

创建区是页面第一视觉中心，但必须保持克制：

- 一个轻量类型切换器：`提醒` / `定时任务`
- 一个主输入区
- 一个定时配置区
- 一个主提交按钮

不再出现以下元素：

- 独立的 overview 指标区抢占第一屏
- 大横向 tab
- “高级选项”折叠块
- `delivery_mode` / `skills` 裸字段输入

#### 2. 中部自动化列表

列表是自动化的主管理面，负责承接已有自动化资产：

- 默认展示全部自动化
- 轻量过滤：`全部 / 提醒 / 定时任务`
- 轻量状态过滤：`全部状态 / 正常 / 暂停 / 异常`

每条记录展示 5 个主信息：

- 标题摘要
- 类型
- 下一次执行
- 最近结果摘要
- 当前状态

#### 3. 底部结果区

结果区不是独立页面，也不是次级 tab，而是当前选中自动化的验收面。

- 选中提醒：展示提醒记录列表
- 选中定时任务：展示运行列表 + 线程预览

## Object Semantics

### Reminder

提醒必须从产品语义上脱离 `prompt` 心智。

#### User-Facing Semantics

- 主字段名称：`提醒内容`
- 输入格式：纯文本或 Markdown
- 不要求单独输入名称
- 不暴露 skills / delivery / 高级配置

#### Behavior

- 系统自动从首行或前一小段提炼标题摘要，用于列表展示
- 内容本身就是提醒结果
- 提醒不承担对象写入、任务执行、技能调用等职责

#### Transitional Implementation Note

为减少首轮改造成本，后端存储层可以暂时继续复用单字符串字段；但前端与文案必须明确按 `提醒内容` 呈现，不能再把提醒描述为 prompt。

### Scheduled Task

定时任务必须被定义为“主聊天输入能力的定时触发版”。

#### User-Facing Semantics

- 主字段名称：`任务内容`
- 本质：聊天任务输入
- 支持：
  - 普通文本
  - Markdown
  - 链接
  - `/skill`
  - `@笔记`

#### Behavior

- 同样不要求单独输入名称
- 系统自动从首句或首行提炼标题摘要
- 不再单独暴露“附加技能”“高级设置”等表单字段
- 如果任务中存在 `/skill` 或 `@笔记`，它们应作为结构化引用随任务保存

## Shared Mention Capability

### Decision

`@笔记` 不是自动化模块私有语法，而是 Nion 主聊天和自动化共用的对象引用层。

### v1 Scope

本期只支持一种对象：

- `notebook-directory`

用户输入时的可见形态仍然是：

- `@文章`
- `@会议纪要/周会`

### Product Rules

1. 定时任务输入框复用主聊天的 mention 体验。
2. `@` 候选项中应出现笔记目录。
3. 自动化页不重新发明一套目录选择器语法。
4. 后续如果接 `@项目`、`@产物`，沿用同一对象引用 contract。

### Runtime Contract Recommendation

当前聊天输入已有：

- `selectedContexts`
- `implicitMentions`
- mention 触发器和下拉候选

这套 contract 不足以长期承载业务对象，因此建议在当前基础上演进到通用 object mention：

```ts
type ObjectMention = {
  kind: "object";
  objectKind: "notebook-directory";
  value: string;
  mention: string;
  label: string;
  metadata?: Record<string, unknown>;
};
```

本期不需要一次性重做所有 mention 体系，但需要满足两个要求：

1. `@笔记` 在输入体验上可选、可见、可回显
2. 提交时保留结构化对象信息，而不是只保留裸字符串

### Strategic Rationale

这是自动化模块之外的通用基础设施，服务的是 Nion 作为通用个人办公 agent 的长期方向，而不是 code agent 专属需求。

## Schedule Configuration

### Decision

保留当前调度能力，不扩张规则面；只重做信息组织与视觉表达。

### Keep

- 单次
- 每天
- 工作日
- 每周
- 间隔
- 自定义调度

### Do Not Add in This Redesign

- 更复杂的高级调度 DSL
- 正则或复杂事件表达式
- 额外的高级调度折叠区

### UI Direction

定时配置区视觉上应是一块结构化配置面，而不是一组零散字段：

- 类型切换轻量化
- 日期 / 时间 / 周几 / 间隔在一块区域完成
- 支持自然语言式预览
- 不抢主输入框风头

## Results Surface

### Core Principle

提醒看“发生了什么”，定时任务看“做成了什么”。

### Reminder Result Model

选中提醒后，底部结果区只展示紧凑列表，不做右侧详情预览。

每条提醒记录展示：

- 触发时间
- 状态
- 提醒内容摘要
- 失败时的简要错误说明

不展示：

- run id 作为主标题
- 复杂详情页
- 线程预览

### Scheduled Task Result Model

选中定时任务后，底部结果区变为左右分栏：

- 左侧：最近运行列表
- 右侧：当前选中 run 的线程预览

#### Left Column: Run List

每条 run 展示：

- 执行时间
- 状态
- 结果摘要
- 是否产生产物

#### Right Column: Thread Preview

右侧只做预览，不做完整聊天页复刻。固定包含四块：

1. 运行摘要
2. 最近几条关键消息
3. 产物入口
4. `打开完整线程`

#### Interaction Rules

1. 用户点选某个定时任务时，默认选中其最近一次成功 run；若没有成功 run，则选中最近一次 run。
2. 用户在左侧切换 run，右侧线程预览同步切换。
3. 如果 run 仍在执行中，右侧展示进行中状态和最近摘要。
4. 如果 run 没有关联线程，右侧退化为摘要面，不显示空白骨架。

## Thread Association Requirement

### Confirmed Fact

automation executor 内部已经生成并使用 `isolated_thread_id`，但当前前端接口拿不到这个字段。

### Required Product Contract

`AutomationRun` 需要对外暴露并持久化：

```ts
isolated_thread_id?: string | null;
```

这是支撑“自动化页线程预览”的必要前提，不应继续只停留在内部执行输出。

### Reuse Strategy

线程预览优先复用现有 thread state 能力：

- 首选：使用现有线程状态读取能力拉取 preview
- 如性能不足，再补轻量 preview endpoint

本期不建议直接新造一个完整 automation-run-detail 页面。

## Visual Direction

### Tone

整体视觉方向定为：

- 编辑器式控制台
- 浅色纸面感
- 弱装饰
- 强层次

它不是：

- 经营 dashboard
- 设置中心
- 卡片宫格首页

### Visual Hierarchy

1. 第一视觉：主输入区
2. 第二视觉：自动化列表
3. 第三视觉：结果区
4. 指标与统计退后，不做页面第一屏主角

### Interaction Style

- 类型切换像 segmented control，不像大 tab
- 列表项标题优先，不让 badge 喧宾夺主
- 结果区强调“验收感”，而不是日志感
- `打开完整线程` 是明确动作，提示用户当前只是预览

### Explicit Anti-Goals for Visual Design

不采用以下方向：

- 大面积 dashboard metrics
- 卡片套卡片
- 大量 icon + 悬浮说明
- 工程字段直出
- 把 run id 当作主对象显示

## Module Boundaries

### In Scope

- 自动化页重构为单页控制台
- 创建器重做
- 提醒 / 定时任务的语义分离
- `@笔记` 作为共用对象引用能力接入
- run 与 isolated thread 的关联透出
- 定时任务线程预览

### Out of Scope

- 新的复杂调度系统
- 多对象引用一次性全量落地
- 自动化页内完整聊天回放
- marketplace / 模板中心
- 多通道高级投递产品化

## Rollout Priority

### P0

必须先做：

1. 自动化页 IA 从多 tab 改为单页工作台
2. 提醒输入从 `prompt` 心智改成 `提醒内容`
3. 定时任务输入定义为“受限版聊天输入”
4. mention object contract 首次落地，先支持 `@笔记`
5. `AutomationRun` 暴露 `isolated_thread_id`

### P1

紧随其后：

1. 自动标题摘要生成
2. 结果区线程预览
3. 列表过滤
4. 自动化文案与状态展示重写

### P2

当前不要做：

1. 更高级的调度规则扩张
2. 自动化 marketplace
3. 完整聊天页内嵌
4. `@项目` / `@产物` 一次性全部落地
5. 重经营化的 overview dashboard

## Strategic Fit with Nion

对 Nion 来说，这次最值得做的不是“把自动化页做得像另一个工作流 SaaS”，而是借这次重构补齐三块通用基础设施：

1. 对象引用层
2. 自动执行线程层
3. 结果回看层

这三块都服务通用办公 agent，不会把 Nion 带偏成纯 code agent。

## Implementation Notes

为了减少返工，建议实现时遵循以下边界：

1. 页面重组优先于样式微调。
2. 先统一输入模型，再做漂亮 UI。
3. 先打通 run-to-thread preview，再丰富结果视觉。
4. 优先复用现有聊天输入和线程状态能力，不在自动化模块内平行重做一套。

## Self-Review

### Placeholder Scan

本文无 `TODO`、`TBD` 或未定义占位。

### Internal Consistency

- 页面结构、对象语义、结果区设计、实施优先级前后一致。
- 提醒与定时任务的职责边界已明确区分。
- `@笔记` 被定义为共享能力，而不是自动化私有能力。

### Scope Check

本文聚焦于自动化模块重设计与其必要的共用 contract，不扩散到完整对象层二期能力。

### Ambiguity Check

已明确：

- 页面结构选择 `B` 方向
- 结果区选择“列表 + 右侧线程预览”
- 当前只做 `@笔记`
- 当前不扩张高级调度与高级投递

