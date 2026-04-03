# Memory OS Data Contracts

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第四篇。

它负责冻结：

- Memory OS 的核心数据对象
- 各对象的字段级合同
- artifact metadata 合同
- candidate queue / provenance log / access log 合同
- automation ownership / projection 合同
- 与当前 Nion 现有数据结构的映射关系

它**不**负责：

- 这些对象何时读写
- 这些对象如何在运行时流转
- 哪些动作需要审批

这些分别交给后续 `04` 和 `05`。

## 2. Inputs

本篇依赖：

- [01-memory-os-domain-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/01-memory-os-domain-model.md)
- [02-memory-os-business-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/02-memory-os-business-rules.md)
- [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)
- [backend/packages/harness/nion/memory_payloads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_payloads.py)
- [backend/packages/harness/nion/automation/models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py)
- [backend/packages/harness/nion/config/paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py)

## 3. Decisions

本篇冻结以下关键决策：

1. Memory OS 采用“结构化元数据 + artifact 文件 + 检索索引”的混合数据模型。
2. 所有长期 memory 都通过统一 `MemoryRecord` 表达，不再用 `memory.json` 作为 canonical runtime schema。
3. `recall`、`artifact`、`automation`、`knowledge projection` 继续允许拥有各自物理存储，但都要接入统一 metadata 层。
4. 所有写入都必须带 provenance。
5. `AutomationJob` 不重做，只扩展 owner/provenance/governance 字段。

## 4. 顶层对象清单

Memory OS 核心对象冻结为：

1. `MemoryRecord`
2. `MemoryArtifact`
3. `CandidateRecord`
4. `EvidenceLink`
5. `AccessLogEntry`
6. `ConsolidationEvent`
7. `AutomationProjection`
8. `LearningTopic`
9. `ProcedureRecord`
10. `SoulArtifactIndex`

## 5. Core Contract: MemoryRecord

## 5.1 定义

`MemoryRecord` 是所有 durable memory 的统一结构化元数据对象。

它不保存完整大正文，但必须能够：

- 表示它是什么
- 表示它属于谁
- 表示它何时有效
- 指向 artifact 或 evidence

## 5.2 字段合同

```json
{
  "memory_id": "mem_01H...",
  "domain": "user_model",
  "subtype": "communication_preference",
  "owner_type": "agent",
  "scope": "user",
  "memory_type": "semantic",
  "subject_id": "user:default",
  "target_id": "agent:main",
  "status": "active",
  "title": "用户偏好直接、结论先行表达",
  "summary": "用户更偏好直接、少铺垫、先给结论的回答风格。",
  "language": "zh-CN",
  "confidence": 0.91,
  "salience": 0.83,
  "freshness_score": 0.74,
  "source_count": 4,
  "source_refs": [
    "thread:abc#msg_14",
    "thread:def#msg_8"
  ],
  "artifact_uri": "nion://memory-os/artifacts/user-model/communication/mem_01H.md",
  "structured_payload": {
    "preference_kind": "communication_style",
    "preferred_style": ["direct", "conclusion_first"],
    "disliked_style": ["over_explaining"]
  },
  "created_at": "2026-04-04T10:00:00Z",
  "updated_at": "2026-04-05T10:00:00Z",
  "last_used_at": "2026-04-06T08:00:00Z",
  "valid_from": "2026-04-04T10:00:00Z",
  "invalid_at": null,
  "archived_at": null,
  "purged_at": null,
  "supersedes": [],
  "superseded_by": null,
  "provenance": {
    "source_type": "conversation",
    "generated_by": "consolidation_engine",
    "source_run_id": "cons_01H..."
  }
}
```

## 5.3 必填字段

`MemoryRecord` 的必填字段：

- `memory_id`
- `domain`
- `subtype`
- `owner_type`
- `scope`
- `memory_type`
- `subject_id`
- `status`
- `summary`
- `confidence`
- `source_refs`
- `created_at`
- `updated_at`
- `provenance`

