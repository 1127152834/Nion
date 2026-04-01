# Project / Notebook / Memory Bridge API Contract Design

## 背景

在下面这些设计已经明确之后：

- [knowledge-work-object-model-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-knowledge-work-object-model-design.md)
- [notebook-project-bridge-actions-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-project-bridge-actions-design.md)
- [notebook-2.0-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-notebook-2.0-design.md)
- [projects-2.0-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-projects-2.0-design.md)

下一步必须把 bridge actions 收口成正式 API contract。

否则就会出现典型问题：

- Notebook 页面自己定义一个“生成项目”请求形状
- Projects 页面自己定义一个“导出到笔记”请求形状
- completion lane 再自己定义一套“提炼长期记忆”动作 payload
- future SkillTool / agent runtime 再定义第四套

这会马上把前面的对象模型和 bridge action 设计打散。

所以这份设计的目标不是“再加几个 API”，而是建立一层统一的 Bridge API Contract。

## 目标

把 `Project / Notebook / Memory` 之间的 bridge actions 统一收口成正式 API contract，满足：

- action 命名统一
- candidate-first
- confirmation-aware
- provenance-aware
- future 可被 UI、agent runtime、SkillTool、completion lane 共用

## 非目标

这份设计不处理：

- Prompt Runtime / Tool Runtime / Hook Event Plane 内部实现
- Notebook 2.0 和 Projects 2.0 的 UI 设计
- Memory provider 演进
- SkillTool 执行协议

这份设计只定义 API 契约层。

## 设计原则

### 1. 复用现有资源面，不另起完全平行前缀

Notebook / Projects / Memory 都已有现成资源面：

- `/api/notebook/*`
- `/api/projects/*`
- `/api/memory/*`

Bridge API 应尽量增量挂在这些资源面下，而不是另起一个完全陌生的 `/api/bridge/*` 大前缀。

### 2. Candidate-first 优先

高风险跨对象动作默认先返回 candidate，不直接写入目标对象。

### 3. 高风险动作必须 confirmation-aware

写入：

- Notebook 正文
- global Memory
- real skill

的动作必须显式支持确认语义。

### 4. provenance 是一等返回字段

Bridge action 不是单向调用，它必须把来源信息作为标准字段返回。

### 5. agent runtime 和 UI 必须共用同一 contract

不能出现：

- UI 调一个接口
- agent runtime 调另一个隐式内部接口

后续应该能通过同一个 contract 调用。

## API 设计策略

建议分成三类：

### A. Candidate 生成接口

作用：

- 创建 `draft / candidate / suggestion`

特点：

- 默认只读或仅生成候选对象
- 不修改目标主对象

### B. Candidate 应用接口

作用：

- 把 candidate 应用到目标对象

特点：

- 需要明确确认
- 需要并发保护 / expected hash / state guard

### C. Reference 绑定接口

作用：

- 建立显式跨对象引用关系

特点：

- 不复制正文
- 只建立 link

## Candidate 统一返回模型

建议所有 bridge candidate 接口统一返回：

```json
{
  "candidate": {
    "id": "cand_xxx",
    "type": "notebook_draft | project_draft | memory_entry | skill_candidate | project_constraint",
    "title": "...",
    "summary": "...",
    "payload": {},
    "requires_confirmation": true,
    "provenance": [],
    "created_at": "..."
  }
}
```

## 1. Notebook -> Project

## 1.1 从 Notebook 创建 Project 草案

### Endpoint

`POST /api/notebook/bridge/project-drafts`

### Request

```json
{
  "note_ids": ["note_1"],
  "fragment_ids": [],
  "mode": "project_draft"
}
```

### Response

```json
{
  "candidate": {
    "id": "cand_proj_1",
    "type": "project_draft",
    "title": "Project Alpha",
    "summary": "基于当前笔记生成的项目草案",
    "payload": {
      "name": "Project Alpha",
      "goal": "整理并推进某项长期工作",
      "description": "..."
    },
    "requires_confirmation": true,
    "provenance": []
  }
}
```

### Apply Endpoint

`POST /api/notebook/bridge/project-drafts/{candidate_id}/apply`

### Apply Response

- 创建正式 project
- 返回项目简述对象

## 1.2 从 Notebook 创建 Plan 草案

### Endpoint

`POST /api/notebook/bridge/project-plan-drafts`

