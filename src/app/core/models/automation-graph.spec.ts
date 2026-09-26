import { AutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind } from '../../proxy/messaging';
import {
  BuilderStep,
  anchorsOf,
  appendStep,
  graphToSteps,
  moveStep,
  removeStep,
  setRejoin,
  stepsToGraph,
  updateStep,
} from './automation-graph';

const K = AutomationNodeKind;

let n = 0;
const sequentialIds = () => `id-${++n}`;

const step = (
  kind: AutomationNodeKind,
  config: Record<string, unknown> = {},
  otherwise?: BuilderStep[],
): BuilderStep => ({
  localId: `t${++n}`,
  kind,
  config,
  otherwise,
});

/** Strips volatile fields so a tree can be compared with one read back from a graph. */
const shape = (steps: BuilderStep[]): unknown =>
  steps.map((s) => ({
    kind: s.kind,
    config: s.config,
    otherwise: s.otherwise ? shape(s.otherwise) : undefined,
  }));

describe('automation step tree ↔ node graph', () => {
  beforeEach(() => (n = 0));

  it('round-trips a straight chain', () => {
    const tree = [
      step(K.SendSessionMessage, { text: 'hi' }),
      step(K.Wait, { minutes: 30 }),
      step(K.AssignAgent, { userId: 'u1' }),
    ];

    const parsed = graphToSteps(stepsToGraph(tree, sequentialIds) as AutomationNodeDto[]);

    expect(parsed.representable).toBe(true);
    expect(shape(parsed.steps)).toEqual(shape(tree));
  });

  it('round-trips a condition with an otherwise branch, keeping the true path in the main list', () => {
    const tree = [
      step(K.Condition, { field: 'contact.city', operator: 'equals', value: 'Pune' }, [
        step(K.SendSessionMessage, { text: 'not in Pune' }),
      ]),
      step(K.SendSessionMessage, { text: 'in Pune' }),
    ];

    const parsed = graphToSteps(stepsToGraph(tree, sequentialIds) as AutomationNodeDto[]);

    expect(parsed.representable).toBe(true);
    expect(shape(parsed.steps)).toEqual(shape(tree));
  });

  it('nests branches inside branches', () => {
    const tree = [
      step(K.WaitForReply, { hours: 48 }, [
        step(K.SendSessionMessage, { text: 'nudge' }),
        step(K.WaitForReply, { hours: 24 }, [step(K.AssignAgent, { userId: 'u1' })]),
      ]),
      step(K.CreateEnquiry, { subject: 'replied' }),
    ];

    const parsed = graphToSteps(stepsToGraph(tree, sequentialIds) as AutomationNodeDto[]);

    expect(parsed.representable).toBe(true);
    expect(shape(parsed.steps)).toEqual(shape(tree));
  });

  it('points an empty otherwise at End, which is what a bare condition has always meant', () => {
    const nodes = stepsToGraph(
      [step(K.Condition, { field: 'contact.city', operator: 'isNotEmpty' })],
      sequentialIds,
    );
    const condition = nodes.find((x) => x.kind === K.Condition)!;
    const end = nodes.find((x) => x.kind === K.End)!;

    expect(condition.falseNodeId).toBe(end.id);
    expect(condition.trueNodeId).toBe(end.id);
  });

  it('reads paths that meet again as a rejoining branch', () => {
    const nodes: AutomationNodeDto[] = [
      { id: 't', kind: K.Trigger, nextNodeId: 'c' },
      { id: 'c', kind: K.Condition, trueNodeId: 'a', falseNodeId: 'b', configJson: '{}' },
      { id: 'a', kind: K.SendSessionMessage, nextNodeId: 'shared', configJson: '{}' },
      { id: 'b', kind: K.SendSessionMessage, nextNodeId: 'shared', configJson: '{}' },
      { id: 'shared', kind: K.AssignAgent, nextNodeId: 'e', configJson: '{}' },
      { id: 'e', kind: K.End },
    ] as AutomationNodeDto[];

    const parsed = graphToSteps(nodes);

    expect(parsed.representable).toBe(true);
    expect(parsed.steps.map((s) => s.kind)).toEqual([K.Condition, K.AssignAgent]);
    expect(parsed.steps[0].rejoin).toBe(true);
    expect(parsed.steps[0].then!.length).toBe(1);
    expect(parsed.steps[0].otherwise!.length).toBe(1);
  });

  it('round-trips a rejoining branch, an empty side, and one nested inside another', () => {
    const inner = step(K.Condition, { field: 'contact.role' }, [step(K.Wait, { minutes: 5 })]);
    inner.rejoin = true;
    inner.then = [];
    const outer = step(K.WaitForReply, { hours: 24 }, [
      step(K.SendSessionMessage, { text: 'nudge' }),
    ]);
    outer.rejoin = true;
    outer.then = [step(K.SendSessionMessage, { text: 'thanks' }), inner];
    const tree = [outer, step(K.CreateEnquiry, { subject: 'either way' })];

    const nodes = stepsToGraph(tree, sequentialIds) as AutomationNodeDto[];
    const parsed = graphToSteps(nodes);

    expect(parsed.representable).toBe(true);
    const full = (steps: BuilderStep[]): unknown =>
      steps.map((s) => ({
        kind: s.kind,
        config: s.config,
        rejoin: !!s.rejoin,
        then: s.then ? full(s.then) : undefined,
        otherwise: s.otherwise ? full(s.otherwise) : undefined,
      }));
    expect(full(parsed.steps)).toEqual(full(tree));

    // Both sides of the outer branch reach the enquiry; nothing else does.
    const enquiry = nodes.find((x) => x.kind === K.CreateEnquiry)!;
    const into = nodes.filter((x) =>
      [x.nextNodeId, x.trueNodeId, x.falseNodeId].includes(enquiry.id),
    );
    expect(into.length).toBeGreaterThanOrEqual(2);
  });

  it('a rejoin with both sides empty points straight at the next step', () => {
    const c = step(K.Condition, {});
    c.rejoin = true;
    c.then = [];
    const nodes = stepsToGraph([c, step(K.Wait, { minutes: 1 })], sequentialIds);
    const cond = nodes.find((x) => x.kind === K.Condition)!;
    const wait = nodes.find((x) => x.kind === K.Wait)!;

    expect(cond.trueNodeId).toBe(wait.id);
    expect(cond.falseNodeId).toBe(wait.id);
  });

  it('refuses a graph whose paths cross without a clean rejoin, rather than flattening it', () => {
    // b's true side jumps back into a's branch — a loop of sorts the list cannot show.
    const nodes: AutomationNodeDto[] = [
      { id: 't', kind: K.Trigger, nextNodeId: 'c' },
      { id: 'c', kind: K.Condition, trueNodeId: 'a', falseNodeId: 'b', configJson: '{}' },
      { id: 'a', kind: K.SendSessionMessage, nextNodeId: 'b', configJson: '{}' },
      { id: 'b', kind: K.Condition, trueNodeId: 'a', falseNodeId: 'e', configJson: '{}' },
      { id: 'e', kind: K.End },
    ] as AutomationNodeDto[];

    expect(graphToSteps(nodes).representable).toBe(false);
  });

  it('turns rejoining on and off without losing the true path', () => {
    const c = step(K.Condition, {}, []);
    const list = [c, step(K.Wait, { minutes: 1 })];

    const on = setRejoin(list, c.localId, true);
    expect(on[0].rejoin).toBe(true);
    expect(on[0].then).toEqual([]);

    const withThen = updateStep(on, c.localId, (s) => ({ ...s, then: [step(K.AssignAgent, {})] }));
    const off = setRejoin(withThen, c.localId, false);
    expect(off.map((s) => s.kind)).toEqual([K.Condition, K.AssignAgent, K.Wait]);
    expect(off[0].rejoin).toBe(false);
  });

  it('refuses a graph with steps the trigger cannot reach — they would vanish on save', () => {
    const nodes = [
      { id: 't', kind: K.Trigger, nextNodeId: 'a' },
      { id: 'a', kind: K.SendSessionMessage, nextNodeId: 'e', configJson: '{}' },
      { id: 'orphan', kind: K.Wait, nextNodeId: 'e', configJson: '{}' },
      { id: 'e', kind: K.End },
    ] as AutomationNodeDto[];

    expect(graphToSteps(nodes).representable).toBe(false);
  });

  it('keeps stored node ids, places and the trigger/End, so a save updates the graph rather than replacing it', () => {
    const stored = [
      { id: 't', kind: K.Trigger, nextNodeId: 'a', positionX: 16, positionY: 0 },
      {
        id: 'a',
        kind: K.SendSessionMessage,
        nextNodeId: 'e',
        configJson: '{"text":"hi"}',
        positionX: 64,
        positionY: 160,
      },
      { id: 'e', kind: K.End, positionX: 16, positionY: 320 },
    ] as AutomationNodeDto[];

    const parsed = graphToSteps(stored);
    const saved = stepsToGraph(parsed.steps, sequentialIds, anchorsOf(stored));

    expect(saved.map((x) => x.id)).toEqual(['t', 'a', 'e']);
    expect(saved.find((x) => x.id === 'a')).toMatchObject({
      positionX: 64,
      positionY: 160,
      nextNodeId: 'e',
    });
    expect(saved.find((x) => x.id === 'e')).toMatchObject({ positionX: 16, positionY: 320 });
  });

  it('gives a step added in the list a fresh id alongside the kept ones', () => {
    const stored = [
      { id: 't', kind: K.Trigger, nextNodeId: 'a' },
      { id: 'a', kind: K.Wait, nextNodeId: 'e', configJson: '{}' },
      { id: 'e', kind: K.End },
    ] as AutomationNodeDto[];
    const parsed = graphToSteps(stored);

    const saved = stepsToGraph(
      [...parsed.steps, step(K.AssignAgent)],
      sequentialIds,
      anchorsOf(stored),
    );

    const assign = saved.find((x) => x.kind === K.AssignAgent)!;
    expect(assign.id).toMatch(/^id-/);
    expect(saved.find((x) => x.id === 'a')!.nextNodeId).toBe(assign.id);
  });

  it('refuses a loop instead of following it forever', () => {
    const nodes = [
      { id: 't', kind: K.Trigger, nextNodeId: 'a' },
      { id: 'a', kind: K.SendSessionMessage, nextNodeId: 'b', configJson: '{}' },
      { id: 'b', kind: K.Wait, nextNodeId: 'a', configJson: '{}' },
    ] as AutomationNodeDto[];

    expect(graphToSteps(nodes).representable).toBe(false);
  });
});