## 5.4 可选字段

- `target_id`
- `title`
- `language`
- `salience`
- `freshness_score`
- `source_count`
- `artifact_uri`
- `structured_payload`
- `last_used_at`
- `valid_from`
- `invalid_at`
- `archived_at`
- `purged_at`
- `supersedes`
- `superseded_by`

## 5.5 字段约束

1. `domain` 必须属于 `01` 中冻结的 domain。
2. `owner_type` 必须属于 `user / agent / shared / system`。
3. `scope` 必须属于冻结 scope 集合。
4. `status` 必须属于冻结生命周期词汇。
5. `source_refs` 不能为空。
6. `artifact_uri` 可空，但对于 `soul / agent_self / learning / procedure` 通常不应为空。

## 6. MemoryArtifact Contract

## 6.1 定义

`MemoryArtifact` 是 artifact 文件的结构化索引对象。

它描述文件，不取代文件。

## 6.2 字段合同

```json
{
  "artifact_id": "art_01H...",
  "artifact_uri": "nion://memory-os/artifacts/agent-self/diary/2026/04/04/thread_abc.md",
  "domain": "agent_self",
  "artifact_kind": "diary_entry",
  "owner_type": "agent",
  "scope": "agent",
  "title": "2026-04-04 / thread_abc",
  "format": "markdown",
  "relative_path": "memory-os/artifacts/agent-self/diary/2026/04/04/thread_abc.md",
  "linked_memory_ids": ["mem_01H...", "mem_01J..."],
  "created_at": "2026-04-04T10:12:00Z",
  "updated_at": "2026-04-04T10:12:00Z",
  "checksum": "sha256:..."
}
```

## 6.3 artifact_kind 枚举

冻结为：

- `diary_entry`
- `reflection_note`
- `learning_plan`
- `learning_note`
- `procedure_draft`
- `procedure_approved`
- `soul_core`
- `soul_overlay`
- `soul_proposal`
- `postmortem`
- `user_model_note`

## 7. CandidateRecord Contract

## 7.1 定义

`CandidateRecord` 是 post-turn extraction 产生的候选项，不是长期 truth。

## 7.2 字段合同

```json
{
  "candidate_id": "cand_01H...",
  "proposed_domain": "user_model",
  "proposed_subtype": "work_profile",
  "owner_type": "agent",
  "scope": "user",
  "memory_type": "semantic",
  "summary": "用户似乎承担财务汇报职责。",
  "raw_evidence_refs": [
    "thread:abc#msg_14"
  ],
  "confidence": 0.68,
  "status": "candidate",
  "created_at": "2026-04-04T10:05:00Z",
  "expires_at": "2026-04-18T10:05:00Z",
  "producer": "post_turn_extractor"
}
```

## 7.3 规则

1. `CandidateRecord` 必须可过期。
2. `CandidateRecord` 必须能追到 raw evidence。
3. `CandidateRecord` 不允许直接被 prompt runtime 作为长期 truth 注入。

## 8. EvidenceLink Contract

## 8.1 定义

`EvidenceLink` 用来把 MemoryRecord / Candidate / Artifact 和原始证据连接起来。

## 8.2 字段合同

```json
{
  "link_id": "evi_01H...",
  "source_ref": "thread:abc#msg_14",
  "target_kind": "memory_record",
  "target_id": "mem_01H...",
  "relation": "supports",
  "created_at": "2026-04-04T10:06:00Z"
}
```

## 8.3 relation 枚举

- `supports`
- `contradicts`
- `supersedes`
- `derived_from`
- `projected_from`

## 9. AccessLogEntry Contract

## 9.1 定义

`AccessLogEntry` 记录 Memory OS 中高价值对象何时被谁读取、用于什么上下文。

## 9.2 字段合同

