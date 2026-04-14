# NION Upstream Sync Audit Design

日期：2026-04-14  
状态：Draft for review  
范围：`electron vs upstream/main 上游差异研究 / 主题分组审计 / 安全同步决策报告`

---

## 1. 问题定义

NION 当前不是一个只做了轻度定制的 DeerFlow fork。

它已经发生了多条主链级改造：

- 品牌从 DeerFlow 切换为 NION
- `config.yaml` 被移除，运行时配置改为 Settings / Config Center 真源
- 引入了 Electron 桌面端与本地 daemon 主链
- Memory / Soul 完成了边界重构
- bridge / channel / runtime 语义已经重构
- 多个桌面、设置、运行时、notebook、capability 相关模块已经脱离上游产品模型

因此，NION 不能采用“直接 merge upstream/main”或“按 commit 顺手 cherry-pick”的同步策略。

当前真正的问题不是“怎么把上游都拉过来”，而是：

> 在不破坏 NION 现有业务、架构与已批准设计的前提下，识别上游哪些改动值得同步、哪些只应部分吸收、哪些必须重写后吸收、哪些应明确放弃。

如果没有一份源码级、主题级、带证据的同步审计报告，后续同步工作会持续陷入两个错误：

1. 把本可安全吸收的底层修复错过，导致安全性和稳定性收益流失
2. 把会破坏 NION 主链的上游产品模型误吸进来，导致配置、桌面端、Memory / Soul、bridge 重新失稳

---

## 2. 设计目标

这份设计不执行同步实现，只定义一套审计与决策方法，最终产出一份可直接指导后续分批同步的报告。

具体目标：

1. 基线固定为 `electron` 对 `upstream/main`
2. 仅研究“上游尚未进入 `electron` 的非 merge 提交”
3. 先按主题聚类，再追溯关键 commit 和源码影响
4. 对每个主题和关键 commit 给出：
   - 重要性
   - 影响范围
   - 对 NION 的适配难度
   - 是否与 NION 架构冲突
   - 推荐动作
   - 同步优先级
5. 显式保护 NION 现有业务，禁止把“追上游”凌驾于“主链稳定”之上

---

## 3. 非目标

这轮设计明确不做下面这些事：

1. 不直接 merge `upstream/main`
2. 不在本设计阶段执行 cherry-pick 或函数级同步
3. 不把所有上游提交逐条机械迁入 NION
4. 不为兼容上游而恢复 `config.yaml` 路线
5. 不回退已批准的 Memory / Soul、bridge、desktop/daemon 架构

---

## 4. 核心原则

### 4.1 现有业务稳定高于追平上游

同步上游的目的，是补齐高价值能力与修复，不是为了让 git 图谱看起来更接近 upstream。

只要某个候选改动不能证明它对以下主链无破坏，就不能进入优先同步列表：

- Settings / Config Center 真源
- Electron + 本地 daemon 运行链路
- Memory / Soul 已批准合同
- bridge / channel / runtime 当前语义
- 当前主会话、线程、上传、模型配置的稳定性

### 4.2 不按 commit 数量思考，要按产品主链思考

当前 `electron..upstream/main` 存在大量未同步的非 merge 提交。

这些提交中有许多是：

- 同一主题下的连续修补
- 同一个 bug 的后续 hardening
- 同一路线上的产品模型演进

因此必须先做主题聚类，再做 commit 溯源，否则结论会被噪声污染。

### 4.3 不允许 Proposal 语义回流

这轮研究和后续执行都不能重新引入 proposal / accept / reject 产品语义。

报告中的决策来源只允许两种：

- NION 当前设计已经明确决定
- 本次同步审计给出工程判断

### 4.4 证据高于标题印象

任何同步建议都不能只依据 commit message、PR 标题或目录名作出。

每个结论至少需要两类证据中的两类：

- 上游源码证据
- NION 当前实现证据
- NION 既有设计 / 计划 / 报告证据

---

## 5. 审计对象与范围

### 5.1 比较基线

- 本地基线：`electron`
- 上游基线：`upstream/main`
- 研究对象：`electron..upstream/main` 的非 merge 提交

### 5.2 研究粒度

采用两层结构：

1. 主题总表
2. commit 明细附表

主题层负责产品与架构判断，commit 层负责源码证据和后续可执行性。

### 5.3 研究方式

研究顺序固定为：

1. 获取最新 `upstream/main`
2. 列出上游未进入 `electron` 的非 merge 提交
3. 按产品主链和运行时主链聚类
4. 每个主题抽取关键 commit
5. 阅读关键 commit 的源码 diff 与测试意图
6. 对照 NION 当前实现与既有设计
7. 给出动作建议与优先级

