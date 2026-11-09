import { InjectionToken } from '@angular/core';

/**
 * A page shown inside another screen rather than at its own address — Get started shows the business profile
 * and template editor pages under a step's card. A page whose job ends in a save that would leave it (the
 * template editor going back to /templates) tells the host through {@link ArEmbeddedPage.finished} instead.
 *
 * Nothing provides it at a page's own route, so every page behaves exactly as before there.
 */
export interface ArEmbeddedPage {
  /** The page's job is done (e.g. the template was saved): the host may close it. */
  finished(): void;
}

export const AR_EMBEDDED_PAGE = new InjectionToken<ArEmbeddedPage>('AR_EMBEDDED_PAGE');
