# ice-render-dsl

JSON-first core DSL for AI agents to drive `ice-render` primitives without learning the imperative canvas API.

The package contains:

- generic node/edge DSL types and schema
- structural validator
- compiler from DSL to core component props
- browser runtime that renders DSL through `ice-render`
- browser example with a JSON editor

## Install

```bash
npm install
npm run build
```

## Browser usage

```html
<canvas id="canvas" width="1200" height="800"></canvas>

<script src="node_modules/ice-render/dist/index.umd.js"></script>
<script src="dist/index.umd.js"></script>
<script>
  const dsl = {
    schemaVersion: 1,
    nodes: [
      { id: 'box1', type: 'rect', left: 120, top: 120 },
      { id: 'box2', type: 'circle', left: 480, top: 100 },
    ],
    edges: [{ source: 'box1', target: 'box2', routeType: 'orthogonal' }],
  };

  const { ice } = ICEDSL.renderDsl('canvas', dsl);
</script>
```

## Node/ESM usage

```ts
import { validateDsl, compileDsl, renderDsl } from 'ice-render-dsl';
```

## API

- `validateDsl(dsl)`
- `compileDsl(dsl)`
- `renderDsl(canvasOrId, dsl)`
- `DSL_SCHEMA_VERSION`

## Example

Open `examples/entity-editor-dsl.html` after building.

## Agent discovery

Agents can use this project through:

1. npm package exports
2. `AGENTS.md`
3. `skills/ice-render-dsl/SKILL.md`
4. optional MCP wrapper in a separate package

The core runtime does not require MCP.
