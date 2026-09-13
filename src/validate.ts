import * as ICEEngine from 'ice-render';
import {
  ICECircle,
  ICEComponent,
  ICEEllipse,
  ICEGroup,
  ICEImage,
  ICEIsogon,
  ICEPolyLine,
  ICERect,
  ICERose,
  ICEStar,
  ICEText,
} from 'ice-render';
import type { DslDocument, DslNode, DslDiagnostic, DslValidationResult } from './types';

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

/**
 * DSL 结构诊断的稳定码（Agent 用它自修复，不要匹配英文 message）。
 *
 * 命名空间约定：这套是本包自己的结构检查（`ICE_DSL_*`）；**动画**相关的诊断由引擎的
 * `validateAnimations()` 出码（`ICE_ANIM_*`），本包只做转述并补上节点路径。
 */
export const DSL_DIAGNOSTIC_CODES = {
  ROOT_NOT_OBJECT: 'ICE_DSL_ROOT_NOT_OBJECT',
  SCHEMA_VERSION_UNSUPPORTED: 'ICE_DSL_SCHEMA_VERSION_UNSUPPORTED',
  NODES_NOT_ARRAY: 'ICE_DSL_NODES_NOT_ARRAY',
  NODE_NOT_OBJECT: 'ICE_DSL_NODE_NOT_OBJECT',
  NODE_ID_INVALID: 'ICE_DSL_NODE_ID_INVALID',
  NODE_ID_DUPLICATED: 'ICE_DSL_NODE_ID_DUPLICATED',
  NODE_TYPE_REQUIRED: 'ICE_DSL_NODE_TYPE_REQUIRED',
  NODE_TYPE_UNSUPPORTED: 'ICE_DSL_NODE_TYPE_UNSUPPORTED',
  NODE_CHILDREN_NOT_ARRAY: 'ICE_DSL_NODE_CHILDREN_NOT_ARRAY',
  EDGES_NOT_ARRAY: 'ICE_DSL_EDGES_NOT_ARRAY',
  EDGE_NOT_OBJECT: 'ICE_DSL_EDGE_NOT_OBJECT',
  EDGE_SOURCE_INVALID: 'ICE_DSL_EDGE_SOURCE_INVALID',
  EDGE_SOURCE_UNKNOWN: 'ICE_DSL_EDGE_SOURCE_UNKNOWN',
  EDGE_TARGET_INVALID: 'ICE_DSL_EDGE_TARGET_INVALID',
  EDGE_TARGET_UNKNOWN: 'ICE_DSL_EDGE_TARGET_UNKNOWN',
  EDGE_TYPE_UNSUPPORTED: 'ICE_DSL_EDGE_TYPE_UNSUPPORTED',
  EDGE_PORT_INVALID: 'ICE_DSL_EDGE_PORT_INVALID',
} as const;

/**
 * 收集器：同时产出**结构化诊断**（Agent 用）与**历史 errors 字符串**（既有调用方用）。
 * 两者由同一个 `fail()` 产出，永远不会各说各话。
 */
class ValidationCollector {
  public readonly diagnostics: DslDiagnostic[] = [];
  public readonly errors: string[] = [];

  public fail(code: string, path: string, message: string): void {
    this.errors.push(message);
    this.diagnostics.push({ severity: 'error', code, message, path });
  }

  public warn(code: string, path: string, message: string): void {
    this.diagnostics.push({ severity: 'warning', code, message, path });
  }

  public get valid(): boolean {
    return !this.diagnostics.some((d) => d.severity === 'error');
  }
}

