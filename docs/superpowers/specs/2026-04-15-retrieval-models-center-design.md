# 检索模型中心（向量 / 重排序）产品与信息架构重构设计

日期：2026-04-15  
状态：Draft for review  
范围：`Settings > 模型`、检索模型能力归属、Memory / Knowledge Base 消费边界、向量模型本地/远端恢复策略

---

## Overrides / Supersedes

本设计不是一个“并行提议”，而是对既有 retrieval 设置归属的显式修正。

它覆盖以下旧结论中的 retrieval 归属部分：

- [2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md)
  - 覆盖其中把 `索引 / embedding / retrieval 系统设置` 挂在 `Memory Settings` 下的结论
- [2026-04-11-memory-soul-vector-closure-subproject-b-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-11-memory-soul-vector-closure-subproject-b-implementation-plan.md)
  - 覆盖其中把向量模型能力当作 Memory 私有配置面的落地方向

本设计**不覆盖**以下既有边界：

- `/workspace/memory` 仍然是 Memory 内容页，继续只展示“用户画像 / 长期背景 / 事实记忆”
- `Settings > 记忆` 只是设置态状态页，不是 `/workspace/memory` 的替身
- `Memory / Identity / Soul` 的 owner 边界仍服从 [2026-04-09-memory-soul-boundary-contracts-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-09-memory-soul-boundary-contracts-design.md)

一句话：

> 本设计修正的是“检索模型配置归属”，不是推翻 Memory 内容页边界。

---

## 1. 为什么这轮必须重构

当前系统把向量模型能力挂在 `Settings > 记忆` 下面，这个边界是错的。

这不是一个页面摆放问题，而是产品归属错位：

- 记忆模块会消费向量模型
- 知识库模块也会消费向量模型
- Notebook / 文档检索未来也可能消费向量模型
- 重排序模型和向量模型天然属于同一类“检索增强能力”，不属于 Memory 私产

如果继续把这套能力塞在 `记忆` 里，后面每多一个消费方，就会继续复制：

- 记忆页一份向量模型设置
- 知识库页一份向量模型设置
- Notebook 页再来一份

这种设计会把系统做成几个模块各自拥有一套“半共享、半私有”的模型配置。那是典型的产品债。

所以这轮重构的核心判断非常明确：

> 向量模型和重排序模型应该成为系统级检索能力，归属于模型管理，而不是归属于记忆模块。

---

## 2. 核心结论

### 2.1 新的产品归属

`Settings > 模型` 负责三类模型能力：

1. 对话模型
2. 向量模型
3. 重排序模型

它们都属于系统级模型能力。

### 2.2 新的消费关系

- `Memory` 是检索模型的消费者，不再是拥有者
- `Knowledge Base` 是检索模型的消费者，不再单独维护模型配置
- 未来 `Notebook` / 文档检索也应共享这套检索模型能力

### 2.3 记忆页的新角色

`Settings > 记忆` 不再承载向量模型配置，只负责：

- 展示“记忆检索增强是否可用”
- 展示“当前索引是否健康 / 需不需要重建”
- 提供跳转到 `Settings > 检索模型` 的入口

一句话：

> `Settings > 记忆` 只看状态，不再配模型；`/workspace/memory` 继续是内容页，不做检索设置台。

### 2.4 本地向量模型重新允许，但不再挂在记忆页

本地向量模型可以恢复支持，但必须归入 `检索模型中心`。

也就是说：

- 恢复本地 embedding / reranker 能力
- 但它们不再出现在 `记忆设置` 主页面里
- 它们应该在 `模型管理` 下成为一级可管理能力

这比“继续在记忆页里改 UI”要正确得多。

---

## 3. 产品心智：什么是检索模型中心

这轮重构后，系统应该给用户一个清晰心智：

- 聊天模型：负责回答、推理、工具调用
- 检索模型：负责把长期信息、知识库、文档召回得更准
- Memory / Knowledge Base：只是这些能力的使用场景

所以 `Settings > 模型` 里应该新增一个同级视图：

- `对话模型`
- `检索模型`

而 `检索模型` 再分成：

- 向量模型（embedding）
- 重排序模型（reranker）

这会比现在清楚得多。

---

## 4. 新的信息架构

