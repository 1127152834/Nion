# Memory / Soul / UserIdentity Backend Strict Audit

日期：2026-04-11
范围：`backend` 主链严审
目标：核对 `Memory / Soul / UserIdentity` 后端主链的未落地点、伪完成点、半连接点

---

## 审查结论

当前后端不能被称为“完整的 Memory / Soul 系统”。

更准确的状态是：

1. `UserIdentity` 已经有独立 owner、路由和 runtime 注入。
2. `Soul Settings` 已经有稳定字段写入接口。
3. 但 `chat -> stable soul` 这条关键主路径并没有落地。
4. `runtime soul owner` 仍然分裂，不是文档承诺的单一权威入口。
5. `growth / reflection / heartbeat` 侧链仍然活着，且仍在推动 soul / learning / automation。
6. `vector / embedding` 目前基本是抽象骨架，不是可运行的向量检索系统。
7. `extraction -> candidate -> persistence` 仍然存在明显半连接，主链并没有真正打通。

结论不是“还有一些边角未打磨”，而是：

**当前系统已经补出了若干关键部件，但整体仍然是“局部落地 + 多条残余侧链 + 若干空骨架”的状态。**

---

## 审查方法

本次审查直接对照以下承诺与当前代码：

- `docs/superpowers/specs/2026-04-10-memory-soul-runtime-mainchain-design.md`
- `docs/superpowers/specs/2026-04-10-user-identity-memory-and-soul-interaction-design.md`
- `docs/superpowers/plans/2026-04-10-memory-soul-runtime-mainchain-implementation-plan.md`
- `docs/superpowers/plans/2026-04-10-user-identity-memory-and-soul-interaction-implementation-plan.md`

本次没有复用“测试名即事实”的偷懒方式，而是逐段核对：

- runtime assembly
- chat mutation
- extraction
- persistence
- growth / heartbeat / soul side chain
- vector / embedding skeleton

补充现场验证：

- `uv run python` 检查本机向量目录
- `rg` 检查 candidate 提交入口是否真的被生产链调用

现场结果：

- `base_dir = /Users/zhangtiancheng/.nion-data`
- `vector_dir = /Users/zhangtiancheng/.nion-data/memory-os/indexes/vector`
- `vector_dir_exists = False`
- `manifest_exists = False`
- 生产代码中没有发现 `extract_candidates_from_exchange()` 的实际调用方

---

## Findings

### Finding 1 · P0

**文档承诺“用户可通过聊天直接修改 stable soul 并立即生效”，但代码没有实现这条主路径。**

文档承诺：

- `stable soul` 可由“用户在聊天中明确要求修改时更新”
  - `docs/superpowers/specs/2026-04-10-memory-soul-runtime-mainchain-design.md:181-183`
  - `docs/superpowers/specs/2026-04-10-memory-soul-runtime-mainchain-design.md:222-233`
- `Soul 修改` 应支持“用户通过聊天明确提出时，可以直接改并立即生效”
  - `docs/superpowers/specs/2026-04-10-user-identity-memory-and-soul-interaction-design.md:318-332`

当前实现：

- 唯一的聊天前置写入 middleware 是 `UserIdentityMiddleware`
  - `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py:26-76`
- 这个 middleware 只处理三类 proposal：
  - `user_name`
  - `mutual_addressing`
  - `explicit_preference`
  - 见 `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py:55-76`
- extraction service 也只提取：
  - `user_name`
  - `mutual_addressing`
  - `explicit_preference`
  - `work_context`
  - `address_style`
  - `initiative_boundary`
  - `learning_topic_hint`
  - 见 `backend/packages/harness/nion/memory/extraction/service.py:26-57`
- 没有任何针对 `core_identity / speech_style / values_and_boundaries / relationship_stance` 的聊天提取器或 middleware。
- `patch_soul_setting_value()` / `apply_soul_settings()` 只在设置路由里被调用：
  - `backend/app/gateway/routers/memory_soul.py:56-74`
  - `backend/packages/harness/nion/memory/soul/console_service.py:60-153`

直接后果：

