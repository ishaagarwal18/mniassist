import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { grantedPolicy } from '../../core/auth/permission';
import { DuplicateStore } from '../../core/services/duplicate.store';
import { ChannelKind } from '../../proxy/channels';
import {
  ChannelMergeMode,
  ContactDuplicatePairDto,
  ContactMergePreviewDto,
  DuplicateConfidence,
  DuplicateContactDto,
  DuplicateReason,
  SuppressionReason,
} from '../../proxy/contacts';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArChip, ArDialog } from '../../ui';

const REASONS: Record<DuplicateReason, string> = {
  [DuplicateReason.SamePhone]: 'Same phone number',
  [DuplicateReason.SameEmail]: 'Same email address',
  [DuplicateReason.SameNameAndCompany]: 'Same name and company',
  [DuplicateReason.SameNameOnDifferentChannels]: 'Same name, reached on different channels',
  [DuplicateReason.SameEmailDifferentPhones]:
    'Same email, different phone numbers (may be a shared mailbox)',
};

const FIELDS: Record<string, string> = {
  DisplayName: 'Name',
  CompanyName: 'Company',
  LanguageCode: 'Language',
  City: 'City',
  State: 'State',
  Role: 'Decision role',
  OwnerUserId: 'Owner',
  Designation: 'Job title',
  AccountId: 'Account',
  WaId: 'Phone (WhatsApp, SMS, voice)',
  EmailAddress: 'Email',
  InstagramIgsid: 'Instagram',
  MessengerPsid: 'Messenger',
};

const CHANNELS: Record<number, string> = {
  [ChannelKind.WhatsApp]: 'WhatsApp',
  [ChannelKind.Instagram]: 'Instagram',
  [ChannelKind.Messenger]: 'Messenger',
  [ChannelKind.Sms]: 'SMS',
  [ChannelKind.Email]: 'Email',
  [ChannelKind.Voice]: 'Voice',
};

/**
 * Suspected duplicate contacts, and a manual merge with a preview. Detection is only a suggestion: the
 * operator picks which record to keep, decides each field the two disagree on, sees exactly what will move
 * and what consent will result, and only then confirms. "Not duplicates" remembers a pair so it is not offered again.
 */
