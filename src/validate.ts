import type { DslDocument, DslValidationResult } from './types';

export const DSL_SCHEMA_VERSION = 1;

export function validateDsl(dsl: DslDocument): DslValidationResult {
  const errors: string[] = [];
  if (!dsl || typeof dsl !== 'object' || Array.isArray(dsl)) {
    return { valid: false, errors: ['DSL root must be an object'] };
  }
  if (dsl.schemaVersion !== undefined && dsl.schemaVersion !== DSL_SCHEMA_VERSION) {
    errors.push(`Unsupported schemaVersion: ${dsl.schemaVersion}`);
  }
  if (!Array.isArray(dsl.nodes)) {
    errors.push('nodes must be an array');
  } else {
    const ids = new Set<string>();
    dsl.nodes.forEach((node, index) => {
      const prefix = `nodes[${index}]`;
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
      }
    });
  }
  if (dsl.edges !== undefined && !Array.isArray(dsl.edges)) {
    errors.push('edges must be an array');
  } else {
    (dsl.edges || []).forEach((edge, index) => {
      const prefix = `edges[${index}]`;
      if (!edge || typeof edge !== 'object') {
        errors.push(`${prefix} must be an object`);
      } else {
        if (typeof edge.source !== 'string' || !edge.source.trim()) {
          errors.push(`${prefix}.source must be a non-empty string`);
        }
        if (typeof edge.target !== 'string' || !edge.target.trim()) {
          errors.push(`${prefix}.target must be a non-empty string`);
        }
      }
    });
  }
  return { valid: errors.length === 0, errors };
}
