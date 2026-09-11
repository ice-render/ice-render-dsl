import type { DslDocument, DslEdge, DslNode } from '../types';

export type CompiledScene = {
  nodes: Array<Record<string, any>>;
  edges: Array<Record<string, any>>;
  options?: Record<string, any>;
};

function normalizeNode(node: DslNode): Record<string, any> {
  return {
    id: node.id,
    type: node.type,
    left: node.left,
    top: node.top,
    width: node.width,
    height: node.height,
    radius: node.radius,
    text: node.text,
    points: node.points,
    style: node.style,
    interactive: node.interactive,
    draggable: node.draggable,
  };
}

function normalizeEdge(edge: DslEdge, index: number): Record<string, any> {
  return {
    id: edge.id || `edge-${index}`,
    source: edge.source,
    target: edge.target,
    lineType: edge.lineType,
    arrow: edge.arrow,
    routeType: edge.routeType,
    curveType: edge.curveType,
    label: edge.label,
    style: edge.style,
    lineDash: edge.lineDash,
  };
}

export function compileDsl(dsl: DslDocument): CompiledScene {
  return {
    nodes: dsl.nodes.map(normalizeNode),
    edges: (dsl.edges || []).map(normalizeEdge),
    options: dsl.options,
  };
}
