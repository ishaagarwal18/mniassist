import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { HelpTopic, helpTopicFor } from '../core/help/help-topics';

@Injectable({ providedIn: 'root' })
export class PageContextService {
  private readonly router = inject(Router);

  readonly title = signal<string>('');
  readonly subtitle = signal<string | null>(null);
  readonly help = signal<string | null>(null);

  /** Whether the help flyout is currently open in the right-hand sidebar. */
  readonly helpOpen = signal<boolean>(false);

  /** Whether the right-hand utility sidebar is open as a drawer on mobile screens. */
  readonly drawerOpen = signal<boolean>(false);

  private readonly activeRoutePath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map(() => {
        let route = this.router.routerState.root;
        while (route.firstChild) {
          route = route.firstChild;
        }
        return route.snapshot.routeConfig?.path ?? null;
      }),
    ),
    { initialValue: null },
  );

  readonly topic = computed<HelpTopic | null>(() => helpTopicFor(this.activeRoutePath()));

  readonly summary = computed<string | null>(() => this.topic()?.summary ?? this.help());

  setContext(title: string, subtitle?: string | null, help?: string | null): void {
    this.title.set(title);
    this.subtitle.set(subtitle ?? null);
    this.help.set(help ?? null);
  }

  toggleHelp(): void {
    this.helpOpen.update((v) => !v);
  }

  closeHelp(): void {
    this.helpOpen.set(false);
  }

  toggleDrawer(): void {
    this.drawerOpen.update((v) => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}
