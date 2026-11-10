import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../../core/auth/permission';
import { inrCompact } from '../../../core/util/format';
import {
  ObsolescenceService,
  RadarRowDto,
  RadarView,
  RiskBand,
} from '../../../proxy/pipeline/obsolescence.service';
import { ArChip } from '../../../ui';
import { bandText, bandTone, stageText, stageTone } from './obsolescence.logic';

/**
 * Customer 360's "At risk" card: this customer's installed components whose parts are being phased out, riskiest first, with a link
 * to the radar filtered to them. Shows nothing when there are none or the radar isn't in the user's plan or role.
 */
@Component({
  selector: 'ar-at-risk-card',
  imports: [RouterLink, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './at-risk-card.scss',
  template: `
    @if (rows().length) {
      <section class="ark" aria-label="Machines at risk from phase-outs">
        <header class="ark__head">
          <h2 class="ark__title">At risk from phase-outs</h2>
          <span class="ark__muted"
            >{{ total() }} component{{ total() === 1 ? '' : 's' }} · {{ high() }} high ·
            {{ value() }} to migrate</span
          >
          <a class="ark__link" routerLink="/obsolescence" [queryParams]="query()">Open the radar</a>
        </header>
        <ul class="ark__list">
          @for (r of rows(); track r.id) {
            <li>
              <ar-chip [tone]="bandTone(r.band)">{{ r.score }} {{ bandText(r.band) }}</ar-chip>
              <span class="ar-mono" translate="no">{{ r.partNumber }}</span>
              <span translate="no"
                >{{ r.machineDescription }}{{ r.siteName ? ', ' + r.siteName : '' }}</span
              >
              <ar-chip [tone]="stageTone(r.stage)">{{ stageText(r.stage) }}</ar-chip>
              @if (r.replacementLabel) {
                <span class="ark__muted" translate="no">→ {{ r.replacementLabel }}</span>
              }
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class ArAtRiskCard {
  readonly contactId = input<string | null>(null);
  readonly accountId = input<string | null>(null);

  private readonly api = inject(ObsolescenceService);
  private readonly allowed = grantedPolicy('AutoReach.Obsolescence', inject(PermissionService));

  protected readonly rows = signal<RadarRowDto[]>([]);
  protected readonly total = signal(0);
  protected readonly high = signal(0);
  private readonly valuePaise = signal(0);
  protected readonly value = computed(() => inrCompact(this.valuePaise() / 100));
  protected readonly query = computed(() =>
    this.accountId() ? { accountId: this.accountId() } : { contactId: this.contactId() },
  );

  protected bandText = bandText;
  protected bandTone = bandTone;
  protected stageText = stageText;
  protected stageTone = stageTone;

  constructor() {
    effect(() => {
      const contactId = this.contactId();
      const accountId = this.accountId();
      if (!this.allowed() || (!contactId && !accountId)) {
        this.rows.set([]);
        return;
      }
      void this.load(contactId, accountId);
    });
  }

  private async load(contactId: string | null, accountId: string | null): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.api.getRadar(
          {
            contactId: accountId ? null : contactId,
            accountId,
            view: RadarView.Open,
            maxResultCount: 1000,
          },
          { skipHandleError: true },
        ),
      );
      const items = [...(result.items ?? [])].sort((a, b) => b.score - a.score);
      this.total.set(result.totalCount ?? items.length);
      this.high.set(items.filter((r) => r.band === RiskBand.High).length);
      this.valuePaise.set(items.reduce((sum, r) => sum + (r.estimatedValueInPaise ?? 0), 0));
      this.rows.set(items.slice(0, 5));
    } catch {
      // The card is extra: a failure leaves the rest of Customer 360 alone.
      this.rows.set([]);
    }
  }
}
