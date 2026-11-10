import { signal } from '@angular/core';

/**
 * The names of fixed options (a ticket status, a lead source) as this workspace calls them: list key → value → name. Filled by
 * {@link PickListStore} from the database; empty until it loads, when the built-in names stand in.
 *
 * A module-level signal rather than a service, so the label maps used all over the app (`STATUS_LABEL[s]`) can stay plain lookups
 * in pure functions and templates and still update when the names arrive.
 */
const NAMES = signal<ReadonlyMap<string, ReadonlyMap<string, string>>>(new Map());

export function setOptionNames(names: ReadonlyMap<string, ReadonlyMap<string, string>>): void {
  NAMES.set(names);
}

/** The name of one option, or `fallback` while the lists have not loaded. */
export function optionName(key: string, value: string | number, fallback: string): string {
  return NAMES().get(key)?.get(String(value)) ?? fallback;
}

/**
 * A label map (`{ [TicketStatus.Open]: 'Open', … }`) whose names come from the database. Reads go through a signal, so a template
 * or computed that reads `MAP[value]` updates when a name is changed in Settings → Pick lists.
 */
export function optionNames<K extends string | number>(
  key: string,
  defaults: Record<K, string>,
): Readonly<Record<K, string>> {
  return new Proxy(defaults, {
    get(target, prop, receiver) {
      if (typeof prop !== 'string' || !(prop in target)) return Reflect.get(target, prop, receiver);
      return optionName(key, prop, (target as Record<string, string>)[prop]);
    },
  });
}

/** A list of options (`[{ value, label }]`) whose labels come from the database, in the order given. */
export function withOptionNames<V extends string | number>(
  key: string,
  options: readonly { readonly value: V; readonly label: string }[],
): readonly { readonly value: V; readonly label: string }[] {
  return options.map((o) => ({
    value: o.value,
    get label() {
      return optionName(key, o.value, o.label);
    },
  }));
}
