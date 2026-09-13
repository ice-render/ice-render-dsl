# ice-render-dsl Agent Guide

## Purpose

This repository provides a JSON-first core DSL for rendering `ice-render` primitives.

## Rules

- Prefer producing JSON DSL over direct canvas API calls.
- Always include `schemaVersion: 1`.
- Node `id` values must be unique.
- Edge `source` and `target` must reference existing node ids.

## Branches & release（家族铁律，2026-09-13 确立）

- Develop on a temporary branch (or `dev`); `main` is for integration + release only.
- Before releasing: merge the development branch into `main` **and release from `main`**
  (run the gates → `npm publish` → `skills-hub ... version`).
- Never write implementation commits directly on `main`, and never leave `main` behind the
  development line (the remote default branch must be `main` and must match it after a release).

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
