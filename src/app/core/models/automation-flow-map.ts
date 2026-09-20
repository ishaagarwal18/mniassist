import { CreateUpdateAutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind } from '../../proxy/messaging';

/**
 * A read-only picture of an automation as the graph the engine actually runs: layered
 * top to bottom by the longest path from the trigger, so a rejoin shows as two arrows
 * arriving at one box. It is a view of the step list, not a second editor — editing stays
 * in the list, where a path cannot be left dangling or crossed by accident.
 */
export interface FlowMapNode {
  id: string;
  label: string;
  x: number;
  y: number;
  branching: boolean;
  terminal: boolean;
}

export interface FlowMapEdge {
  d: string;
  /** True for the "otherwise" (false) arm of a branching step. */
  otherwise: boolean;
  label?: string;
  lx: number;
  ly: number;
}

export interface FlowMap {
  nodes: FlowMapNode[];
  edges: FlowMapEdge[];
  width: number;
  height: number;
  nodeW: number;
  nodeH: number;
}

const NODE_W = 150;
const NODE_H = 34;
const GAP_X = 26;
const GAP_Y = 44;
const PAD = 12;

export function layoutFlowMap(
  nodes: readonly CreateUpdateAutomationNodeDto[],
  labelOf: (node: CreateUpdateAutomationNodeDto) => string,
): FlowMap {
  const byId = new Map(nodes.map((n) => [n.id!, n]));
  const out = (n: CreateUpdateAutomationNodeDto): { to: string; otherwise: boolean; kind: 'next' | 'true' | 'false' }[] => {
    const links: { to: string; otherwise: boolean; kind: 'next' | 'true' | 'false' }[] = [];
    if (n.nextNodeId && byId.has(n.nextNodeId)) links.push({ to: n.nextNodeId, otherwise: false, kind: 'next' });
    if (n.trueNodeId && byId.has(n.trueNodeId)) links.push({ to: n.trueNodeId, otherwise: false, kind: 'true' });
    if (n.falseNodeId && byId.has(n.falseNodeId)) links.push({ to: n.falseNodeId, otherwise: true, kind: 'false' });
    return links;
  };

  const start = nodes.find((n) => n.kind === AutomationNodeKind.Trigger);
  if (!start) return { nodes: [], edges: [], width: 0, height: 0, nodeW: NODE_W, nodeH: NODE_H };

  // Longest-path depth. The graph is acyclic by construction; the guard keeps a bad one from hanging.
  const depth = new Map<string, number>();
  const order: string[] = [];
  const queue: { id: string; d: number; trail: Set<string> }[] = [{ id: start.id!, d: 0, trail: new Set() }];
  while (queue.length) {
    const { id, d, trail } = queue.shift()!;
    if (trail.has(id)) continue;
    if ((depth.get(id) ?? -1) >= d) continue;
    if (!depth.has(id)) order.push(id);
    depth.set(id, d);
    const next = new Set(trail).add(id);
    for (const l of out(byId.get(id)!)) queue.push({ id: l.to, d: d + 1, trail: next });
  }

  const layers = new Map<number, string[]>();
  for (const id of order) {
    const d = depth.get(id)!;
    layers.set(d, [...(layers.get(d) ?? []), id]);
  }

  const widest = Math.max(...[...layers.values()].map((l) => l.length));
  const width = PAD * 2 + widest * NODE_W + (widest - 1) * GAP_X;
  const height = PAD * 2 + layers.size * NODE_H + (layers.size - 1) * GAP_Y;

  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of layers) {
    const rowW = ids.length * NODE_W + (ids.length - 1) * GAP_X;
    const x0 = (width - rowW) / 2;
    ids.forEach((id, i) => pos.set(id, { x: x0 + i * (NODE_W + GAP_X), y: PAD + d * (NODE_H + GAP_Y) }));
  }

  const flowNodes: FlowMapNode[] = order.map((id) => {
    const n = byId.get(id)!;
    const p = pos.get(id)!;
    return {
      id,
      label: labelOf(n),
      x: p.x,
      y: p.y,
      branching: n.kind === AutomationNodeKind.Condition || n.kind === AutomationNodeKind.WaitForReply,
      terminal: n.kind === AutomationNodeKind.End,
    };
  });

  const edges: FlowMapEdge[] = [];
  for (const id of order) {
    const n = byId.get(id)!;
    const from = pos.get(id)!;
    for (const l of out(n)) {
      const to = pos.get(l.to);
      if (!to) continue;
      const x1 = from.x + NODE_W / 2;
      const y1 = from.y + NODE_H;
      const x2 = to.x + NODE_W / 2;
      const y2 = to.y;
      const mid = (y1 + y2) / 2;
      const reply = n.kind === AutomationNodeKind.WaitForReply;
      const label =
        l.kind === 'true' ? (reply ? 'replied' : 'yes') : l.kind === 'false' ? (reply ? 'no reply' : 'no') : undefined;
      edges.push({
        d: `M${x1} ${y1} C${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`,
        otherwise: l.otherwise,
        label,
        lx: x1 + (x2 - x1) * 0.25 + 4,
        ly: y1 + 12,
      });
    }
  }

  return { nodes: flowNodes, edges, width, height, nodeW: NODE_W, nodeH: NODE_H };
}
