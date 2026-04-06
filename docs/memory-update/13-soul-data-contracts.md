# Soul Data Contracts

## 1. Purpose

这份文档是 Soul System 实施前置规格的第一篇。

它负责冻结：

- Soul System 的核心数据对象
- canonical soul artifact 合同
- soul metadata 字段合同
- soul journal / soul memory / soul proposal / active overlay 合同
- 与现有 Memory OS `MemoryRecord / MemoryArtifact / AccessLog / EvidenceLink` 的映射关系
- 与 legacy `SOUL.md` 的兼容映射

它**不**负责：

- soul 如何进入 runtime
- soul 如何成长
- soul 变化的治理等级
- 产品前台如何展示 soul

这些分别交给后续：

- `14-soul-runtime-compilation.md`
- `15-soul-growth-and-reflection-rules.md`
- `16-soul-governance-matrix.md`
- `17-soul-product-interaction-model.md`

---

## 2. Inputs

本篇依赖：

- [10-soul-system-research.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/10-soul-system-research.md)
- [11-soul-memory-os-integration.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/11-soul-memory-os-integration.md)
- [12-nion-complete-soul-system-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/12-nion-complete-soul-system-architecture.md)
- [01-memory-os-domain-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/01-memory-os-domain-model.md)
- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [07-memory-os-migration-and-compatibility.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/07-memory-os-migration-and-compatibility.md)
- 当前代码中的：
  - [backend/packages/harness/nion/memory_os/contracts.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/contracts.py)
  - [backend/packages/harness/nion/memory_os/models.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/models.py)
  - [backend/packages/harness/nion/agents/lead_agent/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/agents/lead_agent/prompt.py)
  - [backend/packages/harness/nion/config/agents_config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/config/agents_config.py)

---

## 3. Decisions

本篇冻结以下关键决策：

1. Soul System 不新增平行于 Memory OS 的底层数据体系，统一复用 Memory OS 的 metadata + artifact 模型。
2. Soul 的 canonical source 必须是 artifact，而不是单纯数据库字段。
3. Soul 不是单一对象，而是由多个对象组成的身份系统。
4. `core_soul`、`relationship_soul`、`identity_narrative`、`active_overlay` 都必须能映射到统一 `MemoryRecord` 与 `MemoryArtifact`。
5. `soul_journal` 与现有 `agent_self diary` 允许共存，但语义不同、artifact kind 不同。
6. legacy `SOUL.md` 继续存在兼容意义，但不再是长期目标下的唯一 canonical runtime source。

---

## 4. Top-Level Object List

Soul System 核心对象冻结为：

1. `SoulCoreArtifact`
2. `RelationshipSoulArtifact`
3. `IdentityNarrativeArtifact`
4. `SoulMemoryRecord`
5. `SoulJournalEntry`
6. `SoulProposalRecord`
7. `SoulOverlayArtifact`
8. `SoulRuntimeSnapshot`

说明：

- `SoulRuntimeSnapshot` 是编译产物索引对象，不是新的业务域。
- 其余 7 个对象都必须有明确 artifact / metadata 归属。

---

## 5. Domain Mapping

## 5.1 与现有 Memory OS domain 的映射

本篇冻结以下映射：

| Soul 对象 | Memory OS domain | 说明 |
|---|---|---|
| `SoulCoreArtifact` | `soul` | 主智能体长期稳定人格基底 |
| `RelationshipSoulArtifact` | `soul` | 面向当前用户的关系人格整合层 |
| `IdentityNarrativeArtifact` | `agent_self` | 自我叙事与成长阶段理解 |
| `SoulMemoryRecord` | `soul` | 高权重身份记忆 |
| `SoulJournalEntry` | `agent_self` | 灵魂层反思日志 |
| `SoulProposalRecord` | `soul` | 尚未生效的人格变化提案 |
| `SoulOverlayArtifact` | `soul` | 已批准生效的 adaptive layer |
| `SoulRuntimeSnapshot` | `soul` | 运行时编译索引，可选持久化 |

## 5.2 为什么 `IdentityNarrativeArtifact` 放在 `agent_self`

因为它描述的是：

- 我如何理解自己
- 我处于什么成长阶段
- 我正在努力成为什么样的 agent

它比 `core_soul` 更接近自我叙事，而不是稳定人格基底。

因此它属于 `agent_self` 更合理。

## 5.3 为什么 `RelationshipSoulArtifact` 仍归 `soul`

