/**
 * Remembering that a screen was opened from the Customer 360 cockpit, so its breadcrumb can lead back there.
 * Pure functions; `CockpitOriginService` feeds them the router's navigations.
 */

/** Where the user came from: the cockpit's own URL (with its query) and whose cockpit it was. */
export interface CockpitOrigin {
  /** The cockpit URL to go back to, e.g. `/contacts/accounts/a1/360?subsidiaries=1`. */
  readonly cockpitUrl: string;
  /** The customer or account name, when the cockpit had loaded it. */
  readonly name: string | null;
  /** The screen opened from it (path only); the origin holds while the user stays on it. */
  readonly targetPath: string;
}

/** The cockpit last shown, before leaving it. */
export interface CockpitVisit {
  readonly url: string;
  readonly name: string | null;
}

export const pathOf = (url: string): string => (url || '').split(/[?#;]/)[0];

/** `/contacts/360`, `/contacts/<id>/360` and `/contacts/accounts/<id>/360`. */
export function isCockpitPath(path: string): boolean {
  return /^\/contacts(\/accounts)?(\/[^/]+)?\/360$/.test(path);
}

/**
 * The origin after a navigation to `url`:
 * - on the cockpit itself there is none;
 * - leaving a cockpit (that had a customer open) to another screen starts one;
 * - staying on the opened screen (only its query changes: a filter, a record opened) keeps it;
 * - going anywhere else ends it.
 */
export function nextOrigin(
  current: CockpitOrigin | null,
  lastVisit: CockpitVisit | null,
  previousUrl: string,
  url: string,
): CockpitOrigin | null {
  const path = pathOf(url);
  if (isCockpitPath(path)) return null;

  const previousPath = pathOf(previousUrl);
  if (isCockpitPath(previousPath)) {
    // The bare picker (/contacts/360) has no customer to go back to.
    if (previousPath === '/contacts/360') return null;
    return {
      cockpitUrl: previousUrl,
      name: lastVisit && pathOf(lastVisit.url) === previousPath ? lastVisit.name : null,
      targetPath: path,
    };
  }

  return current && current.targetPath === path ? current : null;
}
