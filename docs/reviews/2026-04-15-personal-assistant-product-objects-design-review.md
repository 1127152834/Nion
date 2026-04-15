# Personal Assistant Product Objects Design Review

日期：2026-04-15
审查对象：`docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md`
审查立场：严格 / 面向实现落地 / 以“个人办公生活助手”产品为目标

---

## 总评

这份设计文档的方向是对的，而且比此前的多份 Memory / Notebook / Knowledge / Soul 讨论更成熟。
它第一次真正把系统从“内部 owner 分层”推进到了“产品对象合同 + 信息路由合同”。

特别是下面这些判断，我认为是正确的：

1. `Notebook` 是用户原始资产，不应默认被 agent 全局主动检索。
2. `Knowledge` 是从 Notebook 编译出来的 LLM Wiki，不应继续作为独立用户资产空间。
3. `Memory` 应明确定位为聊天与任务中形成的助手机忆，而不是资料库。
4. `IDENTITY.md` 和 `SOUL.md` 必须拆开，分别承载助手身份与助手行为。
5. `Automation` 的产品语义应从 job scheduler 收口成 assistant commitment。

但是，作为真正要进入实现阶段的上位合同，这份设计还缺几处关键收口。它们如果不先补上，后续实现大概率会再次出现“原则是对的、模块也是对的、但跨模块行为继续靠临场判断”的问题。

---

## Findings

### 1. [P0] 写入合同只有 envelope，没有 target-specific payload schema

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L275)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L281)

问题：
当前 `Information Routing Contract` 只有统一 envelope：

- `target`
- `confidence`
- `reason`
- `evidence`
- `write_policy`
- `confirmation_required`

这适合记录“判断结果”，但不够驱动真实执行。不同 target 所需 payload 完全不同：

- `USER.md` 需要字段级 patch
- `SOUL.md` 需要 section 级 patch
- `Notebook` 需要 title / directory / body
- `Knowledge` 需要 source candidate / compile mode / revision intent
- `Automation` 需要 schedule / delivery / scopes / policy

如果不把这些 payload 做成 target-specific schema，后续实现会出现：

- Router 能判断“该写哪里”
- 但执行层仍要重新做一次即席判断

结果：
实现会再次漂回“路由正确但落点混乱”，而不是形成真正的一跳式信息路由。

建议：
把路由输出改成 discriminated union：

```ts
type InformationRouteDecision =
  | UserRouteDecision
  | IdentityRouteDecision
  | SoulRouteDecision
  | MemoryRouteDecision
  | NotebookRouteDecision
  | KnowledgeRouteDecision
  | AutomationRouteDecision
  | CurrentTurnOnlyDecision;
```

并要求每个 target 都定义：

- required payload
- confirmation policy
- provenance fields
- direct write / candidate / compile / suggestion mode

收益：
后续 backend middleware、router、UI confirm flow、audit log 可以共用同一个类型系统，不会再在实现阶段重复推断。

---

### 2. [P0] `USER.md` 与 `SOUL.md` 的边界方向正确，但 precedence 还不够硬

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L111)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L146)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L298)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L357)

问题：
文档已经指出：

- “我喜欢你直接”是 `USER.md`
- “你以后直接回答”是 `SOUL.md`

方向是对的，但真实用户的话往往是混合表达，例如：

> “我不喜欢废话，以后你直接点。”

这同时包含：

- 用户偏好事实
- 助手行为要求

当前文档没有定义：

- 是否允许双写
- 双写时谁是 runtime 权威
- 冲突时谁覆盖谁

结果：
实现阶段很容易出现：

- USER 和 SOUL 双写但内容不一致
- 一个 middleware 写 USER，一个 patch path 写 SOUL
- runtime 到底读 USER 还是 SOUL 不稳定

建议：
加一条明确 precedence：

1. `SOUL.md` 是行为执行权威
2. `USER.md` 记录用户偏好来源
3. `MEMORY.md` 只记录相关事件/证据，不承载行为规则

也就是说：

- **允许双写，但角色不同**
- **行为取 `SOUL.md`**
- **偏好归因取 `USER.md`**

收益：
这会让“用户偏好”与“助手行为”不再竞争 owner，而变成 source 与 execution 的关系。

---

### 3. [P1] `IDENTITY.md` 改成助手身份是正确的，但缺少迁移策略

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L175)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L192)

问题：
现在文档已经明确：

- `USER.md` 是用户身份
- `IDENTITY.md` 是助手身份

这在概念上完全正确。
但当前系统里已经存在：

- `UserIdentityProfile`
- `/api/user-identity`
- `/api/identity/document`

如果不补迁移策略，后续实现阶段会出现四重错位：

1. 旧代码里的 identity 仍代表 user
2. 新文档里的 IDENTITY 代表 assistant
3. 文件路由里 identity 语义切换
4. 前端和测试继续沿用旧命名

结果：
这会直接制造一轮新的大规模语义漂移。

建议：
在文档里补一节迁移合同：

