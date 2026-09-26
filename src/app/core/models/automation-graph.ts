import { AutomationNodeDto, CreateUpdateAutomationNodeDto } from '../../proxy/automation';
import { AutomationNodeKind } from '../../proxy/messaging';

/**
 * The automation step list (M07-2) as a tree, and its round trip to the node graph the
 * API stores.
 *
 * The engine gives a node at most two outputs, and only two kinds use both: a
 * <b>Condition</b> (matches → true, otherwise → false) and a <b>WaitForReply</b> (reply →
 * true, deadline passes → false). So the list reads top to bottom, and those two steps
 * carry one extra list — {@link BuilderStep.otherwise} — that runs when the step does not
 * go the "true" way. The steps after such a step in its own list are the "true" path.
 * By default nothing rejoins: an otherwise path runs to its end and the journey stops
 * there, exactly as an empty one always did. A branching step can instead be set to
 * <b>rejoin</b>: its "true" path then lives in {@link BuilderStep.then}, and when both
 * that and the otherwise list run out they continue together with the steps that follow
 * the branching step.
 *
 * That is deliberately less than a general graph. The point of doing it as a list is that
 * it stays readable, and it can be shown honestly only if a saved graph that does NOT fit
 * (steps that rejoin, loops, orphans) is recognised and left untouched rather than
 * silently flattened — see {@link graphToSteps}.
 */
export interface BuilderStep {
  localId: string;
  kind: AutomationNodeKind;
  config: Record<string, unknown>;
  /** Only on a branching step: what runs when it does not go the "true" way. */
  otherwise?: BuilderStep[];
  /** Only on a branching step with {@link rejoin}: the steps that run when it goes the "true" way. */
  then?: BuilderStep[];
  /** Both paths continue with the steps after this one, rather than the true path being that list. */
  rejoin?: boolean;
  entered?: number;
  exited?: number;
  /** The stored node this step was read from, kept so a save updates it rather than replacing it. */
  nodeId?: string;
  /** Where the step sits on the canvas, when it has been placed there. */
  x?: number;
  y?: number;
}

/** The trigger and End nodes, which the step list does not show but a save must keep. */
export interface GraphAnchors {
  trigger?: { id: string; x: number; y: number };
  end?: { id: string; x: number; y: number };
}

export const isBranching = (kind: AutomationNodeKind): boolean =>
  kind === AutomationNodeKind.Condition || kind === AutomationNodeKind.WaitForReply;

export interface ParsedGraph {
  steps: BuilderStep[];
  /**
   * False when the stored graph has a shape the step list cannot represent. Saving from
   * the list would then rewrite it into something different, so the caller must not
   * allow that.
   */
  representable: boolean;
  reason?: string;
}

let counter = 0;
export const nextLocalId = (): string => `s${++counter}`;

