import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom, of } from 'rxjs';

import {
  CreateUpdateDashboardWidgetDto,
  CustomDashboardDto,
  CustomDashboardService,
  DashboardMetricDto,
  DashboardMetricUnit,
  DashboardRange,
  DashboardRenderDto,
  DashboardWidgetKind,
  RenderedWidgetDto,
} from '../../proxy/analytics';
import { CurrentUserService } from '../../core/services/current-user.service';
import { inrCompact } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { ConfirmService } from '../../core/ui/confirm.service';

interface WidgetRow {
  metricKey: string;
  title: string;
  kind: DashboardWidgetKind;
  range: DashboardRange;
  columnSpan: number;
}

const RANGES: readonly { value: DashboardRange; label: string }[] = [
  { value: DashboardRange.Today, label: 'Today' },
  { value: DashboardRange.Last7Days, label: 'Last 7 days' },
  { value: DashboardRange.Last30Days, label: 'Last 30 days' },
  { value: DashboardRange.ThisMonth, label: 'This month' },
  { value: DashboardRange.Last90Days, label: 'Last 90 days' },
];

const WIDTHS: readonly { value: number; label: string }[] = [
  { value: 1, label: '¼ width' },
  { value: 2, label: '½ width' },
  { value: 3, label: '¾ width' },
  { value: 4, label: 'Full width' },
];

/** A trend tile's line, as an SVG path in a 100 × 32 box. */
function sparkPath(points: readonly { value: number }[]): { line: string; area: string } | null {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.value), 0);
  const min = Math.min(...points.map((p) => p.value), 0);
  const span = max - min || 1;
  const xy = points.map((p, i) => [
    (i / (points.length - 1)) * 100,
    30 - ((p.value - min) / span) * 28,
  ]);
  const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  return { line, area: `${line} L100,32 L0,32 Z` };
}

/**
 * Custom dashboard builder (M12-7). A dashboard is a named, ordered set of metric
 * tiles chosen from the server's metric catalogue — each with its own time range,
 * a style (number, percentage bar or day-by-day trend) and a width — private to its
 * creator unless shared with the workspace. The owner can drag tiles into place.
 */
