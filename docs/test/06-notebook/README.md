# 测试文档 06 - Notebook 模块

- 文档用途：指导其他 agent 对 Notebook 的树、笔记、历史、回收站、目录、assist、聊天导入链路，以及对象桥接候选入口进行完整测试。
- 适合交给哪类 agent 执行：后端 notebook API 测试 agent、前端编辑器/UI 测试 agent、E2E/QA agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是，Notebook API 覆盖面大，先接口化再做页面交互。

## 1. 模块说明
- 模块目标：提供本地优先的第二大脑，支持 Markdown 笔记管理、历史版本、回收站、AI assist、以及把聊天内容沉淀为笔记。
- 核心业务职责：
  - tree / notes / note detail / history / history detail
  - create / update / rename / move / metadata / restore version
  - delete preview / delete / restore-deleted / trash
  - directory create / rename / delete / move
  - assist-preview / assist-apply
  - import-sources(chat) / note import
  - bridge candidate entrypoints from notebook to project draft / long-term memory
- 典型用户角色：桌面知识管理用户、需要把聊天结果落笔记的高级用户。
- 上下游依赖：NotebookHistoryService、Notebook service、ThreadRepository、聊天页 save-to-notebook。
- 与其他模块关系：
  - 与模块 01：可从聊天保存到 Notebook，Notebook 也可导入 chat 作为内容源。
  - 与模块 05：在桌面环境和配置能力上受 settings/runtime 影响，但 Notebook 数据独立于 agent memory。
  - 与模块 09：Notebook 是桌面优先能力，但 Web 路由也可访问。
- 关键代码位置：
  - 前端页面/组件：`frontend/src/components/workspace/notebook/notebook-page.tsx`、`notebook-sidebar.tsx`、`notebook-editor-pane.tsx`、`notebook-tree-view.tsx`、`notebook-trash-page.tsx`、`notebook-quick-capture-dialog.tsx`
  - 前端 core：`frontend/src/core/notebook/api.ts`、`hooks.ts`
  - 后端 router：`backend/app/gateway/routers/notebook.py`
  - 后端 service/model：`backend/packages/harness/nion/notebook/service.py`、`history.py`、`assist.py`、`models.py`
  - 现有测试文件：`backend/tests/test_notebook_api.py`、`backend/tests/test_notebook_history.py`、`backend/tests/test_notebook_service.py`、`frontend/src/core/notebook/api.test.ts`、`frontend/src/components/workspace/notebook/*.contract.test.ts`

## 2. 模块边界与测试范围
- 本模块覆盖：notes、directories、trash、history、assist、chat import、quick capture、drag/drop 移动。
- 本模块覆盖：notes、directories、trash、history、assist、chat import、quick capture、drag/drop 移动，以及候选式 bridge actions 入口。
- 不属于本模块：长期 memory、agent diary、普通聊天消息流。
- 交叉测试点：聊天导入作为 import source；save-to-notebook 跳 seeded create。
- 易混淆边界：Notebook 是用户资产，不是 agent memory；回收站恢复与 history restore 是两条不同链路。

## 3. 核心业务链路
1. 页面加载并行拉 `tree`、`notes`、`trash`、选中 note 的 `detail/history/delete-preview`。
2. 未选 note 时自动选第一篇；若 URL 带 `create=1` 则进入 seeded draft。
3. 用户在 editor 中修改内容，`useUpdateNotebookNote` 负责保存；dirty/hash 由页面本地管理。
4. sidebar 支持搜索、pin recent、目录树、创建子目录、移动、重命名、删除。
5. quick capture 将内容直接写入收件箱草稿。
6. assist-preview 基于 whole_note/selection/paragraph 生成改写预览，assist-apply 把内容按 replace/insert 等模式写回。
7. import-sources(chat) 从 ThreadRepository 中提取最近线程 AI 回复摘要，import 接口把内容附加或替换进当前 note。
8. delete 进入 trash，restore-deleted 恢复；restore version 则从历史版本恢复内容。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交 | 核心断言 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| tree | `/api/notebook/tree` | GET | 列目录树 | sidebar | notebook root 已初始化 | depth/max_nodes | directories/files/truncated | 目录树正确返回 | depth 越界 | root 不可读 | 空 notebook | 隐藏路径过滤 | 重复 GET 一致 | `.nion` 与 hidden 路径被忽略 |
| notes list/detail | `/api/notebook/notes*` | GET | 列笔记与单 note 详情 | 页面 | note 可存在/不存在 | note_id | note / notes | 列表包含 summary tags pinned | 非法 note_id | note 不存在 404 | 空列表 | hidden path 不可见 | 重复 GET | relative_path/summary 正确 |
| create/update/rename/move | `/api/notebook/notes`、`/{id}`、`/{id}/rename`、`/{id}/move` | POST/PUT | 新建、编辑、重命名、移动 | 页面 | 目录合法 | title/body/directory/hash | note | 完整 note lifecycle 成功 | 缺标题、hash 冲突 | note 不存在 | 创建空 body | 版本冲突 | 并发编辑 | path/title/content_hash 更新正确 |
| metadata | `/api/notebook/notes/{id}/metadata` | PATCH | 更新 tags/pin | 页面 | note 存在 | tags/is_pinned | note | tags/pin 更新成功 | payload 非法 | note 不存在 | 空 tags | 无 | 重复 patch | tags 顺序与 pin 状态一致 |
| history/history detail/restore | `/history*` `/restore` | GET/POST | 查看并恢复版本 | 页面 | 有历史 | version_id | entries/entry/note | move/update 产生历史；restore 成功 | version_id 非法 | note/version 不存在 | 无历史返回空 | restore 非法版本 | 并发 restore | history operation/diff_text 正确 |
| delete preview/delete/trash/restore-deleted | `/delete-preview` `/delete` `/trash` `/restore-deleted` | GET/POST | 软删除与恢复 | 页面 | note 存在 | note_id | preview/deleted/note | delete 后 trash 可见，restore 成功 | note_id 非法 | note 不存在 | trash 空列表 | 重复 delete/restore | 并发 delete | deleted note 信息完整 |
| directories CRUD/move | `/api/notebook/directories*` | POST | 创建/重命名/删除/移动目录 | sidebar | parent dir 合法 | directory parent_directory name | directory | 目录全生命周期成功 | 非法名称 | dir 不存在/非空删除 | 空根目录 | 删除非空目录失败 | 并发移动 | tree 结构同步 |
| assist preview/apply | `/assist-preview` `/assist-apply` | POST | 生成 AI 改写并写回 | context panel | note 存在、模型可用 | action scope mode selection/hash | preview/note | summarize/rewrite/expand 等成功 | action/mode 非法 | note 不存在 | 空 selection | hash 冲突 | 重复 apply | recommended_mode 与 source_excerpt 正确 |
| import sources/import | `/import-sources?source=chat` `/notes/{id}/import` | GET/POST | 从聊天导入内容 | context panel | ThreadRepository 有聊天数据 | source content mode hash | items / note | 返回聊天摘要，append/replace 成功 | source 非法 | note 不存在 | 无聊天来源时空 items | mode 非法 | 重复导入 | imported content 和 history 记录正确 |

