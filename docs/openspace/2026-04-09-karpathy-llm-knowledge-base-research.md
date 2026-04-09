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

## 代码级抽查后的确认

我又往下抽查了几份关键源码，前面的判断现在可以说是“代码级确认过”，不是只根据 README 推出来的。

`atomicmemory/llm-wiki-compiler` 的 `src/cli.ts` 直接把 `ingest`、`compile`、`query`、`watch`、`lint` 注册成一等命令；`src/commands/query.ts` 明确实现了两步式查询流程：先让模型根据 `wiki/index.md` 选择相关页面，再读取完整页面生成答案，并且支持把回答写回 `wiki/queries/`；`src/compiler/index.ts` 则把增量编译、依赖检测、冻结失败 extraction、链接解析、index 生成串成完整管线。也就是说，它不是“有几个命令名”，而是真的把 LLM Wiki 实现成了可执行编译器。

`llm-wiki-kit` 的 `server.py` 进一步确认了 MCP 服务路线不是宣传词。它用 `FastMCP` 暴露出 `wiki_init`、`wiki_ingest`、`wiki_write_page`、`wiki_read_page`、`wiki_search`、`wiki_lint`、`wiki_status`、`wiki_log`、`wiki_graph` 这些工具；`cli.py` 则只保留 `serve` 和 `init` 两个入口，把真正的长期能力都推到服务层。这和 CLI 编译器的设计哲学明显不同，说明它的目标就是成为 agent 可调用的知识服务。

`ussumant/llm-wiki-compiler` 虽然 hook 文件路径不稳定，但从 `plugin/commands/wiki-init.md` 和 `plugin/commands/wiki-compile.md` 已经能确认它的真实重点是“把 wiki 工作流嵌入代理生命周期”。`wiki-init` 不是静态初始化脚本，而是一步一步询问目录、输出路径、article structure、mode、stale detection；`wiki-compile` 明确要求读取 `.wiki-compiler.json`、读取 `schema.md`、再调用 `wiki-compiler` skill 做扫描、分类、编译、schema 更新和 index 更新。这证明它确实是插件工作流，而不是换皮 CLI。

所以，当前最稳的结论可以进一步收紧成一句话：

- `atomicmemory` 教你怎么做“知识编译器”
- `ussumant` 教你怎么把“知识编译器”变成代理工作流
- `llm-wiki-kit` 教你怎么把“知识编译器”变成 agent service

这三者拼在一起，基本就构成了我们如果要在 `omx / nion` 落地 LLM Wiki 时最该抄的骨架。

## 面向 Nion 升级的现状判断

把 `nion` 自己的 notebook / memory / openviking 再看一遍后，现在可以更具体地说：Nion 还没有 LLM Wiki，只是已经拥有做 LLM Wiki 的若干前置零件。

现状大致是这样：

- `NotebookService` 仍然是本地文件系统中的 note/asset 管理，加上一层 SQLite 元数据
- notebook assistant 是围绕“当前选中的单条 note”启动 thread，然后做聊天、rewrite、history、metadata 等 note 级操作
- `openviking/notebook_ingest.py` 会把 note 投影成 resource，再切 chunk 写进检索存储
- `RuntimeNotebookRetriever` 只做 query -> chunk hits -> context pack 注入

这说明当前 notebook 的主范式仍然是：

`note files -> chunk retrieval -> assistant on selected note`

而不是：

`raw notes/assets -> compiled wiki layer -> query/save/lint/continuous synthesis`

所以，如果目标是“把我们的 notebook 升级成 Karpathy 式知识库”，真正缺失的不是聊天框，也不是检索，而是一个**显式的编译中间层**。

## 对 Nion 最关键的升级判断

Nion 不应该把现有 notebook 直接改造成一个新的“memory bucket”，也不应该只是在现有检索上再堆几个 prompt。更合理的做法是：

1. 保持 notebook 继续做 canonical source
   note、asset、history、metadata 仍然留在本地 notebook 体系里
2. 在 notebook 之上增加一个 `compiled knowledge layer`
   这个层不替代原 note，而是消费 note/asset，生成 topic / concept / synthesis / index / log 这类派生产物
3. 让 openviking 从“只存 chunks”升级为“同时能存 compiled resources 和 retrieval-ready chunks”
4. 让 assistant 优先读 compiled pages，需要细节时再回退到原始 note

