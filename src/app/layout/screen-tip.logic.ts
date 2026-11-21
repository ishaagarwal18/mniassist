import { HelpTopic } from '../core/help/help-topics';

/**
 * First-visit tips: the first time someone opens a screen, a small card says what it is for and
 * the first steps, from the screen's own help topic. Seen and switched-off state is per person,
 * per browser.
 */
export interface TipState {
  readonly off: boolean;
  readonly seen: readonly string[];
}

const EMPTY: TipState = { off: false, seen: [] };

export function tipKey(userId: string | null): string {
  return `ar.screenTips.${userId ?? 'me'}`;
}

export function readTips(userId: string | null): TipState {
  try {
    const raw = localStorage.getItem(tipKey(userId));
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (!v || typeof v !== 'object') return EMPTY;
    const o = v as { off?: unknown; seen?: unknown };
    return {
      off: o.off === true,
      seen: Array.isArray(o.seen) ? o.seen.filter((s): s is string => typeof s === 'string') : [],
    };
  } catch {
    return EMPTY;
  }
}

export function writeTips(userId: string | null, state: TipState): void {
  try {
    localStorage.setItem(tipKey(userId), JSON.stringify(state));
  } catch {
    /* storage blocked: the tip will just show again next visit */
  }
}

/** Screens with their own guidance, where a tip would repeat it. */
const NO_TIP_ROUTES = new Set(['getting-started', 'home', 'notifications']);

/**
 * One id per help topic, so a list and its form pages (which share a topic) count as one screen:
 * the first step's text is stable and unique enough.
 */
export function topicId(topic: HelpTopic): string | null {
  return topic.steps[0] ?? null;
}

export interface ScreenTip {
  readonly id: string;
  readonly summary: string | null;
  readonly steps: readonly string[];
}

/** The tip to show on this screen now, or null. */
export function tipFor(
  routePath: string | null,
  topic: HelpTopic | null,
  summary: string | null,
  state: TipState,
): ScreenTip | null {
  if (state.off || !routePath || NO_TIP_ROUTES.has(routePath) || !topic) return null;
  const id = topicId(topic);
  if (!id || state.seen.includes(id)) return null;
  return { id, summary, steps: topic.steps.slice(0, 3) };
}