## 5. UI 测试文档
- 页面入口：`/workspace/notebook`、`/workspace/notebook/trash`。
- 首屏渲染：sidebar、editor、context panel、search、create/quick capture 按钮。
- 加载态：tree/note/history 加载文案和 skeleton。
- 空态：无笔记、空回收站、空搜索结果。
- 错误态：API 失败 toast 或错误卡片。
- 展示：pinned recent、目录树、editor save state、trash 列表、history 面板。
- 用户交互：创建笔记、快速捕获、编辑、选择文本、assist、移动、删除、恢复、拖拽目录/文件。
- 用户交互：创建笔记、快速捕获、编辑、选择文本、assist、移动、删除、恢复、拖拽目录/文件。
- 表单校验：新建目录/笔记必填；quick capture 空值禁止提交。
- 按钮状态：save draft、restore、delete 等状态正确。
- 条件渲染：draft session 与已有 note 模式不同；preview/edit 模式切换。
- 成功反馈：保存成功 toast；quick capture 成功切换到新 note。
- 失败反馈：hash 冲突、目录冲突、删除失败。
- 刷新后状态：当前 note / sidebar 树 / trash 状态恢复。
- 重复操作：连续保存、连续 restore、连续 quick capture。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 推荐结合 `/browse` 做主链路，复杂编辑冲突可先接口模拟。
- 必须抓 network：tree、notes、history、assist、trash、import-sources。
- 必须截图：sidebar、editor、trash、assist preview。

### 6.2 E2E 场景清单
- 场景 1：创建新笔记 -> 编辑 -> 自动/手动保存 -> 刷新恢复，P0。
- 场景 2：Quick Capture 写入收件箱，P1。
- 场景 3：目录创建/重命名/移动/删除，P1。
- 场景 4：删除到回收站并 restore-deleted，P0。
- 场景 5：assist preview + apply，P1。
- 场景 6：从聊天 import source 导入到当前笔记，P1。
- 每个场景都要写明具体 agent-browser 动作：open -> snapshot -> click/fill -> wait -> snapshot。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：创建编辑保存、删除恢复。
- 主失败链路：目录冲突、hash 冲突、assist 失败。
- 刷新恢复链路：刷新后 note 恢复。
- 返回/重进链路：trash / notebook 切换。
- 重复提交链路：多次保存/恢复。
- 模块间联动链路：chat import。
- 模块间联动链路：chat import、Notebook -> Project / Memory bridge candidate。
- web / desktop-client 差异链路：桌面优先语义但页面应统一。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：创建/编辑/删除/恢复。
- 适合 `/qa`：整页长链路巡检。
- 适合 report-only：只收集 Notebook 缺陷。
- 必须抓 network：assist/import/tree。
- 必须看 console：编辑器/拖拽异常。
- 必须截图：draft、trash、assist preview。

## 7. 数据一致性与状态流转测试
- tree/files 与 notes list 一致。
- note content_hash 与保存/restore 流一致。
- trash/history 与 note 当前状态一致。
- import chat 后 history 应新增记录。

## 8. 异常与边界测试
- 缺参、非法目录名、超长标题、特殊字符、空 body、note 不存在、history 版本不存在、assist/导入失败、并发编辑冲突、拖拽非法目标。

## 9. 自动化建议
- 后端接口自动化优先：notes/directories/history/trash/import。
- 前端 contract 自动化：sidebar/tree/editor/context panel、object bridge action entrypoints。
- agent-browser E2E：创建编辑删除恢复。
- 人工探索：长文档、复杂 markdown、拖拽与大树结构。
- 冒烟：创建 note、保存、删除恢复。

## 10. 风险与优先级
- P0：note lifecycle、trash restore。
- P1：directories、assist、chat import。
- 易漏点：hidden path 过滤、hash 冲突、history/restore 区分。
- 事故链路：删除恢复丢内容、导入覆盖错误、assist 错写原文。