- 旧的 `UserIdentityProfile` 在代码层短期保留，但产品语义一律称 `UserProfile`
- 新增 `USER.md` 为用户身份文档 owner
- `/api/identity/document` 从某个版本开始只指向助手身份
- 必须有 compat adapter、迁移脚本、测试清单、废弃窗口

收益：
避免这次“概念重定义”在实现阶段造成二次混乱。

---

### 4. [P1] Knowledge 不能直接编辑是对的，但缺少 revision request 闭环

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L228)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L443)

问题：
文档正确地规定：

- Knowledge 不能直接创建
- Knowledge 不能手工直接编辑正文
- Knowledge 必须有 Notebook provenance

但它没有定义一个正式的“修订请求”链路。
现实里，用户一定会遇到：

- 这页知识总结错了
- 这个定义不完整
- 这条知识应该拆页
- Notebook 改了，但我不想整页重编译

如果没有 `KnowledgeRevisionRequest` 这种对象，后续只会有两种坏结果：

1. 用户最终还是要求直接编辑 knowledge page
2. 团队又会临时塞一个“修订正文”的捷径

建议：
补一条正式链路：

`Knowledge page`
-> `revision request`
-> `choose source fix / append correction note / recompile / archive`

收益：
保持 Knowledge 的 compiled nature，同时允许用户纠错，不会把它重新变回手工页面系统。

---

### 5. [P1] Automation 的产品语义重写了，但权限模型还不够具体

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L580)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L620)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L752)

问题：
把 Automation 改成 `Assistant Commitment` 是对的。
但当前文档还没有明确：

- 每类 commitment 能读哪些信息源
- 能写哪些长期层
- 能否外发消息
- 失败是否通知用户
- 是否允许 silently mutate Knowledge / Memory / Notebook

结果：
后端虽然可以继续保留 `owner_type`、`mutability`、`provenance_*`，但产品层还是无法形成可信的长期行为模型。

建议：
为每个 commitment 增加四个合同字段：

- `input_scopes`
- `write_scopes`
- `delivery_scopes`
- `failure_policy`

收益：
这样“助手持续承诺”才不只是好文案，而是有可执行权限模型的产品对象。

---

### 6. [P1] 文档定义了写入路由，但没有对等定义读取路由

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L275)
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L660)

问题：
当前设计主要解决“写哪里”。
但真正的 runtime 还必须稳定回答“读哪里”：

- 回答用户身份问题时先读 USER 吗？
- 助手身份问题先读 IDENTITY 吗？
- 行为基调先读 SOUL 吗？
- 任务背景先读 MEMORY 吗？
- 专业问题先查 Knowledge 吗？
- 当前笔记问题先读 Notebook 吗？

没有读取优先级，写入合同是不完整的。

建议：
新增 `Read Routing Contract`：

1. `USER.md`
2. `IDENTITY.md`
3. `SOUL.md`
4. `MEMORY.md`
5. `Knowledge`
6. `Notebook`

并明确每类任务默认优先读哪层。

收益：
AI 行为链才会真正收口，不会出现“写得很清楚，读的时候全凭模型心情”。

---

### 7. [P2] Memory 用户面仍然需要加一句“禁止再暴露治理面”的硬约束

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L94)
[严格审查旧文](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/reviews/2026-04-09-memory-soul-strict-review.md)

问题：
文档里说用户可查看、纠正、遗忘，这没问题。
但现在还没有显式禁止：

- proposal
- accept/reject
- freeze
- growth ledger
- runtime trace
- evidence console

这些旧治理面被重新带回普通用户面。

建议：
在 Memory section 明确补一条：

> 普通用户面只允许 `查看 / 纠正 / 删除或遗忘 / 查看来源`，
> 不得再暴露 proposal / growth / ledger / runtime trace / evidence 等治理对象。

收益：
避免后续实现时再次把治理控制台伪装成产品能力。

---

### 8. [P2] 这份文档已经是上位合同了，但还缺“覆盖旧 spec”的显式声明

参考：
[设计文档](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-15-personal-assistant-product-objects-and-information-routing-design.md#L13)
[旧 design](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md)

问题：
这份文档已经事实上修正了旧文档中一些语义，比如：

- `IDENTITY.md` 不再是用户身份
- Knowledge 不再被理解为可独立管理的内容空间

但没有写“旧文档中哪些表述失效”。
这会让后续 agent 或开发者继续从旧 spec 里读出过期语义。

建议：
在文档头部增加：

- 优先级说明
- 废弃表述列表
- 与旧 spec 的关系

收益：
防止实现阶段再次出现文档漂移和语义打架。

---

## 建议补强项

我建议在这份文档里继续补 3 个部分，然后它就可以真正进入 implementation planning：

1. `InformationRouteDecision` 的 target-specific payload schema
2. `Read Routing Contract`
3. `Compatibility / Migration Contract`

---

## 总结

这份设计已经足够好到可以作为上位方向文档。
但它还不够“硬”，还差把：

- 写入路由
- 读取路由
- 迁移兼容
- 权限矩阵
- Knowledge 修订闭环

这些落实成可以直接驱动实现的合同。

如果你同意，我下一步就不再泛泛 review，而是直接帮你把这份设计文档补成 **可以进入 implementation plan 的版本**。***** End Patch
