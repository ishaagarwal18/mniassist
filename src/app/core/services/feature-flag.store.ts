import { Injectable, computed, inject, signal } from '@angular/core';
import { ConfigStateService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { FeatureFlagService } from '../../proxy/platform/feature-flag.service';
import { registerFlagChecker } from '../auth/permission';

/**
 * The platform's feature flags as they apply to this workspace (a per-workspace override wins over the global value).
 * Loaded once after sign-in and again on refresh(). A flag nobody has set reads as off.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagStore {
  private readonly api = inject(FeatureFlagService);
  private readonly flags = signal<ReadonlyMap<string, boolean>>(new Map());
  private loadedFor: string | null = null;

  /** True once the flags for the signed-in user have arrived. */
  readonly loaded = signal(false);
  readonly all = computed(() => this.flags());

  constructor() {
    registerFlagChecker((key) => this.isOn(key));
    const config = inject(ConfigStateService, { optional: true });
    config
      ?.getOne$('currentUser')
      .subscribe((user: { id?: string; isAuthenticated?: boolean } | undefined) => {
        const id = user?.isAuthenticated ? (user.id ?? 'user') : null;
        if (id && id !== this.loadedFor) {
          this.loadedFor = id;
          void this.refresh();
        } else if (!id) {
          this.loadedFor = null;
          this.flags.set(new Map());
          this.loaded.set(false);
        }
      });
  }

  isOn(key: string): boolean {
    return this.flags().get(key.toLowerCase()) === true;
  }

  async refresh(): Promise<void> {
    try {
      const res = await firstValueFrom(this.api.getMyFlags({ skipHandleError: true }));
      this.flags.set(
        new Map(
          (res.items ?? []).filter((f) => f.key).map((f) => [f.key!.toLowerCase(), !!f.enabled]),
        ),
      );
    } catch {
      // Flags off is the safe default: a flagged screen stays hidden until the platform says otherwise.
    } finally {
      this.loaded.set(true);
    }
  }
}
