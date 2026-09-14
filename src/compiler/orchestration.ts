import type { DslDocument, DslOrchestrationTrack } from '../types';

/**
 * 编排计划（纯数据）。
 *
 * 为什么先编译成计划再执行：计划是**可单测**的（不需要 canvas/ICE），而执行只是把它逐条翻译成
 * 引擎 `animationManager.timeline()` 的 `add` / `stagger` 调用 —— 两份关注点分开，
 * 校验/编译的回归用 jest，真正的播放行为用真实浏览器 e2e 钉。
 */
export type OrchestrationStep = {
  /** 单目标 → `timeline.add`；多目标 → `timeline.stagger`。 */
  kind: 'add' | 'stagger';
  targets: string[];
  /** 绝对毫秒或 `'+=N'`；缺省 0。 */
  at: number | string;
  /** 错峰间隔（多目标才有意义）；缺省 0。 */
  each: number;
  animation: Record<string, any>;
};

export type OrchestrationPlan = {
  /** 渲染后自动播放的组名；没有则 null。 */
  autoplay: string | null;
  /** 组名 → 顺序执行的步骤。 */
  groups: Record<string, OrchestrationStep[]>;
};

function toStep(track: DslOrchestrationTrack): OrchestrationStep {
  const targets = Array.isArray(track.targets) ? track.targets.slice() : [];
  return {
    kind: targets.length > 1 ? 'stagger' : 'add',
    targets,
    at: track.at === undefined ? 0 : track.at,
    each: typeof track.each === 'number' ? track.each : 0,
    animation: track.animation,
  };
}

export function buildOrchestrationPlan(dsl: DslDocument): OrchestrationPlan {
  const orchestration: any = (dsl as any).orchestration;
  const plan: OrchestrationPlan = { autoplay: null, groups: {} };
  if (!orchestration || typeof orchestration !== 'object') {
    return plan;
  }
  const groups = orchestration.groups;
  if (!groups || typeof groups !== 'object') {
    return plan;
  }
  for (const [name, group] of Object.entries<any>(groups)) {
    const tracks = group && Array.isArray(group.tracks) ? group.tracks : [];
    plan.groups[name] = tracks.map(toStep);
  }
  if (typeof orchestration.autoplay === 'string') {
    plan.autoplay = orchestration.autoplay;
  }
  return plan;
}
