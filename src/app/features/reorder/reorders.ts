import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ArTopbar } from '../../layout/topbar';
import {
  ReorderApprovalDto,
  ReorderPortalService,
  ReorderPortalSettingsDto,
  ReorderRequestDto,
} from '../../proxy/reorder/reorder-portal.service';
import { ArButton, ArChip } from '../../ui';
import { ArGrid } from '../../ui/grid';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import type { ChipTone } from '../../ui/chip';
import { rupees } from './reorder-logic';
import { problem } from './reorder-pages';
import { SHIPMENT_STATE } from './shipping-logic';
import {
  ShipmentDto,
  ShipmentStatus,
  ShippingService,
} from '../../proxy/shipping/shipping.service';

const STATE: Record<string, { label: string; tone: ChipTone }> = {
  Draft: { label: 'To check and issue', tone: 'amber' },
  Issued: { label: 'Quoted / awaiting payment', tone: 'teal' },
  Revised: { label: 'Quoted', tone: 'teal' },
  Won: { label: 'Ordered', tone: 'good' },
  Lost: { label: 'Lost', tone: 'bad' },
  Expired: { label: 'Expired', tone: 'neutral' },
};

/**
 * The staff side of the spares re-order portal: what customers have sent, the portal's settings, and sending a customer their
 * personal link. Requests arrive as draft quotations for sales to check stock and delivery, then issue as usual.
 */
