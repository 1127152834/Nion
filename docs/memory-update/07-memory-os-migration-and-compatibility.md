# Memory OS Migration And Compatibility

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第八篇。

它负责冻结：

- 从当前记忆系统迁移到 Memory OS 的兼容路径
- `memory.json`、`recall.sqlite3`、OpenViking、automation 的过渡策略
- 双写、导入、回滚、停止点

它**不**负责：

- 最终实施任务拆解
- 每个阶段的代码级文件清单

这些会留给 `09-memory-os-implementation-plan.md`。

## 2. Inputs

本篇依赖：

- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [04-memory-os-runtime-flows.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/04-memory-os-runtime-flows.md)
- [05-memory-os-governance-and-permissions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/05-memory-os-governance-and-permissions.md)
- [06-memory-os-interaction-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/06-memory-os-interaction-model.md)
- [current-memory-system-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/current-memory-system-audit.md)

## 3. Decisions

本篇冻结以下关键决策：

1. 迁移采用渐进式兼容，而不是一次性切断旧系统。
2. `memory.json` 在迁移期作为 legacy source 读取和导入来源存在，但不再是未来 canonical backend。
3. `recall.sqlite3` 与 OpenViking chunk store 在早期阶段直接复用，不重建。
4. automation runtime 继续复用，只补 owner/provenance/governance 字段。
5. 每一阶段必须有明确回滚点，不能“做了再说”。

## 4. 当前系统迁移对象

当前必须纳入迁移范围的对象：

1. `memory.json`
2. `agents/{name}/memory.json`
3. `SOUL.md`
4. `recall.sqlite3`
5. OpenViking notebook chunk store
6. automation jobs / runs

## 5. 迁移总原则

## 5.1 先加新层，再切旧层

迁移顺序必须是：

1. 先建立 Memory OS metadata / artifact 层
2. 再导入 legacy 数据
3. 再开始双写或桥接
4. 最后切掉旧 canonical path

## 5.2 不破坏用户当前主流程

在迁移期：

- 聊天仍应可用
- recall 仍应可用
- notebook retrieval 仍应可用
- automation 仍应可用

Memory OS 不能以“升级”为由中断主产品面。

## 5.3 导入先于替换

任何旧对象都必须：

- 先导入
- 再验证
- 最后才允许替换为新 canonical path

## 5.4 回滚优先于清理

在确认新路径稳定前：

- 不删除 legacy 物理数据
- 不立即关闭 legacy 读取能力

## 6. `memory.json` 迁移策略

## 6.1 当前角色

当前 `memory.json` 是：

- global structured memory
- prompt injection 来源

## 6.2 迁移后角色

迁移后 `memory.json` 变成：

- legacy import source
- debug / recovery reference

## 6.3 导入映射

| 旧对象 | 新对象 |
|---|---|
| `user.workContext.summary` | `user_model` records + summary artifact |
| `user.personalContext.summary` | `user_model` / `relationship` records |
| `user.topOfMind.summary` | `agent_self` or user-focus artifact，视规则迁移 |
| `history.recentMonths` | recall evidence + agent_self summary references |
| `history.earlierContext` | archived semantic records / summary artifacts |
| `history.longTermBackground` | `user_model.active` semantic records |
| `facts[]` | `MemoryRecord` rows |

## 6.4 迁移方式

### Phase A

- 只读导入，不写回 legacy

### Phase B

- 新写入走 Memory OS
- legacy 仅供兼容读取

### Phase C

- prompt 不再直接读取 `memory.json`

## 6.5 回滚方式

如果新 context assembly 异常：

- 临时回退到 legacy `memory.json` injection

## 7. `recall.sqlite3` 迁移策略

## 7.1 当前角色

- thread/global transcript recall
- continuity source

## 7.2 迁移后角色

- 继续保留为 recall physical store
- 通过 Memory OS metadata 层做统一索引/访问日志

## 7.3 原则

1. 早期不重建 recall store
2. 先补中文检索与访问观测
3. 后续若升级 hybrid retrieval，也基于现有数据渐进演化

## 7.4 回滚

如果 Memory OS recall bridge 异常：

- 直接回退到当前 continuity middleware 行为

## 8. OpenViking Chunk Store 迁移策略

