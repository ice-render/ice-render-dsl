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
