/**
 * DSL 里的主题声明（引擎 2.4 起）。
 *
 * 统一的目的：DSL 产出的文档不该把颜色写死 —— 主题可以在文档里声明，图元样式可以直接引用
 * token（`'$primary'`），并且**在生成阶段就能查出错**（命名主题没注册 / token 拼错）。
 */
import { validateDsl } from '../src/validate';
import { compileDsl } from '../src/compiler/dslToScene';

const base = (extra: Record<string, any> = {}) => ({
  schemaVersion: 1,
  nodes: [{ id: 'a', type: 'rect', width: 40, height: 20, x: 0, y: 0 }],
  ...extra,
});

describe('DSL 主题声明', () => {
  it('命名主题：已注册的不报，没注册的给警告（引擎会静默回退 default）', () => {
    expect(validateDsl(base({ theme: 'dark' }) as any).valid).toBe(true);

    const unknown = validateDsl(base({ theme: 'no-such-theme' }) as any);
    expect(unknown.valid).toBe(true);
    expect(unknown.diagnostics.map((d) => d.code)).toContain('ICE_DSL_THEME_NAME_UNKNOWN');
  });

  it('部分主题对象：接受平铺写法与显式分层写法', () => {
    for (const theme of [{ primary: '#0d6efd' }, { semantic: { primary: '#0d6efd' } }, { base: { radius: { md: 6 } } }]) {
      const result = validateDsl(base({ theme }) as any);
      expect(result.valid).toBe(true);
      expect(result.diagnostics.map((d) => d.code)).not.toContain('ICE_DSL_THEME_INVALID');
    }
  });

  it('theme 写错类型直接报错（数组 / 数字）', () => {
    const result = validateDsl(base({ theme: [1, 2] }) as any);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.indexOf('theme must be') >= 0)).toBe(true);
  });

  it('样式里引用 token：存在的放过，拼错的给警告（引擎会跳过赋值）', () => {
    const good = validateDsl(
      base({
        nodes: [{ id: 'a', type: 'rect', width: 10, height: 10, style: { fillStyle: '$primary' } }],
      }) as any
    );
    expect(good.diagnostics.map((d) => d.code)).not.toContain('ICE_DSL_THEME_TOKEN_UNKNOWN');

    const bad = validateDsl(
      base({
        nodes: [{ id: 'a', type: 'rect', width: 10, height: 10, style: { fillStyle: '$primry' } }],
      }) as any
    );
    const diagnostic = bad.diagnostics.find((d) => d.code === 'ICE_DSL_THEME_TOKEN_UNKNOWN');
    expect(diagnostic).toBeTruthy();
    expect(diagnostic!.path).toBe('nodes[0].style.fillStyle');
  });

  it('连线的样式同样检查', () => {
    const result = validateDsl({
      schemaVersion: 1,
      nodes: [
        { id: 'a', type: 'rect', width: 10, height: 10, x: 0, y: 0 },
        { id: 'b', type: 'rect', width: 10, height: 10, x: 40, y: 0 },
      ],
      edges: [{ id: 'e', source: 'a', target: 'b', style: { strokeStyle: '$nope' } }],
    } as any);
    expect(result.diagnostics.some((d) => d.path === 'edges[0].style.strokeStyle')).toBe(true);
  });

  it('compile 不因为 theme 字段报错（theme 由运行时应用，不参与几何编译）', () => {
    const scene: any = compileDsl(base({ theme: 'dark' }) as any);
    expect(scene.nodes.length).toBe(1);
  });
});
