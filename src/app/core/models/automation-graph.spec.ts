import { AutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind } from '../../proxy/messaging';
import {
  BuilderStep,
  appendStep,
  graphToSteps,
  moveStep,
  removeStep,
  stepsToGraph,
  updateStep,
} from './automation-graph';

const K = AutomationNodeKind;

let n = 0;
const sequentialIds = () => `id-${++n}`;

const step = (kind: AutomationNodeKind, config: Record<string, unknown> = {}, otherwise?: BuilderStep[]): BuilderStep => ({
  localId: `t${++n}`,
  kind,
  config,
  otherwise,
});

/** Strips volatile fields so a tree can be compared with one read back from a graph. */
const shape = (steps: BuilderStep[]): unknown =>
  steps.map((s) => ({ kind: s.kind, config: s.config, otherwise: s.otherwise ? shape(s.otherwise) : undefined }));

describe('automation step tree ↔ node graph', () => {
  beforeEach(() => (n = 0));

  it('round-trips a straight chain', () => {
    const tree = [step(K.SendSessionMessage, { text: 'hi' }), step(K.Wait, { minutes: 30 }), step(K.AssignAgent, { userId: 'u1' })];

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
    const nodes = stepsToGraph([step(K.Condition, { field: 'contact.city', operator: 'isNotEmpty' })], sequentialIds);
    const condition = nodes.find((x) => x.kind === K.Condition)!;
    const end = nodes.find((x) => x.kind === K.End)!;

    expect(condition.falseNodeId).toBe(end.id);
    expect(condition.trueNodeId).toBe(end.id);
  });

  it('refuses to represent a graph whose paths rejoin, rather than flattening it', () => {
    const nodes: AutomationNodeDto[] = [
      { id: 't', kind: K.Trigger, nextNodeId: 'c' },
      { id: 'c', kind: K.Condition, trueNodeId: 'a', falseNodeId: 'b', configJson: '{}' },
      { id: 'a', kind: K.SendSessionMessage, nextNodeId: 'shared', configJson: '{}' },
      { id: 'b', kind: K.SendSessionMessage, nextNodeId: 'shared', configJson: '{}' },
      { id: 'shared', kind: K.AssignAgent, nextNodeId: 'e', configJson: '{}' },
      { id: 'e', kind: K.End },
    ] as AutomationNodeDto[];

    const parsed = graphToSteps(nodes);

    expect(parsed.representable).toBe(false);
    expect(parsed.reason).toContain('same step');
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
    const next = updateStep(t, t[0].otherwise![0].localId, (s) => ({ ...s, config: { text: 'changed' } }));

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
