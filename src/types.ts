export type DslNodeType = 'rect' | 'circle' | 'ellipse' | 'text' | 'polyline';

export type DslNode = {
  id: string;
  type: DslNodeType;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
  radius?: number;
  text?: string;
  points?: number[][];
  style?: Record<string, any>;
  interactive?: boolean;
  draggable?: boolean;
};

export type DslEdge = {
  id?: string;
  source: string;
  target: string;
  lineType?: string;
  arrow?: string;
  routeType?: string;
  curveType?: string;
  label?: string;
  style?: Record<string, any>;
  lineDash?: number[];
};

export type DslDocument = {
  schemaVersion?: number;
  nodes: DslNode[];
  edges?: DslEdge[];
  options?: {
    fitViewport?: boolean;
    gapX?: number;
    gapY?: number;
  };
};

export type DslValidationResult = {
  valid: boolean;
  errors: string[];
};
