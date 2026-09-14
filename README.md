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
- `compileDsl(dsl)` / `buildOrchestrationPlan(dsl)`
- `renderDsl(canvasOrId, dsl)`
- `DSL_SCHEMA_VERSION`
- `DSL_DIAGNOSTIC_CODES` / `ORCHESTRATION_CODES`

## Example

Build first, then open in a browser:

- `examples/core-dsl.html` —— 最小节点/连线示例；
- `examples/orchestration.html` —— **编排**：用 JSON 声明错峰入场，并带播放 / 暂停 / 继续 / 重播按钮。

## Agent discovery

Agents can use this project through:

1. npm package exports
2. `AGENTS.md`
3. `skills/ice-render-dsl/SKILL.md`
4. `prompts/agent-prompt.md` —— 短版系统提示词（输出契约 + 自检清单）
5. optional MCP wrapper in a separate package

The core runtime does not require MCP.

> 文档里的 JSON 例子由 `tests/skill-examples.test.ts` 自动校验：示例一旦不合法（字段写错、节点 id 悬空、
> 编排 `targets` 指错），测试就会红 —— 保证 Agent 照抄的是"能跑的文档"。
