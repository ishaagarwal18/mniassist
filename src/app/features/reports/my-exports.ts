import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { rxResource } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { readApiError } from '../../core/util/api-error';
import { settled } from '../../core/util/resource';
import { ToastService } from '../../core/ui/toast.service';
import { ReportExportService } from '../../proxy/reports/report-export.service';
import type { ReportExportDto } from '../../proxy/reports/models';
import { ArTopbar } from '../../layout/topbar';
import { ArButton, ArCard, ArChip } from '../../ui';
import { RouterLink } from '@angular/router';
import { PermissionService } from '@abp/ng.core';
import { grantedPolicy } from '../../core/auth/permission';
import { ContactExportService } from '../../proxy/contacts/contact-export.service';
import { ContactExportStatus } from '../../proxy/contacts/contact-export-status.enum';
import type { ContactExportRequestDto } from '../../proxy/contacts/models';
import { STATUS as CONTACT_EXPORT_STATUS, exportToken } from '../contacts/contact-export-page';

/** "1.2 MB" */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * The exports you asked for (M12-6): built in the background, kept seven days. The notification
 * when one is ready links here, and its email carries a link that works without signing in.
 */
@Component({
  selector: 'ar-my-exports',
  imports: [ArTopbar, ArCard, ArButton, ArChip, DatePipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="My exports"
      subtitle="Report files built in the background, kept for seven days"
      help="Large exports are built in the background so you don't have to wait on the page. You're notified (in the app and by email) when one is ready; download it here or from the email link within seven days."
    >
      <button ar-button type="button" variant="ghost" icon="refresh" (click)="reload()">
        Refresh
      </button>
    </ar-topbar>
    <div class="me ar-scroll">
      <ar-card heading="Exports">
        <ul class="me__list">
          @for (e of exports(); track e.id) {
            <li class="me__row">
              <span class="me__what">
                <strong>{{ e.fileName || label(e.kind) }}</strong>
                <span class="me__muted">
                  {{ label(e.kind) }} · {{ e.format.toUpperCase() }} · asked
                  {{ e.creationTime | date: 'dd MMM, HH:mm' }}
                  @if (e.expiresAtUtc) {
                    · until {{ e.expiresAtUtc | date: 'dd MMM' }}
                  }
                </span>
              </span>
              <span class="me__act">
                @switch (e.status) {
                  @case ('Completed') {
                    <span class="me__muted">{{ size(e.sizeInBytes) }}</span>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="download"
                      [disabled]="busy() === e.id"
                      (click)="download(e)"
                    >
                      Download
                    </button>
                  }
                  @case ('Failed') {
                    <ar-chip tone="bad" [title]="e.error ?? ''">Failed</ar-chip>
                  }
                  @default {
                    <ar-chip tone="amber" [dot]="true">Preparing…</ar-chip>
                  }
                }
              </span>
            </li>
          } @empty {
            <li class="me__muted">No exports yet. Use Export on Analytics or the audit log.</li>
          }
        </ul>
      </ar-card>

      @if (canExportContacts()) {
        <ar-card heading="Contact exports">
          <p class="me__muted me__note">
            Everyone in your workspace who can export contacts sees these. Files can be downloaded
            until they expire.
          </p>
          <ul class="me__list">
            @for (c of contactExports(); track c.id) {
              <li class="me__row">
                <span class="me__what">
                  <a [routerLink]="['/contacts/exports', c.id]">
                    <strong translate="no">{{ c.fileName || 'Contacts export' }}</strong>
                  </a>
                  <span class="me__muted">
                    Asked {{ c.requestedAtUtc | date: 'dd MMM, HH:mm' }}
                    @if (c.rowCount) {
                      · {{ c.rowCount }} contacts
                    }
                    @if (c.expiresAtUtc && c.status === ready) {
                      · until {{ c.expiresAtUtc | date: 'dd MMM, HH:mm' }}
                    }
                  </span>
                </span>
                <span class="me__act">
                  @if (c.status === ready && c.downloadUrl) {
                    <span class="me__muted">{{ size(c.sizeBytes ?? 0) }}</span>
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      icon="download"
                      [disabled]="busy() === c.id"
                      (click)="downloadContacts(c)"
                    >
                      Download
                    </button>
                  } @else {
                    <ar-chip
                      [tone]="contactStatus(c.status).tone"
                      [dot]="true"
                      [title]="c.error ?? ''"
                      >{{ contactStatus(c.status).label }}</ar-chip
                    >
                  }
                </span>
              </li>
            } @empty {
              <li class="me__muted">No contact exports yet. Use Export on Contacts.</li>
            }
          </ul>
        </ar-card>
      }
    </div>
  `,
  styles: `
    .me {
      padding: 20px;
      max-width: 820px;
    }
    .me {
      display: grid;
      gap: 16px;
      align-content: start;
    }
    .me__note {
      margin: 0 0 8px;
    }
    .me__list {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .me__row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 0;
      border-top: 1px solid var(--ar-ink-100);
    }
    .me__row:first-child {
      border-top: 0;
    }
    .me__what {
      display: flex;
      flex-direction: column;
      min-width: 0;
      font: 400 13px var(--ar-font-sans);
      overflow-wrap: anywhere;
    }
    .me__muted {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .me__act {
      display: flex;
      align-items: center;
      gap: 10px;
    }
  `,
})
export class ArMyExports {
  private readonly api = inject(ReportExportService);
  private readonly toasts = inject(ToastService);

  private readonly tick = signal(0);
  private readonly resource = rxResource({
    params: () => ({ t: this.tick() }),
    stream: () => this.api.getMyList(),
    defaultValue: { items: [] as ReportExportDto[] },
  });
  protected readonly exports = computed(() => settled(this.resource, { items: [] }).items ?? []);
  protected readonly busy = signal<string | null>(null);
  protected readonly size = fileSize;

  protected label(kind: string): string {
    return kind === 'AuditLog' ? 'Audit log' : 'Analytics';
  }

  // ---- Contact exports ---------------------------------------------------------------------------
  private readonly contactApi = inject(ContactExportService);
  protected readonly canExportContacts = grantedPolicy(
    'AutoReach.Contacts.Export',
    inject(PermissionService),
  );
  private readonly contactResource = rxResource({
    params: () => (this.canExportContacts() ? { t: this.tick() } : undefined),
    stream: () => this.contactApi.getList({ skipHandleError: true }),
    defaultValue: { items: [] as ContactExportRequestDto[] },
  });
  protected readonly contactExports = computed(
    () => settled(this.contactResource, { items: [] }).items ?? [],
  );
  protected readonly ready = ContactExportStatus.Completed;

  protected contactStatus(s: ContactExportStatus | undefined) {
    return CONTACT_EXPORT_STATUS[s ?? ContactExportStatus.Pending];
  }

  protected async downloadContacts(c: ContactExportRequestDto): Promise<void> {
    const token = exportToken(c.downloadUrl);
    if (!token || !c.id) {
      this.toasts.error('The download link has expired. Export the contacts again.');
      return;
    }
    this.busy.set(c.id);
    try {
      const blob = await firstValueFrom(this.contactApi.download(c.id, token));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = c.fileName || 'contacts.csv';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      this.toasts.error(readApiError(err, 'Could not download the export.'));
    } finally {
      this.busy.set(null);
    }
  }

  protected reload(): void {
    this.tick.update((n) => n + 1);
  }

  protected async download(e: ReportExportDto): Promise<void> {
    this.busy.set(e.id);
    try {
      const blob = await firstValueFrom(this.api.getMyFile(e.id));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = e.fileName || `export.${e.format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      this.toasts.error(readApiError(err, 'Could not download the export.'));
    } finally {
      this.busy.set(null);
    }
  }
}
