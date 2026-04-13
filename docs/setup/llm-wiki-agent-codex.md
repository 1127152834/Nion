# 在 Codex 里安装和使用 `llm-wiki-agent`

## 安装

在仓库根目录运行：

```bash
python3 scripts/install-llm-wiki-agent.py \
  --workspace ~/Documents/llm-wiki-agent-demo
```

这会做三件事：

1. 把上游模板安装到 `~/.codex/vendor_imports/llm-wiki-agent`
2. 把 Codex skill 安装到 `~/.codex/skills/llm-wiki-agent`
3. 初始化一个可直接打开的示例工作区 `~/Documents/llm-wiki-agent-demo`

安装新 skill 后，重启 Codex，后续新会话才能自动发现它。

## Python 依赖

如果你要直接运行 `tools/*.py`，再执行：

```bash
~/.codex/skills/llm-wiki-agent/scripts/wiki-setup-python.sh \
  ~/Documents/llm-wiki-agent-demo
```

## 在 Codex 里使用

打开 `~/Documents/llm-wiki-agent-demo` 作为工作区后，可以直接用自然语言：

- `请 ingest README.md`
- `query: 这个 wiki 的核心用途是什么？`
- `build graph`
- `lint`

也可以直接跑 CLI：

```bash
cd ~/Documents/llm-wiki-agent-demo
.venv/bin/python tools/ingest.py README.md
.venv/bin/python tools/query.py "What does this wiki do?"
.venv/bin/python tools/build_graph.py --no-infer
.venv/bin/python tools/lint.py --save
```

## 设计取舍

- 没有把上游仓库硬改造成当前仓库的一部分，而是保留为 `vendor_imports` 模板，便于后续升级。
- 没有引入新依赖，直接复用上游的 Python 工具和 `AGENTS.md` 工作流。
- 当前仓库只保留安装器和说明文档，避免把业务仓库污染成知识库模板仓库。
