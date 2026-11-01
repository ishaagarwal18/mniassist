import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  untracked,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AccountStore, CustomerAccount } from '../../core/services/account.store';
import { ContactService } from '../../core/services/contact.service';
import { BusinessCardService, DecisionRole } from '../../proxy/contacts';
import type { ContactDto, CreateUpdateContactDto } from '../../proxy/contacts/models';
import { ArButton } from '../../ui/button';
import { ArDialog } from '../../ui/dialog';
import { ArIcon } from '../../ui/icon';
import { parseVCards } from './vcard';
import { shrinkImage } from '../../core/util/image';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';

export interface ContactFormData {
  waId: string;
  displayName: string;
  designation: string;
  companyName: string;
  accountId: string;
  email: string;
  website: string;
  city: string;
  state: string;
  role: DecisionRole;
}

export const BLANK_CONTACT_FORM: ContactFormData = {
  waId: '',
  displayName: '',
  designation: '',
  companyName: '',
  accountId: '',
  email: '',
  website: '',
  city: '',
  state: '',
  role: DecisionRole.Maintenance,
};

@Component({
  selector: 'ar-contact-dialog',
  imports: [ArDialog, ArButton, ArIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-dialog.html',
  styleUrl: './contact-dialog.scss',
})
export class ArContactDialog {
  private readonly toasts = inject(ToastService);
  private readonly store = inject(ContactService);
  private readonly accountStore = inject(AccountStore);
  private readonly cards = inject(BusinessCardService);

  readonly open = model<boolean>(false);
  readonly contactId = input<string | null>(null);
  readonly preselectedAccountId = input<string | null>(null);

  readonly saved = output<ContactDto | void>();
  readonly dismissed = output<void>();

  protected readonly roles = [
    { value: DecisionRole.Maintenance, label: 'Maintenance' },
    { value: DecisionRole.Purchase, label: 'Purchase' },
    { value: DecisionRole.Engineering, label: 'Engineering' },
    { value: DecisionRole.PlantHead, label: 'Plant head' },
    { value: DecisionRole.Dealer, label: 'Dealer' },
  ];

  protected readonly saving = signal(false);
  protected readonly form = signal<ContactFormData>({ ...BLANK_CONTACT_FORM });
  protected readonly reading = signal<'card' | 'vcard' | null>(null);
  protected readonly filledFrom = signal<string | null>(null);
  protected readonly otherPhones = signal<string[]>([]);

  /** Available accounts for the dropdown */
  protected readonly accountChoices = computed(() =>
    [...this.accountStore.all()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  /** Currently selected account */
  protected readonly formAccount = computed<CustomerAccount | undefined>(() =>
    this.accountStore.all().find((a) => a.id === this.form().accountId),
  );

  constructor() {
    effect(() => {
      const isOpen = this.open();
      if (!isOpen) return;

      const id = this.contactId();
      const pId = this.preselectedAccountId();

      untracked(() => {
        this.filledFrom.set(null);
        this.otherPhones.set([]);

        if (id) {
          // Edit existing contact
          const c = this.store.contacts().find((item) => item.id === id);
          if (c) {
            const s = c.stored;
            this.form.set({
              waId: c.phoneE164.replace(/[^\d]/g, ''),
              displayName: c.name || '',
              designation: s?.designation ?? '',
              companyName: s?.companyName ?? c.company ?? '',
              accountId: s?.accountId ?? (pId || ''),
              email: s?.emailAddress ?? '',
              website: s?.website ?? '',
              city: s?.city ?? '',
              state: s?.state ?? '',
              role: (s?.role ?? DecisionRole.Maintenance) as DecisionRole,
            });
            return;
          }
        }

        // Create new contact
        const initialForm: ContactFormData = { ...BLANK_CONTACT_FORM };
        if (pId) {
          initialForm.accountId = pId;
          const matchedAcc = this.accountStore.all().find((a) => a.id === pId);
          if (matchedAcc) {
            initialForm.companyName = matchedAcc.name;
            initialForm.city = matchedAcc.city ?? '';
            initialForm.state = matchedAcc.state ?? '';
          }
        }
        this.form.set(initialForm);
      });
    });
  }

  protected patchText(key: Exclude<keyof ContactFormData, 'role'>, value: string): void {
    this.form.update((f) => {
      const next = { ...f, [key]: value };
      if (key === 'accountId') {
        const acc = this.accountStore.all().find((a) => a.id === value);
        if (acc) {
          next.companyName = acc.name;
          if (acc.city && !next.city) next.city = acc.city;
          if (acc.state && !next.state) next.state = acc.state;
        }
      }
      return next;
    });
  }

  protected patchRole(value: string): void {
    this.form.update((f) => ({ ...f, role: Number(value) as DecisionRole }));
  }

  /** A photo of a visiting card, read by the AI model into the form */
  protected async readCard(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.toasts.warning('Choose a photo of the card (JPEG or PNG).', 'Visiting card');
      return;
    }
    this.reading.set('card');
    try {
      const { base64, mediaType } = await shrinkImage(file);
      const card = await firstValueFrom(this.cards.read({ content: base64, mediaType }));
      const phones = card.phones ?? [];
      this.fill(
        {
          waId: phones[0] ?? '',
          displayName: card.name ?? '',
          designation: card.designation ?? '',
          companyName: card.company ?? '',
          email: card.email ?? '',
          website: card.website ?? '',
          city: card.city ?? '',
          state: card.state ?? '',
        },
        'the visiting card',
        phones.slice(1),
      );
      if (card.note) this.toasts.info(card.note, 'From the card');
    } catch {
      // server reason shown as toast by interceptor
    } finally {
      this.reading.set(null);
    }
  }

  /** A .vcf from a phone's "share contact": the first card fills the form */
  protected async readVcard(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;
    const cards = parseVCards(await file.text());
    if (cards.length === 0) {
      this.toasts.warning('No contact with a name or number was found in that file.', 'vCard');
      return;
    }
    const c = cards[0];
    this.fill(
      {
        waId: c.phone,
        displayName: c.name,
        designation: c.designation,
        companyName: c.company,
        email: c.email,
        website: c.website,
        city: c.city,
        state: c.state,
      },
      cards.length > 1
        ? `the first of ${cards.length} cards (use Import for all of them)`
        : 'the vCard',
      c.phones.slice(1),
    );
  }

  private fill(values: Partial<ContactFormData>, from: string, others: string[]): void {
    this.form.update((f) => {
      const next = { ...f };
      for (const [k, v] of Object.entries(values) as [keyof ContactFormData, string][]) {
        if (v && k !== 'role') {
          (next as Record<string, unknown>)[k] = k === 'waId' ? v.replace(/[^\d]/g, '') : v.trim();
        }
      }
      return next;
    });
    this.filledFrom.set(from);
    this.otherPhones.set(others);
  }

  protected close(): void {
    this.open.set(false);
    this.dismissed.emit();
  }

  protected async saveContact(): Promise<void> {
    const f = this.form();
    const waId = f.waId.replace(/[^\d]/g, '');
    if (waId.length < 10) {
      this.toasts.warning(
        'Enter the WhatsApp number in international format, e.g. 919821012345.',
        'Contact',
      );
      return;
    }

    this.saving.set(true);
    try {
      const attributes: Record<string, string> = {};
      if (f.website.trim()) attributes['website'] = f.website.trim();

      const editId = this.contactId();
      const account = this.formAccount();
      const payload: CreateUpdateContactDto = {
        waId,
        displayName: f.displayName.trim() || undefined,
        companyName: account ? account.name : f.companyName.trim() || undefined,
        accountId: account?.id ?? (f.accountId || null),
        designation: f.designation.trim() || undefined,
        emailAddress: f.email.trim() || null,
        city: f.city.trim() || undefined,
        state: f.state.trim() || undefined,
        role: f.role,
        attributes,
      };

      if (editId) {
        await this.store.update(editId, payload);
        this.toasts.success(`Contact "${f.displayName.trim() || waId}" updated.`);
      } else {
        await this.store.create(payload);
        this.toasts.success(`Contact "${f.displayName.trim() || waId}" created successfully.`);
      }

      this.open.set(false);
      this.saved.emit();
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The contact could not be saved.'), 'Contact');
    } finally {
      this.saving.set(false);
    }
  }
}
