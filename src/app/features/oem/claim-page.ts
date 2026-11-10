import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import {
  SpaClaimDto,
  SpaClaimLineDto,
  SpaClaimLineState,
  SpaClaimService,
  SpaClaimStatus,
} from '../../proxy/oem/spa-claim.service';
import { ArBanner, ArButton, ArCard, ArChip } from '../../ui';
import {
  CLAIM_STATUS_TEXT,
  CLAIM_STATUS_TONE,
  LINE_STATE_TEXT,
  allocationOf,
  settleableLines,
} from './claims.logic';
import { rupees, toPaise } from './oem.logic';

function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}

/**
 * One claim to an OEM: its lines (invoice, customer, part, quantity, support), the export for the OEM, submitting it, the OEM's credit
 * notes, rejected lines and the write-off.
 */
@Component({
  selector: 'ar-claim-page',
  imports: [ArTopbar, ArBanner, ArButton, ArCard, ArChip, RouterLink, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './claim-page.html',
  styleUrl: './oem-pages.scss',
})
export class ArClaimPage {
  private readonly api = inject(SpaClaimService);
  private readonly route = inject(ActivatedRoute);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly claim = signal<SpaClaimDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);

  protected readonly submittedOn = signal(today());
  protected readonly ackNumber = signal('');
  protected readonly cnNumber = signal('');
  protected readonly cnDate = signal(today());
  protected readonly cnAmount = signal('');
  /** Credit note matched to lines: line id → rupees typed. Empty spreads it oldest first. */
  protected readonly cnLines = signal<Record<string, string>>({});
  protected readonly picked = signal<string[]>([]);
  protected readonly rejectReason = signal('');

  protected readonly Status = SpaClaimStatus;
  protected readonly State = SpaClaimLineState;
  protected readonly rupees = rupees;

  protected readonly open = computed(() => {
    const s = this.claim()?.status;
    return s === SpaClaimStatus.Submitted || s === SpaClaimStatus.PartlySettled;
  });

  protected readonly settleable = computed(() => settleableLines(this.claim()?.lines ?? []));

  protected readonly allocated = computed(() =>
    allocationOf(this.cnLines()).reduce((n, a) => n + a.amountInPaise, 0),
  );

  constructor() {
    void this.load();
  }

  protected statusText(s: SpaClaimStatus): string {
    return CLAIM_STATUS_TEXT[s];
  }

  protected tone(s: SpaClaimStatus) {
    return CLAIM_STATUS_TONE[s];
  }

  protected stateText(s: SpaClaimLineState): string {
    return LINE_STATE_TEXT[s];
  }

  protected isPicked(l: SpaClaimLineDto): boolean {
    return this.picked().includes(l.id);
  }

  protected togglePick(l: SpaClaimLineDto, on: boolean): void {
    this.picked.update((p) => (on ? [...p, l.id] : p.filter((x) => x !== l.id)));
  }

  protected setLineAmount(lineId: string, text: string): void {
    this.cnLines.update((m) => ({ ...m, [lineId]: text }));
  }

  private async load(): Promise<void> {
    try {
      this.claim.set(await firstValueFrom(this.api.get(this.route.snapshot.paramMap.get('id')!)));
    } catch (e) {
      this.error.set(readApiError(e, 'The claim could not be loaded.'));
    }
  }

  private async run(
    call: () => Promise<SpaClaimDto>,
    done: string,
    fallback: string,
  ): Promise<void> {
    this.busy.set(true);
    try {
      this.claim.set(await call());
      this.toasts.success(done);
    } catch (e) {
      this.toasts.error(readApiError(e, fallback));
    } finally {
      this.busy.set(false);
    }
  }

  protected addLines(): Promise<void> {
    const c = this.claim()!;
    return this.run(
      () => firstValueFrom(this.api.addLines(c.id)),
      'Unclaimed lines added.',
      'No lines could be added.',
    );
  }

  protected async download(): Promise<void> {
    const c = this.claim();
    if (!c) return;
    try {
      const blob = await firstValueFrom(this.api.getExport(c.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${c.reference}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      this.toasts.error(readApiError(e, 'The export could not be made.'));
    }
  }

  protected submit(): Promise<void> {
    const c = this.claim()!;
    return this.run(
      () =>
        firstValueFrom(
          this.api.submit(c.id, {
            submittedOn: this.submittedOn(),
            oemAckNumber: this.ackNumber().trim() || null,
          }),
        ),
      `${c.reference} marked submitted.`,
      'The claim could not be submitted.',
    );
  }

  protected async settle(): Promise<void> {
    const c = this.claim()!;
    const amount = toPaise(this.cnAmount());
    if (!amount || !this.cnNumber().trim()) return;
    await this.run(
      () =>
        firstValueFrom(
          this.api.recordSettlement(c.id, {
            creditNoteNumber: this.cnNumber().trim(),
            creditNoteDate: this.cnDate(),
            amountInPaise: amount,
            lines: allocationOf(this.cnLines()),
          }),
        ),
      'Credit note recorded.',
      'The credit note could not be recorded.',
    );
    this.cnNumber.set('');
    this.cnAmount.set('');
    this.cnLines.set({});
  }

  protected async reject(): Promise<void> {
    const c = this.claim()!;
    if (!this.picked().length || !this.rejectReason().trim()) return;
    await this.run(
      () =>
        firstValueFrom(
          this.api.rejectLines(c.id, {
            lineIds: this.picked(),
            reason: this.rejectReason().trim(),
          }),
        ),
      `${this.picked().length} lines marked rejected.`,
      'The lines could not be rejected.',
    );
    this.picked.set([]);
    this.rejectReason.set('');
  }

  protected async writeOff(): Promise<void> {
    const c = this.claim()!;
    const ok = await this.dialogs.confirm({
      title: `Write off ${rupees(c.outstandingInPaise)}?`,
      message: "Every open line's remainder is written off: the OEM won't be asked for it again.",
      confirmText: 'Write off',
    });
    if (!ok) return;
    await this.run(
      () => firstValueFrom(this.api.writeOff(c.id, { note: null })),
      'Written off.',
      'It could not be written off.',
    );
  }
}
