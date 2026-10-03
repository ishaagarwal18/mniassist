import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { THEME_KEY, Theme, isThemedPath, parseTheme } from './theme-logic';

/**
 * The user's light/dark choice, remembered per browser. Applies it by setting
 * `data-theme="dark"` on <html>, which switches every `--ar-*` token (see
 * `styles/_tokens.scss`), but only on pages that follow the theme. Public
 * customer pages stay light whatever this browser's user picked.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);

  readonly theme = signal<Theme>(readStored());

  private readonly path = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.document.location?.pathname ?? '/' },
  );

  constructor() {
    effect(() => {
      const root = this.document.documentElement;
      if (this.theme() === 'dark' && isThemedPath(this.path())) {
        root.setAttribute('data-theme', 'dark');
      } else {
        root.removeAttribute('data-theme');
      }
    });
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* storage blocked: the choice lasts until the tab closes */
    }
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }
}

function readStored(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return 'light';
  }
}
