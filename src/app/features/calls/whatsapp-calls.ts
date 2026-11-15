import { ArLiveAiTranscript } from './live-ai-transcript';
import { LocalizationPipe, PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { formatDuration } from '../../core/services/softphone-logic';
import { ArTopbar } from '../../layout/topbar';
import { WhatsAppCallDto, WhatsAppCallService } from '../../proxy/messaging/whats-app-call.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import type { ChipTone } from '../../ui/chip';
import { GridModule } from '@syncfusion/ej2-angular-grids';
import { ArGrid } from '../../ui/grid';

/**
 * M3: every WhatsApp call, both directions: who, when, how long, whether it was handed on, and its recording where one was kept.
 * Missed calls first when filtered, so they get called back.
 */
@Component({
  selector: 'ar-whatsapp-calls',
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    LocalizationPipe,
    ArGrid,
    GridModule,
    RouterLink,
    ArLiveAiTranscript,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="WhatsApp calls"
      [subtitle]="total() + ' calls'"
      help="Calls customers made to your WhatsApp number and calls your team made to customers who allowed it. When recording is on, the browser on the call records both sides and saves it when the call ends; tell customers that calls are recorded."
    >
      @if (canRecordings()) {
        <a ar-button variant="ghost" routerLink="/calls/whatsapp/conversations">
          {{ 'AutoReach::VoiceConversation.Title' | abpLocalization }}
        </a>
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
        @if (recordCalls()) {
          <button ar-button type="button" variant="ghost" (click)="openNotice()">
            Recording notice{{ hasNotice() ? ' · your clip' : ' · tone' }}
          </button>
        }
      }
      @if (canMenu()) {
        <a ar-button variant="ghost" routerLink="/calls/whatsapp/ivr"> Call menu (IVR) </a>
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

    @if (noticeOpen()) {
      <ar-dialog title="Recording notice" (dismiss)="closeNotice()">
        <p class="wa__hint">
          When recording starts, the customer hears this. Without a clip of your own they hear two
          short beeps. Record a line such as “This call is recorded for quality and training” and
          upload it: audio only, up to 1 MB.
        </p>
        @if (noticeUrl(); as url) {
          <audio controls preload="none" [src]="url" aria-label="Current recording notice"></audio>
        } @else if (hasNotice()) {
          <button ar-button type="button" variant="ghost" (click)="previewNotice()">
            Play the current clip
          </button>
        } @else {
          <p class="wa__hint">No clip yet: customers hear the tone.</p>
        }
        <label class="ar-field" for="wa-notice-file">
          <span class="ar-field__label">{{ hasNotice() ? 'Replace with' : 'Upload a clip' }}</span>
          <input
            id="wa-notice-file"
            class="ar-field__input"
            type="file"
            accept="audio/*"
            [disabled]="saving()"
            (change)="uploadNotice($any($event.target))"
          />
        </label>
        @if (noticeError(); as e) {
          <p class="wa__err" role="alert">{{ e }}</p>
        }
        <div dialogActions>
          @if (hasNotice()) {
            <button
              ar-button
              type="button"
              variant="ghost"
              [disabled]="saving()"
              (click)="removeNotice()"
            >
              Use the tone instead
            </button>
          }
          <button ar-button type="button" variant="primary" (click)="closeNotice()">Done</button>
        </div>
      </ar-dialog>
    }

    <div class="wa ar-scroll">
      @if (error(); as e) {
        <p class="wa__err" role="alert">{{ e }}</p>
      }

      <!-- KPI Summary Ribbon -->
      <section class="wa__kpi-grid" role="group" aria-label="WhatsApp calls overview">
        <div class="wa__kpi-card">
          <span class="wa__kpi-val tabular-nums">{{ stats().total }}</span>
          <span class="wa__kpi-lbl">Total WhatsApp Calls</span>
          <span class="wa__kpi-sub">{{ total() }} registered in log</span>
        </div>
        <div class="wa__kpi-card">
          <span class="wa__kpi-val text-good tabular-nums">{{ stats().answered }}</span>
          <span class="wa__kpi-lbl">Answered & Completed</span>
          <span class="wa__kpi-sub">Total talk: {{ length(stats().totalDuration) }}</span>
        </div>
        <div class="wa__kpi-card" [class.wa__kpi-card--bad]="stats().missed > 0">
          <span class="wa__kpi-val" [class.text-bad]="stats().missed > 0" class="tabular-nums">{{
            stats().missed
          }}</span>
          <span class="wa__kpi-lbl">Missed Calls</span>
          <span class="wa__kpi-sub">Requires callback</span>
        </div>
        <div class="wa__kpi-card">
          <span class="wa__kpi-val text-primary tabular-nums">{{ stats().recorded }}</span>
          <span class="wa__kpi-lbl">Recordings Kept</span>
          <span class="wa__kpi-sub">Auditable audio clips</span>
        </div>
      </section>

      @if (rows().length === 0 && !loading()) {
        <p class="wa__hint">No WhatsApp calls yet.</p>
      } @else {
        @if (canRecordings() && selected().size > 0) {
          <div class="wa__bulk" role="region" aria-label="Selected calls">
            <span class="wa__bulk-count">{{ selected().size }} selected</span>
            <button
              ar-button
              type="button"
              variant="danger"
              [disabled]="deleting()"
              (click)="deleteSelected()"
            >
              {{ deleting() ? 'Deleting…' : 'Delete selected' }}
            </button>
            <button ar-button type="button" variant="ghost" (click)="clearSelection()">
              Clear selection
            </button>
          </div>
        }
        @if (liveCall(); as id) {
          <ar-live-ai-transcript [callId]="id" (closed)="liveCall.set(null)" />
        }
        <ejs-grid arGrid="whatsapp-calls" [dataSource]="rows()" aria-label="WhatsApp Calls Log">
          <e-columns>
            <e-column width="50" textAlign="Center" [visible]="canRecordings()">
              <ng-template #headerTemplate>
                <input
                  type="checkbox"
                  aria-label="Select all calls shown"
                  [checked]="allSelected()"
                  (change)="selectAll($any($event.target).checked)"
                />
              </ng-template>
              <ng-template #template let-c>
                <input
                  type="checkbox"
                  [attr.aria-label]="
                    'Select the call with ' + (c.contactName || '+' + c.contactWaId)
                  "
                  [checked]="selected().has(c.id)"
                  [disabled]="inProgress(c)"
                  (change)="toggle(c.id, $any($event.target).checked)"
                />
              </ng-template>
            </e-column>
            <e-column field="contactName" headerText="Customer" width="200">
              <ng-template #template let-c>
                <div>
                  <strong>{{ c.contactName || '+' + c.contactWaId }}</strong>
                  @if (c.contactName && c.contactWaId) {
                    <span class="wa__muted ar-mono block">+{{ c.contactWaId }}</span>
                  }
                </div>
              </ng-template>
            </e-column>
            <e-column field="rangAtUtc" headerText="When" width="140">
              <ng-template #template let-c>
                {{ when(c.rangAtUtc) }}
              </ng-template>
            </e-column>
            <e-column headerText="Call" width="220">
              <ng-template #template let-c>
                <ar-chip [tone]="tone(c)" [dot]="true">{{ label(c) }}</ar-chip>
                @if (c.queueLabel) {
                  <span class="wa__muted"> · {{ c.queueLabel }} queue</span>
                }
                @if (c.transferCount) {
                  <span class="wa__muted"> · transferred</span>
                }
                @if (inProgress(c)) {
                  <button ar-button type="button" variant="ghost" (click)="liveCall.set(c.id)">
                    Live transcript
                  </button>
                }
              </ng-template>
            </e-column>
            <e-column field="durationSeconds" headerText="Length" width="100" [textAlign]="'Right'">
              <ng-template #template let-c>
                <span class="tabular-nums">
                  {{ c.durationSeconds ? length(c.durationSeconds) : '—' }}
                </span>
              </ng-template>
            </e-column>
            <e-column headerText="Recording" width="180">
              <ng-template #template let-c>
                @if (c.hasRecording && canRecordings()) {
                  @if (audio()[c.id]; as src) {
                    <audio [src]="src" controls loading="lazy" preload="metadata"></audio>
                  } @else {
                    <button ar-button type="button" variant="ghost" (click)="play(c)">Play</button>
                  }
                } @else {
                  <span class="wa__muted">{{ c.hasRecording ? 'Kept' : '—' }}</span>
                }
              </ng-template>
            </e-column>
            <e-column
              headerText="Actions"
              width="100"
              [textAlign]="'Right'"
              [visible]="canRecordings()"
            >
              <ng-template #template let-c>
                @if (!inProgress(c)) {
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="deleting()"
                    [attr.aria-label]="
                      'Delete the call with ' + (c.contactName || '+' + c.contactWaId)
                    "
                    (click)="deleteOne(c)"
                  >
                    Delete
                  </button>
                }
              </ng-template>
            </e-column>
          </e-columns>
        </ejs-grid>
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
      padding: 16px 24px 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 1360px;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
    }

    /* KPI Grid */
    .wa__kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }
    .wa__kpi-card {
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      position: relative;
      overflow: hidden;
      transition:
        transform var(--ar-ease),
        box-shadow var(--ar-ease);
    }
    .wa__kpi-card:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 24, 40, 0.08);
    }
    .wa__kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--ar-blue-500);
    }
    .wa__kpi-card--bad::before {
      background: var(--ar-red-500);
    }
    .wa__kpi-val {
      font-size: 1.5rem;
      font-weight: 700;
      line-height: 1.15;
      color: var(--ar-ink-900);
    }
    .wa__kpi-lbl {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--ar-ink-400);
    }
    .wa__kpi-sub {
      font-size: 0.72rem;
      color: var(--ar-ink-500);
    }

    .tabular-nums {
      font-variant-numeric: tabular-nums;
    }
    .text-good {
      color: var(--ar-green-600);
    }
    .text-bad {
      color: var(--ar-red-600);
    }
    .text-primary {
      color: var(--ar-blue-600);
    }

    .wa__bulk {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 8px 14px;
      background: var(--ar-bg-50);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-control);
      font: 500 13px var(--ar-font-sans);
    }
    .wa__bulk-count {
      font-weight: 600;
      color: var(--ar-ink-900);
    }
    .wa__pick {
      width: 36px;
      text-align: center;
    }
    .wa__toggle {
      display: flex;
      gap: 6px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
      cursor: pointer;
    }
    .tbl-wrap {
      overflow: auto;
      max-inline-size: 100%;
      max-block-size: min(560px, 80vh);
      container-type: inline-size;
      background: var(--ar-white);
      border: 1px solid var(--ar-line-200);
      border-radius: var(--ar-radius-card);
      box-shadow: var(--ar-shadow-card);
    }
    .tbl {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font: 400 13px var(--ar-font-sans);
    }
    .tbl thead {
      position: sticky;
      inset-block-start: 0;
      z-index: 1;
    }
    .tbl th {
      text-align: left;
      font: 600 11.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 14px;
      background: var(--ar-bg-50);
      border-bottom: 2px solid var(--ar-line-200);
      white-space: nowrap;
    }
    .tbl td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--ar-line-200);
      color: var(--ar-ink-900);
      vertical-align: middle;
    }
    .tbl tbody tr:hover {
      background: var(--ar-bg-50);
    }
    .tbl tbody tr:last-child td {
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
      padding: 2.5rem;
      text-align: center;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-400);
      font-style: italic;
    }
    .wa__err {
      margin: 0;
      padding: 8px 12px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      border: 1px solid var(--ar-red-200);
      font: 500 12.5px var(--ar-font-sans);
      color: var(--ar-red-600);
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
  private readonly permissions = inject(PermissionService);
  protected readonly canRecordings = grantedPolicy(
    'AutoReach.Inbox.CallRecordings',
    this.permissions,
  );
  /** The call menu routes calls to teams, so it is configured by whoever manages teams. */
  protected readonly canMenu = grantedPolicy('AutoReach.Teams.Manage', this.permissions);

  protected readonly rows = signal<WhatsAppCallDto[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(true);
  protected readonly missedOnly = signal(false);
  protected readonly recordCalls = signal(false);
  protected readonly hasNotice = signal(false);
  protected readonly noticeOpen = signal(false);
  protected readonly noticeUrl = signal<string | null>(null);
  protected readonly noticeError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly audio = signal<Record<string, string>>({});
  private readonly confirm = inject(ConfirmService);
  private readonly toasts = inject(ToastService);
  protected readonly selected = signal<Set<string>>(new Set());
  /** The in-progress call whose AI transcript is being watched live. */
  protected readonly liveCall = signal<string | null>(null);
  protected readonly deleting = signal(false);

  protected readonly stats = computed(() => {
    const list = this.rows();
    const total = list.length;
    const missed = list.filter((c) => c.status === 'Missed').length;
    const answered = list.filter((c) => c.status === 'Ended' || c.status === 'Answered').length;
    const recorded = list.filter((c) => c.hasRecording).length;
    const totalDuration = list.reduce((acc, c) => acc + (c.durationSeconds || 0), 0);
    return { total, missed, answered, recorded, totalDuration };
  });

  protected readonly allSelected = computed(() => {
    const ids = this.rows()
      .filter((c) => !this.inProgress(c))
      .map((c) => c.id);
    return ids.length > 0 && ids.every((id) => this.selected().has(id));
  });

  /** A call still ringing or being talked on can't be deleted; the server refuses it too. */
  protected inProgress(c: WhatsAppCallDto): boolean {
    if (c.endedAtUtc) return false;
    if (c.status === 'Answered') return true;
    return c.status === 'Ringing' && Date.now() - Date.parse(c.rangAtUtc) < 10 * 60_000;
  }

  protected clearSelection(): void {
    this.selected.set(new Set());
  }

  protected toggle(id: string, on: boolean): void {
    this.selected.update((s) => {
      const next = new Set(s);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  protected selectAll(on: boolean): void {
    this.selected.set(
      on
        ? new Set(
            this.rows()
              .filter((c) => !this.inProgress(c))
              .map((c) => c.id),
          )
        : new Set(),
    );
  }

  protected async deleteOne(c: WhatsAppCallDto): Promise<void> {
    if (
      !(await this.confirm.delete(
        'this call',
        null,
        c.hasRecording
          ? 'Its recording is deleted with it. This cannot be undone.'
          : 'This cannot be undone.',
      ))
    ) {
      return;
    }
    await this.remove([c.id]);
  }

  protected async deleteSelected(): Promise<void> {
    const ids = [...this.selected()];
    if (
      ids.length === 0 ||
      !(await this.confirm.delete(
        ids.length === 1 ? 'this call' : `${ids.length} calls`,
        null,
        'Their recordings are deleted with them. This cannot be undone.',
      ))
    ) {
      return;
    }
    await this.remove(ids);
  }

  /** Deletes the calls one by one, so a call that can't be deleted doesn't stop the rest. */
  private async remove(ids: string[]): Promise<void> {
    this.deleting.set(true);
    const done = new Set<string>();
    let refused = 0;
    try {
      for (const id of ids) {
        try {
          await firstValueFrom(this.api.delete(id));
          done.add(id);
        } catch {
          refused++;
        }
      }
    } finally {
      this.deleting.set(false);
    }
    this.rows.update((rows) => rows.filter((c) => !done.has(c.id)));
    this.total.update((t) => Math.max(0, t - done.size));
    this.selected.update((s) => new Set([...s].filter((id) => !done.has(id))));
    if (done.size) {
      this.toasts.success(done.size === 1 ? 'Call deleted.' : `${done.size} calls deleted.`);
    }
    if (refused) {
      this.toasts.warning(
        refused === 1
          ? 'One call could not be deleted. It may still be in progress.'
          : `${refused} calls could not be deleted. They may still be in progress.`,
        'WhatsApp calls',
      );
    }
  }

  constructor() {
    void this.load();

    firstValueFrom(this.api.getSettings())
      .then((s) => {
        this.recordCalls.set(s.recordCalls);
        this.hasNotice.set(!!s.hasAnnouncement);
      })
      .catch(() => undefined);
    inject(DestroyRef).onDestroy(() =>
      Object.values(this.audio()).forEach((u) => URL.revokeObjectURL(u)),
    );
  }

  protected async load(skip = 0): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
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
      this.recordCalls.set(
        (await firstValueFrom(this.api.updateSettings({ recordCalls: on }))).recordCalls,
      );
    } catch {
      this.error.set('The recording setting could not be changed.');
    } finally {
      this.saving.set(false);
    }
  }

  protected openNotice(): void {
    this.noticeError.set(null);
    this.noticeOpen.set(true);
  }

  protected closeNotice(): void {
    const url = this.noticeUrl();
    if (url) URL.revokeObjectURL(url);
    this.noticeUrl.set(null);
    this.noticeOpen.set(false);
  }

  protected async previewNotice(): Promise<void> {
    try {
      const blob = await firstValueFrom(this.api.getAnnouncement());
      this.noticeUrl.set(URL.createObjectURL(blob));
    } catch {
      this.noticeError.set('The clip could not be loaded.');
    }
  }

  protected async uploadNotice(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      this.noticeError.set('Choose an audio file (MP3, M4A, OGG or WAV).');
      return;
    }
    if (file.size > 1024 * 1024) {
      this.noticeError.set('That clip is over 1 MB. Keep it to a few seconds.');
      return;
    }
    this.saving.set(true);
    this.noticeError.set(null);
    try {
      const form = new FormData();
      form.append('file', file, file.name);
      this.hasNotice.set(
        !!(await firstValueFrom(this.api.uploadAnnouncement(form))).hasAnnouncement,
      );
      const old = this.noticeUrl();
      if (old) URL.revokeObjectURL(old);
      this.noticeUrl.set(URL.createObjectURL(file));
    } catch (e: unknown) {
      this.noticeError.set(
        (e as { error?: { error?: { message?: string } } })?.error?.error?.message ??
          'The clip could not be uploaded.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeNotice(): Promise<void> {
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteAnnouncement());
      this.hasNotice.set(false);
      const url = this.noticeUrl();
      if (url) URL.revokeObjectURL(url);
      this.noticeUrl.set(null);
    } catch {
      this.noticeError.set('The clip could not be removed.');
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
