# Memory / Soul / User Identity Dual-Track Closure Design

日期：2026-04-11  
状态：Draft for review  
范围：`子项目 A：真实主链闭环` + `子项目 B：真实向量系统产品闭环`

---

## 1. 背景

前几轮改造已经完成了这些基础工作：

1. `Memory / Soul` 边界重定义
2. `runtime mainchain` 的初步收口
3. `Settings > Soul` 的即时保存产品面
4. `UserIdentityProfile` 的独立 owner、提取、runtime 注入、聊天直写

但 2026-04-11 的严格审查已经证明，当前系统依然不能被称为“完整可用的 Memory / Soul 系统”。

核心审查文档：

- [2026-04-11-memory-soul-implementation-gap-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-11-memory-soul-implementation-gap-audit.md)
- [2026-04-11-memory-soul-user-identity-backend-strict-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-11-memory-soul-user-identity-backend-strict-audit.md)

之后又通过 deep-interview 澄清了新的决策边界：

- 不只是补 `P1` 主链缺口
- `UserIdentityProfile` 扩展字段也要一起真落地
- 真实向量系统这轮也要做
- 但必须拆成 **两个连续子项目**
- 子项目 B 的向量范围只到 **结构化长期记忆**
- `custom_compatible` 延期

deep-interview artifacts：

- [.omx/context/memory-soul-mainline-closure-extension-20260411T013909Z.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.omx/context/memory-soul-mainline-closure-extension-20260411T013909Z.md)
- [.omx/interviews/memory-soul-mainline-closure-extension-20260411T015808Z.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.omx/interviews/memory-soul-mainline-closure-extension-20260411T015808Z.md)
- [.omx/specs/deep-interview-memory-soul-mainline-closure-extension.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.omx/specs/deep-interview-memory-soul-mainline-closure-extension.md)

因此，这份正式设计不再采用旧的“单项目主链闭环”结构，而改为：

> **双子项目总设计：先闭环真实主链，再完成真实向量系统产品闭环。**

---

## 2. 当前问题

基于审查和深访，当前问题分成两类：

### 2.1 子项目 A 问题：主链不完整

- `chat -> stable soul` 主路径没落地
- `UserIdentityProfile` 没有进入 `/workspace/memory`
- `UserIdentityPanel` 有真实的输入丢失问题
- 前端有一批合同测试在保护错误产品形态
- `Memory UI / Soul UI` 仍然存在机制化残留和错误信息架构

### 2.2 子项目 B 问题：向量系统是假能力

- 有 `provider metadata`
- 有 `vector store protocol`
- 有只读 `Embedding` 面板
- 有 `vector` 检索路由预留

但没有：

- 真实 embedding provider
- 真实 vector store
- 本地模型下载
- 索引构建
- vector query 主链
- 检索结果进入 Memory 主链
- 可操作的产品面

这意味着当前向量能力仍然是**伪完成**，不能继续保留在产品面。

---

## 3. 总目标

### 3.1 产品目标

- 用户通过聊天和设置修改身份与 Soul 时，都能立即生效
- 用户能在 Memory 页面看到系统真正记住的核心稳定身份信息
- 用户能通过正式产品面使用真实的向量记忆能力，而不是只读假面板
- 系统不再对外暴露任何伪完成、假稳定、假活跃能力

### 3.2 工程目标

- 为 `SoulBaseline` 建立真实聊天直写主链
- 为 `UserIdentityProfile` 扩展字段建立真实写入、读取和展示主链
- 把 `UserIdentityProfile` 纳入 Memory 正式读模型
- 建立本地 + 远端的真实 embedding/provider/vector/index/search 闭环
- 修正前端合同测试，使其保护正确产品面

---

## 4. 非目标

总设计下共同非目标：

- 不重做 Notebook / Automation
- 不全量重写 Memory OS 数据模型
- 不把 `growth / heartbeat / reflection` 整条侧链一次性重构完，只做与主链冲突的必要切断
- 本轮不支持 `custom_compatible` 向量模式
- 本轮不把 `evidence_chunks / episode / recall` 纳入向量索引范围

注意：

- `Memory UI / Soul UI` 这轮明确允许真改版
- 这不是局部修补项目

---

## 5. 总体方案

## 5.1 方案比较

### 方案 A：所有东西继续塞进一个实施回合

缺点：

- 范围过大
- 主链闭环和新向量系统建设互相污染
- 会再次滑回补丁叠补丁

结论：

- 拒绝

### 方案 B：只做主链闭环，向量继续以后再说

缺点：

- 不符合最新澄清后的真实需求
- 继续保留“伪向量能力”

结论：

- 拒绝

### 方案 C：拆成两个连续子项目

优点：

- 范围清晰
- 风险可控
- 先保证系统真实可用
- 再建设真实向量系统
- 符合深访后的真实决策边界

结论：

- 采用

---

## 6. 总体架构

## 6.1 稳定 truth owner

### `UserIdentityProfile`

唯一 owner：

- 用户是谁
- 双方怎么互称
- 用户长期沟通偏好
- 用户长期身份扩展字段：
  - `user_role`
  - `timezone`
  - `interaction_boundaries`
  - `long_term_background_summary`
  - `user_aliases`

