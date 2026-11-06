import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { ArTopbar } from '../../../layout/topbar';
import {
  DeliveryChallanDto,
  DispatchDeliveryChallanDto,
} from '../../../proxy/sales/delivery-challan.models';
import { DeliveryChallanService } from '../../../proxy/sales/delivery-challan.service';
import { DeliveryChallanStatus, SalesExportFormat } from '../../../proxy/sales/sales-enums';
import { SalesInvoiceService } from '../../../proxy/sales/sales-invoice.service';
import { ArButton, ArChip, ArIcon } from '../../../ui';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../../ui/grid';
import { SALES_RECORD_STYLES, SalesRecordPage } from '../sales-record-page';
import {
  canDeliverChallan,
  canDispatchChallan,
  canInvoiceChallan,
  challanStatusLabel,
  challanStatusTone,
  challanTypeLabel,
  dispatchFormFor,
  toDispatchDto,
  validateDispatch,
} from '../sales-records.logic';
import { MOCK_CHALLANS } from './delivery-challans.mock';
import { ArSalesExport } from '../sales-export';

/**
 * One delivery challan on its own page (/sales/challans/<id>): purpose under GST Rule 55, transport, site address and the goods,
 * with the next step: dispatch a draft (the transport form opens on the page; `?dispatch=1` opens it at once), mark it delivered,
 * or bill it as a tax invoice (opens the invoice's page).
 */
