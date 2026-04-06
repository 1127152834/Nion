# Upstream Second Batch Recommendations

**范围：** 在 P1 批次已经完成落地后，对剩余 `P2 / 暂缓` 候选再次筛选。  
**目的：** 明确下一批是否值得继续同步，以及应该优先做哪几笔。  
**当前前提：**

- P1 已完成并落地到 `electron`
- Electron-first / local daemon / Config Center 主线不变
- 不引入 `config.yaml` 回流

---

## 结论摘要

P1 做完之后，第二批里真正还值得继续投入的，只剩少数几笔：

1. `8049785d`
2. `72d4347a`
3. `9ca68ffa`

其他候选里：

- `a283d4a0` 已在 P1 中顺手吸收，已不再是候选
- `2a150f5d` 仍然是混合提交，只适合拆点吸收
- UI hydration 那两笔要先复现再说
- wecom / stream bridge / 大渠道仍然不建议现在动

---

## 第二批建议表

| 提交 | 当前状态 | 现在是否值得做 | 原因 |
|---|---|---|---|
| `8049785d` | 还没吸收 | `值得做` | 你们当前 memory 里确实还没有 `casefold()` 去重，也没有 reinforcement 检测；这笔不是架构性大改，而是质量增强。 |
| `72d4347a` | 还没吸收 | `值得做` | 当前 `sandbox.tools` 写 `runtime.context["sandbox_id"]` 的路径虽然多数地方已守住，但这类 None-guard 仍是低成本高价值补丁，适合再做一次针对性核补。 |
| `9ca68ffa` | 还没吸收 | `可以做` | 路径分隔符风格保留是小修，但在你们现在本地 sandbox / path masking 逻辑已经复杂起来后，这类细节修复更值钱了。 |
| `a283d4a0` | 已吸收 | `不需要再做` | `/api/agents` list 返回 `soul` 已在 P1 中同步完成。 |
| `2a150f5d` | 未吸收 | `拆点再说` | 这笔混合了 suggestions、title fallback、config path、hydration、脚本等多条线。不能整包拉，若继续做也只能拆出很小的点。 |
| `9735d73b` | 未吸收 | `先复现` | UI follow-up overlap 是纯体验问题。只有你们当前界面真有这个问题才值得同步。 |
| `28474c47` | 未吸收 | `先复现` | command palette hydration mismatch 只在特定 SSR/hydration 场景下有意义。 |
| `6473d389` | 未吸收 | `先复现` | button hydration mismatch 同理，先看你们现在能否复现。 |
| `19809800` | 未吸收 | `不建议现在做` | wecom 体量大、渠道结构漂移大，且当前不属于最高产品收益方向。 |
| `6dbdd467` | 未吸收 | `暂缓` | END sentinel 保证是 gateway runtime / stream bridge 的问题，更偏未来 runtime compatibility 方案。 |

---

## 逐项判断

### 1. `8049785d` 值得继续

上游做了两件事：

1. `_fact_content_key()` 改为 `casefold()`
2. reinforcement 检测，从用户明确肯定中提炼出高置信偏好/行为

对照当前 NION：

- [backend/packages/harness/nion/agents/memory/updater.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/memory/updater.py) 里 `_fact_content_key()` 仍然只是 `strip()`，没有大小写归一化
- [backend/packages/harness/nion/agents/memory/queue.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/memory/queue.py) 还没有 `reinforcement_detected`
- [backend/packages/harness/nion/agents/middlewares/memory_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/middlewares/memory_middleware.py) 也只有 `detect_correction()`，没有正向 reinforcement 检测

判断：

- 这不是 donor 架构问题，而是当前 NION memory 质量仍然可以直接增强的地方
- 推荐下一批优先处理

### 2. `72d4347a` 值得继续

上游这笔只是一个防御性补丁：写 `runtime.context["sandbox_id"]` 前加 `None` 守卫。

对照当前 NION：

- 你们现在 [backend/packages/harness/nion/sandbox/tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/sandbox/tools.py) 里这几个写路径已经大多做了 `if runtime_context is not None`
- 但这类逻辑未来很容易再次扩散，且现在 sandbox 这层复杂度已经明显高于前面

判断：

- 不是大 feature，但值得做一轮“全路径核补”
- 建议和下一批 memory 修复一起打包成“小修批次”

### 3. `9ca68ffa` 可以做

上游这笔是虚拟路径分隔符风格保留。

P1 做完以后你们的本地 sandbox 路径替换/反向掩码/search 输出已经更复杂了，所以这类“小路径语义修复”的价值比之前更高。

判断：

- 不是必须马上做
- 但可以和 `72d4347a` 一起作为小型 sandbox 健壮性批次处理

### 4. `2a150f5d` 仍然不能整包追

重新看一遍后，结论没有变：

- 它不是一个清晰功能点，而是一个“多线混合修复包”
- 里面的 `config path / extensions path / skills path` 那部分，本质还是在优化 donor 的 `config.yaml` 文件模式
- 这和你们当前 Config Center 路线不是同一条路

但其中有几个“以后可以单独抄思路”的点：

- `TitleMiddleware` 的 async fallback 更稳
- 一些前端 hydration 类小修

判断：

- 不整包追
- 以后如果你们真碰到某个具体现象，再单独摘点

### 5. `9735d73b` / `28474c47` / `6473d389` 都先复现

这三笔本质上都是：

- UI 重叠
- hydration mismatch
- SSR/客户端不一致

它们只有在 NION 当前界面里真能复现时才有优先级。  
否则就是“为了同步而同步”。

判断：

- 不建议直接做
- 先在你们当前 UI 里复现，再决定是否拉

### 6. `19809800` 仍不建议现在做

wecom 渠道本身可能有业务价值，但不适合现在接着做，原因没变：

- 代码体量太大
- 当前 `backend/app/channels` 结构与你们现状已不一致
- 会把当前同步节奏从“高价值能力吸收”拖回“渠道工程项目”

判断：

- 只有明确产品需求再开专项

### 7. `6dbdd467` 继续暂缓

这笔是 stream bridge END sentinel 保证。  
对 upstream gateway runtime 非常关键，但对你们当前 Electron-first 主链路不构成第一优先级。

判断：

- 如果后面你们明确继续推进 runtime compatibility / runs lifecycle，这笔再升优先级

---

## 推荐的下一批执行顺序

如果你要继续同步，我建议下一批顺序是：

1. `8049785d`
2. `72d4347a`
3. `9ca68ffa`

也就是做一个：

`memory + sandbox 小修批次`

这批的好处是：

- 代码面小
- donor 假设少
- 风险低
- 对当前 NION 质量是真增量

---

## 不建议现在继续做的内容

现在不建议继续做：

- `19809800` wecom
- `6dbdd467` stream bridge runtime
- `2a150f5d` 整包
- 所有部署/脚本类 donor 提交

---

## 最终建议

如果你要我“继续”，最合理的下一步不是乱开新批次，而是直接进入：

`第二批小修同步计划`

范围建议锁定为：

- `8049785d`
- `72d4347a`
- `9ca68ffa`

这样你会得到一批：

- 更稳的 memory
- 更稳的 sandbox context
- 更稳的路径语义

而不会被 wecom / runtime platform / deployment 这些大工程拖慢。
