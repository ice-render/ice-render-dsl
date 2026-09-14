---
name: ice-render-dsl
description: Render rich interactive ice-render diagrams from a JSON-first node/edge DSL instead of raw canvas API calls — flowcharts, topologies, grouped panels, orthogonal/bezier/marching-ants connectors, keyframe animations and declarative orchestration, with structured diagnostics for self-repair.
version: "1.1.0"
category: ux
platforms:
  - claude-code
  - codex-cli
  - copilot
  - cursor
  - gemini-cli
  - other
metadata:
  short-description: JSON-first DSL for ice-render node/edge scenes, groups, links, animations, and viewport controls.
---

# ice-render-dsl

Use this skill when the user wants a generic diagram rendered by `ice-render`,
and the scene should be produced as data rather than imperative `ICE` API code.

## Capability boundary

This SKILL is the right choice for:

- generic node / edge diagrams
- flowcharts, topologies, dependency graphs
- grouped containers and nested scenes（子节点坐标相对父容器）
- images, sprites, avatars（含 clip 裁剪）
- gradients, shadows, dashed lines, **preset 主题样式**（`card` / `panel` / `button` / `title` / `subtitle` / `body` / `label` / `gradient`）
- connectors with **ports**（`T/R/B/L/C`）、正交布线（`routeType: orthogonal` / `visio`）、贝塞尔、箭头（实心/空心）、连线标签、**蚂蚁线流向**（`lineDashFlow`）
- **animations**：单段 / 关键帧 / 循环 / 往返 / 颜色 / 自定义缓动 / 生命周期回调 / 降频
- **declarative orchestration**：`orchestration` 里声明错峰入场与时序，并拿到 `play / pause / resume / stop / restart / finished` 句柄
- text layout：自动换行、行数上限 + 省略号、方向（LTR/RTL）、断行策略、行高 / 字间距 / 装饰线
- initial viewport and fit-to-canvas behavior

This SKILL should **not** be used for:

- Entity-Relation / database modeling: use `ice-entity-designer-dsl`
- custom components or plugins: use the `ice-render` imperative API
- accessibility-tree authoring, control-panel internals, or alignment-guide
  customization: use the `ice-render` imperative API
- Worker / OffscreenCanvas / extreme performance benchmarks: use the engine API

## Decision guide

| User intent | Recommended output |
| --- | --- |
| Draw a generic diagram from text | Return an `ice-render-dsl` JSON document |
| Model entities, fields, and database relations | Use `ice-entity-designer-dsl` instead |
| Create a custom component type or plugin | Write `ice-render` TypeScript/JavaScript |
| Fine-tune control panels, alignment, or a11y | Write `ice-render` imperative code |
| Measure maximum primitive count or rendering cost | Use `ice-render` directly, not this DSL |

## Required output

Return one JSON DSL document.

- Do not return HTML.
- Do not return imperative `ICE` API code.
- Do not mix in ER-specific fields such as `entities`, `fields`, or
  `relations`; those belong to `ice-entity-designer-dsl`.

## Core contract

```json
{
  "schemaVersion": 1,
  "nodes": [],
  "edges": [],
  "options": {}
}
```

- `nodes` is required.
- `edges` connects existing node ids.
- `options` controls rendering and the initial viewport.
- Node ids must be unique across the entire document, including nested
  `group` children.

## Node type reference

| type | purpose | correct key fields |
| --- | --- | --- |
| `rect` | rectangle / rounded rectangle | `left`, `top`, `width`, `height`, `radius` |
| `circle` | circle | `left`, `top`, `radius` |
| `ellipse` | ellipse | `left`, `top`, `radiusX`, `radiusY` |
| `text` | single or multi-line text | `left`, `top`, `text`, `style.fontSize`, `style.fontFamily` |
| `polyline` | open polyline / path | `points` |
| `image` | bitmap / sprite / avatar | `src`, `width`, `height`, `clipType`, `sx`, `sy`, `sw`, `sh` |
| `isogon` | regular polygon | `radius`, `edges`, `startAngle` |
| `star` | star polygon | `outerRadius`, `innerRadius`, `spikes`, `startAngle` |
| `rose` | rose / polar curve | `radius`, `leafNum`, `pointNumber` |
| `group` | nested container | `children`, optional `left`, `top`, `width`, `height`, `style` |