## 4.1 Settings 顶层

保持现有设置大类结构不变，但在 `模型` 页面内部重组：

- `Settings > 模型`
  - `对话模型`
  - `检索模型`

Memory 不再单独拥有模型配置。

## 4.2 模型页面内部结构

### A. 对话模型

保留现有 provider / model 管理。

### B. 检索模型

新增检索模型中心，包含三块：

1. `推荐组合`
2. `向量模型`
3. `重排序模型`

#### 推荐组合

作用：给普通用户一个默认选择，不逼他们研究模型细节。

展示内容：

- 推荐向量模型
- 推荐重排序模型
- 当前状态：未准备 / 下载中 / 已就绪 / 需要重建
- 使用范围：记忆、知识库

主操作：

- `一键准备`
- `测试检索`
- `重建相关索引`

#### 向量模型

支持两条接入方式：

- 本地模型
- API 模型

但交互优先级不同：

- 普通用户默认先看推荐组合和本地推荐
- 高级用户再展开 API 配置

#### 重排序模型

同上。

## 4.3 `Settings > 记忆` 状态页结构

这里说的是 `Settings > 记忆`，不是 `/workspace/memory`。

`Settings > 记忆` 重构后只保留：

1. 记忆检索增强状态
   - 基础长期记忆：可用 / 不可用
   - 语义检索增强：可用 / 不可用
   - 重排序增强：可用 / 不可用

2. 索引状态
   - 已就绪 / 空 / 需要重建 / 异常

3. 跳转入口
   - `去模型管理配置检索模型`

不再出现：

- 向量模型 endpoint
- API Key
- 本地模型下载按钮
- 模型切换器

这些都迁走。

### 4.4 `/workspace/memory` 内容页边界保持不变

正式的 `/workspace/memory` 仍然只展示：

- 用户画像
- 长期背景
- 事实记忆

它不承担以下职责：

- 检索模型配置
- embedding / reranker provider 配置
- 索引重建动作
- 模型下载或启用

这点必须保持硬边界，否则会重新撞回旧的 Memory 配置台模型。

---

## 5. 交互方案

## 5.1 普通用户路径

目标用户：银行职员、政府部门职员、财务、采购等非技术用户。

他们的心智不应该是：

- 什么 provider？
- 什么 API base？
- 什么向量维度？
- 什么 rerank path？

他们的心智应该是：

- 记忆检索有没有增强
- 系统推荐的检索能力有没有准备好
- 我点一下能不能准备好

所以普通路径必须是：

1. 打开 `模型 > 检索模型`
2. 看到 `推荐组合`
3. 点 `一键准备`
4. 系统处理下载 / 配置 / 索引准备
5. 页面显示状态：已就绪

## 5.2 高级用户路径

高级用户才进入：

- API endpoint
- API key
- 自定义模型名
- 自定义 reranker
- 切换本地 / API

这些都放在折叠区或高级区。

## 5.2.1 运行环境 capability matrix

普通用户主流程不能脱离机器条件和企业环境现实来定义。

本轮设计明确以下 capability matrix：

| 环境 | 本地模型默认策略 | API 模型默认策略 | 允许暴露的主操作 |
|---|---|---|---|
| 桌面个人环境，磁盘/联网正常 | 可作为推荐组合主路径 | 可作为高级路径 | `一键准备`、`测试检索`、`重建相关索引` |
| 桌面企业环境，本地下载受限 | 不默认展示本地推荐主按钮 | 作为主路径 | `保存接口配置`、`测试连接`、`重建相关索引` |
| Web / Browser-only 环境 | 不支持本地下载 | 作为唯一配置路径 | `保存接口配置`、`测试连接`、`重建相关索引` |
| Runtime 未就绪 / skeleton 阶段 | 只展示状态，不开放承诺型动作 | 只展示状态，不开放承诺型动作 | `状态查看`、跳转说明 |

约束：

- 是否展示 `一键准备`，取决于 runtime capability，而不是只取决于产品想象。
- 本地模型下载失败时，必须给出确定性回退：
  - 如果 API 能力可用，引导改用 API
  - 如果 API 也不可用，回退到非向量检索并明确说明“长期记忆仍可用，但语义增强未启用”

这不是实现细节，而是产品合同。

