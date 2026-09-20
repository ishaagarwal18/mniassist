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
 * Nothing rejoins: an otherwise path runs to its end and the journey stops there, exactly
 * as an empty one always did.
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
  entered?: number;
  exited?: number;
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

  const walk = (startId: string | null | undefined): BuilderStep[] => {
    const out: BuilderStep[] = [];
    let cursor = startId ?? null;

    while (cursor && byId.has(cursor)) {
      const node = byId.get(cursor)!;
      if (node.kind === AutomationNodeKind.End) break;

      if (visited.has(cursor)) {
        reason ??= 'two paths lead to the same step (steps rejoin, or the journey loops)';
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
      };

      if (isBranching(kind)) {
        if (node.nextNodeId) {
          reason ??= 'a branching step also has a plain "next" link';
        }
        step.otherwise = walk(node.falseNodeId);
        out.push(step);
        cursor = node.trueNodeId ?? null;
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
): CreateUpdateAutomationNodeDto[] {
  const triggerId = newId();
  const endId = newId();
  const nodes: CreateUpdateAutomationNodeDto[] = [];
  let row = 1;

  // Emits one list and returns the id of its first node (or End when it is empty).
  const emit = (list: readonly BuilderStep[]): string => {
    const ids = list.map(() => newId());

    list.forEach((step, i) => {
      const next = ids[i + 1] ?? endId;
      const node: CreateUpdateAutomationNodeDto = {
        id: ids[i],
        kind: step.kind,
        configJson: JSON.stringify(step.config),
        positionX: 0,
        positionY: row++ * 120,
      };

      if (isBranching(step.kind)) {
        node.trueNodeId = next;
        node.falseNodeId = step.otherwise?.length ? emit(step.otherwise) : endId;
      } else {
        node.nextNodeId = next;
      }

      nodes.push(node);
    });

    return ids[0] ?? endId;
  };

  const first = emit(steps);

  return [
    { id: triggerId, kind: AutomationNodeKind.Trigger, configJson: '{}', nextNodeId: first, positionX: 0, positionY: 0 },
    ...nodes,
    { id: endId, kind: AutomationNodeKind.End, configJson: '{}', positionX: 0, positionY: row * 120 },
  ];
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
  return list.map((s) => (s.otherwise ? { ...s, otherwise: transform(s.otherwise, id, fn) } : s));
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

/** Appends to the top-level list, or to the otherwise list of the step `owner`. */
export function appendStep(list: BuilderStep[], owner: string | null, step: BuilderStep): BuilderStep[] {
  if (owner === null) return [...list, step];
  return updateStep(list, owner, (s) => ({ ...s, otherwise: [...(s.otherwise ?? []), step] }));
}
