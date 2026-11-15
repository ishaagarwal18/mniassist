import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AccountMasterDataService } from '../../../core/services/account-master-data.service';
import { readApiError } from '../../../core/util/api-error';
import { WorkspaceProfileService } from '../../../proxy/business/workspace-profile.service';
import { Gstr1Section } from '../../../proxy/finance/finance-enums';
import type { GstAuditRegisterDto } from '../../../proxy/finance/gst-compliance.models';
import { GstComplianceService } from '../../../proxy/finance/gst-compliance.service';
import { ArButton } from '../../../ui';
import { ArDialog } from '../../../ui/dialog';
import {
  GST_RATES,
  RegisterEntryDraft,
  SECTIONS,
  entryProblem,
  isInterState,
  splitTax,
  toRegisterInput,
} from './register-entry.logic';

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Adds a document raised outside the app (an old invoice, one from Tally) to the GST register by hand. Documents made here
 * are recorded on their own; this is only for the rest. The tax is worked out from the rate and the place of supply.
 */
@Component({
  selector: 'ar-register-entry-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="Add a register entry"
      width="min(620px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <p class="re__note">
        For a document raised outside the app. Invoices issued here are added to the register on
        their own.
      </p>
      <div class="re">
        <label class="ar-field" for="re-number">
          <span class="ar-field__label">Document number</span>
          <input
            id="re-number"
            class="ar-field__input ar-mono"
            translate="no"
            maxlength="16"
            [value]="d().documentNumber"
            (input)="patch({ documentNumber: $any($event.target).value })"
          />
        </label>
        <label class="ar-field" for="re-date">
          <span class="ar-field__label">Document date</span>
          <input
            id="re-date"
            type="date"
            class="ar-field__input"
            [value]="d().documentDate"
            (change)="patch({ documentDate: $any($event.target).value })"
          />
        </label>
        <label class="ar-field re__wide" for="re-section">
          <span class="ar-field__label">GSTR-1 section</span>
          <select
            id="re-section"
            class="ar-field__input"
            (change)="patch({ section: +$any($event.target).value })"
          >
            @for (s of sections; track s.value) {
              <option [value]="s.value" [selected]="s.value === d().section">{{ s.label }}</option>
            }
          </select>
        </label>
        <label class="ar-field" for="re-gstin">
          <span class="ar-field__label">Customer GSTIN</span>
          <input
            id="re-gstin"
            class="ar-field__input ar-mono"
            translate="no"
            maxlength="15"
            placeholder="27ABCDE1234F1Z5"
            [value]="d().gstin"
            (input)="patch({ gstin: $any($event.target).value.toUpperCase() })"
          />
        </label>
        <label class="ar-field" for="re-name">
          <span class="ar-field__label">Customer legal name</span>
          <input
            id="re-name"
            class="ar-field__input"
            maxlength="200"
            [value]="d().legalName"
            (input)="patch({ legalName: $any($event.target).value })"
          />
        </label>
        <label class="ar-field" for="re-pos">
          <span class="ar-field__label">Place of supply</span>
          <select
            id="re-pos"
            class="ar-field__input"
            (change)="patch({ placeOfSupply: $any($event.target).value })"
          >
            <option value="" [selected]="!d().placeOfSupply">Choose</option>
            @for (s of states(); track s.code) {
              <option [value]="s.code" [selected]="s.code === d().placeOfSupply">
                {{ s.code }} · {{ s.name }}
              </option>
            }
          </select>
        </label>
        <label class="ar-field" for="re-rate">
          <span class="ar-field__label">GST rate</span>
          <select
            id="re-rate"
            class="ar-field__input"
            (change)="patch({ rate: $any($event.target).value })"
          >
            @for (r of rates; track r) {
              <option [value]="r" [selected]="r === d().rate">{{ r }}%</option>
            }
          </select>
        </label>
        <label class="ar-field" for="re-taxable">
          <span class="ar-field__label">Taxable value (₹)</span>
          <input
            id="re-taxable"
            class="ar-field__input"
            inputmode="decimal"
            [value]="d().taxable"
            (input)="patch({ taxable: $any($event.target).value })"
          />
        </label>
        <label class="ar-field" for="re-cess">
          <span class="ar-field__label">Cess (₹) <span class="ar-field__opt">optional</span></span>
          <input
            id="re-cess"
            class="ar-field__input"
            inputmode="decimal"
            [value]="d().cess"
            (input)="patch({ cess: $any($event.target).value })"
          />
        </label>
        <label class="re__check re__wide">
          <input
            type="checkbox"
            [checked]="d().reverseCharge"
            (change)="patch({ reverseCharge: $any($event.target).checked })"
          />
          Reverse charge applies (the buyer pays the tax)
        </label>
      </div>
      <p class="re__tax" role="status">
        @if (tax(); as t) {
          {{ t.inter ? 'Inter-state' : 'Within the state' }}:
          @if (t.inter) {
            IGST {{ money(t.igst) }}
          } @else {
            CGST {{ money(t.cgst) }} + SGST {{ money(t.sgst) }}
          }
          · invoice value {{ money(t.total) }}
        }
      </p>
      @if (error(); as e) {
        <p class="re__err" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="save()">
          {{ busy() ? 'Adding…' : 'Add to register' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .re {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .re__wide {
      grid-column: 1 / -1;
    }
    @media (max-width: 520px) {
      .re {
        grid-template-columns: 1fr;
      }
    }
    .re__note,
    .re__tax {
      margin: 0 0 10px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .re__tax {
      margin: 12px 0 0;
      color: var(--ar-ink-700);
    }
    .re__check {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    .re__err {
      margin: 8px 0 0;
      color: var(--ar-bad-600);
      font: 500 12.5px var(--ar-font-sans);
    }
  `,
})
export class ArRegisterEntryDialog {
  private readonly api = inject(GstComplianceService);
  private readonly masterData = inject(AccountMasterDataService);
  readonly closed = output<GstAuditRegisterDto | null>();

  protected readonly sections = SECTIONS;
  protected readonly rates = GST_RATES;
  protected readonly money = rupees;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly ownState = signal<string | null>(null);

  protected readonly d = signal<RegisterEntryDraft>({
    documentNumber: '',
    documentDate: new Date().toISOString().slice(0, 10),
    section: Gstr1Section.B2B_4A,
    gstin: '',
    legalName: '',
    placeOfSupply: '',
    reverseCharge: false,
    taxable: '',
    rate: '18',
    cess: '',
  });

  protected readonly states = computed(() =>
    this.masterData
      .states()
      .map((name) => ({ name, code: this.masterData.stateCode(name) }))
      .filter((s): s is { name: string; code: string } => !!s.code)
      .sort((a, b) => a.code.localeCompare(b.code)),
  );

  protected readonly tax = computed(() => {
    const d = this.d();
    const taxable = Math.round(Number(d.taxable.replace(/,/g, '') || '0') * 100);
    const cess = Math.round(Number(d.cess.replace(/,/g, '') || '0') * 100);
    if (!(taxable > 0) || !d.placeOfSupply) return null;
    const inter = isInterState(d, this.ownState());
    const t = splitTax(taxable, Number(d.rate), inter);
    return { inter, ...t, total: taxable + t.igst + t.cgst + t.sgst + cess };
  });

  constructor() {
    firstValueFrom(inject(WorkspaceProfileService).get({ skipHandleError: true }))
      .then((p) => this.ownState.set(p?.stateCode ?? null))
      .catch(() => undefined);
  }

  protected patch(change: Partial<RegisterEntryDraft>): void {
    this.d.update((d) => {
      const next = { ...d, ...change };
      // A GSTIN starts with its state code; a blank place of supply follows it.
      if ('gstin' in change && !d.placeOfSupply && /^\d{2}/.test(next.gstin))
        next.placeOfSupply = next.gstin.slice(0, 2);
      return next;
    });
    this.error.set(null);
  }

  protected async save(): Promise<void> {
    const problem = entryProblem(this.d());
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.busy.set(true);
    try {
      const saved = await firstValueFrom(
        this.api.create(toRegisterInput(this.d(), this.ownState()), { skipHandleError: true }),
      );
      this.closed.emit(saved);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The entry could not be added.'));
    } finally {
      this.busy.set(false);
    }
  }
}