换句话说，Notebook 在 Nion 里应该继续是**原始知识资产层**，而新的 LLM Wiki 层应该是**编译后的知识操作层**。这和前面 Memory OS 设计里强调的“canonical asset ownership 不等于 provider surface”是完全一致的。

## 建议的 Nion Notebook -> LLM Wiki 分层

如果按最小可落地方式升级，我建议把 Nion notebook 相关能力拆成五层：

1. `Source Layer`
   现有 notebook note、asset、history、frontmatter、directory tree
2. `Projection Layer`
   现有 openviking note projection 和 chunk ingest 继续保留，但要多一个“wiki projection”
3. `Compiled Wiki Layer`
   新增 `topics/`、`concepts/`、`synthesis/`、`index`、`log`
4. `Retrieval Layer`
   assistant 查询时先读 compiled pages，再按 coverage / provenance 回退 notebook chunks
5. `Workflow Layer`
   新增 ingest / compile / lint / save-answer 这些 notebook knowledge actions

这里最重要的一点是：**compiled wiki layer 不应等同于 notebook tree 的另一个目录**。它应该是一个受治理的派生域，哪怕底层仍然落在本地文件系统中，也必须在产品语义上明确它是“agent-maintained compiled knowledge”，不是用户手写笔记文件夹。

## 对现有 Nion 能力的复用判断

真正值得复用的现有能力有这些：

- `NotebookService`
  继续做 note / asset / metadata / history 的 canonical owner
- `openviking/notebook_ingest.py`
  已经有 note -> resource -> chunks 的投影基础，可以扩展出 note -> wiki sources -> compiled pages 的第二条投影链
- `RuntimeNotebookRetriever`
  可以从“只搜 chunks”升级成“compiled pages 优先 + raw note chunks fallback”
- notebook assistant session
  可以继续存在，但角色要从“单 note assistant”升级成“knowledge workspace assistant”

不应该直接沿用的部分也很明确：

- 不能只靠当前 note-scoped assistant thread 来承载知识库能力
- 不能把 chunk retrieval 当成 compiled knowledge 的替代
- 不能把 Notebook UI 里现有的 history/info/ask 三栏结构误认为已经是知识库产品面

## 面向 Nion 的最小升级范围

如果只做第一阶段，我认为范围应该控制在下面四件事：

1. `Notebook Wiki Schema`
   为 notebook knowledge 定义固定 page types：`topic`、`concept`、`synthesis`、`index`、`log`
2. `Compile Job`
   从 notebook notes 中增量挑选 changed notes，生成/更新 compiled pages
3. `Notebook Knowledge Retrieval`
   notebook assistant 查询时优先读取 compiled pages，而不是直接从 raw note chunks 开始
4. `Save Back`
   把高价值回答存回 `synthesis` 或相关 topic page，而不是只留在 thread 历史里

做到这四件事，Nion 的 notebook 才会第一次从“可检索笔记系统”跃迁成“会持续累积的知识库系统”。

## 我现在对 Nion 升级方向的结论

这轮学习之后，我对 `nion notebook` 的升级判断已经比较稳定了：

- 不要把 Notebook 做成 Memory 的一个子卡片
- 不要把 Retrieval 当成 Knowledge Base
- 不要把单 note assistant 当成 wiki maintainer

应该做的是：

- 让 Notebook 保持原始资产层
- 让 OpenViking 增加 compiled knowledge 投影
- 让 Assistant 围绕 compiled knowledge 层工作
- 让高价值综合结果持续写回知识层

如果再往前走一步，下一份真正应该写的不是更多研究笔记，而是一份专门的 `Nion Notebook Knowledge Base Upgrade Design` 设计稿。

## 接口级验证补充

为了避免这个判断只停留在“看了几个 service 文件后的印象”，我又顺着 router、prompt、middleware、thread runtime 走了一圈，结果进一步收敛了结论。

先看 `openviking` 的公开能力面。当前 router 只暴露了三类 notebook 接口：

- `POST /api/openviking/notebook/reindex`
- `GET /api/openviking/notebook/search`
- `GET /api/openviking/notebook/context-preview`

