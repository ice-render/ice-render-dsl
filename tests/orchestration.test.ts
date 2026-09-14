// DSL 编排（orchestration）：让 Agent 用 JSON 声明"什么时候播、按什么节奏播"。
//
// 契约（v1）：
// - 顶层 `orchestration.groups.<name>.tracks[]`，每轨 `{ targets, at?, each?, animation }`；
// - `at` 是绝对毫秒（number ≥ 0）或相对时刻 `'+=N'`；`each` 是多目标错峰间隔（≥ 0，默认 0=同时）；
// - `targets.length === 1` → 引擎 `timeline.add`；`> 1` → `timeline.stagger`（`each` 即错峰间隔）；
// - `autoplay` 指向某个组名，渲染后自动播放它；
// - 校验出稳定码，供 Agent 自修复。
import { validateDsl, buildOrchestrationPlan, ORCHESTRATION_CODES } from '../src';

const minimal = (orchestration: any) => ({
  nodes: [
    { id: 'a', type: 'rect' },
    { id: 'b', type: 'rect' },
  ],
  orchestration,
});

describe('DSL 编排 · 校验', () => {
  it('合法编排：无诊断、valid 为 true', () => {
    const result = validateDsl(
      minimal({
        autoplay: 'entrance',
        groups: {
          entrance: {
            tracks: [
              { targets: ['a', 'b'], at: 0, each: 80, animation: { opacity: { from: 0, to: 1, duration: 300 } } },
              { targets: ['a'], at: '+=200', animation: { left: { from: 0, to: 120, duration: 400 } } },
            ],
          },
        },
      }) as any
    );
    expect(result.diagnostics).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it('targets 引用不存在的节点 → ICE_DSL_ORCHESTRATION_TARGET_UNKNOWN（带精确 path）', () => {
    const result = validateDsl(
      minimal({ groups: { g: { tracks: [{ targets: ['a', 'nope'], animation: { opacity: { from: 0, to: 1 } } }] } } }) as any
    );
    const diag = result.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.TARGET_UNKNOWN);
    expect(diag?.path).toBe('orchestration.groups.g.tracks[0].targets[1]');
    expect(result.valid).toBe(false);
  });

  it('at / each 非法（负数、坏字符串）→ ICE_DSL_ORCHESTRATION_TIME_INVALID', () => {
    const negative = validateDsl(
      minimal({ groups: { g: { tracks: [{ targets: ['a'], at: -1, animation: { opacity: { from: 0, to: 1 } } }] } } }) as any
    );
    expect(negative.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.TIME_INVALID)?.path).toBe(
      'orchestration.groups.g.tracks[0].at'
    );

    const badString = validateDsl(
      minimal({ groups: { g: { tracks: [{ targets: ['a', 'b'], at: '+=abc', animation: { opacity: { from: 0, to: 1 } } }] } } }) as any
    );
    expect(badString.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.TIME_INVALID)?.path).toBe(
      'orchestration.groups.g.tracks[0].at'
    );

    const badEach = validateDsl(
      minimal({ groups: { g: { tracks: [{ targets: ['a', 'b'], each: -5, animation: { opacity: { from: 0, to: 1 } } }] } } }) as any
    );
    expect(badEach.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.TIME_INVALID)?.path).toBe(
      'orchestration.groups.g.tracks[0].each'
    );
  });

  it('autoplay 指向不存在的组 → ICE_DSL_ORCHESTRATION_GROUP_UNKNOWN', () => {
    const result = validateDsl(
      minimal({ autoplay: 'nope', groups: { entrance: { tracks: [{ targets: ['a'], animation: { opacity: { from: 0, to: 1 } } }] } } }) as any
    );
    expect(result.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.GROUP_UNKNOWN)?.path).toBe('orchestration.autoplay');
  });

  it('轨道里的动画配置错误会被转述成引擎的诊断码（path 指到轨道内）', () => {
    const result = validateDsl(
      minimal({
        groups: { g: { tracks: [{ targets: ['a'], animation: { opacity: { from: 0, to: 1, duration: 0 } } }] } },
      }) as any
    );
    const diag = result.diagnostics.find((d) => d.code === 'ICE_ANIM_DURATION_INVALID');
    expect(diag?.path).toBe('orchestration.groups.g.tracks[0].animation.opacity');
  });

  it('缺少 groups / tracks 不是合法结构 → ICE_DSL_ORCHESTRATION_INVALID', () => {
    const noGroups = validateDsl(minimal({}) as any);
    expect(noGroups.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.INVALID)?.path).toBe('orchestration.groups');

    const noTracks = validateDsl(minimal({ groups: { g: {} } }) as any);
    expect(noTracks.diagnostics.find((d) => d.code === ORCHESTRATION_CODES.INVALID)?.path).toBe(
      'orchestration.groups.g.tracks'
    );
  });
});

describe('DSL 编排 · 编译成调度计划', () => {
  it('单目标 → add；多目标 → stagger（each 即错峰间隔）；at 原样保留', () => {
    const plan = buildOrchestrationPlan(
      minimal({
        autoplay: 'entrance',
        groups: {
          entrance: {
            tracks: [
              { targets: ['a', 'b'], at: 0, each: 80, animation: { opacity: { from: 0, to: 1, duration: 300 } } },
              { targets: ['a'], at: '+=200', animation: { left: { from: 0, to: 120, duration: 400 } } },
            ],
          },
        },
      }) as any
    );

    expect(plan.autoplay).toBe('entrance');
    expect(plan.groups.entrance).toEqual([
      {
        kind: 'stagger',
        targets: ['a', 'b'],
        at: 0,
        each: 80,
        animation: { opacity: { from: 0, to: 1, duration: 300 } },
      },
      { kind: 'add', targets: ['a'], at: '+=200', each: 0, animation: { left: { from: 0, to: 120, duration: 400 } } },
    ]);
  });

  it('没有 orchestration 的文档：计划为空（向后兼容，行为不变）', () => {
    const plan = buildOrchestrationPlan({ nodes: [{ id: 'a', type: 'rect' }] } as any);
    expect(plan).toEqual({ autoplay: null, groups: {} });
  });
});
