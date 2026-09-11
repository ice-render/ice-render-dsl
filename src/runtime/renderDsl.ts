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
import { validateDsl } from '../validate';

export type RenderDslResult = {
  ice: any;
  nodes: any[];
  edges: any[];
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
    const box = node.getMinBoundingBox(true);
    const bounds = box.getMinAndMaxPoint();
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });

  const contentWidth = maxX - minX;
  const contentHeight = maxY - minY;
  const canvasWidth = ice.canvasWidth || 0;
  const canvasHeight = ice.canvasHeight || 0;
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

  return {
    ice,
    nodes: [...nodeMap.values()],
    edges: edgeComponents,
  };
}
