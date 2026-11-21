import { Injectable, signal } from '@angular/core';
import { NavGroup } from './nav.model';

/**
 * The sidebar shows group headings only; the pages of the chosen group are drawn as a
 * horizontal menu above each screen's top bar. The sidebar publishes that group here.
 */
@Injectable({ providedIn: 'root' })
export class SubNavService {
  /** The group whose pages the horizontal menu shows; null shows no menu. */
  readonly group = signal<NavGroup | null>(null);
  /** The route of the item that is lit (longest match for the page). */
  readonly active = signal('');
  /** Starred routes, owned by the sidebar. */
  readonly favourites = signal<readonly string[]>([]);
  /** Stars or unstars a page; set by the sidebar, which stores the list. */
  toggleFavourite: (route: string) => void = () => undefined;
}