- 用户在聊天里说“以后你回答冷静一点”“你以后别那么热情”“以后关系上更克制一点”时，不会写入 stable soul。
- 当前系统能通过聊天改的是 `UserIdentityProfile`，不是 `SoulBaseline`。
- 这与本轮设计里“聊天是 soul 修改的一等主路径”的承诺直接冲突。

---

### Finding 2 · P1

**runtime soul owner 仍然分裂；`runtime_engine` 没有真正收敛到 `console_service` 这一单一权威读取入口。**

计划承诺：

- `build_soul_settings_payload()` 成为 stable soul 读取权威入口
  - `docs/superpowers/plans/2026-04-10-memory-soul-runtime-mainchain-implementation-plan.md`
- `runtime_engine` 不再重新推断 stable soul 字段

当前实现：

- `console_service` 自己读取四层 soul，并单独读取 `values_and_boundaries` override
  - `backend/packages/harness/nion/memory/soul/console_service.py:36-57`
  - `backend/packages/harness/nion/memory/soul/console_service.py:163-169`
- `runtime_engine/soul_bundle.py` 又重复了一遍读取逻辑：
  - 再次直接调用 `get_soul_layer_snapshot()`
  - 再次单独读取 `values_and_boundaries` override
  - 见 `backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py:18-47`
  - 见 `backend/packages/harness/nion/memory/runtime_engine/soul_bundle.py:57-70`

这意味着：

- `Settings > Soul` 的读取权威入口和 runtime 的读取权威入口不是同一个函数。
- 两边现在只是“恰好读出了类似结果”，不是结构上真正合一。
- 后续一旦某个字段格式、override 规则、默认值策略变动，这里会再次漂移。

这不是抽象洁癖，而是明确的主链违约：

**文档要的是 single owner；代码现在是 duplicated owner。**

---

### Finding 3 · P1

**被设计明确禁止的 `heartbeat / reflection / growth orchestrator` 自动推进链仍然活着，而且仍然会投影出 learning / procedure / automation。**

文档承诺：

- stable soul 不允许由 `heartbeat / reflection / growth orchestrator / repeated needs` 自动写入
  - `docs/superpowers/specs/2026-04-10-memory-soul-runtime-mainchain-design.md:181-183`
  - `docs/superpowers/specs/2026-04-10-memory-soul-runtime-mainchain-design.md:227-233`

当前实现：

- `MemoryOSHeartbeat.run_micro_cycle()` 仍然直接调用 `run_growth_orchestrator()`
  - `backend/packages/harness/nion/memory_os/heartbeat.py:21-42`
- `run_growth_orchestrator()` 先跑 `reflect_soul_growth()`，再在 `overlay_updated` 时继续创建 learning topic 并投影 procedure / automation
  - `backend/packages/harness/nion/memory_os/growth_orchestrator.py:12-60`
- `reflect_soul_growth()` 仍然根据 repeated needs 自动刷新或续期 `adaptive_overlay`
  - `backend/packages/harness/nion/memory_os/soul_reflection.py:11-114`

这里要注意两层问题：

1. `adaptive_overlay` 自动变化本身并不违规，设计允许。
2. 但 `overlay_updated -> learning_created -> procedure_created -> automation_projected` 这条自动投影链仍然存在。

也就是说：

- soul 仍然在驱动 growth side effects
- growth 仍然不是纯 internal skeleton，而是实际业务投影链

这与前面几轮审查明确否定的“growth_orchestrator -> soul -> learning/procedure/automation 主链”没有本质切断，只是把对象从 stable soul 收缩到了 overlay。

---

### Finding 4 · P1

**vector / embedding 目前不是“未完全优化”，而是“只有协议层和设置页元数据，没有真正可运行的向量检索实现”。**

当前存在的只有抽象：

- `EmbeddingProvider` 是 `Protocol`
  - `backend/packages/harness/nion/memory/embedding/provider.py:51-58`
- `VectorStore` 是 `Protocol`
  - `backend/packages/harness/nion/memory/embedding/vector_store.py:68-88`
- `local_managed / remote_managed / custom_compatible` 只有 metadata class
  - `backend/packages/harness/nion/memory/embedding/local_managed.py`
  - `backend/packages/harness/nion/memory/embedding/remote_managed.py`
  - `backend/packages/harness/nion/memory/embedding/custom_compatible.py`

