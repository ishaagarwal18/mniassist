import { LocalizationPipe, PermissionService } from '@abp/ng.core';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ArTopbar } from '../../layout/topbar';
import {
  VoiceCallBatchDto,
  VoiceCallBatchService,
  VoiceCallRecipientDto,
} from '../../proxy/calling/voice-call-batch.service';
import { ChannelDto } from '../../proxy/channels/models';
import { ChannelService } from '../../proxy/channels/channel.service';
import { ArButton } from '../../ui/button';
import { ArChip } from '../../ui/chip';
import { ArIcon } from '../../ui/icon';
import { ArStatTile } from '../../ui/stat-tile';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';

interface BatchForm {
  name: string;
  channelId: string;
  line: 'whatsapp' | 'phone' | 'sip';
  purpose: string;
  startsAt: string;
  windowStart: string;
  windowEnd: string;
  maxConcurrent: number;
  maxAttempts: number;
  retryAfterMinutes: number;
}

const toClock = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
const toMinute = (clock: string) => {
  const [h, m] = (clock || '00:00').split(':').map(Number);
  return h * 60 + m;
};

/**
 * Batches of AI calls: who the channel's published voice agent calls, when, how many at once and how often it retries. People come
 * from a CSV (a phone column, any other column a variable the agent can use); only people who granted WhatsApp call permission and
 * haven't opted out are called, between 09:00 and 21:00 India time at most.
 */