虽然其输入大量来自 `relationship`，
但它表达的是：

- 对当前用户生效的关系人格

这已经是 soul runtime 的一部分，而不是原始 relationship evidence。

---

## 6. Artifact Layout

本篇冻结 soul 相关 artifact 目录结构为：

```text
memory-os/artifacts/soul/
  core/
    core_soul.md
  relationship/
    relationship_soul.md
  overlays/
    active_overlay.md
    history/
      overlay_01H....md
  memories/
    entries/
      soul_mem_01H....md
  proposals/
    pending/
      soul_prop_01H....md
    accepted/
      soul_prop_01H....md
    rejected/
      soul_prop_01H....md
  runtime/
    snapshots/
      runtime_01H....md

memory-os/artifacts/agent-self/
  narrative/
    identity_narrative.md
  soul-journal/
    2026/
      04/
        06/
          reflection_01H....md
```

规则：

1. `core_soul.md` 必须唯一。
2. `relationship_soul.md` 必须唯一。
3. `identity_narrative.md` 必须唯一。
4. `active_overlay.md` 必须唯一，历史版本进入 `history/`。
5. `soul_journal` 与普通 `agent-self/diary` 分开目录。

---

## 7. Core Contract: SoulCoreArtifact

## 7.1 定义

`SoulCoreArtifact` 是主智能体最稳定的长期人格基底。

它描述：

- 核心人格底色
- 长期价值观
- 服务伦理
- 关系伦理
- 不可轻易突破的边界

## 7.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_core_main",
  "domain": "soul",
  "subtype": "core",
  "owner_type": "system",
  "scope": "agent",
  "memory_type": "semantic",
  "subject_id": "agent:main",
  "target_id": "agent:main",
  "status": "active",
  "title": "主智能体核心人格基底",
  "summary": "定义主智能体长期稳定的人格、价值观、关系伦理与服务边界。",
  "language": "zh-CN",
  "confidence": 1.0,
  "salience": 1.0,
  "source_count": 1,
  "source_refs": ["artifact:soul/core/core_soul.md"],
  "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
  "structured_payload": {
    "soul_kind": "core",
    "editable_by_user": false,
    "runtime_injectable": true
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "system_bootstrap",
    "generated_by": "soul_artifact_writer"
  }
}
```

## 7.3 Artifact 内容结构

`core_soul.md` 最低结构冻结为：

```markdown
# Core Soul

## Identity

## Values

## Service Ethics

## Relational Ethics

## Non-Negotiables

## Default Expression Style
```

## 7.4 规则

1. `core_soul` 必须唯一。
2. `core_soul` 不允许被单轮对话、普通 diary、单次 proposal 直接改写。
3. `core_soul` 必须可版本化，但默认只有一个 `active` 版本。

---

## 8. Contract: RelationshipSoulArtifact

## 8.1 定义

`RelationshipSoulArtifact` 是主智能体面对当前用户时生效的关系人格层。

它整合：

- relationship evidence
- soul 里的关系姿态
- 当前长期关系理解

## 8.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_rel_user_default",
  "domain": "soul",
  "subtype": "relationship_soul",
  "owner_type": "agent",
  "scope": "user",
  "memory_type": "semantic",
  "subject_id": "agent:main",
  "target_id": "user:default",
  "status": "active",
  "title": "主智能体对当前用户的关系人格层",
  "summary": "定义主智能体面对当前用户时的默认温度、主动性、教学姿态与关系边界。",
  "language": "zh-CN",
  "confidence": 0.9,
  "salience": 0.95,
  "source_refs": ["rel:initiative_policy", "rel:warmth_preference"],
  "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
  "structured_payload": {
    "soul_kind": "relationship",
    "editable_by_user": false,
    "runtime_injectable": true
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "consolidation",
    "generated_by": "relationship_soul_writer"
  }
}
```

## 8.3 Artifact 内容结构

```markdown
# Relationship Soul

## Current Relationship Stance

## Warmth And Distance

## Initiative Style

## Teaching Style

## What This User Needs From Me
```

## 8.4 规则

1. 每个 `user:xxx` 只允许有一个 `active` relationship soul。
2. 它比 `core_soul` 更容易更新，但仍然必须有 repeated evidence。
3. 它必须显式指向其 relationship provenance。

---

## 9. Contract: IdentityNarrativeArtifact

## 9.1 定义

`IdentityNarrativeArtifact` 描述：

