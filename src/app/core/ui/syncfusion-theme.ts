/**
 * Loads Syncfusion's stylesheets (public/vendor/syncfusion/, built by
 * scripts/build-syncfusion-theme.mjs) the first time a Syncfusion-based
 * component renders. They are large, so they stay out of the initial bundle and
 * never load on the public pages. The core bundle holds the theme's variables
 * and the common controls; grid, schedule and kanban are separate bundles that
 * load only on screens that use them. index.html adds the core link early on app
 * pages so a full page load doesn't flash unstyled controls.
 */
export type SyncfusionBundle = 'core' | 'grid' | 'schedule' | 'kanban';

/** Bump with the @syncfusion/* version so browsers fetch the new files. */
const VERSION = '35.1.37';

const FILE: Record<SyncfusionBundle, string> = {
  core: 'syncfusion',
  grid: 'syncfusion-grid',
  schedule: 'syncfusion-schedule',
  kanban: 'syncfusion-kanban',
};

/** The core link's id; index.html uses the same one. */
export const SYNCFUSION_THEME_ID = 'sf-theme';

export function syncfusionThemeHref(bundle: SyncfusionBundle): string {
  return `vendor/syncfusion/${FILE[bundle]}.css?v=${VERSION}`;
}

export function ensureSyncfusionTheme(
  bundle: SyncfusionBundle = 'core',
  doc: Document | undefined = globalThis.document,
): void {
  if (!doc) return;
  if (bundle !== 'core') ensureSyncfusionTheme('core', doc);
  const id = bundle === 'core' ? SYNCFUSION_THEME_ID : `sf-theme-${bundle}`;
  if (doc.getElementById(id)) return;
  const link = doc.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = syncfusionThemeHref(bundle);
  doc.head.appendChild(link);
}
