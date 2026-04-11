# Memory / Soul / User Identity Mainline Closure Design

日期：2026-04-11  
状态：Draft for review  
范围：`Memory / Soul / User Identity 真实主链闭环 + 伪完成能力清理`

---

## 1. 背景

经过前几轮重构，系统已经完成了这些关键工作：

1. `Memory / Soul` 边界重定义
2. `runtime mainchain` 的基础收口
3. `Settings > Soul` 的即时保存产品面
4. `UserIdentityProfile` 的独立 owner、提取、runtime 注入、聊天直写

但是 2026-04-11 的两份严格审查已经证明：

- 当前系统**不能被称为完整可用的 Memory / Soul 系统**
- 当前问题不再是“结构混乱看不懂”，而是“有些主链确实没闭环，有些能力是伪完成”

两份审查文档：

- [2026-04-11-memory-soul-implementation-gap-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-11-memory-soul-implementation-gap-audit.md)
- [2026-04-11-memory-soul-user-identity-backend-strict-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-11-memory-soul-user-identity-backend-strict-audit.md)

这份设计的目的，不是再继续叠加功能，而是：

> **把 Memory / Soul / User Identity 的真实主链闭环补齐，并把所有伪完成、假能力、假稳定点全部清掉。**

---

## 2. 核心问题

基于审查结果，当前有 5 个核心问题：

### 2.1 `chat -> stable soul` 主路径没有落地

设计已经明确要求：

- 用户通过聊天明确要求修改 `core_identity / speech_style / values_and_boundaries / relationship_stance` 时，应直接改 stable soul 并立即生效

当前代码没有这条主路径。

### 2.2 `UserIdentityProfile` 没有进入 `/workspace/memory` 的正式读模型

用户现在只能在 `Settings > Soul` 的身份辅助面板里看到：

- 用户姓名
- 称呼你
- 我的自称
- 沟通偏好

但在真正的 Memory 页面里看不到这些内容。

### 2.3 向量 / embedding 是假能力

当前系统有：

- provider metadata
- vector store protocol
- 只读 embedding 设置面
- `vector` 检索路由预留

但没有：

- 真实 embedding provider
- 真实 vector store
- 本地模型下载
- 索引构建
- vector query 主链

因此这部分当前不应继续被当成“系统能力”对外宣称。

### 2.4 `UserIdentityPanel` 有输入丢失问题

逐字段保存后 query invalidate 会整体重置 `drafts`，导致其他尚未保存的输入丢失。

### 2.5 前端部分合同测试在保护错误产品形态

当前有些测试不是在保护“正确产品面”，而是在保护：

- `memory-user-page` 的旧纠错文案
- `memory-console-panel` 的控制台式操作
- `memory-embedding-panel` 的假活跃只读状态

这意味着测试全绿不能等于产品正确。

---

## 3. 设计目标

### 3.1 产品目标

- 用户通过聊天和设置修改身份与 Soul 时，都能立即生效
- 用户能在 Memory 页面看到系统真正记住的核心稳定身份信息
- 系统不再对外暴露任何“看起来强大但实际上没实现”的向量能力
- 设置页不再丢输入，不再出现假即时保存

### 3.2 工程目标

- 给 `SoulBaseline` 建立真实的聊天直写主路径
- 建立单一稳定 truth owner 的读取与写入约束
- 把 `UserIdentityProfile` 纳入 Memory 正式读模型
- 退休或隐藏所有伪能力与死链
- 修正前端合同测试，让测试保护正确产品面，而不是错误残留

### 3.3 交付目标

本轮结束后，系统应达到下面的真实状态：

1. 用户通过聊天可以直接稳定修改 `UserIdentityProfile`
2. 用户通过聊天可以直接稳定修改 `SoulBaseline`
3. 用户可以在 `/workspace/memory` 看到最关键的稳定身份记忆
4. `Settings > Soul` 不会再丢未保存输入
5. 产品面不再展示假向量能力

---

## 4. 非目标

本轮不做：

- 真正建设完整向量检索系统
- 全量重写 Memory OS 数据模型
- 重做 Notebook / Automation
- 引入新的向量数据库、推理框架或模型下载器

