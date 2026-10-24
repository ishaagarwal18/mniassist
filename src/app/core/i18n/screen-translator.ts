/**
 * Translates each screen's own text (headings, labels, buttons, help, empty states, toasts) as it is
 * rendered. Templates stay in English: this watches the page and replaces any text node or attribute
 * whose whole text is an entry in ABP's AutoReach UI resource, keeping the English so switching back
 * or to another language works from it.
 *
 * Only exact entries are touched, so customer data (names, messages, notes) is left alone unless it
 * happens to read exactly like a label. Containers of user content can opt out with the standard
 * `translate="no"` attribute, which browser translators respect too.
 *
 * Text with values in it ("Showing 5 of 20") matches entries written with placeholders
 * ("Showing {0} of {1}"), and the translation can put the values in its own order.
 */

/** English → translation, for one language. `{0}`… mark values. */
export type ScreenDictionary = ReadonlyMap<string, string>;

const ATTRIBUTES = ['placeholder', 'title', 'aria-label', 'alt'] as const;
/** Never translated: code, editable content, and anything marked translate="no". */
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'NOSCRIPT', 'svg']);

interface Kept {
  /** What the app last wrote: the English. */
  en: string;
  /** What we wrote over it, so our own change isn't taken for the app's. */
  out: string;
}

interface Pattern {
  regex: RegExp;
  /** Placeholder numbers in the order they appear in the English. */
  order: number[];
  translation: string;
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The dictionary's entries with placeholders, as patterns, indexed by their first literal word. */
function compilePatterns(dict: ScreenDictionary): {
  byWord: Map<string, Pattern[]>;
  open: Pattern[];
} {
  const byWord = new Map<string, Pattern[]>();
  const open: Pattern[] = [];
  for (const [en, translation] of dict) {
    if (!/\{\d+\}/.test(en)) continue;
    const order: number[] = [];
    const source = en
      .split(/(\{\d+\})/)
      .map((part) => {
        const m = /^\{(\d+)\}$/.exec(part);
        if (m) {
          order.push(+m[1]);
          return '(.+?)';
        }
        return escape(part);
      })
      .join('');
    const p: Pattern = { regex: new RegExp(`^${source}$`, 's'), order, translation };
    const first = /^[^{\s]+/.exec(en)?.[0];
    if (first) {
      const list = byWord.get(first) ?? [];
      list.push(p);
      byWord.set(first, list);
    } else {
      open.push(p);
    }
  }
  return { byWord, open };
}

export class ScreenTranslator {
  private dict: ScreenDictionary | null = null;
  private patterns: ReturnType<typeof compilePatterns> | null = null;
  private readonly texts = new WeakMap<Text, Kept>();
  private readonly attrs = new WeakMap<Element, Map<string, Kept>>();
  private observer: MutationObserver | null = null;

  constructor(private readonly root: Element) {}

  /** Translates the page into `dict`'s language, and keeps translating what renders next. */
  use(dict: ScreenDictionary): void {
    this.dict = dict;
    this.patterns = compilePatterns(dict);
    this.walk(this.root);
    this.observe();
  }

  /** Puts the English back everywhere and stops watching. */
  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.dict = null;
    this.patterns = null;
    this.walk(this.root);
  }

  /** The translation of one piece of text, or null when the dictionary has none. */
  translate(text: string): string | null {
    const dict = this.dict;
    if (!dict) return null;
    const key = norm(text);
    if (!key || !/[A-Za-z]/.test(key)) return null;
    const exact = dict.get(key);
    if (exact !== undefined) return exact;
    const p = this.patterns;
    if (!p) return null;
    const first = /^[^\s]+/.exec(key)?.[0] ?? '';
    for (const candidates of [
      p.byWord.get(first),
      p.byWord.get(first.replace(/[^A-Za-z]+$/, '')),
      p.open,
    ]) {
      for (const c of candidates ?? []) {
        const m = c.regex.exec(key);
        if (!m) continue;
        const values: Record<number, string> = {};
        c.order.forEach((n, i) => (values[n] = m[i + 1]));
        return c.translation.replace(/\{(\d+)\}/g, (all, n) => values[+n] ?? all);
      }
    }
    return null;
  }

  private observe(): void {
    if (this.observer || typeof MutationObserver === 'undefined') return;
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') this.text(r.target as Text);
        else if (r.type === 'attributes') this.attr(r.target as Element, r.attributeName!);
        else r.addedNodes.forEach((n) => this.walk(n));
      }
    });
    this.observer.observe(this.root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRIBUTES],
    });
  }

  private walk(node: Node): void {
    if (node.nodeType === Node.TEXT_NODE) {
      this.text(node as Text);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (this.skipped(el)) return;
    for (const a of ATTRIBUTES) if (el.hasAttribute(a)) this.attr(el, a);
    for (let c = el.firstChild; c; c = c.nextSibling) this.walk(c);
  }

  private skipped(el: Element | null): boolean {
    for (let e = el; e; e = e.parentElement) {
      if (
        SKIP_TAGS.has(e.tagName) ||
        e.getAttribute('translate') === 'no' ||
        (e as HTMLElement).isContentEditable
      )
        return true;
      if (e === this.root) return false;
    }
    return false;
  }

  private text(node: Text): void {
    const value = node.nodeValue ?? '';
    let kept = this.texts.get(node);
    if (kept && value === kept.out) {
      // Ours: unchanged since we wrote it. Re-derive from the English (the language may have changed).
    } else {
      if (!kept && !/[A-Za-z]/.test(value)) return;
      if (node.parentElement && this.skipped(node.parentElement)) return;
      kept = { en: value, out: value };
      this.texts.set(node, kept);
    }
    const t = this.translate(kept.en);
    const next = t === null ? kept.en : keepSpaces(kept.en, t);
    kept.out = next;
    if (node.nodeValue !== next) node.nodeValue = next;
  }

  private attr(el: Element, name: string): void {
    const value = el.getAttribute(name);
    if (value === null) return;
    let map = this.attrs.get(el);
    let kept = map?.get(name);
    if (!kept || value !== kept.out) {
      if (!/[A-Za-z]/.test(value)) return;
      kept = { en: value, out: value };
      map ??= new Map();
      map.set(name, kept);
      this.attrs.set(el, map);
    }
    const t = this.translate(kept.en);
    const next = t === null ? kept.en : t;
    kept.out = next;
    if (value !== next) el.setAttribute(name, next);
  }
}

/** The translation with the English's leading and trailing spaces, so it sits in the line the same way. */
function keepSpaces(en: string, translation: string): string {
  const lead = /^\s*/.exec(en)![0];
  const trail = /\s*$/.exec(en)![0];
  return lead + translation + (en.trim() ? trail : '');
}