```json
{
  "access_id": "acc_01H...",
  "actor_type": "runtime",
  "actor_id": "lead_agent",
  "action": "context_assembly_read",
  "target_kind": "memory_record",
  "target_id": "mem_01H...",
  "thread_id": "thread_abc",
  "session_id": "sess_01H...",
  "reason": "answer_generation",
  "created_at": "2026-04-04T10:20:00Z"
}
```

## 9.3 action 枚举

- `context_assembly_read`
- `consolidation_read`
- `heartbeat_read`
- `ui_inspect`
- `user_feedback`
- `migration_import`

## 10. ConsolidationEvent Contract

## 10.1 定义

`ConsolidationEvent` 记录一次 candidate -> truth 的处理过程。

## 10.2 字段合同

```json
{
  "event_id": "cons_01H...",
  "input_candidate_ids": ["cand_01H...", "cand_01I..."],
  "affected_memory_ids": ["mem_01H..."],
  "action": "activate_and_invalidate_old",
  "notes": "新证据足以覆盖旧的沟通偏好记录。",
  "created_at": "2026-04-04T11:00:00Z",
  "executor": "heartbeat_daily"
}
```

## 10.3 action 枚举

- `activate`
- `merge`
- `invalidate`
- `archive`
- `purge`
- `activate_and_invalidate_old`
- `reject_candidate`

## 11. LearningTopic Contract

## 11.1 定义

`LearningTopic` 表示进入学习系统的主题对象。

## 11.2 字段合同

```json
{
  "topic_id": "learn_01H...",
  "title": "财务汇报与管理表达",
  "summary": "用户在财务汇报结构、管理表达、异常项描述上反复求助。",
  "status": "active",
  "score": 0.82,
  "signals": {
    "frequency": 6,
    "cross_session_count": 4,
    "user_value": 0.91,
    "transient_penalty": 0.08
  },
  "evidence_refs": ["thread:abc#msg_14", "mem_01H..."],
  "backlog_position": 2,
  "created_at": "2026-04-05T08:00:00Z",
  "updated_at": "2026-04-05T08:00:00Z"
}
```

## 12. ProcedureRecord Contract

## 12.1 定义

`ProcedureRecord` 是 procedure / skill draft 的结构化索引对象。

## 12.2 字段合同

```json
{
  "procedure_id": "proc_01H...",
  "title": "面向管理层的财务周报默认输出框架",
  "status": "candidate",
  "artifact_uri": "nion://memory-os/artifacts/procedures/drafts/proc_01H.md",
  "evidence_refs": ["art_01H...", "mem_01H..."],
  "usage_count": 0,
  "validation_count": 0,
  "created_at": "2026-04-05T09:00:00Z",
  "updated_at": "2026-04-05T09:00:00Z"
}
```

## 13. SoulArtifactIndex Contract

## 13.1 定义

`SoulArtifactIndex` 索引 soul 相关工件，不取代文件本体。

## 13.2 字段合同

```json
{
  "soul_id": "soul_overlay_01H...",
  "soul_kind": "adaptive_overlay",
  "artifact_uri": "nion://memory-os/artifacts/soul/adaptive/soul_overlay_01H.md",
  "status": "candidate",
  "evidence_refs": ["mem_01H...", "art_01J..."],
  "created_at": "2026-04-06T08:00:00Z",
  "updated_at": "2026-04-06T08:00:00Z"
}
```

## 14. AutomationProjection Contract

## 14.1 定义

`AutomationProjection` 是对现有 `AutomationJob` 的治理投影。

## 14.2 新增字段合同

在现有 [backend/packages/harness/nion/automation/models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py) 的 `AutomationJob` 上新增：

```python
owner_type: Literal["user", "agent"] = "user"
owner_id: str = "user:default"
mutability: Literal["editable", "pause_only"] = "editable"
provenance_memory_id: str | None = None
provenance_learning_id: str | None = None
retention_policy: dict[str, Any] = Field(default_factory=dict)
visible_in_ui: bool = True
policy_flags: dict[str, Any] = Field(default_factory=dict)
```

