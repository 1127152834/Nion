# Memory Search Google Results Design

## Goal

把记忆检索改成更接近 Google 的双页模型：

- `/workspace/memory/search` 只负责发起搜索
- `/workspace/memory/search/results?q=...` 只负责展示搜索结果

同时保留现有“记忆首页 / 用户上下文 / 历史背景 / 事实库”的拆页结构，不再把搜索、事实管理、导入导出、清理流程混在一个页面里。

## Problem

当前记忆检索页把这些职责堆在一起：

- 搜索入口
- 长期记忆结果
- 历史对话结果
- 事实列表与编辑
- 导入导出
- 清理流程
- 右侧详情检视器

这会导致两个问题：

- 页面第一眼更像内部控制台，而不是检索入口
- 搜索完成后的结果阅读体验不够聚焦，业务边界也不清楚

## Confirmed Direction

用户确认采用 A 方向：

- 首页尽量像 Google，极简、留白多、只保留搜索动作
- 点击搜索后跳转到独立结果页
- 结果页只保留搜索相关内容
- 事实管理、导入导出、清理流程不再留在搜索页

## Information Architecture

### 1. Search Home

路由：`/workspace/memory/search`

职责：

- 显示记忆检索标题和简短说明
- 提供主搜索框和搜索按钮
- 提供少量建议词，帮助快速发起检索
- 提供返回记忆首页入口

明确不做：

- 不显示任何搜索结果
- 不显示事实管理
- 不显示导入导出
- 不显示清理流程

### 2. Search Results

路由：`/workspace/memory/search/results?q=...`

职责：

- 顶部保留可继续编辑的搜索框
- 展示结果总数和来源筛选
- 展示长期记忆结果
- 展示历史对话结果
- 提供跳转原对话动作
- 提供返回记忆首页入口

明确不做：

- 不显示新增事实
- 不显示编辑事实
- 不显示导入导出
- 不显示清理流程
- 不显示 detail inspector

### 3. Facts Library

路由：`/workspace/memory/facts`

职责上补位承接搜索页移出的管理动作：

- 新增 / 编辑 / 删除事实
- 导入记忆
- 导出记忆
- 打开清理流程

这样“检索”与“管理”分属不同页面，边界稳定。

## Result Presentation

结果页采用搜索引擎式连续列表，而不是控制台式双栏工作台：

- 顶部搜索框
- 下方轻量 tabs：全部 / 长期记忆 / 历史对话
- 结果列表按来源用 badge 标识
- 长期记忆结果优先展示分区标题、摘要片段、更新时间
- 历史对话结果展示线程信息、智能体名、命中片段，并提供“打开原对话”

默认排序：

- `全部` 下先显示长期记忆，再显示历史对话
- 单独筛选时只显示对应来源

## Navigation

新增结果页后，需要保持导航语义一致：

- 记忆首页卡片继续进入 `/workspace/memory/search`
- 桌面端 renderer 需要注册 `/workspace/memory/search/results`
- 内部返回入口统一使用细长箭头式返回链接，而不是块状按钮

## Component Strategy

### Keep

- `MemoryHomePage`
- `MemoryUserPage`
- `MemoryHistoryPage`
- `MemoryFactsPage`
- `MemoryClearFlow`
- `searchStructuredMemory`
- `useRecallSearch`

### Add

- `MemorySearchResultsPage`
- 结果页路由文件 `frontend/src/app/workspace/memory/search/results/page.tsx`
- 搜索结果路由 helper
- 一个统一的轻量返回链接组件，供记忆子页面复用

### Remove From Search Path

下列组件不再参与搜索页链路：

- `MemoryConsolePanel`
- `MemoryDetailInspector`

如果改造后无生产使用，可以删除，避免死代码。

## Visual Direction

- 首页用大留白和大搜索框建立“发起搜索”的气质
- 结果页保持克制，不做控制台式边栏与 inspector
- 继续使用小圆角，不做大圆角泡泡块
- 选中和筛选优先用细下划线、字重和边框表达

## Success Criteria

- 进入 `/workspace/memory/search` 时，页面第一眼像搜索入口而不是后台
- 搜索后跳到独立结果页，而不是在原页内堆结果
- 结果页只保留搜索相关内容
- 事实管理能力没有丢失，而是迁移到事实库页
- 桌面端与前端路由都能正确访问新结果页