### `SoulBaseline`

唯一 owner：

- `core_identity`
- `speech_style`
- `values_and_boundaries`
- `relationship_stance`

### 约束

- `UserIdentityProfile` 不再是 settings-only 数据
- `SoulBaseline` 不再是 settings-only 数据
- 两者都必须同时支持：
  - 聊天修改
  - 设置页修改

---

## 6.2 子项目 A：真实主链闭环

### 目标

把 `Memory / Soul / UserIdentity` 变成真正一致、可见、可写、可回忆的主链。

### 范围

1. `chat -> stable soul`
2. `UserIdentityProfile -> /workspace/memory`
3. `UserIdentityProfile` 扩展字段真落地
4. `UserIdentityPanel` 输入丢失修复
5. `Memory UI / Soul UI` 真改版
6. 下线假 embedding / memory settings 产品面
7. 重写保护错误形态的合同测试

### 关键设计

#### A-1 聊天显式声明写入

聊天写入分成两条：

- `UserIdentityProfile`
- `SoulBaseline`

两者都必须走稳定层 patch service，不再允许：

- 只在 prompt 里提示
- 只靠 onboarding tool
- 只在设置页改

#### A-2 Memory 页面读模型

`/api/memory` 的 `user_profile` 必须扩成：

- 用户姓名
- 称呼你
- 我的自称
- 互称规则
- 沟通偏好
- `user_role`
- `timezone`
- `interaction_boundaries`
- `long_term_background_summary`
- 工作语境
- 个人背景
- 当前关注

来源：

- 前 9 项来自 `UserIdentityProfile`
- 后 3 项保留来自现有 canonical projection

#### A-3 前端状态模型

`UserIdentityPanel` 改成字段级 dirty state：

- 保存某个字段时，只同步当前字段
- 不重置其他尚未保存输入

#### A-4 假能力清理

当前用户面里的 embedding 面板和 memory settings 机制化说明不再保留。

本子项目结束时：

- 产品面不再展示假向量能力
- 但真实向量能力还没上线

---

## 6.3 子项目 B：真实向量系统产品闭环

### 目标

把当前“协议 + 假快照 + 假面板”的 embedding/vector 骨架，变成真实可配置、可构建、可查询、可进入主链的系统。

### 运行模式范围

本轮只支持：

- `local_managed`
- `remote_managed`

明确延期：

- `custom_compatible`

### 索引范围

本轮只索引：

- **结构化长期记忆**

不进入本轮范围：

- `evidence_chunks`
- `episode`
- `recall`

### 产品完成标准

这不是“后端可用”项目，而是“产品闭环”项目。

必须同时具备：

1. 本地 embedding 模型可下载 / 可加载
2. 远端 embedding provider 可配置 / 可调用
3. 可对结构化长期记忆构建 vector index
4. 可对结构化长期记忆执行 vector query
5. `vector_hits` 真正进入 Memory 主链融合
6. 前端可以：
   - 选择本地 / 远端
   - 看到下载 / 构建 / 健康状态
   - 触发重建

### 架构约束

#### B-1 canonical embedding provider

子项目 B 必须为两种模式建立真实 provider：

- `LocalManagedEmbeddingProvider`
- `RemoteManagedEmbeddingProvider`

当前 metadata class 不再足够。

#### B-2 canonical vector store

必须落地真实 vector store 实现，而不是继续停在 `Protocol`。

#### B-3 主链接入

`vector_hits` 不再只是 `search_fusion` 的保留参数，而要真正来自生产查询链。

#### B-4 产品面

embedding 页面必须从：

- “当前 provider mode / download status / active fingerprint / index health” 假快照面

变成：

- 真配置
- 真状态
- 真操作

---

## 7. 顺序关系

两个子项目不是并行关系，而是连续关系：

### 先做子项目 A

原因：

- 先补真实主链
- 先消灭伪完成产品面
- 先让 Memory / Soul / UserIdentity 变成真实可用系统

### 再做子项目 B

原因：

- 向量系统是一个新建设的真实子系统
- 范围和风险显著更大
- 不应与主链闭环同轮混做

---

## 8. 验收标准

## 8.1 子项目 A 验收

1. 用户通过聊天可直接稳定修改 `SoulBaseline`
2. 用户通过聊天和设置修改 `UserIdentityProfile` 扩展字段后，可在 `/workspace/memory` 看见
3. `UserIdentityPanel` 不再丢未保存输入
4. Memory 页面成为真实记忆产品面
5. 旧错误合同测试被重写
6. 假 embedding 产品面已退出

## 8.2 子项目 B 验收

1. `local_managed` 可用
2. `remote_managed` 可用
3. 本地模型下载 / 加载 / 索引构建成功
4. 远端 embedding 调用成功
5. 对结构化长期记忆的向量查询成功
6. `vector_hits` 进入 Memory 主链融合
7. 前端具备真正可用的配置、状态、重建入口

---

## 9. 设计结论

这份正式设计替代旧的单项目主链闭环设计，采用：

> **双子项目总设计：A 真实主链闭环，B 真实向量系统产品闭环。**

只有当两个子项目都完成时，系统才可以被称为：

> **完整的 Memory / Soul / UserIdentity 系统。**