而对应测试 `test_openviking_router_can_reindex_and_search_notebook` 验证的也是“note -> reindex -> chunk search -> context preview markdown” 这条链。这里完全没有 compiled topic page、concept page、synthesis page、save-back、lint、index rebuild 之类能力。这再次证明当前 OpenViking 在 Nion 里是 notebook retrieval substrate，不是知识编译层。

再看 notebook assistant 的边界。前端 `frontend/src/core/notebook-assistant/api.ts` 只有创建 / 恢复 note-scoped session 和 rewrite request 的封装，没有任何 knowledge-base 级动作。后端 prompt contract 更直接：`test_notebook_assistant_prompt_with_current_note_requires_note_grounded_answers` 明确要求“必须以当前笔记内容为依据”，overlay 里也把 assistant 定义成 `笔记助手`，并把 `<current_notebook_note>` 作为核心上下文块。这说明 notebook assistant 的产品定位现在就是“当前 note 的助手”，而不是“管理整个 notebook knowledge space 的 wiki maintainer”。

最后看 continuity path。`ContinuityMiddleware` 会把 `MemoryOSContextAssembler` 产出的 memory block 和 `RuntimeNotebookRetriever` 产出的 notebook chunk hits 合并成 `<continuity_context>` 注入主 agent。也就是说，当前跨 note 能力的本质仍然是 retrieval-time context injection，而不是 compile-time knowledge maintenance。它能帮助 agent 找到相关 note 片段，但不会主动维护 topic synthesis、cross-reference、coverage、orphan detection、save-back 这些 LLM Wiki 的核心机制。

这组接口级证据把前面的架构判断进一步钉死了：

- 当前 Nion notebook 已经有 source layer
- 已经有 retrieval layer
- 已经有 note-scoped assistant layer
- 但仍然缺少 compiled knowledge layer 和其对应的 workflow layer

所以，面向 Nion 的真正升级动作不该是“再给 notebook assistant 多喂一点 chunk”，而应该是：

1. 新增 notebook knowledge compile API
2. 新增 compiled page storage / projection
3. 新增 wiki-aware retrieval strategy
4. 新增 query-save / lint / index rebuild 这类 workflow actions

只有做到这一步，Nion 才算从“带检索的 notebook”进化成“会持续累积的 notebook knowledge base”。

## `nashsu/llm_wiki` 对 Nion Notebook 升级的直接启发

如果目标不是“把别人的 app 搬进来”，而是学习它来优化 Nion 自己的笔记/知识模块，那我认为它最值得借鉴的有两块：

1. Obsidian 兼容的 markdown 知识对象模型
2. 知识图谱与图谱驱动检索

### Obsidian 兼容 markdown：真正值得抄的是什么

`nashsu/llm_wiki` 最有价值的，不是它的 Tauri 壳，而是它把知识库 project 初始化成一套非常清晰的本地目录骨架：

- `raw/sources`
- `raw/assets`
- `wiki/entities`
- `wiki/concepts`
- `wiki/sources`
- `wiki/queries`
- `wiki/comparisons`
- `wiki/synthesis`
- `schema.md`
- `purpose.md`
- `wiki/index.md`
- `wiki/log.md`
- `.obsidian/app.json`
- `.obsidian/appearance.json`
- `.obsidian/core-plugins.json`

这对 Nion 有四个直接启发：

1. **page type 应该是一级对象**
   不要让所有东西都只是“普通 note”，然后靠 tag 猜它是概念、来源还是综合页。`entity / concept / source / query / comparison / synthesis` 这种一级对象划分，对 agent 维护和检索都更友好。

2. **`purpose.md` 应该存在**
   现在 Nion 的 notebook 更像内容容器，没有一个显式的“这个知识库为什么存在、要回答哪些问题、当前 thesis 是什么”的方向文件。这个文件对长期知识库非常重要。

3. **`index.md` 和 `log.md` 不该只是副产物**
   它们应该是 agent 和用户都依赖的一等工件。Nion 现在更像 tree + file list，未来如果真要做 knowledge base，这两个文件应该成为默认入口。

4. **Obsidian compatibility 应该是主动输出，不是被动兼容**
   `nashsu/llm_wiki` 会直接生成 `.obsidian` 配置，这点很重要。Nion 如果未来强调本地 Markdown 知识库，也应该把“Obsidian 可直接打开且体验正确”当成产品能力，而不是文档说明。

