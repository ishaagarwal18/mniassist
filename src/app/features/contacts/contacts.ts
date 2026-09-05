import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContactService } from '../../core/services/contact.service';
import { ConsentSource, Contact } from '../../core/models/contact.model';
import { count } from '../../core/util/format';
import { ArTopbar } from '../../layout/topbar';
import { ArAvatar, ArButton, ArChip, ArSearchBox } from '../../ui';
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
  website: 'good', whatsapp_optin: 'good', qr: 'teal', ctwa: 'amber',
  manual: 'neutral', api: 'neutral', import: 'warn',
};

@Component({
  selector: 'ar-contacts',
  imports: [ArTopbar, ArSearchBox, ArChip, ArAvatar, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
})
export class ArContacts {
  private readonly store = inject(ContactService);

  protected readonly segments = this.store.segments;
  protected readonly suppression = this.store.suppression;
  protected readonly activeSegment = signal('amc60');
  protected readonly query = signal('');

  protected readonly totalContacts = computed(() =>
    this.segments().find(s => s.id === 'all')?.count ?? 0);

  protected readonly suppressedTotal = computed(() =>
    this.suppression().reduce((n, s) => n + s.count, 0));

  /** Consented total is derived, so it can never drift from the suppression
   *  rows shown beside it. */
  protected readonly consentedTotal = computed(() =>
    this.totalContacts() - this.suppressedTotal());

  protected readonly segmentCount = computed(() =>
    this.segments().find(s => s.id === this.activeSegment())?.count ?? 0);

  protected readonly visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    const all = this.store.contacts();
    if (!q) return all;
    return all.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.company.toLowerCase().includes(q) ||
      c.phoneE164.includes(q));
  });

  protected consentLabel(c: Contact): string { return CONSENT_LABEL[c.consent.source]; }
  protected consentTone(c: Contact): ChipTone { return CONSENT_TONE[c.consent.source]; }
  protected systems(c: Contact): string { return (c.attributes.systems ?? []).join(', '); }

  protected readonly count = count;
}
