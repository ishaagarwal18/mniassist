import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { ConfigStateService } from '@abp/ng.core';
import { Observable, EMPTY, Subscription } from 'rxjs';

/** Warm only common signed-in screens, and leave slow or metered connections alone. */
@Injectable({ providedIn: 'root' })
export class IdlePreloading implements PreloadingStrategy {
  private readonly config = inject(ConfigStateService);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
      }
    ).connection;
    if (
      !route.data?.['preload'] ||
      !this.config.getOne('currentUser')?.isAuthenticated ||
      connection?.saveData ||
      /(^|-)2g$/.test(connection?.effectiveType ?? '')
    )
      return EMPTY;
    return new Observable((subscriber) => {
      let subscription: Subscription | undefined;
      const start = () => {
        subscription = load().subscribe(subscriber);
      };
      if ('requestIdleCallback' in window) {
        const id = window.requestIdleCallback(start);
        return () => {
          window.cancelIdleCallback(id);
          subscription?.unsubscribe();
        };
      }
      const id = setTimeout(start, 1500);
      return () => {
        clearTimeout(id);
        subscription?.unsubscribe();
      };
    });
  }
}
