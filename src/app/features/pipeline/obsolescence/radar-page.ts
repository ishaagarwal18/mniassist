import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { count, inr, inrCompact } from '../../../core/util/format';
import { ArTopbar } from '../../../layout/topbar';
import {
  GetRadarInput,
  LifecycleStage,
  MigrationState,
  ObsolescenceService,
  RadarPersonDto,
  RadarRowDto,
  RadarSummaryDto,
  RadarView,
  RiskBand,
} from '../../../proxy/pipeline/obsolescence.service';
import { ArBanner, ArButton, ArChip, ArStatTile } from '../../../ui';
import { environment } from '../../../../environments/environment';
import {
  atRiskSentence,
  bandText,
  bandTone,
  DISMISS_REASONS,
  groupRadar,
  parseBand,
  stageText,
  stageTone,
  stateText,
} from './obsolescence.logic';

const PAGE = 500;

/**
 * The obsolescence radar: every installed component whose part its maker is phasing out, grouped by account and site and ranked by
 * risk, so the sales team can plan a migration with the customer before a breakdown. Rows are computed by the scanner on every save
 * and each night; this page reads them, filters them, and dismisses or assigns them.
 */
@Component({
  selector: 'ar-radar-page',
  imports: [ArTopbar, ArButton, ArBanner, ArChip, ArStatTile, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './radar-page.html',
  styleUrl: './radar-page.scss',
})
export class ArRadarPage {
  private readonly api = inject(ObsolescenceService);
  private readonly toasts = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly mock = environment.useMockData;
  protected readonly View = RadarView;
  protected readonly State = MigrationState;
  protected readonly stages = [
    LifecycleStage.PhaseOut,
    LifecycleStage.LastBuy,
    LifecycleStage.Discontinued,
    LifecycleStage.EndOfSupport,
  ];
  protected readonly bands = [RiskBand.High, RiskBand.Medium, RiskBand.Low];
  protected readonly reasons = DISMISS_REASONS;
  protected readonly canEditRules = grantedPolicy('AutoReach.Library.Lifecycle', this.permissions);

  protected readonly view = signal(RadarView.Open);
  protected readonly search = signal('');
  protected readonly make = signal('');
  protected readonly series = signal('');
  protected readonly stage = signal<LifecycleStage | null>(null);
  protected readonly band = signal<RiskBand | null>(null);
  protected readonly city = signal('');
  protected readonly owner = signal('');
  protected readonly amcOnly = signal(false);
  protected readonly notNotified = signal(false);
  private readonly contactId: string | null;

  protected readonly rows = signal<RadarRowDto[]>([]);
  protected readonly total = signal(0);
  protected readonly summary = signal<RadarSummaryDto | null>(null);
  protected readonly people = signal<RadarPersonDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly reason = signal(DISMISS_REASONS[0]);
  protected readonly otherReason = signal('');
  protected readonly assignTo = signal('');

  protected readonly groups = computed(() => groupRadar(this.rows()));
  protected readonly more = computed(() => this.rows().length < this.total());
  protected readonly selectedCount = computed(() => this.selected().size);
  protected readonly subtitle = computed(() => {
    const s = this.summary();
    if (!s) return '';
    const open = s.phaseOut + s.lastBuy + s.discontinued + s.endOfSupport;
    return `${count(open)} components at risk at ${count(s.sites)} sites · ${count(s.high)} high`;
  });

  constructor() {
    const query = inject(ActivatedRoute).snapshot.queryParamMap;
    this.band.set(parseBand(query.get('band')));
    this.contactId = query.get('contactId');
    void this.load();
    if (!this.mock) {
      firstValueFrom(this.api.getPeople())
        .then((p) => this.people.set(p))
        .catch(() => this.people.set([]));
    }
  }

  protected stageText = stageText;
  protected stageTone = stageTone;
  protected bandText = bandText;
  protected bandTone = bandTone;
  protected stateText = stateText;
  protected inr = inr;

  protected value(paise: number): string {
    return inrCompact(paise / 100);
  }

  private input(skip: number): GetRadarInput {
    return {
      view: this.view(),
      filter: this.search().trim() || null,
      make: this.make().trim() || null,
      series: this.series().trim() || null,
      stage: this.stage(),
      band: this.band(),
      city: this.city().trim() || null,
      ownerUserId: this.owner() || null,
      contactId: this.contactId,
      amcOnly: this.amcOnly(),
      notNotified: this.notNotified(),
      skipCount: skip,
      maxResultCount: PAGE,
    };
  }

  protected async load(): Promise<void> {
    if (this.mock) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.selected.set(new Set());
    try {
      const result = await firstValueFrom(this.api.getRadar(this.input(0)));
      this.rows.set(result.items ?? []);
      this.total.set(result.totalCount ?? 0);
      this.summary.set(result.summary);
      this.error.set(null);
    } catch (e) {
      this.error.set(readApiError(e, 'The radar could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected async loadMore(): Promise<void> {
    this.busy.set(true);
    try {
      const result = await firstValueFrom(this.api.getRadar(this.input(this.rows().length)));
      this.rows.update((r) => [...r, ...(result.items ?? [])]);
      this.total.set(result.totalCount ?? 0);
    } catch (e) {
      this.toasts.error(readApiError(e, 'More rows could not be loaded.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected show(view: RadarView): void {
    this.view.set(view);
    void this.load();
  }

  protected setStage(value: string): void {
    this.stage.set(value === '' ? null : (Number(value) as LifecycleStage));
    void this.load();
  }

  protected setBand(value: string): void {
    this.band.set(parseBand(value));
    void this.load();
  }

  protected toggleFlag(flag: 'amc' | 'notified', on: boolean): void {
    (flag === 'amc' ? this.amcOnly : this.notNotified).set(on);
    void this.load();
  }

  protected clearFilters(): void {
    for (const s of [this.search, this.make, this.series, this.city, this.owner]) s.set('');
    this.stage.set(null);
    this.band.set(null);
    this.amcOnly.set(false);
    this.notNotified.set(false);
    void this.load();
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  protected toggle(id: string, on: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected allSelected(rows: readonly RadarRowDto[]): boolean {
    return rows.length > 0 && rows.every((r) => this.selected().has(r.id));
  }

  protected toggleAll(rows: readonly RadarRowDto[], on: boolean): void {
    this.selected.update((set) => {
      const next = new Set(set);
      for (const r of rows) {
        if (on) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });
  }

  protected siteRows(account: { sites: { rows: RadarRowDto[] }[] }): RadarRowDto[] {
    return account.sites.flatMap((s) => s.rows);
  }

  protected async dismiss(): Promise<void> {
    const reason = (this.reason() === 'other' ? this.otherReason() : this.reason()).trim();
    if (!reason) {
      this.toasts.warning('Say why these rows are being dismissed.');
      return;
    }
    await this.act(
      () => this.api.dismiss([...this.selected()], reason),
      (n) => `${n} dismissed. They come back only if the stage gets worse.`,
    );
  }

  protected async restore(): Promise<void> {
    await this.act(
      () => this.api.restore([...this.selected()]),
      (n) => `${n} back on the radar.`,
    );
  }

  protected async assign(): Promise<void> {
    const userId = this.assignTo() || null;
    const name = this.people().find((p) => p.userId === userId)?.name;
    await this.act(
      () => this.api.assign([...this.selected()], userId),
      (n) => (name ? `${n} given to ${name}.` : `${n} now have no owner.`),
    );
  }

  private async act(
    call: () => ReturnType<ObsolescenceService['restore']>,
    done: (n: number) => string,
  ): Promise<void> {
    if (!this.selected().size) return;
    this.busy.set(true);
    try {
      const n = await firstValueFrom(call());
      this.toasts.success(done(n));
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The change could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async rescan(): Promise<void> {
    this.busy.set(true);
    try {
      const r = await firstValueFrom(this.api.rescan());
      this.toasts.success(atRiskSentence(r.atRiskComponents, r.atRiskSites, r.announcedComponents));
      await this.load();
    } catch (e) {
      this.toasts.error(readApiError(e, 'The scan could not be run.'));
    } finally {
      this.busy.set(false);
    }
  }
}
