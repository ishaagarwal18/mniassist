import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MachineScanPublicService, PublicMachineDto } from '../../proxy/support/machine-qr.service';
import { ArCaptcha } from '../../ui/captcha';
import { readSession, sessionKeyFor, writeSession } from '../reorder/reorder-logic';
import {
  looksLikeCode,
  looksLikePhone,
  messageOf,
  problemOf,
  scanSessionKey,
  telLink,
  ticketStatusText,
  whatsAppLink,
} from './scan-logic';

type Step = 'loading' | 'unavailable' | 'busy' | 'page';

/** What the visitor is doing: reporting a breakdown, asking for service, or proving their number to see cover and tickets. */
type Task = 'breakdown' | 'service' | 'verify' | null;

/**
 * The page a machine's QR sticker opens: no sign-in, no app shell, built for a phone on a slow connection. It names the machine and
 * the helpline. A breakdown or a service request is a name, a number and a line about the problem; a number on the machine's account
 * goes straight through, any other gets a WhatsApp code first. Proving a number on the account shows the cover and open tickets.
 */
@Component({
  selector: 'ar-machine-scan-page',
  imports: [DatePipe, ArCaptcha],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './scan-page.html',
  styleUrl: './scan-page.scss',
})
export class ArMachineScanPage {
  private readonly api = inject(MachineScanPublicService);
  private readonly router = inject(Router);
  protected readonly token = inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '';

  protected readonly step = signal<Step>('loading');
  protected readonly machine = signal<PublicMachineDto | null>(null);
  protected readonly task = signal<Task>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<string | null>(null);
  protected readonly reference = signal<string | null>(null);

  protected readonly name = signal('');
  protected readonly phone = signal('');
  protected readonly problem = signal('');
  protected readonly code = signal('');
  protected readonly website = signal('');
  /** Set once a code has been sent for the current task: the form then asks for it. */
  protected readonly awaitingCode = signal(false);
  protected readonly captchaNeeded = signal(false);
  protected readonly captchaToken = signal<string | null>(null);

  private session: string | null = readSession(scanSessionKey(this.token));

  protected readonly call = computed(() => telLink(this.machine()?.helpline));
  protected readonly whatsApp = computed(() => {
    const m = this.machine();
    return whatsAppLink(
      m?.whatsAppNumber,
      m?.description
        ? `About ${m.description}${m.serialNumber ? ' (' + m.serialNumber + ')' : ''}`
        : undefined,
    );
  });
  protected readonly statusText = ticketStatusText;

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    try {
      const m = await firstValueFrom(this.api.get(this.token, this.session));
      this.machine.set(m);
      this.step.set('page');
    } catch (e) {
      const p = problemOf(e);
      this.step.set(p === 'busy' ? 'busy' : 'unavailable');
    }
  }

  protected open(task: Task): void {
    this.task.set(task);
    this.error.set(null);
    this.done.set(null);
    this.reference.set(null);
    this.awaitingCode.set(false);
    this.code.set('');
  }

  protected async submit(): Promise<void> {
    const task = this.task();
    if (!task || this.busy()) return;
    if (!looksLikePhone(this.phone())) {
      this.error.set(
        'Enter your mobile number, with the country code if it is not an Indian number.',
      );
      return;
    }
    if (this.awaitingCode() && !looksLikeCode(this.code())) {
      this.error.set('Enter the 6-digit code from WhatsApp.');
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      if (this.awaitingCode()) {
        const verified = await firstValueFrom(
          this.api.verify(this.token, {
            phone: this.phone(),
            code: this.code(),
            captchaToken: this.captchaToken(),
          }),
        );
        this.keepSession(verified.session);
        this.awaitingCode.set(false);
        if (task === 'verify') {
          this.task.set(null);
          await this.load();
          if (!this.machine()?.verified) {
            this.done.set(
              "Thanks, your number is confirmed. It isn't on this machine's account, so cover and tickets stay private. You can still report a problem.",
            );
          }
          return;
        }
      }

      if (task === 'verify') {
        const sent = await firstValueFrom(
          this.api.sendCode(this.token, { phone: this.phone(), captchaToken: this.captchaToken() }),
        );
        this.awaitingCode.set(true);
        this.done.set(sent.message);
        return;
      }

      const result = await firstValueFrom(
        this.api.report(this.token, {
          name: this.name() || null,
          phone: this.phone(),
          description: this.problem() || null,
          isBreakdown: task === 'breakdown',
          session: this.session,
          website: this.website() || null,
        }),
      );
      if (result.needsCode) {
        this.awaitingCode.set(true);
        this.error.set(null);
        this.done.set(result.message);
        return;
      }
      this.task.set(null);
      this.reference.set(result.reference ?? null);
      this.done.set(
        result.message + (result.confirmed ? ' We have sent the reference to your WhatsApp.' : ''),
      );
    } catch (e) {
      const p = problemOf(e);
      if (p === 'captcha') this.captchaNeeded.set(true);
      if (p === 'revoked') {
        await this.load();
        return;
      }
      this.error.set(
        p === 'busy'
          ? 'Too many tries. Please wait a few minutes, or call the helpline.'
          : messageOf(e, 'That did not go through. Please try again, or call the helpline.'),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected async orderSpares(): Promise<void> {
    if (!this.session || this.busy()) return;
    this.busy.set(true);
    try {
      const link = await firstValueFrom(this.api.spares(this.token, this.session));
      writeSession(sessionKeyFor(link.token), link.session);
      await this.router.navigate(['/r', link.token]);
    } catch (e) {
      this.error.set(
        messageOf(e, 'The spares page could not be opened. Please call the helpline.'),
      );
    } finally {
      this.busy.set(false);
    }
  }

  protected signOut(): void {
    this.keepSession(null);
    void this.load();
  }

  private keepSession(session: string | null): void {
    this.session = session;
    writeSession(scanSessionKey(this.token), session);
  }
}