Correct geometry examples:

```json
{ "id": "c1", "type": "circle", "left": 80, "top": 80, "radius": 50 }
```

```json
{ "id": "e1", "type": "ellipse", "left": 220, "top": 80, "radiusX": 100, "radiusY": 50 }
```

Avoid using `width` / `height` as the primary geometry for `circle` or
`ellipse`. Use `radius`, or `radiusX` / `radiusY`.

Group nodes are recursive:

```json
{
  "id": "panel",
  "type": "group",
  "left": 80,
  "top": 80,
  "width": 320,
  "height": 220,
  "style": { "fillStyle": "#ffffff", "strokeStyle": "#cbd5e1" },
  "children": [
    { "id": "title", "type": "text", "left": 16, "top": 12, "text": "Panel" },
    { "id": "child", "type": "rect", "left": 20, "top": 48, "width": 120, "height": 60 }
  ]
}
```

Only `group` nodes may contain `children`.

### Text & labels（`type: "text"` 的完整字段）

文本是图里最容易"看不出问题、但很难看"的部分：标签长了会溢出、两行会顶到框外。下面这些字段都是
**引擎原生支持、DSL 直接透传**的（写在节点根上，不是 `style` 里）：

| field | meaning |
| --- | --- |
| `text` | 文本内容；`\n` 可显式换行 |
| `wrap` | `true` 时按节点 `width` 自动换行（默认 `false`，只按 `\n` 拆行） |
| `maxLines` | 最大行数（`0` = 不限）；超出时末行按 `ellipsis` 截断 |
| `ellipsis` | 截断后缀，默认 `…` |
| `wordBreak` | `"normal"`（默认，拉丁按词、CJK 逐字 + 禁则）或 `"break-all"` |
| `direction` | `"ltr"` / `"rtl"` / `"auto"`（自动按首个强方向字符判定） |

排版类样式写在 `style` 里：`fontSize` / `fontFamily` / `fontWeight`、`textAlign`、`textBaseline`、
`lineHeight`（数字按 px；`'1.5'` 是倍数、`'40px'` / `'1.5em'` / `'150%'` 也支持）、`letterSpacing`、
`textDecoration`（`underline` / `line-through`）+ `textDecorationColor`，以及 `padding*`。

```json
{
  "id": "label",
  "type": "text",
  "left": 24,
  "top": 16,
  "width": 260,
  "height": 44,
  "text": "这段话很长很长很长很长很长，超出后应当以省略号收尾",
  "wrap": true,
  "maxLines": 2,
  "ellipsis": "…",
  "style": { "fontSize": 16, "lineHeight": 1.4, "textAlign": "left", "textBaseline": "top", "fillStyle": "#0f172a" }
}
```

## Common node fields

Every node may use:

```json
{
  "style": {
    "fillStyle": "#e0f2fe",
    "strokeStyle": "#0284c7",
    "lineWidth": 1.5,
    "shadow": "md",
    "fillGradient": {
      "type": "linear",
      "from": [0, 0],
      "to": [0, 100],
      "stops": [[0, "#dbeafe"], [1, "#eff6ff"]]
    }
  },
  "transform": {
    "translate": [10, 0],
    "scale": [1.2, 1.2],
    "skew": [0, 0],
    "rotate": 0
  },
  "animations": {
    "transform.rotate": {
      "from": 0,
      "to": 360,
      "duration": 1600,
      "easing": "linear",
      "loop": true
    }
  },
  "display": true,
  "draggable": true,
  "transformable": true,
  "interactive": true,
  "linkable": true,
  "fill": true,
  "stroke": true,
  "lineDash": [6, 4],
  "origin": "localCenter",
  "zIndex": 3,
  "preset": "card"
}
```

### Interaction flags（什么时候用哪个）

