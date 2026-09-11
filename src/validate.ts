import type { DslDocument, DslNode, DslValidationResult } from './types';

export const DSL_SCHEMA_VERSION = 1;

const NODE_TYPES = [
  'rect',
  'circle',
  'ellipse',
  'text',
  'polyline',
  'image',
  'isogon',
  'star',
  'rose',
  'group',
] as const;

const EDGE_TYPES = ['polyline', 'bezier', 'visio'] as const;
const PORTS = ['T', 'R', 'B', 'L', 'C'] as const;

function collectNodeIds(node: DslNode, ids: Set<string>, errors: string[], prefix: string): void {
  if (!node || typeof node !== 'object') {
    errors.push(`${prefix} must be an object`);
    return;
  }

  if (typeof node.id !== 'string' || !node.id.trim()) {
    errors.push(`${prefix}.id must be a non-empty string`);
  } else if (ids.has(node.id)) {
    errors.push(`${prefix}.id is duplicated: ${node.id}`);
  } else {
    ids.add(node.id);
  }

  if (!node.type) {
    errors.push(`${prefix}.type is required`);
  } else if (!NODE_TYPES.includes(node.type as any)) {
    errors.push(`${prefix}.type is unsupported: ${node.type}`);
  }

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      errors.push(`${prefix}.children must be an array`);
    } else {
      node.children.forEach((child, index) => {
        collectNodeIds(child as DslNode, ids, errors, `${prefix}.children[${index}]`);
      });
    }
  }
}

export function validateDsl(dsl: DslDocument): DslValidationResult {
  const errors: string[] = [];
  if (!dsl || typeof dsl !== 'object' || Array.isArray(dsl)) {
    return { valid: false, errors: ['DSL root must be an object'] };
  }
  if (dsl.schemaVersion !== undefined && dsl.schemaVersion !== DSL_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: ${dsl.schemaVersion}`);
  }

  const ids = new Set<string>();
  if (!Array.isArray(dsl.nodes)) {
    errors.push('nodes must be an array');
  } else {
    dsl.nodes.forEach((node, index) => {
      collectNodeIds(node, ids, errors, `nodes[${index}]`);
    });
  }

  if (dsl.edges !== undefined && !Array.isArray(dsl.edges)) {
    errors.push('edges must be an array');
  } else {
    (dsl.edges || []).forEach((edge, index) => {
      const prefix = `edges[${index}]`;
      if (!edge || typeof edge !== 'object') {
        errors.push(`${prefix} must be an object`);
        return;
      }

      if (typeof edge.source !== 'string' || !edge.source.trim()) {
        errors.push(`${prefix}.source must be a non-empty string`);
      } else if (!ids.has(edge.source)) {
        errors.push(`${prefix}.source references an unknown node: ${edge.source}`);
      }

      if (typeof edge.target !== 'string' || !edge.target.trim()) {
        errors.push(`${prefix}.target must be a non-empty string`);
      } else if (!ids.has(edge.target)) {
        errors.push(`${prefix}.target references an unknown node: ${edge.target}`);
      }

      if (edge.type && !EDGE_TYPES.includes(edge.type as any)) {
        errors.push(`${prefix}.type is unsupported: ${edge.type}`);
      }
      if (edge.sourcePort && !PORTS.includes(edge.sourcePort as any)) {
        errors.push(`${prefix}.sourcePort must be one of ${PORTS.join(', ')}`);
      }
      if (edge.targetPort && !PORTS.includes(edge.targetPort as any)) {
        errors.push(`${prefix}.targetPort must be one of ${PORTS.join(', ')}`);
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
