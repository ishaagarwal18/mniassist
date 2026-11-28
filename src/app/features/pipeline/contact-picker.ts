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
 * Modern typeahead contact picker for enquiry and asset setup:
 * search directory by name, company, or WhatsApp number; choose with one click;
 * or quickly add a new contact without navigating away from the form.
 */
@Component({
  selector: 'ar-contact-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (chosen(); as c) {
      <div class="cp__chosen">
        <div class="cp__chosen-content">
          <div class="cp__chosen-avatar" aria-hidden="true">
            {{ getInitials(c.label) }}
          </div>
          <div class="cp__chosen-meta">
            <span class="cp__chosen-name">{{ getContactName(c.label) }}</span>
            @if (getContactCompany(c.label); as comp) {
              <span class="cp__chosen-co">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                  <path d="M9 22v-4h6v4"></path>
                </svg>
                {{ comp }}
              </span>
            }
          </div>
        </div>
        <button type="button" class="cp__clear" (click)="clear()" title="Pick a different contact">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          Change
        </button>
      </div>
    } @else {
      <div class="cp__search-wrap">
        <svg class="cp__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          class="ar-field__input cp__search-input"
          type="search"
          placeholder="Search contacts by name, company, or phone…"
          [value]="term()"
          (input)="onType($any($event.target).value)"
        />
        @if (searching()) {
          <div class="cp__spinner" aria-hidden="true"></div>
        }
      </div>

      @if (results().length) {
        <ul class="cp__list">
          @for (r of results(); track r.id) {
            <li>
              <button type="button" class="cp__row" (click)="choose(r)">
                <div class="cp__row-avatar" aria-hidden="true">{{ getInitials(r.label) }}</div>
                <div class="cp__row-info">
                  <span class="cp__row-name">{{ getContactName(r.label) }}</span>
                  @if (getContactCompany(r.label); as comp) {
                    <span class="cp__row-co">{{ comp }}</span>
                  }
                </div>
                <span class="cp__row-select-pill">Select</span>
              </button>
            </li>
          }
        </ul>
      } @else if (term().trim().length > 1 && !searching()) {
        <div class="cp__empty">
          <p class="cp__none">No existing contact matches “{{ term() }}”.</p>
        </div>
      }

      <!-- Not in Contacts yet: add them here rather than leaving the form. -->
      @if (canCreate() && !adding() && term().trim().length > 1 && !searching()) {
        <button type="button" class="cp__add" (click)="startAdd()">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add “{{ term().trim() }}” as a new contact
        </button>
      }

      @if (adding()) {
        <div class="cp__new" role="group" aria-label="New contact">
          <div class="cp__new-head">
            <span class="cp__new-title">Quick Add New Contact</span>
            <span class="cp__new-sub">Creates directory entry and attaches immediately</span>
          </div>
          <input
            class="ar-field__input"
            type="text"
            placeholder="Contact Name *"
            maxlength="128"
            aria-label="New contact's name"
            [value]="newName()"
            (input)="newName.set($any($event.target).value)"
          />
          <input
            class="ar-field__input"
            type="tel"
            placeholder="WhatsApp Phone (e.g. 919821012345) *"
            aria-label="New contact's WhatsApp number"
            [value]="newPhone()"
            (input)="newPhone.set($any($event.target).value)"
          />
          <input
            class="ar-field__input"
            type="text"
            placeholder="Company Name (optional)"
            maxlength="256"
            aria-label="New contact's company"
            [value]="newCompany()"
            (input)="newCompany.set($any($event.target).value)"
          />
          @if (addError(); as e) {
            <p class="cp__err" role="alert">{{ e }}</p>
          }
          <div class="cp__new-actions">
            <button type="button" class="cp__btn-cancel" (click)="adding.set(false)">Cancel</button>
            <button type="button" class="cp__save" [disabled]="saving()" (click)="saveNew()">
              {{ saving() ? 'Adding…' : 'Add & Attach' }}
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
      gap: 12px;
      padding: 10px 14px;
      border: 1px solid var(--ar-blue-200);
      background: var(--ar-blue-100);
      border-radius: 9px;
      transition: all 0.15s ease;
    }

    .cp__chosen-content {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .cp__chosen-avatar {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #2563EB;
      color: #FFFFFF;
      font-weight: 700;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cp__chosen-meta {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .cp__chosen-name {
      font-size: 13.5px;
      font-weight: 700;
      color: #1E293B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cp__chosen-co {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cp__clear {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #FFFFFF;
      border: 1px solid var(--ar-line-300);
      padding: 5px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: #2563EB;
      transition: all 0.12s ease;

      &:hover {
        background: var(--ar-blue-100);
        border-color: var(--ar-blue-200);
      }
    }

    /* Search Input Wrapper */
    .cp__search-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .cp__search-icon {
      position: absolute;
      left: 12px;
      color: #94A3B8;
      pointer-events: none;
    }

    .cp__search-input {
      padding-left: 36px !important;
      padding-right: 36px !important;
    }

    .cp__spinner {
      position: absolute;
      right: 12px;
      width: 14px;
      height: 14px;
      border: 2px solid var(--ar-line-200);
      border-top-color: #2563EB;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Autocomplete Dropdown List */
    .cp__list {
      list-style: none;
      margin: 6px 0 0;
      padding: 6px;
      border: 1px solid var(--ar-line-200);
      border-radius: 10px;
      max-height: 220px;
      overflow-y: auto;
      background: #FFFFFF;
      box-shadow: 0 10px 25px -5px rgba(16, 27, 48, 0.1), 0 8px 10px -6px rgba(16, 27, 48, 0.06);
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .cp__row {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      text-align: left;
      padding: 8px 10px;
      border: 0;
      border-radius: 7px;
      background: none;
      cursor: pointer;
      transition: background 0.12s ease;

      &:hover {
        background: var(--ar-bg-100);
      }
    }

    .cp__row-avatar {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--ar-blue-100);
      color: #2563EB;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .cp__row-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .cp__row-name {
      font-size: 13px;
      font-weight: 600;
      color: #1E293B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cp__row-co {
      font-size: 11.5px;
      color: #64748B;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cp__row-select-pill {
      font-size: 11px;
      font-weight: 600;
      color: #2563EB;
      background: var(--ar-blue-100);
      padding: 2px 8px;
      border-radius: 5px;
      opacity: 0;
      transition: opacity 0.12s ease;
    }

    .cp__row:hover .cp__row-select-pill {
      opacity: 1;
    }

    /* Empty and Add States */
    .cp__empty {
      padding: 10px 12px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      margin-top: 6px;
    }

    .cp__none {
      margin: 0;
      font-size: 12.5px;
      color: #64748B;
    }

    .cp__add {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 8px;
      padding: 6px 10px;
      border: 1px dashed var(--ar-blue-200);
      border-radius: 7px;
      background: var(--ar-blue-100);
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 600;
      color: #2563EB;
      transition: all 0.15s ease;

      &:hover {
        background: var(--ar-blue-100);
        border-color: var(--ar-blue-200);
      }
    }

    /* Quick Add Drawer Box */
    .cp__new {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 10px;
      padding: 14px;
      border: 1px solid var(--ar-blue-200);
      border-radius: 10px;
      background: var(--ar-bg-50);
    }

    .cp__new-head {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 4px;
    }

    .cp__new-title {
      font-size: 13px;
      font-weight: 700;
      color: #1E293B;
    }

    .cp__new-sub {
      font-size: 11.5px;
      color: #64748B;
    }

    .cp__new-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      align-items: center;
      margin-top: 4px;
    }

    .cp__btn-cancel {
      background: transparent;
      border: none;
      color: #64748B;
      font-size: 12.5px;
      font-weight: 500;
      cursor: pointer;
      padding: 4px 8px;

      &:hover {
        color: #1E293B;
      }
    }

    .cp__save {
      padding: 6px 14px;
      border: 0;
      border-radius: 7px;
      background: #2563EB;
      color: #FFFFFF;
      cursor: pointer;
      font-size: 12.5px;
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(37, 99, 235, 0.2);
      transition: all 0.12s ease;

      &:hover:not(:disabled) {
        background: #1D4ED8;
      }

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
    }

    .cp__err {
      margin: 0;
      font-size: 12px;
      color: #DC2626;
      font-weight: 500;
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

  /** Helpers for parsing contact labels */
  protected getContactName(label: string): string {
    const parts = label.split(/ — | · /);
    return parts[0] || label;
  }

  protected getContactCompany(label: string): string | null {
    const parts = label.split(/ — | · /);
    return parts.length > 1 ? parts.slice(1).join(' — ') : null;
  }

  protected getInitials(label: string): string {
    const name = this.getContactName(label).trim();
    if (!name) return '—';
    const parts = name.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

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