---

## 6. 主题分组模型

252 个上游非 merge 提交不按目录硬分，而按“是否作用于同一条产品/运行时主链”聚类。

第一层主题桶固定为：

1. `安全与沙箱`
   - sandbox 路径校验
   - bash command auditing
   - 文件访问约束
   - host-shell escape 修复
   - 本地/容器路径映射
   - 并发文件写入冲突

2. `线程与运行时稳定性`
   - thread_id fallback
   - concurrent run guard
   - stream END sentinel
   - clarification / loop middleware 修复
   - subagent 超时、取消、事件一致性

3. `上传与文档处理`
   - 上传校验
   - document outline 抽取
   - PDF 转换
   - artifact 加载安全
   - 上传上下文注入

4. `模型与 provider 能力`
   - provider 修复
   - vLLM / Ollama 等能力引入
   - thinking / reasoning 相关配置
   - OAuth / billing / gateway 兼容

5. `前端交互与线程体验`
   - hydration mismatch
   - IME 与输入行为
   - suggestion / follow-up UI
   - 线程历史与 thread-scoped state
   - token usage 展示

6. `Memory / Soul / 长时上下文`
   - memory 管理动作
   - import / export
   - reflection / correction
   - prompt 注入
   - 长时上下文策略

7. `Channel / Bridge / 第三方通道`
   - Slack / Discord / WeChat / WeCom / Feishu
   - channel retries
   - allowed user ids
   - channel 产品语义与接入层

8. `开发 / 构建 / 跨平台工具链`
   - Windows 支持
   - Docker / CI
   - Makefile / serve.sh
   - test / lint / format / dependency checks

9. `文档 / 技能 / 社区扩展`
   - README / 文档站
   - 新增 skills
   - 博客、社区 provider、外围资产

每个主题桶再按第二层语义切分：

- `底层修复`
- `能力增强`
- `产品模型改写`

高优先候选通常来自：

- `底层修复`
- 少量与 NION 架构兼容的 `能力增强`

高风险误吸通常来自：

- `产品模型改写`

---

## 7. 评估维度与分级规则

每个主题与关键 commit 都要按以下四个维度评估。

### 7.1 业务价值

- `S`
  - 直接提升安全性、稳定性、核心能力完备性
- `A`
  - 明显改善主链体验或关键运营能力
- `B`
  - 有价值但可延后
- `C`
  - 对 NION 当前路线价值有限

### 7.2 影响范围

- `L`
  - 局部模块、单页或单工具
- `M`
  - 跨前后端一个功能面
- `H`
  - 触达运行时、配置体系、桌面链路或主语义边界

### 7.3 适配难度

- `1`
  - 可直接摘取
- `2`
  - 需要小范围改写
- `3`
  - 需要按 NION 架构重写
- `4`
  - 与 NION 当前主设计冲突

### 7.4 架构冲突标记

- `CFG`
  - 会引入 `config.yaml` 或 file-mode 配置真源回流
- `DESKTOP`
  - 默认依赖 web/容器假设，不兼容 Electron + 本地 daemon
- `MEMORY`
  - 触碰已批准的 Memory / Soul 合同
- `BRIDGE`
  - 触碰已重构的 bridge / channel / runtime 语义
- `BRAND`
  - 引入 DeerFlow 品牌、旧术语或旧页面语义

---

## 8. 决策动作模型

同步决策动作固定为五种，禁止自造语义。

### 8.1 直接同步

仅适用于底层正确性、安全性、稳定性修复。

必须同时满足：

- 不改 NION 产品模型
- 不碰配置真源
- 不破坏桌面链路
- 不改 Memory / Soul / bridge 核心边界
- 补丁局部且可验证

### 8.2 部分同步

上游方向正确，但文件或模块已被 NION 深度重构。

只允许摘取：

- 函数级修复逻辑
- 校验规则
- 条件判断
- 测试意图

不允许整文件照搬。

### 8.3 重写后同步

上游解决了真实问题，但其落点不适合 NION 当前架构。

这类改动只吸收：

- 问题定义
- 正确性边界
- 失败模式
- 测试形状

实现必须按 NION 现有架构重写。

### 8.4 已等价吸收，无需同步

NION 已通过其他提交、其他设计路线解决同一问题。

不能凭感觉判断，必须记录：

- NION 对应 commit / 分支 / 文件
- 等价吸收理由

### 8.5 明确不同步

满足任一条件即可判定：

