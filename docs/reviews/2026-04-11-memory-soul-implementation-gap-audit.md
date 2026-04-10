# Memory / Soul / User Identity Implementation Gap Audit

日期：2026-04-11  
审查方式：代码审查 + 设计/实施文档对照 + 定向运行验证  
结论级别：严格 / 保守 / 以“缺失即缺失”为准

---

## 一、审查结论

当前系统 **不能被称为“完整可用的记忆系统和灵魂系统”**。

更准确地说，当前系统已经完成了几条关键骨架：

- `UserIdentityProfile` owner
- 用户姓名 / 互称 / 沟通偏好的提取与稳定写入
- runtime always-on 注入用户身份
- `Settings > Soul` 的即时保存产品面

但它仍然存在多处 **未落地、半落地、伪完成** 的关键缺口。最核心的几个问题是：

1. **向量/embedding 子系统基本还是骨架，不是可工作的实现。**
2. **设计承诺的“用户通过聊天直接修改 SoulBaseline”并没有真正落地。**
3. **Memory 页面没有把最关键的稳定身份记忆投影出来，用户仍看不到自己最重要的稳定记忆。**
4. **`UserIdentityPanel` 当前有真实的输入丢失风险：保存一个字段会重置其他尚未保存的字段。**
5. **Embedding 设置面向用户暴露了大量伪活跃、只读、内部味很重的信息。**

所以当前系统不是“已经完成，只差一点收尾”，而是：

> **用户身份层主链已初步成形，但 Soul 聊天修改、向量检索、记忆产品面投影这三块仍不完整。**

---

## 二、已确认落地的部分

这些部分不是空话，已经有代码和测试支撑：

- `UserIdentityProfile` 的模型、仓储、服务、路由已建立。
- 用户姓名 / 互称 / 沟通偏好可以从聊天里提取并写入稳定层。
- runtime 会 always-on 注入用户身份。
- `Settings > Soul` 已从 bulk draft/apply 改为逐项即时保存。
- `PATCH /api/user-identity` 与 `PATCH /api/memory/soul` 已有正式写入合同。

这部分能力可以说是“已落地”。

---

## 三、关键缺口

### P1-1 向量 / embedding 子系统仍是骨架，不是可工作的实现

**结论**

当前代码库里有 embedding provider 元数据、vector store 协议、vector route 预留和只读设置页，但没有看到任何真正落地的向量数据库实现，也没有看到真正运行的 embedding 生成和向量检索主链。

**代码证据**

