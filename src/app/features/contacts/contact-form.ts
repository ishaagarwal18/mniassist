import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { Contact } from '../../core/models/contact.model';
import { AccountMasterDataService } from '../../core/services/account-master-data.service';
import { AccountStore, CustomerAccount } from '../../core/services/account.store';
import { ContactService } from '../../core/services/contact.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { shrinkImage } from '../../core/util/image';
import { ArTopbar } from '../../layout/topbar';
import {
  BusinessCardService,
  ContactService as ContactApi,
  DecisionRole,
} from '../../proxy/contacts';
import {
  CustomFieldDefinitionDto,
  CustomFieldEntity,
  CustomFieldService,
} from '../../proxy/contacts';
import { ArCustomFieldInputs } from './custom-field-inputs';
import {
  customFieldAttributes,
  customFieldProblems,
  customFieldValuesOf,
  sortFields,
} from './custom-field-values';
import { ArBanner } from '../../ui/banner';
import { ArButton } from '../../ui/button';
import { ArCard } from '../../ui/card';
import { ArChip } from '../../ui/chip';
import { ArIcon } from '../../ui/icon';
import {
  BLANK_CONTACT_DRAFT,
  ContactDraft,
  DECISION_ROLES,
  buildContactPayload,
  cleanWhatsAppNumber,
  syncAccountToDraft,
  validateContactDraft,
} from './contact-form.logic';
import { parseVCards } from './vcard';

