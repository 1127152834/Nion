# Project Knowledge Map

这份文档不是项目介绍，而是后续整改、重构、审计时的阅读顺序导航。

如果你直接在这个仓库里乱改，十有八九会踩到：
- 文档漂移
- web / desktop route drift
- Memory / Soul / UserIdentity truth ownership 分裂
- 已经退产品面但还活在代码里的 compat/residue

所以先按顺序读。

---

## 1. 先理解整体架构

先读：
1. `README.md`
2. `backend/CLAUDE.md`
3. `frontend/CLAUDE.md`
4. `backend/app/runtime/app_factory.py`
5. `docs/project-knowledge-map.md`

然后看知识库中的这些页：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NionProjectOverview.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/RepositoryStructure.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendArchitecture.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendArchitecture.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/GatewayDaemonRouteMap.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/ApiSurfaceCatalog.md`

---

## 2. 如果你要动 Memory / Soul / UserIdentity

先读设计约束：
- `AGENTS.md`
- `docs/superpowers/specs/2026-04-09-memory-soul-boundary-contracts-design.md`
- `docs/superpowers/plans/2026-04-09-memory-soul-boundary-contracts-implementation-plan.md`

再读知识库：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/MemorySoulUserIdentityMainline.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendResidueInventory.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BusinessLogicGapInventory.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/RefactorBacklog.md`

如果还要核对问题强度，再看：
- `docs/reviews/2026-04-11-memory-soul-implementation-gap-audit.md`
- `docs/reviews/2026-04-11-memory-soul-user-identity-backend-strict-audit.md`

---

## 3. 如果你要动 desktop / daemon / bridge / channels

先读：
- `backend/docs/ARCHITECTURE.md`
- `backend/app/runtime/app_factory.py`
- `backend/app/daemon/app.py`

再读知识库：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/DesktopDaemonControlPlane.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/GatewayDaemonRouteMap.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BridgeAndChannelSystem.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/TestingAndQualitySystem.md`

---

## 4. 如果你要动 frontend 工作台

先读：
- `frontend/DESIGN.md`
- `frontend/src/core/navigation/desktop-routes.ts`

再读知识库：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendModuleMap.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/WorkspaceUiMap.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/SettingsUiMap.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/MemoryUiMap.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendResidueInventory.md`

---

## 5. 如果你要动 notebook / automation / custom-agent orchestration

读知识库：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/NotebookSystem.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/AutomationSystem.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/CustomAgentOrchestration.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/UploadsAndArtifactsPipeline.md`

---

## 6. 如果你要评估“哪些东西已经烂了”

先读这几页：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/DocumentationDrift.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BackendResidueInventory.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/FrontendResidueInventory.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/BusinessLogicGapInventory.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/RefactorBacklog.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/TestingAndQualitySystem.md`

---

## 7. 如果你要开始大整改

推荐顺序：
1. 统一文档 truth
2. 统一 owner / route map
3. 清 residue / compat
4. 再做 subsystem refactor

直接看：
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/RefactorBacklog.md`
- `/Users/zhangtiancheng/Documents/wiki/wiki/concepts/DocumentationDrift.md`

---

## 8. 当前最应该记住的现实

- 这个项目不是没功能，是边界和真相源太容易打架。
- 现在最危险的不是“缺一个接口”，而是“改的人以为自己理解了，实际上读的是过期叙事”。
- 如果你在不看知识库和 approved specs 的情况下直接重构 Memory / Soul，那基本等于往脚上开枪。
