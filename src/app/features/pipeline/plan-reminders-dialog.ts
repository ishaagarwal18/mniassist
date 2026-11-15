import { ChangeDetectionStrategy, Component, OnInit, inject, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { readApiError } from '../../core/util/api-error';
import type { TemplateDto } from '../../proxy/messaging/models';
import { TemplateService } from '../../proxy/messaging/template.service';
import { TemplateStatus } from '../../proxy/messaging/template-status.enum';
import { ReminderService } from '../../proxy/pipeline/reminder.service';
import { ArButton } from '../../ui';
import { ArDialog } from '../../ui/dialog';

/** "30, 7" → [30, 7]: whole days from 1 to 365, largest first, no repeats. Null when the text isn't such a list. */
export function parseLeadDays(text: string): number[] | null {
  const parts = text.split(/[,\s]+/).filter(Boolean);
  if (parts.length === 0 || parts.length > 5) return null;
  const days = parts.map(Number);
  if (days.some((d) => !Number.isInteger(d) || d < 1 || d > 365)) return null;
  return [...new Set(days)].sort((a, b) => b - a);
}

/**
 * Plans reminders for everything due in the next few months (AMC renewals, service dates, quotation follow-ups) using one
 * approved template. Running it again does not double anyone's reminders.
 */
@Component({
  selector: 'ar-plan-reminders-dialog',
  imports: [ArDialog, ArButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ar-dialog
      title="Plan reminders"
      width="min(520px, calc(100vw - 32px))"
      (dismiss)="closed.emit(null)"
    >
      <p class="pr__note">
        Plans reminders for everything due in the window. Running it again never doubles anyone's
        reminders.
      </p>
      <div class="pr">
        <label class="ar-field" for="pr-template">
          <span class="ar-field__label">Message template</span>
          <select
            id="pr-template"
            class="ar-field__input"
            (change)="templateId.set($any($event.target).value)"
          >
            <option value="" [selected]="!templateId()">Choose an approved template</option>
            @for (t of templates(); track t.id) {
              <option [value]="t.id" [selected]="t.id === templateId()">
                {{ t.name }} · {{ t.languageCode }}
              </option>
            }
          </select>
        </label>
        <label class="ar-field" for="pr-horizon">
          <span class="ar-field__label">Look ahead (days)</span>
          <input
            id="pr-horizon"
            class="ar-field__input"
            type="number"
            min="1"
            max="365"
            [value]="horizon()"
            (input)="horizon.set(+$any($event.target).value)"
          />
        </label>
        <label class="ar-field" for="pr-lead">
          <span class="ar-field__label">Remind this many days before</span>
          <input
            id="pr-lead"
            class="ar-field__input"
            placeholder="30, 7"
            [value]="lead()"
            (input)="lead.set($any($event.target).value)"
          />
          <span class="pr__note"
            >Two reminders is usually enough; many more and customers block the number.</span
          >
        </label>
      </div>
      @if (error(); as e) {
        <p class="pr__err" role="alert">{{ e }}</p>
      }
      <div dialogActions>
        <button ar-button type="button" variant="ghost" (click)="closed.emit(null)">Cancel</button>
        <button ar-button type="button" variant="primary" [disabled]="busy()" (click)="plan()">
          {{ busy() ? 'Planning…' : 'Plan reminders' }}
        </button>
      </div>
    </ar-dialog>
  `,
  styles: `
    .pr {
      display: grid;
      gap: 12px;
    }
    .pr__note {
      margin: 0 0 10px;
      font: 400 12.5px/1.5 var(--ar-font-sans);
      color: var(--ar-ink-500);
    }
    .pr__err {
      margin: 8px 0 0;
      color: var(--ar-bad-600);
      font: 500 12.5px var(--ar-font-sans);
    }
  `,
})
export class ArPlanRemindersDialog implements OnInit {
  /** The number of reminders planned, or null when closed without planning. */
  readonly closed = output<number | null>();
  private readonly api = inject(ReminderService);
  private readonly templateApi = inject(TemplateService);

  protected readonly templates = signal<TemplateDto[]>([]);
  protected readonly templateId = signal('');
  protected readonly horizon = signal(90);
  protected readonly lead = signal('30, 7');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const page = await firstValueFrom(
        this.templateApi.getList(
          { status: TemplateStatus.Approved, maxResultCount: 200 },
          { skipHandleError: true },
        ),
      );
      this.templates.set(page.items ?? []);
    } catch {
      this.error.set('The templates could not be loaded.');
    }
  }

  protected async plan(): Promise<void> {
    const leadDays = parseLeadDays(this.lead());
    if (!this.templateId()) return this.error.set('Choose the template the reminders use.');
    if (!Number.isInteger(this.horizon()) || this.horizon() < 1 || this.horizon() > 365)
      return this.error.set('Look ahead between 1 and 365 days.');
    if (!leadDays)
      return this.error.set('Enter up to five day counts from 1 to 365, such as 30, 7.');
    this.busy.set(true);
    this.error.set(null);
    try {
      const n = await firstValueFrom(
        this.api.plan(
          { templateId: this.templateId(), horizonDays: this.horizon(), leadDays },
          { skipHandleError: true },
        ),
      );
      this.closed.emit(n);
    } catch (e: unknown) {
      this.error.set(readApiError(e, 'The reminders could not be planned.'));
    } finally {
      this.busy.set(false);
    }
  }
}
