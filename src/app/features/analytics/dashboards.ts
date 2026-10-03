import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';

import {
  CustomDashboardDto,
  CustomDashboardService,
  DashboardMetricDto,
  DashboardMetricUnit,
  DashboardRenderDto,
  DashboardWidgetKind,
} from '../../proxy/analytics';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';

interface WidgetRow {
  metricKey: string;
  title: string;
  kind: DashboardWidgetKind;
}

/**
 * Custom dashboard builder (M12-7). A dashboard is a named, ordered set of metric
 * tiles chosen from the server's metric catalogue; private to its creator unless
 * shared with the workspace.
 */
@Component({
  selector: 'ar-custom-dashboards',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboards.html',
  styleUrl: './dashboards.scss',
})
export class ArCustomDashboards {
  private readonly api = inject(CustomDashboardService);

  private readonly tick = signal(0);
  protected readonly selectedId = signal<string | null>(null);

  private readonly listResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getList(),
    defaultValue: { items: [] as CustomDashboardDto[], totalCount: 0 },
  });
  protected readonly dashboards = computed(() => this.listResource.value().items ?? []);

  private readonly catalogueResource = rxResource({
    params: () => ({}),
    stream: () => this.api.metricCatalog(),
    defaultValue: { items: [] as DashboardMetricDto[] },
  });
  protected readonly metrics = computed(() => this.catalogueResource.value().items ?? []);

  protected readonly current = computed(
    () =>
      this.dashboards().find((d) => d.id === this.selectedId()) ?? this.dashboards().at(0) ?? null,
  );

  private readonly renderResource = rxResource({
    params: () => ({ id: this.current()?.id, tick: this.tick() }),
    stream: ({ params }) =>
      params.id ? this.api.render(params.id) : of(null as DashboardRenderDto | null),
    defaultValue: null as DashboardRenderDto | null,
  });
  protected readonly rendered = computed(() => this.renderResource.value());
  protected readonly rendering = computed(() => this.renderResource.isLoading());

  // ---- editor --------------------------------------------------------
  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly shared = signal(false);
  protected readonly rows = signal<WidgetRow[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly K = DashboardWidgetKind;

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected format(value: number, unit: DashboardMetricUnit): string {
    if (unit === DashboardMetricUnit.Rate) return `${Math.round(value * 100)}%`;
    if (unit === DashboardMetricUnit.Rupees) return `₹${(value / 100).toLocaleString('en-IN')}`;
    return value.toLocaleString('en-IN');
  }

  protected openNew(): void {
    this.editingId.set(null);
    this.name.set('');
    this.shared.set(false);
    this.rows.set([]);
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(): void {
    const d = this.current();
    if (!d) return;
    this.editingId.set(d.id);
    this.name.set(d.name);
    this.shared.set(d.isShared);
    this.rows.set(
      [...d.widgets]
        .sort((a, b) => a.order - b.order)
        .map((w) => ({ metricKey: w.metricKey, title: w.title ?? '', kind: w.kind })),
    );
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected addRow(): void {
    const first = this.metrics()[0]?.key ?? '';
    this.rows.update((r) => [
      ...r,
      { metricKey: first, title: '', kind: DashboardWidgetKind.StatTile },
    ]);
  }
  protected removeRow(i: number): void {
    this.rows.update((r) => r.filter((_, idx) => idx !== i));
  }
  protected setRow<K extends keyof WidgetRow>(i: number, key: K, value: WidgetRow[K]): void {
    this.rows.update((r) => r.map((row, idx) => (idx === i ? { ...row, [key]: value } : row)));
  }

  protected async save(): Promise<void> {
    if (!this.name().trim()) {
      this.error.set('Give the dashboard a name.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const body = {
      name: this.name().trim(),
      isShared: this.shared(),
      widgets: this.rows().map((row, i) => ({
        metricKey: row.metricKey,
        title: row.title.trim() || null,
        kind: row.kind,
        order: i,
        columnSpan: 1,
      })),
    };
    try {
      const id = this.editingId();
      const saved = id
        ? await firstValueFrom(this.api.update(id, body))
        : await firstValueFrom(this.api.create(body));
      this.dialogOpen.set(false);
      this.selectedId.set(saved.id);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The dashboard could not be saved.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeDashboard(): Promise<void> {
    const d = this.current();
    if (!d || !window.confirm(`Delete "${d.name}"?`)) return;
    try {
      await firstValueFrom(this.api.delete(d.id));
      this.selectedId.set(null);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The dashboard could not be deleted.');
    }
  }
}
