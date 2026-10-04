/**
 * Loads the Syncfusion stylesheet (public/vendor/syncfusion/syncfusion.css, built
 * by scripts/build-syncfusion-theme.mjs) the first time a Syncfusion-based
 * component renders. It is large, so it is kept out of the initial bundle and
 * never loaded on the public pages that don't use it. index.html adds the same
 * link early on app pages, so a full page load doesn't flash unstyled controls;
 * this covers in-app navigation from a public page (e.g. landing -> sign-in).
 */
export const SYNCFUSION_THEME_ID = 'sf-theme';

/** Bump with the @syncfusion/* version so browsers fetch the new file. */
export const SYNCFUSION_THEME_HREF = 'vendor/syncfusion/syncfusion.css?v=35.1.37';

export function ensureSyncfusionTheme(doc: Document | undefined = globalThis.document): void {
  if (!doc || doc.getElementById(SYNCFUSION_THEME_ID)) return;
  const link = doc.createElement('link');
  link.id = SYNCFUSION_THEME_ID;
  link.rel = 'stylesheet';
  link.href = SYNCFUSION_THEME_HREF;
  doc.head.appendChild(link);
}
