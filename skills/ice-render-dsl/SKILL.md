---
name: ice-render-dsl
description: Render rich interactive ice-render diagrams from a JSON-first node/edge DSL instead of raw canvas API calls.
version: "1.0.2"
category: ux
metadata:
  short-description: JSON-first DSL for ice-render node/edge scenes, groups, links, animations, and viewport controls.
---

# ice-render-dsl

Use this skill when the user wants to render diagrams with `ice-render` and asks an
agent to produce the scene as data rather than imperative `ICE` API code.

## Required output

Return one JSON DSL document, not HTML and not imperative `ICE` API code.
The DSL describes the complete visual scene and can be rendered in a browser or Node.

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
- Node ids must be unique across the entire document, including nested `group` children.

## Node types

| type | purpose | key fields |
| --- | --- | --- |
| `rect` | rectangle / rounded rectangle | `left`, `top`, `width`, `height`, `radius` |
| `circle` | circle | `left`, `top`, `radius` or `width`/`height` |
| `ellipse` | ellipse | `left`, `top`, `width`, `height` |
| `text` | single or multi-line text | `left`, `top`, `text`, `style` |
| `polyline` | open polyline / path | `points` |
| `image` | bitmap image / sprite / avatar | `src`, `width`, `height`, `clipType`, `sx`, `sy`, `sw`, `sh` |
| `isogon` | regular polygon | `radius`, `edges`, `startAngle` |
| `star` | star polygon | `outerRadius`, `innerRadius`, `spikes`, `startAngle` |
| `rose` | rose / polar curve | `radius`, `leafNum`, `pointNumber` |
| `group` | nested container | `children`, optional `left`, `top`, `width`, `height`, `style` |

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

Use `style.shadow` for preset shadows: `sm`, `md`, or `lg`.
Gradients are declarative and serializable: `linear`, `radial`, or `conic`.

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

Edge types:

| type | behavior |
| --- | --- |
| `polyline` | explicit or routed polyline; set `routeType` to `straight` or `orthogonal` |
| `bezier` | quadratic / cubic bezier; use `curveType` and optional control points |
| `visio` | Visio-style orthogonal connector with link-slot following |

Ports are `T`, `R`, `B`, `L`, `C` (top / right / bottom / left / center).
Arrow is `none`, `start`, `end`, or `both`.
Edges may specify `points`, `controlPoint`, `controlPoint1`, and `controlPoint2`
when explicit geometry is required.

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
- `fitViewport`: automatically fit the whole scene into the canvas.

## Rendering

### Runtime requirements

- Node: `ice-render-dsl@>=0.0.4` automatically installs `ice-render`.
- Browser: load `ice-render` before `ice-render-dsl`; `ICEDSL` expects the global `window.ICE`.

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
        "transform.scale": { "from": [1, 1], "to": [1.05, 1.05], "duration": 700, "loop": true, "round": false }
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

## Rules

- Always return JSON, never handwritten ICE class constructors.
- Prefer semantic ids over generated ids when the scene has a clear domain.
- Do not invent coordinates when the user provided layout data; otherwise use a readable layout with sensible spacing.
- Use `group` for visual containment and hierarchy.
- Use `fitViewport: true` when the canvas size is fixed and the content bounds are known.
- Validate before rendering with `validateDsl()`.