function parseConfig(json: string | null | undefined): Record<string, unknown> {
  try {
    const value = json ? JSON.parse(json) : {};
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Reads a stored node graph into the step tree. */
export function graphToSteps(nodes: readonly AutomationNodeDto[]): ParsedGraph {
  const byId = new Map(nodes.map((n) => [n.id!, n]));
  const trigger = nodes.find((n) => n.kind === AutomationNodeKind.Trigger);
  const visited = new Set<string>();
  let reason: string | undefined;

  const links = (n: AutomationNodeDto): string[] =>
    [n.nextNodeId, n.trueNodeId, n.falseNodeId].filter((x): x is string => !!x && byId.has(x));

  /** Every node reachable from `start`, End excluded, in breadth-first order. */
  const reachable = (start: string | null | undefined): string[] => {
    const order: string[] = [];
    const seen = new Set<string>();
    const queue = start && byId.has(start) ? [start] : [];
    while (queue.length) {
      const id = queue.shift()!;
      if (seen.has(id) || byId.get(id)!.kind === AutomationNodeKind.End) continue;
      seen.add(id);
      order.push(id);
      queue.push(...links(byId.get(id)!));
    }
    return order;
  };

  /** The first node both paths of a branch arrive at — where they rejoin — if any. */
  const mergePoint = (node: AutomationNodeDto): string | undefined => {
    const onTrue = new Set(reachable(node.trueNodeId));
    return reachable(node.falseNodeId).find((id) => onTrue.has(id));
  };

  // `stop` is the node an enclosing rejoin continues at: a walk ends when it gets there
  // and the enclosing step picks it up from there.
  const walk = (startId: string | null | undefined, stop?: string): BuilderStep[] => {
    const out: BuilderStep[] = [];
    let cursor = startId ?? null;

    while (cursor && byId.has(cursor) && cursor !== stop) {
      const node = byId.get(cursor)!;
      if (node.kind === AutomationNodeKind.End) break;

      if (visited.has(cursor)) {
        reason ??= 'two paths lead to the same step in a way the list cannot show (a loop, or paths that cross)';
        break;
      }
      visited.add(cursor);

      const kind = node.kind ?? AutomationNodeKind.SendSessionMessage;
      const step: BuilderStep = {
        localId: nextLocalId(),
        kind,
        config: parseConfig(node.configJson),
        entered: node.enteredCount,
        exited: node.exitedCount,
        nodeId: node.id,
        x: node.positionX,
        y: node.positionY,
      };

      if (isBranching(kind)) {
        if (node.nextNodeId) {
          reason ??= 'a branching step also has a plain "next" link';
        }
        const merge = mergePoint(node);
        if (merge) {
          step.rejoin = true;
          step.then = walk(node.trueNodeId, merge);
          step.otherwise = walk(node.falseNodeId, merge);
          out.push(step);
          cursor = merge;
        } else {
          // Without a rejoin the otherwise path ends the journey. If it reaches the enclosing
          // rejoin point it is not doing that, so it is walked unbounded and flagged below.
          step.otherwise = walk(node.falseNodeId);
          out.push(step);
          cursor = node.trueNodeId ?? null;
        }
      } else {
        if (node.trueNodeId || node.falseNodeId) {
          reason ??= 'a non-branching step has true/false links';
        }
        out.push(step);
        cursor = node.nextNodeId ?? null;
      }
    }

    return out;
  };

  const steps = walk(trigger?.nextNodeId);

  // Anything the walk never reached would vanish on the next save.
  const expected = nodes.filter(
    (n) => n.kind !== AutomationNodeKind.Trigger && n.kind !== AutomationNodeKind.End,
  ).length;
  if (visited.size !== expected) {
    reason ??= 'some steps are not reachable from the trigger';
  }

  return { steps, representable: reason === undefined, reason };
}

/**
 * Flattens the step tree into Trigger → … → End with real ids and links. Every path that
 * runs out of steps points at the one End node.
 */
export function stepsToGraph(
  steps: readonly BuilderStep[],
  newId: () => string = () => crypto.randomUUID(),
  anchors: GraphAnchors = {},
): CreateUpdateAutomationNodeDto[] {
  const triggerId = anchors.trigger?.id ?? newId();
  const endId = anchors.end?.id ?? newId();
  const nodes: CreateUpdateAutomationNodeDto[] = [];
  let row = 1;

  // Emits one list and returns the id of its first node. `after` is where the list's last
  // step goes: End for a path that simply stops, or the point a rejoin continues at.
  const emit = (list: readonly BuilderStep[], after: string): string => {
    const ids = list.map((s) => s.nodeId ?? newId());

    list.forEach((step, i) => {
      const next = ids[i + 1] ?? after;
      const placeholderY = row++ * 120;
      const node: CreateUpdateAutomationNodeDto = {
        id: ids[i],
        kind: step.kind,
        configJson: JSON.stringify(step.config),
        positionX: step.x ?? 0,
        positionY: step.y ?? placeholderY,
      };

      if (isBranching(step.kind)) {
        if (step.rejoin) {
          node.trueNodeId = step.then?.length ? emit(step.then, next) : next;
          node.falseNodeId = step.otherwise?.length ? emit(step.otherwise, next) : next;
        } else {
          node.trueNodeId = next;
          node.falseNodeId = step.otherwise?.length ? emit(step.otherwise, endId) : endId;
        }
      } else {
        node.nextNodeId = next;
      }

      nodes.push(node);
    });

    return ids[0] ?? after;
  };

  const first = emit(steps, endId);

  return [
    {
      id: triggerId, kind: AutomationNodeKind.Trigger, configJson: '{}', nextNodeId: first,
      positionX: anchors.trigger?.x ?? 0, positionY: anchors.trigger?.y ?? 0,
    },
    ...nodes,
    { id: endId, kind: AutomationNodeKind.End, configJson: '{}', positionX: anchors.end?.x ?? 0, positionY: anchors.end?.y ?? row * 120 },
  ];
}

/** The trigger and End of a stored graph, so a save from the step list keeps them. */
export function anchorsOf(nodes: readonly { id?: string; kind?: AutomationNodeKind; positionX?: number; positionY?: number }[]): GraphAnchors {
  const pick = (kind: AutomationNodeKind) => {
    const n = nodes.find((x) => x.kind === kind && x.id);
    return n ? { id: n.id!, x: n.positionX ?? 0, y: n.positionY ?? 0 } : undefined;
  };
  return { trigger: pick(AutomationNodeKind.Trigger), end: pick(AutomationNodeKind.End) };
}

// ---- Editing the tree -----------------------------------------------------

/** Replaces the list that contains the step `id`, wherever it is in the tree. */
function transform(
  list: BuilderStep[],
  id: string,
  fn: (siblings: BuilderStep[], index: number) => BuilderStep[],
): BuilderStep[] {
  const index = list.findIndex((s) => s.localId === id);
  if (index >= 0) return fn(list, index);
  return list.map((s) => {
    if (!s.otherwise && !s.then) return s;
    return {
      ...s,
      ...(s.otherwise ? { otherwise: transform(s.otherwise, id, fn) } : {}),
      ...(s.then ? { then: transform(s.then, id, fn) } : {}),
    };
  });
}

export const updateStep = (
  list: BuilderStep[],
  id: string,
  patch: (step: BuilderStep) => BuilderStep,
): BuilderStep[] => transform(list, id, (l, i) => l.map((s, j) => (j === i ? patch(s) : s)));

export const removeStep = (list: BuilderStep[], id: string): BuilderStep[] =>
  transform(list, id, (l, i) => l.filter((_, j) => j !== i));

export const moveStep = (list: BuilderStep[], id: string, delta: -1 | 1): BuilderStep[] =>
  transform(list, id, (l, i) => {
    const to = i + delta;
    if (to < 0 || to >= l.length) return l;
    const copy = [...l];
    [copy[i], copy[to]] = [copy[to], copy[i]];
    return copy;
  });

export type BranchName = 'then' | 'otherwise';

/** Appends to the top-level list (owner null), or to a branch list of the step `owner`. */
export function appendStep(
  list: BuilderStep[],
  owner: string | null,
  step: BuilderStep,
  branch: BranchName = 'otherwise',
): BuilderStep[] {
  if (owner === null) return [...list, step];
  return updateStep(list, owner, (s) => ({ ...s, [branch]: [...(s[branch] ?? []), step] }));
}

/**
 * Turns rejoining on or off for a branching step. Turning it on moves nothing on the
 * screen's meaning of "after": the true path starts empty and the steps below the step
 * now run after both paths. Turning it off folds the true path back in front of them.
 * It is refused (list returned unchanged) while the otherwise path still has steps,
 * because without a rejoin that path would have to end the journey where it ends.
 */
export function setRejoin(list: BuilderStep[], id: string, on: boolean): BuilderStep[] {
  return transform(list, id, (siblings, i) => {
    const step = siblings[i];
    if (!!step.rejoin === on) return siblings;
    if (!on && step.otherwise?.length) return siblings;
    if (on) {
      return siblings.map((s, j) => (j === i ? { ...s, rejoin: true, then: s.then ?? [] } : s));
    }
    const copy = [...siblings];
    copy.splice(i, 1, { ...step, rejoin: false, then: undefined }, ...(step.then ?? []));
    return copy;
  });
}
