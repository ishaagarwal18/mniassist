import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { ConsentRulesAcceptance, OnboardingStore } from '../../core/services/onboarding.store';
import { ToastService } from '../../core/ui/toast.service';
import { ArButton } from '../../ui/button';
import { errorMessage } from '../activities/activity-logic';

/**
 * The version of the rules below. Change it whenever their meaning changes: the server keeps the version each
 * acceptance was for, and an older one asks to be accepted again.
 */
export const CONSENT_RULES_VERSION = '2026-11-09';

/** The consent rules, in plain words. Kept short: this is read once, at setup, by someone who is not a lawyer. */
export const CONSENT_RULES: readonly { readonly title: string; readonly body: string }[] = [
  {
    title: 'Message only people who agreed.',
    body: 'Send marketing (offers, newsletters, campaigns) only to contacts who opted in to hear from you. A customer who messaged you first can get replies, but not marketing, until they agree.',
  },
  {
    title: 'Keep a record of every opt-in.',
    body: 'Say where each consent came from — a WhatsApp reply, a website form, a signed form, a trade-show sheet. When you import contacts, you are asked for this; answer it honestly.',
  },
  {
    title: 'Imported lists are the weakest proof.',
    body: 'Old spreadsheets and contact dumps are the usual cause of a WhatsApp quality downgrade: people who do not remember you report or block your number, and it can be limited or banned. Never message bought or scraped lists.',
  },
  {
    title: 'Opt-outs are honoured at once.',
    body: 'When someone replies STOP, or asks not to be messaged or called, they are stopped straight away and automatically. Do not add them back by hand or from another list.',
  },
  {
    title: 'Utility is not marketing.',
    body: 'Order updates, invoices, delivery and service messages are utility. Filing an offer as utility to save cost gets templates rejected and your number restricted.',
  },
  {
    title: 'Consent records are never deleted.',
    body: 'They are your proof if a customer complains or a regulator asks, so MNI Assist keeps them even when other old data is cleared.',
  },
  {
    title: 'Answer data requests within 30 days.',
    body: 'Under India’s DPDP Act, 2023 anyone can ask to see, correct or delete their data, or withdraw consent. Log each request on the Compliance page the day it arrives.',
  },
];

/**
 * Get started, "Review the consent rules": the rules on the card, and a named acceptance. Accepting ticks the step
 * and the server records who accepted, when and which version — shown here afterwards.
 */
@Component({
  selector: 'ar-onboarding-consent-rules',
  imports: [ArButton, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="cr">
      @for (r of rules; track $index) {
        <li class="cr__rule">
          <strong>{{ r.title }}</strong> {{ r.body }}
        </li>
      }
    </ol>

    @if (current(); as a) {
      <p class="cr__ok" role="status">
        ✓ Accepted by <strong translate="no">{{ a.by }}</strong> on {{ when(a.at) }}.
      </p>
    } @else {
      @if (acceptance(); as old) {
        <p class="cr__old" role="status">
          These rules have changed since <span translate="no">{{ old.by }}</span> accepted them on
          {{ when(old.at) }}. Read them again and accept the new version.
        </p>
      }
      <label class="cr__agree">
        <input
          type="checkbox"
          [checked]="agreed()"
          (change)="agreed.set($any($event.target).checked)"
        />
        I have read these rules, and my team and I will follow them.
      </label>
      <div class="cr__row">
        <button
          ar-button
          type="button"
          variant="primary"
          icon="check"
          [disabled]="!agreed() || busy()"
          (click)="accept()"
        >
          {{ busy() ? 'Saving…' : 'Accept' }}
        </button>
      </div>
    }
    <p class="cr__more">
      Requests, retention and the breach log are on the
      <a routerLink="/compliance">Compliance page</a>.
    </p>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 4px;
    }
    .cr {
      margin: 0;
      padding: 14px 18px 14px 34px;
      display: flex;
      flex-direction: column;
      gap: 9px;
      background: var(--ar-bg-100);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .cr__rule {
      font: 400 13px/1.55 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .cr__rule strong {
      color: var(--ar-ink-900);
      font-weight: 600;
    }
    .cr__agree {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font: 500 13.5px/1.45 var(--ar-font-sans);
      color: var(--ar-ink-900);
      cursor: pointer;
    }
    .cr__agree input {
      margin-top: 2px;
    }
    .cr__row {
      display: flex;
      gap: 8px;
    }
    .cr__ok {
      margin: 0;
      padding: 10px 14px;
      border-radius: var(--ar-radius-control);
      background: color-mix(in srgb, var(--ar-green-500) 12%, transparent);
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .cr__old {
      margin: 0;
      font: 400 13px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .cr__more {
      margin: 0;
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
  `,
})
export class ArOnboardingConsentRules {
  private readonly store = inject(OnboardingStore);
  private readonly toasts = inject(ToastService);

  /** The acceptance on record, if any. */
  readonly acceptance = input<ConsentRulesAcceptance | undefined>(undefined);
  /** Accepted just now: the wizard moves on. */
  readonly accepted = output<void>();

  protected readonly rules = CONSENT_RULES;
  protected readonly agreed = signal(false);
  protected readonly busy = signal(false);

  /** The acceptance, when it is for the rules as they read today. */
  protected readonly current = computed(() => {
    const a = this.acceptance();
    return a && a.version === CONSENT_RULES_VERSION ? a : null;
  });

  protected when(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected async accept(): Promise<void> {
    if (!this.agreed() || this.busy()) return;
    this.busy.set(true);
    try {
      await this.store.acceptConsentRules(CONSENT_RULES_VERSION);
      this.toasts.success('Consent rules accepted.', 'Get started');
      this.agreed.set(false);
      this.accepted.emit();
    } catch (e: unknown) {
      this.toasts.error(errorMessage(e, 'Your acceptance could not be saved.'), 'Get started');
    } finally {
      this.busy.set(false);
    }
  }
}