### Request

```json
{
  "project_id": "proj_1",
  "note_ids": ["note_1"],
  "fragment_ids": []
}
```

### Response

- `PlanDraftCandidate`

### Apply Endpoint

`POST /api/notebook/bridge/project-plan-drafts/{candidate_id}/apply`

## 1.3 从 Notebook 提炼项目约束候选

### Endpoint

`POST /api/notebook/bridge/project-constraint-candidates`

### Request

```json
{
  "project_id": "proj_1",
  "note_ids": ["note_1"],
  "fragment_ids": []
}
```

### Response

- `ProjectConstraintCandidate[]`

### Apply Endpoint

`POST /api/notebook/bridge/project-constraint-candidates/{candidate_id}/apply`

说明：

- 应用后写入 project memory 或 project context candidate area

## 2. Project -> Notebook

## 2.1 导出项目总结为 notebook 草稿

### Endpoint

`POST /api/projects/{project_id}/bridge/notebook-drafts`

### Request

```json
{
  "kind": "summary",
  "scope": "whole_project",
  "target_directory": "收件箱"
}
```

### Response

- `NotebookDraftCandidate`

### Apply Endpoint

`POST /api/projects/{project_id}/bridge/notebook-drafts/{candidate_id}/apply`

要求：

- 默认需要用户确认
- 应支持 `target_directory`

## 2.2 导出项目复盘为 notebook 草稿

### Endpoint

`POST /api/projects/{project_id}/bridge/notebook-drafts`

### Request

```json
{
  "kind": "retro",
  "scope": "whole_project",
  "target_directory": "复盘"
}
```

### Response

- `NotebookDraftCandidate`

## 2.3 导出决策日志为 notebook 草稿

### Endpoint

`POST /api/projects/{project_id}/bridge/notebook-drafts`

### Request

```json
{
  "kind": "decision_log",
  "scope": "whole_project",
  "target_directory": "项目决策"
}
```

## 3. Project -> Memory

## 3.1 提炼长期记忆候选

### Endpoint

`POST /api/projects/{project_id}/bridge/memory-candidates`

### Request

```json
{
  "kind": "long_term_memory",
  "scope": "whole_project"
}
```

### Response

- `MemoryEntryCandidate[]`

### Apply Endpoint

`POST /api/projects/{project_id}/bridge/memory-candidates/{candidate_id}/apply`

要求：

- 默认需要确认
- 应写入 global memory，而不是 project memory

## 3.2 升级项目约束到全局记忆

### Endpoint

`POST /api/projects/{project_id}/bridge/memory-candidates`

### Request

```json
{
  "kind": "promote_constraint",
  "project_memory_entry_id": "pmem_1"
}
```

## 4. Notebook -> Memory

## 4.1 从 Notebook 提炼长期记忆候选

### Endpoint

`POST /api/notebook/bridge/memory-candidates`

### Request

```json
{
  "note_ids": ["note_1"],
  "fragment_ids": []
}
```

### Response

- `MemoryEntryCandidate[]`

### Apply Endpoint

`POST /api/notebook/bridge/memory-candidates/{candidate_id}/apply`

## 5. Project -> SkillCandidate

## 5.1 从项目提炼 skill candidate

### Endpoint

`POST /api/projects/{project_id}/bridge/skill-candidates`

### Request

```json
{
  "scope": "whole_project"
}
```

### Response

- `SkillCandidateDraft`

### Apply Endpoint

第一版不直接落真实 skill，建议只支持：

`POST /api/projects/{project_id}/bridge/skill-candidates/{candidate_id}/confirm`

语义：

- 确认保留 candidate
- 后续交给 SkillTool / skill authoring workflow 处理

## 6. Reference Binding

## 6.1 将 note 绑定到 project

### Endpoint

`POST /api/projects/{project_id}/references/notebook-notes`

### Request

```json
{
  "note_id": "note_1",
  "fragment_id": null,
  "relation": "reference"
}
```

### Response

- `ProjectReferenceLink`

## 6.2 将 artifact 绑定到 notebook

### Endpoint

`POST /api/notebook/notes/{note_id}/references/project-artifacts`

### Request

```json
{
  "project_id": "proj_1",
  "artifact_id": "art_1",
  "relation": "derived_from"
}
```

### Response

- `NotebookReferenceLink`

## Candidate 生命周期

