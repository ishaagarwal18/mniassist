import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

import { FeatureFlagDto, FeatureFlagService } from '../../proxy/platform';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ConfirmService } from '../../core/ui/confirm.service';

const KEYS = [{ value: 'mm-lite', label: 'Marketing Messages Lite (MM Lite send path)' }];

/**
 * Feature flags and staged rollout (M15-4). A key can be on for everyone, on for a
 * rolled-out percentage of tenants, or overridden on/off for one tenant.
 */
@Component({
  selector: 'ar-feature-flags',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-flags.html',
  styleUrl: './feature-flags.scss',
})
export class ArFeatureFlags {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(FeatureFlagService);

  protected readonly keys = KEYS;
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getAll(),
    defaultValue: { items: [] as FeatureFlagDto[] },
  });

  protected readonly flags = computed(() => this.resource.value().items ?? []);
  protected readonly loading = computed(() => this.resource.isLoading());

  protected readonly editorOpen = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = signal({
    key: 'mm-lite',
    tenantId: '',
    enabled: false,
    rolloutPercent: 0,
    note: '',
  });

  protected keyLabel(key?: string): string {
    return KEYS.find((k) => k.value === key)?.label ?? key ?? '';
  }

  protected openNew(): void {
    this.form.set({ key: 'mm-lite', tenantId: '', enabled: false, rolloutPercent: 0, note: '' });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(f: FeatureFlagDto): void {
    this.form.set({
      key: f.key ?? 'mm-lite',
      tenantId: f.tenantId ?? '',
      enabled: f.enabled ?? false,
      rolloutPercent: f.rolloutPercent ?? 0,
      note: f.note ?? '',
    });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected patch<K extends keyof ReturnType<typeof this.form>>(
    key: K,
    value: ReturnType<typeof this.form>[K],
  ): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected async save(): Promise<void> {
    const f = this.form();
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.set({
          key: f.key,
          tenantId: f.tenantId.trim() || null,
          enabled: f.enabled,
          rolloutPercent: Number(f.rolloutPercent) || 0,
          note: f.note.trim() || null,
        }),
      );
      this.editorOpen.set(false);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the flag.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(f: FeatureFlagDto): Promise<void> {
    if (!f.id || !(await this.dialogs.delete(`this ${this.keyLabel(f.key)} row`))) return;
    await firstValueFrom(this.api.delete(f.id));
    this.tick.update((n) => n + 1);
  }

  protected state(f: FeatureFlagDto): string {
    if (f.enabled) return 'On for all';
    if ((f.rolloutPercent ?? 0) > 0) return `${f.rolloutPercent}% rollout`;
    return 'Off';
  }
}