- 与 NION 产品方向无关
- 与 Settings / Config Center 真源冲突
- 与桌面端链路冲突
- 与 Memory / Soul 边界冲突
- 与 bridge / channel 语义冲突
- NION 已有更优实现

---

## 9. 优先级规则

优先级只表示“研究与同步建议顺序”，不表示“上游提交质量高低”。

### 9.1 `P0`

立即研究并优先进入同步批次。

典型特征：

- `业务价值 = S`
- `影响范围 = L 或 M`
- `适配难度 = 1 或 2`

重点包括：

- sandbox 安全
- 上传安全
- 线程并发正确性
- stream 结束语义
- 本地运行时稳定性

### 9.2 `P1`

本轮建议纳入，但需要一定改写或专项验证。

典型特征：

- `业务价值 = S 或 A`
- `适配难度 = 2 或 3`

### 9.3 `P2`

有价值，但不应打断当前主链。

适合后续排期同步。

### 9.4 `P3`

明确不同步或仅保留信息性记录。

---

## 10. 直接同步禁区

命中以下任一条件时，动作不得判为 `直接同步`：

1. 命中 `CFG`
2. 命中 `DESKTOP`
3. 命中 `MEMORY`
4. 命中 `BRIDGE`
5. 命中 `BRAND`
6. 触达：
   - `settings`
   - `desktop/electron`
   - `backend daemon`
   - `memory/soul`
   - `bridge/channel`

上述区域即使有高价值收益，也只能是：

- `部分同步`
- `重写后同步`
- `明确不同步`

---

## 11. 证据标准

每个主题结论、每条关键 commit 结论，至少满足以下三类证据中的两类：

1. `源码证据`
   - 上游改了哪些文件、函数、接口或测试
2. `当前实现证据`
   - NION 当前对应模块、当前行为与当前边界
3. `历史设计证据`
   - NION 既有 spec / plan / report / 分支 / commit 是否已覆盖同一问题

明确禁止只凭下面任何单一信息下结论：

- commit message
- PR 标题
- 文件路径印象
- “看起来像我们也需要”

---

## 12. 最终报告结构

最终报告固定分为六部分。

### 12.1 执行摘要

包含：

- 基线说明
- 差异规模
- 主题总数
- `P0 / P1 / P2 / P3` 分布
- 当前最值得优先处理的方向

### 12.2 主题总表

字段固定为：

- `主题`
- `上游改动摘要`
- `提交数`
- `关键 commit`
- `业务价值`
- `影响范围`
- `适配难度`
- `架构冲突标记`
- `建议动作`
- `优先级`
- `结论理由`

### 12.3 Commit 明细附表

字段固定为：

- `commit`
- `标题`
- `涉及模块/文件`
- `上游解决了什么问题`
- `NION 当前状态`
- `是否已等价吸收`
- `建议动作`
- `风险点`
- `证据`

### 12.4 冲突热点分析

重点分析以下危险区域：

- settings / config center
- desktop / electron + daemon
- memory / soul
- bridge / channel / runtime
- uploads / document pipeline

每个热点都要说明：

- 为什么危险
- 哪类上游改动容易误吸
- 可安全吸收的边界在哪里

### 12.5 推荐同步批次

按 NION 风险收益排序，而非按上游时间排序。

目标形式：

- `Batch A` 安全与稳定性底层修复
- `Batch B` 上传 / 线程 / stream 正确性修复
- `Batch C` 可兼容 provider 能力增强
- `Batch D` 需要按 NION 架构重写的高价值能力

### 12.6 明确不同步清单

正式记录哪些主题和 commit 明确不拉，以及为什么不拉，避免未来重复研究。

---

## 13. 研究阶段的禁止事项

研究与后续执行都禁止以下行为：

1. 直接 merge `upstream/main` 到 `electron`
2. 在脏工作区上做同步实验
3. 以兼容名义恢复 `config.yaml`
4. 把上游产品模型改写误当成底层修复
5. 以“先进”或“功能更多”为理由覆盖 NION 已批准设计
6. 把本应重写的内容伪装成直接同步

---

## 14. 结论

NION 的 upstream 同步必须被定义为一项产品与架构审计工作，而不是 git 操作工作。

本设计确定的正式方法是：

- 基线：`electron` vs `upstream/main`
- 粒度：`主题总表 + commit 明细附表`
- 判定方法：业务价值、影响范围、适配难度、架构冲突四维联合
- 保护原则：现有业务稳定、配置真源、桌面主链、Memory / Soul 合同、bridge 语义优先
- 产物用途：作为后续分批安全同步的总索引与决策依据

只有在这份审计报告完成后，后续的同步动作才允许逐批展开。
