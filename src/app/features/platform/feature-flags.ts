import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { rxResource } from '@angular/core/rxjs-interop';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { catchError, firstValueFrom, of } from 'rxjs';

import { FeatureFlagDto, FeatureFlagService } from '../../proxy/platform';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ArGrid } from '../../ui/grid';
import { ConfirmService } from '../../core/ui/confirm.service';

const KEYS = [
  { value: 'mm-lite', label: 'Marketing Messages Lite (MM Lite send path)' },
  { value: 'voice-agent-ai', label: 'Autonomous Voice Agent (Bilingual IVR)' },
  { value: 'auto-reorder-portal', label: 'WhatsApp Quick Reorder & Commerce Portal' },
  { value: 'smart-amc-dispatch', label: 'AMC Automatic Service Ticket Dispatch' },
];

const SEED_FLAGS: FeatureFlagDto[] = [
  {
    id: 'ff-1',
    key: 'mm-lite',
    enabled: true,
    rolloutPercent: 100,
    note: 'Active on production for all workspaces',
  },
  {
    id: 'ff-2',
    key: 'voice-agent-ai',
    enabled: false,
    rolloutPercent: 25,
    note: 'Staged 25% rollout for high-volume accounts',
  },
  {
    id: 'ff-3',
    key: 'auto-reorder-portal',
    tenantId: 't-1',
    tenantName: 'Sun Energy Automation',
    enabled: true,
    note: 'Dedicated early access workspace override',
  },
];

@Component({
  selector: 'ar-feature-flags',
  imports: [
    NgTemplateOutlet,
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArSelect,
    ArGrid,
    GridModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './feature-flags.html',
  styleUrl: './feature-flags.scss',
})
export class ArFeatureFlags {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(FeatureFlagService);
  private readonly route = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router, { optional: true });

  protected readonly mode = (this.route?.snapshot?.data?.['mode'] as string | undefined) ?? 'list';
  protected readonly isPage = this.mode !== 'list';

  protected readonly keys = KEYS;
  private readonly tick = signal(0);

  private readonly resource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () =>
      this.api
        .getAll()
        .pipe(catchError(() => of({ items: [] as FeatureFlagDto[] }))),
    defaultValue: { items: [] as FeatureFlagDto[] },
  });

  protected readonly flags = computed<FeatureFlagDto[]>(() => {
    const val = this.resource.value();
    const items = (val as { items?: FeatureFlagDto[] } | undefined)?.items ?? [];
    return items.length ? items : SEED_FLAGS;
  });
  protected readonly loading = computed(() => this.resource.isLoading());

  protected readonly editorOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = signal({
    key: 'mm-lite',
    tenantId: '',
    enabled: false,
    rolloutPercent: 0,
    note: '',
  });

  constructor() {
    if (this.mode === 'new') {
      this.openNew();
    } else if (this.mode === 'edit') {
      const id = this.route?.snapshot?.paramMap?.get('id');
      const item = this.flags().find((f: FeatureFlagDto) => f.id === id);
      if (item) this.openEdit(item);
      else this.openNew();
    }
  }

  protected keyLabel(key?: string): string {
    return KEYS.find((k) => k.value === key)?.label ?? key ?? '';
  }

  protected goNew(): void {
    if (this.router) void this.router.navigate(['/platform/feature-flags/new']);
    else this.openNew();
  }

  protected goEdit(f: FeatureFlagDto): void {
    if (this.router && f.id) void this.router.navigate(['/platform/feature-flags', f.id, 'edit']);
    else this.openEdit(f);
  }

  protected close(): void {
    this.editorOpen.set(false);
    this.editingId.set(null);
    if (this.isPage && this.router) {
      void this.router.navigate(['/platform/feature-flags']);
    }
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.form.set({ key: 'mm-lite', tenantId: '', enabled: false, rolloutPercent: 0, note: '' });
    this.error.set(null);
    this.editorOpen.set(true);
  }

  protected openEdit(f: FeatureFlagDto): void {
    this.editingId.set(f.id ?? null);
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
      ).catch(() => {});
      this.close();
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not save the flag.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(f: FeatureFlagDto): Promise<void> {
    if (!f.id || !(await this.dialogs.delete(`this ${this.keyLabel(f.key)} row`))) return;
    await firstValueFrom(this.api.delete(f.id)).catch(() => {});
    this.tick.update((n) => n + 1);
  }

  protected state(f: FeatureFlagDto): string {
    if (f.enabled) return 'On for all';
    if ((f.rolloutPercent ?? 0) > 0) return `${f.rolloutPercent}% rollout`;
    return 'Off';
  }
}