@Component({
  selector: 'ar-duplicates',
  imports: [ArTopbar, ArButton, ArChip, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './duplicates.html',
  styleUrl: './duplicates.scss',
})
export class ArDuplicates {
  private readonly permissions = inject(PermissionService);
  private readonly store = inject(DuplicateStore);

  protected readonly canUpdate = grantedPolicy('AutoReach.Contacts.Update', this.permissions);
  protected readonly canDelete = grantedPolicy('AutoReach.Contacts.Delete', this.permissions);

  protected readonly pairs = this.store.pairs;
  protected readonly loading = this.store.loading;
  protected readonly failed = this.store.failed;
  protected readonly moreThanShown = this.store.moreThanShown;
  protected readonly highOnly = this.store.highOnly;
  protected readonly High = DuplicateConfidence.High;

  protected readonly pair = signal<ContactDuplicatePairDto | null>(null);
  protected readonly survivorId = signal<string>('');
  /** Fields where the operator chose the merged-away record's value. */
  protected readonly takeFromLoser = signal<ReadonlySet<string>>(new Set());
  protected readonly preview = signal<ContactMergePreviewDto | null>(null);
  protected readonly previewing = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private previewRun = 0;

  protected readonly survivor = computed(() => this.side(this.survivorId()));
  protected readonly loser = computed(() => {
    const p = this.pair();
    return p ? (p.first?.id === this.survivorId() ? p.second : p.first) : null;
  });

  /** Fields the two records disagree on and both filled in — the ones that need a decision. */
  protected readonly choices = computed(() =>
    (this.preview()?.conflicts ?? []).filter((c) => c.needsChoice),
  );

  /** Fields only one side has: nothing to decide, shown so the operator sees what the merged contact gains. */
  protected readonly fills = computed(() =>
    (this.preview()?.conflicts ?? []).filter((c) => !c.needsChoice && c.loserValue),
  );

  protected readonly consentLines = computed(() =>
    (this.preview()?.channels ?? [])
      .filter((c) => c.mode !== ChannelMergeMode.Unchanged)
      .map((c) => ({
        channel: CHANNELS[c.channel ?? 0] ?? 'Channel',
        text:
          c.mode === ChannelMergeMode.AdoptFromLoser
            ? `Gets the address with the consent recorded for it — ${this.stateText(c.resultingSuppression, c.resultingScope)}.`
            : c.narrowed || c.suppressionAdded
              ? `Both records have one, so the stricter setting wins — ${this.stateText(c.resultingSuppression, c.resultingScope)}.`
              : `Both records have one; nothing changes — ${this.stateText(c.resultingSuppression, c.resultingScope)}.`,
        warn: !!(c.narrowed || c.suppressionAdded),
      })),
  );

  protected readonly anyNarrowed = computed(
    () => !!this.preview()?.consentNarrowed || !!this.preview()?.suppressionAdded,
  );

  protected reasonText(r: DuplicateReason): string {
    return REASONS[r] ?? 'Possible match';
  }

  protected fieldLabel(field: string | undefined): string {
    if (!field) return '';
    return field.startsWith('attr:') ? field.slice(5) : (FIELDS[field] ?? field);
  }

  protected display(c: DuplicateContactDto | null | undefined): string {
    return c?.displayName || c?.waId || c?.emailAddress || 'Unnamed contact';
  }

  protected value(v: string | null | undefined): string {
    return v && v.trim() ? v : '—';
  }

  protected when(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : 'never';
  }

  protected toggleHighOnly(on: boolean): void {
    this.highOnly.set(on);
  }

  protected async dismiss(p: ContactDuplicatePairDto): Promise<void> {
    if (!p.first?.id || !p.second?.id) return;
    try {
      await this.store.dismiss(p.first.id, p.second.id);
    } catch {
      this.error.set('Could not save that. Try again.');
    }
  }

  protected async open(p: ContactDuplicatePairDto): Promise<void> {
    this.pair.set(p);
    this.error.set(null);
    this.takeFromLoser.set(new Set());
    this.survivorId.set(p.suggestedSurvivorId ?? p.first?.id ?? '');
    await this.refreshPreview();
  }

  protected async keep(id: string): Promise<void> {
    if (id === this.survivorId()) return;
    this.survivorId.set(id);
    // What was chosen for one direction means nothing in the other.
    this.takeFromLoser.set(new Set());
    await this.refreshPreview();
  }

  protected takesLoser(field: string | undefined): boolean {
    return !!field && this.takeFromLoser().has(field);
  }

  protected async choose(field: string | undefined, fromLoser: boolean): Promise<void> {
    if (!field) return;
    this.takeFromLoser.update((s) => {
      const next = new Set(s);
      if (fromLoser) next.add(field);
      else next.delete(field);
      return next;
    });
    await this.refreshPreview();
  }

  protected close(): void {
    this.pair.set(null);
    this.preview.set(null);
  }

  protected async confirm(): Promise<void> {
    const input = this.input();
    if (!input || this.busy() || this.previewing()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      await this.store.merge(input);
      this.close();
    } catch (e: unknown) {
      this.error.set(e instanceof Error ? e.message : 'Could not merge these contacts.');
    } finally {
      this.busy.set(false);
    }
  }

  private input() {
    const survivor = this.survivorId();
    const loser = this.loser()?.id;
    return survivor && loser
      ? { survivorId: survivor, loserId: loser, takeFromLoser: [...this.takeFromLoser()] }
      : null;
  }

  private async refreshPreview(): Promise<void> {
    const input = this.input();
    if (!input) return;
    const run = ++this.previewRun;
    this.previewing.set(true);
    try {
      const result = await this.store.preview(input);
      if (run === this.previewRun) this.preview.set(result);
    } catch (e: unknown) {
      if (run === this.previewRun) {
        this.preview.set(null);
        this.error.set(e instanceof Error ? e.message : 'Could not preview this merge.');
      }
    } finally {
      if (run === this.previewRun) this.previewing.set(false);
    }
  }

  private side(id: string): DuplicateContactDto | null {
    const p = this.pair();
    return p ? (p.first?.id === id ? p.first : p.second?.id === id ? p.second : null) : null;
  }

  private stateText(suppression: SuppressionReason | undefined, scope: number | undefined): string {
    if (suppression === SuppressionReason.AllMessagesOptedOut)
      return 'stopped all WhatsApp messages';
    if (suppression === SuppressionReason.OptedOut) return 'opted out of marketing';
    if (suppression) return 'suppressed';
    return scope === 1 ? 'marketing allowed' : 'utility messages only';
  }
}
