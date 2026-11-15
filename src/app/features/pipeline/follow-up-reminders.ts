import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';

import { ConfirmService } from '../../core/ui/confirm.service';
import { ToastService } from '../../core/ui/toast.service';
import { readApiError } from '../../core/util/api-error';
import { ArTopbar } from '../../layout/topbar';
import type { ReminderDto } from '../../proxy/pipeline/models';
import { ReminderKind } from '../../proxy/pipeline/reminder-kind.enum';
import { ReminderService } from '../../proxy/pipeline/reminder.service';
import { ReminderState } from '../../proxy/pipeline/reminder-state.enum';
import { ArButton, ArChip } from '../../ui';
import { ChipTone } from '../../ui/chip';

const KIND: Record<ReminderKind, string> = {
  [ReminderKind.AmcRenewal]: 'AMC renewal',
  [ReminderKind.WarrantyExpiry]: 'Warranty expiry',
  [ReminderKind.CalibrationDue]: 'Calibration due',
  [ReminderKind.PreventiveMaintenance]: 'Preventive maintenance',
  [ReminderKind.QuotationFollowUp]: 'Quotation follow-up',
};

const STATE: Record<ReminderState, { tone: ChipTone; label: string }> = {
  [ReminderState.Scheduled]: { tone: 'neutral', label: 'Scheduled' },
  [ReminderState.Sent]: { tone: 'good', label: 'Sent' },
  [ReminderState.Halted]: { tone: 'warn', label: 'Halted' },
  [ReminderState.Failed]: { tone: 'bad', label: 'Failed' },
};

/** A datetime-local value (browser time) → ISO UTC; null when empty or not in the future. */
export function futureUtc(local: string, now: Date = new Date()): string | null {
  if (!local) return null;
  const at = new Date(local);
  return Number.isNaN(at.getTime()) || at.getTime() <= now.getTime() ? null : at.toISOString();
}

/**
 * Follow-up reminders (AMC, warranty, calibration, maintenance, quotation follow-ups) the workspace will send.
 * A scheduled one can be stopped (halt, with a reason) or moved to another time.
 */
