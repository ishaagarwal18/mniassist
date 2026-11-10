import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AccountStore } from '../../core/services/account.store';
import {
  CustomerCreditDto,
  ReorderBuyerDto,
  ReorderBuyerRole,
  ReorderPortalService,
} from '../../proxy/reorder/reorder-portal.service';
import { ArButton, ArDialog } from '../../ui';
import { ArSelect } from '../../ui/select';
import { parseDays, parseRupees, rupees } from './reorder-logic';

/** The credit form as typed: rupees and days stay text until saved. */
interface CreditForm {
  limit: string;
  terms: string;
  overdue: string;
  onHold: boolean;
  reason: string;
}

/**
 * Who may do what on the re-order portal at one customer company: order directly, need approval above an amount, or approve the
 * company's held requests. Buyers belong together through their account.
 */
@Component({
  selector: 'ar-reorder-buyers',
  imports: [ArDialog, ArButton, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog title="Customer company: buyers and credit" (dismiss)="closed.emit()">
      <p class="rb__hint">
        Everyone at the same account sees the company's machines and requests. A buyer who needs
        approval waits for an approver there, who decides on their own re-order page. With no
        approver at the company, requests go straight to you.
      </p>
      <label class="ar-field" for="rb-account">
        <span class="ar-field__label">Company</span>
        <select
          required
          id="rb-account"
          class="ar-field__input"
          [value]="accountId()"
          (change)="choose($any($event.target).value)"
        >
          <option value="">Choose a company…</option>
          @for (row of accounts.rows(); track row.account.id) {
            <option [value]="row.account.id" [selected]="row.account.id === accountId()">
              {{ ' '.repeat(row.depth - 1) }}{{ row.account.name }}
            </option>
          }
        </select>
      </label>

      @if (loading()) {
        <p class="rb__hint">Loading…</p>
      } @else if (accountId() && buyers().length === 0) {
        <p class="rb__hint">No contacts at this company yet.</p>
      } @else {
        @for (b of buyers(); track b.contactId) {
          <div class="rb__row">
            <div class="rb__who">
              <b>{{ b.name }}</b>
              @if (b.waId) {
                <span class="ar-mono rb__soft">+{{ b.waId }}</span>
              }
              @if (b.hasPassword) {
                <span class="rb__soft"
                  >Signs in with a password ·
                  <button type="button" class="rb__link" (click)="clearPassword(b)">
                    Remove
                  </button></span
                >
              }
            </div>
            <label class="ar-field" [for]="'rb-role-' + b.contactId">
              <span class="ar-field__label">Role</span>
              <select
                required
                class="ar-field__input"
                [id]="'rb-role-' + b.contactId"
                [value]="b.role"
                (change)="edit(b.contactId, { role: $any($event.target).value })"
              >
                <option value="Orders">Orders directly</option>
                <option value="NeedsApproval">Needs approval</option>
                <option value="Approver">Approver</option>
              </select>
            </label>
            @if (b.role === 'NeedsApproval') {
              <label class="ar-field" [for]="'rb-limit-' + b.contactId">
                <span class="ar-field__label"
                  >Above ₹ <span class="ar-field__opt">(blank: always)</span></span
                >
                <input
                  class="ar-field__input"
                  inputmode="numeric"
                  [id]="'rb-limit-' + b.contactId"
                  [value]="b.approvalAboveInPaise ? b.approvalAboveInPaise / 100 : ''"
                  (change)="edit(b.contactId, { limit: $any($event.target).value })"
                />
              </label>
            }
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="saving() === b.contactId"
              (click)="save(b)"
            >
              {{
                saving() === b.contactId ? 'Saving…' : saved() === b.contactId ? 'Saved' : 'Save'
              }}
            </button>
          </div>
        }
      }
      @if (credit(); as c) {
        <h3 class="rb__h">Credit and payment terms</h3>
        <p class="rb__hint">
          Owes {{ money(c.owedInPaise) }} (from the ERP) · on order {{ money(c.onOrderInPaise) }}
          @if (c.overdueDays > 0) {
            · oldest invoice {{ c.overdueDays }} days overdue
          }
          @if (c.availableInPaise != null) {
            · {{ money(c.availableInPaise) }} available
          }
        </p>
        @for (p of c.problems; track p) {
          <p class="rb__warn">{{ p }}</p>
        }
        <div class="rb__credit">
          <label class="ar-field" for="rb-limit">
            <span class="ar-field__label"
              >Credit limit, ₹ <span class="ar-field__opt">(blank: none)</span></span
            >
            <input
              id="rb-limit"
              class="ar-field__input"
              inputmode="numeric"
              [value]="creditForm().limit"
              (input)="patchCredit({ limit: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="rb-terms">
            <span class="ar-field__label"
              >Payment terms, days <span class="ar-field__opt">(blank: advance)</span></span
            >
            <input
              id="rb-terms"
              class="ar-field__input"
              inputmode="numeric"
              [value]="creditForm().terms"
              (input)="patchCredit({ terms: $any($event.target).value })"
            />
          </label>
          <label class="ar-field" for="rb-overdue">
            <span class="ar-field__label"
              >Flag orders when overdue by, days
              <span class="ar-field__opt">(blank: never)</span></span
            >
            <input
              id="rb-overdue"
              class="ar-field__input"
              inputmode="numeric"
              [value]="creditForm().overdue"
              (input)="patchCredit({ overdue: $any($event.target).value })"
            />
          </label>
        </div>
        <label class="rb__check" for="rb-hold">
          <input
            id="rb-hold"
            type="checkbox"
            [checked]="creditForm().onHold"
            (change)="patchCredit({ onHold: $any($event.target).checked })"
          />
          On hold: flag every new order for a word with the customer
        </label>
        @if (creditForm().onHold) {
          <label class="ar-field" for="rb-hold-reason">
            <span class="ar-field__label"
              >Reason (staff only) <span class="ar-field__opt">optional</span></span
            >
            <input
              id="rb-hold-reason"
              class="ar-field__input"
              maxlength="256"
              [value]="creditForm().reason"
              (input)="patchCredit({ reason: $any($event.target).value })"
            />
          </label>
        }
        <p class="rb__hint">
          Orders outside these terms still reach you, flagged with why. The customer only hears that
          you'll be in touch. Orders paid up front aren't affected.
        </p>
        <div>
          <button
            ar-button
            type="button"
            variant="ghost"
            [disabled]="savingCredit()"
            (click)="saveCredit()"
          >
            {{ savingCredit() ? 'Saving…' : creditSaved() ? 'Saved' : 'Save terms' }}
          </button>
        </div>
      }
      @if (error(); as e) {
        <p class="rb__err" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="primary" (click)="closed.emit()">Done</button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .rb__hint {
      margin: 0;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .rb__row {
      display: grid;
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 0.8fr) auto;
      gap: 10px;
      align-items: end;
      padding-block: 8px;
      border-top: 1px solid var(--ar-line-200, #e5e7eb);
    }
    .rb__who {
      display: flex;
      flex-direction: column;
      min-width: 0;
      align-self: center;
    }
    .rb__soft {
      font-size: 12px;
      color: var(--ar-ink-500);
    }
    .rb__link {
      border: 0;
      background: none;
      padding: 0;
      color: var(--ar-teal-700, #0f766e);
      font: 500 12px var(--ar-font-sans);
      cursor: pointer;
    }
    .rb__h {
      margin: 10px 0 0;
      font: 600 13.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .rb__credit {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 10px;
    }
    .rb__check {
      display: flex;
      gap: 8px;
      align-items: center;
      font: 400 13px var(--ar-font-sans);
    }
    .rb__warn {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-amber-800, #92400e);
    }
    .rb__err {
      margin: 0;
      color: var(--ar-bad-600, #b42318);
      font: 500 12.5px var(--ar-font-sans);
    }
    @media (max-width: 560px) {
      .rb__row {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
    }
  `,
})
export class ArReorderBuyers implements OnInit {
  private readonly api = inject(ReorderPortalService);
  protected readonly accounts = inject(AccountStore);

  readonly closed = output<void>();
  /** Opens on this company when given (from its row on the Accounts screen). */
  readonly initialAccountId = input<string | null>(null);

  protected readonly accountId = signal('');

  ngOnInit(): void {
    const id = this.initialAccountId();
    if (id) void this.choose(id);
  }
  protected readonly buyers = signal<ReorderBuyerDto[]>([]);
  protected readonly loading = signal(false);
  protected readonly saving = signal<string | null>(null);
  protected readonly saved = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly limits = new Map<string, string>();

  protected readonly credit = signal<CustomerCreditDto | null>(null);
  protected readonly creditForm = signal<CreditForm>({
    limit: '',
    terms: '',
    overdue: '',
    onHold: false,
    reason: '',
  });
  protected readonly savingCredit = signal(false);
  protected readonly creditSaved = signal(false);

  protected money(paise: number): string {
    return rupees(paise);
  }

  protected patchCredit(p: Partial<CreditForm>): void {
    this.creditForm.update((f) => ({ ...f, ...p }));
    this.creditSaved.set(false);
  }

  private showCredit(c: CustomerCreditDto): void {
    this.credit.set(c);
    this.creditForm.set({
      limit: c.creditLimitInPaise != null ? String(c.creditLimitInPaise / 100) : '',
      terms: c.paymentTermsDays != null ? String(c.paymentTermsDays) : '',
      overdue: c.holdWhenOverdueDays != null ? String(c.holdWhenOverdueDays) : '',
      onHold: c.onHold,
      reason: c.holdReason ?? '',
    });
  }

  protected async saveCredit(): Promise<void> {
    const f = this.creditForm();
    const limit = parseRupees(f.limit);
    const terms = parseDays(f.terms);
    const overdue = parseDays(f.overdue);
    if (limit === undefined || terms === undefined || overdue === undefined) {
      this.error.set(
        'Enter the limit in rupees and the days as whole numbers up to 365, or leave them blank.',
      );
      return;
    }
    this.error.set(null);
    this.savingCredit.set(true);
    try {
      const input = {
        customerId: this.accountId(),
        creditLimitInPaise: limit,
        paymentTermsDays: terms,
        holdWhenOverdueDays: overdue,
        onHold: f.onHold,
        holdReason: f.onHold ? f.reason.trim() || null : null,
      };
      this.showCredit(await firstValueFrom(this.api.setCredit(input)));
      this.creditSaved.set(true);
    } catch {
      this.error.set("The terms couldn't be saved.");
    } finally {
      this.savingCredit.set(false);
    }
  }

  /** Removes a buyer's portal password: they use a link, or set a new one with a WhatsApp code. */
  protected async clearPassword(b: ReorderBuyerDto): Promise<void> {
    this.error.set(null);
    try {
      await firstValueFrom(this.api.clearPassword(b.contactId));
      this.buyers.update((list) =>
        list.map((x) => (x.contactId === b.contactId ? { ...x, hasPassword: false } : x)),
      );
    } catch {
      this.error.set(`${b.name}'s password couldn't be removed.`);
    }
  }

  protected async choose(accountId: string): Promise<void> {
    this.accountId.set(accountId);
    this.buyers.set([]);
    this.credit.set(null);
    this.error.set(null);
    if (!accountId) return;
    this.loading.set(true);
    try {
      const [buyers, credit] = await Promise.all([
        firstValueFrom(this.api.getBuyers(accountId)),
        firstValueFrom(this.api.getCredit(accountId)),
      ]);
      this.buyers.set(buyers);
      this.showCredit(credit);
    } catch {
      this.error.set("The company's buyers couldn't be loaded.");
    } finally {
      this.loading.set(false);
    }
  }

  protected edit(contactId: string, change: { role?: ReorderBuyerRole; limit?: string }): void {
    if (change.limit !== undefined) this.limits.set(contactId, change.limit);
    if (change.role) {
      this.buyers.update((list) =>
        list.map((b) => (b.contactId === contactId ? { ...b, role: change.role! } : b)),
      );
    }
    this.saved.set(null);
  }

  protected async save(b: ReorderBuyerDto): Promise<void> {
    this.error.set(null);
    const typed = this.limits.get(b.contactId);
    const limit = typed === undefined ? (b.approvalAboveInPaise ?? null) : parseRupees(typed);
    if (limit === undefined) {
      this.error.set('Enter the amount in rupees, e.g. 25000, or leave it blank.');
      return;
    }
    this.saving.set(b.contactId);
    try {
      const updated = await firstValueFrom(
        this.api.setBuyer({
          contactId: b.contactId,
          role: b.role,
          approvalAboveInPaise: limit,
        }),
      );
      this.buyers.update((list) => list.map((x) => (x.contactId === b.contactId ? updated : x)));
      this.limits.delete(b.contactId);
      this.saved.set(b.contactId);
    } catch {
      this.error.set(`${b.name}'s role couldn't be saved.`);
    } finally {
      this.saving.set(null);
    }
  }
}