## 5.3 本地模型交互

恢复本地模型时，必须有这几条：

- 下载目录固定在数据目录下
- 下载中有进度
- 已下载模型支持：启用 / 删除 / 重新下载
- 如果切换到不同 embedding 维度的模型，所有相关索引统一标记为“需要重建”

## 5.4 API 模型交互

API 模式必须支持：

- endpoint
- api key
- model name
- 测试连接
- 测试 embedding
- 测试 reranker

但这些不该挡在默认主流程前面。

---

## 6. 视觉语言

## 6.1 要保留什么

从 `Nion_old` 里可以保留这些逻辑语言：

- embedding / rerank / testing 三段式
- 模型卡片式选择
- 下载 / 启用 / 删除 / 导入的模型操作语义
- provider 测试 / 检索测试入口分离

## 6.2 不要照抄什么

`Nion_old` 的问题：

- 太工程化
- provider 信息太前置
- 普通用户不该看的一堆字段都在主视图
- 视觉更像后台控制台，而不是主产品设置

## 6.3 新的视觉要求

新的 Nion 检索模型中心应该满足：

- 和当前 Nion 设置页风格一致
- 但不能再安全、无聊、像配置台
- 重点是：
  - 强状态感
  - 清楚的推荐路径
  - 高级区折叠
  - 本地模型和 API 模型的角色一眼就分清

推荐视觉方向：

- 顶部状态总览带轻背景层次
- 推荐组合做成主卡
- 向量模型 / 重排序模型做次级卡
- API 配置作为折叠展开的高级面板
- 避免把一堆 Input 一上来摊满整个首屏

---

## 7. 后端边界重构

当前 `nion.memory.embedding.*` 命名已经暴露了旧边界问题。

这轮正确方向应该是把这套能力逐步迁到更中性的 retrieval 域：

- `nion.retrieval.embedding`
- `nion.retrieval.reranker`
- `nion.retrieval.model_registry`
- `nion.retrieval.index_consumers`

### 7.1 新 owner

检索模型 owner：

- provider 配置
- 本地模型下载状态
- 当前启用模型
- 模型测试能力
- 消费者索引重建触发

### 7.1.1 Retrieval Profile / Consumer Compatibility Contract

本设计在 phase 1 明确采用 **single active retrieval profile**：

- 全系统只有一套 active retrieval profile
- 该 profile 至少包含：
  - embedding fingerprint
  - reranker fingerprint
  - chunking policy version
  - index schema version

phase 1 规则：

1. `Memory`、`Knowledge Base`、未来 `Notebook` 默认共享同一套 active retrieval profile
2. 不允许 per-consumer model override
3. 每个 consumer 维护自己的 index namespace，但都绑定同一个 retrieval profile fingerprint + schema version
4. 当 active retrieval profile 变化时：
   - 所有 consumer index 一律标记为 `stale`
   - 查询可继续走非向量回退
   - 只有完成对应 consumer rebuild 后，语义增强重新可用

这意味着：

- “统一重建相关索引”不是一句口号，而是“对所有 stale consumer 执行 rebuild job”
- 如果未来要支持 per-consumer override，那是 phase 2 设计，不在本稿范围内

一句话：

> phase 1 先用一套全局 retrieval profile 换确定性；不要一开始就把 per-consumer 差异化做成烂摊子。

### 7.2 Memory 只保留消费接口

Memory 只关心：

- 当前有没有 embedding 能力
- 当前有没有 reranker 能力
- 当前索引是否要重建
- 查询时调用检索服务

### 7.3 Knowledge Base 同理

Knowledge Base 也不再独立配置向量模型。

---

## 8. 建议的 API 调整

我建议最终 API 演进为：

- `GET /api/retrieval-models/status`
- `GET /api/retrieval-models/recommendation`
- `GET /api/retrieval-models/assets`
- `PATCH /api/retrieval-models/active`
- `POST /api/retrieval-models/download`
- `POST /api/retrieval-models/test-embedding`
- `POST /api/retrieval-models/test-reranker`
- `POST /api/retrieval-models/rebuild-consumer-indexes`
- `GET /api/retrieval-models/consumers`

其中 `GET /api/retrieval-models/status` 至少要返回：

