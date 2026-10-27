import { AutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind } from '../../proxy/messaging';
import {
  CanvasNode,
  NODE_H,
  connect,
  connectProblem,
  disconnect,
  fromDtos,
  moveNode,
  needsLayout,
  placeNew,
  portsOf,
  removeNode,
  restoreStructure,
  tidy,
  toDtos,
  unreachable,
} from './automation-canvas';
import { graphToSteps } from './automation-graph';

const K = AutomationNodeKind;

const node = (
  id: string,
  kind: AutomationNodeKind,
  links: Partial<Pick<CanvasNode, 'next' | 'yes' | 'no' | 'x' | 'y'>> = {},
): CanvasNode => ({
  id,
  kind,
  config: {},
  x: 0,
  y: 0,
  next: null,
  yes: null,
  no: null,
  ...links,
});

/** Trigger → a → b → End, with c on its own. */
const sample = (): CanvasNode[] => [
  node('t', K.Trigger, { next: 'a' }),
  node('a', K.SendSessionMessage, { next: 'b' }),
  node('b', K.Wait, { next: 'e' }),
  node('c', K.AssignAgent),
  node('e', K.End),
];

const ok = (r: ReturnType<typeof connect>): CanvasNode[] => {
  if ('error' in r) throw new Error(r.error);
  return r.nodes;
};