function collectNodeIds(node: DslNode, ids: Set<string>, out: ValidationCollector, prefix: string): void {
  if (!node || typeof node !== 'object') {
    out.fail(DSL_DIAGNOSTIC_CODES.NODE_NOT_OBJECT, prefix, `${prefix} must be an object`);
    return;
  }

  if (typeof node.id !== 'string' || !node.id.trim()) {
    out.fail(DSL_DIAGNOSTIC_CODES.NODE_ID_INVALID, `${prefix}.id`, `${prefix}.id must be a non-empty string`);
  } else if (ids.has(node.id)) {
    out.fail(DSL_DIAGNOSTIC_CODES.NODE_ID_DUPLICATED, `${prefix}.id`, `${prefix}.id is duplicated: ${node.id}`);
  } else {
    ids.add(node.id);
  }

  if (!node.type) {
    out.fail(DSL_DIAGNOSTIC_CODES.NODE_TYPE_REQUIRED, `${prefix}.type`, `${prefix}.type is required`);
  } else if (!NODE_TYPES.includes(node.type as any)) {
    out.fail(
      DSL_DIAGNOSTIC_CODES.NODE_TYPE_UNSUPPORTED,
      `${prefix}.type`,
      `${prefix}.type is unsupported: ${node.type}`
    );
  }

  if (node.children !== undefined) {
    if (!Array.isArray(node.children)) {
      out.fail(DSL_DIAGNOSTIC_CODES.NODE_CHILDREN_NOT_ARRAY, `${prefix}.children`, `${prefix}.children must be an array`);
    } else {
      node.children.forEach((child, index) => {
        collectNodeIds(child as DslNode, ids, out, `${prefix}.children[${index}]`);
      });
    }
  }

  collectAnimationDiagnostics(node, out, prefix);
}

/** DSL 节点类型 → 引擎组件类（用于按类型问"这个属性动画安全吗"）。 */
const NODE_TYPE_TO_COMPONENT: Record<string, any> = {
  rect: ICERect,
  circle: ICECircle,
  ellipse: ICEEllipse,
  text: ICEText,
  polyline: ICEPolyLine,
  image: ICEImage,
  isogon: ICEIsogon,
  star: ICEStar,
  rose: ICERose,
  group: ICEGroup,
};

/**
 * 动画块的校验（`nodes[...].animations`）。
 *
 * 规则本体在**引擎**：`ICE.validateAnimations()`（`ICE_ANIM_*` 稳定码）。
 * 本包只做三件事：① 把节点路径拼进 `path`（`nodes[2].animations.transform.translate`），
 * 让 Agent 知道改哪一行；② 用节点类型对应的引擎类给出"这个属性动画会让每帧重量测"的性能提示
 * （`ICE_ANIM_KEY_AFFECTS_MEASUREMENT`）；③ 引擎版本较老（没有该校验器）时**优雅降级** ——
 * 结构诊断照常，动画部分跳过（不报假错）。
 */
function collectAnimationDiagnostics(node: DslNode, out: ValidationCollector, prefix: string): void {
  if (!node || node.animations === undefined) {
    return;
  }
  // 引擎 ≥ 2.3 才带该校验器；低版本只做结构诊断（避免"包在旧引擎上跑出假错"）
  const engineValidate: any = (ICEEngine as any).validateAnimations;
  if (typeof engineValidate !== 'function') {
    return;
  }
  const componentCtor = NODE_TYPE_TO_COMPONENT[String(node.type)] || ICERect;
  const isSafeKey = (path: string): boolean => {
    const staticCheck = (componentCtor as any).isAnimationSafeKeyFor || (ICEComponent as any).isAnimationSafeKeyFor;
    if (typeof staticCheck === 'function') {
      return staticCheck(componentCtor, path);
    }
    return true; // 老引擎没有静态查询 → 不给性能提示（保守：不报假警告）
  };
  const diagnostics = engineValidate(node.animations, { isSafeKey });
  diagnostics.forEach((diagnostic: any) => {
    const path = diagnostic.path ? `${prefix}.animations.${diagnostic.path}` : `${prefix}.animations`;
    if (diagnostic.severity === 'warning') {
      out.warn(diagnostic.code, path, diagnostic.message);
    } else {
      out.fail(diagnostic.code, path, diagnostic.message);
    }
  });
}