describe('editing the step tree', () => {
  beforeEach(() => (n = 0));

  const tree = (): BuilderStep[] => [
    step(K.Condition, {}, [step(K.SendSessionMessage, { text: 'inner' })]),
    step(K.Wait, { minutes: 5 }),
  ];

  it('updates a step nested in an otherwise branch', () => {
    const t = tree();
    const next = updateStep(t, t[0].otherwise![0].localId, (s) => ({
      ...s,
      config: { text: 'changed' },
    }));

    expect(next[0].otherwise![0].config).toEqual({ text: 'changed' });
    expect(t[0].otherwise![0].config).toEqual({ text: 'inner' }); // the original is untouched
  });

  it('appends to the top level, or into a branch', () => {
    const t = tree();
    const added = step(K.Wait, { minutes: 1 });

    expect(appendStep(t, null, added).length).toBe(3);
    expect(appendStep(t, t[0].localId, added)[0].otherwise!.length).toBe(2);
  });

  it('removes a nested step without disturbing its parent', () => {
    const t = tree();
    const next = removeStep(t, t[0].otherwise![0].localId);

    expect(next.length).toBe(2);
    expect(next[0].otherwise).toEqual([]);
  });

  it('moves a step only within its own list', () => {
    const t = tree();

    expect(moveStep(t, t[1].localId, -1).map((s) => s.kind)).toEqual([K.Wait, K.Condition]);
    // The only step in its branch cannot move up or down.
    expect(moveStep(t, t[0].otherwise![0].localId, 1)[0].otherwise!.length).toBe(1);
  });
});
