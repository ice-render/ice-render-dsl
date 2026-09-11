---
name: ice-render-dsl
description: Render ice-render core diagrams from a JSON-first node/edge DSL instead of raw canvas API calls.
metadata:
  short-description: JSON-first DSL for generic ice-render node/edge diagrams.
---

# ice-render-dsl

Use this skill when the user wants to render generic `ice-render` diagrams.

## Required output

Return a JSON DSL document, not HTML and not imperative `ICE` API code.

## Schema

```json
{
  "schemaVersion": 1,
  "nodes": [],
  "edges": [],
  "options": {}
}
```

## Node

```json
{
  "id": "box1",
  "type": "rect",
  "left": 120,
  "top": 120,
  "width": 160,
  "height": 80
}
```

## Edge

```json
{
  "source": "box1",
  "target": "box2",
  "routeType": "orthogonal",
  "arrow": "end"
}
```

## Validation

Use `validateDsl()` before rendering. Node ids must be unique. Edge endpoints must exist.

## Rendering

Browser:

```js
ICEDSL.renderDsl('canvas', dsl);
```

Node:

```ts
import { renderDsl } from 'ice-render-dsl';
```

Do not invent coordinates unless explicitly requested.
