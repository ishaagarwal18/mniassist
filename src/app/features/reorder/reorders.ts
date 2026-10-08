import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { PickerOption } from '../../core/services/pipeline.service';
import { ArTopbar } from '../../layout/topbar';
import { TemplateCategory } from '../../proxy/messaging/template-category.enum';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { TemplateService } from '../../proxy/messaging/template.service';
import {
  ReorderApprovalDto,
  ReorderPortalService,
  ReorderPortalSettingsDto,
  ReorderRequestDto,
} from '../../proxy/reorder/reorder-portal.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import type { ChipTone } from '../../ui/chip';
import { ArContactPicker } from '../pipeline/contact-picker';
import { rupees } from './reorder-logic';
import { ArReorderBuyers } from './reorder-buyers';
import { ArReorderDispatch, ArReorderShippingSettings } from './reorder-shipping';
import { SHIPMENT_STATE } from './shipping-logic';
import {
  ShipmentDto,
  ShipmentStatus,
  ShippingService,
} from '../../proxy/shipping/shipping.service';
import { ArSendReorderLink } from './send-reorder-link';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();

const SEED: ReorderRequestDto[] = [
  {
    id: 'r1',
    contactId: 'c1',
    contactName: 'Kalyani Forge',
    enquiryId: 'e1',
    quotationId: 'q1',
    quotationReference: 'QT-2026-0418',
    state: 'Draft',
    lineCount: 3,
    subtotalInPaise: 18_450_00,
    poNumber: 'KF/PO/7781',
    deliverySite: 'Plant 2, Nashik',
    creationTime: hoursAgo(2),
  },
  {
    id: 'r2',
    contactId: 'c2',
    contactName: 'Precision Pumps',
    enquiryId: 'e2',
    quotationId: 'q2',
    quotationReference: 'QT-2026-0402',
    state: 'Won',
    lineCount: 1,
    subtotalInPaise: 4_200_00,
    creationTime: hoursAgo(50),
  },
];

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
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArContactPicker,
    ArSendReorderLink,
    ArReorderBuyers,
    ArReorderDispatch,
    ArReorderShippingSettings,
    RouterLink,
    ArSelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Re-orders"
      [subtitle]="subtitle()"
      help="Customers open a personal link from WhatsApp, confirm with a code sent to their number, and see their machines with the spares due, at their own prices. What they send arrives here as a draft quotation for you to check and issue."
    >
      @if (canSettings()) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="contacts"
          (click)="buyersOpen.set(true)"
        >
          Companies
        </button>
        <button ar-button type="button" variant="ghost" (click)="shippingOpen.set(true)">
          Shipping
        </button>
        <button ar-button type="button" variant="ghost" icon="settings" (click)="openSettings()">
          Portal settings
        </button>
      }
      @if (canSend()) {
        <button ar-button type="button" variant="primary" icon="send" (click)="pickOpen.set(true)">
          Send a re-order link
        </button>
      }
    </ar-topbar>

    <div class="ro ar-scroll">
      @if (error(); as e) {
        <p class="ro__err" role="alert">{{ e }}</p>
      }
      @if (notice(); as n) {
        <p class="ro__ok" role="status">{{ n }}</p>
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
        <div class="tbl">
          <table>
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Buyer</th>
                <th scope="col">Company</th>
                <th scope="col" class="num">Parts</th>
                <th scope="col" class="num">Before GST</th>
              </tr>
            </thead>
            <tbody>
              @for (a of approvals(); track a.id) {
                <tr>
                  <td>{{ when(a.creationTime) }}</td>
                  <td>{{ a.contactName || 'Buyer' }}</td>
                  <td>{{ a.companyName || '—' }}</td>
                  <td class="num">{{ a.lineCount }}</td>
                  <td class="num">{{ money(a.subtotalInPaise) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <h2 class="ro__h">Requests</h2>
      }

      @if (requests().length === 0) {
        <p class="ro__hint">
          No requests yet. Send a customer their link from here, or from their conversation in the
          inbox.
        </p>
      } @else {
        <div class="tbl">
          <table>
            <thead>
              <tr>
                <th scope="col">Received</th>
                <th scope="col">Customer</th>
                <th scope="col">Quotation</th>
                <th scope="col" class="num">Parts</th>
                <th scope="col" class="num">Before GST</th>
                <th scope="col">PO / delivery</th>
                <th scope="col">Status</th>
                <th scope="col">Delivery</th>
              </tr>
            </thead>
            <tbody>
              @for (r of requests(); track r.id) {
                <tr>
                  <td>{{ when(r.creationTime) }}</td>
                  <td>{{ r.contactName || 'Customer' }}</td>
                  <td>
                    <a class="ar-mono" routerLink="/quotations">{{ r.quotationReference }}</a>
                  </td>
                  <td class="num">{{ r.lineCount }}</td>
                  <td class="num">{{ money(r.subtotalInPaise) }}</td>
                  <td>
                    {{ r.poNumber || '—' }}
                    @if (r.deliverySite) {
                      <span class="sub">{{ r.deliverySite }}</span>
                    }
                    @if (r.note) {
                      <span class="sub">“{{ r.note }}”</span>
                    }
                  </td>
                  <td>
                    <ar-chip [tone]="state(r.state).tone" [dot]="true">{{
                      state(r.state).label
                    }}</ar-chip>
                    @if (r.creditNote) {
                      <span class="sub ro__credit">Outside credit terms: {{ r.creditNote }}</span>
                    }
                  </td>
                  <td>
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
                            <button
                              type="button"
                              class="ro__act"
                              (click)="setShipment(s, 'InTransit')"
                            >
                              In transit
                            </button>
                          }
                          <button
                            type="button"
                            class="ro__act"
                            (click)="setShipment(s, 'Delivered')"
                          >
                            Delivered
                          </button>
                          <button
                            type="button"
                            class="ro__act"
                            (click)="setShipment(s, 'Exception')"
                          >
                            Problem
                          </button>
                        </span>
                      }
                    } @else if (r.state === 'Won') {
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        (click)="
                          dispatchFor.set({ id: r.quotationId, reference: r.quotationReference })
                        "
                      >
                        Dispatch
                      </button>
                    } @else {
                      —
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    </div>

    @if (pickOpen()) {
      <ar-dialog title="Send a re-order link" (dismiss)="pickOpen.set(false)">
        <p class="ro__hint">
          Choose the customer. The link is personal and works for
          {{ settings()?.linkLifetimeDays ?? 7 }} days.
        </p>
        <ar-contact-picker (picked)="picked.set($event)" />
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="pickOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="!picked()"
            (click)="sendTo.set(picked()); pickOpen.set(false)"
          >
            Continue
          </button>
        </div>
      </ar-dialog>
    }

    @if (dispatchFor(); as d) {
      <ar-reorder-dispatch
        [quotationId]="d.id"
        [reference]="d.reference"
        [shiprocket]="shiprocketReady()"
        (closed)="dispatched($event)"
      />
    }

    @if (shippingOpen()) {
      <ar-reorder-shipping-settings (closed)="shippingOpen.set(false); loadShipping()" />
    }

    @if (buyersOpen()) {
      <ar-reorder-buyers (closed)="buyersOpen.set(false)" />
    }

    @if (sendTo(); as c) {
      <ar-send-reorder-link
        [contactId]="c.id"
        [contactName]="c.label"
        (closed)="sendTo.set(null)"
      />
    }

    @if (settingsOpen()) {
      <ar-dialog title="Re-order portal settings" (dismiss)="settingsOpen.set(false)">
        <label class="check" for="ro-on">
          <input
            id="ro-on"
            type="checkbox"
            [checked]="form().enabled"
            (change)="patch({ enabled: $any($event.target).checked })"
          />
          Portal on: customers can open their links and send requests
        </label>
        <fieldset class="mode">
          <legend>When a customer sends a request</legend>
          <label for="ro-mode-quote"
            ><input
              id="ro-mode-quote"
              type="radio"
              name="ro-mode"
              [checked]="(form().mode ?? 'SendForQuotation') === 'SendForQuotation'"
              (change)="patch({ mode: 'SendForQuotation' })"
            />
            <span
              ><b>Send for quotation</b>
              <small
                >A draft quotation for your team to check stock and delivery, then issue.</small
              ></span
            ></label
          >
          <label for="ro-mode-pay"
            ><input
              id="ro-mode-pay"
              type="radio"
              name="ro-mode"
              [disabled]="!settings()?.paymentsReady"
              [checked]="form().mode === 'OrderAndPay'"
              (change)="patch({ mode: 'OrderAndPay' })"
            />
            <span
              ><b>Order and pay</b>
              <small
                >The quotation is issued at once and the customer pays on a BillDesk link; paying
                marks it won and issues the stock. A request with a part that has no price goes to
                your team as a draft instead.</small
              >
              @if (!settings()?.paymentsReady) {
                <small class="mode__off"
                  >Needs payment links: payments on the plan and a BillDesk account that is set up
                  and switched on.</small
                >
              }
            </span></label
          >
        </fieldset>
        <label class="ar-field" for="ro-heading">
          <span class="ar-field__label">Heading on the page</span>
          <input
            required
            maxlength="128"
            id="ro-heading"
            class="ar-field__input"
            placeholder="Acme Drives · spares re-order"
            [value]="form().heading ?? ''"
            (input)="patch({ heading: $any($event.target).value })"
          />
        </label>
        <label class="ar-field" for="ro-intro">
          <span class="ar-field__label"
            >A line under it <span class="ar-field__opt">(delivery times, who to call)</span></span
          >
          <textarea
            id="ro-intro"
            class="ar-field__input"
            rows="2"
            [value]="form().intro ?? ''"
            (input)="patch({ intro: $any($event.target).value })"
          ></textarea>
        </label>
        <div class="grid">
          <label class="ar-field" for="ro-days">
            <span class="ar-field__label">Links work for (days)</span>
            <input
              required
              id="ro-days"
              class="ar-field__input"
              inputmode="numeric"
              [value]="form().linkLifetimeDays"
              (input)="patch({ linkLifetimeDays: +$any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="ro-min">
            <span class="ar-field__label"
              >Minimum order, ₹ <span class="ar-field__opt">(blank: none)</span></span
            >
            <input
              id="ro-min"
              class="ar-field__input"
              inputmode="numeric"
              [value]="minRupees()"
              (input)="minRupees.set($any($event.target).value)"
            />
          </label>
          <label class="ar-field" for="ro-limited">
            <span class="ar-field__label">“Limited stock” below</span>
            <input
              required
              id="ro-limited"
              class="ar-field__input"
              inputmode="numeric"
              [value]="form().limitedStockBelow"
              (input)="patch({ limitedStockBelow: +$any($event.target).value })"
            />
          </label>
        </div>
        <label class="check" for="ro-exact">
          <input
            id="ro-exact"
            type="checkbox"
            [disabled]="!settings()?.showsStock"
            [checked]="!!form().showExactStock"
            (change)="patch({ showExactStock: $any($event.target).checked })"
          />
          Show customers exact quantities (“12 in stock”) instead of in stock, limited or on order
        </label>
        <label class="check" for="ro-signin">
          <input
            id="ro-signin"
            type="checkbox"
            [checked]="!!form().passwordSignIn"
            (change)="patch({ passwordSignIn: $any($event.target).checked })"
          />
          Customers can also sign in with their WhatsApp number and a password
        </label>
        <label class="check" for="ro-catalogue">
          <input
            id="ro-catalogue"
            type="checkbox"
            [checked]="!!form().publicCatalogue"
            (change)="patch({ publicCatalogue: $any($event.target).checked })"
          />
          Public catalogue: anyone can look up your parts and send an enquiry
        </label>
        @if (form().publicCatalogue) {
          <label class="check" for="ro-catprices">
            <input
              id="ro-catprices"
              type="checkbox"
              [checked]="!!form().catalogueShowsPrices"
              (change)="patch({ catalogueShowsPrices: $any($event.target).checked })"
            />
            Show list prices in the public catalogue (otherwise “price on request”)
          </label>
          @if (settings()?.catalogueUrl) {
            <p class="ro__hint">
              Catalogue: <span class="ar-mono">{{ settings()?.catalogueUrl }}</span
              >. Enquiries arrive as quotation drafts from “Public catalogue”; the number isn't
              verified, so call before quoting.
            </p>
          }
        }
        @if (form().passwordSignIn && settings()?.signInUrl) {
          <p class="ro__hint">
            Sign-in page: <span class="ar-mono">{{ settings()?.signInUrl }}</span
            >. A customer sets a password with a code sent to their WhatsApp, or from their re-order
            page.
          </p>
        }
        <label class="ar-field" for="ro-linktpl">
          <span class="ar-field__label"
            >Link template
            <span class="ar-field__opt"
              >(outside the 24-hour window; a URL button whose dynamic part is the link's code, at
              most one body variable: the customer's name)</span
            ></span
          >
          <select
            id="ro-linktpl"
            class="ar-field__input"
            [value]="form().linkTemplateId ?? ''"
            (change)="patch({ linkTemplateId: $any($event.target).value || null })"
          >
            <option value="">None: send links only inside the window, or copy them</option>
            @for (t of linkTemplates(); track t.id) {
              <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
            }
          </select>
        </label>
        <label class="ar-field" for="ro-codetpl">
          <span class="ar-field__label"
            >Code template
            <span class="ar-field__opt"
              >(authentication category; blank uses the helpdesk sign-off template)</span
            ></span
          >
          <select
            id="ro-codetpl"
            class="ar-field__input"
            [value]="form().codeTemplateId ?? ''"
            (change)="patch({ codeTemplateId: $any($event.target).value || null })"
          >
            <option value="">Same as field sign-off</option>
            @for (t of authTemplates(); track t.id) {
              <option [value]="t.id">{{ t.name }} ({{ t.lang }})</option>
            }
          </select>
        </label>
        @if (dialogError(); as e) {
          <p class="ro__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="settingsOpen.set(false)">
            Cancel
          </button>
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy()"
            (click)="saveSettings()"
          >
            Save
          </button>
        </div>
      </ar-dialog>
    }
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
    .ro__ok {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-good-600, #067647);
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
    .check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
    }
    .mode {
      border: 0;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
      font: 400 13px/1.45 var(--ar-font-sans);
    }
    .mode legend {
      font: 600 13px var(--ar-font-sans);
      margin-bottom: 4px;
    }
    .mode label {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .mode small {
      display: block;
      color: var(--ar-ink-500);
    }
    .mode .mode__off {
      color: var(--ar-amber-700, #b54708);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 8px;
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
  private readonly templatesApi = inject(TemplateService);
  private readonly permissions = inject(PermissionService);
  protected readonly canSend = grantedPolicy('AutoReach.ReorderPortal.SendLinks', this.permissions);
  protected readonly canSettings = grantedPolicy(
    'AutoReach.ReorderPortal.Settings',
    this.permissions,
  );

  protected readonly settings = signal<ReorderPortalSettingsDto | null>(null);
  protected readonly requests = signal<ReorderRequestDto[]>([]);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly dialogError = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly pickOpen = signal(false);
  protected readonly picked = signal<PickerOption | null>(null);
  protected readonly sendTo = signal<PickerOption | null>(null);

  protected readonly settingsOpen = signal(false);
  protected readonly buyersOpen = signal(false);
  protected readonly shippingOpen = signal(false);
  protected readonly dispatchFor = signal<{ id: string; reference: string } | null>(null);
  protected readonly shipments = signal<ShipmentDto[]>([]);
  protected readonly shiprocketReady = signal(false);
  private readonly shippingApi = inject(ShippingService);
  protected readonly approvals = signal<ReorderApprovalDto[]>([]);
  protected readonly form = signal<ReorderPortalSettingsDto>({
    enabled: false,
    linkLifetimeDays: 7,
    limitedStockBelow: 5,
  });
  protected readonly minRupees = signal('');
  protected readonly linkTemplates = signal<{ id: string; name: string; lang: string }[]>([]);
  protected readonly authTemplates = signal<{ id: string; name: string; lang: string }[]>([]);

  protected readonly subtitle = computed(() => {
    const open = this.requests().filter((r) => r.state === 'Draft').length;
    return `${open} request${open === 1 ? '' : 's'} to check · ${this.requests().length} in all`;
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    if (environment.useMockData) {
      this.settings.set({
        enabled: true,
        linkLifetimeDays: 7,
        limitedStockBelow: 5,
        included: true,
        showsStock: true,
      });
      this.requests.set(SEED);
      return;
    }
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
    if (environment.useMockData) return;
    try {
      const [shipments, shipping] = await Promise.all([
        firstValueFrom(this.shippingApi.getShipments()),
        firstValueFrom(this.shippingApi.getSettings()),
      ]);
      this.shipments.set(shipments);
      this.shiprocketReady.set(!!shipping.shiprocketConnected);
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

  protected dispatched(s: ShipmentDto | null): void {
    this.dispatchFor.set(null);
    if (!s) return;
    this.shipments.update((list) => [s, ...list.filter((x) => x.id !== s.id)]);
    this.notice.set(
      `${s.quotationReference ?? 'The order'} dispatched with ${s.carrier}.` +
        (s.customerNotified ? ' The customer has been told on WhatsApp.' : ''),
    );
  }

  protected async setShipment(s: ShipmentDto, status: ShipmentStatus): Promise<void> {
    this.error.set(null);
    try {
      const updated = environment.useMockData
        ? { ...s, status }
        : await firstValueFrom(this.shippingApi.updateStatus(s.id, status));
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

  protected patch(p: Partial<ReorderPortalSettingsDto>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  protected async openSettings(): Promise<void> {
    const s = this.settings();
    if (s) this.form.set({ ...s });
    this.minRupees.set(s?.minimumOrderInPaise ? String(s.minimumOrderInPaise / 100) : '');
    this.dialogError.set(null);
    this.settingsOpen.set(true);
    if (environment.useMockData || this.linkTemplates().length) return;
    try {
      const all = await firstValueFrom(
        this.templatesApi.getList({ status: TemplateStatus.Approved, maxResultCount: 200 }),
      );
      const items = (all.items ?? []).map((t) => ({
        id: t.id!,
        name: t.name ?? 'Template',
        lang: t.languageCode ?? '',
        category: t.category,
      }));
      this.linkTemplates.set(items.filter((t) => t.category !== TemplateCategory.Authentication));
      this.authTemplates.set(items.filter((t) => t.category === TemplateCategory.Authentication));
    } catch {
      // The pickers stay empty; the rest of the settings still save.
    }
  }

  protected async saveSettings(): Promise<void> {
    const f = this.form();
    const minText = this.minRupees().trim().replace(/,/g, '');
    const min = minText === '' ? null : Math.round(Number(minText) * 100);
    if (min !== null && !(min >= 0)) {
      this.dialogError.set('Enter the minimum order in rupees, or leave it blank.');
      return;
    }
    if (
      !Number.isInteger(f.linkLifetimeDays) ||
      f.linkLifetimeDays < 1 ||
      f.linkLifetimeDays > 30
    ) {
      this.dialogError.set('Links can work for 1 to 30 days.');
      return;
    }
    if (!Number.isInteger(f.limitedStockBelow) || f.limitedStockBelow < 1) {
      this.dialogError.set('“Limited stock” needs a whole number of 1 or more.');
      return;
    }
    this.busy.set(true);
    this.dialogError.set(null);
    try {
      const input = { ...f, minimumOrderInPaise: min };
      this.settings.set(
        environment.useMockData ? input : await firstValueFrom(this.api.updateSettings(input)),
      );
      this.settingsOpen.set(false);
    } catch (e: unknown) {
      this.dialogError.set(problem(e, 'The settings could not be saved.'));
    } finally {
      this.busy.set(false);
    }
  }
}

function problem(e: unknown, fallback: string): string {
  return (e as { error?: { error?: { message?: string } } })?.error?.error?.message ?? fallback;
}
