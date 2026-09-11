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