- 向量存储只有协议，没有实现：
  - [vector_store.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/vector_store.py#L10)
  - [vector_store.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/embedding/vector_store.py#L68)
- 检索融合层虽然接受 `vector_hits`，但只是可选参数合并：
  - [service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/search_fusion/service.py#L15)
  - [service.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/search_fusion/service.py#L20)
- `memory_settings` 只是在构造 provider snapshot：
  - [memory_settings.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_settings.py#L16)
  - [memory_settings.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_settings.py#L99)
- `EvidenceChunk` 里有 `embedding_ref` 字段，但没有生产写入链路：
  - [models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/models.py#L29)
  - [store.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/evidence_vault/store.py#L63)

**依赖证据**

`backend/packages/harness/pyproject.toml` 没有这些真正的向量库或本地 embedding 推理依赖：

- `faiss`
- `chroma`
- `qdrant-client`
- `milvus`
- `pgvector`
- `hnswlib`
- `sentence-transformers`
- `transformers`
- `onnxruntime`

参考：
- [pyproject.toml](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/pyproject.toml)

**本机环境证据**

当前默认向量目录应为：

- `/Users/zhangtiancheng/.nion-data/memory-os/indexes/vector`

实际检查结果：

- 目录不存在
- `manifest.json` 不存在

也就是说，本机本地 embedding 资产当前根本没有准备好。

**为什么这是 P1**

因为这不是“优化项没做”，而是 **系统很容易被误认为已经有向量记忆能力**，但实际上没有。

---

### P1-2 设计承诺的“用户通过聊天直接修改 SoulBaseline”没有真正落地

**结论**

当前聊天直写只覆盖了 `UserIdentityProfile`，没有覆盖 `SoulBaseline` 的四个稳定字段。

设计文档明确写的是：

- 用户通过聊天明确提出时，可以直接改并立即生效
- 适用对象包括：
  - `core_identity`
  - `speech_style`
  - `values_and_boundaries`
  - `relationship_stance`

参考：
- [design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-10-user-identity-memory-and-soul-interaction-design.md#L318)

**代码证据**

当前聊天直写中间件只处理：

- `user_name`
- `mutual_addressing`
- `explicit_preference -> communication_style_preferences`

没有任何 Soul stable fields 的映射：
- [user_identity_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py#L55)

也就是说，像这些句子：

- “以后你回答冷静一点”
- “你以后别那么热情”
- “你的长期价值观应该是……”
- “以后你的关系基调应该更低刺激”

当前并不会稳定写入 `speech_style / values_and_boundaries / relationship_stance`。

**进一步证据**

虽然 prompt 里还有 `soul onboarding` 提示：
- [core.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_sections/core.py#L183)

虽然也有 `initialize_soul_profile` 工具：
- [soul_onboarding_tool.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py#L9)

但这个工具本身也没有真正把四个稳定字段写全：

- 它只写 `core_soul` artifact
- `created_at` 还是硬编码的 `2026-04-08T00:00:00Z`
- [soul_onboarding_tool.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py#L31)

而 runtime 真正读取的是：

- `speech_style <- identity_narrative`
- `values_and_boundaries <- user_override 或 core fallback`
- `relationship_stance <- relationship_stance layer`

参考：
- [soul_bundle.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py#L40)

所以现在的真实状态是：

> 聊天里对 Soul 的修改，只存在“提示和工具入口”，没有形成稳定、确定、可验收的直接修改主链。

---

### P1-3 Memory 页面没有把 `UserIdentityProfile` 投影出来，用户看不到最关键的稳定记忆

**结论**

`UserIdentityProfile` 已经建立，但 `/workspace/memory` 仍然看不到用户姓名、互称、沟通偏好这类最关键的稳定身份记忆。

这直接违背了“用户至少要能看到 agent 记住了什么”的目标。

**代码证据**

Memory 页面用户面 payload 只来自：

- `user_profile`
- `long_term_background`
- `fact_memories`

参考：
- [compat.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/compat.py#L85)

其中 `user_profile` 的定义只有：

- `work_context`
- `personal_context`
- `top_of_mind`

参考：
- [compat.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_os/compat.py#L618)

前端 Memory 页面也只渲染这三组：
- [memory-home-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-home-page.tsx#L93)

因此当前用户即使已经设置了：

- 自己名字
- 互称规则
- 回答偏好

也只能在 `Settings > Soul` 的身份辅助面板里看到，而不是在“记忆工作台”里看到。

**为什么这是 P1**

因为这是当前产品目标里的核心能力，不是附加项。

---

### P1-4 `UserIdentityPanel` 保存一个字段会覆盖掉其他尚未保存的输入

**结论**

`UserIdentityPanel` 当前有真实的输入丢失风险。

保存任意一个字段后，query invalidate 会刷新 profile，随后 `useEffect` 会把整个 `drafts` 重置成服务端状态，导致其他还没保存的字段输入被清空。

**代码证据**

整块 `drafts` 会在 profile 任一字段变化时整体重置：
- [user-identity-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/user-identity-panel.tsx#L77)

而保存逻辑是逐字段 mutation：
- [user-identity-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/user-identity-panel.tsx#L102)

这两个组合在一起，会产生实际行为：

1. 用户改了 3 个字段
2. 先保存第 1 个字段
3. query 刷新
4. `useEffect` 重置全部 drafts
5. 另外 2 个还没保存的输入丢失

**这是我在真实页面验收里已经观察到的行为。**

**为什么这是 P1**

因为这是设置页的真实数据丢失，不是审美问题。

---

## 四、重要但次一级的缺口

### P2-1 `memory_settings` / `MemoryEmbeddingPanel` 当前在对用户展示“假活跃状态”

**结论**

这个面板现在不是“真实可用的 embedding 配置面”，而是“读一个硬编码默认 provider + 看 manifest 文件”的只读快照面。

**代码证据**

后端默认 provider 被硬编码成：

- `provider_id = local-default`
- `model_name = bge-m3`
- `dimensions = 1024`
- `revision = 2026-04-09`

参考：
- [memory_settings.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory_settings.py#L16)

也就是说，即使当前系统根本没有向量资产、没有 provider 执行链、没有实际索引，也会返回一个“active_fingerprint”。

而前端面板直接把这些东西展示成：

- `Current provider mode`
- `Download status`
- `Active fingerprint`
- `Index health`

参考：
- [memory-embedding-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.tsx#L36)
- [memory-embedding-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.tsx#L68)

这会让用户误以为：

- 系统已经有 embedding provider
- 系统已经有 active fingerprint
- 系统只差下载或索引健康检查

但实际上，底层实现根本还没落地。

**这是一种典型的“假数据 / 假能力”问题。**

---

### P2-2 `initialize_soul_profile` 是半成品：时间硬编码、字段写入不完整

**结论**

它看上去像正式能力，但实际上不够稳，也不完整。

**问题**

- `created_at` 硬编码：
  - [soul_onboarding_tool.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py#L31)
- 只写 core artifact，不直接写：
  - `speech_style`
  - `values_and_boundaries`
  - `relationship_stance`

而 runtime 读取这些字段时，需要其它 layer / override：
- [soul_bundle.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py#L40)

所以现在它更像“初始化一个 core summary”，不是“把 SoulBaseline 完整初始化完”。

---

### P2-3 `MemorySettingsPage` 仍然包含过时、机制化、与当前实现不完全一致的说明

**代码证据**

- “不会把一次聊天直接升级成长期人格或长期自动化”
  - [memory-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx#L45)

问题在于：

- 用户身份这条线现在已经支持聊天显式声明直写稳定层
- Soul onboarding prompt 也已经存在

但这个页面仍然在用机制化语言讲“治理链路”和“不会直接升级”，这和当前产品期望不一致，也容易误导用户对系统能力的理解。

---

### P2-4 `UserIdentityProfile` 的扩展字段只在类型和路由里存在，没有真正进入产品面和提取链

这些字段已经建模：

- `user_aliases`
- `user_role`
- `timezone`
- `interaction_boundaries`
- `long_term_background_summary`

参考：
- [models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/user_identity/models.py#L4)
- [types.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/user-identity/types.ts#L1)

路由也允许 patch 其中一部分：
- [user_identity.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/user_identity.py#L16)

但当前前端 `UserIdentityPanel` 只展示：

- `user_name`
- `preferred_address_for_user`
- `assistant_self_name`
- `communication_style_preferences`

参考：
- [user-identity-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/user-identity-panel.tsx#L23)

也没有看到提取链去写：

- `user_role`
- `timezone`
- `long_term_background_summary`
- `interaction_boundaries`

所以这些字段当前是“模型层存在，但业务层未落地”。

---

## 五、桌面运行态的额外风险

### P2-5 前端合同测试正在保护一部分错误产品形态

**结论**

当前前端不是“有些残留文案没删掉”，而是 **部分合同测试本身就在保护这些残留形态**。这会制造一种很危险的假象：

> 测试全绿，但产品面仍然是错的。

**代码证据**

`memory-user-page.contract.test.ts` 明确要求页面保留：

- “这条记错了”
- “别再记这个”
- “直接告诉我”

参考：
- [memory-user-page.contract.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.contract.test.ts#L5)

而页面本体也确实保留了这些纠错提示：
- [memory-user-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.tsx#L39)
- [memory-user-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-user-page.tsx#L55)

`memory-embedding-panel.contract.test.ts` 明确要求面板展示：

- `current provider mode`
- `download status`
- `active fingerprint`
- `index health`

参考：
- [memory-embedding-panel.contract.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts#L9)

这意味着“只读的 embedding 骨架面”当前被合同测试当成了正确形态。

`memory-settings-page.config.test.ts` 也明确要求保留：

- `onOpenDangerZone`
- `onDeleteFact`
- `ToggleGroup`
- `searchPlaceholder`

参考：
- [memory-settings-page.config.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.config.test.ts#L17)

而实际组件里也确实还有：

- `Search console`
- 清理/危险区入口
- 本地过滤和历史搜索控制台

参考：
- [memory-console-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-console-panel.tsx#L72)
- [memory-console-panel.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-console-panel.tsx#L96)

**为什么这是严重问题**

因为这不是“代码有坏味道但测试会提醒你”，而是：

- 代码有坏味道
- 测试还在帮它站台

这会直接误导后续开发者，以为前端产品面已经正确收口。

---

### P2-6 desktop-dev 验收链仍然不稳定

我在真实验收里观察到：

- `desktop-dev` 下 renderer 会出现 `Failed to load runtime profile: Failed to fetch`
- live daemon `43115` 的启动和存活具有时序噪音
- 直接起源码 daemon 并注册一个 client 后，路由又是可用的

这说明问题更像是：

- 桌面 dev 启动链 / 时序 / 保活
- 而不是 Memory / Soul 后端主链本身

参考前端代码：
- [chat-thread-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx#L67)

这里加载 runtime profile 失败时只是 `console.warn`，没有更稳的恢复或重试策略。

这不是当前 Memory/Soul 的核心逻辑 bug，但它会直接污染真实验收。

---

## 六、综合判断

### 已经算“落地”的

- 用户身份 owner
- 用户姓名 / 互称 / 沟通偏好的提取
- 用户身份 runtime 注入
- 用户身份设置页即时保存
- Soul 设置页即时保存

### 不能算“落地”的

- 向量数据库
- embedding 执行链
- 本地 embedding 模型下载
- 远端 embedding 真正调用链
- 聊天直接修改 `SoulBaseline`
- Memory 页面展示稳定身份记忆

### 不能算“稳定完成”的

- `UserIdentityPanel` 的多字段编辑体验
- `initialize_soul_profile`
- desktop-dev 下的 live 验收链

---

## 七、建议的下一轮建设顺序

### 第一批：把“伪完成”先变成“真完成”

1. 落地聊天直改 `SoulBaseline`
2. 把 `initialize_soul_profile` 改成真正写全 stable soul fields
3. 修 `UserIdentityPanel` 的未保存输入被重置问题
4. 把 `UserIdentityProfile` 投影到 `/workspace/memory`

### 第二批：决定向量系统到底是做还是删

现在最危险的是向量系统处于“看起来有”的状态。

只有两个理性选择：

1. **真的做完**
   - 选定 vector DB
   - 选定 embedding provider
   - 实现下载 / 配置 / 构建 / 查询 / rebuild
   - 接入 Memory OS 主检索链

2. **彻底删掉产品幻觉**
   - 删除 `MemoryEmbeddingPanel`
   - 删除 `/api/memory/settings` 的假活跃 provider snapshot
   - 删掉对外“好像有 embedding 系统”的表述

在它没完成之前，不应该继续把它当成“完整记忆系统的一部分”对外宣称。

### 第三批：收官桌面 live 验收

1. 固定 live daemon 启动链
2. 跑完整 Electron E2E：
   - 设置页改名字 / 互称 / 沟通偏好
   - 新线程回忆
   - 聊天改 Soul
   - 新线程继续生效

---

## 八、最终结论

> 当前系统已经不是“完全失控的海市蜃楼”，但它依然 **不是完整可交付的 Memory / Soul 系统**。

最大的原因不是“细节还差一点”，而是：

- 向量链根本没落地
- Soul 聊天修改没真正落地
- 记忆工作台还看不到最关键的稳定身份记忆

如果继续把现在的状态说成“完整记忆系统”，那是不实事求是。当前更准确的描述应该是：

> **用户身份层初步成形，Soul 设置页产品面已收口，但完整记忆系统仍未闭环。**