export function validateDsl(dsl: DslDocument): DslValidationResult {
  const out = new ValidationCollector();
  if (!dsl || typeof dsl !== 'object' || Array.isArray(dsl)) {
    out.fail(DSL_DIAGNOSTIC_CODES.ROOT_NOT_OBJECT, '', 'DSL root must be an object');
    return { valid: false, errors: out.errors, diagnostics: out.diagnostics };
  }
  if (dsl.schemaVersion !== undefined && dsl.schemaVersion !== DSL_SCHEMA_VERSION) {
    out.fail(
      DSL_DIAGNOSTIC_CODES.SCHEMA_VERSION_UNSUPPORTED,
      'schemaVersion',
      `Unsupported schemaVersion: ${dsl.schemaVersion}`
    );
  }

  const ids = new Set<string>();
  if (!Array.isArray(dsl.nodes)) {
    out.fail(DSL_DIAGNOSTIC_CODES.NODES_NOT_ARRAY, 'nodes', 'nodes must be an array');
  } else {
    dsl.nodes.forEach((node, index) => {
      collectNodeIds(node, ids, out, `nodes[${index}]`);
    });
  }

  if (dsl.edges !== undefined && !Array.isArray(dsl.edges)) {
    out.fail(DSL_DIAGNOSTIC_CODES.EDGES_NOT_ARRAY, 'edges', 'edges must be an array');
  } else {
    (dsl.edges || []).forEach((edge, index) => {
      const prefix = `edges[${index}]`;
      if (!edge || typeof edge !== 'object') {
        out.fail(DSL_DIAGNOSTIC_CODES.EDGE_NOT_OBJECT, prefix, `${prefix} must be an object`);
        return;
      }

      if (typeof edge.source !== 'string' || !edge.source.trim()) {
        out.fail(
          DSL_DIAGNOSTIC_CODES.EDGE_SOURCE_INVALID,
          `${prefix}.source`,
          `${prefix}.source must be a non-empty string`
        );
      } else if (!ids.has(edge.source)) {
        out.fail(
          DSL_DIAGNOSTIC_CODES.EDGE_SOURCE_UNKNOWN,
          `${prefix}.source`,
          `${prefix}.source references an unknown node: ${edge.source}`
        );
      }

      if (typeof edge.target !== 'string' || !edge.target.trim()) {
        out.fail(
          DSL_DIAGNOSTIC_CODES.EDGE_TARGET_INVALID,
          `${prefix}.target`,
          `${prefix}.target must be a non-empty string`
        );
      } else if (!ids.has(edge.target)) {
        out.fail(
          DSL_DIAGNOSTIC_CODES.EDGE_TARGET_UNKNOWN,
          `${prefix}.target`,
          `${prefix}.target references an unknown node: ${edge.target}`
        );
      }

      if (edge.type && !EDGE_TYPES.includes(edge.type as any)) {
        out.fail(DSL_DIAGNOSTIC_CODES.EDGE_TYPE_UNSUPPORTED, `${prefix}.type`, `${prefix}.type is unsupported: ${edge.type}`);
      }
      if (edge.sourcePort && !PORTS.includes(edge.sourcePort as any)) {
        out.fail(
          DSL_DIAGNOSTIC_CODES.EDGE_PORT_INVALID,
          `${prefix}.sourcePort`,
          `${prefix}.sourcePort must be one of ${PORTS.join(', ')}`
        );
      }
      if (edge.targetPort && !PORTS.includes(edge.targetPort as any)) {
        out.fail(
          DSL_DIAGNOSTIC_CODES.EDGE_PORT_INVALID,
          `${prefix}.targetPort`,
          `${prefix}.targetPort must be one of ${PORTS.join(', ')}`
        );
      }
    });
  }

  return { valid: out.valid, errors: out.errors, diagnostics: out.diagnostics };
}