建议统一生命周期：

- `draft`
- `ready`
- `applied`
- `dismissed`
- `expired`

### Candidate 读取接口

为避免刷新后丢失 candidate，建议补读取接口。

例如：

- `GET /api/projects/{project_id}/bridge/notebook-drafts`
- `GET /api/projects/{project_id}/bridge/memory-candidates`
- `GET /api/notebook/bridge/project-drafts`

## 并发与确认语义

### Notebook apply 类动作

涉及写 note 正文时，必须支持：

- `expected_content_hash`

例如：

```json
{
  "expected_content_hash": "sha256..."
}
```

### Project apply 类动作

涉及 project 状态变更时，建议支持：

- current lifecycle / phase guard
- selected candidate version

## Provenance 返回要求

所有 bridge 结果都必须带：

- source object ids
- source fragment ids
- action name
- approval mode
- created_by
- created_at

建议统一字段名为：

- `provenance`

## 和现有 API 的关系

### Notebook

现有：

- `/api/notebook/import-sources`
- `/api/notebook/notes/{id}/assist-preview`
- `/api/notebook/notes/{id}/assist-apply`

建议：

- 这些保留
- 但逐步补充 `/bridge/*` 子资源，把 bridge action 从 assist/import 中剥离出来

### Projects

现有：

- `/api/projects/{project_id}/threads/{thread_id}/imports`
- `/api/projects/{project_id}/memory/extract`
- decision flow 中的 `extract_long_term_memory` / `extract_skill`

建议：

- 保留现有接口兼容
- 新能力逐步收口进 `/bridge/*`
- decision flow 调用 bridge action，而不是各自定义逻辑

## 和 agent runtime / SkillTool 的关系

后续 agent runtime 不应直接绕过 API contract 调用隐式 service。

推荐原则：

- UI 调 bridge API
- agent runtime 也调 bridge contract
- internal service 是 contract 背后的执行实现

SkillTool 后续若要参与提炼，也应使用这套 candidate-first contract。

## 测试方案

### 1. Candidate API contract 测试

覆盖点：

- 创建 candidate
- apply / confirm / dismiss
- 状态流转

建议文件：

- `backend/tests/test_bridge_api_candidates.py`

### 2. Provenance API 测试

覆盖点：

- 所有 candidate / reference link 返回都带 provenance

建议文件：

- `backend/tests/test_bridge_api_provenance.py`

### 3. Boundary regression 测试

覆盖点：

- Project 不自动写 Notebook
- Notebook 不自动写 global Memory
- skill candidate 不直接变成真实 skill

建议文件：

- `backend/tests/test_bridge_api_boundaries.py`

### 4. Frontend contract 测试

覆盖点：

- notebook / project API client 的新 bridge endpoints
- request / response shape 稳定

建议文件：

- `frontend/src/core/notebook/api.bridge.test.ts`
- `frontend/src/core/projects/api.bridge.test.ts`

## 验收标准

### A. 统一性验收

1. 跨对象动作不再散落在 assist/import/decision 特例里
2. bridge action 有统一 API contract

### B. Candidate 验收

3. 高风险动作默认 candidate-first
4. apply / confirm / dismiss 生命周期明确

### C. Boundary 验收

5. Notebook 用户资产边界保留
6. Project completion / extraction 不再直接隐式写对象

### D. Provenance 验收

7. 所有 bridge API 返回都带 provenance
8. 用户和 agent 都能追踪来源链

### E. 可扩展性验收

9. future Notebook 2.0 / Projects 2.0 可以直接消费
10. future SkillTool / agent runtime 不需要再发明另一套 bridge contract

## 风险与取舍

### 风险 1：接口太多

处理方式：

- 统一收口在 `/bridge/*`
- 通过 candidate 模型统一返回结构

### 风险 2：和现有接口重复

处理方式：

- 保持兼容
- 新能力只往 bridge contract 聚合，不再继续扩散旧接口

### 风险 3：过早引入真实自动写入

处理方式：

- 默认 candidate-first
- 高风险动作明确确认

## 下一步

这份设计确认后，接下来有两个合理方向：

1. 写 `Notebook 2.0 Bridge Surface Implementation Plan`
2. 回到 P0，开始真正实施 runtime backbone

如果继续对象层设计路线，我建议下一份先写：

- `Object Layer Phase 1 Implementation Plan`
