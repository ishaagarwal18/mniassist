import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import {
  EngineerDiagnosisDto,
  FaultDiagnosisService,
} from '../../proxy/support/fault-diagnosis.service';
import { FaultCheckRole } from '../../proxy/support/fault-code.service';
import type { ServiceTicketDto } from '../../proxy/support/service-ticket.models';
import { ArButton, ArCard, ArChip } from '../../ui';
import { environment } from '../../../environments/environment';
import { ROLE_TEXT, SOURCE_TEXT } from './fault-code.logic';

/**
 * The engineer's Diagnosis panel inside a ticket: every library entry for the code (drafts marked not reviewed), all causes and checks
 * including the electrician- and engineer-only ones, past fixes of the same code on this machine, and the spares in stock with a quote
 * link. Nothing here goes to the customer.
 */
@Component({
  selector: 'ar-diagnosis-panel',
  imports: [ArCard, ArButton, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './diagnosis-panel.html',
  styleUrl: './diagnosis-panel.scss',
})
export class ArDiagnosisPanel implements OnInit {
  readonly ticket = input.required<ServiceTicketDto>();

  private readonly api = inject(FaultDiagnosisService);

  protected readonly mock = environment.useMockData;
  protected readonly view = signal<EngineerDiagnosisDto | null>(null);
  protected readonly code = signal('');
  protected readonly photo = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly showAnswer = signal(false);
  protected readonly ROLE_TEXT = ROLE_TEXT;
  protected readonly SOURCE_TEXT = SOURCE_TEXT;
  protected readonly Role = FaultCheckRole;

  ngOnInit(): void {
    if (this.mock) return;
    void this.run(() => this.api.get(this.ticket().id));
  }

  /** A photo of the screen: read into a data URL, then looked up. */
  protected pickPhoto(file: File | null): void {
    this.photo.set(null);
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.error.set('That photo is over 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.photo.set(typeof reader.result === 'string' ? reader.result : null);
      this.code.set('');
      this.lookup();
    };
    reader.readAsDataURL(file);
  }

  protected lookup(): void {
    const code = this.code().trim();
    if (!code && !this.photo()) return;
    void this.run(() =>
      this.api.diagnose(this.ticket().id, {
        code: code || null,
        photoDataUrl: code ? null : this.photo(),
      }),
    );
  }

  /** The new-quotation page, for this customer, with the spare as its first line. */
  protected quoteParams(partNumber: string, name?: string | null): Record<string, string> {
    const t = this.ticket();
    return {
      contact: t.contactId,
      name: t.contactName ?? '',
      part: partNumber,
      partName: name ?? '',
    };
  }

  protected stockText(available: number | null | undefined): string {
    if (available === null || available === undefined) return 'not in the product list';
    return available > 0 ? `${available} in stock` : 'out of stock';
  }

  private async run(call: () => ReturnType<FaultDiagnosisService['get']>): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const v = await firstValueFrom(call());
      this.view.set(v);
      if (v.code) this.code.set(v.code);
    } catch (e) {
      this.error.set(readApiError(e, 'The code could not be looked up.'));
    } finally {
      this.busy.set(false);
    }
  }
}
