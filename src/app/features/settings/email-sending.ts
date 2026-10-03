import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import {
  EmailChannelDto,
  EmailChannelService,
  EmailSyncResultDto,
} from '../../proxy/email/email-channel.service';
import { EmailOAuthProvider, EmailOAuthService } from '../../proxy/email/email-oauth.service';
import { ArBanner, ArButton } from '../../ui';

const SEED: EmailChannelDto = {
  id: 'demo',
  fromName: 'Meridian Automation',
  fromAddress: 'sales@meridian.example',
  replyToAddress: null,
  isSenderConfigured: true,
  usesCustomSmtp: false,
  smtpHost: null,
  smtpPort: null,
  smtpImplicitTls: false,
  smtpUsername: null,
  smtpHasPassword: false,
  unsubscribeProblem: null,
  trackOpens: true,
  trackingProblem: null,
  hasImap: false,
  imapHost: null,
  imapPort: null,
  imapImplicitTls: true,
  imapUsername: null,
  imapHasPassword: false,
  imapFolder: null,
  imapOAuthProvider: EmailOAuthProvider.None,
  googleOAuthAvailable: true,
  microsoftOAuthAvailable: true,
  syncEnabled: false,
  lastSyncedAtUtc: null,
  lastSyncError: null,
};

type Route = 'shared' | 'own';

/**
 * How this workspace's email leaves the platform: the sender identity, and whether mail goes
 * through AutoReach's shared relay or the workspace's own SMTP server. The password is
 * write-only — once saved it is never shown again, only "saved".
 */
