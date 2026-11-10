import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { PickerOption, PipelineStore } from '../../core/services/pipeline.service';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { ContactService as ContactApi } from '../../proxy/contacts/contact.service';

/**
 * A contact typeahead for the create dialogs: type a name, pick from the matches,
 * and the chosen contact's id is emitted. Kept deliberately small — the enquiry and
 * asset dialogs need to attach a contact and nothing more.
 */
@Component({
  selector: 'ar-contact-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chosen(); as c) {
      <div class="cp__chosen">
        <span>{{ c.label }}</span>
        <button type="button" class="cp__clear" (click)="clear()">change</button>
      </div>
    } @else {
      <input
        class="ar-field__input"
        type="search"
        placeholder="Search contacts by name or company"
        [value]="term()"
        (input)="onType($any($event.target).value)"
      />
      @if (results().length) {
        <ul class="cp__list">
          @for (r of results(); track r.id) {
            <li>
              <button type="button" class="cp__row" (click)="choose(r)">{{ r.label }}</button>
            </li>
          }
        </ul>
      } @else if (term().trim().length > 1 && !searching()) {
        <p class="cp__none">No contact matches “{{ term() }}”.</p>
      }
      <!-- Not in Contacts yet: add them here rather than leaving the form. -->
      @if (canCreate() && !adding() && term().trim().length > 1 && !searching()) {
        <button type="button" class="cp__add" (click)="startAdd()">
          + Add “{{ term().trim() }}” as a new contact
        </button>
      }
      @if (adding()) {
        <div class="cp__new" role="group" aria-label="New contact">
          <input
            class="ar-field__input"
            type="text"
            placeholder="Name"
            maxlength="128"
            aria-label="New contact's name"
            [value]="newName()"
            (input)="newName.set($any($event.target).value)"
          />
          <input
            class="ar-field__input"
            type="tel"
            placeholder="WhatsApp number, e.g. 919821012345"
            aria-label="New contact's WhatsApp number"
            [value]="newPhone()"
            (input)="newPhone.set($any($event.target).value)"
          />
          <input
            class="ar-field__input"
            type="text"
            placeholder="Company (optional)"
            maxlength="256"
            aria-label="New contact's company"
            [value]="newCompany()"
            (input)="newCompany.set($any($event.target).value)"
          />
          @if (addError(); as e) {
            <p class="cp__err" role="alert">{{ e }}</p>
          }
          <div class="cp__new-actions">
            <button type="button" class="cp__clear" (click)="adding.set(false)">Cancel</button>
            <button type="button" class="cp__save" [disabled]="saving()" (click)="saveNew()">
              {{ saving() ? 'Adding…' : 'Add and choose' }}
            </button>
          </div>
        </div>
      }
    }
  `,
  styles: `
    :host {
      display: block;
      position: relative;
    }
    .cp__chosen {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 8px 11px;
      border: 1px solid var(--ar-line-300);
      border-radius: var(--ar-radius-control);
      font: 400 13px var(--ar-font-sans);
    }
    .cp__clear {
      background: none;
      border: 0;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-blue-600);
    }
    .cp__list {
      list-style: none;
      margin: 4px 0 0;
      padding: 4px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      max-height: 180px;
      overflow-y: auto;
      background: var(--ar-white);
    }
    .cp__row {
      display: block;
      width: 100%;
      text-align: left;
      padding: 7px 9px;
      border: 0;
      border-radius: 4px;
      background: none;
      cursor: pointer;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cp__row:hover {
      background: var(--ar-bg-50);
    }
    .cp__add {
      display: block;
      margin-top: 6px;
      padding: 0;
      border: 0;
      background: none;
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-blue-600);
    }
    .cp__new {
      display: grid;
      gap: 6px;
      margin-top: 6px;
      padding: 10px;
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      background: var(--ar-bg-50);
    }
    .cp__new-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      align-items: center;
    }
    .cp__save {
      padding: 6px 12px;
      border: 0;
      border-radius: var(--ar-radius-control);
      background: var(--ar-primary);
      color: #fff;
      cursor: pointer;
      font: 500 12.5px var(--ar-font-sans);
    }
    .cp__save:disabled {
      opacity: 0.6;
      cursor: default;
    }
    .cp__err {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-red-600, #b91c1c);
    }
    .cp__none {
      margin: 6px 2px 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
  `,
})
export class ArContactPicker {
  private readonly store = inject(PipelineStore);
  private readonly contacts = inject(ContactApi);
  private readonly permissions = inject(PermissionService);

  /** Offer to add someone who isn't in Contacts yet. */
  protected readonly canCreate = grantedPolicy('AutoReach.Contacts.Create', this.permissions);
  protected readonly adding = signal(false);
  protected readonly saving = signal(false);
  protected readonly addError = signal<string | null>(null);
  protected readonly newName = signal('');
  protected readonly newPhone = signal('');
  protected readonly newCompany = signal('');

  /** What was typed goes where it fits: digits are the number, anything else the name. */
  protected startAdd(): void {
    const typed = this.term().trim();
    const digits = typed.replace(/[^\d]/g, '');
    const looksLikePhone =
      digits.length >= 8 && digits.length >= typed.replace(/\s/g, '').length - 2;
    this.newName.set(looksLikePhone ? '' : typed);
    this.newPhone.set(looksLikePhone ? digits : '');
    this.newCompany.set('');
    this.addError.set(null);
    this.adding.set(true);
  }

  protected async saveNew(): Promise<void> {
    const waId = this.newPhone().replace(/[^\d]/g, '');
    if (waId.length < 10) {
      this.addError.set('Enter the WhatsApp number with its country code, e.g. 919821012345.');
      return;
    }
    if (!this.newName().trim()) {
      this.addError.set('Enter their name.');
      return;
    }
    this.saving.set(true);
    this.addError.set(null);
    try {
      const name = this.newName().trim();
      const company = this.newCompany().trim();
      const created = await firstValueFrom(
        this.contacts.create({
          waId,
          displayName: name,
          companyName: company || undefined,
        }),
      );
      this.adding.set(false);
      this.choose({
        id: created.id!,
        label: [created.displayName ?? waId, created.companyName].filter((x) => !!x).join(' — '),
      });
    } catch (e: unknown) {
      this.addError.set(readApiError(e, 'The contact could not be added.'));
    } finally {
      this.saving.set(false);
    }
  }

  readonly picked = output<PickerOption | null>();
  /** A contact already chosen when the picker opens (e.g. the customer a page was opened for). */
  readonly initial = input<PickerOption | null>(null);
  /** Pick one after another (an audience's people): each pick is emitted and the search clears. */
  readonly multiple = input(false);

  protected readonly term = signal('');
  protected readonly results = signal<PickerOption[]>([]);
  protected readonly chosen = signal<PickerOption | null>(null);
  protected readonly searching = signal(false);

  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    effect(() => {
      const first = this.initial();
      if (first) untracked(() => this.chosen.set(first));
    });
  }

  protected onType(value: string): void {
    this.term.set(value);
    clearTimeout(this.timer);
    if (value.trim().length < 2) {
      this.results.set([]);
      return;
    }
    this.searching.set(true);
    this.timer = setTimeout(async () => {
      try {
        this.results.set(await this.store.searchContacts(value));
      } finally {
        this.searching.set(false);
      }
    }, 250);
  }

  protected choose(option: PickerOption): void {
    if (this.multiple()) {
      this.results.set([]);
      this.term.set('');
      this.picked.emit(option);
      return;
    }
    this.chosen.set(option);
    this.results.set([]);
    this.term.set('');
    this.picked.emit(option);
  }

  protected clear(): void {
    this.chosen.set(null);
    this.picked.emit(null);
  }
}
