import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { GstComplianceService } from '../../../proxy/finance/gst-compliance.service';
import { GstCreditOpeningDto } from '../../../proxy/finance/gst-compliance.models';
import { ArButton } from '../../../ui/button';

type Head = 'igst' | 'cgst' | 'sgst' | 'cess';
const HEADS: { key: Head; label: string }[] = [
  { key: 'igst', label: 'IGST' },
  { key: 'cgst', label: 'CGST' },
  { key: 'sgst', label: 'SGST' },
  { key: 'cess', label: 'Cess' },
];

/** The month before an MMYYYY period, as MMYYYY. */
export function previousPeriod(period: string): string {
  const month = Number(period.slice(0, 2));
  const year = Number(period.slice(2));
  return month === 1 ? `12${year - 1}` : `${String(month - 1).padStart(2, '0')}${year}`;
}

/** Rupees typed in ("1,250.50") to paise; null when it isn't an amount of zero or more. */
export function toPaise(text: string): number | null {
  const clean = text.replace(/[,\s₹]/g, '');
  if (clean === '') return 0;
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/**
 * The electronic credit ledger's opening balance for the month, copied from the GST portal. GSTR-3B's set-off uses it
 * before anything is paid in cash.
 */
@Component({
  selector: 'ar-credit-opening-panel',
  imports: [ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="co" aria-labelledby="co-h">
      <h4 id="co-h" class="co__title">Credit ledger opening balance</h4>
      <p class="co__lead">
        Credit left in the electronic credit ledger at the start of {{ label() }}, from the GST
        portal (Services → Ledgers → Electronic credit ledger). It is set off before any tax is paid
        in cash.
      </p>
      <div class="co__grid">
        @for (h of heads; track h.key) {
          <label class="ar-field">
            <span class="ar-field__label">{{ h.label }} (₹)</span>
            <input
              class="ar-field__input"
              inputmode="decimal"
              [class.ar-invalid]="!!errors()[h.key]"
              [attr.aria-invalid]="!!errors()[h.key]"
              [value]="values()[h.key]"
              [disabled]="busy()"
              (input)="setValue(h.key, $any($event.target).value)"
            />
            @if (errors()[h.key]; as e) {
              <small class="ar-field__error">{{ e }}</small>
            }
          </label>
        }
        <label class="ar-field co__note">
          <span class="ar-field__label">Note <span class="ar-field__opt">(optional)</span></span>
          <input
            class="ar-field__input"
            maxlength="200"
            placeholder="Portal ledger, 1st of the month"
            [value]="note()"
            [disabled]="busy()"
            (input)="note.set($any($event.target).value)"
          />
        </label>
      </div>
      @if (error(); as e) {
        <p class="ar-field__error" role="alert">{{ e }}</p>
      }
      <div class="co__actions">
        <button ar-button="primary" type="button" [disabled]="busy()" (click)="save()">
          {{ saved() ? 'Update' : 'Save' }}
        </button>
        <button ar-button="ghost" type="button" [disabled]="busy()" (click)="useLastMonth()">
          Use last month's carried-forward credit
        </button>
        @if (saved()) {
          <button ar-button="ghost" type="button" [disabled]="busy()" (click)="clear()">
            Remove
          </button>
        }
      </div>
    </section>
  `,
  styles: `
    .co {
      display: grid;
      gap: 10px;
      margin-top: 16px;
      padding: 14px 16px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 8px);
      min-width: 0;
    }
    .co__title {
      margin: 0;
    }
    .co__lead {
      margin: 0;
      max-width: 72ch;
      color: var(--ar-ink-500);
      font-size: 12.5px;
    }
    .co__grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 150px), 1fr));
      gap: 8px 12px;
    }
    .co__note {
      grid-column: 1 / -1;
    }
    .co__actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
})
export class ArCreditOpeningPanel {
  private readonly api = inject(GstComplianceService);

  /** MMYYYY. */
  readonly period = input.required<string>();
  /** "November 2026". */
  readonly label = input('');
  /** The balance was saved or removed: GSTR-3B should be read again. */
  readonly changed = output<void>();

  protected readonly heads = HEADS;
  protected readonly values = signal<Record<Head, string>>({
    igst: '',
    cgst: '',
    sgst: '',
    cess: '',
  });
  protected readonly errors = signal<Partial<Record<Head, string>>>({});
  protected readonly note = signal('');
  protected readonly saved = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    effect(() => void this.load(this.period()));
  }

  private async load(period: string): Promise<void> {
    this.error.set(null);
    this.errors.set({});
    try {
      const opening = await firstValueFrom(
        this.api.getCreditOpening(period, { skipHandleError: true }),
      );
      if (period !== this.period()) return;
      this.fill(opening);
      this.saved.set(!!opening);
    } catch {
      if (period === this.period()) this.error.set('The opening balance could not be loaded.');
    }
  }

  private fill(
    o:
      | (Pick<
          GstCreditOpeningDto,
          'igstInPaise' | 'cgstInPaise' | 'sgstInPaise' | 'cessInPaise'
        > & { note?: string })
      | null,
  ): void {
    const r = (p?: number) => (p ? (p / 100).toFixed(2) : '');
    this.values.set({
      igst: r(o?.igstInPaise),
      cgst: r(o?.cgstInPaise),
      sgst: r(o?.sgstInPaise),
      cess: r(o?.cessInPaise),
    });
    this.note.set(o?.note ?? '');
  }

  protected setValue(key: Head, value: string): void {
    this.values.update((v) => ({ ...v, [key]: value }));
  }

  protected async useLastMonth(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const last = await firstValueFrom(
        this.api.getGstr3bSummary(previousPeriod(this.period()), { skipHandleError: true }),
      );
      this.fill({ ...last.creditCarriedForward, note: 'Carried forward from last month' });
    } catch {
      this.error.set("Last month's GSTR-3B could not be read.");
    } finally {
      this.busy.set(false);
    }
  }

  protected async save(): Promise<void> {
    const v = this.values();
    const paise: Partial<Record<Head, number>> = {};
    const errors: Partial<Record<Head, string>> = {};
    for (const h of HEADS) {
      const amount = toPaise(v[h.key]);
      if (amount === null) errors[h.key] = 'Enter an amount in rupees, such as 1250.50.';
      else paise[h.key] = amount;
    }
    this.errors.set(errors);
    if (Object.keys(errors).length) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.setCreditOpening(
          {
            returnPeriod: this.period(),
            igstInPaise: paise.igst ?? 0,
            cgstInPaise: paise.cgst ?? 0,
            sgstInPaise: paise.sgst ?? 0,
            cessInPaise: paise.cess ?? 0,
            note: this.note().trim() || undefined,
          },
          { skipHandleError: true },
        ),
      );
      this.saved.set(true);
      this.changed.emit();
    } catch (e: unknown) {
      this.error.set(
        e instanceof Error && e.message ? e.message : 'The opening balance could not be saved.',
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async clear(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.clearCreditOpening(this.period(), { skipHandleError: true }));
      this.fill(null);
      this.saved.set(false);
      this.changed.emit();
    } catch {
      this.error.set('The opening balance could not be removed.');
    } finally {
      this.busy.set(false);
    }
  }
}
