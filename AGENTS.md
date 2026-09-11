# ice-render-dsl Agent Guide

## Purpose

This repository provides a JSON-first core DSL for rendering `ice-render` primitives.

## Rules

- Prefer producing JSON DSL over direct canvas API calls.
- Always include `schemaVersion: 1`.
- Node `id` values must be unique.
- Edge `source` and `target` must reference existing node ids.

## Minimal document

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "a", "type": "rect" },
    { "id": "b", "type": "circle" }
  ],
  "edges": [
    { "source": "a", "target": "b" }
  ]
}
```

## Runtime

```js
const result = ICEDSL.renderDsl('canvas', dsl);
```

## Tests

```bash
npm run types:check
npm test
npm run build
```
