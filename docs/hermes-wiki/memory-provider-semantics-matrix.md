# Hermes Memory Provider 语义对照表

最后更新：2026-04-15

这页专门把 `builtin / Honcho / OpenViking` 放在同一张表里比较。
目标不是比较“谁更强”，而是比较它们到底承担什么 **memory semantics**。

## 1. 三方总体定位

| 提供者 | 更像什么 | 核心定位 |
| --- | --- | --- |
| Builtin | 紧凑、稳定、可控的 durable memory layer | 小而稳的默认记忆层 |
| Honcho | 带 recall policy 的认知型 memory subsystem | 用户建模与自动注入策略层 |
| OpenViking | 带 session commit 与自动抽取的外部知识基座 | 外部知识库存储与抽取层 |

## 2. 结构与持久化语义

| 维度 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| 持久化介质 | `MEMORY.md` / `USER.md` 文件 | 服务端 API / Honcho session manager | 外部 OpenViking 服务 |
| 持久化粒度 | 条目级、显式 add/replace/remove | turn 级 sync + conclusions | session 级 sync + commit 提取 |
| 注入稳定性 | session 起点 frozen snapshot | first-turn baked + per-turn recall | system prompt block + prefetch context |
| 目标语义 | compact facts / profile | user modeling / dialectic reasoning | knowledge base / extracted patterns |

## 3. Prompt 注入层语义

| 维度 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| system prompt 固定块 | 是，`_system_prompt_snapshot` | 是，`system_prompt_block()`，且受 `recall_mode` 影响 | 是，`system_prompt_block()` 提供知识库说明 |
| first-turn baking | 没有单独 first-turn baking，直接 session snapshot | 有，first-turn context baking | 没有 first-turn baking 语义，主要是 prefetch 结果 |
| per-turn auto injection | 否 | 视 `recall_mode` 与 cadence 而定 | 是，但更偏 search/prefetch 结果注入 |
| mid-session prompt 刷新 | 否，保持 frozen | 否，首轮 baked 内容稳定；动态 recall 走 prefetch | 否，动态部分来自 prefetch，不改 frozen layer |

### 结论

- Builtin 最强调缓存稳定和可控性
- Honcho 最强调“按策略自动提供相关认知上下文”
- OpenViking 更像“把外部知识搜索结果带进当前轮”

## 4. Recall / Prefetch 语义

| 维度 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| `prefetch()` | 无专门 rich recall | 有，且受 `recall_mode` / injection frequency 影响 | 有，返回背景搜索结果 |
| `queue_prefetch()` | 无 | 有，后台 dialectic prefetch | 有，后台 search prefetch |
| recall mode | 无 | `context` / `tools` / `hybrid` | 无显式 recall mode |
| tools-only 模式 | 不适用 | 有，且延迟 session init | 无对应概念 |

### 结论

Honcho 的核心差异不是“也能查历史”，而是它把 recall 变成了一个有模式、有节奏、有注入策略的 subsystem。
OpenViking 也有 prefetch，但更像知识检索预热，而不是完整 recall policy。

## 5. Sync / Extraction 语义

| 维度 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| `sync_turn()` | 不通过 provider interface；memory tool 显式写入 | 是，异步记录 turn | 是，异步写 session messages |
| `on_session_end()` | 不适用 provider；session 边界只影响 flush 逻辑 | flush all pending messages | commit session 触发 extraction |
| `on_pre_compress()` | 不适用 provider；builtin 自身无 rich extraction hook | 有，可在压缩前提取信号 | 当前重点不在该钩子，主要靠 session commit |
| `on_memory_write()` | 自身就是写入源 | 可镜像 builtin writes | 可镜像 builtin writes |

### 结论

- Builtin 更像显式 note store
- Honcho 更像 turn-synced cognitive layer
- OpenViking 更像 session-committed extraction layer

## 6. Tool 暴露语义

| 维度 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| 默认交互方式 | `memory` tool | provider-specific tools + optional auto-injection | provider-specific tools + optional prefetch |
| 工具数量 | 极少，统一走 `memory` | `honcho_profile` / `honcho_search` / `honcho_context` / `honcho_conclude` 等 | `viking_search` / `viking_read` / `viking_browse` / `viking_remember` / `viking_add_resource` |
| 工具可见性 | 永远可见，前提是 memory toolset 开启 | 受 `recall_mode` 影响，`context` 模式隐藏工具 | 固定暴露 provider tools |

### 结论

Honcho 的一个关键差异是：
它不仅决定“自动注不注入”，还决定“工具露不露给 agent”。

## 7. Cron / Headless / 特殊场景语义

| 维度 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| cron 中是否启用 | 可通过 `skip_memory` 关闭 builtin 行为 | 有明确 cron guard，避免污染用户建模 | 历史上在 reset / cron commit 路径暴露过问题 |
| 对 headless autonomous task 的适配 | 简单，因本身是紧凑 note store | 敏感，容易把系统指令或无真实用户的消息写进用户表示 | 依赖 commit 时机，容易延迟提取 |

### 结论

越“智能”的 provider，越需要对 headless / cron / gateway reset 这些边界做额外保护。
Builtin 反而因为简单，更少踩到这类语义污染问题。

## 8. 风险模式对照

| 风险 | Builtin | Honcho | OpenViking |
| --- | --- | --- | --- |
| prompt 污染 | 主要风险在磁盘文件被外部污染后 load 进 snapshot | recall 注入层选择错误会污染当前 user turn | prefetch 结果注入到 user turn 同样可能污染 |
| 缓存不稳定 | 低，设计就是 frozen snapshot | 中，first-turn baking + dynamic recall 需要边界清晰 | 中，system block + dynamic prefetch 需分层清楚 |
| session 结束丢数据 | 中，取决于 flush 触发 | 中，sync / flush / cache race 可能掉 conclusion | 高一些，commit 时机直接影响 extraction |
| 工具路由错误 | 低 | memory provider tools 在 sequential path 上历史上出过问题 | provider tools / API endpoint 历史上出过问题 |

## 9. 一个最实用的总结

如果你只想记一句话：

- Builtin = **小而稳的默认记忆**
- Honcho = **带策略的认知型记忆**
- OpenViking = **带提交抽取的外部知识基座**

这三者不是简单替换关系，而是三种不同的 memory philosophy。

## 10. 对专家 skill 的直接启发

未来在审查别的 agent 系统时，不能只问“有没有 memory provider”，而必须追问：

1. 它的默认 durable memory 是什么？
2. 它的 rich recall 是按什么策略注入？
3. 它的 extraction 是 turn-driven 还是 session-commit-driven？
4. 它的 provider tools 是固定暴露还是策略暴露？
5. 在 cron / reset / headless 场景下，它会不会污染用户模型？
