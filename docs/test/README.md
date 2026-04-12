# 测试文档总览

当前保留的业务测试文档：

- [10-memory-soul/README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/10-memory-soul/README.md)
  - 记忆系统与 Soul 系统的产品边界、最小回归集合、行为验收题库。

当前还没有独立成册、但已经有代码级验证矩阵的业务面：

- custom-agent orchestration
  - backend: child-run repository / router / delegation policy / mention parser / orchestrator graph / delegated thread routing
  - frontend: dedicated sidebar child-run panel / child-run inspector contract / main-thread delegation summary / recent-chat two-tab taxonomy / input-box `@` notebook-agent tabs

维护约定：

- 当某个业务模块新增或删减测试文档时，同步更新这里。
- 当模块边界发生变化时，先更新对应模块 README，再回写这一页的索引说明。
