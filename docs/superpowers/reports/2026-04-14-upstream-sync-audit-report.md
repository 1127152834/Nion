# NION Upstream Sync Audit Report

日期：2026-04-14  
基线：`electron` vs `upstream/main`  
状态：Draft audit report

---

## 1. 执行摘要

本报告只做源码级同步审计，不执行 merge、cherry-pick 或产品代码同步。

## 2. 主题总表

| 主题 | 上游改动摘要 | 提交数 | 关键 commit | 业务价值 | 影响范围 | 适配难度 | 架构冲突标记 | 建议动作 | 优先级 | 结论理由 |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 安全与沙箱 | Local sandbox host bash 安全门禁、路径约束与命令审计强化 | 1 | `92c7a20c` | S | H | 2 | DESKTOP | 已等价吸收，无需同步 | P1 | NION 已有 host bash gating 与 subagent/tool 禁止逻辑，当前重点只剩测试覆盖差口核对。 |
| 线程与运行时稳定性 | 同线程并发 run 守卫与 SSE 终止正确性 | 2 | `89183ae7`, `6dbdd467` | S | H | 2-3 | DESKTOP | 已等价吸收 / 重写后同步 | P0 | 并发 run 拒绝已在 NION 主链化；END sentinel 保障属于不同 streaming 架构，需要按 NION 流水线重写验证。 |
| 上传与文档处理 | PDF 转换回退、outline 注入、thread_id fallback、heading regex 硬化 | 4 | `ddfc988b`, `5ff230ea`, `163121d3`, `46d0c329` | S | M | 2-3 | CFG | 已等价吸收 / 部分同步 | P0 | 转换与 outline 主链大体已吸收，但 `thread_id` fallback 与部分 regex/preview 硬化仍值得局部提取。 |

## 3. Commit 明细附表

| commit | 标题 | 涉及模块/文件 | 上游解决了什么问题 | NION 当前状态 | 是否已等价吸收 | 建议动作 | 风险点 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `92c7a20c` | [Security] Address critical host-shell escape in LocalSandboxProvider | `sandbox/security.py`, `sandbox/tools.py`, `task_tool.py` | 禁止 LocalSandbox 默认暴露 host bash 与 bash subagent | NION 已有本地 sandbox host-bash gating 与同类错误消息 | 是 | 已等价吸收，无需同步 | 需要补比对测试覆盖深度 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/sandbox/security.py` |
| `89183ae7` | reject concurrent same-thread runs | `channels/manager.py`, `test_channels.py` | 防止同线程并发 run 互相踩踏 | NION 在 `threads/service.py` 已有 `_claim_thread_run()` 与 `ThreadBusyError` | 是 | 已等价吸收，无需同步 | bridge 适配层是否绕过线程服务 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/threads/service.py` |
| `6dbdd467` | guarantee END sentinel delivery when stream bridge queue is full | `runtime/stream_bridge/memory.py`, `test_stream_bridge.py` | 队列满时保证 END 事件送达，避免 SSE 永久挂起 | NION 未发现同名 stream bridge 队列层，但客户端契约要求 `end` 事件 | 否 | 重写后同步 | desktop/daemon streaming 架构不同，不能直接搬 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/client.py`; `desktop/src/main/bridge/nion-thread-client.ts` |
| `ddfc988b` | add pymupdf4llm PDF converter with auto-fallback and async offload | `utils/file_conversion.py`, `config/app_config.py`, `test_file_conversion.py` | 提升 PDF 转换质量并避免阻塞事件循环 | NION 已有 PyMuPDF4LLM 优先、稀疏回退、线程离线执行 | 是 | 已等价吸收，无需同步 | upstream 的 `pdf_converter` 配置会引入 CFG 冲突 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/utils/file_conversion.py` |
| `5ff230ea` | inject document outline into agent context for converted files | `uploads_middleware.py`, `file_conversion.py` | 把文档 outline/line hints 注入上传上下文 | NION 已有 outline、preview、file-first `read_file` 指导 | 是 | 已等价吸收，无需同步 | 可比较 truncation sentinel 细节 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py` |
| `163121d3` | handle split-bold headings and `** **` artefacts in extract_outline | `uploads_middleware.py`, `file_conversion.py` | 硬化 PDF 导出 markdown 的标题抽取与空 outline fallback | NION 已有 split-bold outline 基础，但 regex/preview 细化不完全一致 | 否 | 部分同步 | 只抽 regex/preview 硬化，不引入上游产品提示语义 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/utils/file_conversion.py` |
| `46d0c329` | uploads fallback to configurable.thread_id | `uploads_middleware.py` | runtime.context 无 thread_id 时仍能解析 uploads 目录 | NION uploads middleware 仍直接读 `runtime.context.thread_id` | 否 | 部分同步 | 局部 correctness fix，低风险可吸收 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py` |

## 4. 冲突热点分析

## 5. 推荐同步批次

## 6. 明确不同步清单

## 7. 审计证据与命令
