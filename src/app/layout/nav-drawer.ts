import { Injectable, signal } from '@angular/core';

/**
 * On a phone the sidebar is a drawer: hidden until the header's menu button opens it,
 * closed again by choosing a page or tapping outside it. Wider screens ignore this and
 * keep the sidebar beside the page.
 */
export const PHONE_MAX_WIDTH = 720;
export const COLLAPSED_KEY = 'ar.sidebar.collapsed';

export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

@Injectable({ providedIn: 'root' })
export class NavDrawer {
  /** Mobile drawer open state */
  readonly open = signal(false);

  /** Left sidebar collapsed (icons-only) state, shared across sidebar and topbar */
  readonly collapsed = signal(readSidebarCollapsed());

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  toggleCollapsed(): void {
    this.collapsed.update((v) => !v);
    try {
      localStorage.setItem(COLLAPSED_KEY, this.collapsed() ? '1' : '0');
    } catch {
      /* storage blocked */
    }
  }

  setCollapsed(val: boolean): void {
    this.collapsed.set(val);
    try {
      localStorage.setItem(COLLAPSED_KEY, val ? '1' : '0');
    } catch {
      /* storage blocked */
    }
  }
}
