# Karpathy 的 LLM Knowledge Base / LLM Wiki 研究摘要

## 结论

Karpathy 这次引爆的不是一个“更强的 RAG”，而是一种更适合代理时代的知识工作模式：让 LLM 维护一个持续增长、可浏览、可交叉引用、可回灌的新中间层，而不是在每次提问时从原始资料里重新拼上下文。这个模式的最小骨架是三层：`raw sources` 作为不可变事实层，`wiki markdown` 作为持久知识层，`AGENTS.md / CLAUDE.md` 一类 schema 作为代理操作层[1]。

这波概念能在 2026-04-02 到 2026-04-09 这一周迅速扩散，核心原因不是“知识库突然成了新需求”，而是代理维护 markdown、索引、交叉引用和增量更新的成本突然足够低，导致这类系统第一次具备了低摩擦的可执行性[1][2][3][4][5][6][7]。从社区实践看，已经形成三条主要路线：编译器路线、代理插件/MCP 路线、自生长产品路线[2][3][4][5][6][7]。

## 值得学习的点

真正值得学习的不是前端展示，而是四个工程骨架：

1. `schema`：页面类型、章节结构、摄入与查询时的操作协议怎么定义[1][4]
2. `provenance`：每个结论怎么回指 source，coverage 怎么标记[1][2][4]
3. `lint`：如何发现孤儿页、矛盾、过时结论和结构退化[1][2][4][6]
4. `incremental update`：新 source 进入后如何局部更新，而不是全量重编译[2][3][4]

如果一个实现缺少这四项中的两项以上，它更像概念展示，不像长期可用的知识系统。

## 对 omx / nion 的启发

如果把这个模式迁移到 `omx` 或 `nion`，最合理的起步方式不是直接做大而全的平台，而是先做一个最小可观察原型：

1. 建立 `raw/ + wiki/ + schema/ + index.md + log.md`
2. 先支持 `ingest / query / lint / log append`
3. 明确 wiki 是代理优先读取的中间层，但 raw 仍是 source of truth
4. 对每个 wiki page 增加 sources、coverage、updated_at 一类元数据
5. 等最小系统稳定后，再考虑 MCP、全文搜索、图谱和团队协作层

这个方向和当前 `omx` 的定位是相容的，因为它本质上是在补“代理外部知识工件层”，不是在替换现有推理层。

## 代表性实现

- `atomicmemory/llm-wiki-compiler`：标准编译器路线，强调两阶段 compile、hash 增量、`query --save`、lint[2]
- `ussumant/llm-wiki-compiler`：Claude Code 插件路线，强调 staged adoption 和 coverage 指标[4]
- `nvk/llm-wiki`：Claude 插件式 compiled knowledge base[5]
- `llm-wiki-kit`：多源 ingest + MCP 路线，强调跨代理 persistent memory[6]
- `lucasastorian/llmwiki` / `llmwiki.app`：产品化入口[7]
- `yologdev/karpathy-llm-wiki`：自生长产品实验，把 founding prompt 变成持续增长系统[3]

## 新鲜验证快照

2026-04-09 这轮验证里，我额外固化了“这波扩散确实发生在几天内”的时间线证据，而不是只做抽象总结。

| 项目 | 路线 | 创建时间 | 今日观测到的 stars |
|---|---|---:|---:|
| `atomicmemory/llm-wiki-compiler` | 编译器 | 2026-04-05 | 257 |
| `ussumant/llm-wiki-compiler` | Claude Code 插件 | 2026-04-04 | 133 |
| `nvk/llm-wiki` | Claude 插件 | 2026-04-04 | 145 |
| `lucasastorian/llmwiki` | 产品化入口 | 2026-04-04 | 105 |
| `yologdev/karpathy-llm-wiki` | 自生长产品实验 | 2026-04-06 | 31 |
| `iamsashank09/llm-wiki-kit` | MCP / 多源 ingest | 2026-04-07 | 19 |

同一天抓取到的 HN 时间线也支持这个判断：

- `LLM Wiki – example of an "idea file"`：2026-04-04，294 points，93 comments
- `Show HN: LLM Wiki – Open-Source Implementation of Karpathy's LLM Wiki`：2026-04-06
- `Show HN: LLM Wiki Compiler Inspired by Karpathy`：2026-04-06

这说明它不是“后来回头看好像有很多人做”，而是在 Karpathy 提出模式后 2 到 5 天内，GitHub 和 HN 就同时出现了实现与讨论的集中爆发。

另一个热度锚点是，GitHub 对 Karpathy 这份 gist 的公开页面快照显示它已经达到 `7675 stars / 1588 forks / 218 comments`。这说明它不是一个小范围 agent 圈内 memo，而是一次明显越过小圈层的概念传播。

## 建议的学习顺序

如果目标不是“看热闹”，而是最快学明白这个范式，顺序应该这样排：

