import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { Asset, PipelineStore } from '../../core/services/pipeline.service';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

/**
 * Installed base (M10). Every machine with its AMC / calibration / warranty dates —
 * the register the reminder engine reads from. The soonest due date leads each row
 * because that is the thing that turns into a utility message.
 */
@Component({
  selector: 'ar-installed-base',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './installed-base.html',
  styleUrl: './installed-base.scss',
})
export class ArInstalledBase {
  private readonly store = inject(PipelineStore);

  protected readonly assets = this.store.assets;
  protected readonly loading = this.store.loading;
  protected readonly includeRetired = this.store.includeRetired;
  protected readonly busy = signal<string | null>(null);

  protected readonly dueSoon = computed(
    () =>
      this.assets().filter(
        (a) => !a.retired && this.daysTo(a.nextDueOn) != null && this.daysTo(a.nextDueOn)! <= 30,
      ).length,
  );

  protected daysTo(iso?: string): number | null {
    return iso ? Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000) : null;
  }

  protected dueLabel(a: Asset): string {
    const d = this.daysTo(a.nextDueOn);
    if (d == null) return '—';
    if (d < 0) return `overdue ${-d}d`;
    if (d === 0) return 'today';
    return `in ${d}d`;
  }

  protected dueTone(a: Asset): ChipTone {
    const d = this.daysTo(a.nextDueOn);
    if (d == null) return 'neutral';
    if (d < 0) return 'bad';
    if (d <= 14) return 'amber';
    return 'neutral';
  }

  protected async recordService(a: Asset): Promise<void> {
    this.busy.set(a.id);
    try {
      await this.store.recordService(a.id);
    } finally {
      this.busy.set(null);
    }
  }

  protected async retire(a: Asset): Promise<void> {
    if (!window.confirm(`Retire "${a.description}"? Its reminders stop.`)) return;
    this.busy.set(a.id);
    try {
      await this.store.retireAsset(a.id);
    } finally {
      this.busy.set(null);
    }
  }
}
