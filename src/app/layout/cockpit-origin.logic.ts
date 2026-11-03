/**
 * Remembering that a screen was opened from a cockpit (Customer 360, Vendor 360 or an open campaign), so its breadcrumb can lead back there.
 * Pure functions; `CockpitOriginService` feeds them the router's navigations.
 */

/** Which cockpit: a customer's (Customer 360), a supplier's (Vendor 360) or one campaign's (`/campaigns?open=<id>`). */
export type CockpitKind = 'customer' | 'vendor' | 'campaign';

/** Where the user came from: the cockpit's own URL (with its query) and whose cockpit it was. */
export interface CockpitOrigin {
  readonly kind: CockpitKind;
  /** The cockpit URL to go back to, e.g. `/contacts/accounts/a1/360?subsidiaries=1`. */
  readonly cockpitUrl: string;
  /** The customer, account, supplier or campaign name, when the cockpit had loaded it. */
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

/** Customer 360 (`/contacts/360`, `/contacts/<id>/360`, `/contacts/accounts/<id>/360`), Vendor 360 (`/purchasing/vendor-360[/<id>]`) or Campaigns (`/campaigns`). */
export function cockpitKind(path: string): CockpitKind | null {
  if (/^\/contacts(\/accounts)?(\/[^/]+)?\/360$/.test(path)) return 'customer';
  if (/^\/purchasing\/vendor-360(\/[^/]+)?$/.test(path)) return 'vendor';
  if (path === '/campaigns') return 'campaign';
  return null;
}

/** The campaigns list is a cockpit only while one campaign is open on it (`?open=<id>`). */
const hasOpenCampaign = (url: string): boolean => /[?&]open=[^&#]+/.test(url);

export function isCockpitPath(path: string): boolean {
  return cockpitKind(path) !== null;
}

/**
 * The origin after a navigation to `url`:
 * - on the cockpit itself there is none;
 * - leaving a cockpit (that had a customer or supplier open) to another screen starts one;
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
  const kind = cockpitKind(previousPath);
  if (kind) {
    // The bare customer picker (/contacts/360) has no customer to go back to.
    if (previousPath === '/contacts/360') return null;
    // Nor the campaigns list with no campaign open.
    if (kind === 'campaign' && !hasOpenCampaign(previousUrl)) return null;
    return {
      kind,
      cockpitUrl: previousUrl,
      name: lastVisit && pathOf(lastVisit.url) === previousPath ? lastVisit.name : null,
      targetPath: path,
    };
  }

  return current && current.targetPath === path ? current : null;
}