这轮的向量策略是：

> **先下线或隐藏伪能力，不在这份设计里承诺同时建设真实向量系统。**

---

## 5. 方案比较

### 方案 A：一边补主链，一边把真实向量系统也做完

优点：

- 理论上可以一次性交付“更完整”的系统

缺点：

- 范围过大
- 风险高
- 会把“真主链闭环”与“新系统建设”混在一起
- 很容易再次回到补丁叠补丁

结论：

- **拒绝**

### 方案 B：只修聊天写入和 Memory 投影，暂时保留当前 embedding 产品面

优点：

- 改动范围较小

缺点：

- 假能力仍然对外暴露
- 用户和团队都会继续被误导
- 测试仍会继续保护错误形态

结论：

- **拒绝**

### 方案 C：先闭环真实主链，再清掉所有伪完成能力

优点：

- 先保证系统真实可用
- 同时去掉假能力和错误产品面
- 范围明确，风险可控
- 符合“先真，后强”的原则

缺点：

- 本轮不会交付真实向量检索

结论：

- **推荐方案**

---

## 6. 总体设计

## 6.1 稳定 truth owner

这轮继续维持双 owner 分层，但把各自职责收紧成**真实可闭环**状态：

### `UserIdentityProfile`

唯一 owner：

- 用户是谁
- 双方怎么互称
- 用户长期沟通偏好

输出给：

- runtime always-on identity block
- Memory 页面稳定身份投影
- Settings > Soul 的身份辅助面板

### `SoulBaseline`

唯一 owner：

- `core_identity`
- `speech_style`
- `values_and_boundaries`
- `relationship_stance`

输出给：

- runtime stable soul block
- Settings > Soul 四个字段卡片

### 约束

- `UserIdentityProfile` 不再被当成 settings-only 数据
- `SoulBaseline` 不再被当成 settings-only 数据
- 两者都必须同时支持：
  - 聊天修改
  - 设置页修改

---

## 6.2 主链写入模型

主链写入分成两条，但都必须走**稳定层 patch service**，不能各写各的：

### 主链 1：聊天显式声明写入

流程：

1. 当前用户消息进入提取阶段
2. 先识别是否属于：
   - `UserIdentityProfile`
   - `SoulBaseline`
3. 转成结构化 patch
4. 写入稳定层
5. 当前轮继续往下运行
6. `Continuity / Runtime` 读取刚刚的新稳定值

关键约束：

- `SoulBaseline` 的聊天修改不能再只停在 prompt 提示或 onboarding tool
- 没有目标值时才允许澄清
- 有明确目标值时直接改，不走 proposal

### 主链 2：设置页字段级 patch

流程：

1. 用户改一个字段
2. 前端只提交这个字段
3. 后端稳定层 patch service 写入
4. 返回最新稳定值
5. 前端只同步当前字段，不重置其他未保存输入

关键约束：

- 不允许全表单统一 apply
- 不允许 query invalidate 直接覆盖整个草稿状态
- 不允许产生重复 override 垃圾数据

---

## 6.3 `SoulBaseline` 聊天修改设计

本轮新增一条明确主链：

### 新增可提取的聊天 signal

- `soul_core_identity`
- `soul_speech_style`
- `soul_values_and_boundaries`
- `soul_relationship_stance`

### 触发条件

只有用户的**显式长期要求**才进入 stable soul：

例如：

- “以后你回答冷静一点”
- “你别那么热情，多一点稳定感”
- “你长期要更克制，不替我拍板”
- “你以后和我说话的关系基调低刺激一点”

不进入 stable soul 的例子：

- “这次回答短一点”
- “这一轮别展开”

这些应该仍然属于短期表达或当前轮上下文。

### 写入方式

聊天提取后不直接绕过所有规则写表，而是统一调用：

- `patch_soul_setting_value(...)`

必要时把 `initialize_soul_profile` 重构成：

- 一个基于多个字段 patch 的 coarse initializer

而不是现在这种“只写 core summary”的半成品工具。

---

## 6.4 Memory 页面读模型重构