| flag | 默认 | 含义 / 什么时候写 |
| --- | --- | --- |
| `interactive` | `true` | 参与命中检测。纯装饰（底纹、水印）设 `false`，点击才会"穿透"到下面的图元 |
| `draggable` | `true` | 允许拖动 |
| `transformable` | `true` | 选中时显示旋转/缩放手柄。**语义图形**（BPMN/UML 这类"形状即语义"的图元）设 `false`，只允许拖动 |
| `linkable` | `true` | 能不能作为连线的端点（配合 `edges`）。容器/标尺之类的非接线对象设 `false` |
| `display` | `true` | 显隐；`false` 不渲染也不参与命中 |
| `zIndex` | 组件默认 | 同一父节点下的叠放顺序，越大越靠上 |

`preset` 是**样式预设**（引擎主题里的一套 design token 展开，优先级：用户 props > preset > 主题 > 默认值）。
可用名：`card`、`panel`、`button`、`title`、`subtitle`、`body`、`label`、`gradient`。
写 `"preset": "card"` 等于一次拿到卡片该有的圆角 / 描边 / 底色 —— **比手写一串 style 更稳**。

`origin` 决定旋转/缩放的锚点（如 `"localCenter"`；默认按图元类型，文本/形状各不相同），
不写时用引擎默认即可，只有"绕某点转"这类需求才需要显式设置。

### Style cheat sheet

| capability | example |
| --- | --- |
| solid fill | `"fillStyle": "#dbeafe"` |
| stroke | `"strokeStyle": "#2563eb"`, `"lineWidth": 2` |
| preset shadow | `"shadow": "sm"`, `"md"`, or `"lg"` |
| linear gradient | `"fillGradient": { "type": "linear", "from": [0,0], "to": [0,100], "stops": [[0,"#dbeafe"],[1,"#eff6ff"]] }` |
| radial gradient | `"fillGradient": { "type": "radial", "center": [50,50], "radius": 60, "stops": [[0,"#ffffff"],[1,"#bfdbfe"]] }` |
| dashed stroke | `"lineDash": [6, 4]` |
| text font | `"style": { "fontSize": 20, "fontWeight": "bold", "fontFamily": "Arial" }` |

### Animation cheat sheet

Supported animation shapes include:

- single range: `{ "from": 0, "to": 1 }`
- point path: `"transform.rotate"`
- array path: `"transform.scale"`
- keyframes:

```json
{
  "transform.translate": {
    "keyframes": [
      { "offset": 0, "value": [0, 0] },
      { "offset": 1, "value": [120, 40] }
    ],
    "duration": 1200,
    "easing": "easeInOutCubic"
  }
}
```

Use `delay`, `loop`, `iterationCount`, and `round` only when needed.

Other knobs that are safe to use:

- **color animation**: `"style.fillStyle": { "from": "#ff0000", "to": "#0000ff", "duration": 400 }` — colors interpolate in sRGB;
- **custom easing**: `"easing": "easeOutCubic"` (built-in) or a host-registered name (`ICE.registerEasing(name, fn)`);
- **direction**: `"direction": "reverse" | "alternate"` (`alternate` + `iterationCount` = yoyo);
- **callbacks**: `onStart` / `onUpdate` / `onRepeat` / `onComplete` (host-side JS; a DSL document cannot carry functions —
  only reference them if the host resolves them);
- **fps**: `"fps": 30` for secondary animations (time-based sampling, the curve is unchanged).

