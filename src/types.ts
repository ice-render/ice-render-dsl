export type DslNodeType =
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'text'
  | 'polyline'
  | 'image'
  | 'isogon'
  | 'star'
  | 'rose'
  | 'group';

export type DslEdgeType = 'polyline' | 'bezier' | 'visio';
export type DslPort = 'T' | 'R' | 'B' | 'L' | 'C';

export type DslStyle = Record<string, any>;

export type DslTransform = {
  translate?: [number, number];
  scale?: [number, number];
  skew?: [number, number];
  rotate?: number;
};

export type DslNode = {
  id: string;
  type: DslNodeType;
  children?: DslNode[];
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  text?: string;
  points?: number[][];
  src?: string;
  clipType?: 'none' | 'circle';
  sx?: number;
  sy?: number;
  sw?: number;
  sh?: number;
  edges?: number;
  startAngle?: number;
  outerRadius?: number;
  innerRadius?: number;
  spikes?: number;
  leafNum?: number;
  pointNumber?: number;
  style?: DslStyle;
  transform?: DslTransform;
  animations?: Record<string, any>;
  display?: boolean;
  draggable?: boolean;
  transformable?: boolean;
  interactive?: boolean;
  linkable?: boolean;
  fill?: boolean;
  stroke?: boolean;
  lineDash?: number[];
  origin?: 'localCenter' | 'top-left' | 'custom';
  originX?: number;
  originY?: number;
  zIndex?: number;
  preset?: string;
};

export type DslEdge = {
  id?: string;
  source: string;
  target: string;
  type?: DslEdgeType;
  sourcePort?: DslPort;
  targetPort?: DslPort;
  points?: number[][];
  controlPoint?: number[];
  controlPoint1?: number[];
  controlPoint2?: number[];
  routeType?: 'straight' | 'orthogonal';
  curveType?: 'straight' | 'quadratic' | 'cubic';
  linkShape?: 'visio' | 'bezier';
  lineType?: 'solid' | 'dashed';
  arrow?: 'none' | 'start' | 'end' | 'both';
  arrowLength?: number;
  arrowAngel?: number;
  label?: string;
  style?: DslStyle;
  lineDash?: number[];
};

export type DslDocumentOptions = {
  renderMode?: 'dirty-rect' | 'full';
  dpr?: number;
  viewport?: {
    scale: number;
    tx: number;
    ty: number;
  };
  fitViewport?: boolean;
  fitViewportPadding?: number;
};

export type DslDocument = {
  schemaVersion?: number;
  nodes: DslNode[];
  edges?: DslEdge[];
  options?: DslDocumentOptions;
  /** 编排（声明式）：见 {@link DslOrchestration}。不写则行为与从前完全一致（动画创建即播）。 */
  orchestration?: DslOrchestration;
};

/**
 * 声明式编排（v1）。
 *
 * 背景：每个节点的 `animations` 只能描述"这条动画自己怎么动、延迟多久"，跨节点的时序（先 A 后 B、
 * 每隔 80ms 依次入场）只能靠调用方手算 `delay`；而播放/暂停/重播这类运行时控制**完全表达不了**。
 * 编排块把这层补上：JSON 声明"什么时候播、按什么节奏播"，运行时仍由引擎
 * `animationManager.timeline()`（调度器）执行 —— 缓动/关键帧/量化/缓存复用/空闲停帧/诊断全部自动生效。
 *
 * ```json
 * "orchestration": {
 *   "autoplay": "entrance",
 *   "groups": {
 *     "entrance": {
 *       "tracks": [
 *         { "targets": ["card1", "card2"], "at": 0, "each": 80,
 *           "animation": { "opacity": { "from": 0, "to": 1, "duration": 300 } } },
 *         { "targets": ["card1"], "at": "+=200",
 *           "animation": { "left": { "from": 40, "to": 160, "duration": 500 } } }
 *       ]
 *     }
 *   }
 * }
 * ```
 */
export type DslOrchestrationTrack = {
  /** 目标节点 id 列表（必须在 `nodes` 里存在）。单目标走 `timeline.add`，多目标走 `timeline.stagger`。 */
  targets: string[];
  /** 起点：绝对毫秒（≥0）或相对时刻 `'+=N'`。默认 0。 */
  at?: number | string;
  /** 多目标之间的错峰间隔（毫秒，≥0，默认 0 = 同时）。 */
  each?: number;
  /** 要施加的动画配置，键与 `nodes[].animations` 完全一致（如 `opacity` / `left` / `transform.translate`）。 */
  animation: Record<string, any>;
};

export type DslOrchestrationGroup = {
  tracks: DslOrchestrationTrack[];
};

export type DslOrchestration = {
  /** 渲染完成后自动播放哪个组（组名必须存在）。不写则不自动播放。 */
  autoplay?: string;
  /** 命名编排组：宿主可用 `handle.orchestration.play('组名')` 触发。 */
  groups: Record<string, DslOrchestrationGroup>;
};

/**
 * 结构化诊断（Agent 侧闭环用）：稳定码 + 精确路径 + 人话 message。
 *
 * - 结构检查：`ICE_DSL_*`（本包）
 * - 动画检查：`ICE_ANIM_*`（引擎的 `validateAnimations()`，本包只转述并补节点路径）
 */
export type DslDiagnostic = {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  /** 出问题的位置：如 `nodes[2].animations.transform.translate` */
  path: string;
};

export type DslValidationResult = {
  valid: boolean;
  /** 历史字段：纯文本错误（与 `diagnostics` 里的 error 同源，逐条对应） */
  errors: string[];
  /** 结构化诊断：包含 warning（`errors` 只含 error） */
  diagnostics: DslDiagnostic[];
};
