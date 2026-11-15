import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import { CampaignService } from '../../proxy/campaigns/campaign.service';
import type { CampaignRecipientDto } from '../../proxy/campaigns/models';
import { MessageStatus } from '../../proxy/messaging/message-status.enum';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

export const RECIPIENT_STATUS: Record<MessageStatus, { label: string; tone: ChipTone }> = {
  [MessageStatus.Queued]: { label: 'Queued', tone: 'neutral' },
  [MessageStatus.Sent]: { label: 'Sent', tone: 'neutral' },
  [MessageStatus.Delivered]: { label: 'Delivered', tone: 'good' },
  [MessageStatus.Read]: { label: 'Read', tone: 'good' },
  [MessageStatus.Failed]: { label: 'Failed', tone: 'bad' },
  [MessageStatus.Withheld]: { label: 'Withheld', tone: 'warn' },
};

const PAGE = 50;

/** Who the campaign went to and what happened to each message, filterable by status. */
@Component({
  selector: 'ar-campaign-recipients',
  imports: [ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  styles: `
    :host {
      display: block;
      margin-top: 12px;
    }
    .cr__bar {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }
    .cr__table {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    .cr__table th,
    .cr__table td {
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid var(--ar-line-200, #e5e7eb);
    }
    .cr__wrap {
      overflow-x: auto;
    }
  `,
  template: `
    <div class="cr__bar">
      <b>Recipients</b>
      <select
        class="ar-field__input"
        aria-label="Show recipients by status"
        (change)="setStatus($any($event.target).value)"
      >
        <option value="">All</option>
        @for (s of statuses; track s.value) {
          <option [value]="s.value">{{ s.label }}</option>
        }
      </select>
      <span class="wp__muted">{{ total() }} {{ total() === 1 ? 'person' : 'people' }}</span>
    </div>
    @if (error(); as e) {
      <p class="wp__muted" role="alert">{{ e }}</p>
    } @else if (rows().length === 0 && !busy()) {
      <p class="wp__muted">Nobody here.</p>
    } @else {
      <div class="cr__wrap">
        <table class="cr__table">
          <thead>
            <tr>
              <th>Contact</th>
              <th>Number</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Why</th>
            </tr>
          </thead>
          <tbody>
            @for (r of rows(); track r.id) {
              <tr>
                <td>{{ r.contactDisplayName || '—' }}</td>
                <td class="ar-mono" translate="no">{{ r.contactWaId }}</td>
                <td>
                  <ar-chip [tone]="status(r).tone">{{ status(r).label }}</ar-chip>
                </td>
                <td>{{ r.dispatchedAtUtc ? (r.dispatchedAtUtc | date: 'd MMM, HH:mm') : '—' }}</td>
                <td>{{ r.skipReason || (r.errorCode ? 'Error ' + r.errorCode : '') }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (rows().length < total()) {
        <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="more()">
          {{ busy() ? 'Loading…' : 'Show more' }}
        </button>
      }
    }
  `,
})
export class ArCampaignRecipients implements OnInit {
  readonly campaignId = input.required<string>();
  private readonly api = inject(CampaignService);

  protected readonly statuses = Object.entries(RECIPIENT_STATUS).map(([value, s]) => ({
    value,
    label: s.label,
  }));
  protected readonly rows = signal<CampaignRecipientDto[]>([]);
  protected readonly total = signal(0);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  private filter: MessageStatus | undefined;

  ngOnInit(): void {
    void this.load(true);
  }

  protected status(r: CampaignRecipientDto) {
    return RECIPIENT_STATUS[r.status ?? MessageStatus.Queued];
  }

  protected setStatus(value: string): void {
    this.filter = value === '' ? undefined : (Number(value) as MessageStatus);
    void this.load(true);
  }

  protected more(): void {
    void this.load(false);
  }

  private async load(fresh: boolean): Promise<void> {
    this.busy.set(true);
    this.error.set(null);
    try {
      const page = await firstValueFrom(
        this.api.getRecipients(
          this.campaignId(),
          { status: this.filter, skipCount: fresh ? 0 : this.rows().length, maxResultCount: PAGE },
          { skipHandleError: true },
        ),
      );
      this.rows.set([...(fresh ? [] : this.rows()), ...(page.items ?? [])]);
      this.total.set(page.totalCount ?? 0);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The recipients could not be loaded.'));
    } finally {
      this.busy.set(false);
    }
  }
}