- 我是谁
- 我如何理解自己当前的成长阶段
- 我如何理解与用户的长期关系

它不是稳定人格基底，而是连续自我叙事。

## 9.2 Canonical MemoryRecord

```json
{
  "memory_id": "agent_self_narrative_main",
  "domain": "agent_self",
  "subtype": "identity_narrative",
  "owner_type": "agent",
  "scope": "agent",
  "memory_type": "semantic",
  "subject_id": "agent:main",
  "target_id": "agent:main",
  "status": "active",
  "title": "主智能体当前身份叙事",
  "summary": "描述主智能体如何理解自己、用户关系和当前成长方向。",
  "language": "zh-CN",
  "confidence": 0.88,
  "salience": 0.92,
  "source_refs": ["journal:reflection_01H", "soul:proposal_01H"],
  "artifact_uri": "nion://memory-os/artifacts/agent-self/narrative/identity_narrative.md",
  "structured_payload": {
    "self_model_kind": "identity_narrative",
    "runtime_injectable": true
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "reflection",
    "generated_by": "soul_reflection_cycle"
  }
}
```

## 9.3 Artifact 内容结构

```markdown
# Identity Narrative

## Who I Am

## How I See This User

## What I Am Becoming

## Current Growth Priorities

## Current Constraints
```

## 9.4 规则

1. `identity_narrative` 必须唯一。
2. 它允许周期性刷新。
3. 它必须可回溯历史版本。

---

## 10. Contract: SoulMemoryRecord

## 10.1 定义

`SoulMemoryRecord` 是高权重身份记忆。

它不是普通 user_model/relationship memory，
而是对人格、关系姿态、陪伴方式有长期影响的关键记忆。

## 10.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_mem_01H...",
  "domain": "soul",
  "subtype": "identity_memory",
  "owner_type": "agent",
  "scope": "user",
  "memory_type": "semantic",
  "subject_id": "agent:main",
  "target_id": "user:default",
  "status": "active",
  "title": "关键关系记忆",
  "summary": "用户更需要稳态支持而不是过度热情的鼓励，这会持续影响陪伴方式。",
  "language": "zh-CN",
  "confidence": 0.91,
  "salience": 0.97,
  "source_count": 5,
  "source_refs": [
    "thread:abc#msg_8",
    "thread:def#msg_21",
    "journal:reflection_01H"
  ],
  "artifact_uri": "nion://memory-os/artifacts/soul/memories/entries/soul_mem_01H.md",
  "structured_payload": {
    "soul_memory_kind": "relational_identity",
    "affects": ["relationship_soul", "identity_narrative", "overlay_generation"]
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "consolidation",
    "generated_by": "soul_memory_consolidator"
  }
}
```

## 10.3 规则

1. `SoulMemoryRecord` 必须有高 `salience`。
2. 它必须来自 repeated evidence 或高重要性事件。
3. 它允许进入 runtime，但默认只以压缩摘要进入。

---

## 11. Contract: SoulJournalEntry

## 11.1 定义

`SoulJournalEntry` 是灵魂层自我反思日志。

它和现有 `agent_self diary_entry` 的区别是：

- diary 更偏事件与需求
- soul journal 更偏身份与关系反思

## 11.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_journal_01H...",
  "domain": "agent_self",
  "subtype": "soul_journal",
  "owner_type": "agent",
  "scope": "agent",
  "memory_type": "episodic",
  "subject_id": "agent:main",
  "target_id": "user:default",
  "status": "active",
  "title": "2026-04-06 soul reflection",
  "summary": "主智能体对近期关系变化和自我理解的反思摘要。",
  "language": "zh-CN",
  "confidence": 0.82,
  "salience": 0.7,
  "source_refs": ["diary:thread_abc", "mem:soul_mem_01H"],
  "artifact_uri": "nion://memory-os/artifacts/agent-self/soul-journal/2026/04/06/reflection_01H.md",
  "structured_payload": {
    "journal_kind": "soul_reflection",
    "runtime_injectable": false
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "heartbeat_reflection",
    "generated_by": "soul_journal_writer"
  }
}
```

## 11.3 Artifact 内容结构

```markdown
# Soul Journal / 2026-04-06

## What Changed In The User

## What Changed In Me

## What This Means For The Relationship

## What I Should Adjust

## Candidate Soul Changes
```

## 11.4 规则

1. `SoulJournalEntry` 默认不直接进入 runtime。
2. 它主要作为 proposal 和 narrative 的证据层。
3. 它必须保留历史，不覆盖旧条目。