缺失的生产实现：

- 没有真实 `EmbeddingProvider` 实现类
- 没有真实 `VectorStore` 实现类
- 没有模型下载器
- 没有向量索引 builder
- 没有 chunk embedding 生成逻辑
- 没有 vector query 生产路径

设置页现在做的事只是：

- 伪造默认 provider：`bge-m3`
  - `backend/app/gateway/routers/memory_settings.py:16-23`
- 检查 `manifest.json` 是否存在
  - `backend/app/gateway/routers/memory_settings.py:26-36`
- 如果有 manifest，就把状态显示成 `ready`
  - `backend/app/gateway/routers/memory_settings.py:59-78`
  - `backend/app/gateway/routers/memory_settings.py:81-96`

这不是“向量能力已接入”，只是“UI 在展示一个本该存在的向量能力快照”。

现场验证也支持这个结论：

- `/Users/zhangtiancheng/.nion-data/memory-os/indexes/vector` 不存在
- `manifest.json` 不存在

因此当前 `Memory Settings` 里的向量能力状态，本质上仍是骨架态，不是实际系统能力。

---

### Finding 5 · P1

**`extraction -> candidate -> persistence` 主链没有真正接入生产路径；现在的 Memory OS candidate 体系基本是半连接。**

当前代码的结构是：

- `extract_candidates_from_exchange()` 可以把消息转成 `CandidateRecord`
  - `backend/packages/harness/nion/memory_os/extractor.py:18-84`
- `MemoryOSCandidateQueue.push()` 可以存 candidate
  - `backend/packages/harness/nion/memory_os/candidates.py`
- `MemoryOSConsolidationEngine.run_once()` 可以把 candidate 粗暴落成 memory record
  - `backend/packages/harness/nion/memory_os/consolidation.py:14-55`
- `MemoryOSHeartbeat.run_micro_cycle()` 会读取 candidate 并 consolidation
  - `backend/packages/harness/nion/memory_os/heartbeat.py:21-42`

但生产调用检查结果是：

- 没有任何地方实际调用 `extract_candidates_from_exchange()`
- 没有任何地方把 extractor 产物 `push()` 进 `MemoryOSCandidateQueue`
- `MemoryMiddleware.after_agent()` 即使还在，也被 `primary_path_enabled` 硬禁用
  - `backend/packages/harness/nion/agents/middlewares/memory_middleware.py:228-238`

这意味着：

- candidate queue / consolidation / heartbeat 这条链存在
- 但真实对话并不会把 candidate 放进去
- 所以这是一条“后半截还在转、前半截没接上”的死链

进一步的问题是：

- `UserIdentityMiddleware` 直接绕过了 candidate / consolidation / Memory OS canonical 流程，改写的是单独 JSON profile
  - `backend/packages/harness/nion/agents/middlewares/user_identity_middleware.py:32-46`

所以现在不是“链路统一”，而是：

1. 一条直写 `user_identity.json`
2. 一条未接入生产的 `Memory OS candidate -> consolidation`

这正是典型半连接。

---

### Finding 6 · P1

**`UserIdentityProfile` 和 Memory OS 持久化仍是双轨；没有形成一个真正闭环的稳定事实层。**

当前 `UserIdentityProfile` 存在于独立 JSON 文件：

- `backend/packages/harness/nion/user_identity/repository.py:9-32`

runtime 也是直接读取这个 JSON：

- `backend/packages/harness/nion/user_identity/runtime.py`

但 extraction / Memory OS 侧同时还在把同类事实映射成：

- `user_model.identity_name`
- `relationship.mutual_addressing`
- `user_model.communication_preference`
  - `backend/packages/harness/nion/memory_os/extractor.py:61-69`

问题在于两边没有同步机制：

- `PATCH /api/user-identity` 不会回写 Memory OS records
- `UserIdentityMiddleware` 不会回写 Memory OS records
- candidate consolidation 也不会回写 `user_identity.json`

因此当前系统里至少有两个“长期身份事实承载面”：

1. `user_identity.json`
2. Memory OS `user_model / relationship` records

这会带来三个后果：

