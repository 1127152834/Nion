# 研究来源

## 一、内部代码与文档

### 当前代码主链路

- [backend/packages/harness/nion/agents/memory/storage.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/storage.py)
- [backend/packages/harness/nion/agents/memory/updater.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/updater.py)
- [backend/packages/harness/nion/agents/memory/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/prompt.py)
- [backend/packages/harness/nion/agents/middlewares/memory_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/memory_middleware.py)
- [backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py)
- [backend/packages/harness/nion/agents/middlewares/continuity_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/continuity_middleware.py)
- [backend/packages/harness/nion/recall/local_archive.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/recall/local_archive.py)
- [backend/packages/harness/nion/openviking/chunk_store.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/chunk_store.py)
- [backend/packages/harness/nion/openviking/runtime_retriever.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/runtime_retriever.py)
- [backend/packages/harness/nion/agents/lead_agent/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py)
- [backend/packages/harness/nion/config/paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py)
- [backend/packages/harness/nion/memory_payloads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_payloads.py)
- [backend/app/gateway/routers/memory.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py)
- [backend/app/gateway/routers/recall.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/recall.py)
- [README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/README.md)

### 已有内部研究/设计稿

- [docs/superpowers/specs/2026-03-30-openviking-memory-os-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-30-openviking-memory-os-design.md)
- [docs/superpowers/specs/2026-03-31-memoh-reference-reading-log.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-reference-reading-log.md)
- [docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-03-31-memoh-nion-parity-baseline.md)
- [docs/superpowers/research/2026-04-01-personal-agent-user-model-and-proactive-learning.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/research/2026-04-01-personal-agent-user-model-and-proactive-learning.md)
- [docs/superpowers/research/2026-04-01-claude-code-operating-model-for-nion.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/research/2026-04-01-claude-code-operating-model-for-nion.md)
- [docs/superpowers/specs/2026-04-02-notebook-redefinition-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-02-notebook-redefinition-design.md)

## 二、外部公开来源

### Mem0

- [Memory Types - Mem0](https://docs.mem0.ai/core-concepts/memory-types)
- [Add Memory - Mem0](https://docs.mem0.ai/core-concepts/memory-operations)
- [Entity-Scoped Memory - Mem0](https://docs.mem0.ai/platform/features/entity-scoped-memory)
- [Graph Memory - Mem0](https://docs.mem0.ai/open-source/features/graph-memory)

### Letta / MemGPT

- [Memory - Letta Docs](https://docs.letta.com/letta-code/memory/)
- [Archival memory - Letta Docs](https://docs.letta.com/guides/core-concepts/memory/archival-memory/)
- [Core concepts - Letta Docs](https://docs.letta.com/core-concepts)
- [Agent memory & architecture - Letta Docs](https://docs.letta.com/guides/agents/architectures/memgpt)
- [MemGPT: Towards LLMs as Operating Systems - arXiv](https://arxiv.org/abs/2310.08560)

### LangGraph / Deep Agents

- [Memory overview - LangGraph JS Docs](https://docs.langchain.com/oss/javascript/langgraph/memory)
- [Add long-term memory - LangGraph Python Docs](https://docs.langchain.com/oss/python/langgraph/add-memory)
- [Long-term memory - LangChain Docs](https://docs.langchain.com/oss/python/langchain/long-term-memory)
- [Long-term memory - Deep Agents JS Docs](https://docs.langchain.com/oss/javascript/deepagents/long-term-memory)

### Amazon Bedrock AgentCore Memory

- [User preference memory strategy - Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/user-preference-memory-strategy.html)
- [System prompt for user preference memory strategy - Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-user-prompt.html)
- [Self-managed strategies - Amazon Bedrock AgentCore](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/memory-self-managed-strategies.html)

### Zep / Graphiti

- [Zep Homepage](https://www.getzep.com/)
- [Facts - Zep Documentation](https://help.getzep.com/facts)
- [Graph Overview - Zep Docs](https://help.getzep.com/understanding-the-graph)
- [Understanding the Graph - Zep Docs](https://help.getzep.com/v2/understanding-the-graph)
- [Agent Memory - Zep](https://www.getzep.com/product/agent-memory/)
- [Knowledge Graph MCP Server - Zep](https://www.getzep.com/product/knowledge-graph-mcp/)
- [Zep: A Temporal Knowledge Graph Architecture for Agent Memory - arXiv](https://arxiv.org/abs/2501.13956)

### MemOS / OpenMemory / AgentMem

- [什么是 MemOS？](https://memos-docs.openmem.net/cn/home/memos_intro/)
- [架构设计 - MemOS](https://memos-docs.openmem.net/cn/open_source/home/architecture)
- [MemScheduler - MemOS](https://memos-docs.openmem.net/modules/mem_scheduler)
- [OpenMemory](https://openmemory.ai/)
- [AgentMem Docs](https://agentmem.io/docs)

### 认知架构

- [Cognitive Architectures for Language Agents (CoALA) - arXiv](https://arxiv.org/abs/2309.02427)

## 三、使用原则

本轮研究对外部材料的使用方式如下：

1. 只把外部资料作为模式参考，不把它们直接当作 Nion 现状。
2. 优先吸收 operating model、memory model、ownership model、maintenance model。
3. 不照抄外部产品壳，不把 Nion 带偏成纯 code agent 或纯 memory SaaS。