1. 先读 Karpathy 的 gist，理解三层结构和 `ingest / query / lint / index / log` 这些动作到底在解决什么问题[1]
2. 然后看 `atomicmemory/llm-wiki-compiler`，因为它最接近“把抽象模式变成编译器”的标准答案[2]
3. 再看 `ussumant/llm-wiki-compiler` 或 `nvk/llm-wiki`，理解这套模式如何嵌进 Claude Code / agent 工作流，而不是单独跑一个系统[4][5]
4. 如果你关心跨代理和多源 ingest，再看 `llm-wiki-kit`，重点看 MCP、PDF/URL/YouTube 接入和 FTS 搜索[6]
5. 最后再看 `yologdev/karpathy-llm-wiki`，它更像“这个范式如何延展成自生长产品”的展示，不该作为第一站[3]

这套顺序的理由很简单：先学骨架，再学嵌入代理，再学服务化，最后看叙事化扩展。反过来学，很容易被 showcase 吸走注意力。

## 进一步学习后的实现拆解

继续往下拆实现后，有三点已经比较明确。

第一，`atomicmemory/llm-wiki-compiler` 代表的是最干净的“编译器分层”。它在 `src/commands/` 下明确拆出 `compile.ts`、`ingest.ts`、`lint.ts`、`query.ts`、`watch.ts`，而在 `src/compiler/` 下继续拆出 `hasher.ts`、`indexgen.ts`、`resolver.ts`、`obsidian.ts`、`orphan.ts`、`prompts.ts` 等模块。这说明它把系统看成一条稳定的构建链：命令面负责触发动作，编译核心负责增量判定、索引生成、链接解析和健康修复。

第二，`ussumant/llm-wiki-compiler` 代表的是“代理插件分层”。它的 `plugin/` 目录里直接有 `commands/`、`hooks/`、`skills/`、`templates/`。这个切法说明它的核心不是独立程序，而是把知识库能力嵌进 Claude Code 生命周期里：命令触发具体动作，hooks 影响 SessionStart 行为，skills 负责工作流约束，templates 负责输出结构。也就是说，它更像“让代理自然使用 wiki”，而不是“用户显式操作 wiki”。

第三，`llm-wiki-kit` 代表的是“服务层分层”。它在 `src/llm_wiki_kit/` 下同时保留 `cli.py` 和 `server.py`，说明作者把这个系统既当本地工具，也当 MCP 服务。结合 README 里的 `wiki_ingest`、`wiki_search`、`wiki_lint`、`wiki_status` 这些 tool 名字，可以看出它的抽象已经从“命令行编译器”转向“可被任意 agent 调用的知识服务”。

## 对 omx / nion 更具体的迁移蓝图

如果把上面三种实现方式综合起来，适合 `omx / nion` 的最小可迁移蓝图应该是四层：

1. `storage layer`
   `raw/`、`wiki/`、`index.md`、`log.md`、`schema.md`
2. `compiler layer`
   `ingest`、`compile`、`query-save`、`lint`、`watch` 这些动作的核心实现
3. `agent integration layer`
   SessionStart 提示、命令入口、技能约束、coverage / provenance 读取策略
4. `service layer`
   面向 MCP 或内部 agent 的工具接口，比如 `wiki_ingest`、`wiki_search`、`wiki_lint`、`wiki_status`

这意味着对 `omx / nion` 最合理的起步，不是先做网页，也不是先做图谱，而是先把第 1 层和第 2 层做实，再决定第 3 层放在 skill / hook 还是 command，最后再把第 4 层暴露给 agent。

更直接地说，下一阶段如果真要做原型，最小范围应该是：

- 一个本地目录规范
- 一个 `ingest + compile + lint + query-save` 的最小命令面
- 一套 page frontmatter：`sources`、`coverage`、`updated_at`
- 一个让代理优先读 `wiki/`、必要时回退 `raw/` 的读取策略

做到这里，才算真正学到了“如何做自己的 LLM Wiki”，而不是只学会了“有哪些人在做”。

## 交付物

完整研究报告已输出到：

- `/Users/zhangtiancheng/Documents/LLM_Knowledge_Bases_Research_20260409/research_report_20260409_llm_knowledge_bases.md`
- `/Users/zhangtiancheng/Documents/LLM_Knowledge_Bases_Research_20260409/research_report_20260409_llm_knowledge_bases.html`

说明：PDF 未生成，因为当前机器缺少 `pdflatex` 或其他可用 PDF engine。

## 参考

[1] Andrej Karpathy (2026). "LLM Wiki". GitHub Gist. https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
[2] atomicmemory (2026). "llmwiki". GitHub Repository README. https://github.com/atomicmemory/llm-wiki-compiler
[3] yologdev (2026). "The Self-Growing Karpathy LLM Wiki". GitHub Repository README. https://github.com/yologdev/karpathy-llm-wiki
[4] ussumant (2026). "LLM Wiki Compiler". GitHub Repository README. https://github.com/ussumant/llm-wiki-compiler
[5] nvk (2026). "llm-wiki". GitHub Repository. https://github.com/nvk/llm-wiki
[6] iamsashank09 (2026). "llm-wiki-kit". GitHub Repository README. https://github.com/iamsashank09/llm-wiki-kit
[7] lucasastorian (2026). "LLM Wiki". Product Website. https://llmwiki.app/