### 知识图谱：最该抄的是 relevance model，不是图长什么样

`nashsu/llm_wiki` 的 README 里最有价值的图谱部分，其实不是 sigma.js 画布，而是它把图谱相关性定义成了一个模型，而不是单纯把 `[[wikilink]]` 画出来：

- direct link
- source overlap
- Adamic-Adar
- type affinity

这对 Nion 的意义非常大，因为你们现在已经有：

- note / asset
- chunk retrieval
- source_relative_path
- runtime continuity injection

如果把上面这几类信号建成 relevance model，图谱就不只是右侧一个可视化组件，而能反过来驱动 retrieval 和 context assembly。

对 Nion 最值得吸收的点是：

1. **source overlap**
   这点和现有 notebook / asset / chunk 关系天然兼容，很适合先做

2. **type affinity**
   前提是 Nion 先把知识库 page type 明确化

3. **graph-driven retrieval**
   图谱不是展示层，而是 retrieval 排序层的一部分

### 对 Nion 来说，该抄什么、不该抄什么

**该抄的：**

- 目录级 page type 设计
- `schema.md + purpose.md + index.md + log.md`
- `.obsidian` 配置输出
- graph relevance model
- 把知识库视为 vault / project 的对象意识

**不该直接抄的：**

- 它的独立 Tauri 应用壳
- 它的 project open/create 主流程
- 它以文件系统命令为中心的整体架构
- 它完整的三栏产品界面

原因很简单：Nion 已经有自己的 runtime、workspace、thread、assistant、continuity、artifact 体系，真正缺的是知识对象模型和图谱/检索策略，不是另一个桌面壳。

### 我对 Nion 的具体建议

如果你的目标是“优化我们的笔记模块，特别是兼容 Obsidian 的 md 模块，还有知识图谱”，那我认为下一步不应该表述成“删掉 Notebook，换成别人的项目”，而应该表述成：

1. **Notebook Vault 重构**
   把当前 notebook 从“任意 note 树”重构成“raw sources + compiled knowledge pages”的双层 vault

2. **Obsidian Compatibility Layer**
   主动输出 `.obsidian` 配置、attachment 路径、link 风格、隐藏目录策略

3. **Knowledge Page Types**
   为 Nion 新增 `entity / concept / source / query / comparison / synthesis / overview`

4. **Graph + Retrieval Upgrade**
   图谱不只是 view；图谱 relevance 要进入 assistant 的 context assembly

换句话说，`nashsu/llm_wiki` 对 Nion 的真正价值，不是“替代 Notebook”，而是帮助我们把 Notebook 升级成 **Obsidian-compatible knowledge vault + graph-aware retrieval substrate**。

### 新鲜源码级验证

这轮我又把它的图谱和 Obsidian 兼容实现往下看了一层，结论比 README 级判断更硬。

第一，图谱确实不是“把 wikilink 画出来”这么简单。`src/lib/graph-relevance.ts` 明确把相关性建模成 4 个信号的加权和：

- direct link
- source overlap
- common neighbor（Adamic-Adar 变体）
- type affinity

而且它直接利用 frontmatter 里的 `sources[]` 字段来做 source overlap，这一点对 Nion 特别重要，因为我们现在本来就有 note / asset / source_relative_path / chunk projection 这些关系信号。`src/lib/wiki-graph.ts` 再把这个 relevance model 真正接到图谱边权上，而不是只拿它做文档说明。也就是说，这个项目在图谱上最值得抄的是“相关性模型和 retrieval thinking”，不是 sigma 画布本身。

第二，Obsidian 兼容也不是停留在 README 口号。`project.rs` 在 project 初始化时直接写出：

- `.obsidian/app.json`
- `.obsidian/appearance.json`
- `.obsidian/core-plugins.json`

同时固定了 attachment 路径、隐藏目录策略、wikilink 相关配置。这种做法非常值得 Nion 学，因为它把“兼容 Obsidian”从被动兼容变成主动生成正确环境。

第三，这也再次说明我们对它的取舍判断是对的：**该吸收的是 vault schema、frontmatter discipline、sources[]、图谱 relevance、Obsidian config 输出；不该吸收的是它的独立 app shell。**

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
