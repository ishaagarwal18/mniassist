import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import { ContactExportStatus } from '../../proxy/contacts/contact-export-status.enum';
import { ContactExportService } from '../../proxy/contacts/contact-export.service';
import type { ContactExportRequestDto } from '../../proxy/contacts/models';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const STATUS: Record<ContactExportStatus, { tone: ChipTone; label: string }> = {
  [ContactExportStatus.Pending]: { tone: 'neutral', label: 'Waiting to start' },
  [ContactExportStatus.Running]: { tone: 'warn', label: 'Being prepared' },
  [ContactExportStatus.Completed]: { tone: 'good', label: 'Ready' },
  [ContactExportStatus.Failed]: { tone: 'bad', label: 'Failed' },
  [ContactExportStatus.Expired]: { tone: 'neutral', label: 'Expired' },
};

/** The one-time token in the API's download link (…/download?token=…); null when there is none. */
export function exportToken(downloadUrl: string | null | undefined): string | null {
  if (!downloadUrl) return null;
  const q = downloadUrl.split('?')[1];
  return q ? new URLSearchParams(q).get('token') : null;
}

/**
 * Where the "export finished" notification opens (/contacts/exports/{id}): the export's state and, once it is
 * ready, its download. A pending or running export is checked again every few seconds.
 */
@Component({
  selector: 'ar-contact-export-page',
  imports: [ArTopbar, ArButton, ArChip, DatePipe, DecimalPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar title="Contact export" subtitle="Your exported contacts file" />
    <div class="wp">
      <p class="wp__muted"><a routerLink="/contacts">← Contacts</a></p>
      <section class="wp__card">
        @if (exp(); as e) {
          <div class="wp__row">
            <span class="wp__grow">
              <span class="wp__name" translate="no">{{ e.fileName ?? 'contacts export' }}</span>
              <span class="wp__sub">
                Asked for {{ e.requestedAtUtc | date: 'd MMM y, HH:mm' }}
                @if (e.rowCount) {
                  · {{ e.rowCount | number }} contacts
                }
                @if (e.expiresAtUtc && e.status === ready) {
                  · download by {{ e.expiresAtUtc | date: 'd MMM, HH:mm' }}
                }
              </span>
            </span>
            <ar-chip [tone]="status(e.status).tone" [dot]="true">{{
              status(e.status).label
            }}</ar-chip>
          </div>
          @if (e.error) {
            <p class="wp__error">{{ e.error }}</p>
          }
          @if (e.status === ready) {
            <div class="wp__actions">
              <button
                ar-button
                type="button"
                variant="primary"
                [disabled]="busy()"
                (click)="download(e)"
              >
                {{ busy() ? 'Downloading…' : 'Download' }}
              </button>
            </div>
          }
        } @else {
          <p class="wp__empty">{{ error() ?? 'Loading…' }}</p>
        }
        @if (downloadError(); as d) {
          <p class="wp__error">{{ d }}</p>
        }
      </section>
    </div>
  `,
})
export class ArContactExportPage implements OnInit, OnDestroy {
  private readonly api = inject(ContactExportService);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';

  protected readonly ready = ContactExportStatus.Completed;
  protected readonly exp = signal<ContactExportRequestDto | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly downloadError = signal<string | null>(null);
  protected readonly busy = signal(false);
  private timer: ReturnType<typeof setTimeout> | null = null;

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  ngOnDestroy(): void {
    if (this.timer) clearTimeout(this.timer);
  }

  protected status(s: ContactExportStatus | undefined) {
    return STATUS[s ?? ContactExportStatus.Pending];
  }

  private async load(): Promise<void> {
    try {
      const e = await firstValueFrom(this.api.get(this.id, { skipHandleError: true }));
      this.exp.set(e);
      if (e.status === ContactExportStatus.Pending || e.status === ContactExportStatus.Running) {
        this.timer = setTimeout(() => void this.load(), 4000);
      }
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'This export could not be found.'));
    }
  }

  protected async download(e: ContactExportRequestDto): Promise<void> {
    const token = exportToken(e.downloadUrl);
    if (!token || !e.id) {
      this.downloadError.set('The download link has expired. Export the contacts again.');
      return;
    }
    this.busy.set(true);
    this.downloadError.set(null);
    try {
      const blob = await firstValueFrom(this.api.download(e.id, token, { skipHandleError: true }));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = e.fileName ?? 'contacts.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err: unknown) {
      this.downloadError.set(readApiError(err, 'The file could not be downloaded.'));
    } finally {
      this.busy.set(false);
    }
  }
}
