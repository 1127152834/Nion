# Memory / Identity / Soul 高保真原型

这个目录保存基于 `docs/superpowers/specs/2026-04-13-memory-identity-soul-ui-and-file-model-refactor-design.md`
制作的高保真前端原型。

## 原型目标

这不是生产实现，也不是低保真线框。

它要回答三个问题：

1. 普通职员是否能一眼理解这三页分别是什么
2. 文件原生资产感是否足够强，但又不会做成开发者工具
3. 页面布局、信息层级、局部编辑方式是否值得作为正式实现基线

## 设计方向

- 外层心智：个人档案中心
- 内层资产：`MEMORY.md` / `IDENTITY.md` / `SOUL.md`
- 交互模型：文档预览 + 局部编辑，不做后台表单墙
- 目标用户：普通职员，如银行、财务、采购、政务等非技术用户

## 文件

- `index.html`：主原型页面
- `prototype.css`：样式
- `prototype.js`：交互

## 如何查看

直接在浏览器打开：

`docs/prototypes/memory-identity-soul-file-native/index.html`

## 当前包含的页面

- Memory：活跃记忆 + 长期记忆档案夹
- Identity：身份主档文档页
- Soul：助手灵魂主档文档页