@Component({
  selector: 'ar-custom-dashboards',
  imports: [ArTopbar, ArButton, ArChip, ArDialog, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboards.html',
  styleUrl: './dashboards.scss',
})
export class ArCustomDashboards {
  private readonly dialogs = inject(ConfirmService);
  private readonly api = inject(CustomDashboardService);
  private readonly me = inject(CurrentUserService).id;

  private readonly tick = signal(0);
  protected readonly selectedId = signal<string | null>(null);

  protected readonly K = DashboardWidgetKind;
  protected readonly ranges = RANGES;
  protected readonly widths = WIDTHS;

  private readonly listResource = rxResource({
    params: () => ({ tick: this.tick() }),
    stream: () => this.api.getList(),
    defaultValue: { items: [] as CustomDashboardDto[], totalCount: 0 },
  });
  protected readonly dashboards = computed(() =>
    this.listResource.error() ? [] : (this.listResource.value().items ?? []),
  );

  private readonly catalogueResource = rxResource({
    params: () => ({}),
    stream: () => this.api.metricCatalog(),
    defaultValue: { items: [] as DashboardMetricDto[] },
  });
  protected readonly metrics = computed(() =>
    this.catalogueResource.error() ? [] : (this.catalogueResource.value().items ?? []),
  );
  private readonly metricByKey = computed(() => new Map(this.metrics().map((m) => [m.key, m])));

  /** The catalogue grouped by category, for the metric picker. */
  protected readonly metricGroups = computed(() => {
    const groups = new Map<string, DashboardMetricDto[]>();
    for (const m of this.metrics()) groups.set(m.category, [...(groups.get(m.category) ?? []), m]);
    return [...groups].map(([category, items]) => ({ category, items }));
  });

  protected readonly current = computed(
    () =>
      this.dashboards().find((d) => d.id === this.selectedId()) ?? this.dashboards().at(0) ?? null,
  );

  /** Only the person who made a dashboard can rearrange it (the server refuses anyone else). */
  protected readonly canArrange = computed(() => {
    const d = this.current();
    return !!d && (!d.ownerUserId || d.ownerUserId === this.me());
  });

  private readonly renderResource = rxResource({
    params: () => ({ id: this.current()?.id, tick: this.tick() }),
    stream: ({ params }) =>
      params.id ? this.api.render(params.id) : of(null as DashboardRenderDto | null),
    defaultValue: null as DashboardRenderDto | null,
  });
  protected readonly rendered = computed(() =>
    this.renderResource.error() ? null : this.renderResource.value(),
  );
  protected readonly rendering = computed(() => this.renderResource.isLoading());

  /** Tiles in their shown order — the drag preview while a tile is being moved. */
  private readonly previewOrder = signal<string[] | null>(null);
  protected readonly tiles = computed(() => {
    const widgets = this.rendered()?.widgets ?? [];
    const order = this.previewOrder();
    if (!order) return widgets;
    return order
      .map((id) => widgets.find((w) => w.id === id))
      .filter((w): w is RenderedWidgetDto => !!w);
  });

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected format(value: number, unit: DashboardMetricUnit): string {
    if (unit === DashboardMetricUnit.Rate) return `${(value * 100).toFixed(1)}%`;
    if (unit === DashboardMetricUnit.Rupees) {
      const rupees = value / 100;
      return Math.abs(rupees) >= 1_00_000
        ? inrCompact(rupees)
        : `₹${rupees.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    return value.toLocaleString('en-IN');
  }

  protected spark(w: RenderedWidgetDto): { line: string; area: string } | null {
    return w.kind === DashboardWidgetKind.Trend ? sparkPath(w.series ?? []) : null;
  }

  protected sparkSpan(w: RenderedWidgetDto): string {
    const s = w.series ?? [];
    if (s.length < 2) return '';
    const day = (iso: string) =>
      new Date(iso).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      });
    return `${day(s[0].date)} – ${day(s[s.length - 1].date)}`;
  }

  // ---- dragging tiles on the dashboard ---------------------------------------------

  private dragId: string | null = null;

  protected onTileDragStart(event: DragEvent, id: string): void {
    if (!this.canArrange()) return;
    this.dragId = id;
    this.previewOrder.set(this.tiles().map((t) => t.id));
    event.dataTransfer?.setData('text/plain', id);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }

  protected onTileDragOver(event: DragEvent, overId: string): void {
    if (!this.dragId) return;
    event.preventDefault();
    const order = [...(this.previewOrder() ?? [])];
    const from = order.indexOf(this.dragId);
    const to = order.indexOf(overId);
    if (from < 0 || to < 0 || from === to) return;
    order.splice(to, 0, ...order.splice(from, 1));
    this.previewOrder.set(order);
  }

  protected async onTileDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    await this.commitTileOrder();
  }

  protected async onTileDragEnd(): Promise<void> {
    await this.commitTileOrder();
  }

  /** Moves a tile one place with the keyboard: Alt+← / Alt+→. */
  protected async nudge(event: KeyboardEvent, id: string): Promise<void> {
    if (!this.canArrange() || !event.altKey) return;
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    const order = this.tiles().map((t) => t.id);
    const at = order.indexOf(id);
    const to = at + step;
    if (to < 0 || to >= order.length) return;
    [order[at], order[to]] = [order[to], order[at]];
    this.previewOrder.set(order);
    this.dragId = id;
    await this.commitTileOrder();
  }

  private async commitTileOrder(): Promise<void> {
    const order = this.previewOrder();
    const d = this.current();
    this.dragId = null;
    if (!order || !d) {
      this.previewOrder.set(null);
      return;
    }
    const before = [...d.widgets].sort((a, b) => a.order - b.order).map((w) => w.id);
    if (before.join() === order.join()) {
      this.previewOrder.set(null);
      return;
    }
    const byId = new Map(d.widgets.map((w) => [w.id, w]));
    try {
      await firstValueFrom(
        this.api.update(d.id, {
          name: d.name,
          isShared: d.isShared,
          widgets: order
            .map((id) => byId.get(id))
            .filter((w) => !!w)
            .map((w, i) => ({
              metricKey: w!.metricKey,
              title: w!.title ?? null,
              kind: w!.kind,
              range: w!.range ?? DashboardRange.Default,
              columnSpan: w!.columnSpan,
              order: i,
            })),
        }),
      );
      this.tick.update((n) => n + 1);
    } finally {
      this.previewOrder.set(null);
    }
  }

  // ---- editor --------------------------------------------------------------------------

  protected readonly dialogOpen = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly shared = signal(false);
  protected readonly rows = signal<WidgetRow[]>([]);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected metricOf(key: string): DashboardMetricDto | undefined {
    return this.metricByKey().get(key);
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
        .map((w) => ({
          metricKey: w.metricKey,
          title: w.title ?? '',
          kind: w.kind,
          range: w.range ?? DashboardRange.Default,
          columnSpan: w.columnSpan || 1,
        })),
    );
    this.error.set(null);
    this.dialogOpen.set(true);
  }

  protected addRow(): void {
    const first = this.metrics()[0]?.key ?? '';
    this.rows.update((r) => [
      ...r,
      {
        metricKey: first,
        title: '',
        kind: DashboardWidgetKind.StatTile,
        range: DashboardRange.Default,
        columnSpan: 1,
      },
    ]);
  }

  protected removeRow(i: number): void {
    this.rows.update((r) => r.filter((_, idx) => idx !== i));
  }

  protected moveRow(i: number, step: number): void {
    this.rows.update((r) => {
      const to = i + step;
      if (to < 0 || to >= r.length) return r;
      const next = [...r];
      [next[i], next[to]] = [next[to], next[i]];
      return next;
    });
  }

  protected setRow<K extends keyof WidgetRow>(i: number, key: K, value: WidgetRow[K]): void {
    this.rows.update((r) =>
      r.map((row, idx) => {
        if (idx !== i) return row;
        const next = { ...row, [key]: value };
        // A new metric may not support the chosen style; fall back to a number.
        const m = this.metricOf(next.metricKey);
        if (next.kind === DashboardWidgetKind.Trend && !m?.trendable)
          next.kind = DashboardWidgetKind.StatTile;
        if (next.kind === DashboardWidgetKind.RateBar && m?.unit !== DashboardMetricUnit.Rate)
          next.kind = DashboardWidgetKind.StatTile;
        if (next.kind === DashboardWidgetKind.Trend && next.columnSpan < 2) next.columnSpan = 2;
        return next;
      }),
    );
  }

  /** Dragging a row in the editor reorders the tiles. */
  private dragRow: number | null = null;
  protected onRowDragStart(i: number): void {
    this.dragRow = i;
  }
  protected onRowDragOver(event: DragEvent, i: number): void {
    if (this.dragRow == null || this.dragRow === i) return;
    event.preventDefault();
    const from = this.dragRow;
    this.rows.update((r) => {
      const next = [...r];
      next.splice(i, 0, ...next.splice(from, 1));
      return next;
    });
    this.dragRow = i;
  }
  protected onRowDragEnd(): void {
    this.dragRow = null;
  }

  protected async save(): Promise<void> {
    if (!this.name().trim()) {
      this.error.set('Give the dashboard a name.');
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const widgets: CreateUpdateDashboardWidgetDto[] = this.rows().map((row, i) => ({
      metricKey: row.metricKey,
      title: row.title.trim() || null,
      kind: row.kind,
      range: this.metricOf(row.metricKey)?.windowed ? row.range : DashboardRange.Default,
      order: i,
      columnSpan: row.columnSpan,
    }));
    try {
      const id = this.editingId();
      const body = { name: this.name().trim(), isShared: this.shared(), widgets };
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
    if (!d || !(await this.dialogs.delete('this dashboard', d.name))) return;
    try {
      await firstValueFrom(this.api.delete(d.id));
      this.selectedId.set(null);
      this.tick.update((n) => n + 1);
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'The dashboard could not be deleted.');
    }
  }
}
