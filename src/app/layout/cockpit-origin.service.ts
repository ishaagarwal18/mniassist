import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import {
  CockpitOrigin,
  CockpitVisit,
  isCockpitPath,
  nextOrigin,
  pathOf,
} from './cockpit-origin.logic';

const STORAGE_KEY = 'ar.cockpitOrigin';

/**
 * Tracks screens opened from a 360 cockpit (Customer 360, Vendor 360), whichever link opened them (the related-screens panel, a table row, an
 * action, "View all"), so the topbar can show "Customer 360 · <customer> › <screen>" (or "Vendor 360 · <supplier>") and lead back. Kept in session storage so a
 * reload of the opened screen keeps the way back.
 */
@Injectable({ providedIn: 'root' })
export class CockpitOriginService {
  private readonly router = inject(Router, { optional: true });

  private readonly originSignal = signal<CockpitOrigin | null>(this.restore());
  /** The cockpit the current screen was opened from, or null. */
  readonly origin = this.originSignal.asReadonly();

  private lastVisit: CockpitVisit | null = null;
  private previousUrl = this.router?.url ?? '';

  constructor() {
    this.router?.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.navigated(e.urlAfterRedirects));
  }

  /**
   * Where a screen opened from a cockpit goes back to once done (saved or cancelled): that cockpit, while the origin is for this
   * screen; otherwise `fallback`.
   */
  returnUrl(fallback: string): string {
    const origin = this.originSignal();
    const here = pathOf(this.router?.url ?? '');
    return origin && origin.targetPath === here ? origin.cockpitUrl : fallback;
  }

  /** The cockpit says whose it is once loaded, so the way back can be named. */
  setCockpitName(name: string | null): void {
    const url = this.router?.url ?? '';
    if (isCockpitPath(pathOf(url))) this.lastVisit = { url, name };
  }

  private navigated(url: string): void {
    const next = nextOrigin(this.originSignal(), this.lastVisit, this.previousUrl, url);
    this.previousUrl = url;
    if (next !== this.originSignal()) {
      this.originSignal.set(next);
      this.persist(next);
    }
  }

  private restore(): CockpitOrigin | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const saved = raw ? (JSON.parse(raw) as CockpitOrigin) : null;
      // Only valid for the screen it was made for. Saved before Vendor 360 joined: a customer one.
      return saved && saved.targetPath === pathOf(this.router?.url ?? location.pathname)
        ? { ...saved, kind: saved.kind ?? 'customer' }
        : null;
    } catch {
      return null;
    }
  }

  private persist(origin: CockpitOrigin | null): void {
    try {
      if (origin) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(origin));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: the way back lasts only until reload.
    }
  }
}