@Component({
  selector: 'ar-follow-up-reminders',
  imports: [ArTopbar, ArButton, ArChip, DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../shared/work-page.scss',
  template: `
    <ar-topbar
      title="Follow-up reminders"
      subtitle="What goes out to customers, and when"
      help="Reminders are planned from installed machines and quotations. Halt one to stop it, or move it to a better time."
    />
    <div class="wp">
      <div class="wp__row">
        <label class="wp__field">
          <span>Show</span>
          <select
            class="ar-field__input"
            [value]="stateFilter()"
            (change)="setFilter($any($event.target).value)"
          >
            <option value="0">Scheduled</option>
            <option value="2">Halted</option>
            <option value="3">Failed</option>
            <option value="1">Sent</option>
            <option value="">All</option>
          </select>
        </label>
      </div>

      <section class="wp__card">
        <ul class="wp__list">
          @for (r of reminders(); track r.id) {
            <li class="wp__item">
              <span class="wp__grow">
                <span class="wp__name"
                  >{{ kind(r.kind) }} ·
                  <span translate="no">{{ r.contactDisplayName ?? 'Customer' }}</span></span
                >
                @if (r.assetDescription) {
                  <span class="wp__sub" translate="no">{{ r.assetDescription }}</span>
                }
                <span class="wp__sub">
                  Due {{ r.dueAtUtc | date: 'd MMM y, HH:mm' }}
                  @if (r.sentAtUtc) {
                    · sent {{ r.sentAtUtc | date: 'd MMM y, HH:mm' }}
                  }
                </span>
                @if (r.haltReason) {
                  <span class="wp__sub">Halted: {{ r.haltReason }}</span>
                }
              </span>
              <ar-chip [tone]="state(r.state).tone" [dot]="true">{{
                state(r.state).label
              }}</ar-chip>
              @if (r.state === scheduled) {
                @if (moving() === r.id) {
                  <input
                    class="ar-field__input"
                    type="datetime-local"
                    aria-label="New time"
                    [value]="moveTo()"
                    (input)="moveTo.set($any($event.target).value)"
                  />
                  <button
                    ar-button
                    type="button"
                    variant="primary"
                    [disabled]="busy() !== null"
                    (click)="reschedule(r)"
                  >
                    {{ busy() === r.id ? 'Moving…' : 'Move' }}
                  </button>
                  <button ar-button type="button" variant="ghost" (click)="moving.set(null)">
                    Cancel
                  </button>
                } @else {
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy() !== null"
                    (click)="startMove(r)"
                  >
                    Reschedule
                  </button>
                  <button
                    ar-button
                    type="button"
                    variant="ghost"
                    [disabled]="busy() !== null"
                    (click)="halt(r)"
                  >
                    Halt
                  </button>
                }
              }
            </li>
          } @empty {
            <li class="wp__empty">No reminders here.</li>
          }
        </ul>
        @if (reminders().length < total()) {
          <div class="wp__actions">
            <button ar-button type="button" variant="ghost" (click)="loadMore()">Show more</button>
          </div>
        }
      </section>
    </div>
  `,
})
export class ArFollowUpReminders implements OnInit {
  private readonly api = inject(ReminderService);
  private readonly toasts = inject(ToastService);
  private readonly dialogs = inject(ConfirmService);

  protected readonly scheduled = ReminderState.Scheduled;
  protected readonly reminders = signal<ReminderDto[]>([]);
  protected readonly total = signal(0);
  protected readonly stateFilter = signal<string>('0');
  protected readonly busy = signal<string | null>(null);
  protected readonly moving = signal<string | null>(null);
  protected readonly moveTo = signal('');

  async ngOnInit(): Promise<void> {
    await this.load(0);
  }

  protected kind(k: ReminderKind | undefined): string {
    return k === undefined ? 'Reminder' : (KIND[k] ?? 'Reminder');
  }

  protected state(s: ReminderState | undefined) {
    return STATE[s ?? ReminderState.Scheduled];
  }

  protected async setFilter(value: string): Promise<void> {
    this.stateFilter.set(value);
    await this.load(0);
  }

  protected async loadMore(): Promise<void> {
    await this.load(this.reminders().length);
  }

  private async load(skip: number): Promise<void> {
    try {
      const f = this.stateFilter();
      const page = await firstValueFrom(
        this.api.getList({
          state: f === '' ? null : (Number(f) as ReminderState),
          skipCount: skip,
          maxResultCount: 50,
        }),
      );
      this.total.set(page.totalCount ?? 0);
      this.reminders.update((list) =>
        skip === 0 ? (page.items ?? []) : [...list, ...(page.items ?? [])],
      );
    } catch {
      if (skip === 0) this.reminders.set([]);
    }
  }

  protected startMove(r: ReminderDto): void {
    const due = r.dueAtUtc ? new Date(r.dueAtUtc) : new Date();
    const local = new Date(due.getTime() - due.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
    this.moveTo.set(local);
    this.moving.set(r.id ?? null);
  }

  protected async reschedule(r: ReminderDto): Promise<void> {
    const utc = futureUtc(this.moveTo());
    if (!utc) {
      this.toasts.warning('Pick a time in the future.', 'Reminders');
      return;
    }
    await this.run(r.id!, async () => {
      await firstValueFrom(this.api.reschedule(r.id!, utc, { skipHandleError: true }));
      this.moving.set(null);
      this.toasts.success('Reminder moved.', 'Reminders');
    });
  }

  protected async halt(r: ReminderDto): Promise<void> {
    const reason = await this.dialogs.ask(
      `Halt the ${this.kind(r.kind).toLowerCase()} reminder?`,
      { label: 'Why (kept with the reminder)', required: true, maxLength: 256 },
      'It will not be sent.',
    );
    if (!reason?.trim()) return;
    await this.run(r.id!, async () => {
      await firstValueFrom(this.api.halt(r.id!, reason.trim(), { skipHandleError: true }));
      this.toasts.success('Reminder halted.', 'Reminders');
    });
  }

  private async run(key: string, work: () => Promise<void>): Promise<void> {
    this.busy.set(key);
    try {
      await work();
      await this.load(0);
    } catch (e: unknown) {
      this.toasts.error(readApiError(e, 'That did not save. Try again.'), 'Reminders');
    } finally {
      this.busy.set(null);
    }
  }
}
