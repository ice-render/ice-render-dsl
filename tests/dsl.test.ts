import { validateDsl, compileDsl } from '../src';

describe('ice-render-dsl core', () => {
  it('validates a minimal core document', () => {
    const result = validateDsl({
      nodes: [{ id: 'box1', type: 'rect' }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('detects duplicate node ids and invalid edge endpoints', () => {
    const result = validateDsl({
      nodes: [{ id: 'box1', type: 'rect' }, { id: 'box1', type: 'circle' }],
      edges: [{ source: 'box1', target: '' }],
    } as any);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('duplicated');
    expect(result.errors.join('\n')).toContain('edges[0].target');
  });

  it('compiles core DSL into node/edge props', () => {
    const scene = compileDsl({
      nodes: [
        { id: 'box1', type: 'rect', left: 10, top: 20 },
        { id: 'box2', type: 'circle' },
      ],
      edges: [{ source: 'box1', target: 'box2', routeType: 'orthogonal' }],
    });

    expect(scene.nodes).toHaveLength(2);
    expect(scene.nodes[0].type).toBe('rect');
    expect(scene.edges).toHaveLength(1);
    expect(scene.edges[0].source).toBe('box1');
    expect(scene.edges[0].routeType).toBe('orthogonal');
  });

  it('accepts rich node types and group children', () => {
    const result = validateDsl({
      nodes: [
        { id: 'panel', type: 'group', children: [{ id: 'box', type: 'rect' }] },
        { id: 'image', type: 'image', src: 'data:image/png;base64,xxx' },
        { id: 'poly', type: 'polyline', points: [[0, 0], [10, 10]] },
        { id: 'shape', type: 'isogon', radius: 30, edges: 6 },
      ],
      edges: [
        { source: 'box', target: 'image', type: 'visio', sourcePort: 'R', targetPort: 'L' },
      ],
    });

    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('rejects unknown edge endpoints', () => {
    const result = validateDsl({
      nodes: [{ id: 'box1', type: 'rect' }],
      edges: [{ source: 'box1', target: 'missing' }],
    });

    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toContain('unknown node');
  });
});

/**
 * Agent 侧闭环：结构化诊断（稳定码 + 精确 path）。
 *
 * - 结构检查用本包的 `ICE_DSL_*`；
 * - 动画检查转述引擎的 `ICE_ANIM_*`（引擎 ≥ 2.3 提供 `validateAnimations()`；
 *   老引擎自动降级 —— 只做结构诊断，不报假错）。
 */
describe('ice-render-dsl 结构化诊断', () => {
  it('结构错误带稳定码与精确路径（errors 与 diagnostics 同源）', () => {
    const result = validateDsl({
      schemaVersion: 99 as any,
      nodes: [
        { id: 'dup', type: 'rect' },
        { id: 'dup', type: 'nope' as any },
      ],
      edges: [{ source: 'dup', target: 'missing' }],
    });

    expect(result.valid).toBe(false);
    const codes = result.diagnostics.map((d) => d.code);
    expect(codes).toContain('ICE_DSL_SCHEMA_VERSION_UNSUPPORTED');
    expect(codes).toContain('ICE_DSL_NODE_ID_DUPLICATED');
    expect(codes).toContain('ICE_DSL_NODE_TYPE_UNSUPPORTED');
    expect(codes).toContain('ICE_DSL_EDGE_TARGET_UNKNOWN');
    const dup = result.diagnostics.find((d) => d.code === 'ICE_DSL_NODE_ID_DUPLICATED')!;
    expect(dup.path).toBe('nodes[1].id');
    expect(dup.severity).toBe('error');
    // errors 只含 error，且与 diagnostics 里的 error 一一对应
    expect(result.errors.length).toBe(result.diagnostics.filter((d) => d.severity === 'error').length);
  });

  it('合法文档：无 error、无诊断', () => {
    const result = validateDsl({
      schemaVersion: 1,
      nodes: [{ id: 'a', type: 'rect' }, { id: 'b', type: 'text', text: 'hi' }],
      edges: [{ source: 'a', target: 'b' }],
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('动画诊断（需要引擎 ≥ 2.3 的 validateAnimations；老引擎自动跳过）', () => {
    const result = validateDsl({
      nodes: [
        {
          id: 'card',
          type: 'rect',
          animations: {
            left: { from: 0, to: 100, duration: 300 },
            width: { from: 10, to: 200, duration: 300 }, // 影响派生参数 → 性能警告
            'style.fillStyle': { from: '#fff', to: '#000', duration: 300 }, // 颜色不可插值 → error
            opacity: { from: 0, to: 1, duration: 0 }, // 时长非法 → error
          },
        },
      ],
    });

    const animationDiags = result.diagnostics.filter((d) => d.code.startsWith('ICE_ANIM_'));
    // 老引擎（无 validateAnimations）下这里为空 —— 说明是"优雅降级"而不是"假错"
    if (animationDiags.length === 0) {
      expect(result.valid).toBe(true);
      return;
    }
    const codes = animationDiags.map((d) => d.code);
    expect(codes).toContain('ICE_ANIM_DURATION_INVALID');
    expect(codes).toContain('ICE_ANIM_VALUE_NOT_INTERPOLATABLE');
    expect(codes).toContain('ICE_ANIM_KEY_AFFECTS_MEASUREMENT');
    const durationDiag = animationDiags.find((d) => d.code === 'ICE_ANIM_DURATION_INVALID')!;
    expect(durationDiag.path).toBe('nodes[0].animations.opacity');
    expect(durationDiag.severity).toBe('error');
    const perfDiag = animationDiags.find((d) => d.code === 'ICE_ANIM_KEY_AFFECTS_MEASUREMENT')!;
    expect(perfDiag.path).toBe('nodes[0].animations.width');
    expect(perfDiag.severity).toBe('warning');
    expect(result.valid).toBe(false); // 有 error 级动画诊断 → 不合法
    expect(result.errors.join('\n')).toContain('duration'); // errors 也同步
  });
});
