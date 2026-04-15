# OpenClaw vs Hermes

最后更新：2026-04-15

这个对照不是为了判输赢，而是为了更准确理解 Hermes 的取舍。

## 1. 两者的共同点

OpenClaw 和 Hermes 都已经超出了“聊天助手”范畴，二者都强调：

1. 持久记忆
2. skills
3. subagent / delegation
4. 多平台接入
5. 长期运行中的用户关系与工作连续性

所以二者都属于真正意义上的 agent runtime，而不是纯 UI 包装。

## 2. Hermes 更强调什么

从官方叙事和近期 release 看，Hermes 更强调下面这些方面：

1. **runtime 统一性**：CLI、gateway、API server、MCP server、cron 共用同一运行时骨架
2. **profiles**：多实例、多身份、多配置隔离
3. **provider/runtime engineering**：多 provider、fallback chain、credential pools
4. **prompt caching / compression**：把上下文控制上升为架构问题
5. **插件化**：memory provider、context engine、general plugins
6. **service 化入口**：不绑死在本地桌面或单一界面
7. **安全硬化**：secret exfiltration blocking、credential protection、approval routing

如果说 OpenClaw 更容易让人感受到“一个持续陪伴、持续行动的 agent”，那么 Hermes 更容易让人感受到“一个被工程化成平台的 agent runtime”。

## 3. OpenClaw 更鲜明的地方

基于当前掌握的资料，OpenClaw 更鲜明的点在于：

1. bootstrapping ritual 更强
2. `SOUL.md` / `IDENTITY.md` / `USER.md` 的人格与身份显式感更强
3. active-memory sub-agent 叙事更直接
4. 对“agent 作为长期关系对象”的表达更浓

也就是说，OpenClaw 更像先从 agent 主体性和记忆连续性出发，再逐步扩展系统能力。

## 4. Hermes 的不同路径

Hermes 看起来更像是从“可长期运行的 agent system”出发：

1. 先把 runtime、入口、profiles、gateway、provider、tool runtime 打牢
2. 再把 learning loop、memory、skills、Honcho 用户模型接进去

因此 Hermes 的气质更偏：

- 可部署
- 可扩展
- 可隔离
- 可运营
- 可嵌入

## 5. 最重要的区别：Hermes 更像平台，OpenClaw 更像主体

这是一个刻意尖锐但有帮助的总结：

### OpenClaw 的强项表达

“这是一个会逐步认识你、记住你、主动为你工作的 agent。”

### Hermes 的强项表达

“这是一个可长期运行、可多入口接入、可学习、可治理、可扩展的 agent runtime。”

二者都重要，但它们的第一叙事中心并不一样。

## 6. 为什么这个区别重要

因为如果只盯着表层能力，会误以为二者只是“功能列表略有差异”。  
实际上它们更深的区别在于设计重心：

1. 是优先塑造 agent 主体与关系感，还是优先塑造 runtime 能力与扩展边界。
2. 是优先让记忆和人格站到最前面，还是优先把统一运行时、profiles、gateway、provider resolution 打牢。

这会直接影响后续每个子系统怎么演化。

## 7. 对 Nion 的启发

对 Nion 来说，不应简单问“更像 OpenClaw 还是更像 Hermes”，而应该拆开问：

1. 在用户关系、身份记忆、人格稳定性上，哪些更该向 OpenClaw 学。
2. 在 runtime 一致性、profiles、provider/runtime、tool isolation、安全硬化上，哪些更该向 Hermes 学。
3. 哪些是必须组合起来的，而不是二选一。

## 8. 当前判断

如果目标是“把 Hermes 学透”，最该吃透的不是某个 feature，而是它为什么会天然走向下面这个方向：

> 从一个会对话的 agent，演化为一个可以长期运行、对外提供服务、对内持续学习并且被严格治理的 runtime 平台。
