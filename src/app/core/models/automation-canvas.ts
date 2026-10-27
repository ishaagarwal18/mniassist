import { AutomationNodeDto, CreateUpdateAutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind } from '../../proxy/messaging';
import { layoutFlowMap } from './automation-flow-map';

/**
 * The automation as a canvas edits it: every node with a place on the page and up to two ways out. Unlike the step list,
 * any shape the engine can run is allowed here — branches that meet anywhere, steps side by side — except a loop, which
 * the engine would follow forever and the server refuses. Every function returns a new array; nothing is changed in place.
 */
export type Port = 'next' | 'yes' | 'no';

export interface CanvasNode {
  id: string;
  kind: AutomationNodeKind;
  config: Record<string, unknown>;
  x: number;
  y: number;
  next: string | null;
  yes: string | null;
  no: string | null;
  entered?: number;
  exited?: number;
}

export const NODE_W = 208;
export const NODE_H = 76;
export const GRID = 16;
const GAP_X = 48;
const GAP_Y = 64;

export const isBranchingKind = (kind: AutomationNodeKind): boolean =>
  kind === AutomationNodeKind.Condition ||
  kind === AutomationNodeKind.WaitForReply ||
  kind === AutomationNodeKind.AiCall;

/** The ways out of a node: none from End, yes/no from a branching step, one "next" from anything else. */
export function portsOf(kind: AutomationNodeKind): Port[] {
  if (kind === AutomationNodeKind.End) return [];
  return isBranchingKind(kind) ? ['yes', 'no'] : ['next'];
}

/** Everything but the trigger can be arrived at. */
export const hasInput = (kind: AutomationNodeKind): boolean => kind !== AutomationNodeKind.Trigger;

/** Trigger and End are the automation's own; a canvas moves them but never adds or deletes them. */
export const isFixed = (kind: AutomationNodeKind): boolean =>
  kind === AutomationNodeKind.Trigger || kind === AutomationNodeKind.End;

export const snap = (v: number): number => Math.max(0, Math.round(v / GRID) * GRID);

/** Where a link leaves a node and where one arrives, in canvas coordinates. */
export function portPoint(n: Pick<CanvasNode, 'x' | 'y'>, port: Port): { x: number; y: number } {
  const fraction = port === 'yes' ? 0.27 : port === 'no' ? 0.73 : 0.5;
  return { x: n.x + NODE_W * fraction, y: n.y + NODE_H };
}

export const inputPoint = (n: Pick<CanvasNode, 'x' | 'y'>): { x: number; y: number } => ({
  x: n.x + NODE_W / 2,
  y: n.y,
});

/** A smooth link from one point to another, bending round when it has to go back up the page. */
export function wirePath(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dy = Math.max(40, Math.abs(to.y - from.y) / 2);
  return `M${from.x} ${from.y} C${from.x} ${from.y + dy}, ${to.x} ${to.y - dy}, ${to.x} ${to.y}`;
}

