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

export type DslValidationResult = {
  valid: boolean;
  errors: string[];
};
