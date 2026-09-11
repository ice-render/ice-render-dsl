import type { DslDocument, DslEdge, DslNode } from '../types';

export type CompiledNode = Record<string, any> & {
  children?: CompiledNode[];
};

export type CompiledEdge = Record<string, any>;

export type CompiledScene = {
  nodes: CompiledNode[];
  edges: CompiledEdge[];
  options?: Record<string, any>;
};

function normalizeNode(node: DslNode): CompiledNode {
  const { children, ...props } = node;
  return {
    ...props,
    children: Array.isArray(children) ? children.map(normalizeNode) : undefined,
  };
}

function normalizeEdge(edge: DslEdge): CompiledEdge {
  return {
    ...edge,
    id: edge.id || `edge-${edge.source}-${edge.target}`,
  };
}

export function compileDsl(dsl: DslDocument): CompiledScene {
  return {
    nodes: dsl.nodes.map(normalizeNode),
    edges: (dsl.edges || []).map(normalizeEdge),
    options: dsl.options,
  };
}
