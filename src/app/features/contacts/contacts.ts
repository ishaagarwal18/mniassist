import { ContactExportService } from '../../proxy/contacts/contact-export.service';
import { PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { grantedPolicy } from '../../core/auth/permission';
import { AccountStore } from '../../core/services/account.store';
import { ContactService } from '../../core/services/contact.service';
import { ConsentSource, Contact, Segment } from '../../core/models/contact.model';
import { DecisionRole } from '../../proxy/contacts';
import { count } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArButton } from '../../ui/button';
import { ArChip, ChipTone } from '../../ui/chip';
import { ArDialog } from '../../ui/dialog';
import { ArIcon } from '../../ui/icon';
import { ArSearchBox } from '../../ui/search-box';
import { ArGrid } from '../../ui/grid';
import { ArSelect } from '../../ui/select';
import { ArSendReorderLink } from '../reorder/send-reorder-link';
import { ArContactImport } from './contact-import-dialog';
import { ArContactDialog } from './contact-dialog';
import { parseVCards } from './vcard';
import { compactCount, segmentIcon, suppressionIcon } from './contacts-segments.logic';
import { BusinessCardService } from '../../proxy/contacts';
import { shrinkImage } from '../../core/util/image';
import { persistedToggle } from '../../core/util/persisted-toggle';
import { firstValueFrom } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ConfirmService } from '../../core/ui/confirm.service';

const CONSENT_LABEL: Record<ConsentSource, string> = {
  website: 'Website form',
  whatsapp_optin: 'WhatsApp opt-in',
  import: 'Imported — signed form',
  ctwa: 'Click-to-WhatsApp',
  qr: 'Exhibition QR',
  manual: 'Dealer agreement',
  api: 'API',
  email_optin: 'Email opt-in',
  sms_optin: 'SMS opt-in',
  voice_optin: 'Call opt-in',
  instagram: 'Instagram message',
  messenger: 'Messenger message',
  consent_manager: 'Consent Manager',
  lead_ad: 'Facebook / Instagram lead form',
};

/** Import-sourced consent is the weakest evidence and the most common cause of
 *  a quality downgrade, so it is toned to stand out in the table. */
const CONSENT_TONE: Record<ConsentSource, ChipTone> = {
  website: 'good',
  whatsapp_optin: 'good',
  qr: 'teal',
  ctwa: 'amber',
  manual: 'neutral',
  api: 'neutral',
  import: 'warn',
  email_optin: 'good',
  sms_optin: 'good',
  voice_optin: 'good',
  instagram: 'teal',
  messenger: 'teal',
  consent_manager: 'good',
  lead_ad: 'good',
};

interface ContactForm {
  waId: string;
  displayName: string;
  designation: string;
  companyName: string;
  /** The company account; while one is chosen the company is its name. */
  accountId: string;
  email: string;
  website: string;
  city: string;
  state: string;
  role: DecisionRole;
}

