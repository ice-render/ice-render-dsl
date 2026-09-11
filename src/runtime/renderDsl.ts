import {
  ICE,
  ICERect,
  ICECircle,
  ICEEllipse,
  ICEText,
  ICEPolyLine,
} from 'ice-render';
import type { DslDocument } from '../types';
import { compileDsl } from '../compiler/dslToScene';
import { validateDsl } from '../validate';

export type RenderDslResult = {
  ice: any;
  nodes: any[];
  edges: any[];
};

function pointForNode(node: any, position: string): [number, number] {
  const left = node.state.left || 0;
  const top = node.state.top || 0;
  const width = node.state.width || 0;
  const height = node.state.height || 0;
  switch (position) {
    case 'R':
      return [left + width, top + height / 2];
    case 'L':
      return [left, top + height / 2];
    case 'B':
      return [left + width / 2, top + height];
    case 'T':
      return [left + width / 2, top];
    case 'C':
    default:
      return [left + width / 2, top + height / 2];
  }
}

export function renderDsl(canvasOrId: any, dsl: DslDocument): RenderDslResult {
  const validation = validateDsl(dsl);
  if (!validation.valid) {
    throw new Error(validation.errors.join('\n'));
  }

  const scene = compileDsl(dsl);
  const ice: any = new ICE().init(canvasOrId);
  const nodeMap = new Map<string, any>();

  scene.nodes.forEach((item: any) => {
    const left = item.left || 0;
    const top = item.top || 0;
    let component: any;
    switch (item.type) {
      case 'circle':
        component = new ICECircle({
          id: item.id,
          left,
          top,
          radius: item.radius || Math.min(item.width || 80, item.height || 80) / 2,
          style: item.style,
          interactive: item.interactive,
          draggable: item.draggable,
        });
        break;
      case 'ellipse':
        component = new ICEEllipse({
          id: item.id,
          left,
          top,
          width: item.width || 100,
          height: item.height || 60,
          style: item.style,
          interactive: item.interactive,
          draggable: item.draggable,
        });
        break;
      case 'text':
        component = new ICEText({
          id: item.id,
          left,
          top,
          text: item.text || '',
          style: item.style,
          interactive: item.interactive,
          draggable: item.draggable,
        });
        break;
      case 'polyline':
        component = new ICEPolyLine({
          id: item.id,
          points: item.points || [],
          style: item.style,
          interactive: item.interactive,
          draggable: item.draggable,
        });
        break;
      case 'rect':
      default:
        component = new ICERect({
          id: item.id,
          left,
          top,
          width: item.width || 120,
          height: item.height || 60,
          style: item.style,
          interactive: item.interactive,
          draggable: item.draggable,
        });
        break;
    }
    ice.addChild(component);
    nodeMap.set(item.id, component);
  });

  const edgeComponents: any[] = [];
  scene.edges.forEach((item: any) => {
    const source = nodeMap.get(item.source);
    const target = nodeMap.get(item.target);
    if (!source || !target) return;
    const startPosition = 'R';
    const endPosition = 'L';
    const edge = new ICEPolyLine({
      id: item.id,
      startPoint: pointForNode(source, startPosition),
      endPoint: pointForNode(target, endPosition),
      links: {
        start: { id: item.source, position: startPosition },
        end: { id: item.target, position: endPosition },
      },
      routeType: item.routeType || 'straight',
      lineType: item.lineType,
      arrow: item.arrow,
      curveType: item.curveType,
      label: item.label,
      style: item.style,
      lineDash: item.lineDash,
    });
    ice.addChild(edge);
    edgeComponents.push(edge);
  });

  return { ice, nodes: [...nodeMap.values()], edges: edgeComponents };
}
