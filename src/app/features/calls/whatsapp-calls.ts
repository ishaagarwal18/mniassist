import { LocalizationPipe, PermissionService } from '@abp/ng.core';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { formatDuration } from '../../core/services/softphone-logic';
import { ArTopbar } from '../../layout/topbar';
import { WhatsAppCallDto, WhatsAppCallService } from '../../proxy/messaging/whats-app-call.service';
import { ArButton, ArChip, ArDialog } from '../../ui';
import type { ChipTone } from '../../ui/chip';
import { ArWhatsAppIvrDialog } from './whatsapp-ivr-dialog';
import { ArVoiceConversations } from './voice-conversations';

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
  imports: [
    ArTopbar,
    ArButton,
    ArChip,
    ArDialog,
    ArWhatsAppIvrDialog,
    ArVoiceConversations,
    LocalizationPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="WhatsApp calls"
      [subtitle]="total() + ' calls'"
      help="Calls customers made to your WhatsApp number and calls your team made to customers who allowed it. When recording is on, the browser on the call records both sides and saves it when the call ends; tell customers that calls are recorded."
    >
      @if (canRecordings()) {
        <button ar-button type="button" variant="ghost" (click)="conversationsOpen.set(true)">
          {{ 'AutoReach::VoiceConversation.Title' | abpLocalization }}
        </button>
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
        <button ar-button type="button" variant="ghost" (click)="menuOpen.set(true)">
          Call menu (IVR)
        </button>
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

    @if (conversationsOpen()) {
      <ar-voice-conversations (closed)="conversationsOpen.set(false)" />
    }
    @if (menuOpen()) {
      <ar-whatsapp-ivr-dialog (closed)="menuOpen.set(false)" />
    }

    <div class="wa ar-scroll">
      @if (error(); as e) {
        <p class="wa__err" role="alert">{{ e }}</p>
      }
      @if (rows().length === 0 && !loading()) {
        <p class="wa__hint">No WhatsApp calls yet.</p>
      } @else {
        @if (canRecordings() && selected().size > 0) {
          <div class="wa__bulk" role="region" aria-label="Selected calls">
            <span>{{ selected().size }} selected</span>
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
        <div class="tbl-wrap">
          <table class="tbl">
            <thead>
              <tr>
                @if (canRecordings()) {
                  <th scope="col" class="wa__pick">
                    <input
                      type="checkbox"
                      aria-label="Select all calls shown"
                      [checked]="allSelected()"
                      (change)="selectAll($any($event.target).checked)"
                    />
                  </th>
                }
                <th scope="col">Customer</th>
                <th scope="col">When</th>
                <th scope="col">Call</th>
                <th scope="col" class="num">Length</th>
                <th scope="col">Recording</th>
                @if (canRecordings()) {
                  <th scope="col" aria-label="Actions"></th>
                }
              </tr>
            </thead>
            <tbody>
              @for (c of rows(); track c.id) {
                <tr>
                  @if (canRecordings()) {
                    <td class="wa__pick">
                      <input
                        type="checkbox"
                        [attr.aria-label]="
                          'Select the call with ' + (c.contactName || '+' + c.contactWaId)
                        "
                        [checked]="selected().has(c.id)"
                        [disabled]="inProgress(c)"
                        (change)="toggle(c.id, $any($event.target).checked)"
                      />
                    </td>
                  }
                  <td>
                    {{ c.contactName || '+' + c.contactWaId }}
                    @if (c.contactName && c.contactWaId) {
                      <span class="wa__muted ar-mono">+{{ c.contactWaId }}</span>
                    }
                  </td>
                  <td>{{ when(c.rangAtUtc) }}</td>
                  <td>
                    <ar-chip [tone]="tone(c)" [dot]="true">{{ label(c) }}</ar-chip>
                    @if (c.queueLabel) {
                      <span class="wa__muted">· {{ c.queueLabel }} queue</span>
                    }
                    @if (c.transferCount) {
                      <span class="wa__muted">· transferred</span>
                    }
                  </td>
                  <td class="num">{{ c.durationSeconds ? length(c.durationSeconds) : '—' }}</td>
                  <td>
                    @if (c.hasRecording && canRecordings()) {
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
                  @if (canRecordings()) {
                    <td>
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
                    </td>
                  }
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
    .wa__bulk {
      display: flex;
      gap: 10px;
      align-items: center;
      font: 500 13px var(--ar-font-sans);
    }
    .wa__pick {
      width: 32px;
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
  private readonly permissions = inject(PermissionService);
  protected readonly canRecordings = grantedPolicy(
    'AutoReach.Inbox.CallRecordings',
    this.permissions,
  );
  /** The call menu routes calls to teams, so it is configured by whoever manages teams. */
  protected readonly canMenu = grantedPolicy('AutoReach.Teams.Manage', this.permissions);
  protected readonly menuOpen = signal(false);
  protected readonly conversationsOpen = signal(false);

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
  protected readonly deleting = signal(false);
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
          if (!environment.useMockData) await firstValueFrom(this.api.delete(id));
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
    if (!environment.useMockData) {
      firstValueFrom(this.api.getSettings())
        .then((s) => {
          this.recordCalls.set(s.recordCalls);
          this.hasNotice.set(!!s.hasAnnouncement);
        })
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
      if (environment.useMockData) {
        this.hasNotice.set(true);
      } else {
        const form = new FormData();
        form.append('file', file, file.name);
        this.hasNotice.set(
          !!(await firstValueFrom(this.api.uploadAnnouncement(form))).hasAnnouncement,
        );
      }
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
      if (!environment.useMockData) await firstValueFrom(this.api.deleteAnnouncement());
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
