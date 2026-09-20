import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ArTopbar } from '../../layout/topbar';
import {
  EmailChannelDto,
  EmailChannelService,
} from '../../proxy/email/email-channel.service';
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
  private readonly mock = environment.useMockData;

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
  protected readonly canTest = computed(
    () => this.senderReady() && /^\S+@\S+\.\S+$/.test(this.testTo().trim()),
  );

  constructor() {
    void this.load();
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
          ? { ...(this.channel() ?? SEED), usesCustomSmtp: false, smtpHost: null, smtpHasPassword: false }
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
          ? { ...(this.channel() ?? SEED), usesCustomSmtp: true, smtpHost: input.host, smtpPort: input.port, smtpHasPassword: !!input.password }
          : await firstValueFrom(this.api.useCustomSmtp(input));
      }
      this.apply(next);
      this.notice.set(
        this.route() === 'shared'
          ? 'Mail now goes through the AutoReach shared relay.'
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