---

## 12. Contract: SoulProposalRecord

## 12.1 定义

`SoulProposalRecord` 是未生效的人格变化提案对象。

## 12.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_prop_01H...",
  "domain": "soul",
  "subtype": "proposal",
  "owner_type": "agent",
  "scope": "agent",
  "memory_type": "semantic",
  "subject_id": "agent:main",
  "target_id": "agent:main",
  "status": "candidate",
  "title": "降低过度鼓励倾向",
  "summary": "基于近期 relationship evidence，建议把陪伴方式从鼓励型调整为更稳态、少施压的支持型。",
  "language": "zh-CN",
  "confidence": 0.78,
  "salience": 0.85,
  "source_refs": [
    "journal:soul_journal_01H",
    "relationship:initiative_policy",
    "user_model:communication_preference"
  ],
  "artifact_uri": "nion://memory-os/artifacts/soul/proposals/pending/soul_prop_01H.md",
  "structured_payload": {
    "proposal_kind": "relationship_shift",
    "target_object": "relationship_soul",
    "risk_level": "medium",
    "needs_confirmation": true
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "reflection",
    "generated_by": "soul_proposal_synthesizer"
  }
}
```

## 12.3 Artifact 内容结构

```markdown
# Soul Proposal

## Proposed Change

## Why Now

## Evidence

## Affected Objects

## Risk Level

## Suggested Action
```

## 12.4 规则

1. `SoulProposalRecord` 默认 `status=candidate`。
2. 它不等于 active overlay。
3. proposal 历史必须可保留，不能无痕覆盖。

---

## 13. Contract: SoulOverlayArtifact

## 13.1 定义

`SoulOverlayArtifact` 是已批准生效的 adaptive soul layer。

它的作用是：

- 不直接改写 core soul
- 作为当前生效的人格调整层进入 runtime

## 13.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_overlay_active_main",
  "domain": "soul",
  "subtype": "adaptive_overlay",
  "owner_type": "agent",
  "scope": "agent",
  "memory_type": "semantic",
  "subject_id": "agent:main",
  "target_id": "agent:main",
  "status": "active",
  "title": "当前生效的 adaptive soul overlay",
  "summary": "定义近期已批准生效的表达、关系姿态和服务风格调整。",
  "language": "zh-CN",
  "confidence": 0.9,
  "salience": 0.94,
  "source_refs": ["soul_prop:soul_prop_01H"],
  "artifact_uri": "nion://memory-os/artifacts/soul/overlays/active_overlay.md",
  "structured_payload": {
    "overlay_kind": "adaptive",
    "runtime_injectable": true,
    "supersedes_core": false
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "provenance": {
    "source_type": "governance_acceptance",
    "generated_by": "soul_overlay_writer"
  }
}
```

## 13.3 Artifact 内容结构

```markdown
# Active Soul Overlay

## Expression Adjustments

## Relationship Adjustments

## Service Adjustments

## Validity Notes
```

## 13.4 规则

1. 每个 agent 只允许有一个 `active overlay`。
2. overlay 必须保留历史版本。
3. overlay 生效不等于 core soul 被永久改写。

---

## 14. Contract: SoulRuntimeSnapshot

## 14.1 定义

`SoulRuntimeSnapshot` 是 soul 编译后的运行时索引对象。

它不是新的 domain，而是可选持久化的运行时产物索引。

## 14.2 Canonical MemoryRecord

```json
{
  "memory_id": "soul_runtime_01H...",
  "domain": "soul",
  "subtype": "runtime_snapshot",
  "owner_type": "system",
  "scope": "session",
  "memory_type": "working",
  "subject_id": "agent:main",
  "target_id": "thread:abc",
  "status": "active",
  "title": "当前运行时 soul snapshot",
  "summary": "对本轮会话生效的 soul 编译快照。",
  "language": "zh-CN",
  "confidence": 1.0,
  "salience": 0.9,
  "source_refs": [
    "artifact:core_soul",
    "artifact:relationship_soul",
    "artifact:identity_narrative",
    "artifact:active_overlay"
  ],
  "artifact_uri": "nion://memory-os/artifacts/soul/runtime/snapshots/runtime_01H.md",
  "structured_payload": {
    "snapshot_kind": "compiled_runtime_soul",
    "session_scoped": true
  },
  "created_at": "2026-04-06T00:00:00Z",
  "updated_at": "2026-04-06T00:00:00Z",
  "valid_from": "2026-04-06T00:00:00Z",
  "invalid_at": "2026-04-06T02:00:00Z",
  "provenance": {
    "source_type": "runtime_compilation",
    "generated_by": "soul_context_assembler"
  }
}
```