describe('the automation canvas model', () => {
  it('gives End no way out, a branching step yes/no and anything else one', () => {
    expect(portsOf(K.End)).toEqual([]);
    expect(portsOf(K.Condition)).toEqual(['yes', 'no']);
    expect(portsOf(K.WaitForReply)).toEqual(['yes', 'no']);
    expect(portsOf(K.AiCall)).toEqual(['yes', 'no']);
    expect(portsOf(K.Trigger)).toEqual(['next']);
    expect(portsOf(K.Wait)).toEqual(['next']);
  });

  it('connects a step to one further down', () => {
    const nodes = ok(connect(sample(), 'b', 'next', 'c'));
    expect(nodes.find((n) => n.id === 'b')!.next).toBe('c');
  });

  it('refuses a link that would loop back to an earlier step, or to itself', () => {
    expect(connectProblem(sample(), 'b', 'next', 'a')).toContain('loop');
    expect(connectProblem(sample(), 'a', 'next', 'a')).toContain('loop');
    expect('error' in connect(sample(), 'b', 'next', 'a')).toBe(true);
  });

  it('refuses a link into the trigger, and a port the step does not have', () => {
    expect(connectProblem(sample(), 'a', 'next', 't')).toContain('trigger');
    expect(connectProblem(sample(), 'a', 'yes', 'c')).not.toBeNull();
    expect(connectProblem(sample(), 'e', 'next', 'c')).not.toBeNull();
  });

  it('lets two paths meet at the same step, which the list could only do in one shape', () => {
    const nodes = [
      node('t', K.Trigger, { next: 'c' }),
      node('c', K.Condition, { yes: 'a' }),
      node('a', K.SendSessionMessage),
      node('b', K.SendSessionMessage),
      node('e', K.End),
    ];
    const joined = ok(
      connect(ok(connect(ok(connect(nodes, 'c', 'no', 'b')), 'a', 'next', 'e')), 'b', 'next', 'e'),
    );
    expect(joined.filter((n) => n.next === 'e').length).toBe(2);
  });

  it('disconnects one way out and leaves the others', () => {
    const nodes = [
      node('c', K.Condition, { yes: 'a', no: 'b' }),
      node('a', K.Wait),
      node('b', K.Wait),
    ];
    const cut = disconnect(nodes, 'c', 'yes');
    expect(cut[0].yes).toBeNull();
    expect(cut[0].no).toBe('b');
  });

  it('deletes a step and every link that pointed at it, but never the trigger or End', () => {
    const r = removeNode(sample(), 'b');
    if ('error' in r) throw new Error(r.error);
    expect(r.nodes.map((n) => n.id)).toEqual(['t', 'a', 'c', 'e']);
    expect(r.nodes.find((n) => n.id === 'a')!.next).toBeNull();

    expect('error' in removeNode(sample(), 't')).toBe(true);
    expect('error' in removeNode(sample(), 'e')).toBe(true);
  });

  it('snaps a moved step to the grid and never off the top or left edge', () => {
    const moved = moveNode(sample(), 'a', 37, -20);
    const a = moved.find((n) => n.id === 'a')!;
    expect(a.x).toBe(32);
    expect(a.y).toBe(0);
  });

  it('finds steps the trigger never reaches', () => {
    expect(unreachable(sample())).toEqual(['c']);
  });

  it('round-trips through what the API stores, dropping links to steps that are not there', () => {
    const dtos = toDtos(sample());
    const back = fromDtos([
      ...dtos,
      { id: 'x', kind: K.Wait, nextNodeId: 'gone', configJson: '{"minutes":5}' },
    ]);
    expect(back.find((n) => n.id === 'a')!.next).toBe('b');
    const x = back.find((n) => n.id === 'x')!;
    expect(x.next).toBeNull();
    expect(x.config).toEqual({ minutes: 5 });
  });

  it('adds the trigger and End to a brand-new automation', () => {
    let i = 0;
    const nodes = fromDtos([], () => `n${++i}`);
    expect(nodes.map((n) => n.kind)).toEqual([K.Trigger, K.End]);
  });

  it('lays out a graph saved in one column, top to bottom, with the two arms of a branch side by side', () => {
    const nodes = [
      node('t', K.Trigger, { next: 'c' }),
      node('c', K.Condition, { yes: 'a', no: 'b', y: 120 }),
      node('a', K.Wait, { y: 240 }),
      node('b', K.Wait, { y: 360 }),
      node('e', K.End, { y: 480 }),
    ];
    expect(needsLayout(nodes)).toBe(true);

    const laid = tidy(nodes);
    const at = (id: string) => laid.find((n) => n.id === id)!;
    expect(at('c').y).toBeGreaterThan(at('t').y);
    expect(at('a').y).toBe(at('b').y);
    expect(at('a').x).toBeLessThan(at('b').x);
    expect(needsLayout(laid)).toBe(false);
  });

  it('places a new step below what leads into it and leaves placed steps alone', () => {
    const nodes = [
      node('t', K.Trigger, { next: 'a', x: 96, y: 32 }),
      node('a', K.Wait, { next: 'n', x: 96, y: 160 }),
      node('n', K.SendSessionMessage),
    ];
    const placed = placeNew(nodes, new Set(['n']));
    expect(placed[1]).toEqual(nodes[1]);
    const n = placed.find((x) => x.id === 'n')!;
    expect(n.x).toBe(96);
    expect(n.y).toBeGreaterThanOrEqual(160 + NODE_H);
  });

  it('undo brings back the structure but keeps text typed since', () => {
    const before = sample();
    const after = moveNode(before, 'a', 400, 400).map((n) =>
      n.id === 'a' ? { ...n, config: { text: 'typed later' } } : n,
    );
    const restored = restoreStructure(before, after);
    const a = restored.find((n) => n.id === 'a')!;
    expect(a.x).toBe(0);
    expect(a.config).toEqual({ text: 'typed later' });
  });

  it('a canvas graph in the list’s shape reads back into the step list with its ids and places', () => {
    const nodes = [
      node('t', K.Trigger, { next: 'a' }),
      node('a', K.SendSessionMessage, { next: 'e', x: 48, y: 160 }),
      node('e', K.End),
    ];
    const parsed = graphToSteps(toDtos(nodes) as AutomationNodeDto[]);
    expect(parsed.representable).toBe(true);
    expect(parsed.steps[0].nodeId).toBe('a');
    expect(parsed.steps[0].x).toBe(48);
  });
});
