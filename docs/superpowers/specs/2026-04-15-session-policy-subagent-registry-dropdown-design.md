# 会话策略子代理下拉框与代理边界澄清设计

日期：2026-04-15  
状态：Draft for review  
范围：`Settings > 会话策略 > 子代理`、Config Center 只读选项接口、前端子代理超时覆盖表单

---

## 1. 背景与问题

当前 `Settings > 会话策略 > 子代理` 的“单代理超时（秒）”使用手动输入代理名。

这个设计有两个问题：

1. 它允许输入任何字符串，和真实运行时可见的子代理注册表脱节。
2. 产品上容易和系统里的另一类“Agent 模块代理 / 自定义智能体”混淆，导致用户误以为这里可以配置所有 `@agent` 或 Agent 页面里的智能体。

这两个问题叠加后，会让“子代理超时覆盖”失去明确语义：

- 用户不知道应该填内建 subagent，还是填自定义 agent
- 前端也无法保证配置项一定能命中后端真实可执行的子代理类型

所以这里不能继续保留自由文本输入。

---

## 2. 两类代理的边界

本设计明确区分两条不同执行链路。

### 2.1 `subagent registry`

这是主助理内部用于任务拆分和并行调度的 worker/runtime profile。

特征：

- 由后端 `nion.subagents.registry` 提供
- 通过 `task` / subagent executor 执行
- 关注的是执行属性：超时、工具边界、是否可见
- 当前真实可见项来自内建 registry，例如 `general-purpose`，以及条件可见的 `bash`

它的产品语义是：

> 主助理内部可以委派给哪些“内建子代理类型”。

### 2.2 `agent 模块代理`

这是用户可以显式点名、单独对话或通过 `@agent` 委派的 agent catalog。

特征：

- 由 `agents_config` 解析内建 agent + custom agent catalog
- 通过 delegated custom-agent / agent thread 执行
- 关注的是身份属性：名字、SOUL、tool_groups、model、delegation policy

它的产品语义是：

> 用户可显式调用的具备人格/能力设定的智能体入口。

### 2.3 结论

`Settings > 会话策略 > 子代理` 只服务于 `subagent registry`，不服务于 `agent 模块代理`。

这里配置的是：

> 内建子代理类型的超时覆盖。

不是：

> 所有 Agent / 自定义智能体 / `@agent` 目标的统一超时设置台。

---

## 3. 核心决策

### 3.1 名称输入改为下拉框

`SubagentsSection` 中每条“单代理超时”记录的代理名字段，不再使用自由输入框，而改为 `Select`。

### 3.2 下拉数据源只来自后端可见 `subagent registry`

前端不得写死 `general-purpose` / `bash`，也不得从 `agent catalog` 复用数据。

唯一合法数据源是后端当前可见的 subagent registry。

这样可以保证：

- 前端展示与运行时可执行项一致
- `bash` 这种受宿主环境 gate 影响的选项只在后端允许时出现
- 新增或隐藏 subagent 时，前端无需同步硬编码

### 3.3 不混入 `agent 模块代理`

`agent catalog` 中的内建 agent、自定义 agent、Notebook assistant agent、`@agent` 可调用目标，都不进入这个下拉框。

这次设计故意不做“统一可委派代理列表”。

如果未来需要统一“可委派目标目录”，应该另起设计，不能借 `subagents` 设置项偷渡。

### 3.4 已保存但当前不可见的旧值必须保留

历史配置可能已经写入了：

- 手动输入的未知字符串
- 当前版本已不存在的 subagent 名称
- 当前环境下不可见的项（例如 host bash 被禁用后原本保存的 `bash`）

这些值在设置页加载时不能被静默丢弃。

前端必须：

- 保留显示这条记录
- 在下拉框中以“当前不可用” sentinel option 渲染
- 允许用户删除或切换到当前可见 registry 项
- 不允许继续新增任意文本值

---

## 4. 后端设计

### 4.1 新增只读接口

在 gateway 增加新的 Config Center 辅助只读接口：

- `GET /api/config/session-policy/options`

它返回会话策略页需要的动态选项数据，目前只包含 subagent registry。

建议响应结构：

```json
{
  "subagents": [
    {
      "name": "general-purpose",
      "description": "For any non-trivial delegated task",
      "timeout_seconds": 900
    }
  ]
}
```

字段要求：

- `name`：稳定标识，用于配置键
- `description`：用户可读说明，供前端 tooltip / secondary copy 使用
- `timeout_seconds`：该子代理当前默认超时，供前端后续增强展示

### 4.2 数据源

接口必须直接基于：

- `nion.subagents.registry.list_subagents()`

而不是：

- `BUILTIN_SUBAGENTS` 原始字典
- `get_available_subagent_names()` 的纯字符串包装
- `agents_config` / `list_agent_catalog()`

原因：

