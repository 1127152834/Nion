# Memory / Identity / Soul 高保真原型

这个目录保存基于 `docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md`
制作的高保真前端原型。

## 原型目标

这不是生产实现，也不是低保真线框。

它要回答三个问题：

1. 普通职员是否能一眼理解这三页分别是什么
2. 文件原生资产感是否足够强，但又不会做成开发者工具
3. 页面布局、信息层级、整文编辑方式是否值得作为正式实现基线

## 设计方向

- 外层心智：个人档案中心
- 内层资产：`MEMORY.md` / `IDENTITY.md` / `SOUL.md`
- 交互模型：Identity / Soul 采用 Markdown 预览 / 整文编辑双态，Memory 保持结构化只读
- 目标用户：普通职员，如银行、财务、采购、政务等非技术用户

## 文件

- `index.html`：主原型页面
- `prototype.css`：样式
- `prototype.js`：交互

## 如何查看

直接在浏览器打开：

`docs/prototypes/memory-identity-soul-file-native/index.html`

## 当前包含的页面

- Memory：结构化记忆阅读页，底层由 `MEMORY.md` 维护，但普通用户默认不直接编辑
- Identity：`IDENTITY.md` 文档预览 / 编辑双态页面
- Soul：`SOUL.md` 文档预览 / 编辑双态页面

## 当前交互模型

- `Identity` / `Soul`
  - 默认进入 Markdown 预览模式
  - 用户点击“进入编辑”后，编辑整篇 Markdown 文档
  - 保存后立即生效
  - 聊天里让助手修改，最终也是写回同一份 Markdown 主档

- `Memory`
  - 用户默认看到的是结构化阅读页面
  - 底层仍可保留 `MEMORY.md` 作为活跃记忆文件
  - 当前阶段不让普通用户手动直接维护这份文件
