# Skill PR: ice-render-dsl

## Title

Add `ice-render-dsl` skill for generating core `ice-render` diagrams from JSON DSL.

## Summary

`ice-render-dsl` lets AI Agents render generic `ice-render` diagrams without writing imperative canvas API code.

## Skill path

```text
skills/ice-render-dsl/SKILL.md
```

## Supported primitives

- rect
- circle
- ellipse
- text
- polyline
- node/edge with orthogonal routing

## Example

```json
{
  "schemaVersion": 1,
  "nodes": [
    { "id": "a", "type": "rect" },
    { "id": "b", "type": "circle" }
  ],
  "edges": [
    { "source": "a", "target": "b", "routeType": "orthogonal" }
  ]
}
```

## Install command

```bash
skill-installer install ice-render-dsl
```