## 14.3 字段解释

- `owner_type`
  - 任务所有权
- `owner_id`
  - 所有者实例
- `mutability`
  - 用户是否可编辑正文
- `provenance_memory_id`
  - 这项任务从哪条 memory 推导而来
- `provenance_learning_id`
  - 是否由 learning topic 触发
- `retention_policy`
  - 任务长期保留策略
- `visible_in_ui`
  - 是否前台可见
- `policy_flags`
  - 风险等级、审批要求等

## 15. 物理存储映射

## 15.1 Metadata Store

建议物理层至少包含这些表：

- `memory_records`
- `memory_artifacts`
- `candidate_records`
- `evidence_links`
- `access_logs`
- `consolidation_events`
- `learning_topics`
- `procedure_records`
- `soul_artifact_index`

## 15.2 Artifact Store

artifact 文件继续走本地目录：

- `memory-os/artifacts/user-model/`
- `memory-os/artifacts/relationship/`
- `memory-os/artifacts/soul/`
- `memory-os/artifacts/agent-self/`
- `memory-os/artifacts/learning/`
- `memory-os/artifacts/procedures/`

## 15.3 Retrieval Store

物理上允许继续复用：

- `recall.sqlite3`
- OpenViking chunk store

但逻辑上都必须通过 Memory OS metadata 层引用。

## 16. 与当前 Nion 数据结构的映射

## 16.1 当前 `memory.json`

当前 [backend/packages/harness/nion/memory_payloads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_payloads.py) 里的：

- `user.workContext`
- `user.personalContext`
- `user.topOfMind`
- `history.*`
- `facts[]`

未来映射关系如下：

| 当前字段 | 未来映射 |
|---|---|
| `user.workContext.summary` | `user_model` domain 下的 semantic records + artifact summary |
| `user.personalContext.summary` | `user_model` / `relationship` 相关 records |
| `user.topOfMind.summary` | 更接近 short-term/user-focus artifact，不再作为唯一长期 truth |
| `history.*` | 拆成 recall evidence + user_model summaries + agent_self diary evidence |
| `facts[]` | 迁移为独立 `memory_records` |

## 16.2 当前 `AutomationJob`

当前 `AutomationJob` 继续保留现有执行字段。

Memory OS 只新增治理字段，不替换调度执行字段。

## 16.3 当前路径系统

当前 [backend/packages/harness/nion/config/paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py) 已有：

- `memory.json`
- `recall.sqlite3`
- `openviking/`
- `automation/`
- `agents/{name}/SOUL.md`

未来建议增补：

- `memory_os_dir`
- `memory_os_index_db_file`
- `memory_os_access_log_db_file`
- `memory_os_artifacts_dir`

## 17. Rules / Contracts

本篇冻结以下硬合同：

1. `MemoryRecord` 是所有长期 memory 的统一结构化表达。
2. `CandidateRecord` 与 `MemoryRecord` 必须分离。
3. `Artifact` 不是 metadata，metadata 也不取代 artifact。
4. 所有长期对象都必须可追踪 provenance。
5. `AutomationJob` 走增量扩展，不重做执行模型。

## 18. Impacts

本篇会直接约束：

- `04-memory-os-runtime-flows.md`
- `05-memory-os-governance-and-permissions.md`
- `06-memory-os-interaction-model.md`
- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 19. Open Questions

本篇仍未冻结的问题：

1. metadata store 的最终 SQL schema 是否按单表还是分表更细
2. `freshness_score` 和 `salience` 的计算公式
3. `visible_in_ui` 是否需要分 view scopes
4. `artifact_uri` 的协议规范是否要统一为 `nion://`
5. `AutomationProjection` 是否单独建表还是嵌入现有 automation storage

## 20. 结论

到这一篇为止，Memory OS 已经拥有一套可实现的数据合同。

后续的 runtime、governance、migration、implementation plan 都必须在这套合同上展开，而不是再发明一套新的对象模型。
