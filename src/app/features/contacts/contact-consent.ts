import { grantedPolicy } from '../../core/auth/permission';
import { PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ConsentScope } from '../../proxy/contacts/consent-scope.enum';
import { ConsentSource } from '../../proxy/contacts/consent-source.enum';
import { ContactService } from '../../proxy/contacts/contact.service';
import type { ConsentRecordDto } from '../../proxy/contacts/models';
import { ArButton, ArChip } from '../../ui';

const SOURCE_LABEL: Record<ConsentSource, string> = {
  [ConsentSource.Website]: 'Website form',
  [ConsentSource.WhatsAppOptIn]: 'WhatsApp opt-in',
  [ConsentSource.Import]: 'Import',
  [ConsentSource.ClickToWhatsApp]: 'Click-to-WhatsApp ad',
  [ConsentSource.QrCode]: 'QR code',
  [ConsentSource.Manual]: 'Recorded by staff',
  [ConsentSource.Api]: 'API',
  [ConsentSource.EmailOptIn]: 'Email opt-in',
  [ConsentSource.SmsOptIn]: 'SMS opt-in',
  [ConsentSource.VoiceOptIn]: 'Voice opt-in',
  [ConsentSource.InstagramOptIn]: 'Instagram opt-in',
  [ConsentSource.MessengerOptIn]: 'Messenger opt-in',
  [ConsentSource.ConsentManager]: 'Consent manager',
  [ConsentSource.LeadAd]: 'Lead ad',
};

/** Sources a person can record by hand: the rest are written by the system when the opt-in happens. */
const MANUAL_SOURCES = [
  ConsentSource.Manual,
  ConsentSource.Website,
  ConsentSource.QrCode,
  ConsentSource.EmailOptIn,
  ConsentSource.SmsOptIn,
  ConsentSource.VoiceOptIn,
];

export function sourceLabel(s: ConsentSource | undefined): string {
  return s === undefined ? 'Unknown' : (SOURCE_LABEL[s] ?? 'Other');
}

/**
 * A contact's consent (DPDP / Meta opt-in): every grant and withdrawal in order, recording a new grant with its
 * evidence, and withdrawing marketing consent (utility messages may still be sent).
 */
@Component({
  selector: 'ar-contact-consent',
  imports: [ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      height: auto;
    }
  `,
  template: `
    @if (canManageConsent()) {
      <section class="wp__card">
        <h2 class="wp__title">Record consent</h2>
        <p class="wp__muted">Write down where the customer agreed, so it can be shown if asked.</p>
        <div class="wp__grid">
          <label class="wp__field">
            <span>Agreed to</span>
            <select
              class="ar-field__input"
              [value]="scope()"
              (change)="scope.set(+$any($event.target).value)"
            >
              <option [value]="marketing">Marketing and service messages</option>
              <option [value]="utility">Service messages only</option>
            </select>
          </label>
          <label class="wp__field">
            <span>How</span>
            <select
              class="ar-field__input"
              [value]="source()"
              (change)="source.set(+$any($event.target).value)"
            >
              @for (s of manualSources; track s) {
                <option [value]="s">{{ label(s) }}</option>
              }
            </select>
          </label>
          <label class="wp__field wp__field--wide">
            <span>Evidence (form link, call note, signed paper reference)</span>
            <input
              class="ar-field__input"
              maxlength="512"
              [value]="evidence()"
              (input)="evidence.set($any($event.target).value)"
            />
          </label>
        </div>
        <div class="wp__actions">
          <button
            ar-button
            type="button"
            variant="primary"
            [disabled]="busy() !== null"
            (click)="grant()"
          >
            {{ busy() === 'grant' ? 'Saving…' : 'Record consent' }}
          </button>
          <button
            ar-button
            type="button"
            variant="danger"
            [disabled]="busy() !== null"
            (click)="withdraw()"
          >
            {{ busy() === 'withdraw' ? 'Withdrawing…' : 'Withdraw marketing consent' }}
          </button>
        </div>
      </section>
    }

    <section class="wp__card" style="margin-top: 14px">
      <h2 class="wp__title">Consent history</h2>
      <ul class="wp__list">
        @for (r of history(); track r.id) {
          <li class="wp__item">
            <span class="wp__grow">
              <span class="wp__name">
                {{ r.granted ? 'Agreed to' : 'Withdrew' }}
                {{
                  r.scope === marketing ? 'marketing and service messages' : 'service messages only'
                }}
              </span>
              <span class="wp__sub"
                >{{ label(r.source) }} · {{ r.recordedAtUtc | date: 'd MMM y, HH:mm' }}</span
              >
              @if (r.evidenceRef) {
                <span class="wp__sub" translate="no">Evidence: {{ r.evidenceRef }}</span>
              }
            </span>
            <ar-chip [tone]="r.granted ? 'good' : 'bad'" [dot]="true">{{
              r.granted ? 'Granted' : 'Withdrawn'
            }}</ar-chip>
          </li>
        } @empty {
          <li class="wp__empty">No consent recorded for this contact.</li>
        }
      </ul>
    </section>
  `,
})
export class ArContactConsent {
  private readonly permissionGate = inject(PermissionService);
  protected readonly canManageConsent = grantedPolicy(
    'AutoReach.Contacts.ManageConsent',
    this.permissionGate,
  );
  private readonly api = inject(ContactService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  readonly contactId = input.required<string>();

  protected readonly marketing = ConsentScope.MarketingAndUtility;
  protected readonly utility = ConsentScope.UtilityOnly;
  protected readonly manualSources = MANUAL_SOURCES;

  protected readonly history = signal<ConsentRecordDto[]>([]);
  protected readonly scope = signal<ConsentScope>(ConsentScope.MarketingAndUtility);
  protected readonly source = signal<ConsentSource>(ConsentSource.Manual);
  protected readonly evidence = signal('');
  protected readonly busy = signal<string | null>(null);

  constructor() {
    effect(() => {
      const id = this.contactId();
      untracked(() => void this.load(id));
    });
  }

  protected label(s: ConsentSource | undefined): string {
    return sourceLabel(s);
  }

  private async load(id: string): Promise<void> {
    try {
      const list = await firstValueFrom(this.api.getConsentHistory(id, { skipHandleError: true }));
      this.history.set(
        [...(list.items ?? [])].sort((a, b) =>
          (b.recordedAtUtc ?? '').localeCompare(a.recordedAtUtc ?? ''),
        ),
      );
    } catch {
      this.history.set([]);
    }
  }

  protected async grant(): Promise<void> {
    await this.run('grant', async () => {
      await firstValueFrom(
        this.api.grantConsent(
          this.contactId(),
          {
            scope: this.scope(),
            source: this.source(),
            evidenceRef: this.evidence().trim() || null,
          },
          { skipHandleError: true },
        ),
      );
      this.evidence.set('');
      this.toasts.success('Consent recorded.', 'Consent');
    });
  }

  protected async withdraw(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Withdraw marketing consent?',
      message:
        'No more marketing messages go to this contact. Service messages (orders, reminders) still can.',
      confirmText: 'Withdraw',
      tone: 'danger',
    });
    if (!ok) return;
    await this.run('withdraw', async () => {
      await firstValueFrom(
        this.api.withdrawMarketingConsent(this.contactId(), { skipHandleError: true }),
      );
      this.toasts.success('Marketing consent withdrawn.', 'Consent');
    });
  }

  private async run(key: string, work: () => Promise<void>): Promise<void> {
    this.busy.set(key);
    try {
      await work();
      await this.load(this.contactId());
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not save. Try again.'), 'Consent');
    } finally {
      this.busy.set(null);
    }
  }
}
