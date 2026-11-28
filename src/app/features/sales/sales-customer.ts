import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { PickerOption } from '../../core/services/pipeline.service';
import { ContactService } from '../../proxy/contacts/contact.service';
import { CustomerAccountService } from '../../proxy/contacts/customer-account.service';
import type { ContactDto } from '../../proxy/contacts/models';
import { ArSelect } from '../../ui/select';
import { ArContactPicker } from '../pipeline/contact-picker';
import { EMPTY_PARTY, SalesParty, SalesPartyService, personName } from './sales-party';

export type SalesCustomerMode = 'account' | 'contact';

/** Whom a new sales document is for, as the customer chooser reports it. */
export interface SalesCustomerChoice {
  mode: SalesCustomerMode;
  /** The contact person (account mode) or the picked contact; null until chosen. */
  customer: PickerOption | null;
  /** The account chosen in account mode, even before its details load. */
  accountId: string | null;
  /** The account's GSTIN and addresses; EMPTY_PARTY when there is no account. */
  party: SalesParty;
}

interface AccountOption {
  id: string;
  name: string;
  place?: string;
}

/**
 * The customer fields of a new sales order, challan or invoice: an account (searched by name) and the contact person on it, or a contact
 * with no account. Each change reports the person and the account's party, from which the form fills its addresses.
 */