- `list_subagents()` 已经包含了可见性过滤（如 bash gate）
- `list_subagents()` 已经应用了 Config Center 超时覆盖
- 它才是最接近运行时真实可执行项的 registry 视图

### 4.3 非目标

这个接口不负责返回：

- custom agents
- builtin agents
- ACP/A2A agent integrations
- Notebook assistant

否则接口语义会立刻变脏。

---

## 5. 前端设计

### 5.1 新增 Config Center 选项读取

在 `frontend/src/core/config-center` 增加对应的：

- `loadSessionPolicyOptions()`
- `useSessionPolicyOptions()`

只给 `SubagentsSection` 使用即可，不需要把动态 options 混进当前的 `/api/config/schema`。

原因：

- `/api/config/schema` 现在是静态 section schema，不适合承载运行时可见项
- subagent options 具有动态性（例如 `bash` 可见性）

### 5.2 `SubagentsSection` 表单行为

每条记录改为：

- 左侧：`Select` 选择子代理类型
- 右侧：数值输入框填写超时秒数

行为要求：

1. 新增时，默认选中“第一个尚未被使用的可见 subagent”
2. 如果所有可见项都已被占用，`添加子代理` 按钮禁用
3. 切换下拉项时，配置键随之迁移，避免同页内出现重复 subagent 名称
4. 同一个可见 subagent 名称不允许重复出现多条覆盖

### 5.3 旧值兼容渲染

若当前配置里存在不在可见 registry 中的名称，例如：

```yaml
subagents:
  agents:
    legacy-worker:
      timeout_seconds: 900
```

前端渲染时：

- 该条记录仍要出现
- 下拉框中注入一个临时 option，例如 `legacy-worker（当前不可用）`
- 该 option 只对当前已有值可见，不进入新增候选集

这样可以做到：

- 不破坏旧配置
- 不继续扩大脏配置面

### 5.4 加载失败策略

若 `session-policy/options` 拉取失败：

- 已有配置项仍按“当前值 + sentinel option”展示
- 新增按钮禁用
- 页面展示一条轻量错误提示，说明“无法加载可用子代理列表”

不允许在失败时回退到自由文本输入，因为那会重新打开错误入口。

---

## 6. 文案与信息架构调整

为了防止继续混淆，建议把当前 copy 稍微收紧。

### 6.1 标题/副标题

当前：

- `子代理`
- `管理默认和单代理超时策略。`

建议调整为更明确的描述，例如：

- `子代理`
- `管理主助理内建子代理类型的默认与单项超时策略。`

### 6.2 行标签

当前：

- `单代理超时（秒）`

建议改为：

- `子代理类型超时（秒）`

原因是这里配置的不是某个“具体 agent 实例”，而是某种 subagent type。

### 6.3 hint

当前 hint：

- `只有被列出的代理才会得到显式超时覆盖。`

建议增强为：

- `只有被列出的内建子代理类型才会得到显式超时覆盖；自定义智能体不在此处配置。`

---

## 7. 测试策略

### 7.1 后端

新增接口合同测试，至少覆盖：

1. `GET /api/config/session-policy/options` 返回可见 subagent 列表
2. host bash 禁用时，返回中不包含 `bash`
3. 返回项至少包含 `name` / `description` / `timeout_seconds`

### 7.2 前端

新增或更新合同测试，至少覆盖：

1. `SubagentsSection` 使用 `Select` 而不是自由文本 `Input` 来选择代理名
2. `SubagentsSection` 通过 `useSessionPolicyOptions` 或等效 API 读取动态 subagent 列表
3. 文案明确为“内建子代理类型”，不再暗示 custom agent
4. 未知已保存值会走“当前不可用”兼容渲染路径

---

## 8. 非目标

本设计不处理以下问题：

1. 不做“subagent + custom agent + remote agent”统一委派目录
2. 不改变 `task` 工具和 `@agent` 委派链路的执行模型
3. 不在本次把 `agent 模块代理` 纳入会话策略页
4. 不改变 subagent registry 的定义方式，只改变设置页消费方式

---

## 9. 推荐落地顺序

1. 后端新增 `GET /api/config/session-policy/options`
2. 前端新增 Config Center options API / hook
3. 先补合同测试锁住“只用 registry + Select”的 UI 约束
4. 再替换 `SubagentsSection` 的自由文本输入
5. 最后补 copy 调整和旧值兼容渲染

---

## 10. 最终结论

`Settings > 会话策略 > 子代理` 这一块配置的是：

> 主助理内建子代理类型（subagent registry）的超时覆盖。

它不是 agent catalog 设置台，也不是自定义智能体设置台。

因此：

- 名称字段必须改成下拉框
- 下拉项必须只来自后端可见 subagent registry
- `agent 模块代理` 明确排除在外

这能同时解决当前的输入错误、运行时漂移和产品语义混乱问题。
