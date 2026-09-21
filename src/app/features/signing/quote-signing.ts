import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { inr } from '../../core/util/format';
import { environment } from '../../../environments/environment';
import {
  QuoteSigningService,
  SignatureRequestStatus,
  SigningResultDto,
  SigningViewDto,
} from '../../proxy/pipeline';
import { ArSignaturePad } from './signature-pad';
import { apiMessage, safeColor } from './signing-logic';

/**
 * The page a customer opens from the link they were sent, to read a quotation and sign or decline it. No login, no app shell:
 * the link is the credential. What it shows and does is decided by the server; this page only presents it.
 */
@Component({
  selector: 'ar-quote-signing',
  imports: [ArSignaturePad],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './quote-signing.html',
  styleUrl: './quote-signing.scss',
})
export class ArQuoteSigning {
  private readonly api = inject(QuoteSigningService);

  /** From the route, `sign/:token`. */
  protected readonly token = signal(inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '');

  protected readonly Status = SignatureRequestStatus;

  protected readonly view = signal<SigningViewDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly typedName = signal('');
  protected readonly drawn = signal<string | null>(null);
  protected readonly consent = signal(false);
  protected readonly declining = signal(false);
  protected readonly declineReason = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The one-time code, when the request asks for one. */
  protected readonly code = signal('');
  protected readonly codeNote = signal<string | null>(null);

  /** Set once the customer has acted on this visit. */
  protected readonly outcome = signal<SigningResultDto | null>(null);

  protected readonly accent = computed(() => safeColor(this.view()?.accentColor, '#0b6b63'));
  protected readonly primary = computed(() => safeColor(this.view()?.primaryColor, '#16202e'));
  protected readonly canSubmit = computed(
    () =>
      this.typedName().trim().length >= 2 &&
      this.consent() &&
      !this.busy() &&
      (!this.view()?.requiresCode || this.code().replace(/\D/g, '').length === 6),
  );

  constructor() {
    queueMicrotask(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      const v = await firstValueFrom(this.api.get(this.token()));
      this.view.set(v);
      this.typedName.set(v.signerName ?? '');
    } catch (e: unknown) {
      this.loadError.set(apiMessage(e, 'This signing link is not valid.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected money(paise: number | undefined): string {
    return inr(paise ?? 0);
  }

  protected pct(basisPoints: number | undefined): string {
    return `${(basisPoints ?? 0) / 100}%`;
  }

  protected date(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : '—';
  }

  protected dateTime(iso: string | null | undefined): string {
    return iso
      ? new Date(iso).toLocaleString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—';
  }

  protected documentUrl(): string {
    return `${environment.apis.default.url}${this.api.documentPath(this.token())}`;
  }

  protected async sign(): Promise<void> {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.api.sign(this.token(), {
          typedName: this.typedName().trim(),
          drawnSignature: this.drawn(),
          consent: this.consent(),
          code: this.view()?.requiresCode ? this.code() : null,
        }),
      );
      this.outcome.set(result);
      await this.load();
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'Your signature could not be saved. Please try again.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async sendCode(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const sent = await firstValueFrom(this.api.sendCode(this.token()));
      this.codeNote.set(`We sent a 6-digit code to ${sent.sentTo}. It works for ${sent.validForMinutes} minutes.`);
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The code could not be sent. Please try again in a few minutes.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async decline(): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.api.decline(this.token(), this.declineReason().trim() || null));
      this.outcome.set(result);
      await this.load();
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'Your answer could not be saved. Please try again.'));
    } finally {
      this.busy.set(false);
    }
  }
}