@Component({
  selector: 'ar-contact-form',
  imports: [ArTopbar, ArButton, ArCard, ArBanner, ArIcon, ArChip, ArCustomFieldInputs],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ArContactForm implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(ContactService);
  private readonly api = inject(ContactApi);
  private readonly accountStore = inject(AccountStore);
  private readonly masterData = inject(AccountMasterDataService);
  private readonly cards = inject(BusinessCardService);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionService);

  protected readonly canCreate = grantedPolicy('AutoReach.Contacts.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Contacts.Update', this.permissions);

  protected readonly editingId = signal<string | null>(null);
  protected readonly isEdit = computed(() => !!this.editingId());

  /** What the person chose for the More details fold; null until they open or close it. */
  private readonly moreChoice = signal<boolean | null>(null);
  /** Open when editing, or once any of its fields has a value (typed, or filled from a card). */
  protected readonly moreOpen = computed(() => {
    const choice = this.moreChoice();
    if (choice !== null) return choice;
    const d = this.draft();
    return (
      this.isEdit() ||
      [d.companyName, d.accountId, d.website, d.city, d.state].some((v) => !!v?.trim())
    );
  });

  protected onMoreToggle(e: Event): void {
    const open = (e.target as HTMLDetailsElement).open;
    if (open !== this.moreOpen()) this.moreChoice.set(open);
  }
  protected readonly draft = signal<ContactDraft>({ ...BLANK_CONTACT_DRAFT });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly reading = signal<'card' | 'vcard' | null>(null);
  protected readonly filledFrom = signal<string | null>(null);
  protected readonly otherPhones = signal<string[]>([]);

  private editingStored?: Contact['stored'];

  private readonly customFieldApi = inject(CustomFieldService);
  /** The workspace's contact fields from Settings → Custom fields, in their set order. */
  protected readonly customFields = signal<CustomFieldDefinitionDto[]>([]);
  protected readonly customValues = signal<Record<string, string>>({});
  /** Shown once a save has been tried, so a new form does not open full of errors. */
  private readonly triedSave = signal(false);
  protected readonly customProblems = computed(() =>
    this.triedSave() ? customFieldProblems(this.customFields(), this.customValues()) : {},
  );

  protected patchCustom(key: string, value: string): void {
    this.customValues.update((v) => ({ ...v, [key]: value }));
    this.error.set(null);
  }

  /** Loads the field definitions, and on an edit the contact's stored values for them. */
  private async loadCustomFields(contactId: string | null): Promise<void> {
    try {
      const fields = sortFields(
        (
          await firstValueFrom(
            this.customFieldApi.getFor(CustomFieldEntity.Contact, { skipHandleError: true }),
          )
        ).items ?? [],
      );
      if (!fields.length) return;
      const attributes = contactId
        ? ((await firstValueFrom(this.api.get(contactId))).attributes ?? {})
        : {};
      this.customFields.set(fields);
      this.customValues.set(customFieldValuesOf(fields, attributes));
    } catch {
      // Custom fields are extra: the rest of the form still works without them.
    }
  }

  // Master Data collections for State & City
  protected readonly states = this.masterData.states;
  protected readonly availableCities = computed(() => {
    return this.masterData.getCitiesForState(this.draft().state);
  });

  // Accounts collection for dropdown
  protected readonly availableAccounts = computed(() =>
    [...this.accountStore.all()].sort((a, b) => a.name.localeCompare(b.name)),
  );

  protected readonly selectedAccount = computed<CustomerAccount | undefined>(() =>
    this.accountStore.all().find((a) => a.id === this.draft().accountId),
  );

  protected readonly roles = DECISION_ROLES;

  async ngOnInit(): Promise<void> {
    const routeId = this.route.snapshot.paramMap.get('id');
    const queryAccountId = this.route.snapshot.queryParamMap.get('accountId');

    void this.loadCustomFields(routeId);
    if (routeId) {
      this.editingId.set(routeId);
      await this.loadForEdit(routeId);
    } else if (queryAccountId) {
      const acc = this.accountStore.all().find((a) => a.id === queryAccountId);
      if (acc) {
        this.draft.update((d) => syncAccountToDraft(d, acc));
      } else {
        this.draft.update((d) => ({ ...d, accountId: queryAccountId }));
      }
    }
  }

  private async loadForEdit(id: string): Promise<void> {
    this.busy.set(true);
    try {
      // 1. Try loaded contacts signal
      let contact = this.store.contacts().find((c) => c.id === id);
      if (!contact) {
        // 2. Fetch directly from proxy
        const dto = await firstValueFrom(this.api.get(id));
        if (dto) {
          const attrs = dto.attributes ?? {};
          const matchedAcc = dto.accountId
            ? this.accountStore.all().find((a) => a.id === dto.accountId)
            : undefined;

          this.draft.set({
            waId: (dto.waId || '').replace(/[^\d]/g, ''),
            displayName: dto.displayName || '',
            designation: dto.designation || '',
            companyName: matchedAcc?.name ?? dto.companyName ?? '',
            accountId: dto.accountId || '',
            email: dto.emailAddress || '',
            website: (attrs['website'] as string) || '',
            city: dto.city || '',
            state: dto.state || '',
            role: (dto.role ?? DecisionRole.Maintenance) as DecisionRole,
          });
          return;
        }
      }

      if (contact) {
        const s = contact.stored;
        this.editingStored = s;
        const matchedAcc = s?.accountId
          ? this.accountStore.all().find((a) => a.id === s.accountId)
          : undefined;

        this.draft.set({
          waId: contact.phoneE164.replace(/[^\d]/g, ''),
          displayName: contact.name || '',
          designation: s?.designation ?? '',
          companyName: matchedAcc?.name ?? s?.companyName ?? contact.company ?? '',
          accountId: s?.accountId ?? '',
          email: s?.emailAddress ?? '',
          website: s?.website ?? '',
          city: s?.city ?? '',
          state: s?.state ?? '',
          role: (s?.role ?? DecisionRole.Maintenance) as DecisionRole,
        });
      }
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'Could not load contact details for editing.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected patch<K extends keyof ContactDraft>(key: K, value: ContactDraft[K]): void {
    this.draft.update((d) => {
      const next = { ...d, [key]: value };
      if (key === 'accountId') {
        const acc = this.accountStore.all().find((a) => a.id === value);
        return syncAccountToDraft(next, acc);
      }
      return next;
    });
    this.error.set(null);
  }

  protected patchRole(value: string): void {
    this.patch('role', Number(value) as DecisionRole);
  }

  /** Read visiting card photo via AI service */
  protected async readCard(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.warning('Choose a photo of the card (JPEG or PNG).', 'Visiting card');
      return;
    }

    this.reading.set('card');
    try {
      const { base64, mediaType } = await shrinkImage(file);
      const card = await firstValueFrom(this.cards.read({ content: base64, mediaType }));
      const phones = card.phones ?? [];

      this.applySmartFill(
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
        'visiting card photo',
        phones.slice(1),
      );

      if (card.note) {
        this.toast.info(card.note, 'From the card');
      }
    } catch (err: unknown) {
      this.toast.error(readApiError(err, 'Could not scan visiting card. Please enter manually.'));
    } finally {
      this.reading.set(null);
    }
  }

  /** Read vCard (.vcf) shared from mobile/desktop */
  protected async readVcard(event: Event): Promise<void> {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    inputEl.value = '';
    if (!file) return;

    const cards = parseVCards(await file.text());
    if (cards.length === 0) {
      this.toast.warning('No contact with a name or number was found in that file.', 'vCard');
      return;
    }

    const c = cards[0];
    this.applySmartFill(
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
      cards.length > 1 ? `first of ${cards.length} contacts in vCard` : 'vCard file',
      c.phones.slice(1),
    );
  }

  private applySmartFill(
    values: Partial<ContactDraft>,
    sourceName: string,
    otherNumbers: string[],
  ): void {
    this.draft.update((d) => {
      const next = { ...d };
      for (const [k, v] of Object.entries(values) as [keyof ContactDraft, unknown][]) {
        if (v && k !== 'role') {
          const strVal = String(v).trim();
          if (strVal) {
            (next as Record<string, unknown>)[k] =
              k === 'waId' ? cleanWhatsAppNumber(strVal) : strVal;
          }
        }
      }
      return next;
    });

    this.filledFrom.set(sourceName);
    this.otherPhones.set(otherNumbers);
    this.toast.success(`Populated fields from ${sourceName}. Verify each value before saving.`);
  }

  protected cancel(): void {
    void this.router.navigate(['/contacts']);
  }

  protected async save(): Promise<void> {
    const currentDraft = this.draft();
    this.triedSave.set(true);
    const customProblem = Object.values(
      customFieldProblems(this.customFields(), this.customValues()),
    )[0];
    const validationError = validateContactDraft(currentDraft) ?? customProblem ?? null;
    if (validationError) {
      this.error.set(validationError);
      this.toast.warning(validationError, 'Validation error');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const editId = this.editingId();
      const payload = buildContactPayload(
        currentDraft,
        this.editingStored,
        customFieldAttributes(this.customFields(), this.customValues()),
      );

      if (editId) {
        await this.store.update(editId, payload);
        this.toast.success(
          `Contact "${currentDraft.displayName.trim() || currentDraft.waId}" updated.`,
        );
      } else {
        await this.store.create(payload);
        this.toast.success(
          `Contact "${currentDraft.displayName.trim() || currentDraft.waId}" created successfully.`,
        );
      }

      void this.router.navigate(['/contacts']);
    } catch (e: unknown) {
      const msg = readApiError(e, 'The contact could not be saved.');
      this.error.set(msg);
      this.toast.error(msg, 'Save failed');
    } finally {
      this.busy.set(false);
    }
  }
}
