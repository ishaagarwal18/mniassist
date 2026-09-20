import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccountStore } from '../../core/services/account.store';
import { ContactService } from '../../core/services/contact.service';
import { ConsentSource, Contact } from '../../core/models/contact.model';
import { DecisionRole } from '../../proxy/contacts';
import { count } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArAvatar, ArButton, ArChip, ArDialog, ArSearchBox } from '../../ui';
import { ChipTone } from '../../ui/chip';

const CONSENT_LABEL: Record<ConsentSource, string> = {
  website: 'Website form',
  whatsapp_optin: 'WhatsApp opt-in',
  import: 'Imported — signed form',
  ctwa: 'Click-to-WhatsApp',
  qr: 'Exhibition QR',
  manual: 'Dealer agreement',
  api: 'API',
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
};

@Component({
  selector: 'ar-contacts',
  imports: [ArTopbar, ArSearchBox, ArChip, ArAvatar, ArButton, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class ArContacts {
  private readonly store = inject(ContactService);
  private readonly accountStore = inject(AccountStore);

  protected readonly segments = this.store.segments;
  protected readonly suppression = this.store.suppression;
  protected readonly activeSegment = signal('amc60');
  protected readonly query = signal('');

  /** Accounts to filter by, in tree order, so a plant reads as belonging to its company. */
  protected readonly accountRows = this.accountStore.rows;
  protected readonly accountId = this.store.accountId;
  protected readonly includeSubsidiaries = this.store.includeSubsidiaries;
  protected readonly chosenAccountHasChildren = computed(
    () => (this.accountStore.all().find((a) => a.id === this.accountId())?.childCount ?? 0) > 0,
  );

  protected chooseAccount(id: string): void {
    this.store.filterByAccount(id);
  }

  protected readonly totalContacts = computed(
    () => this.segments().find((s) => s.id === 'all')?.count ?? 0,
  );

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
    const all = this.store.contacts();
    if (!q) return all;
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.company.toLowerCase().includes(q) ||
        c.phoneE164.includes(q),
    );
  });

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
  protected readonly form = signal<{
    waId: string;
    displayName: string;
    companyName: string;
    city: string;
    role: DecisionRole;
  }>({ waId: '', displayName: '', companyName: '', city: '', role: DecisionRole.Maintenance });

  protected patchText(key: 'waId' | 'displayName' | 'companyName' | 'city', value: string): void {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  protected patchRole(value: string): void {
    this.form.update((f) => ({ ...f, role: Number(value) as DecisionRole }));
  }

  protected openDialog(): void {
    this.form.set({
      waId: '',
      displayName: '',
      companyName: '',
      city: '',
      role: DecisionRole.Maintenance,
    });
    this.dialogOpen.set(true);
  }

  protected async saveContact(): Promise<void> {
    const f = this.form();
    const waId = f.waId.replace(/[^\d]/g, '');
    if (waId.length < 10) {
      window.alert('Enter the WhatsApp number in international format, e.g. 919821012345.');
      return;
    }
    this.saving.set(true);
    try {
      await this.store.create({
        waId,
        displayName: f.displayName.trim() || undefined,
        companyName: f.companyName.trim() || undefined,
        city: f.city.trim() || undefined,
        role: f.role,
      });
      this.dialogOpen.set(false);
    } finally {
      this.saving.set(false);
    }
  }
}