@Component({
  selector: 'ar-email-sending',
  imports: [ArTopbar, ArBanner, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './email-sending.html',
  styleUrl: './email-sending.scss',
})
export class ArEmailSending {
  private readonly api = inject(EmailChannelService);
  private readonly oauth = inject(EmailOAuthService);
  private readonly mock = environment.useMockData;

  protected readonly OAuth = EmailOAuthProvider;
  protected readonly connectingOAuth = signal<EmailOAuthProvider | null>(null);

  protected readonly channel = signal<EmailChannelDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  // Sender profile form
  protected readonly fromName = signal('');
  protected readonly fromAddress = signal('');
  protected readonly replyTo = signal('');
  protected readonly savingSender = signal(false);

  // Delivery form
  protected readonly route = signal<Route>('shared');
  protected readonly host = signal('');
  protected readonly port = signal(587);
  protected readonly implicitTls = signal(false);
  protected readonly username = signal('');
  protected readonly password = signal('');
  protected readonly savingDelivery = signal(false);

  // Open tracking
  protected readonly savingTracking = signal(false);

  // Reply sync (the mailbox replies arrive in)
  protected readonly imapHost = signal('');
  protected readonly imapPort = signal(993);
  protected readonly imapTls = signal(true);
  protected readonly imapUser = signal('');
  protected readonly imapPassword = signal('');
  protected readonly imapFolder = signal('');
  protected readonly savingImap = signal(false);
  protected readonly syncing = signal(false);
  protected readonly syncResult = signal<EmailSyncResultDto | null>(null);

  // Test send
  protected readonly testTo = signal('');
  protected readonly testing = signal(false);

  protected readonly senderReady = computed(() => this.channel()?.isSenderConfigured ?? false);
  protected readonly canSaveSender = computed(
    () => this.fromName().trim().length > 0 && /^\S+@\S+\.\S+$/.test(this.fromAddress().trim()),
  );
  protected readonly canSaveDelivery = computed(
    () => this.route() === 'shared' || (this.host().trim().length > 0 && this.port() > 0),
  );
  protected readonly canSaveImap = computed(
    () =>
      this.imapHost().trim().length > 0 &&
      this.imapUser().trim().length > 0 &&
      // A first connection needs the password; later saves may leave it blank to keep the stored one.
      (this.imapPassword().length > 0 || !!this.channel()?.imapHasPassword),
  );
  protected readonly canTest = computed(
    () => this.senderReady() && /^\S+@\S+\.\S+$/.test(this.testTo().trim()),
  );

  constructor() {
    this.consumeOAuthRedirectParams();
    void this.load();
  }

  /**
   * EmailOAuthController's callback redirects the browser back here with ?emailOAuthConnected=<provider> or ?emailOAuthError=<reason>
   * — read it once, show a notice, then strip it from the URL so a page refresh doesn't re-show it. Mirrors the CRM integrations
   * screen's own handling of the identical redirect shape.
   */
  private consumeOAuthRedirectParams(): void {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('emailOAuthConnected');
    const error = params.get('emailOAuthError');

    if (connected !== null) {
      this.notice.set(
        'Mailbox connected. Replies that arrive from now on are added to your inbox.',
      );
    } else if (error !== null) {
      this.error.set(this.oAuthErrorMessage(error));
    } else {
      return;
    }

    params.delete('emailOAuthConnected');
    params.delete('emailOAuthError');
    const query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : ''));
  }

  private oAuthErrorMessage(reason: string): string {
    if (reason === 'access_denied') return 'The connect flow was cancelled.';
    if (reason === 'no_refresh_token')
      return 'The connection could not be kept alive. Try connecting again.';
    if (reason === 'no_mailbox_address')
      return 'The mailbox address could not be read from the sign-in. Try again.';
    if (reason.startsWith('mailbox_test_failed')) {
      const detail = reason.slice(reason.indexOf(':') + 1).trim();
      return `Signed in, but the mailbox could not be read${detail ? ': ' + detail : '.'} An administrator on that account may have turned IMAP access off.`;
    }
    return 'The connect flow did not finish. Please try again.';
  }

  /** Starts the interactive connect flow and leaves the SPA — the consent screen isn't an Angular route. */
  protected async connectOAuth(provider: EmailOAuthProvider): Promise<void> {
    if (this.mock) {
      this.error.set('The connect flow needs the real API — not available against sample data.');
      return;
    }

    this.connectingOAuth.set(provider);
    this.error.set(null);
    this.notice.set(null);
    try {
      const result = await firstValueFrom(this.oauth.start(provider));
      window.location.href = result.authorizeUrl;
    } catch (e) {
      this.error.set(this.message(e, 'The connect flow could not be started.'));
      this.connectingOAuth.set(null);
    }
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.apply(this.mock ? SEED : await firstValueFrom(this.api.getOrCreate()));
    } catch (e) {
      this.error.set(this.message(e, 'The email settings could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  private apply(c: EmailChannelDto): void {
    this.channel.set(c);
    // The placeholder address is not a real value — leave the box empty so it is obvious it still needs one.
    this.fromName.set(c.fromName);
    this.fromAddress.set(c.isSenderConfigured ? c.fromAddress : '');
    this.replyTo.set(c.replyToAddress ?? '');
    this.route.set(c.usesCustomSmtp ? 'own' : 'shared');
    this.host.set(c.smtpHost ?? '');
    this.port.set(c.smtpPort ?? 587);
    this.implicitTls.set(c.smtpImplicitTls);
    this.username.set(c.smtpUsername ?? '');
    this.password.set('');
    this.imapHost.set(c.imapHost ?? '');
    this.imapPort.set(c.imapPort ?? 993);
    this.imapTls.set(c.hasImap ? c.imapImplicitTls : true);
    this.imapUser.set(c.imapUsername ?? '');
    this.imapFolder.set(c.hasImap && c.imapFolder !== 'INBOX' ? (c.imapFolder ?? '') : '');
    this.imapPassword.set('');
  }

  protected setImapPort(value: number): void {
    this.imapPort.set(value);
    // 993 is TLS on connect; 143 starts plain and upgrades with STARTTLS.
    this.imapTls.set(value === 993);
  }

  protected async setTracking(on: boolean): Promise<void> {
    if (this.savingTracking()) return;
    this.begin(this.savingTracking);
    try {
      this.apply(
        this.mock
          ? { ...(this.channel() ?? SEED), trackOpens: on }
          : await firstValueFrom(this.api.setOpenTracking(on)),
      );
      this.notice.set(
        on
          ? 'Open tracking is on for new emails.'
          : 'Open tracking is off. New emails carry no tracking pixel.',
      );
    } catch (e) {
      this.error.set(this.message(e, 'Open tracking could not be changed.'));
    } finally {
      this.savingTracking.set(false);
    }
  }

  protected async connectMailbox(): Promise<void> {
    if (!this.canSaveImap() || this.savingImap()) return;
    this.begin(this.savingImap);
    this.syncResult.set(null);
    try {
      const input = {
        host: this.imapHost().trim(),
        port: this.imapPort(),
        implicitTls: this.imapTls(),
        username: this.imapUser().trim(),
        password: this.imapPassword() || null,
        folder: this.imapFolder().trim() || null,
      };
      this.apply(
        this.mock
          ? {
              ...(this.channel() ?? SEED),
              hasImap: true,
              syncEnabled: true,
              imapHost: input.host,
              imapPort: input.port,
              imapImplicitTls: input.implicitTls,
              imapUsername: input.username,
              imapHasPassword: true,
              imapFolder: input.folder ?? 'INBOX',
              imapOAuthProvider: EmailOAuthProvider.None,
            }
          : await firstValueFrom(this.api.useImapSync(input)),
      );
      this.notice.set('Connected. Replies that arrive from now on are added to your inbox.');
    } catch (e) {
      this.error.set(this.message(e, 'The mailbox could not be connected.'));
    } finally {
      this.savingImap.set(false);
    }
  }

  protected async changeSync(action: 'pause' | 'resume' | 'remove'): Promise<void> {
    if (this.savingImap()) return;
    if (
      action === 'remove' &&
      !window.confirm('Disconnect this mailbox? Its saved password is deleted.')
    )
      return;
    this.begin(this.savingImap);
    try {
      const base = this.channel() ?? SEED;
      const next =
        action === 'pause'
          ? this.mock
            ? { ...base, syncEnabled: false }
            : await firstValueFrom(this.api.pauseSync())
          : action === 'resume'
            ? this.mock
              ? { ...base, syncEnabled: true, lastSyncError: null }
              : await firstValueFrom(this.api.resumeSync())
            : this.mock
              ? {
                  ...base,
                  hasImap: false,
                  syncEnabled: false,
                  imapHost: null,
                  imapHasPassword: false,
                  imapOAuthProvider: EmailOAuthProvider.None,
                }
              : await firstValueFrom(this.api.removeImap());
      this.apply(next);
      this.notice.set(
        action === 'pause'
          ? 'Reading the mailbox is paused.'
          : action === 'resume'
            ? 'Reading the mailbox has resumed.'
            : 'The mailbox is disconnected.',
      );
    } catch (e) {
      this.error.set(this.message(e, 'That could not be done.'));
    } finally {
      this.savingImap.set(false);
    }
  }

  protected async syncNow(): Promise<void> {
    if (this.syncing()) return;
    this.begin(this.syncing);
    this.syncResult.set(null);
    try {
      const result = this.mock
        ? {
            succeeded: true,
            imported: 0,
            skipped: 0,
            bounces: 0,
            complaints: 0,
            moreWaiting: false,
          }
        : await firstValueFrom(this.api.syncNow());
      this.syncResult.set(result);
      if (!this.mock) this.apply(await firstValueFrom(this.api.getOrCreate()));
    } catch (e) {
      this.error.set(this.message(e, 'The mailbox could not be read.'));
    } finally {
      this.syncing.set(false);
    }
  }

  protected when(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'never';
  }

  protected setPort(value: number): void {
    this.port.set(value);
    // 465 is implicit TLS; the others start plain and upgrade with STARTTLS.
    if (value === 465) this.implicitTls.set(true);
    else if (value === 587 || value === 25 || value === 2525) this.implicitTls.set(false);
  }

  protected async saveSender(): Promise<void> {
    if (!this.canSaveSender() || this.savingSender()) return;
    this.begin(this.savingSender);
    try {
      const input = {
        fromName: this.fromName().trim(),
        fromAddress: this.fromAddress().trim(),
        replyToAddress: this.replyTo().trim() || null,
      };
      this.apply(
        this.mock
          ? { ...(this.channel() ?? SEED), ...input, isSenderConfigured: true }
          : await firstValueFrom(this.api.updateSenderProfile(input)),
      );
      this.notice.set('Sender saved.');
    } catch (e) {
      this.error.set(this.message(e, 'The sender could not be saved.'));
    } finally {
      this.savingSender.set(false);
    }
  }

  protected async saveDelivery(): Promise<void> {
    if (!this.canSaveDelivery() || this.savingDelivery()) return;
    this.begin(this.savingDelivery);
    try {
      let next: EmailChannelDto;
      if (this.route() === 'shared') {
        next = this.mock
          ? {
              ...(this.channel() ?? SEED),
              usesCustomSmtp: false,
              smtpHost: null,
              smtpHasPassword: false,
            }
          : await firstValueFrom(this.api.useSharedRelay());
      } else {
        const input = {
          host: this.host().trim(),
          port: this.port(),
          implicitTls: this.implicitTls(),
          username: this.username().trim() || null,
          password: this.password() || null,
        };
        next = this.mock
          ? {
              ...(this.channel() ?? SEED),
              usesCustomSmtp: true,
              smtpHost: input.host,
              smtpPort: input.port,
              smtpHasPassword: !!input.password,
            }
          : await firstValueFrom(this.api.useCustomSmtp(input));
      }
      this.apply(next);
      this.notice.set(
        this.route() === 'shared'
          ? 'Mail now goes through the MNI Assist shared relay.'
          : 'Saved. Send a test email to confirm your server accepts it.',
      );
    } catch (e) {
      this.error.set(this.message(e, 'The delivery settings could not be saved.'));
    } finally {
      this.savingDelivery.set(false);
    }
  }

  protected async sendTest(): Promise<void> {
    if (!this.canTest() || this.testing()) return;
    this.begin(this.testing);
    try {
      if (!this.mock) await firstValueFrom(this.api.sendTestEmail(this.testTo().trim()));
      this.notice.set(`Test email sent to ${this.testTo().trim()}.`);
    } catch (e) {
      this.error.set(this.message(e, 'The test email could not be sent.'));
    } finally {
      this.testing.set(false);
    }
  }

  private begin(flag: { set(v: boolean): void }): void {
    flag.set(true);
    this.error.set(null);
    this.notice.set(null);
  }

  /** ABP puts the reason in error.error.message; a plain network failure has none. */
  private message(e: unknown, fallback: string): string {
    const err = e as { error?: { error?: { message?: string } } };
    return err?.error?.error?.message || fallback;
  }
}
