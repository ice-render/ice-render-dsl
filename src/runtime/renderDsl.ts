import {
  ICE,
  ICEBezier,
  ICECircle,
  ICEEllipse,
  ICEGroup,
  ICEImage,
  ICEIsogon,
  ICEPolyLine,
  ICERect,
  ICERose,
  ICEStar,
  ICEText,
  ICEVisioLink,
} from 'ice-render';
import type { DslDocument } from '../types';
import { compileDsl } from '../compiler/dslToScene';
import { buildOrchestrationPlan } from '../compiler/orchestration';
import { validateDsl } from '../validate';

export type RenderDslResult = {
  ice: any;
  nodes: any[];
  edges: any[];
  /**
   * 编排句柄：只有文档里写了 `orchestration` 才有实质内容。
   *
   * 每个组一条**独立的** timeline（引擎的调度器），所以 `play('entrance')` 只播这一组。
   * `pause/resume/stop/restart/finished` 默认作用于"最近一次播放的组"，也可以显式传组名。
   */
  orchestration: {
    /** 组名列表（声明顺序）。 */
    groups: string[];
    play(group: string): boolean;
    pause(group?: string): boolean;
    resume(group?: string): boolean;
    stop(group?: string): boolean;
    restart(group?: string): boolean;
    /** 该组播完的 Promise（引擎 timeline.finished）；没有这个组时返回 null。 */
    finished(group?: string): Promise<void> | null;
    /** 当前（最近一次播放的）组名。 */
    active: string | null;
  };
};

function propsForNode(node: any): any {
  const { type, children, ...props } = node;
  return props;
}

function createComponent(type: string, props: any): any {
  switch (type) {
    case 'circle':
      return new ICECircle({
        ...props,
        radius: props.radius || Math.min(props.width || 80, props.height || 80) / 2,
      });
    case 'ellipse':
      return new ICEEllipse(props);
    case 'text':
      return new ICEText(props);
    case 'polyline':
      return new ICEPolyLine(props);
    case 'image':
      return new ICEImage(props);
    case 'isogon':
      return new ICEIsogon(props);
    case 'star':
      return new ICEStar(props);
    case 'rose':
      return new ICERose(props);
    case 'group':
      return new ICEGroup(props);
    case 'rect':
    default:
      return new ICERect(props);
  }
}

function addNode(
  node: any,
  parent: any,
  nodeMap: Map<string, any>,
): any {
  const component = createComponent(node.type, propsForNode(node));
  parent.addChild(component);
  nodeMap.set(node.id, component);

  if (node.type === 'group' && Array.isArray(node.children)) {
    node.children.forEach((child: any) => {
      addNode(child, component, nodeMap);
    });
  }

  return component;
}

function portPoint(component: any, position: string): [number, number] {
  const box = component.getMinBoundingBox(true);
  switch (position) {
    case 'T':
      return [box.tc[0], box.tc[1]];
    case 'R':
      return [box.rc[0], box.rc[1]];
    case 'B':
      return [box.bc[0], box.bc[1]];
    case 'L':
      return [box.lc[0], box.lc[1]];
    case 'C':
    default:
      return [box.center[0], box.center[1]];
  }
}

function createEdge(
  edge: any,
  nodeMap: Map<string, any>,
): any {
  const source = nodeMap.get(edge.source);
  const target = nodeMap.get(edge.target);
  if (!source || !target) {
    throw new Error(`Cannot create edge ${edge.id || ''}: unknown source or target`);
  }

  const sourcePort = edge.sourcePort || 'R';
  const targetPort = edge.targetPort || 'L';
  const common: any = {
    ...edge,
    startPoint: portPoint(source, sourcePort),
    endPoint: portPoint(target, targetPort),
    links: {
      start: { id: edge.source, position: sourcePort },
      end: { id: edge.target, position: targetPort },
    },
  };

  switch (edge.type) {
    case 'bezier':
      return new ICEBezier(common);
    case 'visio':
      return new ICEVisioLink({
        ...common,
        linkShape: edge.linkShape || 'visio',
      });
    case 'polyline':
    default:
      return new ICEPolyLine(common);
  }
}

function fitViewport(ice: any, nodes: any[], padding: number): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    if (typeof node.measure === 'function') {
      node.measure();
    }
    const box = node.getMinBoundingBox(true);
    const bounds = box.getMinAndMaxPoint();
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  /**
   * 视口尺寸必须是 **CSS 尺寸**，不是 `canvasWidth/canvasHeight` —— 后者是
   * **backing store** 尺寸（= css × dpr），而渲染视口还会再乘一次 dpr，
   * 拿它算 scale 等于**多乘一次**：`options.dpr > 1` 时内容被放大并裁掉，
   * 而且**不报错**（普通屏完全正常，只在高分屏上复发）。
   *
   * ① 首选引擎的输入矩形（内容盒），它与命中测试 / 坐标换算同一口径，dpr 变化时数值不变；
   * ② 没有布局信息的运行时退回 `canvasWidth / dpr`。
   */
  const dpr = ice && ice.dpr ? ice.dpr : 1;
  const rect = ice && typeof ice.getInputRect === 'function' ? ice.getInputRect() : null;
  const canvasWidth = rect && rect.width > 0 ? rect.width : (ice.canvasWidth || 0) / dpr;
  const canvasHeight = rect && rect.height > 0 ? rect.height : (ice.canvasHeight || 0) / dpr;
  if (!canvasWidth || !canvasHeight || contentWidth <= 0 || contentHeight <= 0) {
    return;
  }

  const pad = Number.isFinite(padding) && padding >= 0 ? padding : 40;
  const availableWidth = Math.max(1, canvasWidth - pad * 2);
  const availableHeight = Math.max(1, canvasHeight - pad * 2);
  const scale = Math.min(availableWidth / contentWidth, availableHeight / contentHeight, 1);
  const tx = (canvasWidth - contentWidth * scale) / 2 - minX * scale;
  const ty = (canvasHeight - contentHeight * scale) / 2 - minY * scale;
  ice.setViewport(scale, tx, ty);
}