**Orchestration in the document (this package, since 0.0.9).** Prefer declaring the sequence *in the DSL*
rather than making the host write imperative code. `nodes[].animations` only says how one animation runs;
the top-level `orchestration` block says **when** each one plays and how the group is triggered:

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "card1", "type": "rect", "left": 40, "top": 90, "width": 240, "height": 120 },
    { "id": "card2", "type": "rect", "left": 320, "top": 90, "width": 240, "height": 120 }
  ],
  "orchestration": {
    "autoplay": "entrance",
    "groups": {
      "entrance": {
        "tracks": [
          { "targets": ["card1", "card2"], "at": 0, "each": 90,
            "animation": { "opacity": { "from": 0, "to": 1, "duration": 320 } } },
          { "targets": ["card1"], "at": "+=150",
            "animation": { "left": { "from": 40, "to": 160, "duration": 500, "easing": "easeOutCubic" } } }
        ]
      }
    }
  }
}
```

Rules that keep it predictable:

- `targets` must be node ids that exist (single target → `timeline.add`; multiple → `timeline.stagger` with `each` as the step).
- `at` is absolute milliseconds or a relative moment `'+=N'`; `each` is the stagger gap (default `0` = simultaneous).
- `autoplay` names the group to play right after rendering. Other groups stay idle until the host plays them.
- **Don't declare the same animation key both in `nodes[].animations` and in a track** — the node-level one starts
  immediately, so you would play it twice.
- It compiles onto the engine's `animationManager.timeline()` (a *scheduler*, not a second evaluator), so easing /
  keyframes / device-pixel quantization / bitmap reuse / idle-parking frames all apply unchanged.
- Structural mistakes get stable codes you can self-repair: `ICE_DSL_ORCHESTRATION_INVALID`,
  `ICE_DSL_ORCHESTRATION_TARGET_UNKNOWN`, `ICE_DSL_ORCHESTRATION_TIME_INVALID`, `ICE_DSL_ORCHESTRATION_GROUP_UNKNOWN`
  (animation-config errors are still forwarded as `ICE_ANIM_*`, with the path pointing inside the track).

The result carries a handle:

```js
const result = ICEDSL.renderDsl('canvas', dsl);
result.orchestration.groups;               // ['entrance']
result.orchestration.play('entrance');     // 第一次 = 播放；之后 = 从头重播
result.orchestration.pause();              // 作用于最近播放的组（也可显式传组名）
result.orchestration.resume();
result.orchestration.stop();
result.orchestration.restart();
result.orchestration.finished('entrance'); // Promise（播完时 resolve）
```

**Host-side runtime control (engine ≥ 2.3), for what a document can't express.** If the sequence depends on app
state, drive it from the host instead —— these are exactly the primitives the DSL block compiles onto.
Reach for them when the user asks for
"one after another", "staggered entrance", "play / replay / pause / stop", or a sequence after a click:

- **timeline**: `ice.animationManager.timeline()` →
  `.add(component, { left: { from, to, duration } }, { at: 0 })`（`at` 是**绝对**毫秒或 `'+=300'`）、
  `.stagger(components, cfg, { each: 80, at: 200 })`（错峰，等价于每条 `at = 200 + i*80`）、
  `.play() / .pause() / .resume() / .stop() / .restart()`，以及 `.duration` / `.isPlaying()` / `.finished`（Promise）。
  它是**调度器**：`play()` 把 `at` 折算成 `delay` 写回组件的 `animations`，推进仍走引擎的动画管线
  （缓动 / 关键帧 / 量化 / 离屏缓存复用 / 空闲停帧都照样生效）。没写 `at` 的动画保持自己的 `delay`。
- **运行时挂/摘动画**：`component.setAnimation(key, cfg)` / `component.removeAnimation(key)` —— 不必在构造时
  声明 `animations`（引擎内部对 `props.animations` 做写时复制；在没声明过的组件上直接改 `props.animations` 会抛异常）。
- **查询与重播**：`ice.animationManager.replay(component)`、`ice.animationManager.isAnimating(component)`。
- **无障碍**：动画默认遵守 `prefers-reduced-motion`（引擎直接落终态并记 `ICE_ANIM_REDUCED_MOTION` 诊断）；
  需要强制播放时用 host 侧 `ice.setReducedMotion(false)`。给"关键信息"做动画前先想清楚这一点。

**Validation feedback (important for agents).** `validateDsl()` returns structured diagnostics alongside
the legacy `errors` strings:

```js
const { valid, errors, diagnostics } = ICEDSL.validateDsl(dsl);
// diagnostics: [{ severity: 'error' | 'warning', code, message, path }]
```

| code | meaning / what to do |
| --- | --- |
| `ICE_DSL_*` | structural problems in this document (duplicate node id, unknown edge endpoint, unsupported type…) — fix the `path` it points at |
| `ICE_DSL_ORCHESTRATION_INVALID` | 编排块结构不对：`groups` / `tracks` / `targets` / `animation` 的形状或类型不对（`path` 指到具体那一处） |
| `ICE_DSL_ORCHESTRATION_TARGET_UNKNOWN` | 轨道里的 `targets` 引用了不存在的节点 id |
| `ICE_DSL_ORCHESTRATION_TIME_INVALID` | `at` 只接受 ≥0 的数字或 `'+=N'`；`each` 只接受 ≥0 的数字 |
| `ICE_DSL_ORCHESTRATION_GROUP_UNKNOWN` | `autoplay` 指向了不存在的组名 |
| `ICE_ANIM_DURATION_INVALID` | `duration` must be a positive number ≤ 60000, or a motion token name (`fast` / `normal` / `slow` / `slower`) |
| `ICE_ANIM_VALUE_NOT_INTERPOLATABLE` | `from`/`to` must be the same kind: numbers, equal-length numeric arrays, **colors** (`#rgb` / `#rrggbb` / `rgb()` / `rgba()`), or unit-matched length strings (`'12px'`). Arbitrary strings are not animatable |
| `ICE_ANIM_KEYFRAMES_INVALID` | keyframes need ≥ 2 frames; each `value` must be the same kind and length; `offset` must be a finite number |
| `ICE_ANIM_EASING_UNKNOWN` | unknown easing name (list the available ones from the message; the runtime would silently fall back to `linear`) |
| `ICE_ANIM_DELAY_INVALID` / `ICE_ANIM_ITERATION_INVALID` | `delay` must be ≥ 0; `iterationCount` must be an integer ≥ 1 |
| `ICE_ANIM_INFINITE_LOOP` | warning: `loop: true` without `iterationCount`. Prefer a finite count or leave a way for the user to stop it |
| `ICE_ANIM_KEY_AFFECTS_MEASUREMENT` | warning: this property changes derived geometry (size / point set / text metrics) → the engine re-measures every frame. Animate position / opacity / color instead |