## 8.1 当前角色

- notebook chunk retrieval substrate

## 8.2 迁移后角色

- 继续做 `knowledge_projection` physical layer

## 8.3 原则

1. 不迁移 notebook canonical body
2. 只在 metadata 层加 projection index / provenance bridge
3. 不在本阶段重做 chunk database

## 8.4 回滚

projection bridge 出问题时：

- 保持当前 notebook retrieval 直接走 OpenViking runtime retriever

## 9. Soul 迁移策略

## 9.1 当前角色

- `SOUL.md` 作为 prompt 注入来源

## 9.2 迁移后角色

- `SOUL.md` 内容导入为 `core_soul` artifact
- adaptive overlay 单独新增 artifact

## 9.3 原则

1. `SOUL.md` 先完整保留
2. 不在早期阶段拆散或重写原始 core content
3. overlay 只增量叠加，不改写 core soul 本体

## 9.4 回滚

overlay 异常时：

- 只回退到 core soul

## 10. Automation 迁移策略

## 10.1 当前角色

- durable jobs
- scheduling
- execution
- runs/status

## 10.2 迁移后角色

- 保持原有执行系统
- 新增 owner/provenance/governance 字段

## 10.3 原则

1. 不重做 scheduler
2. 不重做 executor
3. user-owned jobs 迁移时默认 `owner_type=user`
4. agent-owned jobs 只在新系统中出现，不回填旧 job 为 agent-owned，除非有明确 provenance

## 10.4 回滚

如果 ownership bridge 出问题：

- jobs 仍按现有 automation runtime 运转
- 新增治理字段可回退为只读忽略

## 11. 双写策略

## 11.1 哪些对象允许双写

允许双写：

- user-facing summaries
- user_model bridge summaries

不建议双写：

- diary artifacts
- soul overlays
- learning plans
- procedure drafts

原因：

- 这些对象在旧系统里没有等价结构

## 11.2 双写周期

双写只应存在于过渡窗口，不应长期保留。

## 12. 切换点定义

## 12.1 切换点 A：数据层就绪

满足：

- Memory OS metadata store 可读写
- artifact store 可写
- import tool 可运行

## 12.2 切换点 B：上下文层就绪

满足：

- context pack 可替代 `memory.json` injection
- recall / user_model / relationship / procedure 可统一读取

## 12.3 切换点 C：成长层就绪

满足：

- heartbeat 可运行
- diary / learning / procedure drafts 可形成闭环

## 12.4 切换点 D：治理层就绪

满足：

- user controls 可用
- agent-owned automation 有独立前台控制面

## 13. 回滚策略

## 13.1 Level 1 回滚

- 回退 context assembly 到 legacy memory injection
- 保留新 metadata 与 artifacts

## 13.2 Level 2 回滚

- 停掉 heartbeat
- 停掉 learning / soul / procedure background jobs
- 保留 recall 与 notebook retrieval

## 13.3 Level 3 回滚

- 完全回退到 legacy memory + recall + notebook retrieval 主链
- 新 Memory OS 层只保留数据，不参与运行时

## 14. Compatibility Rules

本篇冻结以下兼容规则：

1. 迁移期内 legacy 数据默认只增不删。
2. 任何新路径故障都必须能回到旧主链。
3. `memory.json` 的退出必须晚于 context assembly 的稳定。
4. OpenViking 与 automation 在早期阶段只桥接，不替换物理层。

## 15. Rules / Contracts

本篇冻结以下硬规则：

1. 迁移必须是渐进式，不允许一次性 cut-over。
2. legacy 数据必须先导入、验证，再替换。
3. recall / notebook / automation executor 本期不重做物理层。
4. Soul 的迁移采用 `core preserve + overlay add-on`，不改写 core。

## 16. Impacts

本篇会直接约束：

- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 17. Open Questions

本篇尚未冻结的问题：

1. `memory.json` 双写窗口是否需要真实存在，还是直接单写新层 + legacy read-only
2. recall 中文检索升级是在迁移前还是迁移中并行进行
3. soul overlay 是否需要独立版本表

## 18. 结论

到这一篇为止，Memory OS 的迁移策略已经冻结：不是推倒重来，而是通过桥接、导入、双写、回滚逐步替换 legacy 主链。