export function renderDsl(canvasOrId: any, dsl: DslDocument): RenderDslResult {
  const validation = validateDsl(dsl);
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  const scene = compileDsl(dsl);
  const options: any = scene.options || {};
  const initOptions: any = {};
  if (options.renderMode) {
    initOptions.renderMode = options.renderMode;
  }
  if (options.dpr) {
    initOptions.dpr = options.dpr;
  }

  const ice: any = new ICE().init(canvasOrId, initOptions);
  // 主题要在建图元之前应用：preset 与"没写 style"的默认样式都是在构造时按主题展开的
  if (dsl.theme && typeof ice.setTheme === 'function') {
    ice.setTheme(dsl.theme as any);
  }
  const nodeMap = new Map<string, any>();

  scene.nodes.forEach((node: any) => {
    addNode(node, ice, nodeMap);
  });

  const edgeComponents: any[] = [];
  scene.edges.forEach((edge: any) => {
    const edgeComponent = createEdge(edge, nodeMap);
    ice.addChild(edgeComponent);
    edgeComponents.push(edgeComponent);
  });

  if (options.viewport) {
    ice.setViewport(options.viewport.scale, options.viewport.tx, options.viewport.ty);
  } else if (options.fitViewport) {
    fitViewport(ice, [...nodeMap.values()], options.fitViewportPadding);
  }

  // ---- 编排：把纯数据的计划翻译成引擎 timeline 调用 ----
  //
  // 关键设计：**不引入第二套求值路径**。JSON 只描述"什么时候播、按什么节奏播"，
  // 推进仍由引擎的 AnimationManager 每帧完成 —— 缓动/关键帧/量化/位图缓存复用/空闲停帧/
  // 运行期诊断全部自动继承（见 ice-render 18 §3.1 与 07）。
  const plan = buildOrchestrationPlan(dsl);
  const timelines = new Map<string, any>();
  /** 已经播放过的组（用于把"再次 play"解释成"重播"）。 */
  const played = new Set<string>();
  const manager: any = ice.animationManager;

  const resolveTargets = (ids: string[]): any[] =>
    ids.map((id) => nodeMap.get(id)).filter((component) => !!component);

  for (const [group, steps] of Object.entries(plan.groups)) {
    const timeline = manager.timeline();
    for (const step of steps) {
      const targets = resolveTargets(step.targets);
      if (!targets.length) continue;
      if (step.kind === 'stagger') {
        timeline.stagger(targets, step.animation, { each: step.each, at: step.at });
      } else {
        timeline.add(targets[0], step.animation, { at: step.at });
      }
    }
    timelines.set(group, timeline);
  }

  const orchestration: RenderDslResult['orchestration'] = {
    groups: [...timelines.keys()],
    active: null,
    play(group: string): boolean {
      const timeline = timelines.get(group);
      if (!timeline) return false;
      orchestration.active = group;
      // 第二次及以后再 play 同一个组 = "重播"：走 restart() 明确回到起点。
      // 这样即使宿主引擎是 2.3.0/2.3.1（`ANIM` 时间轴播完后 play() 会被早退分支吞掉，2.3.2 已修），
      // 重播按钮也照常工作 —— 不把 DSL 的正确性绑在引擎补丁版的发布顺序上。
      if (played.has(group)) {
        timeline.restart();
      } else {
        played.add(group);
        timeline.play();
      }
      return true;
    },
    pause(group?: string): boolean {
      const timeline = timelines.get(group || orchestration.active || '');
      if (!timeline) return false;
      timeline.pause();
      return true;
    },
    resume(group?: string): boolean {
      const timeline = timelines.get(group || orchestration.active || '');
      if (!timeline) return false;
      timeline.resume();
      return true;
    },
    stop(group?: string): boolean {
      const timeline = timelines.get(group || orchestration.active || '');
      if (!timeline) return false;
      timeline.stop();
      return true;
    },
    restart(group?: string): boolean {
      const timeline = timelines.get(group || orchestration.active || '');
      if (!timeline) return false;
      orchestration.active = group || orchestration.active;
      timeline.restart();
      return true;
    },
    finished(group?: string): Promise<void> | null {
      const timeline = timelines.get(group || orchestration.active || '');
      return timeline ? timeline.finished : null;
    },
  };

  if (plan.autoplay) {
    orchestration.play(plan.autoplay);
  }

  return {
    ice,
    nodes: [...nodeMap.values()],
    edges: edgeComponents,
    orchestration,
  };
}