Rules of thumb that keep animations cheap (see the engine's `bench:anim` / `bench:layers`):

- animate **position / opacity / color**, not `width` / `height` / `text` / font sizes;
- keep `duration` short (≤ 1s for UI transitions) and prefer finite `iterationCount` over `loop`;
- with many markers animating over a static scene, the host can use two layers — describe the animation
  normally, the layering is a host-side concern.

## Edge contract

```json
{
  "id": "flow1",
  "source": "box1",
  "target": "box2",
  "type": "polyline",
  "sourcePort": "R",
  "targetPort": "L",
  "routeType": "orthogonal",
  "lineType": "solid",
  "arrow": "end",
  "label": "next",
  "style": { "strokeStyle": "#64748b", "lineWidth": 1.5 },
  "lineDash": [6, 4]
}
```

| edge type | behavior |
| --- | --- |
| `polyline` | explicit or routed polyline; use `points` or `routeType` |
| `bezier` | quadratic / cubic bezier; use `curveType` and control points |
| `visio` | Visio-style orthogonal connector with link-slot following |

Ports are `T`, `R`, `B`, `L`, `C` for top / right / bottom / left / center.
Arrow is `none`, `start`, `end`, or `both`.

完整字段（都能直接写在 `edges[]` 的元素上）：

| field | values / meaning |
| --- | --- |
| `type` | `polyline` / `bezier` / `visio`（`visio` = 正交连接器，跟随端点插槽，最像"工程图"） |
| `sourcePort` / `targetPort` | `T` / `R` / `B` / `L` / `C` |
| `routeType` | `straight`（默认）/ `orthogonal`（直角折线，**需要两端都连上端点的插槽**才生效） |
| `routeOffset` | 正交布线时从端点沿插槽方向延伸的距离（px，默认 20） |
| `curveType` | `straight` / `quadratic`（`points` 3 点）/ `cubic`（`points` 4 点） |
| `arrow` | `none`（默认）/ `start` / `end` / `both` |
| `arrowStyle` | `filled`（默认实心）/ `hollow`（空心） |
| `arrowLength` | 箭头长度（px，默认 15） |
| `label` / `labelStyle` | 连线标签（画在折线中点）与它的 `fontSize` / `fillStyle` / `backgroundColor` |
| `lineType` | `solid`（默认）/ `dashed`（等价于自动补 `lineDash`） |
| `lineDash` | 虚线模式，如 `[6, 4]` |
| `lineDashFlow` + `lineDashFlowSpeed` | **蚂蚁线**：虚线沿路径流动，用来表达"方向 / 正在传输"，是很便宜的动效 |
| `links` | `{ "start": { "id": "a", "position": "R" }, "end": { "id": "b", "position": "L" } }` —— 让连线**跟随组件**移动（正交布线的常见前提） |

**什么时候用哪种连线**：只要能连上端点就用 `visio`（自动正交布线 + 跟随移动，改坐标不用重算折线）；
起止点固定、想画曲线时用 `bezier` + `curveType`；要完全自己控制折点时用 `polyline` + `points`。
想表达"流量正在流动"，加 `"lineDashFlow": true` 比做动画便宜得多。

Explicit geometry:

```json
{
  "type": "bezier",
  "curveType": "cubic",
  "controlPoint1": [120, 40],
  "controlPoint2": [260, 180]
}
```

## Rendering options

```json
{
  "options": {
    "renderMode": "dirty-rect",
    "dpr": 1,
    "viewport": { "scale": 1, "tx": 0, "ty": 0 },
    "fitViewport": true,
    "fitViewportPadding": 48
  }
}
```

- `renderMode`: `dirty-rect` (default) or `full`.
- `dpr`: device pixel ratio.
- `viewport`: explicit initial zoom and pan.
- `fitViewport`: shrink the whole scene to fit the canvas and center it. It
  never upscales content. If the content already fits, the viewport stays at
  `scale: 1` and only pans to center it.

There is no generic `layout` field in this DSL. Use explicit coordinates or
`fitViewport`.

## Rendering

### Runtime requirements

- Node: install `ice-render-dsl@>=0.0.8`; `ice-render@^2.3.0` is a peer
  dependency (npm 7+ installs peers automatically).
- Browser: load `ice-render` before `ice-render-dsl`; `ICEDSL` expects the
  global `window.ICE`.

Browser:

```js
ICEDSL.renderDsl('canvas', dsl);
```

Node:

```ts
import { renderDsl } from 'ice-render-dsl';
```

## Worked example

```json
{
  "schemaVersion": 1,
  "nodes": [
    {
      "id": "source",
      "type": "rect",
      "left": 80,
      "top": 160,
      "width": 180,
      "height": 90,
      "radius": 12,
      "style": {
        "fillStyle": "#dbeafe",
        "strokeStyle": "#2563eb",
        "lineWidth": 2,
        "shadow": "md"
      },
      "animations": {
        "transform.scale": {
          "from": [1, 1],
          "to": [1.05, 1.05],
          "duration": 700,
          "loop": true,
          "round": false
        }
      }
    },
    {
      "id": "target",
      "type": "star",
      "left": 520,
      "top": 150,
      "outerRadius": 70,
      "innerRadius": 30,
      "spikes": 6,
      "style": { "fillStyle": "#fde68a", "strokeStyle": "#d97706", "lineWidth": 2 }
    },
    {
      "id": "label",
      "type": "text",
      "left": 300,
      "top": 60,
      "text": "JSON DSL -> ICE",
      "style": { "fillStyle": "#0f172a", "fontSize": 24, "fontWeight": "bold" }
    }
  ],
  "edges": [
    {
      "id": "flow",
      "source": "source",
      "target": "target",
      "type": "visio",
      "sourcePort": "R",
      "targetPort": "L",
      "arrow": "end",
      "label": "render",
      "style": { "strokeStyle": "#64748b", "lineWidth": 2 }
    }
  ],
  "options": {
    "renderMode": "dirty-rect",
    "fitViewport": true,
    "fitViewportPadding": 48
  }
}
```

## Recipes（可直接复制的完整文档）

下面每个都是**完整、可渲染、会被本仓测试校验**的文档 —— 需要同类图时改内容即可，别从零拼字段。

### 1. 流程图：正交连线 + 端口 + 分支标签

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "start", "type": "rect", "left": 40, "top": 120, "width": 120, "height": 56, "radius": 28, "text": "开始", "style": { "fillStyle": "#dcfce7", "strokeStyle": "#16a34a" } },
    { "id": "check", "type": "rect", "left": 240, "top": 108, "width": 160, "height": 80, "radius": 10, "text": "库存充足？", "style": { "fillStyle": "#fef3c7", "strokeStyle": "#d97706" } },
    { "id": "ok", "type": "rect", "left": 480, "top": 40, "width": 140, "height": 64, "radius": 10, "text": "下单成功", "preset": "card" },
    { "id": "fail", "type": "rect", "left": 480, "top": 180, "width": 140, "height": 64, "radius": 10, "text": "提示补货", "preset": "card" }
  ],
  "edges": [
    { "id": "e1", "source": "start", "target": "check", "type": "visio", "sourcePort": "R", "targetPort": "L", "arrow": "end", "style": { "strokeStyle": "#64748b", "lineWidth": 1.5 } },
    { "id": "e2", "source": "check", "target": "ok", "type": "visio", "sourcePort": "R", "targetPort": "L", "arrow": "end", "label": "是", "style": { "strokeStyle": "#16a34a", "lineWidth": 1.5 } },
    { "id": "e3", "source": "check", "target": "fail", "type": "visio", "sourcePort": "R", "targetPort": "L", "arrow": "end", "label": "否", "style": { "strokeStyle": "#dc2626", "lineWidth": 1.5 } }
  ],
  "options": { "fitViewport": true, "fitViewportPadding": 48 }
}
```

### 2. 分组面板：`group` + 子节点相对坐标 + 文本截断

```json
{
  "schemaVersion": 1,
  "nodes": [
    {
      "id": "panel",
      "type": "group",
      "left": 60,
      "top": 60,
      "width": 320,
      "height": 180,
      "style": { "fillStyle": "#ffffff", "strokeStyle": "#cbd5e1", "lineWidth": 1 },
      "children": [
        { "id": "panelTitle", "type": "text", "left": 16, "top": 12, "width": 280, "height": 24, "text": "订单概览", "preset": "title" },
        { "id": "panelBody", "type": "text", "left": 16, "top": 48, "width": 280, "height": 44, "text": "这段说明文字很长，超出两行会被省略号截断", "wrap": true, "maxLines": 2, "ellipsis": "…", "style": { "fontSize": 14, "fillStyle": "#475569" } },
        { "id": "panelChip", "type": "rect", "left": 16, "top": 120, "width": 96, "height": 32, "radius": 16, "text": "进行中", "preset": "button" }
      ]
    }
  ],
  "options": { "fitViewport": true, "fitViewportPadding": 40 }
}
```

> 子节点的 `left` / `top` 是**相对 panel** 的（改 panel 位置，整组跟着走）。

### 3. 拓扑：蚂蚁线表达"正在传输"

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "client", "type": "circle", "left": 60, "top": 90, "radius": 36, "text": "客户端", "style": { "fillStyle": "#e0f2fe", "strokeStyle": "#0284c7" } },
    { "id": "gateway", "type": "rect", "left": 240, "top": 76, "width": 140, "height": 64, "radius": 12, "text": "网关", "preset": "card" },
    { "id": "api", "type": "rect", "left": 460, "top": 76, "width": 140, "height": 64, "radius": 12, "text": "业务服务", "preset": "card" }
  ],
  "edges": [
    { "id": "t1", "source": "client", "target": "gateway", "type": "visio", "sourcePort": "R", "targetPort": "L", "arrow": "end", "lineDashFlow": true, "lineDashFlowSpeed": 60, "style": { "strokeStyle": "#2563eb", "lineWidth": 2 } },
    { "id": "t2", "source": "gateway", "target": "api", "type": "visio", "sourcePort": "R", "targetPort": "L", "arrow": "end", "lineDash": [6, 4], "style": { "strokeStyle": "#64748b", "lineWidth": 1.5 } }
  ],
  "options": { "fitViewport": true, "fitViewportPadding": 40 }
}
```

