# 变更日志

本文件记录所有值得注意的变更，版本号遵循语义化版本。

## [0.1.0] - 2026-09-14

### 新增

- **DSL 里声明主题**：文档新增顶层 `theme` 字段 —— 字符串走命名主题（内置 `default` / `dark`，
  或应用层 `registerTheme` 注册的名字），对象按**部分主题**深合并（平铺 `{ "primary": "#0d6efd" }`、
  显式分层 `{ "semantic": {...} }`、深层局部 `{ "motion": { "duration": { "fast": 50 } } }` 都支持）。
  `renderDsl()` 在建图元之前应用它（preset 与默认样式都是构造时按主题展开的）。
- 图元样式里可以直接引用主题 token：`"style": { "fillStyle": "$primary", "strokeStyle": "$chrome.slot.fill" }`
  —— 引擎在绘制那一刻解析，所以换主题时整张图跟着换。

### 诊断（给 agent 自修复用）

- `ICE_DSL_THEME_NAME_UNKNOWN`：写了没注册的命名主题（引擎会**静默回退 default**，这是最容易踩的坑），
  诊断里会列出当前可用的名字；
- `ICE_DSL_THEME_TOKEN_UNKNOWN`：样式里的 `"$xxx"` 在生效主题里解析不出来
  （引擎遇到会**跳过赋值** —— 视觉上就是"颜色没生效但不报错"），路径精确到 `nodes[0].style.fillStyle`；
- `ICE_DSL_THEME_INVALID`：`theme` 写成了数组 / 数字这类非法形态。

### 依赖

- `ice-render` peer / dev 提到 `^2.4.0`（`theme` 字段与 token 引用是 2.4 的能力）。

### 验证

- 单测 28 → **34**（命名主题已注册/未注册、三种部分主题写法、非法形态、节点与连线的 token 引用检查）。

## [0.0.9] - 2026-09-14

- 依赖对齐 ice-render 2.4.0；SKILL 补《Theming（引擎 2.4 起）》一节（版本 1.1.0 → 1.2.0）。
