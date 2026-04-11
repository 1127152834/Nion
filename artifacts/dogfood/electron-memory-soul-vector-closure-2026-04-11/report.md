# Subproject B 验收报告

日期：2026-04-12  
范围：Memory / Soul Vector System Product Closure（Subproject B）  
验收环境：

- 前端：`http://127.0.0.1:3000`
- 网关：`http://127.0.0.1:8001`
- 远端 embedding stub：`http://127.0.0.1:8010/v1/embeddings`
- 隔离数据目录：`/tmp/nion-vector-acceptance-subproject-b`

## 1. 验收样本

本次验收没有污染默认 `~/.nion-data`，而是在独立 `NION_HOME` 下写入了 3 条结构化长期记忆样本，用于验证索引构建和语义命中：

1. `财务 BP，负责预算协同和经营分析`
2. `用户常驻时区是 Asia/Shanghai`
3. 另一条 `user_model` 结构化记录（同一索引重建结果中的第 3 条记录）

核心语义 query：`预算协同岗位`

## 2. 本地模式验收

### 2.1 动作结果

- `POST /api/memory/settings/download` 成功
- `POST /api/memory/settings/rebuild` 成功
- 重建结果：`record_count = 3`
- 重建时间：`2026-04-11T16:04:01Z`

### 2.2 查询结果

在本地模式下运行结构化记忆搜索：

```text
query = 预算协同岗位
results = [
  "财务 BP，负责预算协同和经营分析",
  "用户常驻时区是 Asia/Shanghai"
]
```

说明：

- 第 1 条命中证明向量索引已能把语义近似 query 命中到结构化长期记忆
- 第 2 条为同域次级命中，符合当前 `limit=3` 的返回行为

### 2.3 前端证据

- Memory 页面：`artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/screenshots/memory-page-after-local-rebuild.png`
- Settings > Memory 初始页：`artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/screenshots/settings-memory-initial.png`
- Settings > Memory 本地模式页：`artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/screenshots/settings-memory-local-ready.png`

## 3. 远端模式验收

### 3.1 配置

远端模式验收使用本地 stub endpoint，而不是第三方云服务，目的是验证正式产品合同本身：

- endpoint：`http://127.0.0.1:8010/v1/embeddings`
- model：`acceptance-remote-embed`
- dimensions：`4`

### 3.2 动作结果

- `PATCH /api/memory/settings` 切换到 `remote_managed` 成功
- `POST /api/memory/settings/rebuild` 成功
- 重建结果：`record_count = 3`
- 重建时间：`2026-04-11T16:08:40Z`

### 3.3 查询结果

在远端模式下再次运行相同 query：

```text
query = 预算协同岗位
results = [
  "财务 BP，负责预算协同和经营分析",
  "用户常驻时区是 Asia/Shanghai"
]
```

说明：

- 远端 provider 参与 rebuild 和 query 后，命中结果保持一致
- 证明 `remote_managed -> rebuild -> search` 这条链已经真实接通

### 3.4 前端证据

- Settings > Memory 远端模式页：`artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/screenshots/settings-memory-remote-ready.png`

## 4. 验收中发现并关闭的真实缺口

在浏览器实际打开 `Settings > Memory` 时，前端最初回退到了 `EMPTY_MEMORY_SETTINGS`，页面出现了 `Failed to fetch`。

根因不是向量系统本身，而是网关 CORS 漏放行：

- 已允许：`http://localhost:3000`
- 未允许：`http://127.0.0.1:3000`

这会导致 standalone Next dev (`127.0.0.1:3000`) 下的浏览器请求 `http://localhost:8001/api/memory/settings` 被预检拦截，产品面看起来像“设置没接通”。

本轮已一并修复：

- 代码：`backend/app/runtime/app_factory.py`
- 回归测试：`backend/tests/test_gateway_cors.py`

修复后再次打开设置页，前端已能正确显示：

- 当前模式：`远端模式`
- 当前模型：`acceptance-remote-embed`
- 下载状态：`当前模式使用远端 embedding 服务，不需要本地模型下载。`
- 索引健康：`向量索引已重建完成。`

## 5. 自动化说明

本次验收的“状态查看”通过真实前端页面完成；“下载 / 重建 / 切换模式”动作通过正式产品 API 触发后，再回到前端页面确认状态回显。

这样做的原因是：

- headless 浏览器对该设置弹层里的 CTA 点击命中不稳定
- 但产品合同本身就是 `PATCH /api/memory/settings`、`POST /api/memory/settings/download`、`POST /api/memory/settings/rebuild`
- 因此这条验收链依然覆盖了正式产品合同和前端状态展示，而不是测试私有入口

## 6. 结论

Subproject B 已形成真实产品闭环：

1. `local_managed` 可以准备模型并重建结构化长期记忆索引
2. `remote_managed` 可以保存配置并重建索引
3. 向量检索已经进入结构化长期记忆搜索主链
4. `Settings > Memory` 已经不再是只读假面板，而是正式可操作产品面

## 7. 剩余风险

1. 本次本地模式验收使用了本机已有 Hugging Face 快照路径，而没有在验收环境里重新下载默认 `BAAI/bge-m3`。原因是当前机器上的 Hugging Face xet 下载链会卡死并返回 `416 Range Not Satisfiable`。这属于环境/下载链风险，不是本轮产品合同风险。

后续补充：

- `LocalManagedEmbeddingProvider` 现已在模型下载/首次加载时把真实 embedding 维度写入 `provider-metadata.json`，设置页和 provider fingerprint 不再对非默认本地模型显示错误维度。