function parseConfig(json: string | null | undefined): Record<string, unknown> {
  try {
    const value = json ? JSON.parse(json) : {};
    return value && typeof value === 'object' && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/** Reads stored nodes onto the canvas, adding the trigger or End if the graph has none (a brand-new automation). */
export function fromDtos(
  dtos: readonly (AutomationNodeDto | CreateUpdateAutomationNodeDto)[],
  newId: () => string = () => crypto.randomUUID(),
): CanvasNode[] {
  const ids = new Set(dtos.map((d) => d.id).filter(Boolean));
  const link = (to: string | null | undefined) => (to && ids.has(to) ? to : null);
  const nodes: CanvasNode[] = dtos.map((d) => ({
    id: d.id ?? newId(),
    kind: d.kind ?? AutomationNodeKind.SendSessionMessage,
    config: parseConfig(d.configJson),
    x: d.positionX ?? 0,
    y: d.positionY ?? 0,
    next: link(d.nextNodeId),
    yes: link(d.trueNodeId),
    no: link(d.falseNodeId),
    entered: (d as AutomationNodeDto).enteredCount,
    exited: (d as AutomationNodeDto).exitedCount,
  }));

  if (!nodes.some((n) => n.kind === AutomationNodeKind.Trigger)) {
    nodes.unshift({
      id: newId(),
      kind: AutomationNodeKind.Trigger,
      config: {},
      x: 0,
      y: 0,
      next: null,
      yes: null,
      no: null,
    });
  }
  if (!nodes.some((n) => n.kind === AutomationNodeKind.End)) {
    nodes.push({
      id: newId(),
      kind: AutomationNodeKind.End,
      config: {},
      x: 0,
      y: 0,
      next: null,
      yes: null,
      no: null,
    });
  }
  return nodes;
}

/** What the API stores. Positions are whole pixels there. */
export function toDtos(nodes: readonly CanvasNode[]): CreateUpdateAutomationNodeDto[] {
  return nodes.map((n) => ({
    id: n.id,
    kind: n.kind,
    configJson: JSON.stringify(n.config),
    nextNodeId: n.next,
    trueNodeId: n.yes,
    falseNodeId: n.no,
    positionX: Math.round(n.x),
    positionY: Math.round(n.y),
  }));
}

/** The same, with each node's entered/exited counts, for reading back into the step list. */
export const toNodeDtos = (nodes: readonly CanvasNode[]): AutomationNodeDto[] =>
  toDtos(nodes).map((d, i) => ({
    ...d,
    id: d.id!,
    enteredCount: nodes[i].entered,
    exitedCount: nodes[i].exited,
  }));

export function linkOf(n: CanvasNode, port: Port): string | null {
  return port === 'next' ? n.next : port === 'yes' ? n.yes : n.no;
}

const outLinks = (n: CanvasNode): string[] => [n.next, n.yes, n.no].filter((x): x is string => !!x);

/** Whether `to` can be reached from `from` by following links. */
export function reaches(nodes: readonly CanvasNode[], from: string, to: string): boolean {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    if (id === to) return true;
    if (seen.has(id)) continue;
    seen.add(id);
    const n = byId.get(id);
    if (n) queue.push(...outLinks(n));
  }
  return false;
}

/** Why `from`'s `port` cannot be joined to `to`, or null when it can. */
export function connectProblem(
  nodes: readonly CanvasNode[],
  from: string,
  port: Port,
  to: string,
): string | null {
  const source = nodes.find((n) => n.id === from);
  const target = nodes.find((n) => n.id === to);
  if (!source || !target) return 'That step is no longer there.';
  if (!portsOf(source.kind).includes(port)) return 'That step has no such way out.';
  if (!hasInput(target.kind)) return 'Nothing can lead back into the trigger.';
  if (from === to || reaches(nodes, to, from))
    return 'That would make a loop — a contact would go round it forever.';
  return null;
}

export type Edited = { nodes: CanvasNode[] } | { error: string };

export function connect(
  nodes: readonly CanvasNode[],
  from: string,
  port: Port,
  to: string,
): Edited {
  const problem = connectProblem(nodes, from, port, to);
  if (problem) return { error: problem };
  return { nodes: nodes.map((n) => (n.id === from ? { ...n, [port]: to } : n)) };
}

export const disconnect = (nodes: readonly CanvasNode[], from: string, port: Port): CanvasNode[] =>
  nodes.map((n) => (n.id === from ? { ...n, [port]: null } : n));

export function removeNode(nodes: readonly CanvasNode[], id: string): Edited {
  const node = nodes.find((n) => n.id === id);
  if (!node) return { nodes: [...nodes] };
  if (isFixed(node.kind))
    return { error: 'The trigger and End belong to the automation and cannot be deleted.' };
  const drop = (to: string | null) => (to === id ? null : to);
  return {
    nodes: nodes
      .filter((n) => n.id !== id)
      .map((n) => ({ ...n, next: drop(n.next), yes: drop(n.yes), no: drop(n.no) })),
  };
}

export const moveNode = (
  nodes: readonly CanvasNode[],
  id: string,
  x: number,
  y: number,
): CanvasNode[] => nodes.map((n) => (n.id === id ? { ...n, x: snap(x), y: snap(y) } : n));

/** Steps the trigger never reaches: they are saved, but no contact will ever get to them. */
export function unreachable(nodes: readonly CanvasNode[]): string[] {
  const trigger = nodes.find((n) => n.kind === AutomationNodeKind.Trigger);
  if (!trigger) return [];
  return nodes
    .filter(
      (n) =>
        n.kind !== AutomationNodeKind.Trigger &&
        n.kind !== AutomationNodeKind.End &&
        !reaches(nodes, trigger.id, n.id),
    )
    .map((n) => n.id);
}

/** Old automations were saved with every step in one column at x = 0; those are laid out afresh. */
export const needsLayout = (nodes: readonly CanvasNode[]): boolean => nodes.every((n) => n.x === 0);

/** Lays the whole graph out top to bottom from the trigger; anything the trigger does not reach goes in a row below. */
export function tidy(nodes: readonly CanvasNode[]): CanvasNode[] {
  const map = layoutFlowMap(toDtos(nodes), () => '', {
    nodeW: NODE_W,
    nodeH: NODE_H,
    gapX: GAP_X,
    gapY: GAP_Y,
    pad: 32,
  });
  const placed = new Map(map.nodes.map((m) => [m.id, m]));
  let spareX = 32;
  const spareY = map.height + GAP_Y / 2;
  return nodes.map((n) => {
    const p = placed.get(n.id);
    if (p) return { ...n, x: snap(p.x), y: snap(p.y) };
    const at = { ...n, x: snap(spareX), y: snap(spareY) };
    spareX += NODE_W + GAP_X;
    return at;
  });
}

/**
 * Places the nodes named in `fresh` next to whatever leads into them — below it, or to the side for a yes/no arm — leaving
 * everything already placed where the person put it. Used when steps added in the list first appear on the canvas.
 */
export function placeNew(nodes: readonly CanvasNode[], fresh: ReadonlySet<string>): CanvasNode[] {
  if (fresh.size === 0) return [...nodes];
  const out = new Map(nodes.map((n) => [n.id, { ...n }]));
  const done = new Set(nodes.filter((n) => !fresh.has(n.id)).map((n) => n.id));
  const occupied = (x: number, y: number) =>
    [...out.values()].some(
      (o) => done.has(o.id) && Math.abs(o.x - x) < NODE_W && Math.abs(o.y - y) < NODE_H,
    );

  const trigger = nodes.find((n) => n.kind === AutomationNodeKind.Trigger);
  const order: string[] = [];
  const seen = new Set<string>();
  const queue = trigger ? [trigger.id] : [];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    queue.push(...outLinks(out.get(id)!));
  }
  for (const n of nodes) if (!seen.has(n.id)) order.push(n.id);

  const bottom = () =>
    Math.max(
      0,
      ...[...out.values()].filter((o) => done.has(o.id)).map((o) => o.y + NODE_H + GAP_Y),
    );

  for (const id of order) {
    if (!fresh.has(id)) continue;
    const node = out.get(id)!;
    let x = 32;
    let y = bottom();
    const parent = [...out.values()].find((p) => done.has(p.id) && outLinks(p).includes(id));
    if (parent) {
      const port: Port = parent.yes === id ? 'yes' : parent.no === id ? 'no' : 'next';
      const shift =
        port === 'yes' ? -(NODE_W + GAP_X) / 2 : port === 'no' ? (NODE_W + GAP_X) / 2 : 0;
      x = Math.max(0, parent.x + shift);
      y = parent.y + NODE_H + GAP_Y;
    }
    while (occupied(x, y)) y += NODE_H + GAP_Y;
    node.x = snap(x);
    node.y = snap(y);
    done.add(id);
  }
  return nodes.map((n) => out.get(n.id)!);
}

/**
 * Undo brings back the structure that was there — which steps, how they are joined, where they sit — but keeps whatever
 * was typed into a step since, so undoing a move does not also undo a message written after it.
 */
export function restoreStructure(
  snapshot: readonly CanvasNode[],
  current: readonly CanvasNode[],
): CanvasNode[] {
  const now = new Map(current.map((n) => [n.id, n]));
  return snapshot.map((n) => {
    const later = now.get(n.id);
    return later && later.kind === n.kind ? { ...n, config: later.config } : n;
  });
}