@Component({
  selector: 'ar-delivery-challan-page',
  imports: [ArTopbar, ArButton, ArChip, ArIcon, ArSalesExport, DatePipe, ArGrid, GridModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="record() ? 'Delivery challan ' + record()!.challanNumber : 'Delivery challan'"
      [subtitle]="record()?.customerName ?? ''"
    />

    <div class="pf ar-scroll ar-scroll--bare">
      @if (loading()) {
        <p class="sr-muted">Loading the challan…</p>
      } @else if (problem(); as p) {
        <section class="pf__card pf__denied" role="alert">
          <ar-icon name="alert" [size]="20" />
          <div>
            <strong>{{ p }}</strong>
          </div>
          <button ar-button variant="ghost" type="button" (click)="back()">Go back</button>
        </section>
      } @else if (record(); as dc) {
        <div class="pf__form">
          <section class="pf__card">
            <div class="sr-head">
              <div>
                <span class="sr-label">Customer</span>
                <h2 translate="no">{{ dc.customerName }}</h2>
                @if (dc.customerAccountName) {
                  <span class="sr-muted" translate="no">{{ dc.customerAccountName }}</span>
                }
              </div>
              <ar-chip [tone]="tone(dc.status)">{{ label(dc.status) }}</ar-chip>
            </div>

            <div class="sr-facts">
              <div class="sr-box">
                <h3>Challan</h3>
                <dl>
                  <dt>Rule 55 purpose</dt>
                  <dd>{{ typeLabel(dc.type) }}</dd>
                  <dt>Challan date</dt>
                  <dd>{{ dc.challanDateUtc | date: 'dd MMM yyyy' }}</dd>
                  <dt>Sales order</dt>
                  <dd class="ar-mono">{{ dc.salesOrderNumber || 'Direct' }}</dd>
                  @if (dc.dispatchedAtUtc) {
                    <dt>Dispatched</dt>
                    <dd>{{ dc.dispatchedAtUtc | date: 'dd MMM yyyy' }}</dd>
                  }
                  @if (dc.deliveredAtUtc) {
                    <dt>Delivered</dt>
                    <dd>{{ dc.deliveredAtUtc | date: 'dd MMM yyyy' }}</dd>
                  }
                </dl>
              </div>
              <div class="sr-box">
                <h3>Transport</h3>
                <dl>
                  <dt>Transporter</dt>
                  <dd>{{ dc.transporterName || 'Self / Local Vehicle' }}</dd>
                  <dt>Vehicle number</dt>
                  <dd class="ar-mono">{{ dc.vehicleNumber || '—' }}</dd>
                  <dt>Lorry receipt (LR)</dt>
                  <dd class="ar-mono">{{ dc.lrNumber || '—' }}</dd>
                  <dt>e-Way Bill</dt>
                  <dd class="ar-mono">{{ dc.eWayBillNumber || '—' }}</dd>
                </dl>
              </div>
              <div class="sr-box">
                <h3>Delivery</h3>
                <dl>
                  <dt>Site address</dt>
                  <dd>{{ dc.shippingAddress || 'Not specified' }}</dd>
                  @if (dc.remarks) {
                    <dt>Remarks</dt>
                    <dd>{{ dc.remarks }}</dd>
                  }
                </dl>
              </div>
            </div>
          </section>

          <section class="pf__card" aria-labelledby="dc-lines">
            <header class="pf__head">
              <div>
                <h2 id="dc-lines">Consigned items</h2>
                <p>{{ dc.lines.length }} item(s).</p>
              </div>
            </header>
            <ejs-grid
              arGrid="delivery-challan-lines"
              [dataSource]="dc.lines"
              aria-label="Consigned items"
            >
              <e-columns>
                <e-column field="lineNumber" headerText="#" width="60" [textAlign]="'Right'"></e-column>
                <e-column field="partNumber" headerText="Part number & description" width="280">
                  <ng-template #template let-l>
                    <div>
                      <strong class="ar-mono">{{ l.partNumber }}</strong>
                      <span class="sr-sub block">{{ l.description }}</span>
                    </div>
                  </ng-template>
                </e-column>
                <e-column field="hsnCode" headerText="HSN code" width="120">
                  <ng-template #template let-l>
                    <span class="ar-mono">{{ l.hsnCode || '—' }}</span>
                  </ng-template>
                </e-column>
                <e-column field="quantity" headerText="Quantity" width="100" [textAlign]="'Right'">
                  <ng-template #template let-l>
                    <strong>{{ l.quantity }}</strong>
                  </ng-template>
                </e-column>
                <e-column field="unitOfMeasure" headerText="UOM" width="100">
                  <ng-template #template let-l>
                    {{ l.unitOfMeasure || 'NOS' }}
                  </ng-template>
                </e-column>
              </e-columns>
            </ejs-grid>
          </section>

          @if (dispatching()) {
            <section class="pf__card sr-form" aria-labelledby="dc-dispatch">
              <header class="pf__head">
                <span class="pf__step"><ar-icon name="send" [size]="13" /></span>
                <div>
                  <h2 id="dc-dispatch">Dispatch the consignment</h2>
                  <p>The vehicle and transport details printed on the challan.</p>
                </div>
              </header>
              <div class="pf__grid">
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="dc-transporter"
                    >Transporter <span class="pf__req">*</span></label
                  >
                  <input
                    id="dc-transporter"
                    class="ar-field__input"
                    placeholder="e.g. VRL Logistics, TCI Express"
                    [attr.aria-invalid]="!!err('transporter')"
                    [value]="dispatch().transporterName"
                    (input)="patchDispatch({ transporterName: $any($event.target).value })"
                  />
                  @if (err('transporter'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="dc-vehicle"
                    >Vehicle number <span class="pf__req">*</span></label
                  >
                  <input
                    id="dc-vehicle"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. MH 12 AB 1234"
                    [attr.aria-invalid]="!!err('vehicle')"
                    [value]="dispatch().vehicleNumber"
                    (input)="patchDispatch({ vehicleNumber: $any($event.target).value })"
                  />
                  @if (err('vehicle'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="dc-lr"
                    >LR / docket number <span class="ar-field__opt">optional</span></label
                  >
                  <input
                    id="dc-lr"
                    class="ar-field__input ar-mono"
                    placeholder="e.g. VRL-99210"
                    [value]="dispatch().lrNumber"
                    (input)="patchDispatch({ lrNumber: $any($event.target).value })"
                  />
                </div>
                <div class="ar-field pf__span2">
                  <label class="ar-field__label" for="dc-eway"
                    >GST e-Way Bill number
                    <span class="ar-field__opt">12 digits, optional</span></label
                  >
                  <input
                    id="dc-eway"
                    class="ar-field__input ar-mono"
                    inputmode="numeric"
                    placeholder="e.g. 281982736412"
                    [attr.aria-invalid]="!!err('eway')"
                    [value]="dispatch().eWayBillNumber"
                    (input)="patchDispatch({ eWayBillNumber: $any($event.target).value })"
                  />
                  @if (err('eway'); as e) {
                    <span class="pf__err">{{ e }}</span>
                  }
                </div>
              </div>
              <div class="sr-actions">
                <button ar-button variant="ghost" type="button" (click)="dispatching.set(false)">
                  Cancel
                </button>
                <button
                  ar-button
                  variant="primary"
                  type="button"
                  icon="check"
                  [disabled]="busy()"
                  (click)="submitDispatch(dc)"
                >
                  Confirm dispatch
                </button>
              </div>
            </section>
          }

          <footer class="pf__bar">
            <span class="pf__summary"></span>
            <button ar-button variant="ghost" type="button" (click)="back()">Back</button>
            <button ar-button variant="ghost" type="button" (click)="customer360(dc.customerId)">
              Customer 360
            </button>
            <ar-sales-export [fetch]="download" [fileName]="dc.challanNumber" hint="This challan" />
            @if (canDispatch(dc) && !dispatching()) {
              <button
                ar-button
                variant="primary"
                type="button"
                icon="send"
                (click)="openDispatch(dc)"
              >
                Dispatch consignment
              </button>
            }
            @if (canDeliver(dc)) {
              <button
                ar-button
                variant="ghost"
                type="button"
                icon="check"
                [disabled]="busy()"
                (click)="markDelivered(dc)"
              >
                Mark as delivered
              </button>
            }
            @if (canInvoice(dc)) {
              <button
                ar-button
                variant="primary"
                type="button"
                [disabled]="busy()"
                (click)="createInvoice(dc)"
              >
                Bill delivery (tax invoice)
              </button>
            }
          </footer>
        </div>
      }
    </div>
  `,
  styles: SALES_RECORD_STYLES,
})
export class ArDeliveryChallanPage extends SalesRecordPage<DeliveryChallanDto> {
  private readonly api = inject(DeliveryChallanService);

  /** The record as its printed PDF or an Excel workbook. */
  protected readonly download = (format: SalesExportFormat) =>
    this.api.download(this.record()!.id!, format, { skipHandleError: true });
  private readonly invoices = inject(SalesInvoiceService);

  protected readonly list = '/sales/challans';
  protected readonly noun = 'This delivery challan';
  protected readonly mockRecords = MOCK_CHALLANS;

  protected readonly label = challanStatusLabel;
  protected readonly tone = challanStatusTone;
  protected readonly typeLabel = challanTypeLabel;
  protected readonly canDispatch = canDispatchChallan;
  protected readonly canDeliver = canDeliverChallan;
  protected readonly canInvoice = canInvoiceChallan;

  protected readonly dispatching = signal(false);
  protected readonly dispatch = signal<DispatchDeliveryChallanDto>({});
  private readonly submitted = signal(false);
  private readonly errors = computed(() =>
    this.submitted() ? validateDispatch(this.dispatch()) : {},
  );

  constructor() {
    super();
    void this.load();
  }

  protected fetch(id: string) {
    return this.api.get(id, { skipHandleError: true });
  }

  protected override loaded(dc: DeliveryChallanDto): void {
    if (this.route.snapshot.queryParamMap.get('dispatch') && canDispatchChallan(dc))
      this.openDispatch(dc);
  }

  protected err(key: string): string | null {
    return this.errors()[key] ?? null;
  }

  protected patchDispatch(p: Partial<DispatchDeliveryChallanDto>): void {
    this.dispatch.update((f) => ({ ...f, ...p }));
  }

  protected openDispatch(dc: DeliveryChallanDto): void {
    this.submitted.set(false);
    this.dispatch.set(dispatchFormFor(dc));
    this.dispatching.set(true);
    setTimeout(() => document.getElementById('dc-transporter')?.focus());
  }

  protected async submitDispatch(dc: DeliveryChallanDto): Promise<void> {
    this.submitted.set(true);
    if (Object.keys(validateDispatch(this.dispatch())).length) return;
    const input = toDispatchDto(this.dispatch());
    const saved = await this.run(
      () => this.api.dispatch(dc.id!, input, { skipHandleError: true }),
      (cur) => ({
        ...cur,
        ...input,
        status: DeliveryChallanStatus.Dispatched,
        dispatchedAtUtc: new Date().toISOString(),
      }),
      (s) => `Challan ${s.challanNumber} dispatched.`,
      `${dc.challanNumber} could not be dispatched.`,
    );
    if (saved) this.dispatching.set(false);
  }

  protected markDelivered(dc: DeliveryChallanDto): void {
    void this.run(
      () => this.api.markDelivered(dc.id!, { skipHandleError: true }),
      (cur) => ({
        ...cur,
        status: DeliveryChallanStatus.Delivered,
        deliveredAtUtc: new Date().toISOString(),
      }),
      (s) => `Challan ${s.challanNumber} marked delivered.`,
      `${dc.challanNumber} could not be marked delivered.`,
    );
  }

  protected createInvoice(dc: DeliveryChallanDto): void {
    void this.open(
      () => this.invoices.createFromChallan(dc.id!, { skipHandleError: true }),
      '/sales/invoices',
      `An invoice could not be raised for ${dc.challanNumber}.`,
    );
  }
}
