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
import { ArDialog } from '../../ui/dialog';

interface BatchForm {
  name: string;
  channelId: string;
  line: 'whatsapp' | 'phone';
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
  imports: [FormsModule, DatePipe, LocalizationPipe, ArTopbar, ArButton, ArDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      [title]="'AutoReach::VoiceBatch.Title' | abpLocalization"
      [help]="'AutoReach::VoiceBatch.Help' | abpLocalization"
    >
      @if (canCreate()) {
        <button ar-button type="button" (click)="openNew()">
          {{ 'AutoReach::VoiceBatch.New' | abpLocalization }}
        </button>
      }
    </ar-topbar>
    <main class="batches">
      @if (error()) {
        <p role="alert">{{ error() | abpLocalization }}</p>
      }
      @if (loading()) {
        <p role="status">{{ 'AutoReach::VoiceBatch.Loading' | abpLocalization }}</p>
      } @else if (!batches().length) {
        <p>{{ 'AutoReach::VoiceBatch.Empty' | abpLocalization }}</p>
      }
      <ul class="list">
        @for (batch of batches(); track batch.id) {
          <li [class.selected]="selected()?.id === batch.id">
            <button type="button" class="row" (click)="select(batch)">
              <strong>{{ batch.name }}</strong>
              <span>{{ 'AutoReach::VoiceBatch.Status.' + batch.status | abpLocalization }}</span>
              <span>{{
                'AutoReach::VoiceBatch.Progress'
                  | abpLocalization: '' + batch.reached : '' + batch.total
              }}</span>
            </button>
          </li>
        }
      </ul>

      @if (selected(); as batch) {
        <section class="detail" aria-live="polite">
          <h2>{{ batch.name }}</h2>
          <p>
            {{ 'AutoReach::VoiceBatch.Status.' + batch.status | abpLocalization }} ·
            {{
              'AutoReach::VoiceBatch.Window'
                | abpLocalization: clock(batch.windowStartMinute) : clock(batch.windowEndMinute)
            }}
            ·
            {{
              'AutoReach::VoiceBatch.Limits'
                | abpLocalization
                  : '' + batch.maxConcurrent
                  : '' + batch.maxAttempts
                  : '' + batch.retryAfterMinutes
            }}
          </p>
          @if (batch.line === 'phone') {
            <p>{{ 'AutoReach::VoiceBatch.Line.phone' | abpLocalization }}</p>
          }
          @if (batch.purpose) {
            <p>{{ batch.purpose }}</p>
          }
          <dl class="counts">
            @for (count of counts(); track count.key) {
              <div>
                <dt>{{ 'AutoReach::VoiceBatch.Recipient.' + count.key | abpLocalization }}</dt>
                <dd>{{ count.value }}</dd>
              </div>
            }
          </dl>
          <div class="actions">
            @if (canSend() && (batch.status === 'Draft' || batch.status === 'Paused')) {
              <button ar-button type="button" [disabled]="busy()" (click)="act('start')">
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
            @if (canUpdate() && batch.status !== 'Completed' && batch.status !== 'Cancelled') {
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
            <button ar-button type="button" variant="ghost" [disabled]="busy()" (click)="refresh()">
              {{ 'AutoReach::VoiceBatch.Refresh' | abpLocalization }}
            </button>
          </div>
          @if (canCreate() && batch.status !== 'Completed' && batch.status !== 'Cancelled') {
            <label class="ar-field"
              ><span>{{ 'AutoReach::VoiceBatch.Upload' | abpLocalization }}</span>
              <input
                class="ar-field__input"
                type="file"
                accept=".csv,text/csv"
                [disabled]="busy()"
                (change)="upload($event)"
            /></label>
            <p>{{ 'AutoReach::VoiceBatch.UploadHelp' | abpLocalization }}</p>
          }
          @if (importNotes().length) {
            <ul class="notes">
              @for (note of importNotes(); track $index) {
                <li>{{ note }}</li>
              }
            </ul>
          }
          <table class="recipients">
            <thead>
              <tr>
                <th>{{ 'AutoReach::VoiceBatch.Col.person' | abpLocalization }}</th>
                <th>{{ 'AutoReach::VoiceBatch.Col.status' | abpLocalization }}</th>
                <th>{{ 'AutoReach::VoiceBatch.Col.attempts' | abpLocalization }}</th>
                <th>{{ 'AutoReach::VoiceBatch.Col.next' | abpLocalization }}</th>
                <th>{{ 'AutoReach::VoiceBatch.Col.outcome' | abpLocalization }}</th>
              </tr>
            </thead>
            <tbody>
              @for (person of recipients(); track person.id) {
                <tr>
                  <td translate="no">{{ person.contactName || person.phone }}</td>
                  <td>
                    {{ 'AutoReach::VoiceBatch.Recipient.' + person.status | abpLocalization }}
                  </td>
                  <td>{{ person.attempts }}</td>
                  <td>
                    {{ person.nextAttemptAtUtc ? (person.nextAttemptAtUtc | date: 'short') : '' }}
                  </td>
                  <td>{{ person.lastOutcome ? (person.lastOutcome | abpLocalization) : '' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </section>
      }
    </main>

    @if (form(); as model) {
      <ar-dialog
        [title]="'AutoReach::VoiceBatch.New' | abpLocalization"
        width="min(640px, calc(100vw - 32px))"
        (dismiss)="form.set(null)"
      >
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceBatch.Name' | abpLocalization }}</span>
          <input class="ar-field__input" [(ngModel)]="model.name" maxlength="128"
        /></label>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceBatch.Channel' | abpLocalization }}</span>
          <select class="ar-field__input" [(ngModel)]="model.channelId">
            @for (channel of channels(); track channel.id) {
              <option [ngValue]="channel.id" translate="no">
                {{ channel.verifiedName || channel.displayPhoneNumber }}
              </option>
            }
          </select></label
        >
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceBatch.Line' | abpLocalization }}</span>
          <select class="ar-field__input" [(ngModel)]="model.line">
            <option value="whatsapp">
              {{ 'AutoReach::VoiceBatch.Line.whatsapp' | abpLocalization }}
            </option>
            <option value="phone">
              {{ 'AutoReach::VoiceBatch.Line.phone' | abpLocalization }}
            </option>
          </select></label
        >
        <p>{{ 'AutoReach::VoiceBatch.LineHelp' | abpLocalization }}</p>
        <label class="ar-field"
          ><span>{{ 'AutoReach::VoiceBatch.Purpose' | abpLocalization }}</span>
          <textarea
            class="ar-field__input"
            rows="3"
            [(ngModel)]="model.purpose"
            maxlength="500"
          ></textarea>
        </label>
        <p>{{ 'AutoReach::VoiceBatch.PurposeHelp' | abpLocalization }}</p>
        <div class="grid">
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceBatch.StartsAt' | abpLocalization }}</span>
            <input class="ar-field__input" type="datetime-local" [(ngModel)]="model.startsAt"
          /></label>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceBatch.From' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="time"
              min="09:00"
              max="21:00"
              [(ngModel)]="model.windowStart"
          /></label>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceBatch.To' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="time"
              min="09:00"
              max="21:00"
              [(ngModel)]="model.windowEnd"
          /></label>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceBatch.Concurrent' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="number"
              min="1"
              max="20"
              [(ngModel)]="model.maxConcurrent"
          /></label>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceBatch.Attempts' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="number"
              min="1"
              max="5"
              [(ngModel)]="model.maxAttempts"
          /></label>
          <label class="ar-field"
            ><span>{{ 'AutoReach::VoiceBatch.RetryAfter' | abpLocalization }}</span>
            <input
              class="ar-field__input"
              type="number"
              min="15"
              max="1440"
              [(ngModel)]="model.retryAfterMinutes"
          /></label>
        </div>
        <p>{{ 'AutoReach::VoiceBatch.Rules' | abpLocalization }}</p>
        <div dialogActions>
          <button ar-button type="button" variant="ghost" (click)="form.set(null)">
            {{ 'AutoReach::VoiceBatch.Close' | abpLocalization }}
          </button>
          <button ar-button type="button" [disabled]="busy()" (click)="create()">
            {{ 'AutoReach::VoiceBatch.Create' | abpLocalization }}
          </button>
        </div>
      </ar-dialog>
    }
  `,
  styles: `
    .batches {
      padding: 16px;
      display: grid;
      gap: 16px;
    }
    .list {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      width: 100%;
      text-align: start;
      background: var(--ar-surface-100);
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
    }
    .selected .row {
      border-color: var(--ar-primary-500);
    }
    .detail {
      border: 1px solid var(--ar-line-200);
      border-radius: 8px;
      padding: 16px;
      overflow-x: auto;
    }
    .counts {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 12px 0;
    }
    .counts dd {
      margin: 0;
      font-weight: 600;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 12px 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 12px;
    }
    .recipients {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    .recipients th,
    .recipients td {
      text-align: start;
      padding: 6px 8px;
      border-bottom: 1px solid var(--ar-line-200);
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
    await this.loadRecipients();
  }

  private async loadRecipients(): Promise<void> {
    const batch = this.selected();
    if (!batch) return;
    try {
      const page = await firstValueFrom(this.api.getRecipients(batch.id, { maxResultCount: 200 }));
      if (this.selected()?.id === batch.id) this.recipients.set(page.items ?? []);
    } catch {
      this.error.set('AutoReach::VoiceBatch.LoadFailed');
    }
  }

  protected async refresh(): Promise<void> {
    await this.load();
    await this.loadRecipients();
  }

  protected async openNew(): Promise<void> {
    if (!this.channels().length) {
      try {
        const page = await firstValueFrom(
          this.channelsApi.getList({ maxResultCount: 100 } as never),
        );
        this.channels.set((page.items ?? []).filter((c) => c.provider === 0));
      } catch {
        this.channels.set([]);
      }
    }
    this.form.set({
      name: '',
      channelId: this.channels()[0]?.id ?? '',
      line: 'whatsapp',
      purpose: '',
      startsAt: '',
      windowStart: '09:00',
      windowEnd: '21:00',
      maxConcurrent: 2,
      maxAttempts: 2,
      retryAfterMinutes: 120,
    });
  }

  protected async create(): Promise<void> {
    const model = this.form();
    if (!model || this.busy()) return;
    const windowStartMinute = toMinute(model.windowStart);
    const windowEndMinute = toMinute(model.windowEnd);
    if (
      !model.name.trim() ||
      !model.channelId ||
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
      const batch = await firstValueFrom(
        this.api.create({
          name: model.name.trim(),
          channelId: model.channelId,
          line: model.line,
          purpose: model.purpose.trim() || null,
          startsAtUtc: model.startsAt ? new Date(model.startsAt).toISOString() : null,
          windowStartMinute,
          windowEndMinute,
          maxConcurrent: model.maxConcurrent,
          maxAttempts: model.maxAttempts,
          retryAfterMinutes: model.retryAfterMinutes,
        }),
      );
      this.form.set(null);
      await this.load();
      await this.select(this.batches().find((b) => b.id === batch.id) ?? batch);
    } catch (e) {
      this.error.set(this.codeOf(e) ?? 'AutoReach::VoiceBatch.SaveFailed');
    } finally {
      this.busy.set(false);
    }
  }

  protected async upload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    const batch = this.selected();
    if (!file || !batch || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const result = await firstValueFrom(this.api.importRecipients(batch.id, await file.text()));
      this.importNotes.set([`+${result.added}, =${result.alreadyIn}`, ...result.problems]);
      await this.refresh();
    } catch (e) {
      this.error.set(this.codeOf(e) ?? 'AutoReach::VoiceBatch.SaveFailed');
    } finally {
      input.value = '';
      this.busy.set(false);
    }
  }

  protected async act(action: 'start' | 'pause' | 'cancel'): Promise<void> {
    const batch = this.selected();
    if (!batch || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const updated = await firstValueFrom(this.api[action](batch.id));
      this.selected.set(updated);
      await this.refresh();
    } catch (e) {
      this.error.set(this.codeOf(e) ?? 'AutoReach::VoiceBatch.SaveFailed');
    } finally {
      this.busy.set(false);
    }
  }

  /** An ABP error code ("AutoReach:…") the server returned, shown through its own translation. */
  private codeOf(error: unknown): string | null {
    const code = (error as { error?: { error?: { code?: string } } })?.error?.error?.code;
    return code?.startsWith('AutoReach:') ? code : null;
  }
}
