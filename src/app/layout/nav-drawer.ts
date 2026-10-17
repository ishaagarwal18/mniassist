import { Injectable, signal } from '@angular/core';

/**
 * On a phone the sidebar is a drawer: hidden until the header's menu button opens it,
 * closed again by choosing a page or tapping outside it. Wider screens ignore this and
 * keep the sidebar beside the page.
 */
export const PHONE_MAX_WIDTH = 720;

@Injectable({ providedIn: 'root' })
export class NavDrawer {
  readonly open = signal(false);

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }
}
