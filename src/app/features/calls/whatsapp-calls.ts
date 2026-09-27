import { PermissionService } from '@abp/ng.core';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { formatDuration } from '../../core/services/softphone-logic';
import { ArTopbar } from '../../layout/topbar';
import { WhatsAppCallDto, WhatsAppCallService } from '../../proxy/messaging/whats-app-call.service';
import { ArButton, ArChip } from '../../ui';
import type { ChipTone } from '../../ui/chip';

const ago = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

const SEED: WhatsAppCallDto[] = [
  {
    id: 'w1',
    contactId: 'c1',
    contactName: 'R. Kulkarni',
    contactWaId: '919812345678',
    status: 'Ended',
    direction: 'Inbound',
    rangAtUtc: ago(35),
    answeredAtUtc: ago(35),
    endedAtUtc: ago(31),
    durationSeconds: 242,
    hasRecording: true,
    transferCount: 1,
  },
  {
    id: 'w2',
    contactId: 'c2',
    contactName: 'Precision Pumps',
    contactWaId: '919876500011',
    status: 'Missed',
    direction: 'Inbound',
    rangAtUtc: ago(90),
    endedAtUtc: ago(89),
    durationSeconds: 0,
    hasRecording: false,
    transferCount: 0,
  },
  {
    id: 'w3',
    contactId: 'c3',
    contactName: 'Godavari Cement',
    contactWaId: '919900011122',
    status: 'Rejected',
    direction: 'Outbound',
    rangAtUtc: ago(180),
    endedAtUtc: ago(179),
    durationSeconds: 0,
    hasRecording: false,
    transferCount: 0,
  },
];

/**
 * M3: every WhatsApp call, both directions: who, when, how long, whether it was handed on, and its recording where one was kept.
 * Missed calls first when filtered, so they get called back.
 */