当前 Memory 页面必须升级成真正的“系统记住了什么”的产品面。

### 新读模型结构

`/api/memory` 继续保留三大组，但 `user_profile` 要扩成：

- 用户姓名
- 称呼你
- 我的自称
- 互称规则
- 沟通偏好
- 工作语境
- 个人背景
- 当前关注

### 来源

- 前 5 项来自 `UserIdentityProfile`
- 其余保持来自现有 `Memory OS` user/profile projection

### 结果

这样可以避免：

- 再开一个新的 Memory 页面
- 再把身份层做成 settings-only 数据

也满足用户最初的要求：

> 用户只需要看到当前 agent 存了哪些记忆。

---

## 6.5 `UserIdentityPanel` 前端状态修正

当前 `UserIdentityPanel` 必须从“query 驱动整块重置”改成“字段级编辑状态”。

### 设计要求

- 每个字段有独立 dirty state
- 保存某个字段时，只回填该字段
- 其他未保存字段保持当前输入

### 禁止

- 保存一个字段后整体 `setDrafts(...)`
- 用 profile refresh 覆盖所有输入

---

## 6.6 伪能力清理策略

### 向量 / embedding

本轮不建设真实向量系统。

因此需要做的不是“继续展示骨架面”，而是：

1. 从产品面隐藏 `MemoryEmbeddingPanel`
2. 让 `/api/memory/settings` 不再作为正式用户面能力暴露
3. 在文档和测试里停止把 embedding 状态面当成已交付能力

### dead / half-connected pipeline

对当前未接生产的 `candidate -> consolidation -> vector route` 链，按两类处理：

1. 若本轮不打通：
   - 明确标成 internal skeleton
   - 停止对外宣称
2. 若短期不会使用：
   - 从产品合同和产品文案中清掉

这轮优先做“去伪完成”，不做“强行补齐所有内部骨架”。

---

## 6.7 测试与验收重构

### 合同测试

当前需要调整的不是“补几个测试”，而是**修正错误测试方向**。

要删除或改写那些在保护错误形态的测试，例如：

- `memory-user-page.contract.test.ts`
- `memory-embedding-panel.contract.test.ts`
- `memory-settings-page.config.test.ts`

新的测试目标：

- 保护稳定身份投影
- 保护 `chat -> stable soul`
- 保护字段级即时保存且不丢其他输入
- 保护产品面不再出现假 embedding 能力

### 行为验收

验收必须覆盖：

1. 聊天改用户身份
2. 聊天改 Soul
3. 设置页改用户身份
4. 设置页改 Soul
5. 新线程回忆名字 / 互称 / 回答偏好
6. Memory 页面能看到身份记忆

### Electron 收官验收

只有下面都通过，才算这轮真正完成：

1. Electron live daemon 稳定启动
2. 设置页保存成功
3. 新线程回忆成功
4. Memory 页面展示正确

---

## 7. 分阶段实施建议

### Phase 1：补齐真实稳定写入主链

- 聊天直写 `SoulBaseline`
- 重构 `initialize_soul_profile`
- 统一 stable soul patch service

### Phase 2：修正 Memory 页面读模型

- 把 `UserIdentityProfile` 投影进 `/api/memory`
- 更新 Memory 页面和搜索

### Phase 3：修正前端状态与测试

- 修 `UserIdentityPanel` 输入丢失
- 重写错误方向的合同测试

### Phase 4：清理伪能力

- 下线 `MemoryEmbeddingPanel`
- 下线 `memory/settings` 的假活跃能力表述
- 收口半连接文案

### Phase 5：桌面收官验收

- 修 `desktop-dev` live daemon 验收链
- 跑最终 Electron E2E

---

## 8. 设计结论

本轮设计采用：

> **方案 C：先闭环真实主链，再清掉所有伪完成能力。**

这意味着：

- 我们现在不再把“真主链修复”和“真向量系统建设”混在同一轮
- 我们优先让系统变成真实可用
- 所有假能力、假稳定、假活跃点都必须退出产品面

达到这个设计的终态后，系统才可以被称为：

> **Memory / Soul / User Identity 主链闭环完成。**
