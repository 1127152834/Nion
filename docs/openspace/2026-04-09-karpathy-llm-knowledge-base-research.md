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
