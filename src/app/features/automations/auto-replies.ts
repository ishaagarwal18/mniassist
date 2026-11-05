import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { grantedPolicy } from '../../core/auth/permission';
import { readApiError } from '../../core/util/api-error';
import { AutoReplyService } from '../../proxy/messaging/auto-reply.service';
import { CsatService } from '../../proxy/messaging/csat.service';
import type { AutoReplySettingsDto, CsatSettingsDto } from '../../proxy/messaging/models';
import { ArTopbar } from '../../layout/topbar';
import { ArBanner, ArButton, ArCard, ArChip, ArSelect } from '../../ui';
import {
  AutoReplyForm,
  EMPTY_FORM,
  TIME_ZONES,
  WEEK,
  formFrom,
  inputFrom,
  is24x7,
  nowLine,
  week24x7,
} from './auto-reply.logic';

/**
 * Welcome, away and out-of-office replies, and the business hours and holidays that decide
 * when "away" applies (M07-3). Each reply answers a message the customer has just sent, so it
 * goes out free inside the service window.
 */
@Component({
  selector: 'ar-auto-replies',
  imports: [ArTopbar, ArCard, ArButton, ArBanner, ArChip, ArSelect],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-topbar
      title="Auto-replies"
      subtitle="Welcome, away and out-of-office messages"
      help="Automatic answers to customers who write in. The welcome goes to someone's first message. The away reply goes outside your business hours and on holidays, at most once per customer per wait period. During an out-of-office period that message is sent instead. Nothing is sent to a conversation an agent has taken, to button taps, or to STOP."
    >
      @if (canManage()) {
        <button
          ar-button
          type="button"
          variant="primary"
          [disabled]="busy() || !dirty()"
          (click)="save()"
        >
          {{ busy() ? 'Saving…' : 'Save' }}
        </button>
      }
    </ar-topbar>

    <div class="ar ar-scroll">
      @if (error(); as e) {
        <ar-banner tone="bad">{{ e }}</ar-banner>
      }
      @if (!canManage()) {
        <ar-banner tone="teal">You can see these replies but not change them.</ar-banner>
      }
      @if (now(); as line) {
        <p class="ar__now">
          <ar-chip [tone]="saved()?.openNow ? 'good' : 'amber'" [dot]="true">
            {{ saved()?.openNow ? 'Open' : 'Closed' }}
          </ar-chip>
          {{ line }}
        </p>
      }

      <ar-card heading="Welcome message">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().welcomeEnabled"
            (change)="patch({ welcomeEnabled: $any($event.target).checked })"
          />
          Send a welcome when someone writes for the first time
        </label>
        <textarea
          class="ar-field__input ar__text"
          maxlength="1024"
          [disabled]="!canManage()"
          placeholder="Namaste! Thanks for contacting Sun Energy Automation. Share your machine model or part number and we'll help."
          [value]="form().welcomeText"
          (input)="patch({ welcomeText: $any($event.target).value })"
        ></textarea>
      </ar-card>

      <ar-card heading="Away message">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().awayEnabled"
            (change)="patch({ awayEnabled: $any($event.target).checked })"
          />
          Reply outside business hours and on holidays
        </label>
        <textarea
          class="ar-field__input ar__text"
          maxlength="1024"
          [disabled]="!canManage()"
          placeholder="Thanks for your message. We're closed now and will reply from 09:30 on our next working day."
          [value]="form().awayText"
          (input)="patch({ awayText: $any($event.target).value })"
        ></textarea>
        <label class="fld ar__narrow">
          <span class="fld__k">Wait before replying to the same customer again (hours)</span>
          <input
            class="ar-field__input"
            type="number"
            min="1"
            max="168"
            [disabled]="!canManage()"
            [value]="form().awayCooldownHours"
            (input)="patch({ awayCooldownHours: +$any($event.target).value })"
          />
        </label>
      </ar-card>

      <ar-card heading="Instant acknowledgement (24x7)">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().acknowledgementEnabled"
            (change)="patch({ acknowledgementEnabled: $any($event.target).checked })"
          />
          Reply to every message at any hour, so customers know it arrived
        </label>
        <textarea
          class="ar-field__input ar__text"
          maxlength="1024"
          [disabled]="!canManage()"
          placeholder="Thanks for your message. Our team has received it and will reply shortly."
          [value]="form().acknowledgementText"
          (input)="patch({ acknowledgementText: $any($event.target).value })"
        ></textarea>
        <p class="ar__muted">
          Sent only when no other reply answers the message: a first message gets the welcome, and
          closed hours get the away message. At most once per customer per wait period above.
        </p>
      </ar-card>

      <ar-card heading="Business hours">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="open24x7()"
            (change)="set24x7($any($event.target).checked)"
          />
          Open 24 hours, 7 days
        </label>
        @if (open24x7()) {
          <p class="ar__muted">
            Always open, so the away message only goes out on holidays and during an out-of-office
            period.
          </p>
        }
        <label class="fld ar__narrow">
          <span class="fld__k">Time zone</span>
          <select
            class="ar-field__input"
            [disabled]="!canManage()"
            [value]="form().timeZoneId"
            (change)="patch({ timeZoneId: $any($event.target).value })"
          >
            @for (z of zones(); track z.id) {
              <option [value]="z.id">{{ z.label }}</option>
            }
          </select>
        </label>
        <div class="ar__week" [hidden]="open24x7()">
          @for (w of week; track w.day; let i = $index) {
            <div class="ar__day">
              <label class="chk ar__dayname">
                <input
                  type="checkbox"
                  [disabled]="!canManage()"
                  [checked]="form().days[i].isOpen"
                  (change)="day(i, { isOpen: $any($event.target).checked })"
                />
                {{ w.label }}
              </label>
              @if (form().days[i].isOpen) {
                <input
                  arNative
                  class="ar-field__input ar__time"
                  type="time"
                  [attr.aria-label]="w.label + ' opens'"
                  [disabled]="!canManage()"
                  [value]="form().days[i].opens"
                  (change)="day(i, { opens: $any($event.target).value })"
                />
                <span class="ar__to">to</span>
                <input
                  arNative
                  class="ar-field__input ar__time"
                  type="time"
                  [attr.aria-label]="w.label + ' closes'"
                  [disabled]="!canManage()"
                  [value]="form().days[i].closes"
                  (change)="day(i, { closes: $any($event.target).value })"
                />
              } @else {
                <span class="ar__closed">Closed</span>
              }
            </div>
          }
        </div>
        @if (!open24x7()) {
          <p class="ar__muted">
            A closing time earlier than the opening time runs past midnight; the same time means
            open all day.
          </p>
        }
      </ar-card>

      <ar-card heading="Holidays">
        <p class="ar__muted">
          Closed all day, whatever the weekly hours say. The away reply is sent.
        </p>
        <ul class="ar__hol">
          @for (h of form().holidays; track $index; let i = $index) {
            <li>
              <input
                arNative
                class="ar-field__input ar__date"
                type="date"
                aria-label="Holiday date"
                [disabled]="!canManage()"
                [value]="h.date"
                (change)="holiday(i, { date: $any($event.target).value })"
              />
              <input
                class="ar-field__input"
                maxlength="64"
                aria-label="Holiday name"
                placeholder="e.g. Diwali"
                [disabled]="!canManage()"
                [value]="h.name"
                (input)="holiday(i, { name: $any($event.target).value })"
              />
              @if (canManage()) {
                <button type="button" class="link link--danger" (click)="removeHoliday(i)">
                  Remove
                </button>
              }
            </li>
          } @empty {
            <li class="ar__muted">No holidays listed.</li>
          }
        </ul>
        @if (canManage()) {
          <button ar-button type="button" variant="ghost" icon="plus" (click)="addHoliday()">
            Add holiday
          </button>
        }
      </ar-card>

      <ar-card heading="Out of office">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="form().outOfOfficeEnabled"
            (change)="patch({ outOfOfficeEnabled: $any($event.target).checked })"
          />
          We're closed for a period (plant shutdown, festival week)
        </label>
        <div class="ar__range">
          <label class="fld">
            <span class="fld__k">First closed day</span>
            <input
              arNative
              class="ar-field__input"
              type="date"
              [disabled]="!canManage()"
              [value]="form().oooFrom"
              (change)="patch({ oooFrom: $any($event.target).value })"
            />
          </label>
          <label class="fld">
            <span class="fld__k">Last closed day</span>
            <input
              arNative
              class="ar-field__input"
              type="date"
              [disabled]="!canManage()"
              [value]="form().oooTo"
              (change)="patch({ oooTo: $any($event.target).value })"
            />
          </label>
        </div>
        <textarea
          class="ar-field__input ar__text"
          maxlength="1024"
          [disabled]="!canManage()"
          placeholder="We're closed for Diwali from 7 to 11 November and will reply on 12 November. For breakdowns call +91 98200 11234."
          [value]="form().outOfOfficeText"
          (input)="patch({ outOfOfficeText: $any($event.target).value })"
        ></textarea>
        <p class="ar__muted">
          Sent instead of the away message during these days, once per customer per wait period.
        </p>
      </ar-card>

      <ar-card heading="Satisfaction survey">
        <label class="chk">
          <input
            type="checkbox"
            [disabled]="!canManage()"
            [checked]="csat().enabled"
            (change)="patchCsat({ enabled: $any($event.target).checked })"
          />
          Ask the customer how it went when a WhatsApp conversation is resolved or closed
        </label>
        <p class="ar__muted">
          Three buttons — Good, Okay, Poor — inside the 24-hour window, so it costs nothing. Answers
          show as CSAT per agent and per team in Analytics.
        </p>
        <label class="fld ar__gap">
          <span class="fld__k">Question</span>
          <textarea
            class="ar-field__input ar__text"
            maxlength="1024"
            [disabled]="!canManage()"
            [value]="csat().question ?? ''"
            (input)="patchCsat({ question: $any($event.target).value })"
          ></textarea>
        </label>
        <label class="fld ar__gap">
          <span class="fld__k">Thank-you after they answer</span>
          <input
            class="ar-field__input"
            maxlength="1024"
            [disabled]="!canManage()"
            [value]="csat().thanksText ?? ''"
            (input)="patchCsat({ thanksText: $any($event.target).value })"
          />
        </label>
        <label class="fld ar__narrow">
          <span class="fld__k">Ask the same conversation again after (days)</span>
          <input
            class="ar-field__input"
            type="number"
            min="1"
            max="90"
            [disabled]="!canManage()"
            [value]="csat().resurveyAfterDays"
            (input)="patchCsat({ resurveyAfterDays: +$any($event.target).value })"
          />
        </label>
      </ar-card>
    </div>
  `,
  styles: `
    .ar {
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-width: 820px;
    }
    .ar__now {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .ar__text {
      display: block;
      width: 100%;
      min-height: 72px;
      margin-top: 10px;
      resize: vertical;
    }
    .ar__gap {
      margin-top: 10px;
    }
    .ar__narrow {
      max-width: 340px;
      margin-top: 12px;
    }
    .ar__week[hidden] {
      display: none;
    }
    .ar__week {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 14px;
    }
    .ar__day {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .ar__dayname {
      width: 120px;
    }
    .ar__time {
      width: 120px;
    }
    .ar__to,
    .ar__closed {
      font: 400 12.5px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .ar__hol {
      list-style: none;
      margin: 8px 0 10px;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ar__hol li {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .ar__date {
      width: 160px;
    }
    .ar__range {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 220px));
      gap: 12px;
      margin-top: 12px;
    }
    .ar__muted {
      margin: 8px 0 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .fld {
      display: block;
    }
    .fld__k {
      display: block;
      margin-bottom: 4px;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .chk {
      display: flex;
      align-items: center;
      gap: 7px;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-700);
    }
    .link {
      border: 0;
      background: none;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .link--danger {
      color: var(--ar-red-600);
    }
  `,
})
export class ArAutoReplies {
  private readonly api = inject(AutoReplyService);
  private readonly csatApi = inject(CsatService);
  private readonly permissions = inject(PermissionService);
  private readonly mock = environment.useMockData;

  protected readonly week = WEEK;
  protected readonly canManage = grantedPolicy('AutoReach.Automations.Update', this.permissions);

  protected readonly saved = signal<AutoReplySettingsDto | null>(null);
  private readonly baseline = signal<AutoReplyForm>(EMPTY_FORM);
  protected readonly form = signal<AutoReplyForm>(EMPTY_FORM);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  /** The satisfaction survey (M12-4), saved with the replies. */
  protected readonly csat = signal<CsatSettingsDto>({ enabled: false, resurveyAfterDays: 7 });
  private readonly csatBaseline = signal<CsatSettingsDto>({ enabled: false, resurveyAfterDays: 7 });
  private readonly csatDirty = computed(
    () => JSON.stringify(this.csat()) !== JSON.stringify(this.csatBaseline()),
  );

  protected readonly dirty = computed(
    () => JSON.stringify(this.form()) !== JSON.stringify(this.baseline()) || this.csatDirty(),
  );
  protected readonly now = computed(() => nowLine(this.saved()));
  protected readonly zones = computed(() => {
    const id = this.form().timeZoneId;
    return TIME_ZONES.some((z) => z.id === id) ? TIME_ZONES : [{ id, label: id }, ...TIME_ZONES];
  });

  constructor() {
    if (!this.mock) void this.load();
  }

  private async load(): Promise<void> {
    try {
      this.show(await firstValueFrom(this.api.get()));
      this.showCsat(await firstValueFrom(this.csatApi.get()));
    } catch (e) {
      this.error.set(readApiError(e));
    }
  }

  private show(dto: AutoReplySettingsDto): void {
    const f = formFrom(dto);
    this.saved.set(dto);
    this.baseline.set(f);
    this.form.set(f);
  }

  private showCsat(dto: CsatSettingsDto): void {
    this.csat.set({ ...dto });
    this.csatBaseline.set({ ...dto });
  }

  protected patchCsat(p: Partial<CsatSettingsDto>): void {
    this.csat.update((c) => ({ ...c, ...p }));
  }

  protected patch(p: Partial<AutoReplyForm>): void {
    this.form.update((f) => ({ ...f, ...p }));
  }

  /** Open every day, all day. */
  protected readonly open24x7 = computed(() => is24x7(this.form().days));

  protected set24x7(on: boolean): void {
    this.form.update((f) => ({
      ...f,
      days: on ? week24x7() : EMPTY_FORM.days.map((d) => ({ ...d })),
    }));
  }

  protected day(i: number, p: { isOpen?: boolean; opens?: string; closes?: string }): void {
    this.form.update((f) => ({ ...f, days: f.days.map((d, j) => (j === i ? { ...d, ...p } : d)) }));
  }

  protected holiday(i: number, p: { date?: string; name?: string }): void {
    this.form.update((f) => ({
      ...f,
      holidays: f.holidays.map((h, j) => (j === i ? { ...h, ...p } : h)),
    }));
  }

  protected addHoliday(): void {
    this.form.update((f) => ({ ...f, holidays: [...f.holidays, { date: '', name: '' }] }));
  }

  protected removeHoliday(i: number): void {
    this.form.update((f) => ({ ...f, holidays: f.holidays.filter((_, j) => j !== i) }));
  }

  protected async save(): Promise<void> {
    const input = inputFrom(this.form());
    if (typeof input === 'string') {
      this.error.set(input);
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    try {
      this.show(await firstValueFrom(this.api.update(input)));
      if (this.csatDirty()) {
        const days = this.csat().resurveyAfterDays;
        if (!(days >= 1 && days <= 90)) throw new Error('Ask again after 1 to 90 days.');
        this.showCsat(await firstValueFrom(this.csatApi.update(this.csat())));
      }
    } catch (e) {
      this.error.set(readApiError(e));
    } finally {
      this.busy.set(false);
    }
  }
}
