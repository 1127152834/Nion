# 模块建议 05 - Settings / Configuration / Desktop Compatibility

## 模块目标
保障设置页、配置中心、技能开关、desktop/web 共享 API 契约在不同入口下行为一致。

## 当前主要问题
1. skill toggle 前端失败处理已经修正：`enableSkill()` 对非 `2xx` 抛错，settings 页面会走 `onError -> toast.error`，但仍需补更完整的行为测试覆盖。
2. skill identity 已切到稳定 `id`（`category + relative path`）作为前端交互主键，后端读/改/删也已兼容 `id`、legacy id 与旧 `name`；当前剩余的是长期兼容层是否继续保留，而不是重名歧义未解。
3. skill parser 与 validation 的 frontmatter 解析语义已统一为 YAML 解析；validation 仍保留更严格的 schema 约束，这是有意保留，不算漂移。
4. skills router 与 mcp router 在无 config 时已统一走 `ExtensionsConfig.initialize_config_path()`，不再各自拼 `cwd.parent` fallback。
5. desktop compatibility 的测试资产存在，但仍需结合统一契约加强行为级测试，而不只是接口存在性。

## 建议事项
- 保持 skill enable/disable 的前端 mutation 以 `response.ok` 或明确错误响应为准，失败时给出稳定错误反馈。
- 保持 skill 的稳定 `id` 作为前后端主交互键，并在兼容期内继续支持旧 `name` / legacy id 读取，避免迁移期行为漂移。
- 保持同一套 YAML 解析逻辑贯通 skill validate / install / load，避免“装得进、读不全”。
- skills router / mcp router 继续统一使用 `ExtensionsConfig.initialize_config_path()`，避免重新引入 cwd 敏感 fallback。
- 对 desktop-client 与 web client 的共享线程接口建立更强的行为对齐测试。

## 推荐优先级
- **已完成 / P0 已落地**：修 skill toggle 错误处理。
- **已完成 / P1 已落地**：统一 parser/validation 行为。
- **已完成 / P1 已落地**：统一 skills config 路径解析。
- **剩余 P1**：加强 desktop/web 行为契约测试。

## 推荐补充验证
- skill toggle 在 4xx/5xx 返回时的前端反馈测试。
- 重名 skill 的 list/read/update/delete 行为测试。
- richer YAML frontmatter 的安装 → 加载 → 展示一致性测试。
- 不同 cwd 启动 gateway 时 skills config 更新路径一致性测试。
