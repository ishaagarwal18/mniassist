import type {
  WhatsAppIvrLookup,
  WhatsAppIvrOptionDto,
  WhatsAppIvrOptionInput,
  WhatsAppIvrOptionKind,
} from '../../proxy/messaging/whats-app-call.service';

/**
 * The call menu as the dialog edits it: a tree of options, each a key, a label and what pressing it does (ring a team, open a
 * sub-menu, read out a lookup). Rows are addressed by their path of indexes ([2, 1] is the second option under the third).
 * The server checks the same rules (IvrMenuTree.Problem); these say what is wrong before Save is pressed.
 */
export interface IvrRow {
  digit: string;
  label: string;
  teamId: string;
  kind: WhatsAppIvrOptionKind;
  lookup: WhatsAppIvrLookup | '';
  say: string;
  options: IvrRow[];
}

export const IVR_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '*', '#'];
export const MAX_IVR_LEVELS = 3;
const MAX_OPTIONS = 9;

export function toIvrRows(options: WhatsAppIvrOptionDto[] | null | undefined): IvrRow[] {
  return (options ?? []).map((o) => ({
    digit: o.digit,
    label: o.label,
    teamId: o.teamId && o.teamId !== EMPTY_GUID ? o.teamId : '',
    kind: o.kind ?? 'RingTeam',
    lookup: o.lookup ?? '',
    say: o.say ?? '',
    options: toIvrRows(o.options),
  }));
}

export function toIvrInput(rows: IvrRow[]): WhatsAppIvrOptionInput[] {
  return rows.map((r) => ({
    digit: r.digit,
    label: r.label.trim(),
    teamId: r.kind === 'SubMenu' || !r.teamId ? EMPTY_GUID : r.teamId,
    kind: r.kind,
    lookup: r.kind === 'Lookup' && r.lookup ? r.lookup : null,
    say: r.say.trim() || null,
    options: r.kind === 'SubMenu' ? toIvrInput(r.options) : [],
  }));
}

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

/** Applies change to the row at path; every other row is kept as it is. */
export function updateIvrRow(
  rows: IvrRow[],
  path: number[],
  change: (row: IvrRow) => IvrRow,
): IvrRow[] {
  const [head, ...rest] = path;
  return rows.map((r, i) =>
    i !== head
      ? r
      : rest.length === 0
        ? change(r)
        : { ...r, options: updateIvrRow(r.options, rest, change) },
  );
}

export function removeIvrRow(rows: IvrRow[], path: number[]): IvrRow[] {
  const [head, ...rest] = path;
  return rest.length === 0
    ? rows.filter((_, i) => i !== head)
    : rows.map((r, i) => (i === head ? { ...r, options: removeIvrRow(r.options, rest) } : r));
}

/** Adds a blank option under the sub-menu at parent ([] for the top menu), on the first key that level doesn't use yet. */
export function addIvrRow(rows: IvrRow[], parent: number[]): IvrRow[] {
  const blank = (level: IvrRow[]): IvrRow => {
    const used = new Set(level.map((r) => r.digit));
    const digit = IVR_KEYS.find((k) => !used.has(k)) ?? '1';
    return { digit, label: '', teamId: '', kind: 'RingTeam', lookup: '', say: '', options: [] };
  };
  if (parent.length === 0) return [...rows, blank(rows)];
  return updateIvrRow(rows, parent, (r) => ({ ...r, options: [...r.options, blank(r.options)] }));
}

/** What is wrong with the menu, in words for the person editing it; null when it can be saved. */
export function ivrMenuProblem(
  rows: IvrRow[],
  maxLevels = MAX_IVR_LEVELS,
  enabled = false,
): string | null {
  if (enabled && rows.length === 0) return 'Add at least one option before switching the menu on.';
  const check = (level: IvrRow[], where: string, depth: number): string | null => {
    if (level.length > MAX_OPTIONS) return `${where} has more than ${MAX_OPTIONS} options.`;
    if (new Set(level.map((r) => r.digit)).size !== level.length) {
      return `${where} uses a key twice: each option needs its own key.`;
    }
    for (const r of level) {
      const name = r.label.trim() ? `key ${r.digit} (${r.label.trim()})` : `key ${r.digit}`;
      if (!r.label.trim()) return `${where}, ${name}: give the option a label.`;
      if (r.kind === 'SubMenu') {
        if (depth >= maxLevels)
          return `${where}, ${name}: a menu can be at most ${maxLevels} levels deep.`;
        if (r.options.length === 0) return `${where}, ${name}: add the options of this sub-menu.`;
        const inner = check(r.options, `The ${r.label.trim()} menu`, depth + 1);
        if (inner) return inner;
        continue;
      }
      if (r.kind === 'Lookup' && !r.lookup)
        return `${where}, ${name}: choose what the caller can look up.`;
      if (!r.teamId) return `${where}, ${name}: choose the team the call rings.`;
    }
    return null;
  };
  return check(rows, 'The main menu', 1);
}