const EMPTY_FORM: ContactForm = {
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
  selector: 'ar-contacts',
  imports: [
    ArTopbar,
    ArSearchBox,
    ArChip,
    ArButton,
    ArSendReorderLink,
    ArSelect,
    ArGrid,
    GridModule,
    ArIcon,
    ArContactImport,
    ArContactDialog,
    RouterLink,
    DatePipe,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class ArContacts {
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly permissions = inject(PermissionService);
  private readonly store = inject(ContactService);
  private readonly accountStore = inject(AccountStore);
  private readonly cards = inject(BusinessCardService);

  protected readonly canCreate = grantedPolicy('AutoReach.Contacts.Create', this.permissions);
  protected readonly canUpdate = grantedPolicy('AutoReach.Contacts.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Contacts.Delete', this.permissions);
  protected readonly canImport = grantedPolicy('AutoReach.Contacts.Import', this.permissions);
  protected readonly canExport = grantedPolicy('AutoReach.Contacts.Export', this.permissions);
  private readonly exportApi = inject(ContactExportService);
  protected readonly exporting = signal(false);

  /** Queues the server-side export of every contact (the grid's own export only has the rows on screen). */
  protected async requestExport(): Promise<void> {
    this.exporting.set(true);
    try {
      const req = await firstValueFrom(
        this.exportApi.request({ filter: this.query().trim() || null }, { skipHandleError: true }),
      );
      this.exportToasts.success(
        'The export has started. You will be notified when the file is ready.',
        'Export',
      );
      if (req.id) void this.exportRouter.navigate(['/contacts/exports', req.id]);
    } catch (e: unknown) {
      this.exportToasts.error(readApiError(e, 'The export could not be started.'), 'Export');
    } finally {
      this.exporting.set(false);
    }
  }
  private readonly exportToasts = inject(ToastService);
  private readonly exportRouter = inject(Router);
  /** Customer 360: orders, challans, invoices, tickets and machines for one contact. */
  protected readonly canView360 = grantedPolicy('AutoReach.Customer360', this.permissions);
  /** Spares re-order portal: send a customer their personal link from their row. */
  protected readonly canReorder = grantedPolicy(
    'AutoReach.ReorderPortal.SendLinks',
    this.permissions,
  );
  protected readonly reorderFor = signal<{ id: string; name: string } | null>(null);
  protected readonly editingContactId = signal<string | null>(null);

  protected readonly segments = this.store.segments;
  protected readonly suppression = this.store.suppression;
  protected readonly loading = this.store.loading;
  /** The contacts grid, for the Filter button's filter row. */
  private readonly grid = viewChild(ArGrid);
  protected readonly filterRow = signal(false);

  protected toggleFilterRow(): void {
    const on = !this.filterRow();
    this.filterRow.set(on);
    this.grid()?.setFilterRow(on);
  }
  protected readonly loadError = this.store.loadError;
  protected readonly suppressionLoading = this.store.suppressionLoading;
  protected readonly suppressionError = this.store.suppressionError;

  protected retry(): void {
    this.store.reload();
  }

  protected afterContactSaved(): void {
    this.store.reload();
  }

  constructor() {
    // Consent may have changed in Customer 360 while this singleton store remained alive.
    this.store.reload();
  }
  protected readonly activeSegment = signal('amc60');
  protected readonly query = signal('');

  // Advanced Filters
  protected readonly roleFilter = signal('');
  protected readonly consentFilter = signal('');
  protected readonly amcFilter = signal('');
  protected readonly scoreFilter = signal('');
  protected readonly filterDrawerOpen = signal(false);

  // Quick Preview Drawer
  protected readonly previewDrawerOpen = signal(false);
  protected readonly previewContact = signal<Contact | null>(null);

  protected readonly activeFilterCount = computed(() => {
    let cnt = 0;
    if (this.roleFilter()) cnt++;
    if (this.consentFilter()) cnt++;
    if (this.amcFilter()) cnt++;
    if (this.scoreFilter()) cnt++;
    if (this.accountId()) cnt++;
    return cnt;
  });

  protected clearAdvancedFilters(): void {
    this.roleFilter.set('');
    this.consentFilter.set('');
    this.amcFilter.set('');
    this.scoreFilter.set('');
    this.chooseAccount('');
  }

  protected openPreview(contactId: string): void {
    const found = this.store.contacts().find((c) => c.id === contactId);
    if (found) {
      this.previewContact.set(found);
      this.previewDrawerOpen.set(true);
    }
  }

  protected closePreview(): void {
    this.previewDrawerOpen.set(false);
    this.previewContact.set(null);
  }

  protected getInitials(name: string): string {
    if (!name) return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }

  /** Accounts to filter by, in tree order, so a plant reads as belonging to its company. */
  protected readonly accountRows = this.accountStore.rows;
  /** Every account, by name, for the contact dialog's picker (the Accounts screen's search doesn't narrow it). */
  protected readonly accountChoices = computed(() =>
    [...this.accountStore.all()].sort((a, b) => a.name.localeCompare(b.name)),
  );
  /** The account picked in the dialog, whose name stands in for the company. */
  protected readonly formAccount = computed(
    () => this.accountStore.all().find((a) => a.id === this.form().accountId) ?? null,
  );
  /** The stored fields of the contact being edited, sent back so an edit clears nothing. */
  private editingStored: Contact['stored'];
  protected readonly accountId = this.store.accountId;
  protected readonly includeSubsidiaries = this.store.includeSubsidiaries;
  protected readonly chosenAccountHasChildren = computed(
    () => (this.accountStore.all().find((a) => a.id === this.accountId())?.childCount ?? 0) > 0,
  );

  protected chooseAccount(id: string): void {
    this.store.filterByAccount(id);
  }

  protected readonly totalContacts = computed(
    () => this.segments().find((s) => s.id === 'all')?.count ?? this.store.contacts().length,
  );

  protected readonly totalCompanies = computed(() => {
    const set = new Set<string>();
    for (const c of this.store.contacts()) {
      if (c.company) set.add(c.company.trim().toLowerCase());
      else if (c.stored?.companyName) set.add(c.stored.companyName.trim().toLowerCase());
    }
    return Math.max(set.size, this.accountStore.all().length);
  });

  protected readonly recentlyActiveCount = computed(() => {
    return this.store.contacts().filter((c) => c.lastActivity && c.lastActivity !== '—').length;
  });

  protected readonly suppressedTotal = computed(() =>
    this.suppression().reduce((n, s) => n + s.count, 0),
  );

  /** Consented total is derived, so it can never drift from the suppression
   *  rows shown beside it. */
  protected readonly consentedTotal = computed(() => this.totalContacts() - this.suppressedTotal());

  protected readonly segmentCount = computed(
    () => this.segments().find((s) => s.id === this.activeSegment())?.count ?? 0,
  );

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const role = this.roleFilter();
    const consent = this.consentFilter();
    const amc = this.amcFilter();
    const scoreVal = this.scoreFilter();

    let list = this.store.contacts();

    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.phoneE164.includes(q) ||
          (c.stored?.city && c.stored.city.toLowerCase().includes(q)),
      );
    }

    if (role) {
      list = list.filter((c) => c.attributes.decisionRole === role);
    }

    if (consent) {
      list = list.filter((c) => c.consent.source === consent);
    }

    if (amc === 'active') {
      list = list.filter((c) => !!c.amcExpiry && c.amcExpiry !== '—');
    } else if (amc === 'none') {
      list = list.filter((c) => !c.amcExpiry || c.amcExpiry === '—');
    }

    if (scoreVal) {
      const sMin = Number(scoreVal);
      if (sMin === 60) {
        list = list.filter((c) => (c.score ?? 0) >= 60);
      } else if (sMin === 25) {
        list = list.filter((c) => (c.score ?? 0) >= 25 && (c.score ?? 0) < 60);
      } else if (sMin === 0) {
        list = list.filter((c) => (c.score ?? 0) < 25);
      }
    }

    return list;
  });

  /** Grid rows: every column a plain value, so sorting, filtering and export see what is shown. */
  protected readonly rows = computed(() =>
    this.visible().map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company,
      role: c.attributes.decisionRole ?? '—',
      systems: this.systems(c),
      amcExpiry: c.amcExpiry ?? '—',
      consent: this.consentLabel(c),
      consentTone: this.consentTone(c),
      score: c.score,
      lastActivity: c.lastActivity,
    })),
  );

  protected consentLabel(c: Contact): string {
    return CONSENT_LABEL[c.consent.source];
  }
  protected consentTone(c: Contact): ChipTone {
    return CONSENT_TONE[c.consent.source];
  }
  protected systems(c: Contact): string {
    return (c.attributes.systems ?? []).join(', ');
  }

  protected readonly count = count;
  protected readonly compactCount = compactCount;
  protected readonly segmentIcon = segmentIcon;
  protected readonly suppressionIcon = suppressionIcon;

  protected readonly activeSegmentName = computed(
    () => this.segments().find((s) => s.id === this.activeSegment())?.name ?? 'Segment',
  );

  // ---- New contact dialog ------------------------------------------------

  protected readonly roles = [
    { value: DecisionRole.Maintenance, label: 'Maintenance' },
    { value: DecisionRole.Purchase, label: 'Purchase' },
    { value: DecisionRole.Engineering, label: 'Engineering' },
    { value: DecisionRole.PlantHead, label: 'Plant head' },
    { value: DecisionRole.Dealer, label: 'Dealer' },
  ];

  protected readonly dialogOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly form = signal<ContactForm>({ ...EMPTY_FORM });

  protected patchText(key: Exclude<keyof ContactForm, 'role'>, value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  // ---- Import, visiting cards and vCards ----------------------------------

  protected readonly importOpen = signal(false);
  protected readonly segsCollapsed = persistedToggle('ar.contacts.segmentsCollapsed');
  protected readonly reading = signal<'card' | 'vcard' | null>(null);
  protected readonly filledFrom = signal<string | null>(null);
  protected readonly otherPhones = signal<string[]>([]);

  protected afterImport(): void {
    this.importOpen.set(false);
    this.store.reload();
  }

  /** A photo of a visiting card, read by the AI model into the form. */
  protected async readCard(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
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
      /* the server's reason is shown as a toast */
    } finally {
      this.reading.set(null);
    }
  }

  /** A .vcf from a phone's "share contact": the first card fills the form. */
  protected async readVcard(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
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

  private fill(values: Partial<ContactForm>, from: string, others: string[]): void {
    this.form.update((f) => {
      const next = { ...f };
      for (const [k, v] of Object.entries(values) as [keyof ContactForm, string][]) {
        if (v && k !== 'role')
          (next as Record<string, unknown>)[k] = k === 'waId' ? v.replace(/[^\d]/g, '') : v.trim();
      }
      return next;
    });
    this.filledFrom.set(from);
    this.otherPhones.set(others);
  }

  protected patchRole(value: string): void {
    this.form.update((f) => ({ ...f, role: Number(value) as DecisionRole }));
  }

  protected openDialog(): void {
    this.editingContactId.set(null);
    this.dialogOpen.set(true);
  }

  protected openEdit(row: { id: string }): void {
    this.editingContactId.set(row.id);
    this.dialogOpen.set(true);
  }

  protected async deleteContact(c: { id: string; name: string }): Promise<void> {
    if (
      !(await this.dialogs.delete(
        'this contact',
        c.name,
        'Their conversation history and any open enquiries will remain.',
      ))
    ) {
      return;
    }
    try {
      await this.store.delete(c.id);
      this.toasts.info(`Contact “${c.name}” removed.`, 'Contacts');
    } catch (e: unknown) {
      this.toasts.error(e instanceof Error ? e.message : 'Could not delete contact.', 'Contacts');
    }
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
      const editId = this.editingContactId();
      // What the form doesn't show is sent back as stored; the API applies every field.
      const kept = editId ? this.editingStored : undefined;
      const account = this.formAccount();
      const payload = {
        waId,
        displayName: f.displayName.trim() || undefined,
        companyName: account ? account.name : f.companyName.trim() || undefined,
        accountId: account?.id ?? null,
        designation: f.designation.trim() || undefined,
        // The contact's real email field, which the email channel and Customer 360 use.
        emailAddress: f.email.trim() || null,
        city: f.city.trim() || undefined,
        state: f.state.trim() || undefined,
        role: f.role,
        languageCode: kept?.languageCode || 'en',
        ownerUserId: kept?.ownerUserId ?? null,
        tags: [...(kept?.tags ?? [])],
        attributes,
      };
      if (editId) {
        await this.store.update(editId, payload);
      } else {
        await this.store.create(payload);
      }
      this.dialogOpen.set(false);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'The contact could not be saved.'), 'Contact');
    } finally {
      this.saving.set(false);
    }
  }
}
