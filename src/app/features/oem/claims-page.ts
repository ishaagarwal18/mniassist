import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { OemSettingsService, OemSupplierDto } from '../../proxy/oem/oem-pricing.service';
import {
  SpaAgeBand,
  SpaClaimListItemDto,
  SpaClaimService,
  SpaClaimStatus,
} from '../../proxy/oem/spa-claim.service';
import { ArBanner, ArButton, ArCard, ArChip, ArStatTile } from '../../ui';
import { AGE_BAND_TEXT, CLAIM_STATUS_TEXT, CLAIM_STATUS_TONE } from './claims.logic';
import { rupees } from './oem.logic';

/** Claims to OEMs: what was claimed, settled and is outstanding, and how old, by OEM, status and age band. */
@Component({
  selector: 'ar-claims-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, ArStatTile, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      help="Every claim to your OEMs, with what was claimed, settled and is still outstanding."
      title="OEM claims" subtitle="Special-price support claimed back from OEMs">
      <a ar-button variant="ghost" routerLink="/oem/spa">Special prices</a>
    </ar-topbar>
    <div class="oe ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <div class="oe__grid">
        <ar-stat-tile label="Outstanding" [value]="rupees(outstanding()) || '₹0'" />
        <ar-stat-tile
          label="Over 90 days"
          [value]="rupees(over90()) || '₹0'"
          [tone]="over90() > 0 ? 'bad' : 'neutral'"
        />
        <ar-stat-tile
          label="Lines not submitted after 7 days"
          [value]="late()"
          [tone]="late() > 0 ? 'bad' : 'neutral'"
        />
      </div>
      <div class="oe__bar">
        <select
          class="ar-field__input"
          aria-label="OEM"
          (change)="supplierId.set($any($event.target).value || null); load()"
        >
          <option value="">Every OEM</option>
          @for (o of oems(); track o.supplierId) {
            <option [value]="o.supplierId">{{ o.name }}</option>
          }
        </select>
        <select
          class="ar-field__input"
          aria-label="Status"
          (change)="
            status.set($any($event.target).value === '' ? null : +$any($event.target).value); load()
          "
        >
          <option value="">Any status</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ statusText(s) }}</option>
          }
        </select>
        <select
          class="ar-field__input"
          aria-label="Age"
          (change)="
            band.set($any($event.target).value === '' ? null : +$any($event.target).value); load()
          "
        >
          <option value="">Any age</option>
          @for (b of bands; track b) {
            <option [value]="b">{{ bandText(b) }}</option>
          }
        </select>
        <label class="oe__check">
          <input
            type="checkbox"
            [checked]="openOnly()"
            (change)="openOnly.set($any($event.target).checked); load()"
          />
          Open only
        </label>
      </div>
      <ar-card [heading]="rows().length + ' claims'">
        <table class="oe__table">
          <thead>
            <tr>
              <th scope="col">Claim</th>
              <th scope="col">OEM</th>
              <th scope="col">Period</th>
              <th scope="col" class="oe__num">Lines</th>
              <th scope="col" class="oe__num">Claimed</th>
              <th scope="col" class="oe__num">Settled</th>
              <th scope="col" class="oe__num">Outstanding</th>
              <th scope="col" class="oe__num">Age</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            @for (c of rows(); track c.id) {
              <tr>
                <td>
                  <a [routerLink]="['/oem/claims', c.id]">{{ c.reference }}</a>
                  @if (c.lateLines) {
                    <div class="oe__bad">{{ c.lateLines }} lines not submitted after 7 days</div>
                  }
                  @if (c.deadlineOn) {
                    <div class="oe__muted">
                      OEM deadline {{ c.deadlineOn | date: 'd MMM yyyy' }}
                    </div>
                  }
                </td>
                <td translate="no">{{ c.supplierName }}</td>
                <td>{{ c.periodFrom | date: 'MMM yyyy' }}</td>
                <td class="oe__num">{{ c.lineCount }}</td>
                <td class="oe__num">{{ rupees(c.claimedInPaise) }}</td>
                <td class="oe__num">{{ rupees(c.settledInPaise) }}</td>
                <td class="oe__num">{{ rupees(c.outstandingInPaise) }}</td>
                <td class="oe__num" [class.oe__bad]="c.ageBand === Band.Over90">
                  {{ c.ageDays }} d
                </td>
                <td>
                  <ar-chip [tone]="tone(c.status)">{{ statusText(c.status) }}</ar-chip>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="9" class="oe__muted">
                  No claims. They are made when an invoice with a claim-back special price is
                  issued.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </ar-card>
    </div>
  `,
  styleUrl: './oem-pages.scss',
})
export class ArClaimsPage {
  private readonly api = inject(SpaClaimService);
  private readonly oemsApi = inject(OemSettingsService);

  protected readonly rows = signal<SpaClaimListItemDto[]>([]);
  protected readonly oems = signal<OemSupplierDto[]>([]);
  protected readonly supplierId = signal<string | null>(null);
  protected readonly status = signal<SpaClaimStatus | null>(null);
  protected readonly band = signal<SpaAgeBand | null>(null);
  protected readonly openOnly = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = Object.values(SpaClaimStatus).filter(
    (v): v is SpaClaimStatus => typeof v === 'number',
  );
  protected readonly bands = Object.values(SpaAgeBand).filter(
    (v): v is SpaAgeBand => typeof v === 'number',
  );
  protected readonly Band = SpaAgeBand;
  protected readonly rupees = rupees;

  protected readonly outstanding = computed(() =>
    this.rows().reduce((n, c) => n + c.outstandingInPaise, 0),
  );
  protected readonly over90 = computed(() =>
    this.rows()
      .filter((c) => c.ageBand === SpaAgeBand.Over90)
      .reduce((n, c) => n + c.outstandingInPaise, 0),
  );
  protected readonly late = computed(() => this.rows().reduce((n, c) => n + c.lateLines, 0));

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    try {
      this.oems.set((await firstValueFrom(this.oemsApi.getList())).filter((o) => o.isOem));
    } catch {
      // The OEM filter is a convenience.
    }
    await this.load();
  }

  protected statusText(s: SpaClaimStatus): string {
    return CLAIM_STATUS_TEXT[s];
  }

  protected tone(s: SpaClaimStatus) {
    return CLAIM_STATUS_TONE[s];
  }

  protected bandText(b: SpaAgeBand): string {
    return AGE_BAND_TEXT[b];
  }

  protected async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList({
          supplierId: this.supplierId(),
          status: this.status(),
          ageBand: this.band(),
          openOnly: this.openOnly(),
          maxResultCount: 200,
        }),
      );
      this.rows.set(page.items ?? []);
    } catch (e) {
      this.error.set(readApiError(e, 'The claims could not be loaded.'));
    }
  }
}