@Component({
  selector: 'ar-sales-customer',
  imports: [ArContactPicker, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'accountResults.set([])',
  },
  template: `
    <div class="sc__seg" role="radiogroup" aria-label="For an account or a contact">
      <button
        type="button"
        class="sc__seg-btn"
        role="radio"
        [attr.aria-checked]="mode() === 'account'"
        [class.sc__seg-btn--on]="mode() === 'account'"
        (click)="setMode('account')"
      >
        Account
      </button>
      <button
        type="button"
        class="sc__seg-btn"
        role="radio"
        [attr.aria-checked]="mode() === 'contact'"
        [class.sc__seg-btn--on]="mode() === 'contact'"
        (click)="setMode('contact')"
      >
        Contact
      </button>
    </div>

    <div class="sc__grid">
      @if (mode() === 'account') {
        <div class="ar-field">
          <span class="ar-field__label">Account <span class="sc__req">*</span></span>
          @if (account(); as a) {
            <div class="sc__chosen">
              <span translate="no">{{ a.name }}</span>
              <button type="button" class="sc__link" (click)="clearAccount()">change</button>
            </div>
          } @else {
            <div class="sc__pick">
              <input
                class="ar-field__input"
                type="search"
                autocomplete="off"
                placeholder="Search accounts by name"
                aria-label="Search accounts"
                [value]="accountTerm()"
                (input)="onAccountTerm($any($event.target).value)"
              />
              @if (accountResults().length) {
                <div class="sc__menu">
                  @for (r of accountResults(); track r.id) {
                    <button type="button" class="sc__opt" (click)="chooseAccount(r)">
                      <span translate="no">{{ r.name }}</span>
                      @if (r.place) {
                        <small>{{ r.place }}</small>
                      }
                    </button>
                  }
                </div>
              } @else if (accountTerm().trim().length > 1 && !accountSearching()) {
                <span class="ar-field__hint">No account matches “{{ accountTerm() }}”.</span>
              }
            </div>
          }
        </div>
        <div class="ar-field">
          <span class="ar-field__label">Contact person <span class="sc__req">*</span></span>
          @if (!account()) {
            <span class="ar-field__hint">Choose the account first.</span>
          } @else if (peopleLoading()) {
            <span class="ar-field__hint">Loading the account's people…</span>
          } @else if (peopleFailed()) {
            <span class="ar-field__hint">The account's people could not be loaded.</span>
          } @else if (people().length) {
            <select
              class="ar-field__input"
              aria-label="Contact person"
              (change)="choosePerson($any($event.target).value)"
            >
              @for (c of people(); track c.id) {
                <option [value]="c.id" [selected]="c.id === contactId()">{{ name(c) }}</option>
              }
            </select>
          } @else {
            <span class="ar-field__hint">
              This account has no people yet. Add a contact to it in Accounts first.
            </span>
          }
        </div>
      } @else {
        <div class="ar-field sc__wide">
          <span class="ar-field__label">Customer <span class="sc__req">*</span></span>
          <ar-contact-picker [initial]="picked()" (picked)="pickContact($event)" />
          @if (party().accountName; as a) {
            <span class="ar-field__hint">Account: {{ a }}</span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sc__seg {
      display: inline-flex;
      align-self: flex-start;
      background: var(--ar-bg-100);
      padding: 3px;
      border-radius: 8px;
      border: 1px solid var(--ar-line-200);
      gap: 2px;
    }
    .sc__seg-btn {
      padding: 6px 16px;
      background: transparent;
      border: 0;
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans, system-ui, sans-serif);
      color: #64748b;
      border-radius: 6px;
      transition: all 0.15s ease;
    }
    .sc__seg-btn:hover:not(.sc__seg-btn--on) {
      color: #1e293b;
      background: rgba(255, 255, 255, 0.5);
    }
    .sc__seg-btn--on {
      background: #ffffff;
      color: #2563eb;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }
    .sc__grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
      align-items: start;
    }
    .sc__wide {
      grid-column: 1 / -1;
    }
    .sc__req {
      color: var(--ar-bad-600);
    }
    .sc__chosen {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 36px;
      font: 600 13px var(--ar-font-sans);
    }
    .sc__link {
      padding: 0;
      background: none;
      border: 0;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
      text-decoration: underline;
    }
    .sc__pick {
      position: relative;
      min-width: 0;
    }
    .sc__pick > input {
      width: 100%;
    }
    .sc__menu {
      position: absolute;
      top: 100%;
      left: 0;
      z-index: 5;
      min-width: 100%;
      margin-top: 4px;
      padding: 4px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      box-shadow: var(--ar-shadow-pop);
    }
    .sc__opt {
      display: flex;
      gap: 10px;
      align-items: baseline;
      width: 100%;
      padding: 7px 8px;
      text-align: left;
      background: none;
      border: 0;
      cursor: pointer;
      border-radius: var(--ar-radius-control);
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-800);
    }
    .sc__opt small {
      color: var(--ar-ink-500);
    }
    .sc__opt:hover,
    .sc__opt:focus-visible {
      background: var(--ar-bg-100);
      outline: none;
    }
    @media (max-width: 760px) {
      .sc__grid {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class ArSalesCustomer {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly contactsApi = inject(ContactService);
  private readonly accountsApi = inject(CustomerAccountService);
  private readonly parties = inject(SalesPartyService);

  /** The customer to start with: a contact passed from Customer 360 or a list showing one customer. */
  readonly initialCustomer = input<PickerOption | null>(null);
  readonly changed = output<SalesCustomerChoice>();

  protected readonly name = personName;

  protected readonly mode = signal<SalesCustomerMode>('account');
  protected readonly account = signal<AccountOption | null>(null);
  protected readonly accountTerm = signal('');
  protected readonly accountResults = signal<AccountOption[]>([]);
  protected readonly accountSearching = signal(false);
  protected readonly people = signal<ContactDto[]>([]);
  protected readonly peopleLoading = signal(false);
  protected readonly peopleFailed = signal(false);
  /** The person on the account. */
  protected readonly contactId = signal('');
  /** The contact picked in Contact mode. */
  protected readonly picked = signal<PickerOption | null>(null);
  protected readonly party = signal<SalesParty>(EMPTY_PARTY);

  private readonly customer = computed<PickerOption | null>(() => {
    if (this.mode() === 'contact') return this.picked();
    const c = this.people().find((p) => p.id === this.contactId());
    return c?.id ? { id: c.id, label: personName(c) } : null;
  });

  private accountTimer?: ReturnType<typeof setTimeout>;
  private accountSeq = 0;
  private partySeq = 0;

  protected onDocumentClick(event: MouseEvent): void {
    if (this.accountResults().length && !this.elementRef.nativeElement.contains(event.target as Node)) {
      this.accountResults.set([]);
    }
  }

  protected setMode(mode: SalesCustomerMode): void {
    if (mode === this.mode()) return;
    this.partySeq++;
    this.mode.set(mode);
    this.account.set(null);
    this.people.set([]);
    this.contactId.set('');
    this.picked.set(null);
    this.peopleFailed.set(false);
    this.party.set(EMPTY_PARTY);
    this.emit();
  }

  protected onAccountTerm(value: string): void {
    this.accountTerm.set(value);
    clearTimeout(this.accountTimer);
    if (value.trim().length < 2) {
      this.accountResults.set([]);
      return;
    }
    this.accountTimer = setTimeout(() => void this.searchAccounts(value.trim()), 250);
  }

  private async searchAccounts(term: string): Promise<void> {
    const seq = ++this.accountSeq;
    this.accountSearching.set(true);
    try {
      const page = await firstValueFrom(
        this.accountsApi.getList(
          { filter: term, skipCount: 0, maxResultCount: 8 },
          { skipHandleError: true },
        ),
      );
      if (seq !== this.accountSeq) return;
      this.accountResults.set(
        (page.items ?? []).map((a) => ({
          id: a.id!,
          name: a.name ?? '',
          place: [a.city, a.state].filter(Boolean).join(', '),
        })),
      );
    } catch {
      if (seq === this.accountSeq) this.accountResults.set([]);
    } finally {
      if (seq === this.accountSeq) this.accountSearching.set(false);
    }
  }

  /** The account chosen: its people (one of them is the customer) and its addresses. */
  protected async chooseAccount(a: AccountOption, preferContactId?: string): Promise<void> {
    this.account.set(a);
    this.accountTerm.set('');
    this.accountResults.set([]);
    this.people.set([]);
    this.contactId.set('');
    this.peopleFailed.set(false);
    this.peopleLoading.set(true);
    this.party.set(EMPTY_PARTY);
    this.emit();
    const seq = ++this.partySeq;
    try {
      const [party, page] = await Promise.all([
        this.parties.forAccount(a.id),
        firstValueFrom(
          this.contactsApi.getList(
            { accountId: a.id, skipCount: 0, maxResultCount: 100 },
            { skipHandleError: true },
          ),
        ),
      ]);
      if (seq !== this.partySeq) return;
      if (!a.name && party.accountName) this.account.set({ ...a, name: party.accountName });
      const people = page.items ?? [];
      this.people.set(people);
      this.contactId.set((people.find((p) => p.id === preferContactId) ?? people[0])?.id ?? '');
      this.party.set(party);
      this.emit();
    } catch {
      if (seq === this.partySeq) this.peopleFailed.set(true);
    } finally {
      if (seq === this.partySeq) this.peopleLoading.set(false);
    }
  }

  protected clearAccount(): void {
    this.partySeq++;
    this.account.set(null);
    this.people.set([]);
    this.contactId.set('');
    this.peopleFailed.set(false);
    this.party.set(EMPTY_PARTY);
    this.emit();
  }

  protected choosePerson(id: string): void {
    this.contactId.set(id);
    this.emit();
  }

  protected async pickContact(c: PickerOption | null): Promise<void> {
    this.picked.set(c);
    const seq = ++this.partySeq;
    const party = c ? await this.parties.forContact(c.id) : EMPTY_PARTY;
    if (seq !== this.partySeq) return;
    this.party.set(party);
    this.emit();
  }

  private emit(): void {
    this.changed.emit({
      mode: this.mode(),
      customer: this.customer(),
      accountId: this.party().accountId ?? this.account()?.id ?? null,
      party: this.party(),
    });
  }
}