@Component({
  selector: 'ar-voice-call-batches',
  imports: [
    FormsModule,
    DatePipe,
    LocalizationPipe,
    ArTopbar,
    ArButton,
    ArChip,
    ArIcon,
    ArStatTile,
    ArGrid,
    GridModule,
    RouterLink,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="'AutoReach::VoiceBatch.Title' | abpLocalization"
      [help]="'AutoReach::VoiceBatch.Help' | abpLocalization"
    >
      @if (canCreate()) {
        <a ar-button variant="primary" routerLink="/calls/ai-batches/new">
          + {{ 'AutoReach::VoiceBatch.New' | abpLocalization }}
        </a>
      }
    </ar-topbar>

    <main class="batches">
      <!-- Executive KPI Cards -->
      <section class="batches__kpis" aria-label="AI Call Batches Overview">
        <ar-stat-tile
          label="Total Call Batches"
          [value]="stats().total"
          note="Configured outbound campaigns"
        />
        <ar-stat-tile
          label="Active Running"
          [value]="stats().running"
          tone="teal"
          note="Currently dialing recipients"
        />
        <ar-stat-tile
          label="Total Contacts Target"
          [value]="stats().totalRecipients"
          note="Across all queued batches"
        />
        <ar-stat-tile
          label="Successfully Reached"
          [value]="stats().reachedRecipients"
          tone="good"
          [note]="reachRate() + ' overall contact reach rate'"
        />
      </section>

      @if (error()) {
        <div class="batches__alert" role="alert">
          <ar-icon name="alert" />
          <span>{{ error() | abpLocalization }}</span>
        </div>
      }

      @if (loading()) {
        <div class="batches__state" role="status">
          <span>{{ 'AutoReach::VoiceBatch.Loading' | abpLocalization }}</span>
        </div>
      } @else if (!batches().length) {
        <div class="batches__empty-state">
          <ar-icon name="phone" class="empty-icon" />
          <h3>No AI Call Batches Yet</h3>
          <p>{{ 'AutoReach::VoiceBatch.Empty' | abpLocalization }}</p>
          @if (canCreate()) {
            <a ar-button variant="primary" routerLink="/calls/ai-batches/new">
              + {{ 'AutoReach::VoiceBatch.New' | abpLocalization }}
            </a>
          }
        </div>
      } @else {
        <!-- Cockpit Layout: Left Batches List + Right Detail View -->
        <div class="cockpit-layout">
          <!-- Left: Batches List -->
          <section class="batches-sidebar" aria-label="Batches List">
            <div class="sidebar-head">
              <h2 class="sidebar-title">Batches ({{ batches().length }})</h2>
            </div>
            <ul class="batches-list">
              @for (batch of batches(); track batch.id) {
                <li [class.batch-item--selected]="selected()?.id === batch.id">
                  <button
                    type="button"
                    class="batch-item"
                    [class.batch-item--selected]="selected()?.id === batch.id"
                    (click)="select(batch)"
                  >
                    <div class="batch-item__head">
                      <strong class="batch-item__name">{{ batch.name }}</strong>
                      <ar-chip [tone]="statusTone(batch.status)">
                        {{ 'AutoReach::VoiceBatch.Status.' + batch.status | abpLocalization }}
                      </ar-chip>
                    </div>

                    <div class="batch-item__meta">
                      <span class="batch-item__line">{{
                        'AutoReach::VoiceBatch.Line.' + batch.line | abpLocalization
                      }}</span>
                      <span class="batch-item__counts">
                        {{ batch.reached }} / {{ batch.total }} reached
                      </span>
                    </div>

                    <!-- Mini progress bar -->
                    <div class="batch-item__bar">
                      <div
                        class="batch-item__fill"
                        [style.width.%]="progressPercent(batch.reached, batch.total)"
                      ></div>
                    </div>
                  </button>
                </li>
              }
            </ul>
          </section>

          <!-- Right: Batch Details & Recipient Roster -->
          @if (selected(); as batch) {
            <section class="batch-detail" aria-live="polite">
              <header class="detail-header">
                <div class="detail-title-row">
                  <div>
                    <div class="detail-badges">
                      <ar-chip [tone]="statusTone(batch.status)" [dot]="batch.status === 'Running'">
                        {{ 'AutoReach::VoiceBatch.Status.' + batch.status | abpLocalization }}
                      </ar-chip>
                      <span class="line-tag">{{
                        'AutoReach::VoiceBatch.Line.' + batch.line | abpLocalization
                      }}</span>
                    </div>
                    <h2 class="detail-title">{{ batch.name }}</h2>
                  </div>

                  <div class="detail-actions">
                    @if (canSend() && (batch.status === 'Draft' || batch.status === 'Paused')) {
                      <button
                        ar-button
                        type="button"
                        variant="primary"
                        [disabled]="busy()"
                        (click)="act('start')"
                      >
                        {{ 'AutoReach::VoiceBatch.Start' | abpLocalization }}
                      </button>
                    }
                    @if (canUpdate() && batch.status === 'Running') {
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        [disabled]="busy()"
                        (click)="act('pause')"
                      >
                        {{ 'AutoReach::VoiceBatch.Pause' | abpLocalization }}
                      </button>
                    }
                    @if (
                      canUpdate() && batch.status !== 'Completed' && batch.status !== 'Cancelled'
                    ) {
                      <button
                        ar-button
                        type="button"
                        variant="ghost"
                        [disabled]="busy()"
                        (click)="act('cancel')"
                      >
                        {{ 'AutoReach::VoiceBatch.Cancel' | abpLocalization }}
                      </button>
                    }
                    <button
                      ar-button
                      type="button"
                      variant="ghost"
                      [disabled]="busy()"
                      (click)="refresh()"
                    >
                      {{ 'AutoReach::VoiceBatch.Refresh' | abpLocalization }}
                    </button>
                  </div>
                </div>

                <div class="detail-meta-row">
                  <span class="meta-item">
                    <strong>Calling Window:</strong>
                    {{ clock(batch.windowStartMinute) }} – {{ clock(batch.windowEndMinute) }} IST
                  </span>
                  <span class="meta-separator">·</span>
                  <span class="meta-item">
                    <strong>Concurrency:</strong>
                    {{ batch.maxConcurrent }} simultaneous calls
                  </span>
                  <span class="meta-separator">·</span>
                  <span class="meta-item">
                    <strong>Max Attempts:</strong>
                    {{ batch.maxAttempts }} attempts (retry after {{ batch.retryAfterMinutes }}m)
                  </span>
                </div>

                @if (batch.purpose) {
                  <p class="detail-purpose">{{ batch.purpose }}</p>
                }
              </header>

              <!-- Progress & Status Counts Breakdown Strip -->
              <div class="detail-counts-strip">
                @for (count of counts(); track count.key) {
                  <div class="count-box">
                    <span class="count-box__label">
                      {{ 'AutoReach::VoiceBatch.Recipient.' + count.key | abpLocalization }}
                    </span>
                    <strong class="count-box__value" [class.count-good]="count.key === 'Reached'">
                      {{ count.value }}
                    </strong>
                  </div>
                }
              </div>

              <!-- Upload CSV Recipients Section -->
              @if (canCreate() && batch.status !== 'Completed' && batch.status !== 'Cancelled') {
                <div class="upload-box">
                  <div class="upload-box__info">
                    <ar-icon name="plus" class="upload-icon" />
                    <div>
                      <strong class="upload-title">{{
                        'AutoReach::VoiceBatch.Upload' | abpLocalization
                      }}</strong>
                      <p class="upload-desc">
                        {{ 'AutoReach::VoiceBatch.UploadHelp' | abpLocalization }}
                      </p>
                    </div>
                  </div>
                  <label class="upload-btn-label">
                    <span>Choose CSV File</span>
                    <input
                      type="file"
                      class="upload-file-input"
                      accept=".csv,text/csv"
                      [disabled]="busy()"
                      (change)="upload($event)"
                    />
                  </label>
                </div>
              }

              @if (importNotes().length) {
                <div class="import-notes">
                  @for (note of importNotes(); track $index) {
                    <div class="import-note-item">{{ note }}</div>
                  }
                </div>
              }

              <!-- Recipients Roster Table adhering to modern-web-guidance responsive-table -->
              <div class="recipients-section">
                <h3 class="recipients-title">Recipients Log ({{ recipients().length }})</h3>
                <ejs-grid
                  arGrid="voice-call-recipients"
                  [dataSource]="recipients()"
                  aria-label="Batch Call Recipients"
                >
                  <e-columns>
                    <e-column
                      [headerText]="'AutoReach::VoiceBatch.Col.person' | abpLocalization"
                      width="200"
                    >
                      <ng-template #template let-person>
                        <div class="font-medium" translate="no">
                          {{ person.contactName || person.phone }}
                          @if (person.contactName) {
                            <span class="text-muted block font-mono">{{ person.phone }}</span>
                          }
                        </div>
                      </ng-template>
                    </e-column>
                    <e-column
                      [headerText]="'AutoReach::VoiceBatch.Col.status' | abpLocalization"
                      width="140"
                    >
                      <ng-template #template let-person>
                        <ar-chip [tone]="recipientTone(person.status)">
                          {{
                            'AutoReach::VoiceBatch.Recipient.' + person.status | abpLocalization
                          }}
                        </ar-chip>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="attempts"
                      [headerText]="'AutoReach::VoiceBatch.Col.attempts' | abpLocalization"
                      width="110"
                      [textAlign]="'Right'"
                    >
                      <ng-template #template let-person>
                        <span class="font-mono">{{ person.attempts }}</span>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="nextAttemptAtUtc"
                      [headerText]="'AutoReach::VoiceBatch.Col.next' | abpLocalization"
                      width="160"
                    >
                      <ng-template #template let-person>
                        <span class="text-muted font-mono">
                          {{
                            person.nextAttemptAtUtc
                              ? (person.nextAttemptAtUtc | date: 'short')
                              : '—'
                          }}
                        </span>
                      </ng-template>
                    </e-column>
                    <e-column
                      field="lastOutcome"
                      [headerText]="'AutoReach::VoiceBatch.Col.outcome' | abpLocalization"
                      width="180"
                    >
                      <ng-template #template let-person>
                        <span>
                          {{ person.lastOutcome ? (person.lastOutcome | abpLocalization) : '—' }}
                        </span>
                      </ng-template>
                    </e-column>
                  </e-columns>
                </ejs-grid>
              </div>
            </section>
          }
        </div>
      }
    </main>
  `,
  styles: `
    .batches {
      padding: 24px 32px;
      display: grid;
      gap: 24px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    .batches__kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }

    .batches__alert {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fef3f2;
      border: 1px solid #fecdca;
      border-radius: 6px;
      color: #b42318;
      font-size: 0.875rem;
    }

    .batches__state {
      padding: 32px;
      text-align: center;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      color: var(--ar-ink-500);
    }

    .batches__empty-state {
      padding: 48px 24px;
      text-align: center;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .empty-icon {
      font-size: 2.2rem;
      color: var(--ar-ink-400);
    }

    /* Cockpit 2-column layout */
    .cockpit-layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      align-items: flex-start;
    }

    @media (max-width: 1024px) {
      .cockpit-layout {
        grid-template-columns: 1fr;
      }
    }

    .batches-sidebar {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 16px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
    }

    .sidebar-head {
      margin-bottom: 12px;
    }

    .sidebar-title {
      font: 600 1rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .batches-list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .batch-item {
      width: 100%;
      text-align: start;
      font: inherit;
      padding: 12px;
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      background: var(--ar-bg-50);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: all 0.15s ease;
    }

    .batch-item:hover {
      background: #ffffff;
      border-color: var(--ar-blue-500);
    }

    .batch-item--selected {
      background: #ffffff;
      border-color: var(--ar-blue-500);
      box-shadow: 0 0 0 1px var(--ar-blue-500);
    }

    .batch-item__head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }

    .batch-item__name {
      font-size: 0.88rem;
      color: var(--ar-ink-900);
      overflow-wrap: anywhere;
    }

    .batch-item__meta {
      display: flex;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--ar-ink-500);
    }

    .batch-item__line {
      text-transform: capitalize;
    }

    .batch-item__bar {
      height: 4px;
      background: var(--ar-line-200);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 2px;
    }

    .batch-item__fill {
      height: 100%;
      background: var(--ar-blue-500);
      border-radius: 2px;
    }

    /* Right Batch Detail Cockpit */
    .batch-detail {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card, 10px);
      padding: 24px;
      box-shadow: var(--ar-shadow-card, 0 1px 3px rgba(0, 0, 0, 0.05));
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .detail-header {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--ar-line-200);
    }

    .detail-title-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      flex-wrap: wrap;
    }

    .detail-badges {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .line-tag {
      font-size: 0.72rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ar-ink-700);
      background: var(--ar-bg-100);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .detail-title {
      font: 600 1.3rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .detail-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .detail-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
      font-size: 0.82rem;
      color: var(--ar-ink-700);
    }

    .meta-separator {
      color: var(--ar-ink-400);
    }

    .detail-purpose {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ar-ink-700);
      background: var(--ar-bg-50);
      padding: 10px 14px;
      border-radius: 6px;
      border-left: 3px solid var(--ar-blue-500);
    }

    /* Status Counts Strip */
    .detail-counts-strip {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 10px;
    }

    .count-box {
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      padding: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      text-align: center;
    }

    .count-box__label {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ar-ink-500);
    }

    .count-box__value {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--ar-ink-900);
    }

    .count-good {
      color: #027a48 !important;
    }

    /* CSV Upload Box */
    .upload-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      padding: 16px;
      border: 1px dashed var(--ar-blue-300, #b2ccff);
      border-radius: 8px;
      background: var(--ar-blue-50, #f8faff);
    }

    .upload-box__info {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .upload-icon {
      font-size: 1.4rem;
      color: var(--ar-blue-600);
    }

    .upload-title {
      font-size: 0.9rem;
      color: var(--ar-ink-900);
    }

    .upload-desc {
      margin: 2px 0 0;
      font-size: 0.8rem;
      color: var(--ar-ink-500);
    }

    .upload-btn-label {
      background: #ffffff;
      border: 1px solid var(--ar-line-300);
      padding: 8px 16px;
      border-radius: 6px;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--ar-ink-900);
      cursor: pointer;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
    }

    .upload-btn-label:hover {
      background: var(--ar-bg-50);
    }

    .upload-file-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
    }

    .import-notes {
      padding: 10px 14px;
      background: #eff8ff;
      border: 1px solid #b2ddff;
      border-radius: 6px;
      font-size: 0.82rem;
      color: #175cd3;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    /* Table styling adhering to modern-web-guidance responsive-table */
    .recipients-section {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .recipients-title {
      font: 600 1.05rem var(--ar-font-sans);
      color: var(--ar-ink-900);
      margin: 0;
    }

    .ar-table-responsive {
      overflow-x: auto;
      border: 1px solid var(--ar-line-200);
      border-radius: 6px;
      max-height: 420px;
    }

    .ar-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;

      thead th {
        position: sticky;
        top: 0;
        background: var(--ar-bg-50);
        color: var(--ar-ink-700);
        font-weight: 600;
        text-align: start;
        padding: 8px 12px;
        border-bottom: 1px solid var(--ar-line-200);
        white-space: nowrap;
        z-index: 1;
      }

      tbody td {
        padding: 8px 12px;
        border-bottom: 1px solid var(--ar-line-200);
        color: var(--ar-ink-900);
      }

      tbody tr:last-child td {
        border-bottom: none;
      }

      tbody tr:hover {
        background: var(--ar-bg-50);
      }
    }

    /* Dialog styling */
    .dialog-body {
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 8px 0;
    }

    .dialog-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }

    .dialog-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    @media (max-width: 600px) {
      .dialog-grid,
      .dialog-grid-3 {
        grid-template-columns: 1fr;
      }
    }

    .dialog-rules-note {
      margin: 0;
      font-size: 0.8rem;
      color: var(--ar-ink-400);
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .font-mono {
      font-family: var(--ar-font-mono, monospace);
    }

    .font-medium {
      font-weight: 500;
    }

    .text-muted {
      color: var(--ar-ink-400);
    }

    .text-right {
      text-align: right !important;
    }

    .text-center {
      text-align: center;
    }

    .block {
      display: block;
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
      white-space: nowrap;
    }
  `,
})
export class ArVoiceCallBatches implements OnInit {
  private readonly api = inject(VoiceCallBatchService);
  private readonly channelsApi = inject(ChannelService);
  private readonly permissions = inject(PermissionService);
  protected readonly batches = signal<VoiceCallBatchDto[]>([]);
  protected readonly selected = signal<VoiceCallBatchDto | null>(null);
  protected readonly recipients = signal<VoiceCallRecipientDto[]>([]);
  protected readonly channels = signal<ChannelDto[]>([]);
  protected readonly form = signal<BatchForm | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);
  protected readonly error = signal('');
  protected readonly importNotes = signal<string[]>([]);
  protected readonly canCreate = signal(
    this.permissions.getGrantedPolicy('AutoReach.Campaigns.Create'),
  );
  protected readonly canUpdate = signal(
    this.permissions.getGrantedPolicy('AutoReach.Campaigns.Update'),
  );
  protected readonly canSend = signal(
    this.permissions.getGrantedPolicy('AutoReach.Campaigns.Send'),
  );
  protected readonly clock = toClock;

  protected readonly stats = computed(() => {
    const list = this.batches();
    const total = list.length;
    const running = list.filter((b) => b.status === 'Running').length;
    const totalRecipients = list.reduce((s, b) => s + (b.total || 0), 0);
    const reachedRecipients = list.reduce((s, b) => s + (b.reached || 0), 0);
    return { total, running, totalRecipients, reachedRecipients };
  });

  protected readonly reachRate = computed(() => {
    const s = this.stats();
    if (!s.totalRecipients) return '–';
    return `${Math.round((s.reachedRecipients / s.totalRecipients) * 100)}%`;
  });

  protected readonly counts = computed(() => {
    const batch = this.selected();
    if (!batch) return [];
    return (
      ['Pending', 'Calling', 'Reached', 'Unreached', 'Skipped', 'Failed', 'Cancelled'] as const
    ).map((key) => ({
      key,
      value: batch[(key.charAt(0).toLowerCase() + key.slice(1)) as 'pending'],
    }));
  });

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const page = await firstValueFrom(this.api.getList({ maxResultCount: 50 }));
      this.batches.set(page.items ?? []);
      const current = this.selected();
      if (current) this.selected.set(this.batches().find((b) => b.id === current.id) ?? null);
    } catch {
      this.error.set('AutoReach::VoiceBatch.LoadFailed');
    } finally {
      this.loading.set(false);
    }
  }

  protected async select(batch: VoiceCallBatchDto): Promise<void> {
    this.selected.set(batch);
    this.importNotes.set([]);
    await this.loadRecipients(batch.id);
  }

  private async loadRecipients(batchId: string): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.getRecipients(batchId, { maxResultCount: 200 }));
      this.recipients.set(page.items ?? []);
    } catch {
      this.recipients.set([]);
    }
  }

  protected async refresh(): Promise<void> {
    const sel = this.selected();
    if (!sel) return;
    try {
      const refreshed = await firstValueFrom(this.api.get(sel.id));
      this.selected.set(refreshed);
      this.batches.update((list) => list.map((b) => (b.id === refreshed.id ? refreshed : b)));
      await this.loadRecipients(sel.id);
    } catch {
      this.error.set('AutoReach::VoiceBatch.RefreshFailed');
    }
  }

  protected async act(action: 'start' | 'pause' | 'cancel'): Promise<void> {
    const sel = this.selected();
    if (!sel || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const fn =
        action === 'start'
          ? this.api.start(sel.id)
          : action === 'pause'
            ? this.api.pause(sel.id)
            : this.api.cancel(sel.id);
      const updated = await firstValueFrom(fn);
      this.selected.set(updated);
      this.batches.update((list) => list.map((b) => (b.id === updated.id ? updated : b)));
    } catch {
      this.error.set('AutoReach::VoiceBatch.ActionFailed');
    } finally {
      this.busy.set(false);
    }
  }

  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const sel = this.selected();
    if (!file || !sel || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.importNotes.set([]);
    try {
      const csv = await file.text();
      const result = await firstValueFrom(this.api.importRecipients(sel.id, csv));
      this.importNotes.set([`+${result.added}, =${result.alreadyIn}`, ...result.problems]);
      await this.refresh();
    } catch {
      this.error.set('AutoReach::VoiceBatch.UploadFailed');
    } finally {
      this.busy.set(false);
      input.value = '';
    }
  }

  protected async openNew(): Promise<void> {
    try {
      const page = await firstValueFrom(this.channelsApi.getList({ maxResultCount: 50 }));
      this.channels.set((page.items ?? []).filter((c) => c.provider === 0));
    } catch {
      this.channels.set([]);
    }
    const now = new Date();
    const startsAt = new Date(now.getTime() + 10 * 60_000).toISOString().slice(0, 16);
    this.form.set({
      name: '',
      channelId: this.channels()[0]?.id ?? '',
      line: 'whatsapp',
      purpose: '',
      startsAt,
      windowStart: '09:00',
      windowEnd: '21:00',
      maxConcurrent: 2,
      maxAttempts: 2,
      retryAfterMinutes: 120,
    });
  }

  protected async create(): Promise<void> {
    const f = this.form();
    if (!f || this.busy()) return;
    const windowStartMinute = toMinute(f.windowStart);
    const windowEndMinute = toMinute(f.windowEnd);
    if (
      !f.name.trim() ||
      !f.channelId ||
      windowStartMinute < 540 ||
      windowEndMinute > 1260 ||
      windowEndMinute - windowStartMinute < 30
    ) {
      this.error.set('AutoReach:VoiceCallBatchInvalid');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const created = await firstValueFrom(
        this.api.create({
          name: f.name.trim(),
          channelId: f.channelId,
          line: f.line,
          purpose: f.purpose.trim() || undefined,
          startsAtUtc: f.startsAt ? new Date(f.startsAt).toISOString() : null,
          windowStartMinute,
          windowEndMinute,
          maxConcurrent: Number(f.maxConcurrent) || 1,
          maxAttempts: Number(f.maxAttempts) || 1,
          retryAfterMinutes: Number(f.retryAfterMinutes) || 60,
        }),
      );
      this.form.set(null);
      this.batches.update((list) => [created, ...list]);
      this.selected.set(created);
      await this.loadRecipients(created.id);
    } catch {
      this.error.set('AutoReach::VoiceBatch.CreateFailed');
    } finally {
      this.busy.set(false);
    }
  }

  protected statusTone(status: string): 'good' | 'amber' | 'teal' | 'neutral' | 'bad' {
    switch (status) {
      case 'Running':
        return 'teal';
      case 'Completed':
        return 'good';
      case 'Paused':
        return 'amber';
      case 'Cancelled':
        return 'bad';
      default:
        return 'neutral';
    }
  }

  protected recipientTone(status: string): 'good' | 'amber' | 'teal' | 'neutral' | 'bad' {
    switch (status) {
      case 'Reached':
        return 'good';
      case 'Calling':
        return 'teal';
      case 'Unreached':
      case 'Skipped':
        return 'amber';
      case 'Failed':
      case 'Cancelled':
        return 'bad';
      default:
        return 'neutral';
    }
  }

  protected progressPercent(reached: number, total: number): number {
    if (!total || total <= 0) return 0;
    return Math.min(100, Math.round((reached / total) * 100));
  }
}
