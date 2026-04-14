# NION Upstream Sync Execution Status

日期：2026-04-15  
基线：`electron` -> `codex/upstream-batch-a-20260414`  
范围：已审计 key commits 的执行闭环状态

---

## 1. 说明

这份状态表不重复做源码审计，而是回答一个更具体的问题：

> 已经进入同步决策面的这些 upstream key commits，现在在 NION 里处于什么执行状态？

状态只允许以下几类：

- `已同步`
- `已锁定`
- `已等价吸收`
- `明确不同步`
- `当前无安全落点`

其中：

- `已同步` 指已经在本分支产生新的 NION 实现提交
- `已锁定` 指不改实现，但新增测试把 NION 现状固定住
- `已等价吸收` 指 NION 在本轮开始前就已经具备对应能力，且现有代码/测试足以支撑结论
- `明确不同步` 指与 NION 现有主链冲突，不再进入当前同步批次
- `当前无安全落点` 指问题存在于 upstream 的另一套架构层，不适合在当前 NION 架构上直接落地

---

## 2. 执行状态表

| Upstream Item | 当前状态 | NION 落点 | 结果说明 |
| --- | --- | --- | --- |
| `46d0c329` uploads thread fallback | `已同步` | `7b611083` | 已在 uploads middleware 增加 `configurable.thread_id` fallback。 |
| `163121d3` outline regex / preview hardening | `已同步` | `f27088b4` | 已在 `file_conversion.py` 落地 parser 硬化和 outline 上限。 |
| `43ef3691` Claude OAuth billing header | `已同步` | `929d6a2c` | 已在 `claude_provider.py` 注入 billing header 与 `metadata.user_id`。 |
| `6dbdd467` stream end guarantee | `已锁定` | `02902e5e` | NION 当前 SSE client 已满足该业务规则，新增 split-end 测试锁定。 |
| `0948c7a4` Codex streamed output merge | `已锁定` | `88287e57` | NION 已有 streamed-output merge，新增回归测试锁定。 |
| `0eb6550c` thread model persistence | `已锁定` | `88287e57` | NION 已有 thread-scoped model persistence，新增本地设置测试锁定。 |
| `92c7a20c` LocalSandbox host bash hardening | `已等价吸收` | 现有代码 | `sandbox/security.py` 与现有 host-bash gating 已覆盖核心风险。 |
| `89183ae7` same-thread run guard | `已等价吸收` | 现有代码 | `threads/service.py` 和 `test_threads_router.py` 已覆盖。 |
| `ddfc988b` PDF converter auto-fallback | `已等价吸收` | 现有代码 | NION 已具备 PyMuPDF4LLM 优先、稀疏回退、thread offload。 |
| `5ff230ea` uploaded document outline injection | `已等价吸收` | 现有代码 | NION 已具备 outline / preview / file-first guidance。 |
| `dd30e609` vLLM provider support | `已等价吸收` | 现有代码 | `vllm_provider.py` 和现有测试已覆盖。 |
| `866cf4ef` IME submit guard | `已等价吸收` | 现有代码 | `isIMEComposing` 与输入组件 guard 已覆盖。 |
| `24805200` / `85b7ed3c` route `new` thread guard | `已等价吸收` | 现有代码 | `use-thread-chat.ts` 与 contract test 已覆盖。 |
| `5664b9d4` longTermBackground prompt injection | `已等价吸收` | 现有代码 | 现有 prompt 注入与测试已经覆盖。 |
| `18e34878` custom channel assistant id routing | `已等价吸收` | 现有代码 | `threads/service.py` 已把 `assistant_id` 归一到 `agent_name`。 |
| `9a557751` memory import/export | `已等价吸收` | 现有代码 | NION 兼容层已有 import/export 入口，不需要上游前端/路由实现。 |
| `ac04f270` subagent model override via config | `明确不同步` | 无 | 与 Config Center 真源冲突。 |
| `1c542ab7` memory storage abstraction | `明确不同步` | 无 | 与 NION Memory OS 主链和已批准合同冲突。 |
| `7eb3a150` upstream memory management product surface | `明确不同步` | 无 | 与 NION Memory/Soul 用户面边界冲突。 |
| `0cdecf7b` upstream memory reflection/correction product path | `明确不同步` | 无 | 与 NION Memory/Soul 合同冲突。 |
| `c4d273a6` / `fa96acdf` / `19809800` backend channel integrations | `明确不同步` | 无 | NION 当前 bridge 是 desktop-first，不接纳 upstream backend channel 架构。 |
| `8bb14fa1` / `c1366cf5` / `5350b2fb` docs/skills/community extras | `明确不同步` | 无 | 不属于当前“安全吸收 upstream”目标。 |
| `6de9c7b4` channel retry / typing reliability | `当前无安全落点` | 无 | upstream 修补发生在 backend channel 层；NION 当前仓库已没有对应落点。 |
| `092bf13f` / `82c3dbbc` Windows / startup fixes | `当前无安全落点` | 无 | 本轮未复现同类 failure，不应无依据改脚本。 |
| `133ffe71` Ollama native thinking support | `当前无安全落点` | 无 | capability 方向成立，但 upstream 落点依赖 config/dependency 路线，不适合当前批次直接引入。 |

---

## 3. 本轮产出

本轮最终形成的执行提交为：

1. `7b611083` uploads fallback
2. `f27088b4` outline parser hardening
3. `929d6a2c` Claude OAuth billing header
4. `02902e5e` stream end rule lock
5. `88287e57` equivalent-absorption lock tests

这些提交已经把本轮能安全自动处理的 key commits 处理完了。

---

## 4. 结论

对于已进入审计决策面的 key commits，本轮状态已经闭环：

- 该同步的，已经同步
- 不该改实现但该锁规则的，已经锁定
- 早已吸收的，已经用代码/测试确认
- 不该合并的，已经明确关闭
- 当前无安全落点的，已经停止继续推进

这意味着当前分支不再存在“应该继续自动处理但还没处理”的剩余项。
