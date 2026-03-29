# Project 模块文档索引

## 目标

`docs/project` 用于集中沉淀 Nion `Project` 模块的产品定义、交互设计、数据模型、实施计划与评审结论。

这里的 `Project` 不是普通聊天线程，也不是单次任务卡片，而是一个长期工作的容器：

- 项目负责承载目标、上下文、计划、执行、Review、产物与项目内记忆
- 聊天是项目的交互入口，不是项目的替代品
- Notebook、长期记忆、hooks、自动化都可以与项目联动，但不与项目争夺 owner 身份

## 目录结构

- `00-brainstorming/`
  - 头脑风暴纪要、问题拆解、开放问题、备选方案
- `01-design/`
  - 产品设计、信息架构、交互方案、状态机、对象模型、接口草案
- `02-planning/`
  - 实施计划、里程碑拆解、验收标准、风险清单
- `03-implementation/`
  - 落地记录、阶段偏差修正、实现约束、迁移说明
- `04-review/`
  - 设计评审、代码评审、联调结论、上线复盘
- `05-decisions/`
  - 关键决策记录、边界约束、最终拍板项

## 命名约定

- brainstorming: `YYYY-MM-DD-<topic>-brainstorming.md`
- design: `YYYY-MM-DD-<topic>-design.md`
- planning: `YYYY-MM-DD-<topic>-plan.md`
- implementation: `YYYY-MM-DD-<topic>-implementation.md`
- review: `YYYY-MM-DD-<topic>-review.md`
- decision: `YYYY-MM-DD-<topic>-decision.md`

## 推荐阅读顺序

1. 先读 `00-brainstorming/`，理解为什么要把 superpowers 抽象为 `Project`。
2. 再读 `01-design/`，锁定对象模型、交互边界与状态机。
3. 然后读 `02-planning/`，看实施拆解和优先级。
4. 落地后在 `03-implementation/` 和 `04-review/` 里持续沉淀偏差与复盘。
5. 最终已拍板的规则写入 `05-decisions/`，避免后续重复争论。

## 当前文档

- [2026-03-30 Project 模块脑暴纪要](./00-brainstorming/2026-03-30-project-module-brainstorming.md)
- [2026-03-30 Project 模块信息架构与状态机设计](./01-design/2026-03-30-project-module-information-architecture-design.md)
- [2026-03-30 Project 模块数据模型设计](./01-design/2026-03-30-project-module-data-model-design.md)
- [2026-03-30 Project 模块 API 契约设计](./01-design/2026-03-30-project-module-api-contract-design.md)
- [2026-03-30 Project 模块 Hooks / Automation 设计](./01-design/2026-03-30-project-module-hooks-automation-design.md)

## 当前共识摘要

- `Project` 应作为一级功能模块，而不是主助手里的一个模式开关
- 项目是长期工作容器，聊天是项目的交互入口
- 主聊天可以发起创建项目，但不承担项目切换入口
- 项目页负责进入项目聊天、查看计划、跟踪状态、查看产物
- Notebook 仍然是用户资产；项目只能建议沉淀，不应替用户直接写入
- 项目会产出项目内记忆，并在用户确认后提炼成长期记忆、skill 或习惯
- hooks / 自动化是项目推进器，不是项目模型本身
