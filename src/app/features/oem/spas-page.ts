import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { SpaListItemDto, SpaService, SpaStatus } from '../../proxy/oem/oem-pricing.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import { SPA_STATUS_TEXT, SPA_STATUS_TONE, rupees } from './oem.logic';

/** Special price agreements: OEM, customer, status, validity, the support approved and what is left. */
@Component({
  selector: 'ar-spas-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Special prices"
      subtitle="OEM special price agreements and what is left on them"
    >
      <a ar-button variant="ghost" routerLink="/oem/registrations">Deal registrations</a>
      @if (canCreate()) {
        <a ar-button variant="primary" icon="plus" routerLink="/oem/spa/new"
          >Request special price</a
        >
      }
    </ar-topbar>
    <div class="oe ar-scroll">
      @if (mock) {
        <ar-banner tone="teal">Special prices need the live API.</ar-banner>
      }
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <div class="oe__bar">
        <input
          class="ar-field__input"
          type="search"
          placeholder="Reference, OEM reference or part number"
          aria-label="Search special prices"
          [value]="filter()"
          (input)="filter.set($any($event.target).value)"
          (keyup.enter)="load()"
        />
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
        <label class="oe__check">
          <input
            type="checkbox"
            [checked]="expiring()"
            (change)="expiring.set($any($event.target).checked); load()"
          />
          Ending in the next 30 days
        </label>
        <button ar-button type="button" variant="ghost" (click)="load()">Search</button>
      </div>
      <ar-card [heading]="total() + ' special prices'">
        <table class="oe__table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">OEM</th>
              <th scope="col">Customer</th>
              <th scope="col" class="oe__num">Parts</th>
              <th scope="col" class="oe__num">Support approved</th>
              <th scope="col" class="oe__num">Left</th>
              <th scope="col">Valid to</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            @for (s of rows(); track s.id) {
              <tr>
                <td>
                  <a [routerLink]="['/oem/spa', s.id]">{{ s.reference }}</a>
                  @if (s.oemReference) {
                    <div class="oe__muted" translate="no">{{ s.oemReference }}</div>
                  }
                </td>
                <td translate="no">{{ s.supplierName }}</td>
                <td translate="no">
                  {{ s.customerName ?? 'Any party of the project' }}
                  @if (s.projectName) {
                    <div class="oe__muted">{{ s.projectName }}</div>
                  }
                </td>
                <td class="oe__num">{{ s.lineCount }}</td>
                <td class="oe__num">{{ rupees(s.approvedSupportInPaise) || '—' }}</td>
                <td class="oe__num">{{ s.remainingQty }}</td>
                <td [class.oe__warn]="soon(s)">
                  {{ s.validTo ? (s.validTo | date: 'd MMM yyyy') : '' }}
                  @if (soon(s)) {
                    <div class="oe__muted">in {{ s.daysToExpiry }} days</div>
                  }
                </td>
                <td>
                  <ar-chip [tone]="tone(s.status)">{{ statusText(s.status) }}</ar-chip>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" class="oe__muted">
                  No special prices. Request one from here, or from an enquiry.
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
export class ArSpasPage {
  private readonly api = inject(SpaService);
  private readonly permissions = inject(PermissionService);

  protected readonly mock = environment.useMockData;
  protected readonly canCreate = grantedPolicy('AutoReach.Spa.Create', this.permissions);
  protected readonly rows = signal<SpaListItemDto[]>([]);
  protected readonly total = signal(0);
  protected readonly filter = signal('');
  protected readonly status = signal<SpaStatus | null>(null);
  protected readonly expiring = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = Object.values(SpaStatus).filter(
    (v): v is SpaStatus => typeof v === 'number',
  );
  protected readonly rupees = rupees;

  constructor() {
    void this.load();
  }

  protected statusText(s: SpaStatus): string {
    return SPA_STATUS_TEXT[s];
  }

  protected tone(s: SpaStatus) {
    return SPA_STATUS_TONE[s];
  }

  protected soon(s: SpaListItemDto): boolean {
    return s.daysToExpiry !== null && s.daysToExpiry !== undefined && s.daysToExpiry <= 30;
  }

  protected async load(): Promise<void> {
    if (this.mock) return;
    try {
      const page = await firstValueFrom(
        this.api.getList({
          filter: this.filter() || null,
          status: this.status(),
          expiringWithinDays: this.expiring() ? 30 : null,
          maxResultCount: 200,
        }),
      );
      this.rows.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
    } catch (e) {
      this.error.set(readApiError(e, 'The special prices could not be loaded.'));
    }
  }
}