- runtime 看到的身份事实，与 Memory 页面能否看到同一份事实，不再有结构保证
- 以后如果某条链只更新一边，就会形成事实漂移
- 审计、证据、溯源会继续分裂

如果这是临时迁移态，文档里需要明确写出迁移边界；如果不是迁移态，那它就是未完成架构。

---

### Finding 7 · P2

**proposal / governance / legacy growth 语义并没有真正退场，只是从公开产品面退到了内部代码。**

当前仍然可见：

- `MemoryProposal` 仍是 extraction 的基础类型
  - `backend/packages/harness/nion/memory/extraction/models.py:27-37`
- `judge_memory_proposals()` 仍在运行 proposal 判决模型
  - `backend/packages/harness/nion/memory/judge/service.py:9-49`
- `apply_memory_governance_decision()` 仍在运行 accept / reject / defer / reinforce 语义
  - `backend/packages/harness/nion/memory/governance/service.py:8-112`
- `compat.py` 仍然保留 `soul_proposals`
  - `backend/packages/harness/nion/memory_os/compat.py:467-488`

这条 finding 不是说这些代码现在都在主路径上被调用，而是说：

- 当前仓库还没有把“proposal 语义彻底退休”做到底
- 它们仍然是可见、可继续被误用、可再次回流的状态

在这轮项目里，这属于“伪完成风险”而不是纯死代码噪音。

---

## 其他观察

### 1. `compile_soul_runtime()` 仍保留

- 文件：`backend/packages/harness/nion/memory_os/soul_runtime.py`

当前 `prompt` 和 `continuity` 已不再直接使用它，这是对的。
但它仍保留为一条独立 soul runtime 拼装入口，并继续被测试保护。

这说明运行时主链虽然“主路径改了”，但旧 runtime soul 装配器没有真正退休。

### 2. `consolidation` 仍是粗暴激活模型

- 文件：`backend/packages/harness/nion/memory_os/consolidation.py:18-54`

它只是把 candidate 直接写成 active memory record：

- 没有 canonical key
- 没有 conflict handling
- 没有 dedupe
- 没有 revision / decision / evidence owner 约束

这更像占位实现，不像可承接长期记忆主链的正式 consolidator。

### 3. `values_and_boundaries` 仍是 soul_core override 的特殊分叉

- 运行时读取一套 override 逻辑
- 设置页读取又一套 override 逻辑

这说明 soul 四字段其实并没有完全统一到同一层级的数据模型。

---

## 最终判断

如果按“是否可称为完整的记忆系统与灵魂系统”来判断，当前答案是：

**不能。**

更精确的判断是：

1. `UserIdentity` 的基础 owner、router、runtime 注入已经落地。
2. `Soul Settings` 的设置页写入也已经落地。
3. 但真正决定系统是否可信的几条主链仍未完成：
   - chat -> stable soul
   - extraction -> candidate -> persistence
   - vector / embedding -> real retrieval
   - single runtime soul owner
   - retirement of growth / proposal / legacy side chains

所以当前系统的真实状态不是“完成”，而是：

**“第一层产品可见能力做出来了，但底层记忆/灵魂主链仍然存在结构性未完成项。”**

---

## 必须补建的内容

### 第一优先级

1. 为 `Soul` 增加与 `UserIdentityMiddleware` 对等的聊天直写链。
2. 把 runtime soul 读取权威统一到一个 owner，不再双份实现。
3. 切断 `overlay_updated -> learning / procedure / automation` 自动投影链。
4. 决定 `UserIdentityProfile` 与 Memory OS 的唯一事实归属，并打通同步闭环。

### 第二优先级

5. 把 candidate 真实接入生产写链，或者删除这条半连接体系。
6. 退休 `compile_soul_runtime()`、legacy growth / proposal 残余语义。
7. 重新设计正式 consolidation，而不是继续沿用当前占位激活器。

### 第三优先级

8. 如果向量检索要保留，就必须补完：
   - provider implementation
   - model download / remote call
   - index build
   - evidence chunk embedding
   - vector query
   - runtime integration
9. 如果这一期不做向量检索，就应删除或明确降级这些伪完成设置面，避免继续制造“已实现”的错觉。