@Component({
  selector: 'ar-reorders',
  imports: [ArTopbar, ArButton, ArChip, RouterLink, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Re-orders"
      [subtitle]="subtitle()"
      help="Customers open a personal link from WhatsApp, confirm with a code sent to their number, and see their machines with the spares due, at their own prices. What they send arrives here as a draft quotation for you to check and issue."
    >
      @if (canSettings()) {
        <a ar-button variant="ghost" icon="settings" routerLink="/reorders/settings">
          Portal settings
        </a>
      }
      @if (canSend()) {
        <a ar-button variant="primary" icon="send" routerLink="/reorders/send">
          Send a re-order link
        </a>
      }
    </ar-topbar>

    <div class="ro ar-scroll">
      @if (error(); as e) {
        <p class="ro__err" role="alert">{{ e }}</p>
      }
      @if (settings(); as s) {
        @if (!s.included) {
          <p class="ro__banner">
            The re-order portal is an add-on. Ask your MNI Assist contact to switch it on for this
            workspace.
          </p>
        } @else if (!s.enabled) {
          <p class="ro__banner">
            The portal is off. Switch it on in Portal settings before sending links.
          </p>
        } @else if (!s.showsStock) {
          <p class="ro__hint">
            Customers don't see stock availability: stock isn't kept in MNI Assist.
            <a routerLink="/stock">Set up stock →</a>
          </p>
        }
      }

      @if (approvals().length) {
        <h2 class="ro__h">Waiting for the customer's approver</h2>
        <ejs-grid
          arGrid="reorder-approvals"
          [dataSource]="approvals()"
          aria-label="Waiting for approvals"
        >
          <e-columns>
            <e-column field="creationTime" headerText="Received" width="130">
              <ng-template #template let-a>{{ when(a.creationTime) }}</ng-template>
            </e-column>
            <e-column field="contactName" headerText="Buyer" width="160">
              <ng-template #template let-a>{{ a.contactName || 'Buyer' }}</ng-template>
            </e-column>
            <e-column field="companyName" headerText="Company" width="180">
              <ng-template #template let-a>{{ a.companyName || '—' }}</ng-template>
            </e-column>
            <e-column field="lineCount" headerText="Parts" textAlign="Right" width="100" />
            <e-column field="subtotalInPaise" headerText="Before GST" textAlign="Right" width="140">
              <ng-template #template let-a>{{ money(a.subtotalInPaise) }}</ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
        <h2 class="ro__h">Requests</h2>
      }

      @if (requests().length === 0) {
        <p class="ro__hint">
          No requests yet. Send a customer their link from here, or from their conversation in the
          inbox.
        </p>
      } @else {
        <ejs-grid
          arGrid="reorder-requests"
          [dataSource]="requests()"
          aria-label="Re-order requests"
        >
          <e-columns>
            <e-column field="creationTime" headerText="Received" width="130">
              <ng-template #template let-r>{{ when(r.creationTime) }}</ng-template>
            </e-column>
            <e-column field="contactName" headerText="Customer" width="180">
              <ng-template #template let-r>{{ r.contactName || 'Customer' }}</ng-template>
            </e-column>
            <e-column field="quotationReference" headerText="Quotation" width="160">
              <ng-template #template let-r>
                <a class="ar-mono" routerLink="/quotations">{{ r.quotationReference }}</a>
              </ng-template>
            </e-column>
            <e-column field="lineCount" headerText="Parts" textAlign="Right" width="90" />
            <e-column field="subtotalInPaise" headerText="Before GST" textAlign="Right" width="130">
              <ng-template #template let-r>{{ money(r.subtotalInPaise) }}</ng-template>
            </e-column>
            <e-column headerText="PO / delivery" width="180">
              <ng-template #template let-r>
                {{ r.poNumber || '—' }}
                @if (r.deliverySite) {
                  <span class="sub">{{ r.deliverySite }}</span>
                }
                @if (r.note) {
                  <span class="sub" translate="no">“{{ r.note }}”</span>
                }
              </ng-template>
            </e-column>
            <e-column field="state" headerText="Status" width="160">
              <ng-template #template let-r>
                <ar-chip [tone]="state(r.state).tone" [dot]="true">{{
                  state(r.state).label
                }}</ar-chip>
                @if (r.creditNote) {
                  <span class="sub ro__credit">Outside credit terms: {{ r.creditNote }}</span>
                }
              </ng-template>
            </e-column>
            <e-column headerText="Delivery" width="240">
              <ng-template #template let-r>
                @if (shipmentOf(r.quotationId); as s) {
                  <ar-chip [tone]="shipState(s.status).tone" [dot]="true">{{
                    shipState(s.status).label
                  }}</ar-chip>
                  <span class="sub"
                    >{{ s.carrier }} · <span class="ar-mono">{{ s.trackingNumber }}</span></span
                  >
                  @if (s.lastUpdate) {
                    <span class="sub">{{ s.lastUpdate }}</span>
                  }
                  @if (s.status !== 'Delivered') {
                    <span class="ro__acts">
                      @if (s.status === 'Dispatched') {
                        <button type="button" class="ro__act" (click)="setShipment(s, 'InTransit')">
                          In transit
                        </button>
                      }
                      <button type="button" class="ro__act" (click)="setShipment(s, 'Delivered')">
                        Delivered
                      </button>
                      <button type="button" class="ro__act" (click)="setShipment(s, 'Exception')">
                        Problem
                      </button>
                    </span>
                  }
                } @else if (r.state === 'Won') {
                  <a
                    ar-button
                    variant="ghost"
                    [routerLink]="['/reorders/dispatch', r.quotationId]"
                    [queryParams]="{ ref: r.quotationReference }"
                  >
                    Dispatch
                  </a>
                } @else {
                  —
                }
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .ro {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .ro__h {
      margin: 6px 0 0;
      font: 600 14px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ro__hint {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
      max-width: 75ch;
    }
    .ro__hint a {
      color: var(--ar-teal-700, #0f766e);
      font-weight: 600;
    }
    .ro__banner {
      margin: 0;
      padding: 10px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-amber-100, #fef3c7);
      color: var(--ar-amber-800, #92400e);
      font: 500 13px var(--ar-font-sans);
    }
    .ro__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    .tbl {
      overflow-x: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    th,
    td {
      padding: 8px 10px;
      border-top: 1px solid var(--ar-line-100, #eef0f2);
      text-align: left;
      vertical-align: top;
    }
    thead th {
      border-top: 0;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    td a {
      color: var(--ar-teal-700, #0f766e);
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
    }
    .sub {
      display: block;
      color: var(--ar-ink-500);
      font-size: 12px;
    }
    .ro__acts {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 2px;
    }
    .ro__act {
      border: 0;
      background: none;
      padding: 0 4px 0 0;
      color: var(--ar-teal-700, #0f766e);
      font: 500 12px var(--ar-font-sans);
      cursor: pointer;
    }
    .ro__credit {
      color: var(--ar-amber-800, #92400e);
      max-width: 40ch;
    }
    @media (max-width: 560px) {
      .ro {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArReorders {
  private readonly api = inject(ReorderPortalService);
  private readonly permissions = inject(PermissionService);
  protected readonly canSend = grantedPolicy('AutoReach.ReorderPortal.SendLinks', this.permissions);
  protected readonly canSettings = grantedPolicy(
    'AutoReach.ReorderPortal.Settings',
    this.permissions,
  );

  protected readonly settings = signal<ReorderPortalSettingsDto | null>(null);
  protected readonly requests = signal<ReorderRequestDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly shipments = signal<ShipmentDto[]>([]);
  private readonly shippingApi = inject(ShippingService);
  protected readonly approvals = signal<ReorderApprovalDto[]>([]);

  protected readonly subtitle = computed(() => {
    const open = this.requests().filter((r) => r.state === 'Draft').length;
    return `${open} request${open === 1 ? '' : 's'} to check · ${this.requests().length} in all`;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const [settings, requests, approvals] = await Promise.all([
        firstValueFrom(this.api.getSettings()),
        firstValueFrom(this.api.getRequests()),
        firstValueFrom(this.api.getApprovals()),
      ]);
      this.settings.set(settings);
      this.requests.set(requests);
      this.approvals.set(approvals);
      await this.loadShipping();
    } catch (e: unknown) {
      this.error.set(problem(e, 'Could not load re-orders.'));
    }
  }

  protected async loadShipping(): Promise<void> {
    try {
      this.shipments.set(await firstValueFrom(this.shippingApi.getShipments()));
    } catch {
      // Delivery is extra on this page: without it the requests still show.
    }
  }

  protected shipmentOf(quotationId: string): ShipmentDto | undefined {
    return this.shipments().find((s) => s.quotationId === quotationId);
  }

  protected shipState(s: ShipmentStatus): { label: string; tone: ChipTone } {
    return SHIPMENT_STATE[s] ?? { label: s, tone: 'neutral' };
  }

  protected async setShipment(s: ShipmentDto, status: ShipmentStatus): Promise<void> {
    this.error.set(null);
    try {
      const updated = await firstValueFrom(this.shippingApi.updateStatus(s.id, status));
      this.shipments.update((list) => list.map((x) => (x.id === s.id ? updated : x)));
    } catch (e: unknown) {
      this.error.set(problem(e, 'The delivery status could not be saved.'));
    }
  }

  protected state(s: string): { label: string; tone: ChipTone } {
    return STATE[s] ?? { label: s, tone: 'neutral' };
  }

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected when(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
