import { AutomationNodeKind } from '../../proxy/messaging';
import { layoutFlowMap } from './automation-flow-map';
import { BuilderStep, stepsToGraph } from './automation-graph';

const K = AutomationNodeKind;
const s = (kind: AutomationNodeKind, extra: Partial<BuilderStep> = {}): BuilderStep => ({
  localId: Math.random().toString(),
  kind,
  config: {},
  ...extra,
});

describe('automation flow map', () => {
  it('draws a rejoin as two arrows arriving at one box, on a row below both sides', () => {
    let n = 0;
    const graph = stepsToGraph(
      [
        s(K.Condition, { rejoin: true, then: [s(K.SendSessionMessage)], otherwise: [s(K.SendSessionMessage)] }),
        s(K.AssignAgent),
      ],
      () => `n${++n}`,
    );
    const map = layoutFlowMap(graph, (x) => String(x.kind));

    const assign = graph.find((x) => x.kind === K.AssignAgent)!;
    const arrivals = graph.filter((x) => [x.nextNodeId, x.trueNodeId, x.falseNodeId].includes(assign.id));
    expect(arrivals.length).toBe(2);

    const y = (id: string) => map.nodes.find((m) => m.id === id)!.y;
    const sides = graph.filter((x) => x.kind === K.SendSessionMessage);
    expect(y(assign.id!)).toBeGreaterThan(Math.max(...sides.map((x) => y(x.id!))));
    expect(map.edges.length).toBe(map.nodes.length); // a chain of N nodes has N-1 edges; the branch adds one
  });
});
