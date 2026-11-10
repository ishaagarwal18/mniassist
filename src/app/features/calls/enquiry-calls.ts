import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { PermissionService } from '@abp/ng.core';
import { firstValueFrom } from 'rxjs';

import { grantedPolicy } from '../../core/auth/permission';
import { CallLogDto, CallOutcome } from '../../proxy/voice';
import { ArButton } from '../../ui';
import { errorMessage } from '../activities/activity-logic';
import { ArCallDialog } from './call-dialog';
import { ArCallOutcomeDialog } from './call-outcome-dialog';
import { CallGateway } from './call-gateway';
import { OUTCOME_LABEL, callHeadline, needsOutcome } from './call-logic';
import { ArLogCallDialog } from './log-call-dialog';

/**
 * A deal's calls, with the shortcuts to call the customer or write up a call made elsewhere. Shown in the enquiry drawer so a call can be made
 * and recorded without leaving the deal.
 */
@Component({
  selector: 'ar-enquiry-calls',
  imports: [ArButton, ArCallDialog, ArCallOutcomeDialog, ArLogCallDialog],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h3 class="ec__t">Calls</h3>

    @if (error(); as msg) {
      <p class="ec__err">{{ msg }}</p>
    }

    @for (c of calls(); track c.id) {
      <div class="ec__row">
        <div class="ec__main">
          <span>{{ headline(c) }}</span>
          @if (c.outcome !== None) {
            <span class="ec__out"
              >{{ outcomeLabel[c.outcome] }}{{ c.notes ? ' — ' + c.notes : '' }}</span
            >
          }
        </div>
        @if (needs(c)) {
          <button type="button" class="ec__link" (click)="editing.set(c)">Say how it went</button>
        } @else {
          <span class="ec__when">{{ when(c) }}</span>
        }
      </div>
    } @empty {
      @if (!loading()) {
        <p class="ec__empty">No calls about this deal yet.</p>
      }
    }

    <div class="ec__add">
      @if (canCall()) {
        <button
          ar-button
          type="button"
          variant="ghost"
          icon="phone"
          [disabled]="!contactId()"
          (click)="calling.set(true)"
        >
          Call {{ contactName() }}
        </button>
        <button
          ar-button
          type="button"
          variant="ghost"
          [disabled]="!contactId()"
          (click)="logging.set(true)"
        >
          Log a call
        </button>
      }
    </div>

    @if (calling()) {
      <ar-call-dialog
        [contactId]="contactId()!"
        [contactName]="contactName()"
        [enquiryId]="enquiryId()"
        (closed)="calling.set(false); refresh()"
      />
    }
    @if (logging()) {
      <ar-log-call-dialog
        [contactId]="contactId()!"
        [contactName]="contactName()"
        [enquiryId]="enquiryId()"
        (closed)="logging.set(false); refresh()"
      />
    }
    @if (editing(); as c) {
      <ar-call-outcome-dialog
        [call]="c"
        (saved)="editing.set(null); refresh()"
        (closed)="editing.set(null)"
      />
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .ec__t {
      margin: 0 0 8px;
      font: 600 12px var(--ar-font-sans);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ar-ink-500);
    }
    .ec__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
      padding: 5px 0;
      font: 400 13px var(--ar-font-sans);
      color: var(--ar-ink-900);
    }
    .ec__main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .ec__out {
      font-size: 12px;
      color: var(--ar-ink-600);
    }
    .ec__when {
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
      white-space: nowrap;
    }
    .ec__link {
      flex: none;
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      font: 500 12px var(--ar-font-sans);
      color: var(--ar-teal-600);
    }
    .ec__empty {
      margin: 0;
      font: 400 12px var(--ar-font-sans);
      color: var(--ar-ink-400);
    }
    .ec__add {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .ec__err {
      margin: 0 0 8px;
      padding: 8px 10px;
      border-radius: var(--ar-radius-control);
      background: var(--ar-red-100);
      color: var(--ar-red-600);
      font: 500 12px var(--ar-font-sans);
    }
  `,
})
export class ArEnquiryCalls {
  private readonly api = inject(CallGateway).api;
  private readonly permissions = inject(PermissionService);

  readonly enquiryId = input.required<string>();
  /** The deal's contact; without it there is nobody to call. */
  readonly contactId = input<string | undefined>(undefined);
  readonly contactName = input('the customer');

  protected readonly None = CallOutcome.None;
  protected readonly outcomeLabel = OUTCOME_LABEL;
  protected readonly canCall = grantedPolicy('AutoReach.Inbox.Reply', this.permissions);

  protected readonly calls = signal<CallLogDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly calling = signal(false);
  protected readonly logging = signal(false);
  protected readonly editing = signal<CallLogDto | null>(null);

  private readonly tick = signal(0);

  constructor() {
    effect(() => {
      const id = this.enquiryId();
      this.tick();
      untracked(() => void this.load(id));
    });
  }

  protected refresh(): void {
    this.tick.update((n) => n + 1);
  }

  private async load(id: string): Promise<void> {
    try {
      const page = await firstValueFrom(this.api.getList({ enquiryId: id, maxResultCount: 10 }));
      // A stale answer for a deal the drawer has moved off is dropped.
      if (id !== this.enquiryId()) return;
      this.calls.set(page.items ?? []);
      this.error.set(null);
    } catch (e: unknown) {
      this.error.set(errorMessage(e, 'Calls could not be loaded.'));
    } finally {
      this.loading.set(false);
    }
  }

  protected headline(c: CallLogDto): string {
    return callHeadline(c);
  }

  protected needs(c: CallLogDto): boolean {
    return needsOutcome(c);
  }

  protected when(c: CallLogDto): string {
    return new Date(c.startedAtUtc ?? c.creationTime).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  }
}
