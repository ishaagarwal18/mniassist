import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  PublicTestViewDto,
  TestItemResult,
  TestSigningService,
} from '../../proxy/project-billing/acceptance-test.service';
import { ArSignaturePad } from './signature-pad';
import { apiMessage } from './signing-logic';

/**
 * The page a customer's representative opens from the link, to review a FAT, SAT or commissioning checklist and sign the certificate.
 * No login, no app shell: the link is the credential, and the server decides what can be done.
 */
@Component({
  selector: 'ar-test-signing',
  imports: [ArSignaturePad, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './test-signing.html',
  styleUrl: './test-signing.scss',
})
export class ArTestSigning {
  private readonly api = inject(TestSigningService);

  protected readonly token = signal(inject(ActivatedRoute).snapshot.paramMap.get('token') ?? '');
  protected readonly view = signal<PublicTestViewDto | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly name = signal('');
  protected readonly designation = signal('');
  protected readonly drawn = signal<string | null>(null);
  protected readonly consent = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly Result = TestItemResult;

  protected readonly canSign = computed(
    () => this.name().trim().length >= 2 && this.consent() && !this.busy(),
  );

  constructor() {
    queueMicrotask(() => void this.load());
  }

  private async load(): Promise<void> {
    try {
      const v = await firstValueFrom(this.api.get(this.token()));
      this.view.set(v);
      this.name.set(v.signerName ?? '');
      this.designation.set(v.signerDesignation ?? '');
    } catch (e: unknown) {
      this.loadError.set(apiMessage(e, 'This signing link is not valid.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected resultText(r: TestItemResult): string {
    return r === TestItemResult.Pass
      ? 'Pass'
      : r === TestItemResult.Fail
        ? 'Fail'
        : r === TestItemResult.NotApplicable
          ? 'N/A'
          : '—';
  }

  protected certificateUrl(): string {
    return this.api.certificateUrl(this.token(), environment.apis.default.url);
  }

  protected async sign(): Promise<void> {
    if (!this.canSign()) return;
    this.busy.set(true);
    this.error.set(null);
    try {
      this.view.set(
        await firstValueFrom(
          this.api.sign(this.token(), {
            name: this.name().trim(),
            designation: this.designation().trim() || null,
            drawnSignature: this.drawn(),
            consent: this.consent(),
          }),
        ),
      );
    } catch (e: unknown) {
      this.error.set(apiMessage(e, 'The certificate could not be signed.'));
    } finally {
      this.busy.set(false);
    }
  }
}