@Component({
  selector: 'ar-whatsapp-calls',
  imports: [ArTopbar, ArButton, ArChip],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="WhatsApp calls"
      [subtitle]="total() + ' calls'"
      help="Calls customers made to your WhatsApp number and calls your team made to customers who allowed it. When recording is on, the browser on the call records both sides and saves it when the call ends; tell customers that calls are recorded."
    >
      @if (canRecordings) {
        <label class="wa__toggle" for="wa-rec">
          <input
            id="wa-rec"
            type="checkbox"
            [checked]="recordCalls()"
            [disabled]="saving()"
            (change)="setRecording($any($event.target).checked)"
          />
          Record calls
        </label>
      }
      <label class="wa__toggle" for="wa-missed">
        <input
          id="wa-missed"
          type="checkbox"
          [checked]="missedOnly()"
          (change)="missedOnly.set($any($event.target).checked); load()"
        />
        Missed only
      </label>
    </ar-topbar>

    <div class="wa ar-scroll">
      @if (error(); as e) {
        <p class="wa__err" role="alert">{{ e }}</p>
      }
      @if (rows().length === 0 && !loading()) {
        <p class="wa__hint">No WhatsApp calls yet.</p>
      } @else {
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                <th scope="col">Customer</th>
                <th scope="col">When</th>
                <th scope="col">Call</th>
                <th scope="col" class="num">Length</th>
                <th scope="col">Recording</th>
              </tr>
            </thead>
            <tbody>
              @for (c of rows(); track c.id) {
                <tr>
                  <td>
                    {{ c.contactName || '+' + c.contactWaId }}
                    @if (c.contactName && c.contactWaId) {
                      <span class="wa__muted ar-mono">+{{ c.contactWaId }}</span>
                    }
                  </td>
                  <td>{{ when(c.rangAtUtc) }}</td>
                  <td>
                    <ar-chip [tone]="tone(c)" [dot]="true">{{ label(c) }}</ar-chip>
                    @if (c.transferCount) {
                      <span class="wa__muted">· transferred</span>
                    }
                  </td>
                  <td class="num">{{ c.durationSeconds ? length(c.durationSeconds) : '—' }}</td>
                  <td>
                    @if (c.hasRecording && canRecordings) {
                      @if (audio()[c.id]; as src) {
                        <audio [src]="src" controls preload="none"></audio>
                      } @else {
                        <button ar-button type="button" variant="ghost" (click)="play(c)">
                          Play
                        </button>
                      }
                    } @else {
                      <span class="wa__muted">{{ c.hasRecording ? 'Kept' : '—' }}</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (rows().length < total()) {
          <button ar-button type="button" variant="ghost" (click)="more()">Show more</button>
        }
      }
    </div>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 0;
      height: 100%;
    }
    .wa {
      padding: 16px 20px 32px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .wa__toggle {
      display: flex;
      gap: 6px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
    }
    .tbl-wrap {
      overflow-x: auto;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
    }
    .tbl {
      width: 100%;
      border-collapse: collapse;
      font: 400 13px var(--ar-font-sans);
    }
    .tbl th {
      text-align: left;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 12px;
      border-bottom: 1px solid var(--ar-line-200);
    }
    .tbl td {
      padding: 10px 12px;
      border-bottom: 1px solid var(--ar-line-100, #eef0f2);
      color: var(--ar-ink-900);
      vertical-align: middle;
    }
    .tbl tr:last-child td {
      border-bottom: 0;
    }
    .num {
      text-align: right;
      font-variant-numeric: tabular-nums;
    }
    audio {
      height: 32px;
      max-width: 260px;
    }
    .wa__muted {
      color: var(--ar-ink-500);
      font-size: 12px;
      margin-left: 4px;
    }
    .wa__hint {
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .wa__err {
      margin: 0;
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-bad-600, #b42318);
    }
    @media (max-width: 560px) {
      .wa {
        padding-inline: 12px;
      }
    }
  `,
})
export class ArWhatsAppCalls {
  private readonly api = inject(WhatsAppCallService);
  protected readonly canRecordings = grantedPolicy(
    'AutoReach.Inbox.CallRecordings',
    inject(PermissionService),
  );

  protected readonly rows = signal<WhatsAppCallDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly missedOnly = signal(false);
  protected readonly recordCalls = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly audio = signal<Record<string, string>>({});

  constructor() {
    void this.load();
    if (!environment.useMockData) {
      firstValueFrom(this.api.getSettings())
        .then((s) => this.recordCalls.set(s.recordCalls))
        .catch(() => undefined);
    }
    inject(DestroyRef).onDestroy(() =>
      Object.values(this.audio()).forEach((u) => URL.revokeObjectURL(u)),
    );
  }

  protected async load(skip = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      if (environment.useMockData) {
        const list = this.missedOnly() ? SEED.filter((c) => c.status === 'Missed') : SEED;
        this.rows.set(list);
        this.total.set(list.length);
        return;
      }
      const page = await firstValueFrom(
        this.api.getLog({ missedOnly: this.missedOnly(), skipCount: skip, maxResultCount: 50 }),
      );
      this.rows.set(skip ? [...this.rows(), ...(page.items ?? [])] : (page.items ?? []));
      this.total.set(page.totalCount ?? 0);
    } catch (e: unknown) {
      this.error.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'Could not load calls.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  protected more(): void {
    void this.load(this.rows().length);
  }

  protected async setRecording(on: boolean): Promise<void> {
    this.saving.set(true);
    try {
      if (!environment.useMockData) {
        this.recordCalls.set(
          (await firstValueFrom(this.api.updateSettings({ recordCalls: on }))).recordCalls,
        );
      } else {
        this.recordCalls.set(on);
      }
    } catch {
      this.error.set('The recording setting could not be changed.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async play(c: WhatsAppCallDto): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.getRecording(c.id));
      this.audio.update((a) => ({ ...a, [c.id]: URL.createObjectURL(blob) }));
    } catch {
      this.error.set('The recording could not be loaded.');
    }
  }

  protected when(isoDate: string): string {
    return new Date(isoDate).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  protected length(seconds: number): string {
    return formatDuration(seconds);
  }

  protected label(c: WhatsAppCallDto): string {
    const dir = c.direction === 'Outbound' ? 'Outgoing' : 'Incoming';
    switch (c.status) {
      case 'Missed':
        return c.direction === 'Outbound' ? 'No answer' : 'Missed';
      case 'Rejected':
        return c.direction === 'Outbound' ? 'Declined by customer' : 'Declined';
      case 'Ringing':
        return 'Ringing';
      case 'Failed':
        return 'Failed';
      default:
        return dir;
    }
  }

  protected tone(c: WhatsAppCallDto): ChipTone {
    return c.status === 'Missed'
      ? 'bad'
      : c.status === 'Rejected' || c.status === 'Failed'
        ? 'warn'
        : c.status === 'Ringing'
          ? 'teal'
          : 'good';
  }
}