- active retrieval profile
- overall capability state
- local / api availability
- consumer rebuild state summary
- current recommendation state

不要只返回动作结果，不返回 UI 真正需要的 read model。

而当前的 `/api/memory/settings` 应逐步瘦身为：

- 只保留 memory 自己的消费状态投影
- 或者最终不再承载检索模型配置动作

### 8.1 旧 `/api/memory/settings` 迁移表

| 旧面 | 新面 | 迁移说明 |
|---|---|---|
| `provider_mode.id` | `active_profile.embedding.mode` | 写入新 retrieval profile；旧接口进入只读兼容期 |
| `remote_config.endpoint` | `providers.embedding.api_base` / `endpoint` | 迁移到 retrieval models provider 配置 |
| `remote_config.api_key_configured` | `providers.embedding.api_key_masked` | secret 仍保存在同一 secret store，只改 owner surface |
| `remote_config.model_name` | `providers.embedding.model` | 迁移到 retrieval provider |
| `remote_dimensions` | `active_profile.embedding.dimensions` | 作为 profile capability 一部分 |
| `POST /api/memory/settings/download` | `POST /api/retrieval-models/download` | 本地模型仍保留时迁移；若 phase 1 不开放，则改成 disabled/status-only |
| `POST /api/memory/settings/rebuild` | `POST /api/retrieval-models/rebuild-consumer-indexes` | 重建从 memory 私动作改为 consumer-aware action |

cutover 规则：

1. 新 retrieval models surface 上线后，旧 `/api/memory/settings` 停止承载新的配置写入
2. 旧接口进入 compat read-only 或 narrow projection 阶段
3. 待 `Settings > 记忆` 和模型管理完成切换后，删除旧配置动作和旧页面测试

secret 规则：

- API key 不应在迁移过程中明文回写到普通配置 payload
- 仍然走现有 secret store / masked readback 机制
- 迁移时只迁 owner，不迁“展示成明文”的行为

---

## 9. 推荐实施方案

我推荐的方案不是“小改”，而是下面这条：

### 推荐方案：模型管理内新增“检索模型中心”

1. 在 `Settings > 模型` 内新增 `检索模型` 子视图
2. `Settings > 记忆` 删除向量模型配置 UI，只保留状态和跳转
3. 先定义 retrieval read model、capability gating 和 compat 迁移表
4. 如果 runtime 仍不完整，则检索模型中心先以 status-only / beta 形态上线，不开放承诺型动作
5. 待 runtime 能力齐全后，再开放 `一键准备 / 测试检索 / 重建相关索引`
6. 第二阶段再把后端从 `memory.embedding` 迁到 `retrieval` 命名空间
7. 第三阶段让 Knowledge Base 接同一套能力

这是最稳的路线。

### 不推荐方案 A：继续把向量模型留在记忆页里，只做美化

不推荐原因：

- 边界仍然错
- 后面知识库还会再来一次
- 只是把错误结构做得更好看

### 不推荐方案 B：知识库和记忆各自管理自己的向量模型

不推荐原因：

- 重复配置
- 用户心智崩坏
- 模型与索引生命周期管理会越来越乱

---

## 10. 最终建议

我的建议非常明确：

> 立即把向量模型 / 重排序模型能力从 Memory 页面迁出，进入 `Settings > 检索模型`，Memory 和 Knowledge Base 统一改成消费者。

而且：

> 本地向量模型可以恢复，但必须作为检索模型中心里的一个能力，不得再作为记忆页里的私有配置。

这才是长期正确结构。

---

## 11. 本轮确认点

本设计确认以下几点：

1. 向量模型能力属于模型管理，不属于记忆模块。
2. 记忆和知识库都只是检索模型的消费者。
3. `Settings > 记忆` 未来只保留状态和跳转，不再配置向量模型。
4. `/workspace/memory` 继续只做内容页，不承载检索状态面板。
5. phase 1 采用 single active retrieval profile，不允许 per-consumer override。
6. 本地向量模型允许恢复，但只在 `检索模型中心` 中恢复。
7. API 模型和本地模型都要支持，但普通用户只先看推荐组合。
8. UI 要吸收 `Nion_old` 的检索模型逻辑，但必须符合当前 Nion 的视觉语言，不再做工程后台式页面。
