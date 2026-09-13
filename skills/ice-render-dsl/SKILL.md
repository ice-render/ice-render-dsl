---
name: ice-render-dsl
description: Render rich interactive ice-render diagrams from a JSON-first node/edge DSL instead of raw canvas API calls.
version: "1.0.8"
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
- grouped containers and nested scenes
- images, sprites, avatars
- gradients, shadows, dashed lines
- simple animations
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

**Validation feedback (important for agents).** `validateDsl()` returns structured diagnostics alongside
the legacy `errors` strings:

```js
const { valid, errors, diagnostics } = ICEDSL.validateDsl(dsl);
// diagnostics: [{ severity: 'error' | 'warning', code, message, path }]
```

| code | meaning / what to do |
| --- | --- |
| `ICE_DSL_*` | structural problems in this document (duplicate node id, unknown edge endpoint, unsupported type…) — fix the `path` it points at |
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

- Node: install `ice-render-dsl@>=0.0.7`; `ice-render@^2.2.0` is a peer
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

## Anti-patterns

Do not:

- use `width` / `height` as the primary geometry for `circle` or `ellipse`
- add `children` to non-`group` nodes
- use ER fields such as `entities`, `fields`, or `relations` in this DSL
- invent a generic `layout` property
- return HTML around the JSON document
- mix imperative `ICE` class constructors with the DSL

## Output checklist

Before returning, verify:

- root contains only `schemaVersion`, `nodes`, `edges`, and `options`
- every node has a unique non-empty `id`
- every node has a supported `type`
- every edge references an existing node id
- `group` nodes use `children`
- no unsupported or hallucinated engine features are included
- the document is valid JSON with no trailing commas

## Validation

Use `validateDsl()` before rendering. It checks duplicate ids, missing node
types, and unknown edge endpoints.