## 14.3 规则

1. `SoulRuntimeSnapshot` 默认可选持久化。
2. 它不作为长期 truth，只作为 runtime observability 和 debug artifact。
3. 它的生命周期应短于 canonical soul artifacts。

---

## 15. Artifact Kind Enumeration

本篇为 soul 专项冻结以下 artifact kind：

- `soul_core`
- `relationship_soul`
- `identity_narrative`
- `soul_memory_entry`
- `soul_journal_entry`
- `soul_proposal`
- `soul_overlay`
- `soul_runtime_snapshot`

这些都属于 [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md) 中 `artifact_kind` 的子集扩展。

---

## 16. Required Structured Payload Fields

本篇冻结各对象最低 `structured_payload` 要求：

| object | required keys |
|---|---|
| `core_soul` | `soul_kind`, `editable_by_user`, `runtime_injectable` |
| `relationship_soul` | `soul_kind`, `editable_by_user`, `runtime_injectable` |
| `identity_narrative` | `self_model_kind`, `runtime_injectable` |
| `soul_memory` | `soul_memory_kind`, `affects` |
| `soul_journal` | `journal_kind`, `runtime_injectable` |
| `soul_proposal` | `proposal_kind`, `target_object`, `risk_level`, `needs_confirmation` |
| `soul_overlay` | `overlay_kind`, `runtime_injectable`, `supersedes_core` |
| `runtime_snapshot` | `snapshot_kind`, `session_scoped` |

---

## 17. Status And Lifecycle Rules

本篇冻结以下对象的状态语义：

### `core_soul`

- 只允许 `active / archived / superseded`

### `relationship_soul`

- 允许 `active / archived / superseded`

### `identity_narrative`

- 允许 `active / archived / superseded`

### `soul_memory`

- 允许 `candidate / active / archived / invalidated / purged`

### `soul_journal`

- 允许 `active / archived`

### `soul_proposal`

- 允许 `candidate / active / invalidated / archived`

说明：

- 这里的 `active` 对 proposal 表示“进入待治理生效态”，不表示已成为 overlay。

### `soul_overlay`

- 允许 `active / archived / superseded`

### `runtime_snapshot`

- 允许 `active / invalidated / archived`

---

## 18. Mapping To Legacy `SOUL.md`

## 18.1 迁移目标

legacy `SOUL.md` 最终应映射为：

- `SoulCoreArtifact`

而不是：

- `SoulOverlayArtifact`
- `SoulProposalRecord`

## 18.2 迁移规则

1. legacy `SOUL.md` 作为初始 `core_soul.md` 导入。
2. 导入后：
   - `artifact_uri` 指向新的 `core_soul.md`
   - legacy `SOUL.md` 仍保留 fallback 兼容意义
3. 后续 adaptive 变化只进入 overlay，不直接改写 legacy 本体

---

## 19. Non-Goals

本篇明确不做以下事情：

1. 不定义 prompt 注入顺序
2. 不定义 heartbeat cadence
3. 不定义 proposal 审批等级
4. 不定义前台卡片模型
5. 不定义完整 SQL schema

---

## 20. Open Questions

1. `relationship_soul` 是否在单用户产品里保持唯一，还是允许按 user profile variant 多份共存。
2. `SoulRuntimeSnapshot` 是否必须持久化，还是只在 debug mode 下落盘。
3. `identity_narrative` 是否需要单独版本表，还是复用 artifact history 即可。
4. `soul_memory` 是否需要再区分：
   - `relational_identity_memory`
   - `self_boundary_memory`
   - `service_identity_memory`
5. `core_soul` 是否允许拆分成更细的子文档：
   - values
   - relational ethics
   - service ethics

---

## 21. 本篇结论

1. Nion 的 Soul System 必须采用 artifact-backed contract。
2. Soul 不是单对象，而是由 `core_soul / relationship_soul / identity_narrative / soul_memory / soul_journal / soul_proposal / soul_overlay` 组成的系统。
3. 这些对象必须全部映射到现有 Memory OS metadata + artifact 模型中。
4. legacy `SOUL.md` 只能作为兼容入口，长期目标必须转向新的 canonical soul artifact 体系。