### 4. 错峰入场 + 可重播（编排）

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "k1", "type": "rect", "left": 40, "top": 60, "width": 160, "height": 90, "radius": 10, "preset": "card" },
    { "id": "k2", "type": "rect", "left": 220, "top": 60, "width": 160, "height": 90, "radius": 10, "preset": "card" },
    { "id": "k3", "type": "rect", "left": 400, "top": 60, "width": 160, "height": 90, "radius": 10, "preset": "card" }
  ],
  "orchestration": {
    "autoplay": "entrance",
    "groups": {
      "entrance": {
        "tracks": [
          { "targets": ["k1", "k2", "k3"], "at": 0, "each": 90, "animation": { "opacity": { "from": 0, "to": 1, "duration": 320 }, "top": { "from": 30, "to": 60, "duration": 320, "easing": "easeOutCubic" } } }
        ]
      }
    }
  },
  "options": { "fitViewport": true, "fitViewportPadding": 40 }
}
```

```js
const result = ICEDSL.renderDsl('canvas', dsl);
result.orchestration.play('entrance'); // 第一次=播放；之后=从头重播
```

## Anti-patterns

Do not:

- use `width` / `height` as the primary geometry for `circle` or `ellipse`
- add `children` to non-`group` nodes
- use ER fields such as `entities`, `fields`, or `relations` in this DSL
- invent a generic `layout` property
- return HTML around the JSON document
- mix imperative `ICE` class constructors with the DSL
- **手算 delay 做错峰**：`delay: 0, 80, 160…` 这种写法脆弱且不可重播 —— 用 `orchestration` 的
  `each` / `at: '+=N'`（同一个 `targets` 列表里自动摊开）
- **给"形状即语义"的图元留变换手柄**：BPMN/UML 这类图上 `transformable: false`（拉伸会破坏记法）
- **用 CSS / HTML 覆盖层做图元动画**：CSS 只作用于 `<canvas>` 元素整体，碰不到画布内的像素；
  图元动画只能走 `animations` / `orchestration`（整幕转场才轮到 CSS）
- **动画挂在会触发重量测的属性上**：`width` / `height` / `text` / 字号动画每帧都要重新量测与重建位图；
  要"变大"用 `transform.scale`，要"变色"用 `style.fillStyle`
- **编造 preset 名**：只有 `card` / `panel` / `button` / `title` / `subtitle` / `body` / `label` / `gradient`

## Output checklist

Before returning, verify:

- root contains only `schemaVersion`, `nodes`, `edges`, and `options`
- every node has a unique non-empty `id`
- every node has a supported `type`
- every edge references an existing node id
- `group` nodes use `children`
- no unsupported or hallucinated engine features are included
- the document is valid JSON with no trailing commas
- 动画只动"位置 / 透明度 / 颜色"（`left` / `top` / `transform.*` / `opacity` / `style.fillStyle` …），
  没动 `width` / `height` / `text` / 字号
- 可能溢出的标签都写了 `wrap` / `maxLines` / `ellipsis`
- 时序类需求（依次入场、播放 / 重播 / 暂停）用 `orchestration` 表达，而不是让宿主去手写

## Validation

Use `validateDsl()` before rendering. It checks duplicate ids, missing node
types, and unknown edge endpoints.

## Companion files

- `prompts/agent-prompt.md` —— 一段可直接塞进 agent 系统提示的短版提示词（输出契约 + 自检清单）。
- `examples/orchestration.html` —— 真实浏览器里的编排示例（错峰入场 + 播放 / 暂停 / 重播按钮）。
- 本仓 `tests/skill-examples.test.ts` 会**自动校验上面这些 JSON 例子**：
  文档里的示例如果不合法（字段写错、id 悬空、编排 targets 指错），测试就会红。
