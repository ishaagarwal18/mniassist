import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../../core/ui/confirm.service';
import { ToastService } from '../../../core/ui/toast.service';
import { readApiError } from '../../../core/util/api-error';
import { MachineQrDto, MachineQrService } from '../../../proxy/support/machine-qr.service';
import { ArButton, ArCard } from '../../../ui';
import { lastScannedText, savePdf, scanActionText } from './machine-qr.logic';

/**
 * A machine's QR sticker on its page: the QR and link, when it was last scanned and what was done, and print, regenerate (when a
 * sticker was copied or the machine changed hands) or switch off.
 */
@Component({
  selector: 'ar-machine-qr-card',
  imports: [ArCard, ArButton, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './machine-qr-card.html',
  styleUrl: './machine-qr-card.scss',
})
export class ArMachineQrCard implements OnInit {
  readonly assetId = input.required<string>();
  readonly serial = input<string | null | undefined>(null);

  private readonly api = inject(MachineQrService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly qr = signal<MachineQrDto | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The server draws the QR (QRCoder); shown as an image, never put into the page as markup. */
  protected readonly image = computed(() => {
    const svg = this.qr()?.qrSvg;
    return svg
      ? this.sanitizer.bypassSecurityTrustUrl(
          'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))),
        )
      : null;
  });
  protected readonly lastScanned = computed(() => lastScannedText(this.qr()?.lastScannedAtUtc));
  protected readonly actionText = scanActionText;

  ngOnInit(): void {
    void this.run(() => this.api.get(this.assetId()), 'The sticker could not be loaded.');
  }

  protected create(): Promise<void> {
    return this.run(() => this.api.create(this.assetId()), 'The sticker could not be made.');
  }

  protected async regenerate(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Make a new sticker?',
      message:
        'The old sticker stops working at once: scanning it says "no longer active". Print and fix the new one on the machine.',
      confirmText: 'Make a new one',
    });
    if (ok)
      await this.run(() => this.api.regenerate(this.assetId()), 'A new sticker could not be made.');
  }

  protected async revoke(): Promise<void> {
    const ok = await this.dialogs.confirm({
      title: 'Switch this sticker off?',
      message: 'Scanning it will say "no longer active", and no new sticker is made.',
      confirmText: 'Switch off',
    });
    if (ok)
      await this.run(
        () => this.api.revoke(this.assetId()),
        'The sticker could not be switched off.',
      );
  }

  protected async print(): Promise<void> {
    this.busy.set(true);
    try {
      const blob = await firstValueFrom(this.api.printStickers({ assetIds: [this.assetId()] }));
      savePdf(blob, `machine-sticker-${(this.serial() || 'machine').replace(/[^\w-]/g, '-')}.pdf`);
      // Printing makes a sticker when there was none.
      if (!this.qr()?.active) await this.run(() => this.api.get(this.assetId()), '');
    } catch (e) {
      this.toasts.error(readApiError(e, 'The sticker sheet could not be made.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async copy(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.toasts.success('Link copied.');
    } catch {
      this.toasts.warning('Copy the link from the box.');
    }
  }

  private async run(
    call: () => ReturnType<MachineQrService['get']>,
    failure: string,
  ): Promise<void> {
    this.busy.set(true);
    try {
      this.qr.set(await firstValueFrom(call()));
      this.error.set(null);
    } catch (e) {
      if (failure) this.error.set(readApiError(e, failure));
    } finally {
      this.busy.set(false);
    }
  }
}
