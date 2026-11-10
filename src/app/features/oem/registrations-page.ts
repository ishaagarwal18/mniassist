import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  DealRegistrationDto,
  DealRegistrationService,
  DealRegistrationStatus,
} from '../../proxy/oem/oem-pricing.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import { REG_STATUS_TEXT, REG_STATUS_TONE, rupees } from './oem.logic';

/** Deals registered with OEMs: who for, with which OEM, its reference and when it ends. */
@Component({
  selector: 'ar-registrations-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Deal registrations"
      subtitle="Deals registered with an OEM, so no other distributor quotes them"
    >
      <a ar-button variant="ghost" routerLink="/oem/spa">Special prices</a>
      @if (canCreate()) {
        <a ar-button variant="primary" icon="plus" routerLink="/oem/registrations/new"
          >Register a deal</a
        >
      }
    </ar-topbar>
    <div class="oe ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      <div class="oe__bar">
        <input
          class="ar-field__input"
          type="search"
          placeholder="Reference, OEM reference or products"
          aria-label="Search registrations"
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
        <button ar-button type="button" variant="ghost" (click)="load()">Search</button>
      </div>
      <ar-card [heading]="total() + ' registrations'">
        <table class="oe__table">
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">OEM</th>
              <th scope="col">Customer</th>
              <th scope="col">Products</th>
              <th scope="col" class="oe__num">Value</th>
              <th scope="col">Ends</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td>
                  <a [routerLink]="['/oem/registrations', r.id]">{{ r.reference }}</a>
                  @if (r.oemReference) {
                    <div class="oe__muted" translate="no">{{ r.oemReference }}</div>
                  }
                </td>
                <td translate="no">{{ r.supplierName }}</td>
                <td translate="no">
                  {{ r.customerName }}
                  @if (r.projectName) {
                    <div class="oe__muted">{{ r.projectName }}</div>
                  }
                </td>
                <td translate="no">{{ r.productsSummary }}</td>
                <td class="oe__num">{{ rupees(r.estimatedValueInPaise) }}</td>
                <td [class.oe__warn]="soon(r)">
                  {{ r.expiresOn ? (r.expiresOn | date: 'd MMM yyyy') : '' }}
                </td>
                <td>
                  <ar-chip [tone]="tone(r.status)">{{ statusText(r.status) }}</ar-chip>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" class="oe__muted">
                  No registrations. Register a deal from here, or from an enquiry.
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
export class ArRegistrationsPage {
  private readonly api = inject(DealRegistrationService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy('AutoReach.Spa.Create', this.permissions);
  protected readonly rows = signal<DealRegistrationDto[]>([]);
  protected readonly total = signal(0);
  protected readonly filter = signal('');
  protected readonly status = signal<DealRegistrationStatus | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly statuses = Object.values(DealRegistrationStatus).filter(
    (v): v is DealRegistrationStatus => typeof v === 'number',
  );
  protected readonly rupees = rupees;

  constructor() {
    void this.load();
  }

  protected statusText(s: DealRegistrationStatus): string {
    return REG_STATUS_TEXT[s];
  }

  protected tone(s: DealRegistrationStatus) {
    return REG_STATUS_TONE[s];
  }

  protected soon(r: DealRegistrationDto): boolean {
    return (
      r.status === DealRegistrationStatus.Approved &&
      r.daysToExpiry !== null &&
      r.daysToExpiry !== undefined &&
      r.daysToExpiry <= 30
    );
  }

  protected async load(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.api.getList({
          filter: this.filter() || null,
          status: this.status(),
          maxResultCount: 200,
        }),
      );
      this.rows.set(page.items ?? []);
      this.total.set(page.totalCount ?? 0);
    } catch (e) {
      this.error.set(readApiError(e, 'The registrations could not be loaded.'));
    }
  }
}
