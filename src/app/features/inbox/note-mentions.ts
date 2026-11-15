/**
 * @mentions in an internal note. Picking a teammate from the list writes "@Name" into the note and remembers
 * their id; on send, only the people whose "@Name" is still in the text are mentioned (and notified).
 */

export interface MentionPerson {
  userId: string;
  name: string;
}

/** The word being typed after an "@" at the caret, or null when the caret is not in a mention. */
export function mentionQuery(text: string, caret: number): { start: number; query: string } | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  // The "@" starts a word, and nothing between it and the caret ends the mention.
  if (at > 0 && !/\s/.test(before[at - 1])) return null;
  const query = before.slice(at + 1);
  if (/[\n@]/.test(query) || query.length > 40) return null;
  return { start: at, query };
}

/** People whose name starts a word matching the query, best first, at most `max`. */
export function matchPeople(
  people: readonly MentionPerson[],
  query: string,
  max = 6,
): MentionPerson[] {
  const q = query.trim().toLowerCase();
  const scored = people
    .map((p) => {
      const name = p.name.toLowerCase();
      const score = !q
        ? 1
        : name.startsWith(q)
          ? 3
          : name.split(/\s+/).some((w) => w.startsWith(q))
            ? 2
            : name.includes(q)
              ? 1
              : 0;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name));
  return scored.slice(0, max).map((x) => x.p);
}

/** Replaces the "@query" being typed with "@Name ", returning the new text and caret. */
export function insertMention(
  text: string,
  start: number,
  caret: number,
  person: MentionPerson,
): { text: string; caret: number } {
  const inserted = `@${person.name} `;
  return {
    text: text.slice(0, start) + inserted + text.slice(caret),
    caret: start + inserted.length,
  };
}

/** The ids of picked people whose "@Name" is still in the note. */
export function mentionedIds(body: string, picked: readonly MentionPerson[]): string[] {
  const ids = new Set<string>();
  for (const p of picked) if (body.includes(`@${p.name}`)) ids.add(p.userId);
  return [...ids];
}
